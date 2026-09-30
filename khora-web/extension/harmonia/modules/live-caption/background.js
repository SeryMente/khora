(function () {
  "use strict";

  var BRIDGE_URL = "ws://127.0.0.1:8788/";
  var KHORA_HOST_RE = /^https?:\/\/(khora-web\.vercel\.app|localhost:3000|127\.0\.0\.1:3000)(?:\/|$)/i;
  var STATE_KEY = "khoraLiveCaptionState";
  var socket = null;
  var reconnectTimer = null;
  var reconnectDelay = 500;
  var offscreenReady = false;
  var captureStopResolver = null;

  var DEFAULT_STATE = {
    bridgeStatus: "disconnected",
    bridgeUrl: BRIDGE_URL,
    captionActive: false,
    lastCaptionAt: null,
    armedSessionId: null,
    armedKhoraTabId: null,
    khoraAudioEndpoint: null,
    nextPartIndex: 1,
    captureStatus: "idle",
    captureTabId: null,
    captureStartedAt: null,
    captureError: null,
    sequence: 0
  };

  function iso() { return new Date().toISOString(); }
  function telem(event) { try { if (self.AISTHESIS_TELEMETRY && self.AISTHESIS_TELEMETRY.logEvent) self.AISTHESIS_TELEMETRY.logEvent(event); } catch (_) {} }

  async function readState() {
    var value = await chrome.storage.local.get(STATE_KEY);
    return Object.assign({}, DEFAULT_STATE, value[STATE_KEY] || {});
  }

  async function writeState(patch) {
    var state = await readState();
    state = Object.assign(state, patch || {});
    await chrome.storage.local.set({ [STATE_KEY]: state });
    return state;
  }

  function broadcast(event) {
    chrome.tabs.query({}, function (tabs) {
      (tabs || []).forEach(function (tab) {
        if (!tab || !tab.id || !KHORA_HOST_RE.test(tab.url || "")) return;
        chrome.tabs.sendMessage(tab.id, {
          type: "KHORA_LIVE_CAPTION_EVENT",
          event: event.type || null,
          status: event.status || null,
          text: event.text || null,
          source: event.source || null,
          reason: event.reason || null,
          timestamp: event.timestamp || iso(),
          sequence: event.sequence || null,
          sessionId: event.sessionId || null
        }).catch(function () {});
      });
    });
  }

  async function broadcastAudio(buffer, meta) {
    var state = await readState();
    var targetTabId = state.armedKhoraTabId;
    if (!targetTabId || state.armedSessionId !== meta.sessionId) return;

    try {
      var tab = await chrome.tabs.get(targetTabId);
      if (!tab || !KHORA_HOST_RE.test(tab.url || "")) return;

      var copy = buffer.slice(0);
      chrome.tabs.sendMessage(targetTabId, {
        type: "KHORA_LIVE_CAPTION_EVENT",
        event: "audio.chunk",
        timestamp: meta.timestamp,
        sequence: meta.sequence,
        sessionId: meta.sessionId,
        source: "chrome_tab",
        startMs: meta.startMs,
        endMs: meta.endMs,
        mimeType: meta.mimeType,
        buffer: copy
      }).catch(function () {});
    } catch (_) {}
  }

  function notify(title, message) {
    try {
      chrome.notifications.create("khora-live-caption-" + Date.now(), {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon128.png"),
        title: title,
        message: message
      });
    } catch (_) {}
  }

  async function ensureOffscreen() {
    if (chrome.runtime.getContexts) {
      var contexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [chrome.runtime.getURL("modules/live-caption/offscreen.html")]
      });
      if (contexts && contexts.length) {
        offscreenReady = true;
        return;
      }
    }

    try {
      await chrome.offscreen.createDocument({
        url: "modules/live-caption/offscreen.html",
        reasons: ["USER_MEDIA"],
        justification: "Capturar y registrar el audio de una pestaña de Chrome durante una sesión de Ingreso de Khora."
      });
    } catch (error) {
      if (!String(error).toLowerCase().includes("already exists")) throw error;
    }
    offscreenReady = true;
  }

  async function sendOffscreen(message) {
    await ensureOffscreen();
    return chrome.runtime.sendMessage(Object.assign({}, message, { target: "khora-live-caption-offscreen" }));
  }

  async function connectBridge() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    clearTimeout(reconnectTimer);
    await writeState({ bridgeStatus: "connecting", bridgeUrl: BRIDGE_URL });

    try {
      socket = new WebSocket(BRIDGE_URL);
    } catch (error) {
      socket = null;
      await writeState({ bridgeStatus: "error", bridgeStatusDetail: String(error) });
      scheduleReconnect();
      return;
    }

    socket.addEventListener("open", function () {
      reconnectDelay = 500;
      writeState({ bridgeStatus: "connected", bridgeUrl: BRIDGE_URL, bridgeStatusDetail: null });
      broadcast({ type: "bridge.status", status: "connected", timestamp: iso() });
    });

    socket.addEventListener("message", function (message) {
      try {
        var event = JSON.parse(message.data);
        handleBridgeEvent(event);
      } catch (error) {
        writeState({ bridgeStatus: "error", bridgeStatusDetail: "JSON inválido del bridge" });
      }
    });

    socket.addEventListener("error", function () {
      writeState({ bridgeStatus: "error", bridgeStatusDetail: "No se pudo conectar con el bridge local." });
      telem({moduleId:"live-caption",component:"caption-bridge",action:"BRIDGE_ERROR",severity:"ERROR",payload:{expected:"bridge_available",actual:"websocket_error",satisfied:false}});
    });

    socket.addEventListener("close", function () {
      socket = null;
      writeState({ bridgeStatus: "disconnected", captionActive: false });
      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(function () {
      connectBridge().catch(function () {});
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 15000);
  }

  function handleBridgeEvent(event) {
    if (!event || !event.type) return;

    if (event.type === "bridge.connected") {
      reconnectDelay = 500;
      writeState({ bridgeStatus: "connected", bridgeUrl: BRIDGE_URL, bridgeStatusDetail: null });
    } else if (event.type === "bridge.heartbeat") {
      writeState({ bridgeStatus: "connected", lastHeartbeat: event.timestamp || iso(), bridgeStatusDetail: null });
    } else if (event.type === "caption.status") {
      writeState({
        bridgeStatus: "connected",
        captionActive: event.status === "found",
        lastCaptionAt: event.status === "found" ? (event.timestamp || iso()) : null
      });
    } else if (event.type === "caption.segment") {
      writeState({
        bridgeStatus: "connected",
        captionActive: true,
        lastCaptionAt: event.timestamp || iso(),
        lastCaptionSequence: event.sequence || null
      });
    }

    broadcast(event);
  }

  async function registerSession(sessionId, khoraTabId, nextPartIndex) {
    if (!sessionId) return writeState({ armedSessionId: null, armedKhoraTabId: null, captureStatus: "idle" });
    var khoraAudioEndpoint = null;
    if (khoraTabId) {
      try {
        var khoraTab = await chrome.tabs.get(khoraTabId);
        if (khoraTab && khoraTab.url) {
          khoraAudioEndpoint = new URL("/api/audio", khoraTab.url).href;
        }
      } catch (_) {}
    }

    await writeState({
      armedSessionId: sessionId,
      armedKhoraTabId: khoraTabId || null,
      khoraAudioEndpoint: khoraAudioEndpoint,
      nextPartIndex: Math.max(1, Number(nextPartIndex) || 1),
      captureStatus: "armed",
      captureError: null
    });
    await connectBridge();
    broadcast({ type: "session.armed", sessionId: sessionId, timestamp: iso() });
  }

  async function stopCapture(reason) {
    var before = await readState();

    if (before.captureStatus === "recording") {
      var waitForStop = new Promise(function (resolve) {
        var settled = false;
        captureStopResolver = function () {
          if (settled) return;
          settled = true;
          captureStopResolver = null;
          resolve();
        };
        setTimeout(function () {
          if (captureStopResolver) captureStopResolver();
        }, 10000);
      });

      try { await sendOffscreen({ command: "stop", reason: reason || "manual" }); } catch (_) {}
      await waitForStop;
    }

    var sessionId = before.armedSessionId;
    var tabId = before.armedKhoraTabId;
    await writeState({
      captureStatus: "idle",
      captureTabId: null,
      captureStartedAt: null,
      captureError: null,
      armedSessionId: null,
      armedKhoraTabId: null,
      khoraAudioEndpoint: null,
      nextPartIndex: 1
    });
    broadcast({ type: "capture.status", status: "stopped", reason: reason || "manual", timestamp: iso(), sessionId: sessionId });
    return { sessionId: sessionId, khoraTabId: tabId };
  }

  async function handleActionClick(tab) {
    var state = await readState();
    if (!state.armedSessionId) return false;

    if (!tab || !tab.id) {
      notify("Khora · Audio Chrome", "No pude identificar la pestaña fuente.");
      return true;
    }

    if (KHORA_HOST_RE.test(tab.url || "")) {
      notify("Khora · Audio Chrome", "Cambia primero a la pestaña de Chrome que reproduce el audio y pulsa de nuevo el icono de Aisthesis.");
      return true;
    }

    try {
      var existing = await chrome.tabCapture.getCapturedTabs();
      var duplicate = (existing || []).find(function (item) {
        return item.tabId === tab.id && item.status === "active";
      });
      if (duplicate) {
        notify("Khora · Audio Chrome", "Esa pestaña ya está siendo capturada.");
        return true;
      }

      var streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
      await sendOffscreen({
        command: "start",
        streamId: streamId,
        sessionId: state.armedSessionId,
        sourceTabId: tab.id,
        audioEndpoint: state.khoraAudioEndpoint,
        startPartIndex: state.nextPartIndex
      });

      await writeState({
        captureStatus: "recording",
        captureTabId: tab.id,
        captureStartedAt: iso(),
        captureError: null
      });
      broadcast({
        type: "capture.status",
        status: "recording",
        timestamp: iso(),
        sessionId: state.armedSessionId
      });
      telem({moduleId:"live-caption",component:"tab-capture",action:"CAPTURE_START",severity:"INFO",sessionId:state.armedSessionId,payload:{expected:"recording",actual:"recording",satisfied:true,source:"chrome_tab"}});
      notify("Khora · Audio Chrome", "Captura iniciada para la sesión de Ingreso.");
    } catch (error) {
      await writeState({ captureStatus: "error", captureError: String(error) });
      telem({moduleId:"live-caption",component:"tab-capture",action:"CAPTURE_ERROR",severity:"ERROR",payload:{expected:"recording",actual:"error",satisfied:false},errorDetails:{name:"CaptureError",message:String(error)}});
      broadcast({ type: "capture.status", status: "error", reason: String(error), timestamp: iso() });
      notify("Khora · Audio Chrome", "No se pudo iniciar la captura: " + String(error));
    }

    return true;
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || message.target === "khora-live-caption-offscreen") {
      if (message && message.target === "khora-live-caption-offscreen") {
        if (message.type === "KHORA_LIVE_AUDIO_PART_STORED") {
          broadcast({
            type: "audio.part",
            status: "stored",
            sessionId: message.sessionId || null,
            part: message.part,
            url: message.url,
            bytes: message.bytes,
            sha256: message.sha256 || null,
            source: "chrome_tab",
            startMs: message.startMs,
            endMs: message.endMs,
            duracionMs: message.duracionMs,
            timestamp: message.timestamp || iso()
          });
        } else if (message.type === "KHORA_LIVE_AUDIO_STATUS") {
          if ((message.status === "stopped" || message.status === "error") && captureStopResolver) {
            captureStopResolver();
          }
          writeState({
            captureStatus: message.status || "idle",
            captureError: message.error || null
          }).then(function () {
            broadcast({
              type: "capture.status",
              status: message.status || "idle",
              reason: message.error || null,
              timestamp: message.timestamp || iso(),
              sessionId: message.sessionId || null
            });
          });
        }
        sendResponse({ ok: true });
        return false;
      }
      return false;
    }

    if (message.type === "KHORA_LIVE_CAPTION_COMMAND") {
      (async function () {
        try {
          if (message.command === "arm") {
            await registerSession(
              message.sessionId,
              sender && sender.tab ? sender.tab.id : null,
              Number(message.partStartIndex || 1)
            );
          } else if (message.command === "stop") {
            await stopCapture("session-stopped");
          } else if (message.command === "status") {
            var state = await readState();
            broadcast({
              type: "state",
              status: state.bridgeStatus,
              captureStatus: state.captureStatus,
              captionActive: state.captionActive,
              sessionId: state.armedSessionId,
              timestamp: iso()
            });
          }
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({ ok: false, error: String(error) });
        }
      })();
      return true;
    }

    return false;
  });

  self.KHORA_LIVE_CAPTION_ACTION = handleActionClick;

  chrome.tabs.onRemoved.addListener(function (tabId) {
    readState().then(function (state) {
      if (state.captureTabId === tabId) stopCapture("source-tab-closed").catch(function () {});
      if (state.armedKhoraTabId === tabId) stopCapture("khora-tab-closed").catch(function () {});
    });
  });

  chrome.runtime.onStartup.addListener(function () { connectBridge().catch(function () {}); });
  chrome.runtime.onInstalled.addListener(function () { connectBridge().catch(function () {}); });
  connectBridge().catch(function () {});
})();
