/**
 * Telemetry Logger for Harmonia Extension
 * Conforms to ITelemetryEvent schema and stores in chrome.storage.local circular buffer
 */

self.AISTHESIS_TELEMETRY = self.AISTHESIS_TELEMETRY || {};

const TELEMETRY_STORAGE_KEY = 'AISTHESIS_TELEMETRY_BUFFER';
const MAX_TELEMETRY_EVENTS = 1000;

function generateSessionId() {
  if (self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const currentSessionId = generateSessionId();

/**
 * Registra un evento de telemetría en el buffer de la extensión
 * @param {Omit<ITelemetryEvent, 'timestamp'|'sessionId'>} event
 */
self.AISTHESIS_TELEMETRY.logEvent = function (event) {
  try {
    const fullEvent = Object.assign({}, event, {
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId
    });

    chrome.storage.local.get(TELEMETRY_STORAGE_KEY, function(result) {
      let buffer = result[TELEMETRY_STORAGE_KEY];
      if (!Array.isArray(buffer)) {
        buffer = [];
      }

      buffer.push(fullEvent);

      // Keep only the last MAX_TELEMETRY_EVENTS
      if (buffer.length > MAX_TELEMETRY_EVENTS) {
        buffer = buffer.slice(buffer.length - MAX_TELEMETRY_EVENTS);
      }

      chrome.storage.local.set({ [TELEMETRY_STORAGE_KEY]: buffer }, function() {
        if (chrome.runtime.lastError) {
          console.error("[Telemetry] Failed to save:", chrome.runtime.lastError);
        } else {
          // Optional: we can also log to console for debugging
          // console.debug(`[Telemetry] ${fullEvent.severity} ${fullEvent.action}:`, fullEvent);
        }
      });
    });
  } catch (err) {
    console.error("[Telemetry] Error in logEvent:", err);
  }
};
