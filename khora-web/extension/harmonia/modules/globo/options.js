const RATE_USD = 0.14;
const TC = 17.28;
let GOAL = 200; // se actualiza desde Notion en cada render (solo editable alli)
const MXN_MIN = RATE_USD * TC;
const DB_ID = "69b2a69b-e923-4c0f-b438-f38b0cd35b95";
const WANTED = [["dashboard","https://globohq.com/linguist_dashboard/index"],["callLog","https://globohq.com/interpreter/calls_index"],["monthly","https://globohq.com/interpreter/monthly_minutes"]];
let _st = {}, _stats = {}, _ovLive = {}, _ahkStatus = {};
// v3.8: el odometro monotonico (_liveMinsMax) se ELIMINO. Ahora liveMins se reconcilia
// con precision via pendingSecs (segundos pendientes que el Dashboard aun no suma).
function localDayKey(){ var d = new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }

function fmt(ts){ if(!ts) return "-"; return new Date(ts).toLocaleTimeString("es-MX",{ hour:"2-digit", minute:"2-digit", second:"2-digit" }); }
function ago(ts){ if(!ts) return "nunca"; const s = Math.round((Date.now()-ts)/1000); if(s<60) return "hace "+s+"s"; const m=Math.round(s/60); if(m<60) return "hace "+m+"m"; return "hace "+Math.round(m/60)+"h"; }
function mxn(n){ return "$" + Math.round(n).toLocaleString("es-MX") + " MXN"; }
// Con CENTAVOS (2 decimales) para el dinero EN VIVO: cambia al segundo conforme corre la llamada.
function mxn2(n){ var v = Math.round((n||0)*100)/100; return "$" + v.toLocaleString("es-MX",{ minimumFractionDigits:2, maximumFractionDigits:2 }) + " MXN"; }
function el(html){ const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
function escapeHtml(s){ return String(s).replace(/[&<>]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c])); }
function monthByKey(months, key){ return (months||[]).find(m=>m.month === key) || null; }

// Barra con VUELTAS: al completar la meta se pone AZUL y reinicia para la siguiente vuelta.
function bar(mins){
  if(mins == null){
    return "<div class='barwrap'><div class='bar' style='width:0%'></div></div>"+
      "<div class='mut' style='margin-top:6px'>sin dato / "+GOAL+" min</div>";
  }
  const lap = Math.floor(mins / GOAL);
  const inLap = mins - lap*GOAL;
  const justDone = lap > 0 && inLap === 0;
  const pct = justDone ? 100 : Math.min(100, Math.round(inLap / GOAL * 100));
  const done = mins >= GOAL;
  const col = done ? '#58a6ff' : (pct >= 50 ? '#d29922' : '#f85149');
  const earned = mxn(mins * MXN_MIN);
  const potential = mxn(GOAL * MXN_MIN);
  const lapLabel = done ? (" <span style='color:#58a6ff'>vuelta "+(lap+1)+(justDone?" recien cumplida":"")+"</span>") : "";
  const check = done ? " <span style='color:#58a6ff'>&#127881; meta cumplida</span>" : "";
  return "<div class='barwrap"+(done?" done":"")+"'><div class='bar' style='width:"+pct+"%;background:"+col+"'></div></div>"+
    "<div class='mut' style='margin-top:6px'>"+inLap+"/"+GOAL+" min ("+pct+"%)"+lapLabel+check+" &middot; total hoy "+mins+" min &middot; ganado "+earned+" de un potencial de "+potential+" por vuelta</div>";
}

function sparkline(hist){
  if(!hist || hist.length<2) return "<span class='mut'>sin historial aun</span>";
  const vals = hist.map(h=>h.mins);
  const max = Math.max(GOAL, Math.max.apply(null, vals));
  const w=480, h=60, n=vals.length;
  const pts = vals.map((v,i)=> ((n===1?0:i/(n-1))*w).toFixed(1)+","+(h-(v/max)*h).toFixed(1)).join(" ");
  const goalY = (h-(GOAL/max)*h).toFixed(1);
  return "<svg width='100%' viewBox='0 0 "+w+" "+h+"' preserveAspectRatio='none' style='height:60px'>"+
    "<line x1='0' y1='"+goalY+"' x2='"+w+"' y2='"+goalY+"' stroke='#58a6ff' stroke-width='1' stroke-dasharray='4 4' opacity='0.6'/>"+
    "<polyline fill='none' stroke='#58a6ff' stroke-width='2' points='"+pts+"'/></svg>";
}

async function openTabsInfo(){
  try{
    const tabs = await chrome.tabs.query({ url:"https://globohq.com/*" });
    const urls = tabs.map(t=>t.url||"");
    return {
      dashboard: urls.some(u=>/linguist_dashboard/.test(u)),
      callLog: urls.some(u=>/calls_index/.test(u)),
      monthly: urls.some(u=>/monthly_minutes/.test(u)),
      count: tabs.length
    };
  }catch(e){ return { dashboard:false, callLog:false, monthly:false, count:0 }; }
}

async function render(){
  const o = await chrome.storage.local.get(["state","stats","log","history","viz","ov","ahkStatus","safe","audioMeter","audioWindow"]);
  const st = o.state || {}, stats = o.stats || {}, log = o.log || [], hist = o.history || [];
  _st = st; _stats = stats; _ahkStatus = o.ahkStatus || {}; renderAhkStatus(_ahkStatus);
  if(typeof o.viz === "number") VIZ = o.viz;
  _ovLive = o.ov || {};
  var _ovc=document.getElementById("ovctl");
  if(_ovc){ var ov=_ovLive||{}; _ovc.innerHTML =
    "<button data-act='hud_toggle' class='"+(ov.hud?"on":"")+"'>"+(ov.hud?"Panel flotante: ON":"Mostrar panel flotante")+"</button>"+
    "<button data-act='money_toggle' class='"+(ov.money?"on":"")+"'>Centavos en vivo: "+(ov.money?"ON":"OFF")+"</button>"+
    "<button data-act='cheatsheet' class='"+(ov.cheat?"on":"")+"'>Chuleta: "+(ov.cheat?"ON":"OFF")+"</button>"+
    "<span class='mut'>Aparece en la pesta\u00f1a de Globo (globohq.com). Atajos: Alt+Shift+P panel, Alt+Shift+M dinero, Alt+Shift+C chuleta.</span>"; }
  try{ renderSafe(o.safe || {}); renderMeter(o.audioMeter || null); renderWindow(o.audioWindow || null); }catch(e){}
  updateVizBtn();
  GOAL = (typeof st.goal === "number" && st.goal > 0) ? st.goal : 200;
  const tabsInfo = await openTabsInfo();

  const conn = document.getElementById("conn");
  const fresh = st.lastRoundAt && (Date.now()-st.lastRoundAt) < 6*60*1000;
  conn.className = "dot " + (tabsInfo.count ? (fresh ? "on" : "") : "off");

  const goalPill = document.getElementById("goalpill");
  if(goalPill) goalPill.textContent = "meta "+GOAL+" min (Notion)";

  const banner = document.getElementById("banner");
  if(st.sessionExpired){ banner.className="banner show warn"; banner.textContent = "Sesion de Globo EXPIRADA: abre globohq.com e inicia sesion (o activa el auto-inicio de sesion mas abajo). Mientras tanto no puedo leer tus minutos ni llamadas."; }
  else if(st.feedStale){ banner.className="banner show warn"; banner.textContent = "Feed estancado: el Dashboard no reporta hace mas de 7 min. Recarga la pestana del Dashboard de Globo."; }
  else if(!tabsInfo.count){ banner.className="banner show warn"; banner.textContent = "No hay pestanas de globohq.com abiertas. Manten ABIERTO el Dashboard (las de Call Log y Mensual ya no son necesarias en v3.9)."; }
  else { banner.className="banner"; }

  const months = st.months || [];
  const jun = monthByKey(months,"6/2026"), may = monthByKey(months,"5/2026"), cur = months[0] || null;
  const todayMins = (typeof st.todayMins==="number") ? st.todayMins : null;
  const todayCalls = (typeof st.todayCalls==="number") ? st.todayCalls : null;
  const earned = todayMins!=null ? mxn(todayMins*MXN_MIN) : "sin dato";
  const porCobrar = (may&&may.mins!=null?may.mins:0) + (jun&&jun.mins!=null?jun.mins:0);
  const cards = [
    ["Minutos hoy", todayMins!=null ? (todayMins+"/"+GOAL) : "sin dato", todayMins!=null ? (todayMins>=GOAL ? "meta cumplida \uD83C\uDF89" : ("faltan "+Math.max(0,GOAL-todayMins))) : ago(st.dashboardAt)],
    ["Llamadas hoy", todayCalls!=null ? todayCalls : "sin dato", "Dashboard "+ago(st.dashboardAt)],
    ["Ganado hoy", earned, MXN_MIN.toFixed(2)+" MXN/min"],
    ["Mes actual", cur ? (cur.calls+" / "+cur.mins+" min") : "sin dato", cur ? cur.month : ago(st.monthlyAt)],
    ["Por cobrar", porCobrar ? mxn(porCobrar*RATE_USD*TC) : "sin dato", "May+Jun "+porCobrar+" min"],
    ["En base (Notion)", st.seenCount!=null ? st.seenCount : "sin dato", "unicos "+ago(st.seenAt)],
    ["Errores", stats.errors||0, "acumulados"],
    ["Proximo sondeo", st.nextPollAt ? Math.max(0,Math.round((st.nextPollAt-Date.now())/1000))+"s" : "-", "cada 2 min"]
  ];
  const cc = document.getElementById("cards"); cc.innerHTML = "";
  cards.forEach(c=> cc.appendChild(el('<div class="card"><div class="k">'+c[0]+'</div><div class="v">'+c[1]+'</div><div class="s">'+c[2]+'</div></div>')));

  try{ renderDayViz(); }catch(e){}
  document.getElementById("spark").innerHTML = sparkline(hist);

  let so = "";
  [["Dashboard","dashboard"],["Call Log","callLog"],["Monthly","monthly"]].forEach(p=>{
    const on = tabsInfo[p[1]];
    so += "<span class='src'><span class='dot "+(on?"on":"off")+"'></span>"+p[0]+"</span>";
  });
  document.getElementById("srcopen").innerHTML = so;

  const srcRows = [
    ["Dashboard (hoy)", st.dashboardAt, todayMins!=null ? (todayCalls+" call / "+todayMins+" min") : "-"],
    ["Call Log (detalle)", st.callLogAt, st.callLogCount!=null ? (st.callLogCount+" filas leidas") : "-"],
    ["Monthly (oficial)", st.monthlyAt, cur ? (cur.month+" "+cur.mins+" min") : "-"]
  ];
  let sh = "<tr><th>Fuente</th><th>Ultima lectura</th><th>Reloj</th><th>Valor</th></tr>";
  srcRows.forEach(r=>{ sh += "<tr><td>"+r[0]+"</td><td>"+ago(r[1])+"</td><td class='mut'>"+fmt(r[1])+"</td><td>"+r[2]+"</td></tr>"; });
  document.querySelector("#sources tbody").innerHTML = sh;

  let ih = "<tr><th>Indicador</th><th>Valor</th></tr>";
  ih += "<tr><td>Insertadas (ultima ronda)</td><td>"+(st.lastInsertedCount!=null?st.lastInsertedCount:"-")+"</td></tr>";
  ih += "<tr><td>Saltadas por duplicado</td><td>"+(st.lastSkippedCount!=null?st.lastSkippedCount:"-")+"</td></tr>";
  ih += "<tr><td>Insertadas (total sesion)</td><td>"+(stats.insertedTotal||0)+"</td></tr>";
  ih += "<tr><td>Ultima llamada insertada</td><td><code>"+(st.lastInserted||"-")+"</code> "+(st.lastInsertAt?("<span class='mut'>"+fmt(st.lastInsertAt)+"</span>"):"")+"</td></tr>";
  if(st.callLogSample) ih += "<tr><td>Muestra cruda Call Log ("+(st.callLogCols||0)+" cols)</td><td class='mut'>"+escapeHtml(st.callLogSample.join(" | ")).slice(0,300)+"</td></tr>";
  document.querySelector("#inserts tbody").innerHTML = ih;

  const byCo = {}; (st.recentJobs||[]).forEach(r=>{ const c=r.company||"-"; byCo[c]=(byCo[c]||0)+1; });
  const coKeys = Object.keys(byCo).sort((a,b)=>byCo[b]-byCo[a]);
  let coh = "<tr><th>Empresa</th><th>Llamadas</th></tr>";
  if(coKeys.length) coKeys.forEach(k=>{ coh += "<tr><td>"+escapeHtml(k)+"</td><td>"+byCo[k]+"</td></tr>"; });
  else coh += "<tr><td colspan='2' class='mut'>Sin datos (abre el Dashboard)</td></tr>";
  document.querySelector("#companies tbody").innerHTML = coh;

  const rj = st.recentJobs || [];
  let rh = "<tr><th>Inicio</th><th>Empresa</th><th>Total</th></tr>";
  if(rj.length) rj.slice(0,8).forEach(r=>{ rh += "<tr><td>"+escapeHtml(r.start||"-")+"</td><td>"+escapeHtml(r.company||"-")+"</td><td>"+(r.pending?"<span class='warn'>Pending</span>":escapeHtml(r.total||"-"))+"</td></tr>"; });
  else rh += "<tr><td colspan='3' class='mut'>Sin datos (abre el Dashboard de Globo)</td></tr>";
  document.querySelector("#recent tbody").innerHTML = rh;

  const lg = document.getElementById("log");
  lg.innerHTML = "";
  log.slice(-150).reverse().forEach(e=>{
    const cls = e.level==="ok"?"ok":e.level==="warn"?"warn":e.level==="error"?"err":"info";
    lg.appendChild(el("<div><span class='mut'>"+fmt(e.t)+"</span> <span class='"+cls+"'>["+(e.level||"info").toUpperCase()+"]</span> "+escapeHtml(e.msg)+(e.data?(" <span class='mut'>"+escapeHtml(typeof e.data==='string'?e.data:JSON.stringify(e.data)).slice(0,160)+"</span>"):"")+"</div>"));
  });

  let ch = "<tr><th>Clave</th><th>Valor</th></tr>";
  ch += "<tr><td>Meta diaria (desde Notion)</td><td><b style='color:#58a6ff'>"+GOAL+" min</b> <span class='mut'>actualizada "+ago(st.goalAt)+" &middot; solo editable en Notion</span></td></tr>";
  ch += "<tr><td>Base de Notion</td><td><code>"+DB_ID+"</code></td></tr>";
  ch += "<tr><td>Token</td><td class='mut'>configurado en Ajustes (chrome.storage)</td></tr>";
  ch += "<tr><td>Tipo de cambio</td><td>"+TC+" MXN/USD</td></tr>";
  ch += "<tr><td>Sondeo automatico</td><td>cada 2 min</td></tr>";
  ch += "<tr><td>Pestanas globohq abiertas</td><td>"+tabsInfo.count+"</td></tr>";
  ch += "<tr><td>Sesion de Globo</td><td>"+(st.sessionExpired ? "<span class='warn'>expirada</span>" : (st.sessionCheckedAt ? "<span class='ok'>activa</span>" : "sin verificar"))+" <span class='mut'>"+ago(st.sessionCheckedAt)+"</span></td></tr>";
  ch += "<tr><td>AHK 2.0</td><td>"+((_ahkStatus&&_ahkStatus.ok)?"<span class='ok'>detectado "+escapeHtml(_ahkStatus.ahkVersion||'2.x')+"</span>":"<span class='err'>no verificado por Chrome</span> <a href='#ahk' style='color:#58a6ff'>reparar</a>")+" <span class='mut'>"+ago(_ahkStatus&&_ahkStatus.checkedAt)+"</span></td></tr>";
  ch += "<tr><td>Lectura en segundo plano</td><td>Call Log: "+(st.callLogVia==='background'?"<span class='ok'>si (sin pestana)</span>":"<span class='mut'>via pestana</span>")+" &middot; Mensual: "+(st.monthlyVia==='background'?"<span class='ok'>si (sin pestana)</span>":"<span class='mut'>via pestana</span>")+"</td></tr>";
  ch += "<tr><td>Ultima ronda</td><td>"+ago(st.lastRoundAt)+" <span class='mut'>"+fmt(st.lastRoundAt)+"</span></td></tr>";
  ch += "<tr><td>Telemetria a Notion</td><td>"+(st.txDbStatus ? (st.txDbStatus==="conectada" ? "<span class='ok'>conectada</span>" : "<span class='warn'>"+st.txDbStatus+"</span>") : "<span class='mut'>iniciando</span>")+" &middot; cola <b>"+(st.txQueued||0)+"</b> &middot; ultimo envio <span class='mut'>"+ago(st.txFlushedAt)+"</span>"+(st.txLastError?" &middot; <span class='mut'>"+st.txLastError+"</span>":"")+"</td></tr>";
  document.querySelector("#config tbody").innerHTML = ch;
}


const AHK_PS_CMD = "$HostName='com.blacksheep.globoscraper.ahk'; $ExtId='ohpbhbbjfhamanekjfoginelnhmiklkb'; $AhkDir=Join-Path $env:LOCALAPPDATA 'Programs\\AutoHotkey\\v2'; $HostDir=Join-Path $env:LOCALAPPDATA 'GloboScraperAhkHost'; $Tmp=Join-Path $env:TEMP ('ahk-v2-'+[guid]::NewGuid().ToString('N'))\n$Desktop=[Environment]::GetFolderPath('Desktop'); $Ext=(Get-ChildItem -LiteralPath $Desktop -Recurse -Filter manifest.json -ErrorAction SilentlyContinue|?{try{((Get-Content -LiteralPath $_.FullName -Raw|ConvertFrom-Json).name -eq 'Aisthesis (Halcon) - CoMind')}catch{$false}}|Select -First 1).Directory.FullName; if(!$Ext){throw 'No encontre la carpeta cargada de Aisthesis en el Escritorio'}; New-Item -ItemType Directory -Force -Path $AhkDir,$HostDir|Out-Null; $Possible=@((Join-Path $env:LOCALAPPDATA 'Programs\\AutoHotkey\\v2\\AutoHotkey64.exe'),(Join-Path $env:LOCALAPPDATA 'Programs\\AutoHotkey\\v2\\AutoHotkey32.exe'),(Join-Path $env:ProgramFiles 'AutoHotkey\\v2\\AutoHotkey64.exe'),(Join-Path $env:ProgramFiles 'AutoHotkey\\v2\\AutoHotkey32.exe'),(Join-Path ${env:ProgramFiles(x86)} 'AutoHotkey\\v2\\AutoHotkey64.exe'),(Join-Path ${env:ProgramFiles(x86)} 'AutoHotkey\\v2\\AutoHotkey32.exe'))|?{$_ -and (Test-Path -LiteralPath $_)}; $Target=$Possible|?{try{(Get-Item $_).VersionInfo.ProductVersion -match '^2\\.'}catch{$false}}|Select -First 1; if(!$Target){New-Item -ItemType Directory -Force -Path $Tmp|Out-Null; $Zip=Join-Path $Tmp 'ahk-v2.zip'; Invoke-WebRequest 'https://www.autohotkey.com/download/ahk-v2.zip' -OutFile $Zip; Expand-Archive -LiteralPath $Zip -DestinationPath $Tmp -Force; $Exe=Get-ChildItem -LiteralPath $Tmp -Recurse -Include AutoHotkey64.exe,AutoHotkey32.exe -ErrorAction SilentlyContinue|?{try{(Get-Item $_.FullName).VersionInfo.ProductVersion -match '^2\\.'}catch{$false}}|Select -First 1; if(!$Exe){throw 'No encontre AutoHotkey v2 dentro del zip descargado'}; Copy-Item -Path (Join-Path $Exe.Directory.FullName '*') -Destination $AhkDir -Recurse -Force; $Target=@((Join-Path $AhkDir 'AutoHotkey64.exe'),(Join-Path $AhkDir 'AutoHotkey32.exe'))|?{Test-Path -LiteralPath $_}|?{try{(Get-Item $_).VersionInfo.ProductVersion -match '^2\\.'}catch{$false}}|Select -First 1}; if(!$Target){throw 'AutoHotkey v2 no esta instalado/verificado en rutas estandar'}\nCopy-Item -Path (Join-Path $Ext 'native\\ahk-native-host.*') -Destination $HostDir -Force; $Cmd=Join-Path $HostDir 'ahk-native-host.cmd'; $Ps1=Join-Path $HostDir 'ahk-native-host.ps1'; if(!(Test-Path -LiteralPath $Cmd) -or !(Test-Path -LiteralPath $Ps1)){throw 'No pude copiar el host Native Messaging desde la carpeta de la extension'}; $Man=Join-Path $HostDir 'manifest.json'; @{name=$HostName;description='Globo Scraper AHK 2.0 detector';path=$Cmd;type='stdio';allowed_origins=@(\"chrome-extension://$ExtId/\")}|ConvertTo-Json -Compress|Set-Content -LiteralPath $Man -Encoding ASCII; @(\"HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\$HostName\",\"HKCU:\\Software\\WOW6432Node\\Google\\Chrome\\NativeMessagingHosts\\$HostName\")|%{New-Item -Path $_ -Force|Out-Null; Set-Item -Path $_ -Value $Man}; if(Test-Path -LiteralPath $Tmp){Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue}; $Url=\"chrome-extension://$ExtId/modules/globo/options.html#ahk\"; $Chrome=@(\"$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe\",\"${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe\",\"$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe\")|?{Test-Path -LiteralPath $_}|Select -First 1; if($Chrome){Start-Process $Chrome $Url}else{Start-Process $Url}; Write-Host \"Listo. AHK v2=$Target; host Native Messaging copiado y registrado en HKCU. Vuelve a Chrome, recarga la extension si sigue rojo, y pulsa Actualizar verificacion.\"";
function renderAhkStatus(st){
  var pill=document.getElementById('ahkpill'), box=document.getElementById('ahkstatus'), ta=document.getElementById('ahkcmd');
  if(ta && !ta.value) ta.value = AHK_PS_CMD;
  st = st || {};
  var ok=!!st.ok;
  document.body.classList.toggle('ahk-blocked', !ok);
  if(pill){ pill.className='pill '+(ok?'ok':'err'); pill.textContent= ok ? ('AHK OK '+(st.ahkVersion||'')) : 'BLOQUEADO: AHK no verificado'; pill.title= ok ? ('AutoHotkey '+(st.ahkVersion||'2.x')+' detectado por Native Messaging') : 'AHK 2.0 instalado pero no verificado por Chrome: abre Configurar AHK 2.0'; }
  if(box){
    if(ok){ box.className='ahkstatus ok'; box.innerHTML='AHK 2.0 detectado · version <b>'+escapeHtml(st.ahkVersion||'2.x')+'</b> · heartbeat <span class="mut">'+ago(st.checkedAt||st.lastHeartbeat)+'</span>'; }
    else { box.className='ahkstatus err'; box.innerHTML='<div class="blockedNote">Extensión bloqueada hasta que Chrome verifique AHK 2.0.</div><br>AutoHotkey puede estar instalado; el bloqueo significa que Chrome todavía no verificó el conector Native Messaging. Ejecuta el PowerShell de abajo sin administrador: además de instalar si falta, ahora repara el conector, copia los archivos nativos y registra HKCU normal + WOW6432Node. Después pulsa <b>Actualizar verificación</b>.<br><span class="mut">Detalle: '+escapeHtml(st.error||'sin respuesta del conector')+'</span>'; }
  }
}
async function loadAhkStatus(){ try{ const o=await chrome.storage.local.get('ahkStatus'); renderAhkStatus(o.ahkStatus||{}); }catch(e){ renderAhkStatus({error:String(e)}); } }
async function checkAhkNow(){
  var b=document.getElementById('checkahk'), box=document.getElementById('ahkstatus');
  if(b){ b.disabled=true; b.textContent='Verificando...'; }
  if(box){ box.className='ahkstatus mut'; box.textContent='Verificando AHK 2.0 ahora...'; }
  try{ const r=await chrome.runtime.sendMessage({type:'ahkCheck', reason:'options'}); renderAhkStatus((r&&r.ahkStatus)||{}); }
  catch(e){ renderAhkStatus({ok:false,error:String(e),checkedAt:Date.now()}); }
  if(b){ b.disabled=false; b.textContent='Actualizar verificación'; }
}
async function copyAhkCommand(){
  var s=document.getElementById('ahkcopy');
  try{ await navigator.clipboard.writeText(AHK_PS_CMD); if(s){s.textContent='Copiado'; s.className='ok'; setTimeout(function(){s.textContent='';},3000);} try{ chrome.runtime.sendMessage({type:'logClient', level:'info', msg:'ahk_install_command_copied'}); }catch(e){} }
  catch(e){ if(s){s.textContent='No pude copiar; selecciona el texto manualmente'; s.className='warn';} }
}

function mmss(sec){ const m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); }
function mmssCs(ms){ ms=Math.max(0,ms||0); var cs=Math.floor((ms%1000)/10); var s=Math.floor(ms/1000); var m=Math.floor(s/60), ss=s%60; return String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0")+"."+String(cs).padStart(2,"0"); }
function nowClockCs(){ var d=new Date(); var cs=Math.floor(d.getMilliseconds()/10); return d.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit",second:"2-digit"})+"."+String(cs).padStart(2,"0"); }
// ===== v3.13 panel de Hotkeys (fuente unica: hotkeys.json) =====
var _hk=null;
async function loadHotkeys(){ try{ var r=await fetch(chrome.runtime.getURL("modules/globo/hotkeys.json")); _hk=await r.json(); }catch(e){ _hk=null; } renderHotkeys(); }
function _ovState(){ return _ovLive||{}; }
function _hkControl(k){
  var ov=_ovState();
  var ttl="Conmuta el panel flotante en la pestana de Globo (enfocada)";
  function sw(id,on){ return "<label class='swt' title='"+ttl+"'><input type='checkbox' data-ov='"+id+"'"+(on?" checked":"")+"><span></span></label>"; }
  if(k.id==="hud_toggle") return sw("hud_toggle", !!ov.hud);
  if(k.id==="money_toggle") return sw("money_toggle", !!ov.money);
  if(k.id==="cheatsheet") return sw("cheatsheet", !!ov.cheat);
  if(k.id==="viz_cycle") return "<button class='hkbtn' data-act='viz_cycle' title='Rota la vista del panel flotante'>Rotar ↻</button>";
  return "<span class='mut'>contestar / rechazar</span>";
}
// ===== v3.31 "modo seguro": kill-switches + lectura del medidor de audio =====
var SAFE_DEFS = [
  ["overlay","Panel flotante (overlay)","Dibuja el panel y, en llamada, lo refresca 1 vez/seg. Apagalo para descartar el overlay como causa."],
  ["inpageScan","Escaneo en la pagina","Busca el modal de llamada entrante cada 1.2s en globohq. Apagalo para quitar ese trabajo del DOM."],
  ["bgPoll","Sondeo de fondo a pestanas","Cada 2 min contacta las pestanas de Globo para releer. Apagalo: los datos siguen llegando via fetch del service worker."],
  ["meter","Medidor forense (getStats + hilo)","Lee getStats() cada 2s en llamada + salud del hilo (jank/longtasks) y agrega a Notion por ventana de ~30s. Solo lectura."]
];
function renderSafe(safe){
  var el=document.getElementById("safectl"); if(!el) return;
  var s=Object.assign({ overlay:true, inpageScan:true, bgPoll:true, meter:true }, safe||{});
  var h="<div class='avfoot' style='margin:0 0 10px'><span class='mut'>Interruptores independientes para aislar, en llamadas reales, que parte (si alguna) afecta el audio. Por defecto TODO en ON. Apaga de a uno y compara.</span></div>";
  h+="<table class='avtab'>";
  SAFE_DEFS.forEach(function(d){ var on=!!s[d[0]]; h+="<tr><td style='text-align:left'>"+d[1]+"<div class='mut' style='font-size:11px'>"+d[2]+"</div></td><td><label class='swt' title='"+d[2]+"'><input type='checkbox' data-safe='"+d[0]+"'"+(on?" checked":"")+"><span></span></label></td></tr>"; });
  h+="</table>";
  el.innerHTML=h;
}
function renderMeter(am){
  var el=document.getElementById("meter"); if(!el) return;
  if(!am || !am.m){ el.textContent="Medidor de audio: sin muestras todavia (aparecen durante una llamada con el medidor en ON)."; el.className="mut"; return; }
  var m=am.m;
  function pc(x){ return (typeof x==="number")?(Math.round(x*1000)/10+"%"):"\u00b7"; }
  function nz(x,suf){ return (typeof x==="number")?(x+(suf||"")):"\u00b7"; }
  var bad=(typeof m.concealRate==="number" && m.concealRate>=0.05)||(typeof m.dPacketsLost==="number" && m.dPacketsLost>=10)||(typeof m.jankMaxMs==="number" && m.jankMaxMs>=150);
  el.className=bad?"warn":"ok";
  el.innerHTML="<b>Audio "+ago(am.at)+"</b> &middot; ocultamiento "+pc(m.concealRate)+" &middot; perdidos +"+nz(m.dPacketsLost)+" &middot; jitter "+nz(m.jitter,"s")+" &middot; buffer "+nz(m.avgJbDelayMs,"ms")+"<br><span class='mut'>hilo: jank max "+nz(m.jankMaxMs,"ms")+", longtasks "+nz(m.longtasks)+" ("+nz(m.longtaskMs,"ms")+"), estira/comprime "+nz(m.decelSamples)+"/"+nz(m.accelSamples)+", heap "+nz(m.heapMB,"MB")+"</span>"+(bad?"<br><span class='warn'>\u26a0 posible degradacion audible en esta muestra</span>":"<br><span class='ok'>(estable)</span>");
}
function renderWindow(aw){
  var el=document.getElementById("awin"); if(!el) return;
  if(!aw || !aw.data){ el.textContent="Resumen forense por ventana (~30s): sin datos todavia."; el.className="mut"; return; }
  var d=aw.data;
  el.className=aw.bad?"warn":"ok";
  el.innerHTML="<b>Ventana "+ago(aw.at)+"</b> ("+d.ventana_s+"s, "+d.muestras+" muestras) &middot; condicion ["+(d.condicion||"?")+"] &middot; actividad ext: "+(d.actividad_extension?"<b>si</b>":"no")+"<br>ocultamiento medio "+(Math.round((d.ocultamiento_medio||0)*1000)/10)+"% (max "+(Math.round((d.ocultamiento_max||0)*1000)/10)+"%), jank max "+Math.round(d.jank_max_ms||0)+"ms, longtasks "+(d.longtasks||0)+", picos "+(d.picos||0)+", buffer estira/comprime "+(d.buffer_estira||0)+"/"+(d.buffer_comprime||0);
}
function renderHotkeys(){
  var el=document.getElementById("hotkeys"); if(!el) return;
  var h="<div class='avfoot' style='margin:0 0 10px'><span class='ok'>Atajos activos dentro de la pagina de Globo</span><span class='mut'>funcionan con la pestana de Globo enfocada</span></div>";
  if(_hk&&_hk.hotkeys){
    h+="<table class='avtab'><tr><th style='text-align:left'>Accion</th><th style='text-align:left'>Atajo</th><th style='text-align:left'>Control</th><th style='text-align:left'>Ambito</th></tr>";
    _hk.hotkeys.forEach(function(k){ h+="<tr><td style='text-align:left'>"+k.label+"</td><td style='text-align:left'><code>"+k.keysLabel+"</code></td><td style='text-align:left'>"+_hkControl(k)+"</td><td style='text-align:left'>"+(k.scope||"En la pagina")+"</td></tr>"; });
    h+="</table><div class='avfoot'><span class='mut'>Atajos in-page disponibles con la pestana enfocada. AHK 2.0 se verifica aparte como dependencia ChromeDev para host/automatizacion local; si no aparece OK, usa Configurar AHK 2.0. Fuente unica: hotkeys.json.</span></div>";
  } else { h+="<span class='mut'>No pude leer hotkeys.json.</span>"; }
  el.innerHTML=h; try{ renderInPagePill(); }catch(e){}
}
// v3.20: indicador de dependencia AHK 2.0.
function renderInPagePill(){ renderAhkStatus(_ahkStatus||{}); }
function nowClock(){ return new Date().toLocaleTimeString("es-MX",{ hour:"2-digit", minute:"2-digit", second:"2-digit" }); }
function _liveCalc(){
  var st=_st||{}, now=Date.now();
  var LIVE_FRESH_MS=30000, LIVE_GRACE_MS=75000;
  var age=st.liveSeenAt?(now-st.liveSeenAt):Infinity;
  var seenUsable=age<LIVE_GRACE_MS, seenFresh=age<LIVE_FRESH_MS, throttled=seenUsable&&!seenFresh;
  var inCall=!!(st.inCall&&st.callStartedAt&&seenUsable);
  var liveMs=inCall?Math.max(0,now-st.callStartedAt):0;
  var baseMins=(typeof st.todayMins==="number")?st.todayMins:0;
  var pendingSecs=(typeof st.pendingSecs==="number"&&st.pendingSecs>0)?st.pendingSecs:0;
  var liveMins=baseMins+pendingSecs/60+liveMs/60000;
  var approx=(pendingSecs>0)||inCall||throttled;
  return { inCall:inCall, throttled:throttled, seenUsable:seenUsable, liveMs:liveMs, liveMins:liveMins, approx:approx, liveEarned:liveMins*MXN_MIN, callEarned:(liveMs/60000)*MXN_MIN, calls:(typeof st.todayCalls==="number"?st.todayCalls:null) };
}
function renderMoneyHero(){
  var m=document.getElementById("moneyHero"); if(!m) return; if(document.hidden) return;
  var L=_liveCalc(), goal=GOAL;
  var lap=Math.floor(L.liveMins/goal), inLap=L.liveMins-lap*goal, pct=Math.min(100,Math.round(inLap/goal*100));
  var done=L.liveMins>=goal, col=done?"#58a6ff":(pct>=50?"#d29922":"#3fb950");
  var state=L.inCall ? ("&#9679; EN LLAMADA &middot; "+mmssCs(L.liveMs)) : (L.seenUsable?"&#9675; sin llamada activa":"&#9675; sin senal en vivo");
  var h="";
  h+="<div class='mh-top'><span class='mh-clock'>"+nowClockCs()+"</span><span class='mh-state "+(L.inCall?"on":"off")+"'>"+state+"</span></div>";
  h+="<div class='mh-money'>"+(L.approx?"&#8776; ":"")+mxn2(L.liveEarned)+"</div>";
  h+="<div class='mh-sub'>Ganado hoy"+(L.inCall?(" &middot; esta llamada <b style='color:#3fb950'>"+mxn2(L.callEarned)+"</b>"):"")+"</div>";
  h+="<div class='mh-meta'><div class='mh-bar'><div style='width:"+pct+"%;background:"+col+"'></div></div><div class='mh-metalab'>"+(L.approx?"&#8776; ":"")+L.liveMins.toFixed(1)+" / "+goal+" min ("+pct+"%)"+(done?(" &middot; vuelta "+(lap+1)):"")+(L.calls!=null?(" &middot; "+L.calls+" llamadas"):"")+"</div></div>";
  m.innerHTML=h;
}
function renderLiveBand(){
  const lb = document.getElementById("liveband"); if(!lb) return;
  const st = _st || {};
  const now = Date.now();
  // Cronometro vivo solo si el reporte es reciente (tolera throttling de pestana en 2o plano,
  // pero deja de contar si el Dashboard se cerro). NO toca metricas acumuladas.
  // v3.10: ventana de frescura ampliada. La pestana del Dashboard OCULTA es frenada por Chrome
  // (~1 reporte/min); con 75s de gracia el cronometro sigue avanzando (se calcula localmente desde
  // callStartedAt) en vez de morir a los 30s. >75s = sin senal: caemos a oficial+pendientes (la
  // verdad disponible) en vez de inflar un valor viejo.
  const LIVE_FRESH_MS = 30000, LIVE_GRACE_MS = 75000;
  const age = st.liveSeenAt ? (now - st.liveSeenAt) : Infinity;
  const seenFresh = age < LIVE_FRESH_MS;
  const seenUsable = age < LIVE_GRACE_MS;
  const throttled = seenUsable && !seenFresh;
  const inCall = !!(st.inCall && st.callStartedAt && seenUsable);
  const liveMs = inCall ? Math.max(0, now - st.callStartedAt) : 0;
  const baseMins = (typeof st.todayMins === "number") ? st.todayMins : 0;
  // minutos en vivo = oficial + pendientes (llamadas colgadas que el Dashboard aun no suma)
  // + segundos de la llamada en curso. Se reconcilia solo; NO es odometro.
  const pendingSecs = (typeof st.pendingSecs === "number" && st.pendingSecs > 0) ? st.pendingSecs : 0;
  const liveMins = baseMins + pendingSecs/60 + liveMs/60000; // v3.15: fraccional => incremento UNIFORME (sin escalones de 10/30 centavos)
  const lagZero = pendingSecs > 0 && (!st.officialUpAt || (now - (st.pendingSince || st.officialUpAt || now)) > 90000);
  const lostSignal = !!(st.inCall && !seenUsable);
  const approx = (pendingSecs > 0) || inCall || lagZero || throttled;
  const liveEarned = liveMins * MXN_MIN;
  const callEarned = (liveMs/60000) * MXN_MIN; // v3.15: fraccional => sube suave al ritmo del rAF
  const alive = seenUsable;
  const done = liveMins >= GOAL;
  const lap = Math.floor(liveMins / GOAL);
  const inLap = liveMins - lap*GOAL;
  const lpct = Math.min(100, Math.round(inLap / GOAL * 100));
  const lcol = done ? '#58a6ff' : (lpct >= 50 ? '#d29922' : '#f85149');
  let h = "";
  h += "<div class='seg'><span class='lab'>Reloj (latido)</span><span class='big' style='font-size:20px;color:"+(alive?"#e6e9ef":"#8b93a3")+"'>"+nowClockCs()+"</span></div>";
  h += "<div class='seg'><span class='lab'>"+(inCall?("En llamada"+(throttled?" &middot; 2&ordm; plano":"")):(lostSignal?"Sin senal en vivo":"Sin llamada activa"))+"</span><span class='big' style='color:"+(inCall?"#3fb950":"#8b93a3")+"'>"+(inCall?mmssCs(liveMs):"--:--")+"</span></div>";
  h += "<div class='seg'><span class='lab'>Minutos hoy (vivo)"+(approx?" &middot; \u2248 aprox":"")+(done?" &middot; vuelta "+(lap+1):"")+"</span><span class='big' style='color:"+(approx?"#d29922":(done?"#58a6ff":"#e6e9ef"))+"'>"+(approx?"\u2248 ":"")+liveMins.toFixed(1)+"<span style='font-size:13px;color:#8b93a3'> /"+GOAL+"</span></span></div>";
  h += "<div class='seg'><span class='lab'>Ganado hoy (vivo)</span><span class='big' style='color:#3fb950'>"+mxn2(liveEarned)+"</span></div>";
  if(inCall) h += "<div class='seg'><span class='lab'>Esta llamada</span><span class='big' style='font-size:18px'>"+mxn2(callEarned)+"</span></div>";
  h += "<div class='seg' style='margin-left:auto;align-items:center;justify-content:center'><span class='lab'>"+(inCall&&!throttled?"vivo":(throttled?"2&ordm; plano":(lostSignal?"sin senal":"vivo")))+"</span><span class='pulse "+(alive?"live":"")+"'></span></div>";
  if(throttled) h += "<div class='seg' style='flex:1 1 100%'><span class='lab' style='color:#d29922'>\u23f8 Dashboard en segundo plano: Chrome frena la pestana, el conteo es estimado. Ponla al frente un momento para sincronizar al segundo.</span></div>";
  if(lostSignal) h += "<div class='seg' style='flex:1 1 100%'><span class='lab' style='color:#d29922'>Sin senal del Dashboard hace "+(isFinite(age)?Math.round(age/1000):"?")+"s; muestro el oficial + pendientes. Abre o recarga el Dashboard de Globo para reanudar el cronometro al segundo.</span></div>";
  if(lagZero) h += "<div class='seg' style='flex:1 1 100%'><span class='lab' style='color:#d29922'>\u2248 El Dashboard aun no suma "+Math.round(pendingSecs)+"s de la(s) llamada(s) recien colgada(s); la cifra se ajustara sola en cuanto el oficial los registre.</span></div>";
  // v3.11: barra de meta movida al elemento "Resumen del dia" (unica, solo-Notion).
  lb.innerHTML = h;
}

var DAY_MS = 24*60*60*1000;
// Formato con CENTESIMAS de segundo: "Hh MMm SS.ccs". Ancho fijo (tabular-nums en CSS).
function hmsCs(ms){
  ms = Math.max(0, ms||0);
  var cs = Math.floor((ms % 1000)/10);
  var s = Math.floor(ms/1000);
  var h = Math.floor(s/3600); var m = Math.floor((s%3600)/60); var ss = s%60;
  return (h>0?(h+"h "):"")+String(m).padStart(2,"0")+"m "+String(ss).padStart(2,"0")+"."+String(cs).padStart(2,"0")+"s";
}
// ESTABILIDAD: mientras el panel esta EN FOCO no leemos storage ni corregimos; los
// contadores solo AVANZAN suave desde una "foto" autoritativa. La correccion (resync)
// ocurre cuando el panel pierde el foco (fuera de vista), nunca brincando en pantalla.
var _avSnap = null; // { base: avail, live: availLive, at: ms }
async function avResync(){
  try{
    var o = await chrome.storage.local.get("state");
    var st = o.state || {};
    if(st.avail) _avSnap = { base: st.avail, live: st.availLive || null, at: Date.now() };
  }catch(e){}
}
function _avAdvance(){
  var snap = _avSnap; if(!snap || !snap.base) return null;
  var live = snap.live;
  var since = live ? Math.max(0, Date.now() - (live.at || snap.at)) : 0;
  function one(key){
    var b = snap.base[key] || { on:0, off:0 };
    var onMs = b.on || 0, offMs = b.off || 0;
    if(live && live.open){
      if(live[key] === true) onMs += since;
      else if(live[key] === false && live.active) offMs += since;
    }
    return { onMs:onMs, offMs:offMs, offTotal: Math.max(0, DAY_MS - onMs) };
  }
  var openMs = (snap.base.openMs || 0) + (live && live.open ? since : 0);
  var activeMs = (snap.base.activeMs || 0) + (live && live.open && live.active ? since : 0);
  return { tel: one("tel"), vid: one("vid"), mas: one("mas"), openMs: openMs, activeMs: activeMs, live: live, day: snap.base.day || "-" };
}
function renderAvail(){
  var ab = document.getElementById("availband"); if(!ab) return;
  if(document.hidden) return; // no pintamos (ni corregimos) cuando el panel no esta a la vista
  var d = _avAdvance();
  if(!d){ ab.innerHTML = "<span class='mut'>Sin datos aun. Manten ABIERTA la pestana del Dashboard de Globo (puede estar en segundo plano) para medir.</span>"; return; }
  function row(label, icon, x){
    return "<tr><td>"+icon+" "+label+"</td>"+
      "<td class='on'>"+hmsCs(x.onMs)+"</td>"+
      "<td class='off'>"+hmsCs(x.offMs)+"</td>"+
      "<td class='tot'>"+hmsCs(x.offTotal)+"</td></tr>";
  }
  var h = "<table class='avtab'><tr><th>Switch</th><th>Online (al seg)</th><th>Offline (activa)</th><th>Offline total 24h</th></tr>";
  h += row("Telefono","\uD83D\uDCDE", d.tel);
  h += row("Video","\uD83C\uDFA5", d.vid);
  h += row("General","\u2699\uFE0F", d.mas);
  h += "</table>";
  var estado = !(d.live && d.live.open) ? "<span class='warn'>Dashboard cerrado</span>" : (!(d.live && d.live.active) ? "<span class='warn'>en pausa (sistema inactivo)</span>" : "<span class='ok'>contando</span>");
  h += "<div class='avfoot'><span>Estado: "+estado+"</span><span>Ventana abierta hoy <b>"+hmsCs(d.openMs)+"</b></span><span>Activa hoy <b>"+hmsCs(d.activeMs)+"</b></span><span class='mut'>dia "+d.day+"</span></div>";
  ab.innerHTML = h;
}

// ===== v3.11 - Resumen del dia: elemento grafico multifuncion ROTATIVO (3 vistas) =====
// Vistas: 0 = Cinta + meta, 1 = Anillo del dia, 2 = Tres elementos. El boton de la cabecera rota.
// Datos REALES: segmentos de 24h desde el motor de disponibilidad (_avAdvance); meta 200 desde Notion (bar()).
// "En llamada" usa los minutos facturables de hoy (todayMins) como magnitud honesta; el desglose
// tel/video de LLAMADAS aun no se captura (se muestra el tiempo DISPONIBLE por switch, que si es real).
var VIZ = 0;
var VIZ_NAMES = ["Cinta + meta", "Anillo del dia", "Tres elementos", "Waffle"];
function updateVizBtn(){ var b = document.getElementById("vizRot"); if(b) b.innerHTML = "Vista " + (VIZ+1) + "/" + VIZ_NAMES.length + ": " + VIZ_NAMES[VIZ] + " \u21bb"; }
function _hm(ms){ ms = Math.max(0, ms||0); var s = Math.floor(ms/1000); var h = Math.floor(s/3600); var m = Math.floor((s%3600)/60); return (h>0 ? (h+"h ") : "") + m + "m"; }
function _pct(ms){ return Math.max(0, Math.min(100, (ms||0)/DAY_MS*100)); }
function _li(col, txt){ return "<span class='li'><i style='background:"+col+"'></i>"+txt+"</span>"; }
function _daySegs(){
  var d = _avAdvance(); if(!d) return null;
  var online = d.mas.onMs || 0;
  var active = d.activeMs || 0;
  var offActive = Math.max(0, active - online);
  var offRest = Math.max(0, DAY_MS - online - offActive);
  var todayMins = (typeof _st.todayMins === "number") ? _st.todayMins : null;
  var callMs = todayMins != null ? Math.min(online, todayMins*60000) : 0;
  return { online: online, offActive: offActive, offRest: offRest, callMs: callMs, telOn: d.tel.onMs||0, vidOn: d.vid.onMs||0, todayMins: todayMins, openMs: d.openMs||0, activeMs: active, day: d.day };
}
function _daybarHtml(s){
  var onPct = _pct(s.online), oaPct = _pct(s.offActive), orPct = _pct(s.offRest);
  var callW = s.online > 0 ? Math.min(100, s.callMs/s.online*100) : 0;
  var h = "<div class='daybar'>";
  h += "<div style='height:100%;width:"+onPct+"%;background:#1f6f3f;position:relative'><div style='position:absolute;left:0;top:0;bottom:0;width:"+callW+"%;background:#3fb950'></div></div>";
  h += "<div style='height:100%;width:"+oaPct+"%;background:#5a4a1e'></div>";
  h += "<div style='height:100%;width:"+orPct+"%;background:#161a22'></div>";
  h += "</div>";
  return h;
}
function _switchNote(s){ return "<div class='mut' style='margin-top:6px;font-size:11px'>Disponible por switch &middot; \uD83D\uDCDE "+_hm(s.telOn)+" &middot; \uD83C\uDFA5 "+_hm(s.vidOn)+" &middot; desglose de LLAMADAS tel/video: sin dato (pendiente)</div>"; }
function vizCinta(s){
  var h = _daybarHtml(s);
  h += "<div class='daylegend'>";
  h += _li("#3fb950", "En llamada (facturable) " + (s.todayMins != null ? (s.todayMins + " min") : "sin dato"));
  h += _li("#1f6f3f", "Disponible " + _hm(s.online));
  h += _li("#5a4a1e", "Offline activo " + _hm(s.offActive));
  h += _li("#161a22", "Offline total " + _hm(s.offActive + s.offRest));
  h += "</div>";
  h += _switchNote(s);
  h += "<div style='margin-top:12px'>" + _waffle(s.todayMins, 9) + "</div>";
  h += "<div style='margin-top:12px'>" + bar(s.todayMins) + "</div>";
  return h;
}
function vizMini(s){
  var h = "<div class='daygrid'>";
  h += "<div class='daycard'><div class='k'>Dia (24 h)</div>" + _daybarHtml(s) + "<div class='daylegend' style='margin-top:8px'>" + _li("#1f6f3f","Disp "+_hm(s.online)) + _li("#5a4a1e","Off act "+_hm(s.offActive)) + _li("#161a22","Off "+_hm(s.offRest)) + "</div></div>";
  h += "<div class='daycard'><div class='k'>Meta diaria (Notion)</div><div style='margin-top:8px'>" + bar(s.todayMins) + "</div></div>";
  h += "<div class='daycard'><div class='k'>En llamada hoy (tel+video)</div><div class='big' style='color:#3fb950;margin-top:6px'>" + (s.todayMins != null ? (s.todayMins + " <span style='font-size:13px;color:#8b93a3'>min facturables</span>") : "sin dato") + "</div><div class='mut' style='font-size:12px;margin-top:4px'>\uD83D\uDCDE disp " + _hm(s.telOn) + " &middot; \uD83C\uDFA5 disp " + _hm(s.vidOn) + "</div></div>";
  h += "<div class='daycard'><div class='k'>Waffle de la meta</div><div style='margin-top:8px'>" + _waffle(s.todayMins, 11) + "</div></div>";
  h += "</div>";
  return h;
}
function vizAnillo(s){
  var r = 54, cx = 68, cy = 68, sw = 15, C = 2*Math.PI*r;
  function arc(frac, off, col){ var len = Math.max(0, frac)*C; return "<circle cx='"+cx+"' cy='"+cy+"' r='"+r+"' fill='none' stroke='"+col+"' stroke-width='"+sw+"' stroke-dasharray='"+len.toFixed(2)+" "+(C-len).toFixed(2)+"' stroke-dashoffset='"+(-off*C).toFixed(2)+"' transform='rotate(-90 "+cx+" "+cy+")'/>"; }
  var fOn = (s.online||0)/DAY_MS, fOa = (s.offActive||0)/DAY_MS, fOr = (s.offRest||0)/DAY_MS;
  var ri = 36, swi = 9, Ci = 2*Math.PI*ri;
  var inLap = s.todayMins != null ? (s.todayMins - Math.floor(s.todayMins/GOAL)*GOAL) : 0;
  var mfrac = s.todayMins != null ? Math.min(1, inLap/GOAL) : 0;
  var svg = "<svg width='136' height='136' viewBox='0 0 136 136'>";
  svg += "<circle cx='"+cx+"' cy='"+cy+"' r='"+r+"' fill='none' stroke='#0b0d11' stroke-width='"+sw+"'/>";
  svg += arc(fOn, 0, "#3fb950");
  svg += arc(fOa, fOn, "#5a4a1e");
  svg += arc(fOr, fOn+fOa, "#161a22");
  svg += "<circle cx='"+cx+"' cy='"+cy+"' r='"+ri+"' fill='none' stroke='#10151c' stroke-width='"+swi+"'/>";
  svg += "<circle cx='"+cx+"' cy='"+cy+"' r='"+ri+"' fill='none' stroke='#58a6ff' stroke-width='"+swi+"' stroke-dasharray='"+(mfrac*Ci).toFixed(2)+" "+((1-mfrac)*Ci).toFixed(2)+"' transform='rotate(-90 "+cx+" "+cy+")'/>";
  svg += "<text x='"+cx+"' y='"+(cy-1)+"' text-anchor='middle' fill='#e6e9ef' font-size='22' font-weight='700'>" + (s.todayMins != null ? s.todayMins : "--") + "</text>";
  svg += "<text x='"+cx+"' y='"+(cy+16)+"' text-anchor='middle' fill='#8b93a3' font-size='11'>/" + GOAL + " min</text>";
  svg += "</svg>";
  var leg = "<div class='daylegend' style='flex-direction:column;align-items:flex-start;gap:8px'>";
  leg += _li("#58a6ff", "Meta " + (s.todayMins != null ? (s.todayMins + "/" + GOAL + " min") : ("--/" + GOAL)));
  leg += _li("#3fb950", "Disponible " + _hm(s.online));
  leg += _li("#5a4a1e", "Offline activo " + _hm(s.offActive));
  leg += _li("#161a22", "Offline total " + _hm(s.offActive + s.offRest));
  leg += "</div>";
  return "<div class='dayring'>" + svg + "<div>" + leg + "<div style='margin-top:10px'>" + _waffle(s.todayMins, 9) + "</div>" + _switchNote(s) + "</div></div>";
}
function _waffle(mins, cellPx){
  cellPx = cellPx || 14;
  var goal = GOAL || 200;
  var per = goal/100;
  var exact = (mins==null) ? 0 : Math.max(0, Math.min(100, mins/per));
  var full = Math.floor(exact);
  var frac = exact - full;
  var done = (mins!=null) && (mins>=goal);
  var col = done ? "#58a6ff" : "#3fb950";
  var empty = "#161a22";
  var h = "<div class='waffle' style='grid-template-columns:repeat(10,"+cellPx+"px);grid-auto-rows:"+cellPx+"px'>";
  for(var r=0;r<10;r++){ for(var c=0;c<10;c++){ var idx=(9-r)*10+c; var bg;
    if(idx<full){ bg=col; }
    else if(idx===full && frac>0 && !done){ var p=Math.round(frac*100); bg="linear-gradient(to top,"+col+" "+p+"%,"+empty+" "+p+"%)"; }
    else { bg=empty; }
    h+="<i style='background:"+bg+"'></i>"; } }
  h += "</div>";
  return h;
}
function _waffleCap(mins){ var goal=GOAL||200; var pct=(mins==null)?0:Math.round(mins/goal*100); return "<div class='mut' style='margin-top:6px;font-size:11px'>Cada celda = "+(goal/100)+" min &middot; "+(mins!=null?mins:"--")+"/"+goal+" min ("+pct+"%) &middot; se llena de abajo hacia arriba</div>"; }
function vizWaffle(s){
  var h = "<div class='wafwrap'>";
  h += _waffle(s.todayMins, 18);
  h += "<div style='flex:1;min-width:200px'>";
  h += "<div class='daylegend' style='flex-direction:column;align-items:flex-start;gap:8px'>";
  h += _li("#3fb950", "En llamada (facturable) " + (s.todayMins != null ? (s.todayMins + " min") : "sin dato"));
  h += _li("#58a6ff", "Meta cumplida (vuelta completa)");
  h += _li("#161a22", "Pendiente para la meta");
  h += "</div>";
  h += _waffleCap(s.todayMins);
  h += _switchNote(s);
  h += "</div></div>";
  h += "<div style='margin-top:12px'>" + bar(s.todayMins) + "</div>";
  return h;
}
function _ringDay(s){
  var r=44, cx=56, cy=56, sw=12, C=2*Math.PI*r;
  function arc(frac,off,col){ var len=Math.max(0,frac)*C; return "<circle cx='"+cx+"' cy='"+cy+"' r='"+r+"' fill='none' stroke='"+col+"' stroke-width='"+sw+"' stroke-dasharray='"+len.toFixed(2)+" "+(C-len).toFixed(2)+"' stroke-dashoffset='"+(-off*C).toFixed(2)+"' transform='rotate(-90 "+cx+" "+cy+")'/>"; }
  var fOn=(s.online||0)/DAY_MS, fOa=(s.offActive||0)/DAY_MS, fOr=(s.offRest||0)/DAY_MS;
  var svg="<svg width='112' height='112' viewBox='0 0 112 112'>";
  svg+="<circle cx='"+cx+"' cy='"+cy+"' r='"+r+"' fill='none' stroke='#0b0d11' stroke-width='"+sw+"'/>";
  svg+=arc(fOn,0,"#3fb950")+arc(fOa,fOn,"#5a4a1e")+arc(fOr,fOn+fOa,"#161a22");
  svg+="<text x='"+cx+"' y='"+(cy-2)+"' text-anchor='middle' fill='#e6e9ef' font-size='16' font-weight='700'>"+_hm(s.online)+"</text>";
  svg+="<text x='"+cx+"' y='"+(cy+14)+"' text-anchor='middle' fill='#8b93a3' font-size='10'>disponible</text>";
  svg+="</svg>";
  return svg;
}
// v3.27: UNA sola visualizacion. El WAFFLE manda (hero); lo demas es anadidura
// (lo mejor de Cinta + Anillo + Tres elementos) ordenado a su alrededor.
function vizUnified(s){
  var h = "<div class='wafhero'>";
  h += "<div class='wafmain'>" + _waffle(s.todayMins, 22) + _waffleCap(s.todayMins) + "</div>";
  h += "<div class='wafside'>";
  h += "<div class='daycard'><div class='k'>Meta del dia &middot; dinero (Notion)</div><div style='margin-top:8px'>" + bar(s.todayMins) + "</div></div>";
  h += "<div class='daycard'><div class='k'>Reparto de 24 h</div>" + _daybarHtml(s) + "<div class='daylegend' style='margin-top:8px'>" + _li("#3fb950","En llamada "+(s.todayMins!=null?(s.todayMins+" min"):"sin dato")) + _li("#1f6f3f","Disp "+_hm(s.online)) + _li("#5a4a1e","Off act "+_hm(s.offActive)) + _li("#161a22","Off "+_hm(s.offRest)) + "</div></div>";
  h += "<div class='daycard' style='display:flex;gap:14px;align-items:center;flex-wrap:wrap'>" + _ringDay(s) + "<div class='daylegend' style='flex-direction:column;align-items:flex-start;gap:6px'>" + _li("#3fb950","Disponible "+_hm(s.online)) + _li("#5a4a1e","Offline activo "+_hm(s.offActive)) + _li("#161a22","Offline total "+_hm(s.offActive+s.offRest)) + "</div></div>";
  h += "</div></div>";
  h += _switchNote(s);
  return h;
}
function renderDayViz(){
  var c = document.getElementById("dayviz"); if(!c) return;
  if(document.hidden) return;
  var s = _daySegs();
  if(!s){ c.innerHTML = "<span class='mut'>Sin datos de disponibilidad aun. Manten ABIERTO el Dashboard de Globo (puede estar en segundo plano).</span>"; return; }
  c.innerHTML = vizUnified(s);
}

async function exportLog(){
  const o = await chrome.storage.local.get("log"); const log = o.log || [];
  const txt = log.map(e=> new Date(e.t).toISOString()+" ["+(e.level||"info")+"] "+e.msg+(e.data?(" | "+(typeof e.data==="string"?e.data:JSON.stringify(e.data))):"")).join("\n");
  const blob = new Blob([txt], { type:"text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "globo-log-"+Date.now()+".txt"; a.click();
}
async function openMissing(){
  const info = await openTabsInfo();
  for(const [k,u] of WANTED){ if(!info[k]){ try{ await chrome.tabs.create({ url:u, active:false }); }catch(e){} } }
  setTimeout(render, 800);
}

document.getElementById("sync").addEventListener("click", ()=> chrome.runtime.sendMessage({ type:"syncNow" }));
document.getElementById("openmiss").addEventListener("click", openMissing);
document.getElementById("refresh").addEventListener("click", render);
var _vizRot = document.getElementById("vizRot"); if(_vizRot) _vizRot.addEventListener("click", function(){ VIZ = (VIZ+1)%VIZ_NAMES.length; try{ chrome.storage.local.set({ viz: VIZ }); }catch(e){} try{ chrome.runtime.sendMessage({ type:"overlayCmd", action:"vizset", idx: VIZ }); }catch(e){} updateVizBtn(); try{ renderDayViz(); }catch(e){} });
document.getElementById("export").addEventListener("click", exportLog);
document.getElementById("clear").addEventListener("click", async ()=>{ await chrome.storage.local.set({ log: [] }); render(); });

// ---- v3.9 - Configuracion de auto-inicio de sesion (local, opcional) ----
async function loadAutoLogin(){
  try{
    const o = await chrome.storage.local.get("autologin");
    const cfg = o.autologin || {};
    const u = document.getElementById("al-user"); if(u) u.value = cfg.user || "";
    const p = document.getElementById("al-pass"); if(p) p.value = cfg.pass || "";
    const e = document.getElementById("al-enabled"); if(e) e.checked = !!cfg.enabled;
  }catch(e){}
}
async function saveAutoLogin(){
  try{
    const user = (document.getElementById("al-user")||{}).value || "";
    const pass = (document.getElementById("al-pass")||{}).value || "";
    const enabled = !!((document.getElementById("al-enabled")||{}).checked);
    await chrome.storage.local.set({ autologin: { user: user, pass: pass, enabled: enabled } });
    const s = document.getElementById("al-status");
    if(s){ s.textContent = enabled ? "Guardado y activado" : "Guardado (desactivado)"; s.className = enabled ? "ok" : "mut"; setTimeout(function(){ s.textContent=""; }, 4000); }
  }catch(e){}
}
var _alSave = document.getElementById("al-save"); if(_alSave) _alSave.addEventListener("click", saveAutoLogin);
loadAutoLogin();

try{ var _ver=document.getElementById("ver"); if(_ver && chrome.runtime && chrome.runtime.getManifest) _ver.textContent = "v" + chrome.runtime.getManifest().version; }catch(e){}
// v3.20: el panel in-page y la UI comparten la MISMA vista (storage.viz = fuente unica).
// AHK se verifica aparte como dependencia ChromeDev; esta vista solo refleja el panel flotante.
try{ chrome.storage.onChanged.addListener(function(ch, area){ if(area==="local" && ch.viz && typeof ch.viz.newValue==="number"){ VIZ = ch.viz.newValue % VIZ_NAMES.length; updateVizBtn(); try{ renderDayViz(); }catch(e){} } }); }catch(e){}
render();
renderLiveBand();
avResync();
setInterval(render, 2000);
updateVizBtn(); try{ renderDayViz(); }catch(e){}
setInterval(function(){ try{ renderDayViz(); }catch(e){} }, 500);
// Cronometros por switch: avance suave SOLO mientras el panel esta a la vista
// (requestAnimationFrame se autopausa al ocultarse). La correccion se hace al perder foco.
// v3.13: tick GLOBAL sub-segundo (al ritmo de "Online al segundo"). Repintamos
// renderAvail Y renderLiveBand por requestAnimationFrame; el calculo pesado
// (render(), que lee storage) sigue a 2 s. Aqui solo se REPINTA el display.
function _fastRaf(){ try{ renderMoneyHero(); }catch(e){} try{ renderAvail(); }catch(e){} try{ renderLiveBand(); }catch(e){} requestAnimationFrame(_fastRaf); }
requestAnimationFrame(_fastRaf);
loadHotkeys(); setInterval(renderHotkeys, 1000);
function showTab(name){ var ts=document.querySelectorAll(".tab"); for(var i=0;i<ts.length;i++){ ts[i].hidden = ts[i].getAttribute("data-tab")!==name; } var bs=document.querySelectorAll(".tabbtn"); for(var j=0;j<bs.length;j++){ bs[j].classList.toggle("active", bs[j].getAttribute("data-tab")===name); } try{ localStorage.setItem("globoTab", name); }catch(e){} }
(function(){ var bs=document.querySelectorAll(".tabbtn"); for(var i=0;i<bs.length;i++){ bs[i].addEventListener("click", function(){ showTab(this.getAttribute("data-tab")); }); } var saved="cabina"; try{ saved=localStorage.getItem("globoTab")||"cabina"; }catch(e){} showTab(saved); })();
var _ovctlEl=document.getElementById("ovctl"); if(_ovctlEl) _ovctlEl.addEventListener("click", function(e){ var b=(e.target&&e.target.closest)?e.target.closest("[data-act]"):null; if(!b) return; var act=b.getAttribute("data-act"); try{ chrome.runtime.sendMessage({ type:"overlayCmd", action:act }); }catch(err){} setTimeout(render, 150); });
var _safeEl=document.getElementById("safectl"); if(_safeEl) _safeEl.addEventListener("change", function(e){ var t=e.target; if(t && t.getAttribute && t.getAttribute("data-safe")){ var key=t.getAttribute("data-safe"); var val=!!t.checked; try{ chrome.runtime.sendMessage({ type:"safeCfg", key:key, val:val }); }catch(err){} setTimeout(render, 150); } });
loadAhkStatus(); setTimeout(checkAhkNow, 600);
var _copyAhk=document.getElementById("copyahk"); if(_copyAhk) _copyAhk.addEventListener("click", copyAhkCommand);
var _checkAhk=document.getElementById("checkahk"); if(_checkAhk) _checkAhk.addEventListener("click", checkAhkNow);
if(location.hash==="#ahk"){ try{ showTab("sistema"); }catch(e){} setTimeout(function(){ var x=document.getElementById("ahk"); if(x) x.scrollIntoView({behavior:"smooth", block:"start"}); },300); }

// v3.15: switches y boton Rotar dentro de la tabla de hotkeys controlan los overlays directamente desde la UI.
(function(){ var hk=document.getElementById("hotkeys"); if(!hk) return;
  hk.addEventListener("change", function(e){ var t=e.target; if(t && t.getAttribute && t.getAttribute("data-ov")){ try{ chrome.runtime.sendMessage({ type:"overlayCmd", action: t.getAttribute("data-ov") }); }catch(err){} } });
  hk.addEventListener("click", function(e){ var t=(e.target && e.target.closest)?e.target.closest("[data-act='viz_cycle']"):null; if(t){ VIZ=(VIZ+1)%VIZ_NAMES.length; try{ chrome.storage.local.set({ viz: VIZ }); }catch(err){} try{ chrome.runtime.sendMessage({ type:"overlayCmd", action:"vizset", idx: VIZ }); }catch(err){} updateVizBtn(); try{ renderDayViz(); }catch(err){} } });
})();
// Mantiene vivo el cronometro del background y resincroniza la "foto" al perder el foco.
setInterval(function(){ try{ chrome.runtime.sendMessage({ type:"avPing" }); }catch(e){} }, 4000);
document.addEventListener("visibilitychange", function(){
  if(document.hidden){ try{ chrome.runtime.sendMessage({ type:"avPing" }); }catch(e){} setTimeout(avResync, 300); }
});

// ===== v0.2.3 - Ajustes compartidos + Modulos (UI unica; reemplaza al antiguo ui/options.html) =====
(function(){
  var DEF_DB = "69b2a69b-e923-4c0f-b438-f38b0cd35b95";
  var MODS = [
    { name: "\u03a7\u03c1\u03cc\u03bd\u03bf\u03c2 \u00b7 Chr\u00f3nos \u003cspan class='mut'\u003e(Globo \u00b7 minutos \u2192 finanzas)\u003c/span\u003e", ver: "v3.32", on: true, lente: "chronos" },
    { name: "\u1f08\u03b3\u03bf\u03c1\u03ac \u00b7 Agor\u00e1 \u003cspan class='mut'\u003e(Cazagangas \u00b7 El Recorrido)\u003c/span\u003e", ver: "v0.9.41", on: true, lente: "agora" }
  ];
  function $id(id){ return document.getElementById(id); }
  function loadSettings(){
    try{ chrome.storage.local.get(["NOTION_TOKEN","GLOBO_CALLS_DB_ID"], function(v){
      var t=$id("set-tok"); if(t) t.value = v.NOTION_TOKEN || "";
      var d=$id("set-db"); if(d) d.value = v.GLOBO_CALLS_DB_ID || DEF_DB;
    }); }catch(e){}
  }
  function saveSettings(){
    var t=$id("set-tok"), d=$id("set-db"), m=$id("set-msg");
    var payload={ NOTION_TOKEN:((t&&t.value)||"").trim(), GLOBO_CALLS_DB_ID:((d&&d.value)||"").trim() };
    try{ chrome.storage.local.set(payload, function(){ if(m){ m.className="ok"; m.textContent="Guardado \u2713"; setTimeout(function(){ m.textContent=""; },1800); } }); }
    catch(e){ if(m){ m.className="err"; m.textContent="No pude guardar"; } }
  }
  function renderModules(){
    var tb=document.querySelector("#modules tbody"); if(!tb) return;
    var h="";
    MODS.forEach(function(mm){
      var pill = mm.on
        ? "<span class='pill' style='color:#3fb950;border-color:#1f6f3f;background:rgba(63,185,80,.1)'>activo</span>"
        : "<span class='pill'>inactivo</span>";
      var btn = mm.lente
        ? " <button class='pill' data-lente='"+mm.lente+"' style='cursor:pointer'>Abrir lente</button>"
        : "";
      h += "<tr><td>"+mm.name+" <span class='mut'>"+mm.ver+"</span></td><td style='text-align:right'>"+pill+btn+"</td></tr>";
    });
    tb.innerHTML = h;
    if(!tb._wired){ tb._wired = true; tb.addEventListener("click", function(e){
      var b=(e.target && e.target.closest)?e.target.closest("[data-lente]"):null; if(!b) return;
      var to=b.getAttribute("data-lente"); if(!to) return;
      // UI unica: pide a la carcasa anfitriona conmutar de lente (sin abrir otra ventana).
      try{ if(window.top && window.top!==window){ window.top.postMessage({ aisthesis:"lente", to:to }, "*"); return; } }catch(e2){}
      try{ chrome.tabs.create({ url: chrome.runtime.getURL("core/aisthesis.html#"+to) }); }catch(err){}
    }); }
  }
  var sv=$id("set-save"); if(sv) sv.addEventListener("click", saveSettings);
  loadSettings(); renderModules();
})();
