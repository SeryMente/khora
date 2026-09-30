/**
 * Telemetría + observaciones diagnósticas de Harmonia.
 * Cada evento marca el registro como "dirty" y activa un scheduler persistente.
 * Nunca se hace una llamada de red por evento: los eventos se agrupan y se
 * sincronizan con debounce/umbral, con un vuelo de red a la vez.
 */
self.AISTHESIS_TELEMETRY = self.AISTHESIS_TELEMETRY || {};

const TELEMETRY_STORAGE_KEY = "AISTHESIS_TELEMETRY_BUFFER";
const TELEMETRY_LAST_REPORTED_KEY = "AISTHESIS_TELEMETRY_LAST_REPORTED_UUID";
const TELEMETRY_SYNC_STATE_KEY = "AISTHESIS_TELEMETRY_SYNC_STATE";
const MAX_TELEMETRY_EVENTS = 1000;

const OBS_SYNC_ALARM = "khora-observation-sync";
const OBS_SYNC_DEBOUNCE_MS = 5000;
const OBS_SYNC_MAX_WAIT_MS = 30000;
const OBS_SYNC_BATCH_THRESHOLD = 25;
const OBS_SYNC_BATCH_MAX_EVENTS = 50;
const OBSERVATION_BATCH_SCHEMA_VERSION = "2.0";
let telemetryWriteChain = Promise.resolve();

function generateSessionId() {
  if (self.crypto && self.crypto.randomUUID) return self.crypto.randomUUID();
  var bytes = new Uint8Array(16);
  if (self.crypto && self.crypto.getRandomValues) {
    self.crypto.getRandomValues(bytes);
  } else {
    for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  var hex = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
}
const currentSessionId = generateSessionId();

function uuid() { return generateSessionId(); }

function safeString(value, max) {
  var text = String(value == null ? "" : value);
  return text.slice(0, max || 256);
}

function redactString(value, max) {
  var text = safeString(value, max || 256);
  text = text.replace(/(ghp_|github_pat_|vcp_|gsk_|ntn_|secret_)[A-Za-z0-9_]{8,}/g, "[REDACTED]");
  text = text.replace(/Bearer\s+[A-Za-z0-9._~-]{16,}/gi, "Bearer [REDACTED]");
  return text;
}

function sanitizeScalar(key, value) {
  var k = String(key || "").toLowerCase();
  if (/token|secret|password|cookie|authorization|credential|base64|transcript|transcription|dictation|verbatim|raw_audio|audio_data|speech_text|text_content|content_text|message|stack|description|content|caption|text|title|url|href|path|body/.test(k)) {
    return undefined;
  }
  if (k === "url" || k === "href") return undefined;
  if (typeof value === "string") return redactString(value, 256);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return value;
}

function sanitizeDiagnosticObject(value, depth) {
  if (depth > 4) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 30).map(function (v) { return sanitizeDiagnosticObject(v, depth + 1); });
  if (value && typeof value === "object") {
    var out = {};
    Object.keys(value).slice(0, 60).forEach(function (key) {
      var cleaned = sanitizeScalar(key, value[key]);
      if (cleaned === undefined) return;
      out[key] = (cleaned && typeof cleaned === "object")
        ? sanitizeDiagnosticObject(cleaned, depth + 1)
        : cleaned;
    });
    return out;
  }
  return sanitizeScalar("", value);
}

function inferScope(event) {
  var a = String(event.action || event.event || "").toLowerCase();
  var m = String(event.moduleId || "").toLowerCase();
  var c = String(event.component || "").toLowerCase();
  var text = a + " " + m + " " + c;
  if (/uia|accessib|caption|bridge/.test(text)) return "bridge";
  if (/capture|record|tabcapture|stream/.test(text)) return "capture";
  if (/transcri/.test(text)) return "transcription";
  if (/storage|persist|chunk|blob|database/.test(text)) return "storage";
  if (/network|fetch|websocket|connect|http|retry/.test(text)) return "network";
  if (/auth|permission|cookie/.test(text)) return "auth";
  if (/ui|popup|options|click|button|navigate/.test(text)) return "ui";
  if (/deploy|release|version/.test(text)) return "deployment";
  if (/runtime|boot|module/.test(text)) return "runtime";
  return "unknown";
}

function inferCategory(event) {
  var a = String(event.action || event.event || "").toLowerCase();
  var p = event.payload || {};
  var e = event.errorDetails || {};
  var sev = String(event.severity || "").toUpperCase();
  if (/error|fail|exception|abort/.test(a) || sev === "ERROR" || sev === "CRITICAL") return "error";
  if (/warn/.test(a) || sev === "WARN") return "warning";
  if (/permission|denied/.test(a)) return "permissions";
  if (/boot|start|stop|install|uninstall|ready|shutdown/.test(a)) return "lifecycle";
  if (/state|status|transition|armed|recording|connected|disconnected/.test(a)) return "state_transition";
  if (/connect|heartbeat|retry|websocket|fetch/.test(a)) return "connectivity";
  if (/capture|record|chunk|stream|audio/.test(a)) return "audio_capture";
  if (/caption|uia|accessib/.test(a)) return "accessibility";
  if (/store|persist|save|delete/.test(a)) return "persistence";
  if (/latency|duration|timeout|slow/.test(a)) return "performance";
  if (/config|setting|manifest|dependency/.test(a)) return "configuration";
  if (p && (p.expected !== undefined || p.actual !== undefined)) return "diagnostic";
  if (e && (e.code || e.name)) return "diagnostic";
  if (/click|navigate|user/.test(a)) return "user_action";
  return "unknown";
}

function inferOutcome(event) {
  if (event.outcome) return String(event.outcome).toUpperCase();
  if (event.severity === "CRITICAL" || event.severity === "ERROR") return "FAILURE";
  if (event.severity === "WARN") return "PARTIAL";
  return "SUCCESS";
}

function browserInfo() {
  var ua = (self.navigator && self.navigator.userAgent) || "unknown";
  var match = ua.match(/(?:Chrome|Chromium|Edg|OPR)\/([0-9.]+)/i);
  var version = match ? match[1] : "unknown";
  var name = /Edg\//i.test(ua) ? "Edge" : (/OPR\//i.test(ua) ? "Opera" : (/Chromium\//i.test(ua) ? "Chromium" : "Chrome"));
  return { name: name, version: version, user_agent: safeString(ua, 512) };
}

async function readTelemetryState() {
  var result = await chrome.storage.local.get([
    TELEMETRY_STORAGE_KEY,
    TELEMETRY_LAST_REPORTED_KEY,
    TELEMETRY_SYNC_STATE_KEY
  ]);
  return {
    buffer: Array.isArray(result[TELEMETRY_STORAGE_KEY]) ? result[TELEMETRY_STORAGE_KEY] : [],
    lastReportedUuid: result[TELEMETRY_LAST_REPORTED_KEY] || null,
    sync: result[TELEMETRY_SYNC_STATE_KEY] || {}
  };
}

async function countUnsynced(buffer, lastReportedUuid) {
  if (!buffer.length) return 0;
  if (!lastReportedUuid) return buffer.length;
  var idx = buffer.findIndex(function (event) { return event && event.eventUuid === lastReportedUuid; });
  return idx >= 0 ? buffer.length - idx - 1 : buffer.length;
}

async function armObservationAlarm(delayMs) {
  if (!chrome.alarms || !chrome.alarms.create) return false;
  var when = Date.now() + Math.max(250, Number(delayMs) || OBS_SYNC_DEBOUNCE_MS);
  try {
    var existing = await chrome.alarms.get(OBS_SYNC_ALARM);
    if (existing && existing.scheduledTime <= when) return true;
    await chrome.alarms.create(OBS_SYNC_ALARM, { when: when });
    return true;
  } catch (error) {
    try { chrome.alarms.create(OBS_SYNC_ALARM, { when: when }); return true; } catch (_) { return false; }
  }
}

async function scheduleObservationSync(reason) {
  try {
    var state = await readTelemetryState();
    var now = Date.now();
    var dirtySince = Number(state.sync.dirtySince || 0) || now;
    var unsynced = await countUnsynced(state.buffer, state.lastReportedUuid);
    if (unsynced <= 0) {
      await chrome.storage.local.set({
        [TELEMETRY_SYNC_STATE_KEY]: Object.assign({}, state.sync, {
          dirtySince: 0,
          pendingCount: 0,
          nextRetryAt: 0,
          scheduleReason: reason || "event",
          schedulerVersion: OBSERVATION_BATCH_SCHEMA_VERSION
        })
      });
      return false;
    }
    var delay = OBS_SYNC_DEBOUNCE_MS;
    if (unsynced >= OBS_SYNC_BATCH_THRESHOLD) delay = 250;
    else delay = Math.max(250, Math.min(OBS_SYNC_DEBOUNCE_MS, dirtySince + OBS_SYNC_MAX_WAIT_MS - now));
    var nextRetryAt = Number(state.sync.nextRetryAt || 0) || 0;
    if (nextRetryAt > now) delay = Math.max(delay, nextRetryAt - now);

    await chrome.storage.local.set({
      [TELEMETRY_SYNC_STATE_KEY]: Object.assign({}, state.sync, {
        dirtySince: dirtySince,
        lastEventAt: now,
        pendingCount: unsynced,
        scheduleReason: reason || "event",
        schedulerVersion: OBSERVATION_BATCH_SCHEMA_VERSION
      })
    });
    await armObservationAlarm(delay);
  } catch (error) {
    try { console.error("[Telemetry] No se pudo programar sincronización:", error); } catch (_) {}
  }
}

self.AISTHESIS_TELEMETRY.scheduleObservationSync = scheduleObservationSync;

self.AISTHESIS_TELEMETRY.logEvent = function (event) {
  try {
    var fullEvent = Object.assign({}, event, {
      eventUuid: event.eventUuid || uuid(),
      timestamp: new Date().toISOString(),
      sessionId: event.sessionId || currentSessionId
    });

    telemetryWriteChain = telemetryWriteChain
      .then(function () {
        return new Promise(function (resolve) {
          chrome.storage.local.get(TELEMETRY_STORAGE_KEY, function(result) {
            var buffer = Array.isArray(result[TELEMETRY_STORAGE_KEY]) ? result[TELEMETRY_STORAGE_KEY] : [];
            buffer.push(fullEvent);
            if (buffer.length > MAX_TELEMETRY_EVENTS) buffer = buffer.slice(-MAX_TELEMETRY_EVENTS);

            chrome.storage.local.set({ [TELEMETRY_STORAGE_KEY]: buffer }, function() {
              if (chrome.runtime.lastError) {
                console.error("[Telemetry] Failed to save:", chrome.runtime.lastError);
              } else if (!fullEvent.suppressObservationSync) {
                scheduleObservationSync("event");
              }
              resolve();
            });
          });
        });
      })
      .catch(function (error) {
        try { console.error("[Telemetry] Error en cola de persistencia:", error); } catch (_) {}
      });
  } catch (err) {
    console.error("[Telemetry] Error in logEvent:", err);
  }
};

self.AISTHESIS_TELEMETRY.buildLatestBatch = async function (maxEvents) {
  var state = await readTelemetryState();
  if (!state.buffer.length) return null;

  var limit = Math.max(1, Math.min(Number(maxEvents) || OBS_SYNC_BATCH_MAX_EVENTS, OBS_SYNC_BATCH_MAX_EVENTS));
  var startIndex = 0;
  var partial = false;
  if (state.lastReportedUuid) {
    var lastIndex = state.buffer.findIndex(function (event) {
      return event && event.eventUuid === state.lastReportedUuid;
    });
    if (lastIndex >= 0) {
      startIndex = lastIndex + 1;
    } else {
      partial = true;
    }
  }

  var candidates = state.buffer.slice(startIndex, startIndex + limit);
  if (!candidates.length) return null;
  if (state.buffer.length > startIndex + candidates.length) partial = true;

  var manifest = chrome.runtime.getManifest ? chrome.runtime.getManifest() : {};
  var events = candidates.map(function (event, index) {
    var payload = sanitizeDiagnosticObject(event.payload || {}, 0) || {};
    var errorDetails = sanitizeDiagnosticObject(event.errorDetails || {}, 0) || {};
    var expected = payload.expected;
    var actual = payload.actual;
    var errorCode = errorDetails && (errorDetails.code || errorDetails.name)
      ? safeString(errorDetails.code || errorDetails.name, 200)
      : null;
    var eventUuid = event.eventUuid || uuid();
    var severity = ["INFO", "WARN", "ERROR", "CRITICAL"].indexOf(String(event.severity || "").toUpperCase()) >= 0
      ? String(event.severity).toUpperCase()
      : "INFO";
    var correlationId = event.correlationId || currentSessionId;

    var metrics = {};
    Object.keys(payload).forEach(function (key) {
      if (["expected", "actual", "satisfied", "failure_stage"].indexOf(key) >= 0) return;
      if (payload[key] !== undefined) metrics[key] = payload[key];
    });
    if (Object.keys(errorDetails).length) metrics.error = errorDetails;

    var diagnostic = (expected !== undefined || actual !== undefined || errorCode)
      ? {
          expected: expected,
          actual: actual,
          satisfied: typeof payload.satisfied === "boolean" ? payload.satisfied : undefined,
          failure_stage: payload.failure_stage ? safeString(payload.failure_stage, 200) : undefined,
          error_code: errorCode,
          error_fingerprint: errorCode ? safeString(errorCode + ":" + (event.action || event.eventName || "EVENT"), 128) : undefined
        }
      : undefined;

    return {
      schema_version: OBSERVATION_BATCH_SCHEMA_VERSION,
      event_uuid: eventUuid,
      event_name: safeString(event.eventName || ((event.moduleId || "runtime") + "." + (event.action || "EVENT")), 200),
      scope: inferScope(event),
      category: inferCategory(event),
      severity: severity,
      outcome: inferOutcome(event),
      component: safeString(event.component || event.moduleId || "harmonia", 200),
      correlation_id: correlationId,
      causation_id: event.causationId || null,
      attempt_id: event.attemptId || null,
      sequence: index + 1,
      session_id: event.sessionId || currentSessionId,
      client_time: event.timestamp || new Date().toISOString(),
      duration_ms: typeof event.durationMs === "number" && event.durationMs >= 0 ? event.durationMs : null,
      reason_code: event.reasonCode || errorCode || null,
      diagnostic: diagnostic,
      metrics: metrics,
      release_sha: event.releaseSha || null,
      privacy_class: "ANONYMIZED_TELEMETRY"
    };
  });

  var severityCounts = {}, outcomeCounts = {}, scopeCounts = {}, categoryCounts = {}, componentCounts = {};
  var failureCount = 0, warningCount = 0, expectationGapCount = 0;
  events.forEach(function (event) {
    severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
    outcomeCounts[event.outcome] = (outcomeCounts[event.outcome] || 0) + 1;
    scopeCounts[event.scope] = (scopeCounts[event.scope] || 0) + 1;
    categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    componentCounts[event.component] = (componentCounts[event.component] || 0) + 1;
    if (event.outcome === "FAILURE" || event.severity === "CRITICAL") failureCount++;
    if (event.severity === "WARN") warningCount++;
    if (event.diagnostic && event.diagnostic.satisfied === false) expectationGapCount++;
  });

  var sessions = [];
  events.forEach(function (event) {
    if (sessions.indexOf(event.session_id) < 0) sessions.push(event.session_id);
  });
  var releaseSha = null;
  for (var r = 0; r < events.length; r++) {
    if (events[r].release_sha) { releaseSha = events[r].release_sha; break; }
  }

  return {
    schema_version: OBSERVATION_BATCH_SCHEMA_VERSION,
    batch_id: uuid(),
    source: "harmonia-extension",
    extension_version: safeString(manifest.version || "unknown", 64),
    session_id: sessions.length === 1 ? sessions[0] : "mixed",
    generated_at: new Date().toISOString(),
    first_event_at: events[0] ? events[0].client_time : null,
    last_event_at: events.length ? events[events.length - 1].client_time : null,
    partial: partial,
    release_sha: releaseSha,
    environment: {
      browser: browserInfo(),
      platform: safeString((self.navigator && self.navigator.platform) || "unknown", 128),
      language: safeString((self.navigator && self.navigator.language) || "unknown", 64),
      timezone: safeString((Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : "unknown") || "unknown", 128),
      online: !!(self.navigator && self.navigator.onLine)
    },
    summary: {
      event_count: events.length,
      severity_counts: severityCounts,
      outcome_counts: outcomeCounts,
      scope_counts: scopeCounts,
      category_counts: categoryCounts,
      component_counts: componentCounts,
      failure_count: failureCount,
      warning_count: warningCount,
      expectation_gap_count: expectationGapCount
    },
    events: events
  };
};

self.AISTHESIS_TELEMETRY.markReported = async function (batch) {
  if (!batch || !batch.events || !batch.events.length) return;
  var last = batch.events[batch.events.length - 1].event_uuid;
  var state = await readTelemetryState();
  var unsynced = await countUnsynced(state.buffer, last);
  await chrome.storage.local.set({
    [TELEMETRY_LAST_REPORTED_KEY]: last,
    [TELEMETRY_SYNC_STATE_KEY]: Object.assign({}, state.sync, {
      dirtySince: unsynced > 0 ? (state.sync.dirtySince || Date.now()) : 0,
      pendingCount: unsynced,
      lastSuccessAt: Date.now(),
      failureCount: 0,
      nextRetryAt: 0
    }),
    AISTHESIS_TELEMETRY_LAST_BATCH_ID: batch.batch_id
  });
  if (unsynced > 0) await armObservationAlarm(250);
};

self.AISTHESIS_TELEMETRY.noteSyncFailure = async function () {
  var state = await readTelemetryState();
  var failureCount = Number(state.sync.failureCount || 0) + 1;
  var backoff = Math.min(60000, 5000 * Math.pow(2, Math.min(failureCount - 1, 3)));
  await chrome.storage.local.set({
    [TELEMETRY_SYNC_STATE_KEY]: Object.assign({}, state.sync, {
      failureCount: failureCount,
      lastFailureAt: Date.now(),
      nextRetryAt: Date.now() + backoff,
      pendingCount: await countUnsynced(state.buffer, state.lastReportedUuid)
    })
  });
  await armObservationAlarm(backoff);
};
