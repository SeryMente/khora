(function () {
  "use strict";

  var stream = null;
  var recorder = null;
  var audioContext = null;
  var audioSource = null;
  var startedAtMs = 0;
  var currentSessionId = null;
  var audioEndpoint = null;
  var partIndex = 1;
  var partStartedAtMs = 0;
  var partChunks = [];
  var partBytes = 0;
  var uploadQueue = Promise.resolve();

  function now() { return Date.now(); }

  function pickMimeType() {
    var candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];
    for (var i = 0; i < candidates.length; i++) {
      try {
        if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
      } catch (_) {}
    }
    return "";
  }

  function resetMediaState() {
    try { stream && stream.getTracks().forEach(function (track) { track.stop(); }); } catch (_) {}
    stream = null;
    try { audioSource && audioSource.disconnect(); } catch (_) {}
    audioSource = null;
    try { audioContext && audioContext.close(); } catch (_) {}
    audioContext = null;
    recorder = null;
    startedAtMs = 0;
    currentSessionId = null;
    audioEndpoint = null;
    partIndex = 1;
    partStartedAtMs = 0;
    partChunks = [];
    partBytes = 0;
    uploadQueue = Promise.resolve();
  }

  function sendStatus(status, error) {
    chrome.runtime.sendMessage({
      target: "khora-live-caption-offscreen",
      type: "KHORA_LIVE_AUDIO_STATUS",
      status: status,
      sessionId: currentSessionId,
      error: error || null,
      timestamp: new Date().toISOString()
    }).catch(function () {});
  }

  function sendStoredPart(meta) {
    chrome.runtime.sendMessage({
      target: "khora-live-caption-offscreen",
      type: "KHORA_LIVE_AUDIO_PART_STORED",
      sessionId: meta.sessionId,
      part: meta.part,
      url: meta.url,
      bytes: meta.bytes,
      sha256: meta.sha256 || null,
      startMs: meta.startMs,
      endMs: meta.endMs,
      duracionMs: meta.duracionMs,
      timestamp: new Date().toISOString()
    }).catch(function () {});
  }

  function queueUpload(blob, part, startMs, endMs) {
    var sessionId = currentSessionId;
    var endpoint = audioEndpoint;

    if (!endpoint || !sessionId) {
      sendStatus("error", "No existe endpoint de audio o sesión de Khora.");
      return uploadQueue;
    }

    var form = new FormData();
    form.append("audio", blob, "chrome-tab-parte-" + part + ".webm");
    form.append("sesionId", sessionId);
    form.append("parte", String(part));
    form.append("fuenteAudio", "chrome_tab");
    form.append("startMs", String(Math.max(0, startMs)));
    form.append("endMs", String(Math.max(startMs, endMs)));
    form.append("duracionMs", String(Math.max(0, endMs - startMs)));

    var durationMs = Math.max(0, endMs - startMs);

    uploadQueue = uploadQueue.then(async function () {
      var response = await fetch(endpoint, {
        method: "POST",
        body: form,
        cache: "no-store"
      });

      var raw = await response.text();
      var data = {};
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = { detail: raw.slice(0, 500) };
      }

      if (!response.ok || typeof data.url !== "string") {
        throw new Error(String(data.detail || "No se pudo persistir la parte de audio Chrome."));
      }

      sendStoredPart({
        sessionId: sessionId,
        part: part,
        url: data.url,
        bytes: Number(data.bytes || blob.size),
        sha256: data.sha256 || null,
        startMs: startMs,
        endMs: endMs,
        duracionMs: durationMs
      });
    }).catch(function (error) {
      sendStatus("error", String(error));
    });

    return uploadQueue;
  }

  function flushPart(force) {
    if (!partChunks.length) return uploadQueue;

    if (!force && partBytes < 2 * 1024 * 1024 && (now() - partStartedAtMs) < 120 * 1000) {
      return uploadQueue;
    }

    var chunks = partChunks;
    var bytes = partBytes;
    var endMs = Math.max(0, now() - startedAtMs);
    var startMs = Math.max(0, partStartedAtMs - startedAtMs);
    var part = partIndex++;

    partChunks = [];
    partBytes = 0;
    partStartedAtMs = now();

    var blob = new Blob(chunks, { type: (recorder && recorder.mimeType) || "audio/webm" });
    if (!bytes) return uploadQueue;

    return queueUpload(blob, part, startMs, endMs);
  }

  async function stopRecording() {
    if (!recorder || recorder.state === "inactive") {
      await flushPart(true);
      resetMediaState();
      return;
    }

    var activeRecorder = recorder;

    await new Promise(function (resolve) {
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        resolve();
      };

      activeRecorder.addEventListener("stop", finish, { once: true });

      try {
        activeRecorder.stop();
      } catch (_) {
        finish();
      }
    });

    await flushPart(true);
    await uploadQueue;
    resetMediaState();
  }

  async function startRecording(message) {
    await stopRecording();

    currentSessionId = message.sessionId || null;
    audioEndpoint = message.audioEndpoint || null;

    if (!currentSessionId) throw new Error("Falta sessionId para capturar audio Chrome.");
    if (!audioEndpoint) throw new Error("Falta endpoint /api/audio de Khora.");

    var constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: message.streamId
        }
      },
      video: false
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);

    audioContext = new AudioContext();
    audioSource = audioContext.createMediaStreamSource(stream);
    audioSource.connect(audioContext.destination);

    var mimeType = pickMimeType();
    recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);

    startedAtMs = now();
    partStartedAtMs = startedAtMs;
    partIndex = Math.max(1, Number(message.startPartIndex) || 1);
    partChunks = [];
    partBytes = 0;
    uploadQueue = Promise.resolve();

    recorder.ondataavailable = function (event) {
      if (!event.data || !event.data.size) return;

      partChunks.push(event.data);
      partBytes += event.data.size;
      void flushPart(false);
    };

    recorder.onstart = function () { sendStatus("recording"); };

    recorder.onerror = function (event) {
      sendStatus("error", String(event && event.error || "MediaRecorder error"));
    };

    recorder.start(1000);
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (!message || message.target !== "khora-live-caption-offscreen") return;

    if (message.command === "start") {
      startRecording(message).catch(function (error) {
        sendStatus("error", String(error));
      });
    } else if (message.command === "stop") {
      stopRecording().then(function () {
        sendStatus("stopped");
      }).catch(function (error) {
        sendStatus("error", String(error));
      });
    }
  });
})();