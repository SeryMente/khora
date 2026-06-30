(function(){
  // Guarda anti-duplicado: la auto-inyeccion v3.9 (chrome.scripting) puede correr
  // sobre una pestana que YA tiene el content script declarativo. Sin esto se
  // duplicarian intervalos y listeners. Comparten el mismo mundo aislado => persiste.
  if(window.__globoContentLoaded) return;
  window.__globoContentLoaded = true;
  const href = location.href;
  const isDashboard = /linguist_dashboard/i.test(href);
  const isCallLog = /calls_index/i.test(href) && !/video/i.test(href);
  const isMonthly = /monthly_minutes/i.test(href);
  const IS_GLOBO = (location.hostname === "globohq.com" || location.hostname.indexOf(".globohq.com") !== -1);
  let SYNCING = false;

  function tag(){ if(isDashboard) return "Dashboard"; if(isCallLog) return "CallLog"; if(isMonthly) return "Monthly"; return "Globo"; }
  function log(level, msg, data){ try{ chrome.runtime.sendMessage({ type:"log", level, msg:"["+tag()+"] "+msg, data }); }catch(e){} }

  function readDashboardToday(){
    let calls = null, mins = null;
    document.querySelectorAll('span[aria-label]').forEach(function(s){
      const al = (s.getAttribute('aria-label') || '').toLowerCase();
      if(al.indexOf('today') === -1) return;
      if(al.indexOf('telephone') === -1) return;
      const n = parseInt((s.textContent || '').replace(/[^\d]/g,''), 10);
      if(isNaN(n)) return;
      if(al.indexOf('call') !== -1) calls = n;
      else if(al.indexOf('minute') !== -1) mins = n;
    });
    if(calls === null && mins === null){
      const b = document.querySelector('#panel-heading-service-line-ti .panel-tools b');
      if(b){ const m = b.textContent.match(/(\d+)\s*calls?\s*\|\s*(\d+)\s*min/i); if(m){ calls = +m[1]; mins = +m[2]; } }
    }
    if(calls === null && mins === null) return null;
    return { calls: calls || 0, mins: mins || 0 };
  }

  function readRecentJobs(){
    const rows = [];
    document.querySelectorAll('#recent-jobs-table tbody tr').forEach(function(tr){
      const td = tr.querySelectorAll('td');
      if(td.length < 4) return;
      const start = (td[1].textContent || '').trim();
      const company = (td[2].textContent || '').trim();
      const total = (td[3].textContent || '').trim();
      let minutes = null; const m = total.match(/(\d+)\s*min/i); if(m) minutes = +m[1];
      rows.push({ start, company, total, minutes, pending: /pending/i.test(total) });
    });
    return rows;
  }

  function readMonthly(){
    const out = [];
    document.querySelectorAll('table.details-table tbody tr').forEach(function(r){
      const td = r.querySelectorAll('td');
      if(td.length < 3) return;
      const month = (td[0].textContent || '').replace(/\s+/g,'');
      const calls = parseInt((td[1].textContent || '').replace(/[^\d]/g,''), 10);
      const mins = parseInt((td[2].textContent || '').replace(/[^\d]/g,''), 10);
      if(month) out.push({ month, calls: isNaN(calls)?null:calls, mins: isNaN(mins)?null:mins });
    });
    return out;
  }

  function fetchCallsViaPage(){
    return new Promise(function(resolve){
      const reqId = "globo_" + Date.now();
      let done = false;
      function onMsg(ev){
        if(ev.source !== window) return;
        const d = ev.data;
        if(!d || d.__globo !== "callsResult" || d.reqId !== reqId) return;
        window.removeEventListener("message", onMsg);
        done = true; resolve(d);
      }
      window.addEventListener("message", onMsg);
      window.postMessage({ __globo:"fetchCalls", reqId }, "*");
      setTimeout(function(){ if(!done){ window.removeEventListener("message", onMsg); resolve({ error:"timeout", calls:[] }); } }, 60000);
    });
  }

  async function doSync(){
    if(SYNCING){ log("warn","Sync ya en curso, ignoro"); return; }
    SYNCING = true;
    try{
      if(isDashboard){
        const t = readDashboardToday();
        if(t) chrome.runtime.sendMessage({ type:"dashboardToday", calls:t.calls, mins:t.mins });
        else log("warn","No pude leer el contador de hoy");
        const rj = readRecentJobs();
        if(rj.length) chrome.runtime.sendMessage({ type:"recentJobs", rows: rj });
      }
      if(isMonthly){
        const m = readMonthly();
        if(m.length) chrome.runtime.sendMessage({ type:"monthly", months: m });
        else log("warn","No pude leer la tabla mensual");
      }
      if(isCallLog){
        log("info","Pidiendo llamadas al DataTable...");
        const res = await fetchCallsViaPage();
        if(res.error) log("error","Call Log: "+res.error);
        if(res.sample) chrome.runtime.sendMessage({ type:"callLogSample", sample: res.sample, cols: res.cols });
        const calls = res.calls || [];
        log("info","Call Log devolvio "+calls.length+" filas; enviando a Notion");
        chrome.runtime.sendMessage({ type:"callLogData", calls });
      }
    }catch(e){ log("error","doSync excepcion", String(e)); }
    finally{ SYNCING = false; }
  }

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
    if(msg && msg.type === "runSync"){ doSync(); if(sendResponse) sendResponse({ ok:true }); }
    return true;
  });

  // v3.10 - puerto keep-alive: mientras haya llamada en curso mantenemos un Port abierto al
  // background para que el service worker NO se duerma y siga procesando el cronometro y el
  // watchdog. Se cierra al colgar. (No vence el throttling de pestana oculta de Chrome, pero
  // evita que el SW se apague durante la llamada.)
  var _kaPort = null, _kaTimer = null;
  function _kaOpen(){
    try{
      if(_kaPort) return;
      _kaPort = chrome.runtime.connect({ name:"globo-live" });
      _kaPort.onDisconnect.addListener(function(){ _kaPort = null; void chrome.runtime.lastError; });
      if(!_kaTimer) _kaTimer = setInterval(function(){ try{ if(_kaPort) _kaPort.postMessage({ t: Date.now() }); }catch(e){ _kaPort = null; } }, 20000);
    }catch(e){ _kaPort = null; }
  }
  function _kaClose(){
    try{ if(_kaTimer){ clearInterval(_kaTimer); _kaTimer = null; } }catch(e){}
    try{ if(_kaPort){ _kaPort.disconnect(); _kaPort = null; } }catch(e){}
  }
  // Reenvia el estado de llamada en vivo (emitido por mainworld.js) al background.
  window.addEventListener("message", function(ev){
    if(ev.source !== window) return;
    const d = ev.data;
    if(!d || d.__globo !== "liveState") return;
    try{ if(d.inCall) _kaOpen(); else _kaClose(); }catch(e){}
    try{ chrome.runtime.sendMessage({ type:"liveState", inCall: !!d.inCall, hardOff: !!d.hardOff, source: d.source || "", startedAt: (typeof d.startedAt === "number" ? d.startedAt : null) }); }catch(e){}
  });
  window.addEventListener("pagehide", function(){ try{ _kaClose(); }catch(e){} });
  // En el Dashboard, re-lee el contador de hoy cada 15s (silencioso) para refrescar el panel rapido.
  if(isDashboard){
    setInterval(function(){
      try{ const t = readDashboardToday(); if(t) chrome.runtime.sendMessage({ type:"dashboardToday", calls:t.calls, mins:t.mins, silent:true }); }catch(e){}
    }, 15000);
  }

  // ---- Cronometro de disponibilidad por switch (solo Dashboard; mide con la ventana abierta) ----
  // Lee on/off de Telefono (#ti-toggle-01), Video (#vri-toggle-01) y General (#user_avail_comp)
  // cada segundo y acumula tiempo DISPONIBLE (on) vs OFFLINE (off). Total del dia (reinicia a medianoche local).
  if(isDashboard){
    function switchOn(toggleId, panelId){
      try{
        var inp = document.getElementById(toggleId);
        if(inp){
          var sw = inp.closest('[role="switch"]');
          if(sw){ var ac = sw.getAttribute('aria-checked'); if(ac === 'true') return true; if(ac === 'false') return false; }
          if(typeof inp.checked === 'boolean') return inp.checked;
        }
        var panel = panelId ? document.getElementById(panelId) : null;
        if(panel){ var bg = (panel.style && panel.style.backgroundColor) || ''; if(/rgb\(\s*208\s*,\s*249\s*,\s*208\s*\)/.test(bg)) return true; if(/rgb\(/.test(bg)) return false; }
        return null; // desconocido: no cuenta
      }catch(e){ return null; }
    }
    // Solo REPORTA el estado de los 3 switches; el cronometro lo lleva el background
    // (con timestamps + chrome.idle). Asi sigue contando aunque el Dashboard este en
    // segundo plano (p.ej. mientras miras el panel de la extension en otra pestana).
    function readStates(){
      return {
        tel: switchOn('ti-toggle-01','panel-heading-service-line-ti'),
        vid: switchOn('vri-toggle-01','panel-heading-service-line-vri'),
        mas: switchOn('user_avail_comp', null)
      };
    }
    function sendAvail(){
      try{ var s = readStates(); chrome.runtime.sendMessage({ type:"availState", tel:s.tel, vid:s.vid, mas:s.mas, at: Date.now() }); }catch(e){}
    }
    setInterval(sendAvail, 3000); // heartbeat (el navegador lo ralentiza solo cuando la pestana esta oculta)
    document.addEventListener("visibilitychange", sendAvail);
    sendAvail();
  }

  // ---- Auto-inicio de sesion (v3.9 - OPCIONAL, desactivado por defecto) ----
  // Solo actua si el usuario lo activo en el panel y guardo usuario/contrasena
  // (almacenados localmente en chrome.storage.local de ESTE navegador, nunca salen).
  // Detecta un formulario de login generico (campo password visible) y lo
  // completa + envia UNA sola vez por carga, para no entrar en bucle si las
  // credenciales fueran erroneas.
  function isLoginPage(){
    try{
      if(/sign[_-]?in|log[_-]?in/i.test(location.href)) return true;
      var pw = document.querySelector('input[type=password]');
      return !!(pw && pw.offsetParent !== null);
    }catch(e){ return false; }
  }
  function setFieldValue(inp, val){
    if(!inp) return;
    try{
      var desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value');
      if(desc && desc.set) desc.set.call(inp, val); else inp.value = val;
    }catch(e){ inp.value = val; }
    inp.dispatchEvent(new Event('input', { bubbles:true }));
    inp.dispatchEvent(new Event('change', { bubbles:true }));
  }
  function tryAutoLogin(){
    try{
      if(!isLoginPage()) return;
      if(sessionStorage.getItem('globoAutoLoginTried')) return;
      chrome.storage.local.get(['autologin'], function(o){
        try{
          var cfg = o && o.autologin;
          if(!cfg || !cfg.enabled || !cfg.user || !cfg.pass) return;
          var pw = document.querySelector('input[type=password]');
          if(!pw){ return; }
          var form = pw.form || (pw.closest ? pw.closest('form') : null);
          var userField = document.querySelector('input[type=email], input[name*="email" i], input[name*="login" i], input[name*="username" i], input[name*="user" i]:not([type=password]), input[type=text]');
          setFieldValue(userField, cfg.user);
          setFieldValue(pw, cfg.pass);
          sessionStorage.setItem('globoAutoLoginTried','1');
          log('info','Auto-login: credenciales aplicadas; enviando formulario');
          setTimeout(function(){
            try{
              if(form && form.requestSubmit){ form.requestSubmit(); return; }
              if(form && form.submit){ form.submit(); return; }
              var btn = (form || document).querySelector('button[type=submit], input[type=submit], button');
              if(btn) btn.click();
            }catch(e){ log('warn','Auto-login: no pude enviar el formulario', String(e)); }
          }, 300);
        }catch(e){}
      });
    }catch(e){}
  }
  if(IS_GLOBO) tryAutoLogin();

  // ===== v3.20: ATAJOS Y PANEL FLOTANTE IN-PAGE + AHK 2.0 VERIFICADO APARTE =====
  // Todo lo que antes hacia el puente AHK ahora vive aqui y funciona mientras la pestana
  // de Globo tenga el foco. Contestar/Rechazar usan selectores capturados (hkSelectors)
  // del DOM de la llamada ENTRANTE; mientras no se capturen, el atajo NO inventa clics
  // (NO-SIMULACION) y lo reporta a Notion. El panel flotante muestra minutos/meta/dinero.
  (function(){
    if(window.__globoHkLoaded) return; window.__globoHkLoaded = true;
    var RATE_USD = 0.14, TC = 17.28, MXN_MIN = RATE_USD * TC;
    var VIZ_NAMES = ["Cinta + meta","Numeros","Anillo","Waffle"];
    var _state = {}, _viz = 0, _ov = { hud:false, money:false, cheat:false };
    var _safe = { overlay:true, inpageScan:true, bgPoll:true, meter:true };

    function loadAll(cb){
      try{ chrome.storage.local.get(["state","viz","ov","safe"], function(o){
        _state = o.state || {};
        _viz = (typeof o.viz === "number") ? (o.viz % 4) : 0;
        _ov = Object.assign({ hud:false, money:false, cheat:false }, o.ov || {});
        _safe = Object.assign({ overlay:true, inpageScan:true, bgPoll:true, meter:true }, o.safe || {});
        postMeterCfg();
        if(cb) cb();
      }); }catch(e){ if(cb) cb(); }
    }
    try{ chrome.storage.onChanged.addListener(function(ch, area){
      if(area !== "local") return;
      if(ch.state) _state = ch.state.newValue || {};
      if(ch.viz && typeof ch.viz.newValue === "number") _viz = ch.viz.newValue % 4;
      if(ch.ov) _ov = Object.assign({ hud:false, money:false, cheat:false }, ch.ov.newValue || {});
      if(ch.safe){ _safe = Object.assign({ overlay:true, inpageScan:true, bgPoll:true, meter:true }, ch.safe.newValue || {}); postMeterCfg(); }
      applyOverlay();
    }); }catch(e){}

    // v3.31: puente del medidor de audio. mainworld.js (mundo MAIN) lee getStats() y publica
    // "audioStat"; aqui lo reenviamos al background (-> telemetria Notion). Tambien respondemos
    // "meterReq" informando si el medidor esta encendido (kill-switch safe.meter).
    function postMeterCfg(){ try{ window.postMessage({ __globo:"meterCfg", on: !!(_safe && _safe.meter) }, "*"); }catch(e){} }
    window.addEventListener("message", function(ev){
      if(ev.source !== window) return;
      var d = ev.data; if(!d || !d.__globo) return;
      if(d.__globo === "meterReq"){ postMeterCfg(); return; }
      if(d.__globo === "audioStat"){
        if(!_safe.meter) return;
        try{ chrome.runtime.sendMessage({ type:"audioStat", metrics: d.metrics || null, source: d.source || "" }); }catch(e){}
      }
    });

    function liveInfo(){
      var st = _state || {}; var now = Date.now();
      var base = (typeof st.todayMins === "number") ? st.todayMins : 0;
      var pend = (typeof st.pendingSecs === "number" && st.pendingSecs > 0) ? st.pendingSecs : 0;
      var inCall = !!(st.inCall && st.callStartedAt);
      var liveMs = inCall ? Math.max(0, now - st.callStartedAt) : 0;
      var liveMins = base + pend/60 + liveMs/60000;
      var goal = (typeof st.goal === "number" && st.goal > 0) ? st.goal : 200;
      return { base:base, liveMins:liveMins, inCall:inCall, liveMs:liveMs, goal:goal, calls:(typeof st.todayCalls==="number"?st.todayCalls:null), earned: liveMins*MXN_MIN };
    }
    function mmss(ms){ ms=Math.max(0,ms||0); var s=Math.floor(ms/1000); var m=Math.floor(s/60); var ss=s%60; var cs=Math.floor((ms%1000)/10); return String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0")+"."+String(cs).padStart(2,"0"); }
    function money(n, cents){ var v = cents ? (Math.round((n||0)*100)/100) : Math.round(n||0); return "$"+v.toLocaleString("es-MX", cents?{minimumFractionDigits:2,maximumFractionDigits:2}:{})+" MXN"; }

    var host=null;
    function ensureHost(){
      if(host && document.body && document.body.contains(host)) return host;
      host = document.getElementById("globo-hud");
      if(!host){
        host = document.createElement("div");
        host.id = "globo-hud";
        host.style.cssText = "position:fixed;z-index:2147483646;right:14px;bottom:14px;width:260px;background:rgba(13,16,22,.94);color:#e6e9ef;font:12px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;border:1px solid #2a2f3a;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:10px 12px;user-select:none";
        (document.body||document.documentElement).appendChild(host);
      }
      return host;
    }
    function applyOverlay(){
      if(_safe.overlay && _ov.hud){ ensureHost(); host.style.display="block"; startPaint(); }
      else { try{ if(_liveTimer){ clearInterval(_liveTimer); _liveTimer=0; } }catch(e){} if(host){ host.style.display="none"; } }
    }
    function cheatHtml(){
      var rows=[["Alt+Shift+V","Contestar VIDEO"],["Alt+Shift+A","Contestar audio"],["Alt+Shift+R","Rechazar"],["Alt+Shift+C","Chuleta"],["Alt+Shift+P","Panel on/off"],["Alt+Shift+G","Rotar vista"],["Alt+Shift+M","Dinero"]];
      var h="<div style='margin-top:8px;border-top:1px solid #2a2f3a;padding-top:6px'>";
      rows.forEach(function(r){ h+="<div style='display:flex;justify-content:space-between;gap:8px'><code style='color:#58a6ff'>"+r[0]+"</code><span style='color:#8b93a3'>"+r[1]+"</span></div>"; });
      return h+"</div>";
    }
    function vizHtml(L){
      var inLap = L.liveMins - Math.floor(L.liveMins/L.goal)*L.goal;
      var pct = Math.max(0, Math.min(100, Math.round(inLap/L.goal*100)));
      var col = L.liveMins>=L.goal ? "#58a6ff" : (pct>=50 ? "#d29922" : "#3fb950");
      var mins1 = L.liveMins.toFixed(1);
      var head = "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px'><b style='font-size:11px;letter-spacing:.4px;color:#8b93a3'>GLOBO &middot; "+(_viz+1)+"/4 "+VIZ_NAMES[_viz]+"</b>"+(L.inCall?"<span style='color:#3fb950'>&#9679; en llamada</span>":"<span style='color:#8b93a3'>&#9675; libre</span>")+"</div>";
      var moneyLine = _ov.money ? ("<div style='color:#3fb950;font-size:30px;font-weight:800;line-height:1.05;margin-top:6px;font-variant-numeric:tabular-nums'>"+money(L.earned,false)+"</div>") : ("<div style='color:#3fb950;font-weight:600;margin-top:2px'>"+money(L.earned,false)+"</div>");
      var timer = L.inCall ? ("<div style='font-variant-numeric:tabular-nums;color:#e6e9ef;margin-top:2px'>&#9201; "+mmss(L.liveMs)+"</div>") : "";
      var body2 = "";
      if(_viz===1){
        body2 = "<div style='font-size:26px;font-weight:800;line-height:1'>"+mins1+"<span style='font-size:12px;color:#8b93a3'> / "+L.goal+" min</span></div>";
      } else if(_viz===2){
        var R=26,C=2*Math.PI*R,frac=Math.min(1,inLap/L.goal),dash=(frac*C).toFixed(1)+" "+((1-frac)*C).toFixed(1);
        body2 = "<div style='display:flex;align-items:center;gap:10px'><svg width='64' height='64' viewBox='0 0 64 64'><circle cx='32' cy='32' r='"+R+"' fill='none' stroke='#161a22' stroke-width='8'/><circle cx='32' cy='32' r='"+R+"' fill='none' stroke='"+col+"' stroke-width='8' stroke-dasharray='"+dash+"' transform='rotate(-90 32 32)'/><text x='32' y='36' text-anchor='middle' fill='#e6e9ef' font-size='15' font-weight='700'>"+pct+"%</text></svg><div><div style='font-weight:700'>"+mins1+" min</div><div style='color:#8b93a3'>de "+L.goal+"</div></div></div>";
      } else if(_viz===3){
        var per=L.goal/100, exact=Math.max(0,Math.min(100,L.liveMins/per)), full=Math.floor(exact), frac=exact-full, doneW=L.liveMins>=L.goal, w="<div style='display:grid;grid-template-columns:repeat(10,9px);grid-auto-rows:9px;gap:2px'>";
        for(var r=0;r<10;r++){ for(var c=0;c<10;c++){ var idx=(9-r)*10+c; var bg; if(idx<full){ bg=col; } else if(idx===full && frac>0 && !doneW){ var pp=Math.round(frac*100); bg="linear-gradient(to top,"+col+" "+pp+"%,#161a22 "+pp+"%)"; } else { bg="#161a22"; } w+="<i style='display:block;width:9px;height:9px;border-radius:2px;background:"+bg+"'></i>"; } }
        body2 = w + "</div><div style='color:#8b93a3;margin-top:4px'>"+mins1+"/"+L.goal+" min</div>";
      } else {
        body2 = "<div style='height:8px;background:#161a22;border-radius:5px;overflow:hidden'><div style='height:100%;width:"+pct+"%;background:"+col+"'></div></div><div style='color:#8b93a3;margin-top:4px'>"+mins1+"/"+L.goal+" min ("+pct+"%)"+(L.calls!=null?(" &middot; "+L.calls+" llam."):"")+"</div>";
      }
      return head + body2 + moneyLine + timer + (_ov.cheat ? cheatHtml() : "");
    }
    var _liveTimer=0;
    // v3.31 "modo seguro": el panel flotante YA NO usa requestAnimationFrame. Se repinta por
    // EVENTOS (chrome.storage.onChanged cuando cambia el estado) y, SOLO mientras hay una
    // llamada en curso y el panel esta visible, con un setInterval lento de 1s (cronometro y
    // centavos en vivo). En reposo: cero callbacks por frame y cero timers. Por construccion el
    // hilo principal de la pestana que lleva el audio de la llamada no recibe trabajo perpetuo.
    function paintOnce(){
      try{ if(_safe.overlay && _ov.hud && host && host.style.display!=="none"){ host.innerHTML = vizHtml(liveInfo()); } }catch(e){}
    }
    function reschedule(){
      try{ if(_liveTimer){ clearInterval(_liveTimer); _liveTimer = 0; } }catch(e){}
      if(!_safe.overlay || !_ov.hud) return;
      if(liveInfo().inCall){ _liveTimer = setInterval(paintOnce, 1000); }
    }
    function startPaint(){ paintOnce(); reschedule(); }

    function clickSelectors(list){ for(var i=0;i<list.length;i++){ try{ var el=document.querySelector(list[i]); if(el && el.offsetParent!==null){ el.click(); return list[i]; } }catch(e){} } return null; }
    function doCallAction(action){
      if(!IS_GLOBO) return;
      try{
        chrome.storage.local.get("hkSelectors", function(o){
          var sels=(o && o.hkSelectors) || {}; var list=sels[action] || [];
          if(!list.length){ log("warn","Atajo "+action+": faltan selectores del DOM de llamada entrante (aun sin capturar). No invento clics."); return; }
          var hit=clickSelectors(list);
          log(hit?"ok":"warn","Atajo "+action+": "+(hit?("clic en "+hit):"ningun selector coincidio"));
        });
      }catch(e){ log("error","Atajo "+action, String(e)); }
    }

    function setOv(patch){ _ov=Object.assign({}, _ov, patch); try{ chrome.storage.local.set({ ov:_ov }); }catch(e){} applyOverlay(); }
    function cycleViz(){ _viz=(_viz+1)%4; try{ chrome.storage.local.set({ viz:_viz }); }catch(e){} }
    document.addEventListener("keydown", function(e){
      if(!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
      var k=(e.key||"").toLowerCase();
      var map={ v:"answer_video", a:"answer_audio", r:"reject", c:"cheatsheet", p:"hud_toggle", g:"viz_cycle", m:"money_toggle" };
      var act=map[k]; if(!act) return;
      e.preventDefault(); e.stopPropagation();
      if(act==="answer_video"||act==="answer_audio"||act==="reject"){ doCallAction(act); }
      else if(act==="hud_toggle"){ setOv({ hud: !_ov.hud }); }
      else if(act==="money_toggle"){ if(!_ov.hud) setOv({ hud:true, money:true }); else setOv({ money: !_ov.money }); }
      else if(act==="cheatsheet"){ if(!_ov.hud) setOv({ hud:true, cheat:true }); else setOv({ cheat: !_ov.cheat }); }
      else if(act==="viz_cycle"){ cycleViz(); }
    }, true);

    // ---- AUTO-CAPTURA del modal de llamada ENTRANTE -> Notion (Registro de actividad) ----
    var _capSeen = {};
    function looksIncoming(el){
      try{
        var t=((el.innerText||el.textContent||"")+"").toLowerCase();
        if(t.length>4000) return false;
        var hasAnswer=/answer|accept|contestar|aceptar|pick ?up|atender/.test(t);
        var hasReject=/decline|reject|rechaz|ignore|hang ?up|colgar/.test(t);
        var incoming=/incoming|llamada entrante|entrante|ringing|is calling|esta llamando/.test(t);
        if(!(hasAnswer || hasReject)) return false;
        return incoming || (hasAnswer && hasReject);
      }catch(e){ return false; }
    }
    function visible(el){ try{ var r=el.getBoundingClientRect(); var cs=getComputedStyle(el); return r.width>40 && r.height>30 && cs.display!=="none" && cs.visibility!=="hidden" && parseFloat(cs.opacity||"1")>0.1; }catch(e){ return false; } }
    function scanIncoming(){
      try{
        var cands=document.querySelectorAll("[role=dialog], .modal, .modal-dialog, .popup, .incoming, [class*='call'], [class*='modal'], [id*='call'], [id*='modal']");
        for(var i=0;i<cands.length && i<60;i++){
          var el=cands[i];
          if(!visible(el) || !looksIncoming(el)) continue;
          var sig=(el.id||"")+"|"+((el.className||"").toString().slice(0,80))+"|"+((el.innerText||"").trim().length);
          if(_capSeen[sig]) continue;
          _capSeen[sig]=Date.now();
          var html=(el.outerHTML||"").replace(/\s+/g," ").trim().slice(0,1800);
          if(!html) continue;
          log("info","CAPTURA modal llamada entrante (para cablear contestar/rechazar)", html);
          break;
        }
      }catch(e){}
    }

    loadAll(function(){ applyOverlay(); });
    if(IS_GLOBO) setInterval(function(){ if(_safe.inpageScan && !liveInfo().inCall) scanIncoming(); }, 1200);
    if(IS_GLOBO) log("info","v3.32 telemetria forense: overlay por eventos (sin rAF), escaneo conmutable+pausado en llamada, y medidor de audio forense (jank/longtasks/getStats) conmutable (safe.meter)");
  })();

  if(IS_GLOBO) setTimeout(doSync, 1500);
  if(IS_GLOBO) log("info","content.js activo en " + location.pathname);
})();