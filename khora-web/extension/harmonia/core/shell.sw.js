// ===== Shell de la sombrilla Aisthesis =====
importScripts("registry.js");
importScripts("telemetry.js");

const AISTHESIS_MODULES = self.AISTHESIS_REGISTRY || [];
const KHORA_HOST_RE = /^https?:\/\/(khora-web\.vercel\.app|localhost:3000|127\.0\.0\.1:3000)(?:\/|$)/i;
const REPORT_ALARM = "khora-observation-sync";

function shellLog(msg, extra) { try { console.log("[aisthesis] " + msg, extra || ""); } catch (e) {} }
function telem(event) {
  try {
    if (self.AISTHESIS_TELEMETRY && self.AISTHESIS_TELEMETRY.logEvent) {
      self.AISTHESIS_TELEMETRY.logEvent(event);
    }
  } catch (_) {}
}

async function findKhoraTab() {
  var tabs = await chrome.tabs.query({
    url: [
      "https://khora-web.vercel.app/*",
      "http://localhost:3000/*",
      "http://127.0.0.1:3000/*"
    ]
  });
  return (tabs || [])
    .filter(function(tab) { return tab && tab.id && tab.status === "complete"; })
    .sort(function(a,b) { return Number(!!b.active) - Number(!!a.active); })[0] || null;
}

var reportPromise = null;

async function reportLatestObservations(options) {
  options = options || {};
  if (reportPromise) return reportPromise;

  reportPromise = (async function () {
    var batch = await self.AISTHESIS_TELEMETRY.buildLatestBatch(50);
    if (!batch) return { ok: true, skipped: true, reason: "no-new-observations" };

    var target = await findKhoraTab();
    if (!target || !target.id) {
      if (!options.manual) {
        await self.AISTHESIS_TELEMETRY.noteSyncFailure();
      }
      telem({
        suppressObservationSync: true,
        moduleId: "harmonia-observation-reporter",
        component: "observation-reporter",
        action: "REPORT_BLOCKED",
        severity: options.manual ? "WARN" : "INFO",
        payload: {
          expected: "authenticated_khora_tab",
          actual: "none",
          satisfied: false,
          reason: "khora_tab_not_available",
          automatic: !options.manual
        }
      });
      return { ok: false, error: "Abre Khora en una pestaña autenticada antes de reportar." };
    }

    return new Promise(function(resolve) {
      chrome.tabs.sendMessage(
        target.id,
        { type: "KHORA_OBSERVATION_REPORT_REQUEST", batch: batch, manual: !!options.manual },
        async function(response) {
          if (chrome.runtime.lastError) {
            await self.AISTHESIS_TELEMETRY.noteSyncFailure();
            telem({
              suppressObservationSync: true,
              moduleId: "harmonia-observation-reporter",
              component: "observation-reporter",
              action: "REPORT_FAIL",
              severity: "ERROR",
              payload: { expected: "content_script_response", actual: "runtime_error", satisfied: false, automatic: !options.manual },
              errorDetails: { name: "RuntimeMessageError", message: String(chrome.runtime.lastError.message || "") }
            });
            resolve({ ok: false, error: String(chrome.runtime.lastError.message || "Content script no disponible") });
            return;
          }

          if (response && response.ok) {
            await self.AISTHESIS_TELEMETRY.markReported(batch);
            telem({
              suppressObservationSync: true,
              moduleId: "harmonia-observation-reporter",
              component: "observation-reporter",
              action: "REPORT_OK",
              severity: "INFO",
              payload: {
                expected: "repository_commit",
                actual: "repository_commit",
                satisfied: true,
                batchId: batch.batch_id,
                eventCount: batch.events.length,
                branch: response.result && response.result.branch,
                commitSha: response.result && response.result.commit_sha,
                automatic: !options.manual
              }
            });
            resolve({ ok: true, result: response.result });
          } else {
            await self.AISTHESIS_TELEMETRY.noteSyncFailure();
            telem({
              suppressObservationSync: true,
              moduleId: "harmonia-observation-reporter",
              component: "observation-reporter",
              action: "REPORT_FAIL",
              severity: "ERROR",
              payload: {
                expected: "repository_commit",
                actual: "publish_failed",
                satisfied: false,
                batchId: batch.batch_id,
                automatic: !options.manual,
                error: response && response.error ? String(response.error).slice(0, 300) : "unknown"
              }
            });
            resolve({ ok: false, error: response && response.error ? response.error : "No se pudo publicar el batch." });
          }
        }
      );
    });
  })().finally(function () { reportPromise = null; });

  return reportPromise;
}

telem({
  moduleId: "harmonia-shell",
  component: "harmonia-shell",
  action: "BOOT",
  severity: "INFO",
  payload: {
    modulesConfig: AISTHESIS_MODULES.map(function (m) { return m.id + ":" + (m.enabled ? "on" : "off"); }).join(" "),
    observationSync: "event-driven-debounced"
  }
});

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && tab.url) {
      telem({
        moduleId: "harmonia-shell",
        component: "tab-observer",
        action: "NAVIGATE",
        severity: "INFO",
        payload: { url: tab.url, title: tab.title }
      });
    }
  });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (!alarm || alarm.name !== REPORT_ALARM) return;
  reportLatestObservations({ manual: false }).catch(function (error) {
    telem({
      suppressObservationSync: true,
      moduleId: "harmonia-observation-reporter",
      component: "observation-reporter",
      action: "REPORT_FAIL",
      severity: "ERROR",
      payload: { expected: "report_completed", actual: "exception", satisfied: false },
      errorDetails: { name: "ReportException", message: String(error) }
    });
  });
});

function installReporterMessageHandler() {
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (!message || message.type !== "KHORA_REPORT_OBSERVATIONS") return false;
    reportLatestObservations({ manual: true })
      .then(function(result) { sendResponse(result); })
      .catch(function(error) { sendResponse({ ok: false, error: String(error) }); });
    return true;
  });
}
installReporterMessageHandler();

function reconcileObservationScheduler(reason) {
  try {
    if (self.AISTHESIS_TELEMETRY && self.AISTHESIS_TELEMETRY.scheduleObservationSync) {
      self.AISTHESIS_TELEMETRY.scheduleObservationSync(reason || "shell_ready").catch(function () {});
    }
  } catch (_) {}
}
chrome.runtime.onStartup.addListener(function () { reconcileObservationScheduler("startup"); });
chrome.runtime.onInstalled.addListener(function () { reconcileObservationScheduler("installed"); });
reconcileObservationScheduler("shell_ready");

self.AISTHESIS_REPORT_LATEST = reportLatestObservations;

self.AISTHESIS_CFG = self.AISTHESIS_CFG || {};
try {
  chrome.storage.local.get(null, function (v) { Object.assign(self.AISTHESIS_CFG, v || {}); });
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area !== "local") return;
    for (var k in ch) self.AISTHESIS_CFG[k] = ch[k].newValue;
  });
} catch (e) {}

for (var i = 0; i < AISTHESIS_MODULES.length; i++) {
  var mod = AISTHESIS_MODULES[i];
  if (mod.enabled && mod.background) {
    try {
      importScripts("../" + mod.background);
      shellLog("module loaded: " + mod.id);
    }
    catch (e) {
      shellLog("module FAILED: " + mod.id, String(e));
      telem({
        suppressObservationSync: true,
        moduleId: mod.id,
        component: mod.id,
        action: "ERROR",
        severity: "ERROR",
        payload: {
          stage: "module_load",
          expected: "module_loaded",
          actual: "module_failed",
          satisfied: false
        },
        errorDetails: { name: "ModuleLoadError", message: String(e) }
      });
    }
  }
}
