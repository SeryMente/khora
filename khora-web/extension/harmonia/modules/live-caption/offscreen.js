(function () {
  "use strict";

  var stream = null;
  var recorder = null;
  var audioContext = null;
  var audioSource = null;
  var startedAtMs = 0;
  var sequence = 0;
  var currentSessionId = null;

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

  function cleanup() {
    try { recorder && recorder.state !== "inactive" && recorder.stop(); } catch (_) {}
    recorder = null;
    try { stream && stream.getTracks().forEach(function (track) { track.stop(); }); } catch (_) {}
    stream = null;
    try { audioSource && audioSource.disconnect(); } catch (_) {}
    audioSource = null;
    try { audioContext && audioContext.close(); } catch (_) {}
    audioContext = null;
    startedAtMs = 0;
    currentSessionId = null;
    sequence = 0;
  }

  async function startRecording(message) {
    cleanup();

    currentSessionId = message.sessionId;
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
    sequence = 0;

    recorder.ondataavailable = async function (event) {
      if (!event.data || !event.data.size) return;
      var endMs = now() - startedAtMs;
      var startMs = Math.max(0, endMs - 1000);
      var buffer = await event.data.arrayBuffer();

      chrome.runtime.sendMessage({
        target: "khora-live-caption-offscreen",
        type: "KHORA_LIVE_AUDIO_CHUNK",
        buffer: buffer,
        sequence: ++sequence,
        sessionId: currentSessionId,
        timestamp: new Date().toISOString(),
        startMs: startMs,
        endMs: endMs,
        mimeType: event.data.type || mimeType || "audio/webm"
      }).catch(function () {});
    };

    recorder.onstart = function () {
      chrome.runtime.sendMessage({
        target: "khora-live-caption-offscreen",
        type: "KHORA_LIVE_AUDIO_STATUS",
        status: "recording",
        sessionId: currentSessionId,
        timestamp: new Date().toISOString()
      }).catch(function () {});
    };

    recorder.onerror = function (event) {
      chrome.runtime.sendMessage({
        target: "khora-live-caption-offscreen",
        type: "KHORA_LIVE_AUDIO_STATUS",
        status: "error",
        sessionId: currentSessionId,
        error: String(event && event.error || "MediaRecorder error"),
        timestamp: new Date().toISOString()
      }).catch(function () {});
    };

    recorder.onstop = function () {
      chrome.runtime.sendMessage({
        target: "khora-live-caption-offscreen",
        type: "KHORA_LIVE_AUDIO_STATUS",
        status: "stopped",
        sessionId: currentSessionId,
        timestamp: new Date().toISOString()
      }).catch(function () {});
    };

    recorder.start(1000);
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (!message || message.target !== "khora-live-caption-offscreen") return;
    if (message.command === "start") {
      startRecording(message).catch(function (error) {
        chrome.runtime.sendMessage({
          target: "khora-live-caption-offscreen",
          type: "KHORA_LIVE_AUDIO_STATUS",
          status: "error",
          sessionId: message.sessionId || null,
          error: String(error),
          timestamp: new Date().toISOString()
        }).catch(function () {});
      });
    } else if (message.command === "stop") {
      cleanup();
    }
  });
})();
