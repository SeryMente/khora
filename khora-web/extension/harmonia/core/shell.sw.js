// ===== Shell de la sombrilla Aisthesis =====
// Service worker raiz. Carga el registro de modulos y arranca los habilitados.
// Cada modulo es un script clasico que registra sus propios listeners de chrome.
importScripts("registry.js");
importScripts("telemetry.js");

const AISTHESIS_MODULES = self.AISTHESIS_REGISTRY || [];
function shellLog(msg, extra) { try { console.log("[aisthesis] " + msg, extra || ""); } catch (e) {} }
shellLog("boot", AISTHESIS_MODULES.map(function (m) { return m.id + ":" + (m.enabled ? "on" : "off"); }).join(" "));

if (self.AISTHESIS_TELEMETRY && self.AISTHESIS_TELEMETRY.logEvent) {
  self.AISTHESIS_TELEMETRY.logEvent({
    moduleId: "harmonia-shell",
    action: "BOOT",
    severity: "INFO",
    payload: {
      modulesConfig: AISTHESIS_MODULES.map(function (m) { return m.id + ":" + (m.enabled ? "on" : "off"); }).join(" ")
    }
  });
}

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      if (self.AISTHESIS_TELEMETRY && self.AISTHESIS_TELEMETRY.logEvent) {
        self.AISTHESIS_TELEMETRY.logEvent({
          moduleId: "harmonia-shell",
          action: "NAVIGATE",
          severity: "INFO",
          payload: {
            url: tab.url,
            title: tab.title
          }
        });
      }
    }
  });
}

// Config compartida en memoria (secretos y ajustes), poblada desde chrome.storage.local.
self.AISTHESIS_CFG = self.AISTHESIS_CFG || {};
try {
  chrome.storage.local.get(null, function (v) { Object.assign(self.AISTHESIS_CFG, v || {}); });
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area !== "local") return;
    for (var k in ch) { self.AISTHESIS_CFG[k] = ch[k].newValue; }
  });
} catch (e) {}

// Carga (importScripts) el background de cada modulo habilitado. Paths relativos a /core.
for (var i = 0; i < AISTHESIS_MODULES.length; i++) {
  var mod = AISTHESIS_MODULES[i];
  if (mod.enabled && mod.background) {
    try {
      importScripts("../" + mod.background);
      shellLog("module loaded: " + mod.id);
    }
    catch (e) {
      shellLog("module FAILED: " + mod.id, String(e));
      if (self.AISTHESIS_TELEMETRY && self.AISTHESIS_TELEMETRY.logEvent) {
        self.AISTHESIS_TELEMETRY.logEvent({
          moduleId: mod.id,
          action: "ERROR",
          severity: "ERROR",
          payload: { stage: "module_load" },
          errorDetails: { message: String(e) }
        });
      }
    }
  }
}
