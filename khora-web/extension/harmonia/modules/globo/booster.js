(function(){
  // ===== Aisthesis · Volume Booster (Globo) v1.1.0 =====
  // Sube el volumen del AUDIO ENTRANTE de la llamada por ENCIMA del 100% (hasta 200%).
  // Tecnica: Web Audio API. El audio remoto de Globo llega por WebRTC (Twilio) como
  // MediaStream adjunto a un <audio>. Enrutamos ese stream por un GainNode (0..2.0) y
  // silenciamos el elemento original para no duplicar. Para <audio>/<video> normales
  // (src/url) usamos createMediaElementSource. Al 100% (reset) se DESMONTA y vuelve al
  // audio nativo (cero coloracion). Persistencia en chrome.storage.local.boostGain.
  // Kill-switch: chrome.storage.local.safe.booster (default true).
  //
  // v1.1.0 (endurecimiento anti-corte + telemetria de calidad):
  //  - Re-enganche real cuando Twilio REUSA un <audio> cambiando su srcObject (antes se
  //    quedaba mudo apuntando a un stream muerto => SILENCIO). Ahora detecta el swap,
  //    desmonta la ruta vieja y reengancha el stream nuevo.
  //  - teardown() ya no descarta la ruta 'element' (no reconsumible): la deja pasar a 1.0.
  //  - Watchdog de AudioContext: si se suspende a media llamada intenta resume(); si no
  //    vuelve a 'running' desmutea como fallback para NO dejar la llamada en silencio.
  //  - Detector de silencio (AnalyserNode): si hay boost activo, en llamada, y la salida
  //    cae a ~0 por > umbral => emite evento 'silencio con boost' (el corte) y auto-recupera.
  //  - Auto-telemetria: difunde su gain a mainworld (postMessage boostState) para correlacionar
  //    gain<->calidad, y reporta eventos a background (boosterStat) para la ventana forense.
  if (window.__aisthesisBoostLoaded) return;
  window.__aisthesisBoostLoaded = true;

  var HOST = location.hostname;
  var IS_GLOBO = (HOST === "globohq.com" || HOST.indexOf(".globohq.com") !== -1);
  if (!IS_GLOBO) return;

  var MAX = 2.0;        // 200%
  var STEP = 0.10;      // +/- 10% por atajo/boton
  var gain = 1.0;       // multiplicador actual (1.0 = 100%)
  var enabled = true;   // kill-switch (safe.booster)
  var ctx = null;
  var recs = [];        // [{ el, type:'stream'|'element'|'dead', src, g, prevMuted, srcStream }]
  var scanTimer = null, mo = null, armed = false;
  var inCall = false;   // reflejado desde mainworld (liveState)
  var analyser = null, analyserBuf = null;
  var silenceTimer = null, silentAccum = 0, _lastCutReport = 0;

  // Detector de silencio: umbrales.
  var SIL_INTERVAL = 500;    // ms entre lecturas del analyser
  var SIL_MS = 2500;         // ms de silencio continuo con boost => "corte"
  var SIL_RMS = 0.6;         // RMS (escala 0..128) por debajo del cual consideramos silencio
  var SIL_COOLDOWN = 6000;   // anti-spam de reportes de corte

  function log(level, msg, data){ try{ chrome.runtime.sendMessage({ type:"log", level:level, msg:"[Boost] "+msg, data:data }); }catch(e){} }
  function clamp(v){ v = parseFloat(v); if (isNaN(v)) v = 1.0; return Math.max(0, Math.min(MAX, Math.round(v*100)/100)); }
  function pct(){ return Math.round(gain*100); }

  // ---- Auto-telemetria ----
  function reportStat(kind, extra){
    try{
      var o = { type:"boosterStat", kind:kind, gain:gain, pct:pct(), inCall:inCall, t:Date.now() };
      if (extra){ for (var k in extra){ if (Object.prototype.hasOwnProperty.call(extra,k)) o[k] = extra[k]; } }
      chrome.runtime.sendMessage(o);
    }catch(e){}
  }
  function broadcastBoostState(){
    try{ window.postMessage({ __globo:"boostState", gain:gain, pct:pct(), enabled:enabled, t:Date.now() }, "*"); }catch(e){}
  }

  function ensureCtx(){
    if (ctx) return ctx;
    try{ var AC = window.AudioContext || window.webkitAudioContext; ctx = AC ? new AC() : null; }catch(e){ ctx = null; }
    installCtxWatchdog();
    return ctx;
  }
  function resumeCtx(){ try{ if (ctx && ctx.state === "suspended") return ctx.resume(); }catch(e){} return null; }
  function ensureAnalyser(){
    if (analyser || !ctx) return analyser;
    try{ analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyserBuf = new Uint8Array(analyser.fftSize); }catch(e){ analyser = null; analyserBuf = null; }
    return analyser;
  }

  // Watchdog: reacciona a cambios de estado del AudioContext. Si se suspende a media
  // llamada (p.ej. pestana en segundo plano) con el elemento mudo, la llamada quedaria
  // en SILENCIO. Intentamos reanudar; si no vuelve, desmuteamos como fallback.
  function installCtxWatchdog(){
    if (!ctx || ctx.__globoWatched) return;
    ctx.__globoWatched = true;
    try{
      ctx.onstatechange = function(){
        try{
          if (!enabled || gain === 1.0) return;
          if (ctx.state === "running"){ startScanAndGain(); reassertMute(); }
          else if (ctx.state === "suspended"){
            var p = resumeCtx();
            if (p && p.then){ p.catch(function(){}); }
            setTimeout(function(){
              try{ if (ctx && ctx.state !== "running" && enabled && gain !== 1.0) fallbackUnmute("ctx-suspend"); }catch(e){}
            }, 1500);
          }
        }catch(e){}
      };
    }catch(e){}
  }
  // Desmutea los elementos de stream para que suene el audio NATIVO cuando el grafo de
  // boost no puede producir sonido (ctx no-running). Evita el corte a costa de perder el
  // boost momentaneamente. Reporta el evento como "corte evitado".
  function fallbackUnmute(why){
    var any = false;
    for (var i=0;i<recs.length;i++){ var r = recs[i]; if (r.type === "stream"){ try{ if (r.el.muted){ r.el.muted = false; any = true; } }catch(e){} } }
    if (any){ log("warn", "ctx no-running ("+why+"): desmuteo fallback para no cortar audio"); reportStat("silence", { reason:why, recovered:true, note:"fallback-unmute" }); }
  }
  // Reafirma el muteo del elemento cuando el grafo boosteado vuelve a sonar (evita doble audio).
  function reassertMute(){
    for (var i=0;i<recs.length;i++){ var r = recs[i]; if (r.type === "stream"){ try{ if (!r.el.muted) r.el.muted = true; }catch(e){} } }
  }

  function mediaEls(){
    var out = [];
    try{ document.querySelectorAll("audio,video").forEach(function(el){ out.push(el); }); }catch(e){}
    return out;
  }
  function isTracked(el){ for (var i=0;i<recs.length;i++){ if (recs[i].el === el) return recs[i]; } return null; }

  function hookEl(el){
    try{
      if (!el || isTracked(el)) return;
      if (!ensureCtx()) return;
      var so = null; try{ so = el.srcObject; }catch(e){}
      var isStream = so && (typeof MediaStream !== "undefined") && (so instanceof MediaStream) && so.getAudioTracks && so.getAudioTracks().length > 0;
      var g = ctx.createGain(); g.gain.value = gain;
      var an = ensureAnalyser();
      if (isStream){
        var ss;
        try{ ss = ctx.createMediaStreamSource(so); }catch(e){ return; }
        ss.connect(g); g.connect(ctx.destination);
        if (an){ try{ g.connect(an); }catch(e){} }
        var prevMuted = false; try{ prevMuted = !!el.muted; }catch(e){}
        try{ el.muted = true; }catch(e){} // solo suena la ruta con boost
        recs.push({ el:el, type:"stream", src:ss, g:g, prevMuted:prevMuted, srcStream:so });
        log("ok", "enganchado stream WebRTC @ "+pct()+"%");
      } else {
        var es;
        try{ es = ctx.createMediaElementSource(el); }
        catch(e){ recs.push({ el:el, type:"dead", src:null, g:null }); return; } // ya consumido/cross-origin
        es.connect(g); g.connect(ctx.destination);
        if (an){ try{ g.connect(an); }catch(e){} }
        recs.push({ el:el, type:"element", src:es, g:g });
      }
    }catch(e){}
  }

  // Desmonta una ruta concreta (desconecta grafo; en 'stream' restaura el muteo original).
  function unhookRec(r){
    try{ if (r.g) r.g.disconnect(); }catch(e){}
    try{ if (r.src) r.src.disconnect(); }catch(e){}
    if (r.type === "stream"){ try{ r.el.muted = r.prevMuted; }catch(e){} }
  }

  function scan(){
    if (!enabled || gain === 1.0) return;
    // 1) Detecta SWAP de srcObject en elementos ya rastreados. Twilio REUSA el mismo
    //    <audio> cambiando su srcObject a un stream nuevo; el registro viejo apunta a un
    //    stream muerto y el elemento sigue mudo => SILENCIO. Desmontamos y reenganchamos.
    var rebind = [];
    for (var j=recs.length-1;j>=0;j--){
      var r = recs[j];
      if (r.type !== "stream") continue;
      var cur = null; try{ cur = r.el.srcObject; }catch(e){}
      if (cur !== r.srcStream){
        unhookRec(r);
        recs.splice(j,1);
        var live = cur && (typeof MediaStream !== "undefined") && (cur instanceof MediaStream) && cur.getAudioTracks && cur.getAudioTracks().length > 0;
        if (live){ rebind.push(r.el); log("info", "swap de srcObject detectado: reenganchando stream nuevo"); }
      }
    }
    // 2) Engancha elementos nuevos + reengancha los que cambiaron de stream.
    var els = mediaEls();
    for (var i=0;i<els.length;i++) hookEl(els[i]);
    for (var k=0;k<rebind.length;k++) hookEl(rebind[k]);
  }

  function applyGain(){
    for (var i=0;i<recs.length;i++){
      var r = recs[i]; if (!r.g) continue;
      try{ r.g.gain.setTargetAtTime(gain, ctx.currentTime, 0.03); }catch(e){ try{ r.g.gain.value = gain; }catch(_){} }
    }
  }

  function teardown(){
    var keep = [];
    for (var i=0;i<recs.length;i++){
      var r = recs[i];
      if (r.type === "element" && r.g){
        // 'element' no se puede des-consumir: en vez de desconectar (=> silencio), dejamos
        // pasar a 1.0 para volver al audio nativo sin coloracion y conservamos el registro
        // para no re-crear el MediaElementSource (irreversible por elemento).
        try{ if (ctx) r.g.gain.setTargetAtTime(1.0, ctx.currentTime, 0.03); else r.g.gain.value = 1.0; }catch(e){ try{ r.g.gain.value = 1.0; }catch(_){} }
        keep.push(r);
      } else {
        unhookRec(r); // stream/dead: desconecta y desmutea (suena el audio nativo del elemento)
      }
    }
    recs = keep;
    stopScan();
    stopSilenceLoop();
  }

  function startScan(){
    if (scanTimer) return;
    scan();
    scanTimer = setInterval(scan, 1200);
    try{
      mo = new MutationObserver(function(){ scan(); });
      mo.observe(document.documentElement || document.body, { childList:true, subtree:true });
    }catch(e){}
  }
  function stopScan(){
    try{ if (scanTimer){ clearInterval(scanTimer); scanTimer = null; } }catch(e){}
    try{ if (mo){ mo.disconnect(); mo = null; } }catch(e){}
  }

  // ---- Detector de silencio (la senal directa del "corte") ----
  function startSilenceLoop(){ if (silenceTimer) return; silentAccum = 0; silenceTimer = setInterval(silenceTick, SIL_INTERVAL); }
  function stopSilenceLoop(){ try{ if (silenceTimer){ clearInterval(silenceTimer); silenceTimer = null; } }catch(e){} silentAccum = 0; }
  function hasStreamRec(){ for (var i=0;i<recs.length;i++){ if (recs[i].type === "stream") return true; } return false; }
  function silenceTick(){
    try{
      // Solo vigilamos cuando hay boost audible (gain>0), en llamada, y con ruta de stream.
      if (!enabled || gain <= 0 || !inCall || !hasStreamRec()){ silentAccum = 0; return; }
      if (!analyser || !analyserBuf){ ensureAnalyser(); if (!analyser) return; }
      analyser.getByteTimeDomainData(analyserBuf);
      var sum = 0;
      for (var k=0;k<analyserBuf.length;k++){ var dv = analyserBuf[k] - 128; sum += dv*dv; }
      var rms = Math.sqrt(sum / analyserBuf.length); // 0..~128
      if (rms < SIL_RMS){ silentAccum += SIL_INTERVAL; } else { silentAccum = 0; }
      if (silentAccum >= SIL_MS){
        var now = Date.now();
        // Auto-recuperacion: reanuda ctx, re-escanea (capta swaps) y reafirma muteo.
        resumeCtx(); scan(); reassertMute();
        if (now - _lastCutReport >= SIL_COOLDOWN){
          _lastCutReport = now;
          log("warn", "SILENCIO con boost activo (~"+silentAccum+"ms) -> auto-recuperando");
          reportStat("silence", { silentMs:silentAccum, rms:+rms.toFixed(2), recovered:true });
        }
        silentAccum = 0;
      }
    }catch(e){}
  }

  // Solo activamos (silenciar elemento + enrutar) cuando el AudioContext puede
  // reanudarse (gesto del usuario / userActivation). Si no, esperamos un gesto
  // para no dejar la llamada en silencio por la politica de autoplay.
  function canActivateNow(){
    try{ if (navigator.userActivation && navigator.userActivation.hasBeenActive) return true; }catch(e){}
    return false;
  }
  function armGesture(){
    if (armed) return; armed = true;
    var fn = function(){ try{ document.removeEventListener("pointerdown", fn, true); document.removeEventListener("keydown", fn, true); }catch(e){} armed=false; activate(); };
    try{ document.addEventListener("pointerdown", fn, true); document.addEventListener("keydown", fn, true); }catch(e){}
  }
  function activate(){
    if (!enabled || gain === 1.0) { teardown(); return; }
    if (!ensureCtx()){ return; }
    if (ctx.state === "suspended"){
      var p = resumeCtx();
      if (p && p.then){ p.then(function(){ if (ctx.state === "running") startScanAndGain(); else armGesture(); }).catch(function(){ armGesture(); }); return; }
      if (ctx.state !== "running"){ if (canActivateNow()) { /* fallthrough */ } else { armGesture(); return; } }
    }
    startScanAndGain();
  }
  function startScanAndGain(){ startScan(); applyGain(); startSilenceLoop(); }

  function setGain(v, opts){
    gain = clamp(v);
    try{ chrome.storage.local.set({ boostGain: gain }); }catch(e){}
    renderWidget();
    broadcastBoostState();
    reportStat("gain");
    if (!enabled) return;
    if (gain === 1.0){ teardown(); }
    else { activate(); applyGain(); }
  }

  // ---------- Widget on-page (esquina inferior izquierda) ----------
  var wrap=null, slider=null, label=null, pill=null, expanded=false;
  function colFor(){ if (gain === 0) return "#e0726a"; if (gain > 1.0) return "#3fb950"; if (gain < 1.0) return "#d29922"; return "#8b93a3"; }
  function ensureWidget(){
    if (wrap && document.body && document.body.contains(wrap)) return wrap;
    wrap = document.getElementById("aisthesis-boost");
    if (!wrap){
      wrap = document.createElement("div");
      wrap.id = "aisthesis-boost";
      wrap.style.cssText = "position:fixed;z-index:2147483645;left:14px;bottom:14px;font:12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#e6e9ef;user-select:none";
      wrap.innerHTML =
        "<div id='ab-pill' style='display:inline-flex;align-items:center;gap:6px;background:rgba(13,16,22,.94);border:1px solid #2a2f3a;border-radius:20px;padding:6px 11px;box-shadow:0 8px 28px rgba(0,0,0,.5);cursor:pointer'>"+
          "<span style='font-size:14px'>&#128266;</span><b id='ab-pillpct' style='font-variant-numeric:tabular-nums'>100%</b>"+
        "</div>"+
        "<div id='ab-panel' style='display:none;margin-top:8px;width:240px;background:rgba(13,16,22,.96);border:1px solid #2a2f3a;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:12px'>"+
          "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'><b style='font-size:11px;letter-spacing:.4px;color:#8b93a3'>VOLUME BOOSTER</b><b id='ab-pct' style='font-size:16px;font-variant-numeric:tabular-nums'>100%</b></div>"+
          "<input id='ab-range' type='range' min='0' max='200' step='5' value='100' style='width:100%;accent-color:#3fb950;cursor:pointer'>"+
          "<div style='display:flex;justify-content:space-between;color:#5b6273;font-size:10px;margin-top:2px'><span>0%</span><span>100%</span><span>200%</span></div>"+
          "<div style='display:flex;gap:6px;margin-top:10px'>"+
            "<button id='ab-minus' style='flex:1;background:#161a22;color:#e6e9ef;border:1px solid #2a2f3a;border-radius:7px;padding:6px 0;cursor:pointer'>&minus;10</button>"+
            "<button id='ab-reset' style='flex:1;background:#161a22;color:#e6e9ef;border:1px solid #2a2f3a;border-radius:7px;padding:6px 0;cursor:pointer'>100%</button>"+
            "<button id='ab-plus' style='flex:1;background:#161a22;color:#e6e9ef;border:1px solid #2a2f3a;border-radius:7px;padding:6px 0;cursor:pointer'>+10</button>"+
          "</div>"+
          "<div style='color:#5b6273;font-size:10px;margin-top:8px'>Atajos: Alt+Shift+&uarr; / &darr; &middot; Alt+Shift+0 reset</div>"+
        "</div>";
      (document.body || document.documentElement).appendChild(wrap);
      slider = wrap.querySelector("#ab-range");
      label  = wrap.querySelector("#ab-pct");
      pill   = wrap.querySelector("#ab-pillpct");
      wrap.querySelector("#ab-pill").addEventListener("click", function(){ expanded=!expanded; wrap.querySelector("#ab-panel").style.display = expanded?"block":"none"; });
      slider.addEventListener("input", function(){ setGain(parseFloat(slider.value)/100); });
      wrap.querySelector("#ab-minus").addEventListener("click", function(){ setGain(gain-STEP); });
      wrap.querySelector("#ab-plus").addEventListener("click", function(){ setGain(gain+STEP); });
      wrap.querySelector("#ab-reset").addEventListener("click", function(){ setGain(1.0); });
    }
    return wrap;
  }
  function renderWidget(){
    try{
      ensureWidget();
      var p = pct();
      if (label) label.textContent = p+"%";
      if (pill){ pill.textContent = p+"%"; pill.style.color = colFor(); }
      if (slider && parseInt(slider.value,10) !== p) slider.value = p;
      var panel = wrap.querySelector("#ab-panel"); if (panel) panel.style.display = expanded?"block":"none";
      wrap.style.display = enabled ? "block" : "none";
    }catch(e){}
  }

  // ---------- Atajos ----------
  document.addEventListener("keydown", function(e){
    if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
    var code = e.code || "";
    if (code === "ArrowUp"){ e.preventDefault(); e.stopPropagation(); setGain(gain+STEP); }
    else if (code === "ArrowDown"){ e.preventDefault(); e.stopPropagation(); setGain(gain-STEP); }
    else if (code === "Digit0" || code === "Numpad0"){ e.preventDefault(); e.stopPropagation(); setGain(1.0); }
  }, true);

  // ---------- Puente con mainworld (MAIN world) ----------
  // Escuchamos el estado de llamada (liveState) para acotar el detector de silencio, y
  // respondemos a peticiones de estado del booster (boostStateReq) reemitiendo boostState.
  window.addEventListener("message", function(ev){
    if (ev.source !== window) return;
    var d = ev.data; if (!d || !d.__globo) return;
    if (d.__globo === "liveState"){ inCall = !!d.inCall; if (!inCall) silentAccum = 0; }
    else if (d.__globo === "boostStateReq"){ broadcastBoostState(); }
  });

  // ---------- Sincronizacion con storage ----------
  try{ chrome.storage.onChanged.addListener(function(ch, area){
    if (area !== "local") return;
    if (ch.boostGain && typeof ch.boostGain.newValue === "number" && clamp(ch.boostGain.newValue) !== gain){ gain = clamp(ch.boostGain.newValue); renderWidget(); broadcastBoostState(); if (enabled){ if (gain===1.0) teardown(); else { activate(); applyGain(); } } }
    if (ch.safe){ var s = ch.safe.newValue || {}; var on = (s.booster !== false); if (on !== enabled){ enabled = on; if (!enabled) teardown(); else if (gain!==1.0) activate(); renderWidget(); broadcastBoostState(); } }
  }); }catch(e){}

  // Latido de estado: mantiene a mainworld sincronizado con el gain actual (para estampar
  // boostGain en cada audioStat) sin depender del orden de carga.
  setInterval(broadcastBoostState, 2000);

  function boot(){
    try{ chrome.storage.local.get(["boostGain","safe"], function(o){
      if (o && typeof o.boostGain === "number") gain = clamp(o.boostGain);
      if (o && o.safe && o.safe.booster === false) enabled = false;
      renderWidget();
      broadcastBoostState();
      if (enabled && gain !== 1.0) activate(); // se auto-arma con un gesto si el ctx esta suspendido
    }); }catch(e){ renderWidget(); }
    log("info", "Volume Booster v1.1.0 activo (max 200%)");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
