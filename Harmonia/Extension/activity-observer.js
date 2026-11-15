'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HarmoniaActivityObserver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ALLOWED_SIGNALS = Object.freeze(['aria-busy', 'data-is-streaming', 'stop-control', 'agent-progress']);
  const DIAGNOSTIC_STAGES = new Set(['observer_started', 'main_state', 'signal_state', 'activity_transition', 'worker_ack']);

  function boundedCount(value) {
    return Number.isFinite(value) ? Math.max(0, Math.min(500, Math.trunc(value))) : 0;
  }

  function normalizeSignals(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(signal => ALLOWED_SIGNALS.includes(signal)))].sort();
  }

  function normalizedSnapshot(value) {
    const snapshot = value && typeof value === 'object' ? value : {};
    const messages = Array.isArray(snapshot.messages)
      ? snapshot.messages.filter(item => item && (item.role === 'user' || item.role === 'assistant'))
      : [];
    return {
      activity: snapshot.activity === true,
      signalIds: normalizeSignals(snapshot.signalIds),
      mainPresent: snapshot.mainPresent === true,
      mainCandidateCount: boundedCount(snapshot.mainCandidateCount),
      userMessageCount: boundedCount(messages.filter(item => item.role === 'user').length),
      assistantMessageCount: boundedCount(messages.filter(item => item.role === 'assistant').length),
      signalPresence: snapshot.signalPresence && typeof snapshot.signalPresence === 'object' ? snapshot.signalPresence : {}
    };
  }

  function createActivityObserver(options) {
    if (!options || typeof options.getSnapshot !== 'function') throw new TypeError('snapshot_provider_required');
    if (!options.target) throw new TypeError('observer_target_required');
    const Observer = options.MutationObserverCtor || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
    if (!Observer) throw new TypeError('mutation_observer_required');
    if (typeof options.onEvent !== 'function') throw new TypeError('event_sink_required');

    const onDiagnostic = typeof options.onDiagnostic === 'function' ? options.onDiagnostic : null;
    const diagnostics = {
      reconcileCount: 0,
      activitySnapshots: 0,
      activityTransitions: 0,
      activeTransitions: 0,
      inactiveTransitions: 0,
      eventSinkAttempts: 0,
      eventSinkAccepted: 0,
      eventSinkRejected: 0,
      eventSinkErrors: 0,
      lastActivity: false,
      lastSignalIds: [],
      lastDecision: 'observer_initialized'
    };
    let current = normalizedSnapshot(options.getSnapshot());
    let stopped = false;
    let lastMainSignature = JSON.stringify([current.mainPresent, current.mainCandidateCount]);
    let lastSignalSignature = JSON.stringify(current.signalIds);
    diagnostics.lastActivity = current.activity;
    diagnostics.lastSignalIds = [...current.signalIds];
    diagnostics.activitySnapshots = current.activity ? 1 : 0;

    function emitDiagnostic(stage, fields = {}) {
      if (!onDiagnostic || !DIAGNOSTIC_STAGES.has(stage)) return;
      const payload = { stage, ...fields };
      try {
        const result = onDiagnostic(payload);
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch (_) {}
    }

    function recordSink(result, failed = false) {
      const rejected = failed || result === false || result?.ok === false;
      if (failed) diagnostics.eventSinkErrors += 1;
      else if (rejected) diagnostics.eventSinkRejected += 1;
      else diagnostics.eventSinkAccepted += 1;
      emitDiagnostic('worker_ack', { sink_result: failed ? 'error' : rejected ? 'rejected' : 'accepted' });
    }

    function emitState(transition, snapshot) {
      diagnostics.eventSinkAttempts += 1;
      diagnostics.activityTransitions += transition === 'INITIALIZED' ? 0 : 1;
      if (snapshot.activity) diagnostics.activeTransitions += transition === 'ACTIVATED' ? 1 : 0;
      else diagnostics.inactiveTransitions += transition === 'DEACTIVATED' ? 1 : 0;
      diagnostics.lastActivity = snapshot.activity;
      diagnostics.lastSignalIds = [...snapshot.signalIds];
      diagnostics.lastDecision = transition.toLowerCase();

      const payload = {
        state: snapshot.activity ? 'ACTIVE' : 'INACTIVE',
        transition,
        signal_ids: snapshot.signalIds,
        main_present: snapshot.mainPresent,
        main_candidate_count: snapshot.mainCandidateCount,
        user_message_count: snapshot.userMessageCount,
        assistant_message_count: snapshot.assistantMessageCount
      };
      try {
        const result = options.onEvent('ui.activity.state', payload);
        if (result && typeof result.then === 'function') result.then(value => recordSink(value), () => recordSink(null, true));
        else recordSink(result);
      } catch (_) {
        recordSink(null, true);
      }
      emitDiagnostic('activity_transition', {
        state: payload.state,
        transition,
        signal_ids: payload.signal_ids,
        user_message_count: payload.user_message_count,
        assistant_message_count: payload.assistant_message_count
      });
    }

    emitDiagnostic('observer_started', {
      main_present: current.mainPresent,
      main_candidate_count: current.mainCandidateCount,
      state: current.activity ? 'ACTIVE' : 'INACTIVE',
      signal_ids: current.signalIds
    });
    emitDiagnostic('main_state', {
      main_present: current.mainPresent,
      main_candidate_count: current.mainCandidateCount
    });
    emitDiagnostic('signal_state', {
      signal_ids: current.signalIds,
      activity: current.activity
    });
    emitState('INITIALIZED', current);

    function reconcile() {
      if (stopped) return;
      const next = normalizedSnapshot(options.getSnapshot());
      diagnostics.reconcileCount += 1;
      if (next.activity) diagnostics.activitySnapshots += 1;

      const mainSignature = JSON.stringify([next.mainPresent, next.mainCandidateCount]);
      if (mainSignature !== lastMainSignature) {
        lastMainSignature = mainSignature;
        emitDiagnostic('main_state', {
          main_present: next.mainPresent,
          main_candidate_count: next.mainCandidateCount
        });
      }

      const signalSignature = JSON.stringify(next.signalIds);
      if (signalSignature !== lastSignalSignature) {
        lastSignalSignature = signalSignature;
        emitDiagnostic('signal_state', {
          signal_ids: next.signalIds,
          activity: next.activity
        });
      }

      if (next.activity !== current.activity) {
        emitState(next.activity ? 'ACTIVATED' : 'DEACTIVATED', next);
      }
      current = next;
    }

    const observer = new Observer(() => reconcile());
    observer.observe(options.target, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-is-streaming', 'aria-label', 'data-testid', 'class', 'disabled', 'hidden', 'aria-hidden', 'data-state']
    });

    return {
      stop() {
        if (stopped) return;
        stopped = true;
        observer.disconnect();
      },
      reconcile,
      getState() {
        return {
          active: current.activity,
          stopped,
          diagnostics: { ...diagnostics, lastSignalIds: [...diagnostics.lastSignalIds] },
          snapshot: {
            mainPresent: current.mainPresent,
            mainCandidateCount: current.mainCandidateCount,
            userMessageCount: current.userMessageCount,
            assistantMessageCount: current.assistantMessageCount,
            activity: current.activity,
            signalIds: [...current.signalIds]
          }
        };
      }
    };
  }

  return Object.freeze({ ALLOWED_SIGNALS, createActivityObserver });
});
