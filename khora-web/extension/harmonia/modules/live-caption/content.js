(function () {
  "use strict";

  var CHANNEL = "khora-live-caption-v1";

  function fromPage(message) {
    return message && message.source === window && message.data && message.data.channel === CHANNEL
      ? message.data
      : null;
  }

  window.addEventListener("message", function (event) {
    var message = fromPage(event);
    if (!message || message.direction !== "page-to-extension") return;

    chrome.runtime.sendMessage({
      type: "KHORA_LIVE_CAPTION_COMMAND",
      command: message.command,
      sessionId: message.sessionId || null,
      partStartIndex: Number(message.partStartIndex || 1)
    }).catch(function () {});
  });

  chrome.runtime.onMessage.addListener(function (message) {
    if (!message || message.type !== "KHORA_LIVE_CAPTION_EVENT") return;
    var payload = Object.assign({}, message);
    delete payload.type;
    payload.channel = CHANNEL;
    payload.direction = "extension-to-page";

    if (payload.buffer instanceof ArrayBuffer) {
      window.postMessage(payload, "*", [payload.buffer]);
    } else {
      window.postMessage(payload, "*");
    }
  });
})();
