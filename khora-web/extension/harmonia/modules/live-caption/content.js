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

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message) return false;

    if (message.type === "KHORA_OBSERVATION_REPORT_REQUEST") {
      (async function () {
        try {
          var response = await fetch("/api/observaciones/repo", { method:"POST", credentials:"include", headers:{"Content-Type":"application/json","X-Khora-Observation-Source":"harmonia-extension"}, body:JSON.stringify(message.batch) });
          var raw = await response.text(); var data = null; try { data = JSON.parse(raw); } catch (_) {}
          sendResponse(response.ok ? {ok:true,result:data&&data.repository?data.repository:null} : {ok:false,status:response.status,error:data&&data.error?data.error:raw.slice(0,300)});
        } catch (error) { sendResponse({ok:false,error:String(error)}); }
      })();
      return true;
    }

    if (message.type !== "KHORA_LIVE_CAPTION_EVENT") return false;
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
