'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HarmoniaCycleTelemetry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SETTLE_WINDOW_MS = 1500;
  const COVERAGE = 'chatgpt-ui-activity-state-v1';
  const METRIC = 'chatgpt-ui-generation.v1';
  const PLATFORM_ADAPTER = 'chatgpt-web-free';
  const MEASUREMENT_METHOD = 'ui-activity-transition-v1';
  const ALLOWED_SIGNALS = new Set(['aria-busy', 'data-is-streaming', 'stop-control', 'agent-progress']);
  const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function uuidv7(nowMs, cryptoRef) {
    if (!Number.isFinite(nowMs) || nowMs < 0) throw new TypeError('invalid_uuid_timestamp');
    if (!cryptoRef || typeof cryptoRef.getRandomValues !== 'function') throw new TypeError('crypto_random_required');
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    let timestamp = BigInt(Math.trunc(nowMs));
    for (let i = 5; i >= 0; i -= 1) { bytes[i] = Number(timestamp & 0xffn); timestamp >>= 8n; }
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  function measureClockPrecision(clock) {
    let previous = clock.now(), minimum = Infinity;
    for (let i = 0; i < 200; i += 1) {
      const current = clock.now();
      if (current > previous) minimum = Math.min(minimum, current - previous);
      previous = current;
    }
    return Number.isFinite(minimum) && minimum > 0 ? minimum : 1;
  }

  function exactTimestamp(clock, mono) {
    return new Date(clock.timeOrigin + mono).toISOString();
  }

  function normalizeSignals(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(signal => ALLOWED_SIGNALS.has(signal)))].sort();
  }

  function createCycleObserver(options) {
    if (!options || typeof options.getSnapshot !== 'function') throw new TypeError('snapshot_provider_required');
    if (!options.target) throw new TypeError('observer_target_required');
    const clock = options.performanceRef || (typeof performance !== 'undefined' ? performance : null);
    const cryptoRef = options.cryptoRef || (typeof crypto !== 'undefined' ? crypto : null);
    const Observer = options.MutationObserverCtor || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
    const setTimer = options.setTimeoutFn || setTimeout;
    const clearTimer = options.clearTimeoutFn || clearTimeout;
    if (!clock || typeof clock.now !== 'function' || !Number.isFinite(clock.timeOrigin)) throw new TypeError('monotonic_clock_required');
    if (!Observer) throw new TypeError('mutation_observer_required');
    if (typeof options.onEvent !== 'function') throw new TypeError('event_sink_required');

    const conversationId = options.conversationId || uuidv7(Date.now(), cryptoRef);
    if (!UUID_V7.test(conversationId)) throw new TypeError('conversation_id_must_be_uuidv7');

    const clockPrecisionMs = measureClockPrecision(clock);
    const initialSnapshot = options.getSnapshot();
    let baseline = normalizeMessages(initialSnapshot.messages);
    let lastActivity = initialSnapshot.activity === true;
    let active = null;
    let pendingUser = null;
    let inactiveSince = null;
    let unmatchedActivity = null;
    const USER_ACTIVITY_CORRELATION_MS = 2000;
    let settleTimer = null;
    const diagnostics = {
      reconcileCount: 0, lastUserMessageCount: 0, lastAssistantMessageCount: 0,
      userTurnNodesObserved: 0, activityTrueSnapshots: 0, activityRisingEdges: 0,
      activityFallingEdges: 0, unmatchedActivityEdges: 0, userActivityCorrelationAttempts: 0,
      successfulCorrelations: 0, staleActivityEdges: 0, cycleStartAttempts: 0,
      cycleStartedEvents: 0, cycleStartRejectedNoSignals: 0, cycleCompletedEvents: 0,
      eventSinkAttempts: 0, eventSinkAccepted: 0, eventSinkRejected: 0, eventSinkErrors: 0,
      lastActivity: initialSnapshot.activity === true,
      lastSignalIds: normalizeSignals(initialSnapshot.signalIds),
      lastDecision: 'observer-initialized'
    };
    let stopped = false;
    const onDiagnostic = typeof options.onDiagnostic === 'function' ? options.onDiagnostic : null;
    let lastSignalSignature = null;
    let lastMainSignature = null;

    function boundedCount(value) {
      return Number.isFinite(value) ? Math.max(0, Math.min(500, Math.trunc(value))) : 0;
    }

    function diagnosticSignals(snapshot) {
      const presence = snapshot && snapshot.signalPresence && typeof snapshot.signalPresence === 'object'
        ? snapshot.signalPresence : {};
      return [...ALLOWED_SIGNALS].sort().map(id => {
        const item = presence[id] || {};
        return {
          id,
          matching_count: boundedCount(item.matchingCount),
          excluded_count: boundedCount(item.excludedCount),
          visible_count: boundedCount(item.visibleCount)
        };
      });
    }

    function emitDiagnostic(stage, fields = {}) {
      if (!onDiagnostic) return;
      const payload = { stage, elapsed_ms: Math.max(0, Number(clock.now().toFixed(3))), ...fields };
      try {
        const result = onDiagnostic(payload);
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch (_) {}
    }

    function normalizeMessages(messages) {
      return Array.isArray(messages) ? messages.filter(item => item && item.node && (item.role === 'user' || item.role === 'assistant')) : [];
    }

    const initialMainSignature = JSON.stringify([initialSnapshot.mainPresent === true, boundedCount(initialSnapshot.mainCandidateCount)]);
    const initialSignalSignature = JSON.stringify(diagnosticSignals(initialSnapshot));
    lastMainSignature = initialMainSignature;
    lastSignalSignature = initialSignalSignature;
    emitDiagnostic('observer_started', {
      main_present: initialSnapshot.mainPresent === true,
      main_candidate_count: boundedCount(initialSnapshot.mainCandidateCount),
      user_count: boundedCount(baseline.filter(item => item.role === 'user').length),
      assistant_count: boundedCount(baseline.filter(item => item.role === 'assistant').length),
      activity: initialSnapshot.activity === true
    });
    emitDiagnostic('main_state', {
      main_present: initialSnapshot.mainPresent === true,
      main_candidate_count: boundedCount(initialSnapshot.mainCandidateCount)
    });
    emitDiagnostic('signal_state', {
      activity: initialSnapshot.activity === true,
      signals: diagnosticSignals(initialSnapshot)
    });

    function same(a, b) { return a.node === b.node && a.role === b.role; }

    function isPrefix(previous, current) {
      if (previous.length > current.length) return false;
      for (let i = 0; i < previous.length; i += 1) if (!same(previous[i], current[i])) return false;
      return true;
    }

    function clearSettle() {
      if (settleTimer !== null) clearTimer(settleTimer);
      settleTimer = null;
    }

    function send(type, payload) {
      diagnostics.eventSinkAttempts += 1;
      const recordOutcome = (outcome, failed = false) => {
        const rejected = failed || outcome === false ||
          outcome?.ok === false || outcome?.['value'] === false || outcome?.['value']?.ok === false;
        if (failed) diagnostics.eventSinkErrors += 1;
        else if (rejected) diagnostics.eventSinkRejected += 1;
        else diagnostics.eventSinkAccepted += 1;
        const value = outcome?.['value'] && typeof outcome['value'] === 'object' ? outcome['value'] : outcome;
        const delivery = ['posted','queued_outbox','network_error','http_4xx','http_5xx'].includes(value?.delivery)
          ? value.delivery : 'none';
        const statusClass = ['2xx','4xx','5xx','none'].includes(value?.http_status_class)
          ? value.http_status_class : 'none';
        emitDiagnostic('worker_ack', {
          event_phase: payload.phase === 'started' || payload.phase === 'completed' ? payload.phase : 'none',
          sink_result: failed ? 'error' : rejected ? 'rejected' : 'accepted',
          delivery,
          http_status_class: statusClass
        });
      };
      try {
        const result = options.onEvent(type, payload);
        if (result && typeof result.then === 'function') result.then(outcome => recordOutcome(outcome), () => recordOutcome(null, true));
        else recordOutcome(result);
      } catch (_) {
        recordOutcome(null, true);
      }
    }

    function payloadFor(phase, cycle, mono, endSignal) {
      const payload = {
        conversation_id: conversationId,
        cycle_id: cycle.id,
        phase,
        timestamp_utc: exactTimestamp(clock, mono),
        monotonic_ms: mono,
        clock_source: 'performance.now',
        clock_precision_ms: clockPrecisionMs,
        coverage: COVERAGE,
        settle_window_ms: SETTLE_WINDOW_MS,
        platform_adapter: PLATFORM_ADAPTER,
        metric: METRIC,
        measurement_method: MEASUREMENT_METHOD,
        start_signal_ids: cycle.startSignalIds
      };
      if (phase === 'completed') {
        payload.duration_ms = mono - cycle.startedMonotonicMs;
        payload.end_signal_id = endSignal || 'processing-indicators-cleared';
      }
      return payload;
    }

    function begin(message, mono, signalIds) {
      diagnostics.cycleStartAttempts += 1;
      clearSettle();
      inactiveSince = null;
      const cycle = {
        id: uuidv7(Date.now(), cryptoRef),
        userNode: message.node,
        startedMonotonicMs: mono,
        startSignalIds: normalizeSignals(signalIds),
        diagnosticWaitReason: null
      };
      if (!cycle.startSignalIds.length) {
        diagnostics.cycleStartRejectedNoSignals += 1;
        diagnostics.lastDecision = 'cycle-start-rejected-no-allowed-signal';
        emitDiagnostic('cycle_decision', { decision: 'rejected', reason: 'no_start_signal', event_phase: 'none' });
        return;
      }
      active = cycle;
      diagnostics.cycleStartedEvents += 1;
      diagnostics.lastDecision = 'cycle-start-emitted';
      emitDiagnostic('cycle_decision', { decision: 'started', reason: 'none', event_phase: 'started' });
      send('client.cycle.started', payloadFor('started', cycle, mono));
    }

    function assistantAfter(messages, cycle) {
      const index = messages.findIndex(item => item.node === cycle.userNode && item.role === 'user');
      if (index < 0) return false;
      for (let i = index + 1; i < messages.length; i += 1) {
        const item = messages[i];
        if (item.role === 'assistant' && (!item.node.childNodes || item.node.childNodes.length > 0)) return true;
      }
      return false;
    }

    function completeIfSettled() {
      settleTimer = null;
      if (stopped || !active || inactiveSince === null) return;
      const snapshot = options.getSnapshot();
      const messages = normalizeMessages(snapshot.messages);
      if (!messages.some(item => item.node === active.userNode && item.role === 'user')) {
        emitDiagnostic('cycle_decision', { decision: 'abandoned', reason: 'user_node_missing', event_phase: 'none' });
        active = null; inactiveSince = null; return;
      }
      if (snapshot.activity === true) { active.diagnosticWaitReason = null; return; }
      if (!assistantAfter(messages, active)) {
        if (active.diagnosticWaitReason !== 'missing_assistant') emitDiagnostic('cycle_wait', { reason: 'missing_assistant', user_seq: boundedCount(diagnostics.userTurnNodesObserved), user_count: boundedCount(messages.filter(item => item.role === 'user').length), assistant_count: boundedCount(messages.filter(item => item.role === 'assistant').length) });
        active.diagnosticWaitReason = 'missing_assistant';
        return;
      }
      const cycle = active;
      const finalMono = inactiveSince;
      const duration = finalMono - cycle.startedMonotonicMs;
      active = null;
      inactiveSince = null;
      if (!Number.isFinite(duration) || duration < 0) return;
      diagnostics.cycleCompletedEvents += 1;
      diagnostics.lastDecision = 'cycle-completed-event-emitted';
      emitDiagnostic('cycle_decision', { decision: 'completed', reason: 'none', event_phase: 'completed' });
      send('client.cycle.completed', payloadFor('completed', cycle, finalMono));
    }

    function evaluateCompletion(mono, snapshot, messages) {
      if (!active) return;
      if (!messages.some(item => item.node === active.userNode && item.role === 'user')) {
        emitDiagnostic('cycle_decision', { decision: 'abandoned', reason: 'user_node_missing', event_phase: 'none' });
        clearSettle(); active = null; inactiveSince = null; return;
      }
      if (snapshot.activity === true) {
        clearSettle();
        inactiveSince = null;
        active.diagnosticWaitReason = null;
        return;
      }
      if (inactiveSince === null) inactiveSince = mono;
      if (!assistantAfter(messages, active)) {
        if (active.diagnosticWaitReason !== 'missing_assistant') emitDiagnostic('cycle_wait', { reason: 'missing_assistant', user_seq: boundedCount(diagnostics.userTurnNodesObserved), user_count: boundedCount(diagnostics.lastUserMessageCount), assistant_count: boundedCount(diagnostics.lastAssistantMessageCount) });
        active.diagnosticWaitReason = 'missing_assistant';
        return;
      }
      if (active.diagnosticWaitReason !== 'settle_pending') emitDiagnostic('cycle_wait', { reason: 'settle_pending', user_seq: boundedCount(diagnostics.userTurnNodesObserved), user_count: boundedCount(diagnostics.lastUserMessageCount), assistant_count: boundedCount(diagnostics.lastAssistantMessageCount) });
      active.diagnosticWaitReason = 'settle_pending';
      if (settleTimer !== null) return;
      const remaining = Math.max(0, SETTLE_WINDOW_MS - (mono - inactiveSince));
      settleTimer = setTimer(completeIfSettled, remaining);
    }

    function reconcile() {
      if (stopped) return;
      const mono = clock.now();
      const snapshot = options.getSnapshot();
      const current = normalizeMessages(snapshot.messages);
      diagnostics.reconcileCount += 1;
      diagnostics.lastUserMessageCount = current.filter(item => item.role === 'user').length;
      diagnostics.lastAssistantMessageCount = current.filter(item => item.role === 'assistant').length;
      diagnostics.lastActivity = snapshot.activity === true;
      diagnostics.lastSignalIds = normalizeSignals(snapshot.signalIds);
      if (snapshot.activity === true) diagnostics.activityTrueSnapshots += 1;
      const mainSignature = JSON.stringify([snapshot.mainPresent === true, boundedCount(snapshot.mainCandidateCount)]);
      if (mainSignature !== lastMainSignature) {
        lastMainSignature = mainSignature;
        emitDiagnostic('main_state', {
          main_present: snapshot.mainPresent === true,
          main_candidate_count: boundedCount(snapshot.mainCandidateCount)
        });
      }
      const signalCounts = diagnosticSignals(snapshot);
      const signalSignature = JSON.stringify(signalCounts);
      if (signalSignature !== lastSignalSignature) {
        lastSignalSignature = signalSignature;
        emitDiagnostic('signal_state', { activity: snapshot.activity === true, signals: signalCounts });
      }
      if (isPrefix(baseline, current)) {
        const appendedUsers = current.slice(baseline.length).filter(item => item.role === 'user');
        if (appendedUsers.length) {
          diagnostics.userTurnNodesObserved += appendedUsers.length;
          diagnostics.lastDecision = 'user-turn-observed-awaiting-processing';
          emitDiagnostic('user_turn_observed', {
            user_seq: boundedCount(diagnostics.userTurnNodesObserved),
            user_count: boundedCount(diagnostics.lastUserMessageCount),
            assistant_count: boundedCount(diagnostics.lastAssistantMessageCount)
          });
          if (active) {
            emitDiagnostic('cycle_decision', { decision: 'abandoned', reason: 'superseded_user_turn', event_phase: 'none' });
            clearSettle(); active = null; inactiveSince = null;
          }
          pendingUser = appendedUsers[appendedUsers.length - 1];
        }
      } else if (active && !current.some(item => item.node === active.userNode && item.role === 'user')) {
        emitDiagnostic('cycle_decision', { decision: 'abandoned', reason: 'user_node_missing', event_phase: 'none' });
        clearSettle(); active = null; inactiveSince = null;
      }

      const activity = snapshot.activity === true;
      const risingEdge = !lastActivity && activity;
      if (risingEdge) diagnostics.activityRisingEdges += 1;
      if (lastActivity && !activity) diagnostics.activityFallingEdges += 1;
      if (risingEdge || (lastActivity && !activity)) {
        emitDiagnostic('activity_edge', {
          activity,
          edge: risingEdge ? 'rising' : 'falling',
          signals: diagnosticSignals(snapshot)
        });
      }
      if (risingEdge) {
        if (pendingUser) {
          diagnostics.successfulCorrelations += 1;
          diagnostics.lastDecision = 'user-turn-correlated-with-processing-edge';
          emitDiagnostic('correlation', { correlation: 'matched', user_seq: boundedCount(diagnostics.userTurnNodesObserved) });
          begin(pendingUser, mono, snapshot.signalIds);
          pendingUser = null;
          unmatchedActivity = null;
        } else {
          // The processing UI can appear before ChatGPT attaches the user turn to the DOM.
          // Keep only the timestamp and signal IDs so the later node can be correlated safely.
          unmatchedActivity = { monotonicMs: mono, signalIds: normalizeSignals(snapshot.signalIds) };
          diagnostics.unmatchedActivityEdges += 1;
          diagnostics.lastDecision = 'processing-edge-awaiting-user-turn';
          emitDiagnostic('correlation', { correlation: 'stored_unmatched' });
        }
      }
      if (pendingUser && activity && unmatchedActivity) {
        const delay = mono - unmatchedActivity.monotonicMs;
        diagnostics.userActivityCorrelationAttempts += 1;
        if (delay >= 0 && delay <= USER_ACTIVITY_CORRELATION_MS) {
          diagnostics.successfulCorrelations += 1;
          diagnostics.lastDecision = 'processing-edge-correlated-with-user-turn';
          emitDiagnostic('correlation', { correlation: 'matched', user_seq: boundedCount(diagnostics.userTurnNodesObserved) });
          begin(pendingUser, unmatchedActivity.monotonicMs, unmatchedActivity.signalIds);
          pendingUser = null;
          unmatchedActivity = null;
        } else if (delay > USER_ACTIVITY_CORRELATION_MS) {
          diagnostics.staleActivityEdges += 1;
          diagnostics.lastDecision = 'processing-edge-expired-before-user-turn';
          emitDiagnostic('correlation', { correlation: 'expired', reason: 'correlation_expired' });
          unmatchedActivity = null;
        }
      }
      if (!activity && unmatchedActivity) {
        emitDiagnostic('correlation', { correlation: 'expired', reason: 'activity_ended_before_user' });
        unmatchedActivity = null;
      }
      lastActivity = activity;
      baseline = current;
      evaluateCompletion(mono, snapshot, current);
    }

    const mutationObserver = new Observer(reconcile);
    mutationObserver.observe(options.target, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'aria-label', 'data-is-streaming', 'data-testid', 'data-message-author-role', 'role', 'aria-live', 'disabled', 'data-state', 'class'],
      characterData: true
    });

    return Object.freeze({
      conversationId,
      clockPrecisionMs,
      refresh: reconcile,
      stop() {
        if (stopped) return;
        stopped = true;
        clearSettle();
        mutationObserver.disconnect();
        active = null;
        pendingUser = null;
        inactiveSince = null;
      },
      getState() {
        return {
          active: !!active,
          cycleId: active ? active.id : null,
          pending: !!pendingUser,
          conversationId,
          settling: inactiveSince !== null,
          diagnostics: { ...diagnostics, active: !!active, pending: !!pendingUser, settling: inactiveSince !== null }
        };
      }
    });
  }

  return Object.freeze({
    SETTLE_WINDOW_MS,
    COVERAGE,
    METRIC,
    PLATFORM_ADAPTER,
    MEASUREMENT_METHOD,
    UUID_V7,
    uuidv7,
    measureClockPrecision,
    createCycleObserver
  });
});
