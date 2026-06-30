(function(){
  // Guarda anti-duplicado (auto-inyeccion v3.9 en mundo MAIN sobre pestana ya cargada).
  if(window.__globoMainLoaded) return;
  window.__globoMainLoaded = true;
  function findDT(){
    try{
      const $ = window.jQuery;
      if(!$ || !$.fn || !$.fn.dataTable) return null;
      let api = null;
      $('.dataTable, table').each(function(){
        try{ if($.fn.dataTable.isDataTable(this)){ api = $(this).DataTable(); return false; } }catch(e){}
      });
      return api;
    }catch(e){ return null; }
  }
  function cellText(v){ if(v == null) return ""; const d = document.createElement("div"); d.innerHTML = String(v); return (d.textContent || "").trim(); }
  function num(v){
    if(v == null) return null;
    if(typeof v === "number") return isNaN(v) ? null : v;
    const s = String(v).replace(/[^0-9.\-]/g,"");
    if(s === "") return null;
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  // Build an ISO timestamp from the named fields date="MM/DD/YYYY" + start="hh:mm AM/PM".
  function buildISO(dateStr, timeStr){
    try{
      if(!dateStr) return null;
      const dm = String(dateStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if(!dm) return null;
      const mm = String(parseInt(dm[1],10)).padStart(2,"0");
      const dd = String(parseInt(dm[2],10)).padStart(2,"0");
      const yyyy = dm[3];
      let hh = "00", mi = "00";
      if(timeStr){
        const tm = String(timeStr).match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
        if(tm){
          let h = parseInt(tm[1],10); const ap = (tm[3]||"").toUpperCase();
          if(ap === "PM" && h < 12) h += 12;
          if(ap === "AM" && h === 12) h = 0;
          hh = String(h).padStart(2,"0"); mi = tm[2];
        }
      }
      return yyyy+"-"+mm+"-"+dd+"T"+hh+":"+mi+":00";
    }catch(e){ return null; }
  }
  // Legacy ISO parser, kept for array-shaped rows (fallback path).
  function toISO(m){
    try{
      let h = parseInt(m[4],10); const ap = (m[6]||"").toUpperCase();
      if(ap === "PM" && h < 12) h += 12; if(ap === "AM" && h === 12) h = 0;
      const mm = String(parseInt(m[1],10)).padStart(2,"0");
      const dd = String(parseInt(m[2],10)).padStart(2,"0");
      return m[3]+"-"+mm+"-"+dd+"T"+String(h).padStart(2,"0")+":"+m[5]+":00";
    }catch(e){ return null; }
  }
  // PRIMARY path: rows arrive as named JSON objects from /interpreter/calls_index_data.
  function parseRowObject(row){
    const id = row.call_unique_identifier || row.callUniqueIdentifier || row.unique_identifier || null;
    const company = row.company != null ? cellText(row.company) : null;
    const service = row.service != null ? cellText(row.service) : null;
    return {
      id: id ? String(id) : null,
      startISO: buildISO(row.date, row.start),
      end: row.end ? cellText(row.end) : null,
      minutes: num(row.interpreter_minutes),
      company: company || null,
      service: service || "Telephone",
      units: num(row.hourly_pay_units)
    };
  }
  // FALLBACK path: array-shaped rows (older DataTable shapes).
  function parseRowArray(row){
    let cells = row.map(cellText);
    let id = null;
    for(const c of cells){ const m = c.match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{6,}\b/); if(m){ id = m[0]; break; } }
    let startISO = null, startRaw = null;
    for(const c of cells){ const m = c.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)?/i); if(m){ startRaw = c; startISO = toISO(m); break; } }
    let minutes = null;
    for(const c of cells){ const m = c.match(/(\d+)\s*mins?\b/i); if(m){ minutes = +m[1]; break; } }
    let company = null;
    for(const c of cells){ if(c && /[A-Za-z]{3,}/.test(c) && !/\d{1,2}\/\d{1,2}\/\d{4}/.test(c) && !/min/i.test(c) && !/pending/i.test(c) && c !== id){ company = c; break; } }
    return { id: id || (startRaw ? (startRaw + "|" + (company||"")) : null), startISO, end:null, minutes, company, service:"Telephone", units:null };
  }
  function parseRow(row){
    if(row && typeof row === "object" && !Array.isArray(row)) return parseRowObject(row);
    if(Array.isArray(row)) return parseRowArray(row);
    return { id:null };
  }
  // Re-issue the page's OWN DataTables request (real params via api.ajax.params()),
  // bumping length and paginating to pull the full history. Falls back to rendered rows.
  function fetchAll(api){
    return new Promise(function(resolve){
      try{
        const $ = window.jQuery;
        const settings = api.settings()[0];
        const ajaxCfg = settings && settings.ajax;
        const url = (typeof ajaxCfg === "string") ? ajaxCfg : (ajaxCfg && ajaxCfg.url);
        const method = (typeof ajaxCfg === "object" && (ajaxCfg.type || ajaxCfg.method)) || "GET";
        let baseParams = null;
        try{ baseParams = api.ajax.params(); }catch(e){ baseParams = null; }
        function rendered(){ try{ return api.rows().data().toArray(); }catch(e){ return []; } }
        if(!url || !baseParams){ resolve(rendered()); return; }
        const PAGE = 1000, MAX = 100000, all = [];
        function fetchPage(start){
          const params = Object.assign({}, baseParams);
          params.start = start; params.length = PAGE;
          $.ajax({ url, type: method, data: params, dataType:"json",
            success: function(j){
              const data = (j && (j.data || j.aaData)) || [];
              for(let i=0;i<data.length;i++) all.push(data[i]);
              const total = (j && (typeof j.recordsFiltered === "number" ? j.recordsFiltered : j.recordsTotal)) || all.length;
              if(data.length === PAGE && all.length < total && (start + PAGE) < MAX){ fetchPage(start + PAGE); }
              else { resolve(all.length ? all : rendered()); }
            },
            error: function(xhr){
              const r = rendered();
              resolve(r.length ? r : { __err:"ajax "+xhr.status });
            } });
        }
        fetchPage(0);
      }catch(e){ resolve({ __err:String(e) }); }
    });
  }
  window.addEventListener("message", async function(ev){
    if(ev.source !== window) return;
    const d = ev.data;
    if(!d || d.__globo !== "fetchCalls") return;
    try{
      const api = findDT();
      if(!api){ window.postMessage({ __globo:"callsResult", reqId:d.reqId, error:"no-datatable", calls:[] }, "*"); return; }
      const rows = await fetchAll(api);
      if(rows && rows.__err){ window.postMessage({ __globo:"callsResult", reqId:d.reqId, error:rows.__err, calls:[] }, "*"); return; }
      const list = rows || [];
      let sample = null, cols = 0;
      if(list[0]){ const r0 = list[0]; const arr = Array.isArray(r0) ? r0 : Object.values(r0); cols = arr.length; sample = arr.map(cellText); }
      const calls = list.map(parseRow).filter(c=>c && c.id);
      window.postMessage({ __globo:"callsResult", reqId:d.reqId, calls, sample, cols }, "*");
    }catch(e){
      window.postMessage({ __globo:"callsResult", reqId:d.reqId, error:String(e), calls:[] }, "*");
    }
  });

  // ---- Detector de llamada en vivo ----
  // Combina senales: globals de Twilio + DOM (boton "End Call" visible / indicador
  // "In Call"). El boton rojo "End Call" solo aparece durante una llamada activa, asi
  // que es la senal mas confiable de este Dashboard. Por eso ya NO exigimos la API de
  // Twilio (que aqui suele leerse en falso) y el detector corre siempre.
  function _vis(el){
    try{
      if(!el) return false;
      var cs = getComputedStyle(el);
      if(cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity || "1") === 0) return false;
      if(el.offsetParent === null && cs.position !== "fixed") return false;
      var r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1;
    }catch(e){ return false; }
  }
  // v3.19: el indicador visible del Dashboard manda sobre Twilio/API.
  // Caso real NOT-ON-CALL: .in-call-indicator-message = "Not In Call".
  // Twilio puede quedarse conectado/residual unos segundos despues de terminar; esta
  // senal visual corta el cronometro de inmediato y evita sobrecontar.
  function indicatorState(){
    try{
      var msg = document.querySelector(".in-call-indicator-message");
      var ind = document.querySelector(".in-call-indicator, .in_call_indicator, [class*='in-call']");
      var el = msg || ind;
      if(!el || !_vis(el)) return null;
      var t = ((msg ? msg.textContent : ind.textContent) || "").replace(/\s+/g," ").trim().toLowerCase();
      if(!t) return null;
      if(t === "not in call" || t.indexOf("not in call") !== -1 || t.indexOf("no en llamada") !== -1) return false;
      if(t === "in call" || (t.indexOf("in call") !== -1 && t.indexOf("not in call") === -1) || t.indexOf("en llamada") !== -1) return true;
      return null;
    }catch(e){ return null; }
  }
  function domInCall(){
    try{
      var ui = indicatorState();
      if(ui === true) return true;
      if(ui === false) return false;
      var nodes = document.querySelectorAll("button, a, input[type=button], input[type=submit], .btn, [role=button]");
      for(var i=0;i<nodes.length;i++){
        var n = nodes[i];
        var t = ((n.textContent || n.value || "") + "").replace(/\s+/g," ").trim().toLowerCase();
        if((t === "end call" || t === "finalizar llamada" || t === "colgar" || t === "hang up") && _vis(n)) return true;
      }
      return false;
    }catch(e){ return false; }
  }
  function apiInCall(){
    try{
      if(window.inCallIndicator && typeof window.inCallIndicator.inCall !== "undefined" && window.inCallIndicator.inCall) return true;
      if(typeof window.isAnyTwilioDeviceConnected === "function"){ try{ if(window.isAnyTwilioDeviceConnected()) return true; }catch(e){} }
      try{ if(window.currentEndpoint && window.currentEndpoint.in_call) return true; }catch(e){}
      return false;
    }catch(e){ return false; }
  }
  function detectLiveState(){
    var ui = indicatorState();
    if(ui === false) return { inCall:false, hardOff:true, source:"indicator:not-in-call" };
    if(ui === true) return { inCall:true, hardOff:false, source:"indicator:in-call" };
    return { inCall:(apiInCall() || domInCall()), hardOff:false, source:"fallback" };
  }
  function detectInCall(){ return detectLiveState().inCall; }
  // Timestamp real de inicio (epoch ms) si la pagina lo expone; si no, null.
  function detectStartedAt(){
    try{
      var c = window.currentEndpoint || {};
      var cands = [c.in_call_timestamp, c.call_accepted_at, window.inCallTimestamp, window.callAcceptedAt];
      for(var i=0;i<cands.length;i++){
        var v = cands[i]; if(v == null) continue;
        var n = (typeof v === "number") ? v : Date.parse(v);
        if(isNaN(n) || n <= 0) continue;
        if(n < 1e12) n *= 1000;
        if(n <= Date.now()+1000 && n > Date.now()-86400000) return n;
      }
    }catch(e){}
    return null;
  }
  var _lastInCall = null, _lastHardOff = null, _tick = 0;
  setInterval(function(){
    try{
      var ls = detectLiveState(), ic = !!ls.inCall; _tick++;
      if(ic !== _lastInCall || ls.hardOff !== _lastHardOff || (_tick % 4) === 0){
        _lastInCall = ic; _lastHardOff = !!ls.hardOff;
        window.postMessage({ __globo:"liveState", inCall: ic, hardOff: !!ls.hardOff, source: ls.source || "", startedAt: ic ? detectStartedAt() : null }, "*");
      }
    }catch(e){}
  }, 250);

  // ===== v3.32 MEDIDOR DE AUDIO FORENSE (getStats + jank/longtasks, mundo MAIN) =====
  // Envuelve RTCPeerConnection SOLO para registrar instancias (no altera su comportamiento) y,
  // mientras hay llamada y el medidor esta encendido (safe.meter via content.js), lee getStats()
  // cada 2s. Reporta calidad ENTRANTE de audio (perdida/jitter/ocultamiento) por postMessage ->
  // content.js -> background -> Notion. Es lectura de SOLO LECTURA del WebRTC que la propia pagina
  // ya creo; no toca getUserMedia ni el flujo de audio.
  var _meterOn = true, _pcs = [];
  // v3.32 telemetria forense: ademas del audio medimos la SALUD DEL HILO PRINCIPAL de ESTA
  // pestana (la que lleva la llamada) para correlacionar glitches de audio con bloqueos del hilo:
  //  - longtasks (PerformanceObserver): tareas > 50ms que congelan el hilo.
  //  - jank: desfase de un setInterval de 500ms (cuanto se atrasa = cuanto se bloqueo el hilo).
  //  - heap: memoria JS usada (MB) si el navegador la expone.
  var _ltCount = 0, _ltMs = 0, _jankMax = 0, _jankSum = 0, _jankN = 0;
  (function perfProbe(){
    try{
      if(window.PerformanceObserver){
        var po = new PerformanceObserver(function(list){
          try{ list.getEntries().forEach(function(e){ _ltCount++; _ltMs += (e.duration||0); }); }catch(e){}
        });
        po.observe({ entryTypes: ["longtask"] });
      }
    }catch(e){}
    try{
      var expect = 500, last = (window.performance && performance.now) ? performance.now() : Date.now();
      setInterval(function(){
        try{
          var now = (window.performance && performance.now) ? performance.now() : Date.now();
          var drift = (now - last) - expect; last = now;
          if(drift < 0) drift = 0;
          _jankSum += drift; _jankN++; if(drift > _jankMax) _jankMax = drift;
        }catch(e){}
      }, expect);
    }catch(e){}
  })();
  function heapMB(){ try{ if(window.performance && performance.memory && performance.memory.usedJSHeapSize) return +(performance.memory.usedJSHeapSize/1048576).toFixed(1); }catch(e){} return null; }
  (function wrapRTC(){
    try{
      var Native = window.RTCPeerConnection || window.webkitRTCPeerConnection;
      if(!Native || Native.__globoWrapped) return;
      var W = function(cfg, con){
        var pc = (arguments.length >= 2) ? new Native(cfg, con) : (arguments.length === 1 ? new Native(cfg) : new Native());
        try{ _pcs.push(pc); if(_pcs.length > 8) _pcs.shift(); }catch(e){}
        return pc;
      };
      W.prototype = Native.prototype;
      W.__globoWrapped = true;
      try{ Object.getOwnPropertyNames(Native).forEach(function(k){ try{ if(!(k in W)) W[k] = Native[k]; }catch(e){} }); }catch(e){}
      window.RTCPeerConnection = W;
      try{ window.webkitRTCPeerConnection = W; }catch(e){}
    }catch(e){}
  })();
  window.addEventListener("message", function(ev){
    if(ev.source !== window) return;
    var d = ev.data;
    if(d && d.__globo === "meterCfg"){ _meterOn = !!d.on; }
  });
  try{ window.postMessage({ __globo:"meterReq" }, "*"); }catch(e){}
  var _lastSamp = {};
  function sampleStats(){
    try{
      if(!_meterOn || !detectInCall() || !_pcs.length) return;
      // v3.32: snapshot del hilo principal de ESTA pestana en la ventana de muestreo (y reseteo).
      var _pfJankAvg = _jankN ? +(_jankSum/_jankN).toFixed(1) : null;
      var _pf = { jankMaxMs: +(_jankMax).toFixed(1), jankAvgMs: _pfJankAvg, longtasks: _ltCount, longtaskMs: +(_ltMs).toFixed(1), heapMB: heapMB() };
      _ltCount = 0; _ltMs = 0; _jankMax = 0; _jankSum = 0; _jankN = 0;
      _pcs.forEach(function(pc, idx){
        try{
          if(!pc || typeof pc.getStats !== "function") return;
          if(pc.connectionState === "closed" || pc.iceConnectionState === "closed") return;
          pc.getStats(null).then(function(report){
            try{
              var best=null;
              report.forEach(function(s){ if(s.type === "inbound-rtp" && (s.kind === "audio" || s.mediaType === "audio")) best = s; });
              if(!best) return;
              var key = "pc"+idx+":"+(best.ssrc||best.id||"a");
              var prev = _lastSamp[key] || {};
              function nm(v){ return (typeof v === "number") ? v : null; }
              function dd(cur, p){ return (cur!=null && p!=null) ? (cur - p) : null; }
              var concealed = nm(best.concealedSamples);
              var totalRcv  = nm(best.totalSamplesReceived);
              var lost      = nm(best.packetsLost);
              var pktRcv    = nm(best.packetsReceived);
              var jbDelay   = nm(best.jitterBufferDelay);
              var jbEmit    = nm(best.jitterBufferEmittedCount);
              var accel     = nm(best.removedSamplesForAcceleration);
              var decel     = nm(best.insertedSamplesForDeceleration);
              var dConceal = dd(concealed, prev.concealed);
              var dTotal   = dd(totalRcv, prev.totalRcv);
              var dLostV   = dd(lost, prev.lost);
              var dPktRcv  = dd(pktRcv, prev.pktRcv);
              var dJbDelay = dd(jbDelay, prev.jbDelay);
              var dJbEmit  = dd(jbEmit, prev.jbEmit);
              var dAccel   = dd(accel, prev.accel);
              var dDecel   = dd(decel, prev.decel);
              var concealRate = (dConceal!=null && dTotal!=null && dTotal>0) ? +(dConceal/dTotal).toFixed(4) : null;
              var lossRate    = (dLostV!=null && dPktRcv!=null && (dLostV+dPktRcv)>0) ? +(dLostV/(dLostV+dPktRcv)).toFixed(4) : null;
              var avgJbMs     = (dJbDelay!=null && dJbEmit!=null && dJbEmit>0) ? +((dJbDelay/dJbEmit)*1000).toFixed(1) : null;
              _lastSamp[key] = { concealed: concealed, totalRcv: totalRcv, lost: lost, pktRcv: pktRcv, jbDelay: jbDelay, jbEmit: jbEmit, accel: accel, decel: decel };
              var metrics = {
                concealRate: concealRate,
                dConcealedSamples: dConceal,
                dPacketsLost: dLostV,
                lossRate: lossRate,
                jitter: (typeof best.jitter === "number") ? +best.jitter.toFixed(4) : null,
                jitterBufferDelay: (jbDelay!=null) ? +jbDelay.toFixed(3) : null,
                avgJbDelayMs: avgJbMs,
                accelSamples: dAccel,
                decelSamples: dDecel,
                concealmentEvents: (typeof best.concealmentEvents === "number") ? best.concealmentEvents : null,
                packetsReceived: dPktRcv,
                audioLevel: (typeof best.audioLevel === "number") ? +best.audioLevel.toFixed(4) : null,
                jankMaxMs: _pf.jankMaxMs, jankAvgMs: _pf.jankAvgMs, longtasks: _pf.longtasks, longtaskMs: _pf.longtaskMs, heapMB: _pf.heapMB
              };
              window.postMessage({ __globo:"audioStat", metrics: metrics, source: "getStats" }, "*");
            }catch(e){}
          }).catch(function(){});
        }catch(e){}
      });
    }catch(e){}
  }
  setInterval(sampleStats, 2000);
})();
