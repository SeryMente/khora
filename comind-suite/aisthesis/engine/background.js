const NOTION = "https://api.notion.com/v1";
const NV = "2022-06-28";
const DB_ID = "69b2a69b-e923-4c0f-b438-f38b0cd35b95";
const TOKEN = "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";
const POLL_MIN = 2;
const LOG_CAP = 300;
const HIST_CAP = 240;
const RATE_USD = 0.14;
const TC = 17.28;
const MXN_MIN = RATE_USD * TC;
const STALE_MS = 7 * 60 * 1000;
const GOAL_DEFAULT = 200;
const GOAL_PROP = "Objetivo diario (min)";
// v3.8 - modelo de precision de minutos: pendingSecs = segundos de llamadas YA
// terminadas que el Dashboard oficial todavia no suma. liveMins = oficial +
// pendingSecs/60 + segundosEnVivo/60. Se reconcilia hacia abajo cuando el oficial
// sube. Sustituye al viejo odometro monotonico (que solo subia y sobreestimaba).
const PENDING_CAP_SEC = 3 * 60 * 60; // tope de seguridad para pendingSecs (3 h)
const LAG_WARN_MS = 90 * 1000;       // si el oficial no sube en 90s con pendientes => lag

// v3.10 - robustez del indicador en vivo
const REENTRY_GAP_MS = 2 * 60 * 1000;   // silencio del detector que ya tratamos como otra llamada
const ORPHAN_FINALIZE_MS = 90 * 1000;   // sin senal con llamada activa: el watchdog la cierra
const RESIDUAL_SEC = 45;                // resto <45s tras subir el oficial = redondeo: se limpia

// ===== v3.12 TELEMETRIA DE DESARROLLO (constantes) =====
const VERSION = "3.32";
const EXT_LABEL = "Globo Scraper";
const ACTIVITY_DB_TITLE = "Registro de actividad";
const TX_QUEUE_CAP = 2000;             // tope de la cola local de telemetria (no perder; si rebasa, descarta lo MAS viejo y lo cuenta)
const TX_BATCH = 12;                   // filas por volcado (respeta ~3/s de Notion)
const TX_GAP_MS = 300;                 // espaciado entre inserciones
const TX_FLUSH_GAP_MS = 15000;         // debounce: con actividad, vuelca al menos cada 15 s
const TX_BACKOFF_MAX = 5 * 60 * 1000;  // backoff exponencial maximo ante fallos de red
const TX_DEAD_CAP = 50;                // dead-letter para filas con error permanente (no bloquear la cola)
const TX_MODS = ["background","livecall","availability","session","dedup","notion","content","mainworld","options","system","dependency"];
const AHK_HOST = "com.blacksheep.globoscraper.ahk";
const AHK_NOTIFY_ID = "globo-ahk-required";
const AHK_NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;
const AHK_BLOCK_MESSAGE = "AHK 2.0 es obligatorio. Chrome no ha verificado el conector Native Messaging de AHK; repara/verifica antes de usar Globo Scraper.";

const WANTED = [
  { key:"dashboard", url:"https://globohq.com/linguist_dashboard/index", re:/linguist_dashboard/ },
  { key:"callLog",   url:"https://globohq.com/interpreter/calls_index",   re:/calls_index/ },
  { key:"monthly",   url:"https://globohq.com/interpreter/monthly_minutes", re:/monthly_minutes/ }
];

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function safeText(res){ try{ return (await res.text()).slice(0,300); }catch(e){ return ""; } }

async function getLog(){ const o = await chrome.storage.local.get("log"); return o.log || []; }
async function nextLogSeq(){ const o = await chrome.storage.local.get("logSeq"); const n = (o.logSeq || 0) + 1; await chrome.storage.local.set({ logSeq: n }); return n; }
async function logEvent(level, msg, data, mod){
  const log = await getLog();
  const id = await nextLogSeq();
  const entry = { t: Date.now(), id, level: level || "info", msg: String(msg == null ? "" : msg), data: (data == null ? null : data), mod: (TX_MODS.indexOf(mod) >= 0 ? mod : "background") };
  log.push(entry);
  while(log.length > LOG_CAP) log.shift();
  await chrome.storage.local.set({ log, lastEvent: entry });
  try{ await enqueueTx(entry); }catch(e){}
  if(level === "error" || level === "warn"){ try{ void flushTelemetry("urgente"); }catch(e){} }
  else { try{ void maybeFlushTx(); }catch(e){} }
}

// ===== v3.12 TELEMETRIA: cola local durable + espejo a Notion en alta frecuencia =====
// La base se resuelve por TITULO via /v1/search (no se hardcodea UUID). Nunca se pierde ni
// se inventa: ante fallo de red se reintenta con backoff y la cola se conserva; los errores
// permanentes van a una dead-letter local para no bloquear el resto de la cola.
let _txBusy = false;
let _lastTxAt = 0;
let _insertBusy = false; // v3.30: serializa inserciones para no duplicar si coinciden una ronda por alarma y un mensaje callLogData
let _syncBusy = false;   // v3.30: evita rondas de sincronizacion solapadas (alarma + boton + efimera)
async function enqueueTx(entry){
  const st = await getState();
  const ses = JSON.stringify({ inCall: !!st.inCall, mins: (typeof st.todayMins === "number" ? st.todayMins : null), calls: (typeof st.todayCalls === "number" ? st.todayCalls : null), goal: (typeof st.goal === "number" ? st.goal : null), pend: Math.round(st.pendingSecs || 0), exp: !!st.sessionExpired }).slice(0, 1900);
  let ctx = entry.data;
  if(ctx != null && typeof ctx !== "string"){ try{ ctx = JSON.stringify(ctx); }catch(e){ ctx = String(ctx); } }
  ctx = (ctx == null ? "" : String(ctx)).slice(0, 1900);
  const tx = { id: entry.id, t: entry.t, level: entry.level, mod: entry.mod, msg: String(entry.msg || "").slice(0, 1900), ctx, ses, eid: entry.t + "-" + entry.id };
  const o = await chrome.storage.local.get(["txq", "txDropped"]);
  let q = o.txq || [];
  q.push(tx);
  let dropped = 0;
  while(q.length > TX_QUEUE_CAP){ q.shift(); dropped++; }
  const set = { txq: q };
  if(dropped) set.txDropped = (o.txDropped || 0) + dropped;
  await chrome.storage.local.set(set);
}
async function maybeFlushTx(){
  const now = Date.now();
  if(now - _lastTxAt < TX_FLUSH_GAP_MS) return;
  _lastTxAt = now;
  await flushTelemetry("evento");
}
// ===== v3.26 LATIDO eficiente: pulso periodico SOLO si hubo cambio material (no spamea filas) =====
async function maybeHeartbeat(reason){
  try{
    const st = await getState();
    const o = await chrome.storage.local.get(["hbSig","stats","systemBlocked"]);
    const stats = o.stats || {};
    const sig = JSON.stringify({
      v: VERSION,
      day: localDay(),
      mins: (typeof st.todayMins === "number" ? st.todayMins : null),
      calls: (typeof st.todayCalls === "number" ? st.todayCalls : null),
      goal: (typeof st.goal === "number" ? st.goal : null),
      exp: !!st.sessionExpired,
      blocked: !!o.systemBlocked,
      db: st.txDbStatus || null,
      errs: stats.errors || 0
    });
    if(sig === o.hbSig) return;          // nada nuevo => no reporta (eficiente)
    await chrome.storage.local.set({ hbSig: sig });
    await logEvent("info","latido v"+VERSION+" ("+(reason||"")+")", { sig: JSON.parse(sig) }, "system");
  }catch(e){}
}
async function resolveActivityDb(){
  const cached = await chrome.storage.local.get("activityDbId");
  if(cached.activityDbId) return cached.activityDbId;
  let res;
  try{
    res = await notionFetch(`${NOTION}/search`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" },
      body: JSON.stringify({ query: ACTIVITY_DB_TITLE, filter: { property: "object", value: "database" }, page_size: 25 })
    });
  }catch(e){ await patchState({ txDbStatus: "sin conexion (reintento)" }); return null; }
  if(!res || !res.ok){ await patchState({ txDbStatus: "busqueda HTTP " + (res ? res.status : "?") }); return null; }
  let j; try{ j = await res.json(); }catch(e){ return null; }
  const list = (j && j.results) || [];
  const titleOf = (d)=> ((d.title || []).map(x=> (x.plain_text || (x.text && x.text.content) || "")).join("")).toLowerCase();
  let pick = list.find(d=> titleOf(d).indexOf("globo") >= 0 && titleOf(d).indexOf("registro de actividad") >= 0);
  if(!pick) pick = list.find(d=> titleOf(d).indexOf("registro de actividad") >= 0);
  if(!pick){ await patchState({ txDbStatus: "no encontrada: conecta la integracion a la base de actividad" }); return null; }
  await chrome.storage.local.set({ activityDbId: pick.id });
  await patchState({ txDbStatus: "conectada", activityDbResolvedAt: Date.now() });
  return pick.id;
}
function txSev(level){ const m = { info: "INFO", ok: "OK", warn: "WARN", error: "ERROR" }; return m[level] || "INFO"; }
function txProps(tx){
  const props = {
    "Evento": { title: [{ text: { content: (tx.msg || "(sin mensaje)").slice(0, 200) } }] },
    "Severidad": { select: { name: txSev(tx.level) } },
    "M\u00f3dulo": { select: { name: (TX_MODS.indexOf(tx.mod) >= 0 ? tx.mod : "system") } },
    "Fecha y hora": { date: { start: new Date(tx.t).toISOString() } },
    "Epoch": { number: tx.t },
    "Versi\u00f3n": { rich_text: [{ text: { content: VERSION } }] },
    "Extensi\u00f3n": { select: { name: EXT_LABEL } },
    "Event ID": { rich_text: [{ text: { content: String(tx.eid) } }] }
  };
  if(tx.ctx) props["Contexto"] = { rich_text: [{ text: { content: String(tx.ctx).slice(0, 1900) } }] };
  if(tx.ses) props["Sesi\u00f3n"] = { rich_text: [{ text: { content: String(tx.ses).slice(0, 1900) } }] };
  return props;
}
async function flushTelemetry(reason){
  if(_txBusy) return;
  _txBusy = true;
  try{
    const o0 = await chrome.storage.local.get(["txq", "txBackoffUntil", "txBackoff"]);
    let q = o0.txq || [];
    if(!q.length){ await patchState({ txQueued: 0, txAttemptAt: Date.now() }); return; }
    const now = Date.now();
    if(o0.txBackoffUntil && now < o0.txBackoffUntil){ await patchState({ txQueued: q.length }); return; }
    const dbId = await resolveActivityDb();
    if(!dbId){ await patchState({ txQueued: q.length }); return; }
    let sent = 0, hitBackoff = false;
    for(let i = 0; i < TX_BATCH && q.length; i++){
      const tx = q[0];
      let res;
      try{
        res = await notionFetch(`${NOTION}/pages`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" },
          body: JSON.stringify({ parent: { database_id: dbId }, properties: txProps(tx) })
        });
      }catch(e){ hitBackoff = true; await patchState({ txLastError: "red: " + String(e) }); break; }
      if(res && res.ok){
        q.shift(); sent++;
        await chrome.storage.local.set({ txq: q, txSentSeq: tx.id });
      } else if(!res){
        // notionFetch agoto sus reintentos internos de 429/5xx (devuelve null): TRANSITORIO -> backoff, NO descartar
        hitBackoff = true; await patchState({ txLastError: "sin respuesta tras reintentos (red/5xx/429)" }); break;
      } else if(res.status === 429 || res.status >= 500){
        hitBackoff = true; await patchState({ txLastError: "HTTP " + res.status }); break;
      } else if(res.status === 404){
        await chrome.storage.local.remove("activityDbId");
        await patchState({ txLastError: "HTTP 404 (base no accesible; re-resuelvo)", txDbStatus: "404: reconecta la integracion a la base" });
        hitBackoff = true; break;
      } else {
        const dd = await chrome.storage.local.get("txDead");
        const dl = dd.txDead || [];
        dl.push({ eid: tx.eid, status: (res ? res.status : "?"), body: (res ? await safeText(res) : "") });
        while(dl.length > TX_DEAD_CAP) dl.shift();
        q.shift();
        await chrome.storage.local.set({ txq: q, txDead: dl });
        await patchState({ txLastError: "HTTP " + (res ? res.status : "?") + " (a dead-letter)" });
      }
      await sleep(TX_GAP_MS);
    }
    if(hitBackoff){
      const backoff = Math.min(TX_BACKOFF_MAX, (o0.txBackoff ? o0.txBackoff * 2 : 15000));
      await chrome.storage.local.set({ txBackoff: backoff, txBackoffUntil: Date.now() + backoff });
      await patchState({ txQueued: q.length, txAttemptAt: Date.now() });
    } else {
      await chrome.storage.local.set({ txBackoff: 0, txBackoffUntil: 0 });
      if(sent){ await bumpStat("txFlushed", sent); await patchState({ txFlushedAt: Date.now() }); }
      await patchState({ txQueued: q.length, txAttemptAt: Date.now() });
    }
  }catch(e){ try{ await patchState({ txLastError: "flush exc: " + String(e) }); }catch(_){} }
  finally{ _txBusy = false; }
}
async function getState(){ const o = await chrome.storage.local.get("state"); return o.state || {}; }
async function patchState(partial){
  const state = Object.assign({}, await getState(), partial);
  await chrome.storage.local.set({ state });
  return state;
}
// v3.31 "modo seguro": kill-switches independientes (overlay / escaneo in-page / sondeo de
// fondo / medidor de audio). Por defecto TODO en ON (= comportamiento previo). El panel los
// conmuta para aislar empiricamente que parte, si alguna, afecta el audio de la llamada.
async function getSafe(){ const o = await chrome.storage.local.get("safe"); return Object.assign({ overlay:true, inpageScan:true, bgPoll:true, meter:true }, o.safe || {}); }
// ===== v3.32 TELEMETRIA FORENSE DE AUDIO (agregacion por ventana + picos + correlacion) =====
// En vez de mandar a Notion CADA muestra (cada 2s = ruido), agregamos por VENTANA (~30s) una sola
// fila con promedios/maximos + la CONDICION activa (que kill-switches estaban ON) + si la extension
// toco pestanas en esa ventana (_bgTouchedInWin). Ante un PICO (glitch audible) emitimos ademas un
// evento inmediato con anti-spam para fijar CUANDO y con que RITMO ocurre. Esto separa causa-extension
// de causa-red: glitch + jank alto + actividad de fondo en la MISMA ventana => contencion del hilo;
// glitch SIN jank y SIN actividad => red/plataforma.
const AUD_WINDOW_MS = 30000;
const AUD_SPIKE_CONCEAL = 0.05;
const AUD_SPIKE_JANK = 150;
const AUD_SPIKE_LOST = 10;
const AUD_SPIKE_WARP = 480;
const AUD_SPIKE_COOLDOWN_MS = 6000;
let _bgTouchedInWin = false;
let _lastSpikeAt = 0;
let _audWin = null;
function _audNum(v){ return (typeof v === "number" && isFinite(v)) ? v : null; }
function _audReset(now){ _audWin = { startedAt: now || Date.now(), n:0, sumConceal:0, maxConceal:0, sumLoss:0, maxLoss:0, dLost:0, sumJank:0, maxJank:0, jankN:0, longtasks:0, longtaskMs:0, accel:0, decel:0, sumJbMs:0, maxJbMs:0, jbN:0, spikes:0 }; _bgTouchedInWin = false; }
async function _condLabel(){ const s = await getSafe(); return "ov:"+(s.overlay?1:0)+" scan:"+(s.inpageScan?1:0)+" bg:"+(s.bgPoll?1:0)+" meter:"+(s.meter?1:0); }
async function flushAudioWindow(reason){
  try{
    if(!_audWin || _audWin.n <= 0){ _audReset(Date.now()); return; }
    const w = _audWin, dur = Math.max(1, Math.round((Date.now()-w.startedAt)/1000));
    const data = {
      ventana_s: dur, muestras: w.n,
      ocultamiento_medio: +(w.sumConceal/w.n).toFixed(4), ocultamiento_max: +(w.maxConceal).toFixed(4),
      perdida_media: +(w.sumLoss/w.n).toFixed(4), perdida_max: +(w.maxLoss).toFixed(4), paquetes_perdidos: w.dLost,
      jank_max_ms: +(w.maxJank).toFixed(1), jank_medio_ms: w.jankN ? +(w.sumJank/w.jankN).toFixed(1) : null,
      longtasks: w.longtasks, longtask_ms: +(w.longtaskMs).toFixed(1),
      buffer_estira: w.decel, buffer_comprime: w.accel,
      jitterbuffer_ms_medio: w.jbN ? +(w.sumJbMs/w.jbN).toFixed(1) : null, jitterbuffer_ms_max: +(w.maxJbMs).toFixed(1),
      picos: w.spikes, condicion: await _condLabel(), actividad_extension: _bgTouchedInWin, motivo: reason || "ventana"
    };
    const bad = (w.maxConceal >= AUD_SPIKE_CONCEAL) || (w.maxJank >= AUD_SPIKE_JANK) || (w.dLost >= AUD_SPIKE_LOST) || (w.spikes > 0);
    await logEvent(bad ? "warn" : "info", "Audio forense ("+dur+"s): ocultamiento medio "+(Math.round((w.sumConceal/w.n)*1000)/10)+"% / max "+(Math.round(w.maxConceal*1000)/10)+"%, jank max "+Math.round(w.maxJank)+"ms, longtasks "+w.longtasks+", picos "+w.spikes+" \u00b7 ["+data.condicion+"] \u00b7 ext:"+(_bgTouchedInWin?"si":"no"), data, "livecall");
    await chrome.storage.local.set({ audioWindow: { at: Date.now(), data: data, bad: bad } });
  }catch(e){ try{ await logEvent("warn","Audio forense: fallo al cerrar ventana", String(e), "system"); }catch(_){} }
  _audReset(Date.now());
}
async function bumpStat(key, by){
  const o = await chrome.storage.local.get("stats");
  const stats = o.stats || {};
  stats[key] = (stats[key] || 0) + (by || 1);
  await chrome.storage.local.set({ stats });
}
async function pushHistory(mins){
  const o = await chrome.storage.local.get("history");
  const h = o.history || [];
  const last = h[h.length-1];
  if(!last || last.mins !== mins){ h.push({ t: Date.now(), mins }); while(h.length > HIST_CAP) h.shift(); await chrome.storage.local.set({ history: h }); }
}

// ---- Tiempo de disponibilidad por switch (acumulado del dia local, reinicia a medianoche) ----
function localDay(ts){ const d = ts ? new Date(ts) : new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const da = String(d.getDate()).padStart(2,"0"); return y+"-"+m+"-"+da; }
const AV_IDLE_SEC = 60;          // umbral de inactividad del sistema (chrome.idle)
const AV_MAX_DT = 5 * 60 * 1000; // tope por settle: evita contar suspension/sueno como online
let _avActive = true;            // estado activo/inactivo del sistema (se actualiza con chrome.idle)
function blankAvail(day){ return { day: day, tel:{on:0,off:0}, vid:{on:0,off:0}, mas:{on:0,off:0}, openMs:0, activeMs:0 }; }
function normSt(v){ return v === true ? true : (v === false ? false : null); }
async function dashOpen(){ try{ const t = await chrome.tabs.query({ url: "https://globohq.com/linguist_dashboard*" }); return t.length > 0; }catch(e){ return false; } }
// Acumula con timestamps el tramo desde el ultimo settle, segun el estado que se mantuvo
// en ese tramo. ONLINE cuenta con el switch en ON y el Dashboard ABIERTO (aunque este en
// segundo plano). OFFLINE cuenta con el switch en OFF solo si el sistema esta ACTIVO
// (chrome.idle). Se pausa solo al cerrar el Dashboard o al inactivarse el sistema.
async function avSettle(reason){
  const st = await getState();
  const now = Date.now();
  let rt = st.avRT;
  if(!rt){ await patchState({ avRT: { since: now, tel:null, vid:null, mas:null } }); return; }
  let dt = now - (rt.since || now); if(dt < 0) dt = 0; if(dt > AV_MAX_DT) dt = AV_MAX_DT;
  const open = await dashOpen();
  const active = _avActive;
  let av = st.avail; const today = localDay();
  if(!av || av.day !== today){ if(av && av.day){ await patchState({ availPrev: av }); await logEvent("info","Nuevo dia: reinicio contadores de tiempo por switch ("+today+")"); } av = blankAvail(today); }
  if(dt > 0 && open){
    av.openMs += dt; if(active) av.activeMs = (av.activeMs || 0) + dt;
    if(rt.tel === true) av.tel.on += dt; else if(rt.tel === false && active) av.tel.off += dt;
    if(rt.vid === true) av.vid.on += dt; else if(rt.vid === false && active) av.vid.off += dt;
    if(rt.mas === true) av.mas.on += dt; else if(rt.mas === false && active) av.mas.off += dt;
  }
  rt.since = now;
  await patchState({ avail: av, avRT: rt, availAt: now, availLive: { tel: rt.tel, vid: rt.vid, mas: rt.mas, open: open, active: active, at: now } });
}
async function avReport(states){
  await avSettle("report");
  const st = await getState();
  let rt = st.avRT || { since: Date.now() };
  rt.tel = normSt(states.tel); rt.vid = normSt(states.vid); rt.mas = normSt(states.mas); rt.since = Date.now();
  await patchState({ avRT: rt, availSeenAt: Date.now() });
}

async function getGoal(){ const st = await getState(); return (typeof st.goal === "number" && st.goal > 0) ? st.goal : GOAL_DEFAULT; }
async function updateBadge(mins){
  try{
    await chrome.action.setBadgeText({ text: (mins == null) ? "" : String(mins) });
    let col = "#8b949e";
    if(mins != null){ const g = await getGoal(); col = mins >= g ? "#58a6ff" : (mins >= g/2 ? "#d29922" : "#f85149"); }
    await chrome.action.setBadgeBackgroundColor({ color: col });
  }catch(e){}
}

// Lee el objetivo diario DESDE Notion (propiedad \"Objetivo diario (min)\"). El usuario
// solo puede cambiar la meta alli; aqui se refleja en cada sondeo y arranque.
async function fetchGoal(reason){
  try{
    const res = await notionFetch(`${NOTION}/databases/${DB_ID}/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" },
      body: JSON.stringify({ page_size: 5, filter: { property: GOAL_PROP, number: { is_not_empty: true } } })
    });
    if(res && res.ok){
      const j = await res.json();
      for(const p of (j.results || [])){
        const n = p.properties && p.properties[GOAL_PROP] && p.properties[GOAL_PROP].number;
        if(typeof n === "number" && n > 0){
          const st = await getState();
          if(st.goal !== n) await logEvent("ok","Objetivo diario actualizado desde Notion: "+n+" min ("+(reason||"")+")");
          await patchState({ goal: n, goalAt: Date.now() });
          await updateBadge((await getState()).todayMins);
          return n;
        }
      }
    } else if(res){ await logEvent("warn","No pude leer el objetivo de Notion HTTP "+res.status); }
  }catch(e){ await logEvent("warn","fetchGoal excepcion", String(e)); }
  const st = await getState();
  if(typeof st.goal !== "number"){ await patchState({ goal: GOAL_DEFAULT, goalAt: Date.now() }); }
  return (await getState()).goal || GOAL_DEFAULT;
}
function notify(id, title, message){
  try{ chrome.notifications.create(id, { type:"basic", iconUrl:"icon128.png", title, message, priority: 1 }); }catch(e){}
}

async function openAhkUi(){
  try{
    const url = chrome.runtime.getURL("options.html#ahk");
    const baseUrl = chrome.runtime.getURL("options.html");
    let tabs = []; try{ tabs = await chrome.tabs.query({}); }catch(e){ tabs = []; }
    const mine = (tabs||[]).filter(t=> (t.url && t.url.indexOf(baseUrl) === 0) || (t.pendingUrl && t.pendingUrl.indexOf(baseUrl) === 0));
    if(mine.length){
      const keep = mine[0];
      try{ await chrome.tabs.update(keep.id, { url, active: true, pinned: true }); }catch(e){}
      try{ if(keep.windowId != null) await chrome.windows.update(keep.windowId, { focused: true }); }catch(e){}
    } else {
      try{ await chrome.tabs.create({ url, pinned: true, active: true }); }catch(e){}
    }
  }
  catch(e){ try{ chrome.runtime.openOptionsPage(); }catch(_){} }
}
async function notifyAhkMissing(force){
  try{
    const o = await chrome.storage.local.get("ahkLastNotifyAt");
    const now = Date.now();
    if(!force && o.ahkLastNotifyAt && (now - o.ahkLastNotifyAt) < AHK_NOTIFY_COOLDOWN_MS) return;
    await chrome.storage.local.set({ ahkLastNotifyAt: now });
    notify(AHK_NOTIFY_ID, "Globo Scraper bloqueado: AHK no verificado", "AHK puede estar instalado; falta reparar/verificar el conector Native Messaging de Chrome.");
  }catch(e){}
}
function sendNativeAhk(payload){
  return new Promise((resolve)=>{
    let done=false;
    const finish=(v)=>{ if(done) return; done=true; resolve(v); };
    const timer=setTimeout(()=>finish({ ok:false, error:"timeout" }), 2500);
    try{
      chrome.runtime.sendNativeMessage(AHK_HOST, payload || { type:"status" }, (resp)=>{
        clearTimeout(timer);
        const err = chrome.runtime.lastError && chrome.runtime.lastError.message;
        if(err) finish({ ok:false, error:err });
        else finish(resp || { ok:false, error:"sin respuesta" });
      });
    }catch(e){ clearTimeout(timer); finish({ ok:false, error:String(e) }); }
  });
}
async function checkAhkDependency(reason, forceNotify){
  const prev = await chrome.storage.local.get("ahkStatus");
  await logEvent("info", "dependency_check AHK 2.0 ("+(reason||"manual")+")", null, "dependency");
  const resp = await sendNativeAhk({ type:"status", extension:"Globo Scraper", version:VERSION, reason:reason||"manual", t:Date.now() });
  const ok = !!(resp && resp.ok && resp.ahkVersion && String(resp.ahkVersion).indexOf("2.") === 0);
  const status = {
    ok,
    status: ok ? "ok" : "missing_or_unreachable",
    installed: !!(resp && resp.installed),
    ahkVersion: resp && resp.ahkVersion || null,
    bridgeVersion: resp && resp.bridgeVersion || null,
    scriptVersion: resp && resp.scriptVersion || null,
    exePath: resp && resp.exePath || null,
    hotkeysLoaded: !!(resp && resp.hotkeysLoaded),
    lastHeartbeat: resp && resp.lastHeartbeat || null,
    error: ok ? null : (resp && resp.error || "AHK instalado no verificado por Chrome / conector sin respuesta"),
    checkedAt: Date.now(),
    host: AHK_HOST
  };
  await chrome.storage.local.set({ ahkStatus: status });
  const prevOk = prev && prev.ahkStatus && prev.ahkStatus.ok;
  if(ok){ await chrome.storage.local.set({ systemBlocked:false, blockReason:null }); await logEvent("ok", "ahk_detected AHK "+status.ahkVersion, status, "dependency"); }
  else {
    if(prevOk !== false || forceNotify){ await logEvent("warn", "ahk_missing_or_unreachable", status, "dependency"); }
    await notifyAhkMissing(!!forceNotify);
  }
  return status;
}
async function getAhkStatusCached(){ try{ const o=await chrome.storage.local.get("ahkStatus"); return o.ahkStatus || null; }catch(e){ return null; } }
async function requireAhkReady(reason){
  const st = await getAhkStatusCached();
  if(st && st.ok) return true;
  await chrome.storage.local.set({ systemBlocked: true, blockReason: AHK_BLOCK_MESSAGE, blockAt: Date.now() });
  await notifyAhkMissing(true);
  try{ await logEvent("warn", "Operacion bloqueada hasta verificar AHK 2.0 ("+(reason||"")+")", st || null, "dependency"); }catch(e){}
  return false;
}
async function runOperationalStartup(reason){
  if(!(await requireAhkReady(reason))) return;
  await chrome.storage.local.set({ systemBlocked: false, blockReason: null });
  runDupCleanupIfPending(reason);
  fetchGoal(reason);
  injectIntoOpenTabs(reason);
  checkGloboSession(reason);
  resolveActivityDb().then(()=>flushTelemetry(reason));
}

// Notion NO permite comas en nombres de opciones de select. Las cambiamos por espacio
// (coincide con las opciones ya existentes en la base, p.ej. "HealthNet  Inc").
function selName(v){ return String(v == null ? "" : v).replace(/,/g," ").replace(/\s+/g," ").trim().slice(0,90); }

async function notionFetch(url, opts, tries){
  tries = tries || 4;
  for(let i = 0; i < tries; i++){
    let res;
    try{ res = await fetch(url, opts); }
    catch(e){ if(i === tries-1) throw e; await sleep(500 * (i+1)); continue; }
    if(res.status === 429 || res.status >= 500){
      const ra = parseInt(res.headers.get("Retry-After") || "0", 10);
      await sleep(ra ? ra*1000 : 600 * (i+1));
      continue;
    }
    return res;
  }
  return null;
}

async function getSeenIds(){
  const seen = new Set();
  let cursor = undefined, pages = 0, ok = true;
  const MAX_PAGES = 600; // techo alto (60k filas) para no truncar el indice
  do{
    const body = { page_size: 100 };
    if(cursor) body.start_cursor = cursor;
    let res;
    try{
      res = await notionFetch(`${NOTION}/databases/${DB_ID}/query`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }catch(e){ await logEvent("error","getSeenIds red", String(e)); await bumpStat("errors",1); ok = false; break; }
    if(!res || !res.ok){ await logEvent("error","getSeenIds HTTP "+(res?res.status:"?"), res?await safeText(res):""); await bumpStat("errors",1); ok = false; break; }
    const j = await res.json();
    (j.results || []).forEach(p=>{
      const t = p.properties && p.properties["Call ID"] && p.properties["Call ID"].title;
      const raw = t && t[0] && (t[0].plain_text || (t[0].text && t[0].text.content));
      const id = raw == null ? "" : String(raw).trim();
      if(id) seen.add(id);
    });
    cursor = j.has_more ? j.next_cursor : undefined;
    pages++;
    if(cursor) await sleep(150); // respeta el rate-limit de Notion (~3/s)
  } while(cursor && pages < MAX_PAGES);
  if(cursor) ok = false; // se agotaron las paginas permitidas: indice INCOMPLETO
  await patchState({ seenCount: seen.size, seenAt: Date.now(), seenComplete: ok });
  return { ok, seen };
}

async function insertCalls(calls){
  if(!calls || !calls.length){ await patchState({ lastInsertedCount:0, lastSkippedCount:0 }); return { inserted:0, skipped:0 }; }
  if(_insertBusy){ await logEvent("info","Insercion ya en curso; omito esta ronda de "+calls.length+" filas para no duplicar"); return { inserted:0, skipped:0, deferred:true }; }
  _insertBusy = true;
  try{
  await logEvent("info","Cotejando "+calls.length+" filas contra Notion...");
  const idx = await getSeenIds();
  if(!idx.ok){
    await logEvent("error","Indice de duplicados INCOMPLETO ("+idx.seen.size+" ids leidos); ABORTO la insercion para no duplicar");
    await bumpStat("errors",1);
    notify("dedup_abort", "Globo: ronda abortada", "No pude leer el indice completo de Notion. No inserto para evitar duplicados; reintento en el proximo sondeo.");
    await patchState({ lastInsertedCount:0, lastSkippedCount:0, lastAbortAt: Date.now() });
    return { inserted:0, skipped:0, aborted:true };
  }
  const seen = idx.seen;
  let inserted = 0, skipped = 0, lastInserted = null;
  for(const c of calls){
    const key = c.id == null ? "" : String(c.id).trim();
    if(!key){ skipped++; continue; }
    if(seen.has(key)){ skipped++; continue; }
    const props = { "Call ID": { title: [{ text: { content: key } }] } };
    if(c.startISO) props["Fecha y hora"] = { date: { start: c.startISO } };
    if(c.end) props["Fin"] = { rich_text: [{ text: { content: String(c.end) } }] };
    if(typeof c.minutes === "number") props["Minutos"] = { number: c.minutes };
    const emp = selName(c.company); if(emp) props["Empresa"] = { select: { name: emp } };
    const srv = selName(c.service); if(srv) props["Servicio"] = { select: { name: srv } };
    if(typeof c.units === "number") props["Unidades pago"] = { number: c.units };
    let res;
    try{
      res = await notionFetch(`${NOTION}/pages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" },
        body: JSON.stringify({ parent: { database_id: DB_ID }, properties: props })
      });
    }catch(e){ await logEvent("error","insert red id="+key, String(e)); await bumpStat("errors",1); continue; }
    if(res && res.ok){ inserted++; seen.add(key); lastInserted = key; await bumpStat("insertedTotal",1); }
    else { await logEvent("error","insert HTTP "+(res?res.status:"?")+" id="+key, res?await safeText(res):""); await bumpStat("errors",1); }
    await sleep(300);
  }
  if(inserted){ await logEvent("ok","Insertadas "+inserted+" llamadas nuevas (saltadas "+skipped+")"); notify("ins_"+Date.now(), "Globo: "+inserted+" llamada(s) nueva(s)", "Registradas en Notion. Saltadas "+skipped+" por duplicado."); }
  else await logEvent("info","Sin llamadas nuevas (saltadas "+skipped+")");
  await patchState({ lastInserted, lastInsertAt: Date.now(), lastInsertedCount: inserted, lastSkippedCount: skipped });
  return { inserted, skipped };
  } finally { _insertBusy = false; }
}

// v3.10 - watchdog: cierra una llamada HUERFANA (detector mudo con llamada activa) para que
// no quede un cronometro corriendo solo ni se pierdan los segundos ya observados.
async function reconcileOrphanCall(reason){
  const st = await getState();
  if(!st.inCall || !st.callStartedAt) return;
  const now = Date.now();
  const ref = st.liveSeenAt || st.callLastTrueAt || 0;
  if((now - ref) <= ORPHAN_FINALIZE_MS) return;
  const endRef = st.callLastTrueAt || st.liveSeenAt || now;
  const secs = Math.round((endRef - st.callStartedAt)/1000);
  let pendingSecs = (typeof st.pendingSecs === "number" && st.pendingSecs > 0) ? st.pendingSecs : 0;
  if(secs > 0 && secs < 6*60*60){ pendingSecs = Math.min(PENDING_CAP_SEC, pendingSecs + secs); }
  await patchState({ inCall: false, callStartedAt: null, pendingSecs: pendingSecs, pendingSince: now });
  await logEvent("info","Watchdog: llamada huerfana cerrada (detector mudo "+Math.round((now-ref)/1000)+"s); banco ~"+secs+"s ("+(reason||"")+")");
}

// === v3.17: PESTANA EFIMERA AUTOMATICA (respaldo sin pestanas) =================
// Si la lectura en segundo plano no basta (totales de HOY rancios o un fetch fallo
// por razon NO de sesion) y NO hay ninguna pestana de Globo abierta, abrimos una
// pestana INACTIVA (no roba foco), dejamos que el content script raspe, y la
// CERRAMOS sola. Deteccion de necesidad automatica; el usuario no hace nada.
let _ephemeralBusy = false;
let _ephemeralLastAt = 0;
const EPHEMERAL_COOLDOWN_MS = 90 * 1000;
const EPHEMERAL_LOAD_MS = 25 * 1000;
const EPHEMERAL_SETTLE_MS = 6 * 1000;
const _ephemeralTabs = new Set();
function _wantedUrl(key){ for(var i=0;i<WANTED.length;i++){ if(WANTED[i].key===key) return WANTED[i].url; } return null; }
function _waitTabComplete(tabId, maxMs){
  return new Promise(function(resolve){
    var done=false;
    function fin(v){ if(done) return; done=true; try{ chrome.tabs.onUpdated.removeListener(onUpd); }catch(e){} clearTimeout(to); resolve(v); }
    function onUpd(id, info){ if(id===tabId && info && info.status==="complete") fin(true); }
    var to=setTimeout(function(){ fin(false); }, maxMs);
    try{ chrome.tabs.onUpdated.addListener(onUpd); }catch(e){ fin(false); }
  });
}
async function ephemeralScrape(which, reason){
  if(_ephemeralBusy) return { ok:false, reason:"ocupada" };
  if(Date.now() - _ephemeralLastAt < EPHEMERAL_COOLDOWN_MS) return { ok:false, reason:"enfriamiento" };
  var url = _wantedUrl(which);
  if(!url) return { ok:false, reason:"destino-desconocido" };
  var real=[]; try{ real = await chrome.tabs.query({ url:"https://globohq.com/*" }); }catch(e){}
  if(real.some(function(t){ return !_ephemeralTabs.has(t.id); })) return { ok:false, reason:"hay-pestana-usuario" };
  _ephemeralBusy = true; _ephemeralLastAt = Date.now();
  var tab=null;
  try{
    await logEvent("info","Pestana efimera: abriendo "+which+" en segundo plano (sin foco) - "+(reason||""), null, "system");
    tab = await chrome.tabs.create({ url: url, active:false });
    if(!tab || tab.id==null) throw new Error("no se creo la pestana");
    _ephemeralTabs.add(tab.id);
    await _waitTabComplete(tab.id, EPHEMERAL_LOAD_MS);
    try{ chrome.tabs.sendMessage(tab.id, { type:"runSync" }, function(){ void chrome.runtime.lastError; }); }catch(e){}
    await sleep(EPHEMERAL_SETTLE_MS);
    await logEvent("ok","Pestana efimera: dato tomado de "+which+", cerrando", null, "system");
    return { ok:true };
  }catch(e){ await logEvent("warn","Pestana efimera fallo ("+which+")", String(e), "system"); return { ok:false, reason:String(e) }; }
  finally{
    if(tab && tab.id!=null){ _ephemeralTabs.delete(tab.id); try{ await chrome.tabs.remove(tab.id); }catch(e){} }
    _ephemeralBusy = false;
  }
}
async function syncAllTabs(reason){
  if(_syncBusy){ try{ await logEvent("info","Ronda de sincronizacion solapada ignorada ("+(reason||"")+")", null, "system"); }catch(e){} return; }
  _syncBusy = true;
  try{
  await logEvent("info","Ronda de sincronizacion ("+(reason||"manual")+")");
  try{ await fetchGoal("sondeo"); }catch(e){}
  try{ await avSettle("ronda"); }catch(e){}
  try{ await reconcileOrphanCall("ronda"); }catch(e){}
  // v3.9: lectura en segundo plano (no requiere las pestanas Call Log/Monthly abiertas).
  // Si la sesion expiro o el fetch falla, el camino por pestanas queda como respaldo.
  try{ await checkGloboSession("ronda"); }catch(e){}
  let rMon=null, rCall=null;
  try{ rMon = await bgFetchMonthly("ronda"); }catch(e){}
  try{ rCall = await bgFetchCallLog("ronda"); }catch(e){}
  // v3.31 "modo seguro": los datos ya se leyeron arriba en el service worker (sin tocar ninguna
  // pestana). NO contactamos pestanas ni abrimos efimeras si (a) hay una llamada en curso o (b)
  // el kill-switch safe.bgPoll esta apagado y esta ronda es del sondeo periodico. Asi, por
  // construccion, el hilo/red de la pestana que lleva el audio de la llamada queda intacto.
  const _safe = await getSafe();
  const _stInCall = !!(await getState()).inCall;
  const _isAlarm = (reason === "alarma");
  if(_stInCall || (_isAlarm && !_safe.bgPoll)){
    await logEvent("info","Modo seguro: omito tocar pestanas esta ronda ("+(reason||"")+"; enLlamada="+_stInCall+", bgPoll="+_safe.bgPoll+"). Datos via fetch en segundo plano.", null, "system");
    return;
  }
  let tabs = [];
  try{ tabs = await chrome.tabs.query({ url: "https://globohq.com/*" }); }
  catch(e){ await logEvent("error","tabs.query fallo", String(e)); }
  const userTabs = tabs.filter(function(t){ return !_ephemeralTabs.has(t.id); });
  await patchState({ tabsOpen: userTabs.length, lastRoundAt: Date.now(), nextPollAt: Date.now() + POLL_MIN*60*1000 });
  if(!userTabs.length){
    await logEvent("warn","No hay pestanas de globohq.com abiertas");
    // v3.17: deteccion de necesidad -> pestana EFIMERA que raspa y se cierra sola.
    try{
      const s0 = await getState();
      if(!s0.sessionExpired){
        const dashStale = !s0.dashboardAt || (Date.now() - s0.dashboardAt) > STALE_MS;
        const callBad = rCall && rCall.ok===false && rCall.reason!=="sesion";
        const monBad  = rMon  && rMon.ok===false  && rMon.reason!=="sesion";
        if(dashStale) await ephemeralScrape("dashboard","totales-hoy-rancios");
        else if(callBad) await ephemeralScrape("callLog","bg-calllog-fallo");
        else if(monBad) await ephemeralScrape("monthly","bg-monthly-fallo");
      }
    }catch(e){ await logEvent("warn","Pestana efimera: no pude evaluar necesidad", String(e), "system"); }
    return;
  }
  _bgTouchedInWin = true; // v3.32: marca actividad de fondo de ESTA ventana para la correlacion forense
  for(const t of userTabs){
    try{
      if(t.audible){ await logEvent("info","Modo seguro: no toco pestana con audio activo (posible llamada): "+(t.url||t.id), null, "system"); continue; }
      if(t.discarded){
        await logEvent("info","Reactivando pestana dormida: "+(t.url||t.id));
        await chrome.tabs.reload(t.id);
        await sleep(2500);
      }
      chrome.tabs.sendMessage(t.id, { type: "runSync" }, ()=>{ void chrome.runtime.lastError; });
    }catch(e){ await logEvent("error","sync tab fallo "+t.id, String(e)); }
  }
  const s = await getState();
  if(s.tabsOpen > 0 && s.dashboardAt && (Date.now() - s.dashboardAt) > STALE_MS){
    if(!s.feedStale){
      await patchState({ feedStale: true });
      await logEvent("warn","Feed estancado: sin lectura del Dashboard en mas de 7 min");
      notify("stale", "Globo: feed estancado", "El Dashboard no reporta hace mas de 7 min. Revisa o recarga la pestana.");
    }
  }
  } finally { _syncBusy = false; }
}

async function openMissing(){
  let tabs = [];
  try{ tabs = await chrome.tabs.query({ url: "https://globohq.com/*" }); }catch(e){}
  const urls = tabs.map(t=>t.url || "");
  for(const w of WANTED){
    if(!urls.some(u=>w.re.test(u))){ try{ await chrome.tabs.create({ url: w.url, active: false }); await logEvent("info","Abriendo pestana faltante: "+w.key); }catch(e){} }
  }
}

// ---- v3.9 - Auto-inyeccion en pestanas YA abiertas (sin recargar) ----
// Al instalar/actualizar la extension, Chrome NO re-inyecta los content scripts en
// las pestanas ya abiertas. Aqui los inyectamos a mano (mundo ISOLATED + MAIN) para
// que el panel reviva sin que tengas que recargar cada pestana de Globo.
async function injectIntoOpenTabs(reason){
  if(!chrome.scripting || !chrome.scripting.executeScript) return;
  let tabs = [];
  try{ tabs = await chrome.tabs.query({ url: "https://globohq.com/*" }); }catch(e){ return; }
  let done = 0;
  for(const t of tabs){
    if(!t.id || t.discarded) continue;
    if(t.audible){ continue; } // v3.31: no reinyectar en una pestana con audio activo (posible llamada en curso)
    try{
      await chrome.scripting.executeScript({ target:{ tabId: t.id }, world: "ISOLATED", files: ["content.js"] });
      await chrome.scripting.executeScript({ target:{ tabId: t.id }, world: "MAIN", files: ["mainworld.js"] });
      done++;
    }catch(e){ /* pestana restringida o ya inyectada: la guarda interna lo absorbe */ }
  }
  if(done) await logEvent("ok","Auto-inyeccion v3.9 en "+done+" pestana(s) ya abierta(s) sin recargar ("+(reason||"")+")");
}

// ---- v3.9 - Deteccion de sesion expirada en Globo ----
// Pide el Dashboard con las cookies de sesion y sin seguir redirecciones: si Globo
// responde con redireccion al login (opaqueredirect) o 401/403, la sesion expiro.
async function checkGloboSession(reason){
  let expired = null;
  try{
    const res = await fetch("https://globohq.com/linguist_dashboard/index", { method:"GET", credentials:"include", redirect:"manual", cache:"no-store" });
    if(res.type === "opaqueredirect") expired = true;
    else if(res.status === 401 || res.status === 403) expired = true;
    else if(res.status >= 300 && res.status < 400) expired = true;
    else if(res.status === 200){ expired = (res.url && /sign[_-]?in|log[_-]?in/i.test(res.url)) ? true : false; }
    else expired = null; // indeterminado: no afirmamos nada
  }catch(e){ expired = null; }
  if(expired === null){ await patchState({ sessionCheckedAt: Date.now() }); return null; }
  const st = await getState();
  await patchState({ sessionExpired: expired, sessionCheckedAt: Date.now() });
  if(expired){
    if(!st.sessionExpiredAt) await patchState({ sessionExpiredAt: Date.now() });
    if(!st.sessionExpiredNotifiedAt || (Date.now() - st.sessionExpiredNotifiedAt) > 30*60*1000){
      await patchState({ sessionExpiredNotifiedAt: Date.now() });
      await logEvent("warn","Sesion de Globo EXPIRADA: no estas autenticado. Abre Globo e inicia sesion ("+(reason||"")+")");
      notify("sess_exp", "Globo: sesion expirada", "Tu sesion en globohq.com expiro. Abre Globo e inicia sesion para seguir registrando minutos y llamadas.");
    }
  } else {
    if(st.sessionExpired) await logEvent("ok","Sesion de Globo activa de nuevo");
    await patchState({ sessionExpiredAt: null, sessionExpiredNotifiedAt: null });
  }
  return expired;
}

// ---- v3.9 - Lectura en segundo plano (permite cerrar Call Log y Monthly) ----
// Replica lo que hacian esas pestanas, pero desde el background con las cookies de
// sesion. Si algo falla, NO pasa nada: el camino por pestanas sigue como respaldo.
function bgStrip(v){ return v == null ? "" : String(v).replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim(); }
function bgNum(v){ if(v == null) return null; if(typeof v === "number") return isNaN(v)?null:v; const s = String(v).replace(/[^0-9.\-]/g,""); if(s==="") return null; const n = Number(s); return isNaN(n)?null:n; }
function bgISO(dateStr, timeStr){
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
      if(tm){ let h = parseInt(tm[1],10); const ap = (tm[3]||"").toUpperCase(); if(ap==="PM"&&h<12)h+=12; if(ap==="AM"&&h===12)h=0; hh=String(h).padStart(2,"0"); mi=tm[2]; }
    }
    return yyyy+"-"+mm+"-"+dd+"T"+hh+":"+mi+":00";
  }catch(e){ return null; }
}
function bgParseRow(row){
  if(!row || typeof row !== "object" || Array.isArray(row)) return { id:null };
  const id = row.call_unique_identifier || row.callUniqueIdentifier || row.unique_identifier || null;
  const company = row.company != null ? bgStrip(row.company) : null;
  const service = row.service != null ? bgStrip(row.service) : null;
  return {
    id: id ? String(id).trim() : null,
    startISO: bgISO(row.date, row.start),
    end: row.end ? bgStrip(row.end) : null,
    minutes: bgNum(row.interpreter_minutes),
    company: company || null,
    service: service || "Telephone",
    units: bgNum(row.hourly_pay_units)
  };
}
async function bgFetchCallLog(reason){
  try{
    const out = []; let start = 0; const PAGE = 1000, MAX = 100000; let draw = 1, total = null;
    while(true){
      const params = new URLSearchParams();
      params.set("draw", String(draw++));
      params.set("start", String(start));
      params.set("length", String(PAGE));
      const res = await fetch("https://globohq.com/interpreter/calls_index_data?" + params.toString(), {
        method:"GET", credentials:"include", redirect:"manual", cache:"no-store",
        headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json, text/javascript, */*; q=0.01" }
      });
      if(res.type === "opaqueredirect" || res.status === 401 || res.status === 403 || (res.status>=300&&res.status<400)){ await patchState({ sessionExpired:true }); return { ok:false, reason:"sesion" }; }
      if(!res.ok) return { ok:false, reason:"http "+res.status };
      let j; try{ j = await res.json(); }catch(e){ return { ok:false, reason:"no-json" }; }
      const data = (j && (j.data || j.aaData)) || [];
      for(let i=0;i<data.length;i++) out.push(data[i]);
      if(total === null) total = (j && (typeof j.recordsFiltered==="number"?j.recordsFiltered:j.recordsTotal)) || out.length;
      if(data.length < PAGE || out.length >= total || (start+PAGE) >= MAX) break;
      start += PAGE;
      await sleep(150);
    }
    if(!out.length) return { ok:false, reason:"vacio" };
    if(out[0] && (typeof out[0] !== "object" || Array.isArray(out[0]))) return { ok:false, reason:"forma-array" }; // en bg solo soportamos filas-objeto
    const calls = out.map(bgParseRow).filter(c=>c && c.id);
    await patchState({ callLogAt: Date.now(), callLogCount: calls.length, callLogVia: "background" });
    await logEvent("ok","Call Log leido en segundo plano: "+calls.length+" filas (sin pestana) ("+(reason||"")+")");
    const r = await insertCalls(calls);
    return { ok:true, inserted: r.inserted, skipped: r.skipped };
  }catch(e){ await logEvent("warn","Call Log en segundo plano fallo; uso la pestana como respaldo", String(e)); return { ok:false, reason:String(e) }; }
}
async function bgFetchMonthly(reason){
  try{
    const res = await fetch("https://globohq.com/interpreter/monthly_minutes", { method:"GET", credentials:"include", redirect:"manual", cache:"no-store" });
    if(res.type === "opaqueredirect" || res.status === 401 || res.status === 403 || (res.status>=300&&res.status<400)){ await patchState({ sessionExpired:true }); return { ok:false, reason:"sesion" }; }
    if(!res.ok) return { ok:false, reason:"http "+res.status };
    const html = await res.text();
    // Extrae las filas de la tabla .details-table sin DOMParser (no existe en el SW).
    const m = html.match(/details-table[\s\S]*?<tbody[\s\S]*?>([\s\S]*?)<\/tbody>/i);
    const body = m ? m[1] : html;
    const rows = [];
    const trRe = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi; let tr;
    while((tr = trRe.exec(body))){
      const tds = []; const tdRe = /<td[\s\S]*?>([\s\S]*?)<\/td>/gi; let td;
      while((td = tdRe.exec(tr[1]))) tds.push(bgStrip(td[1]));
      if(tds.length < 3) continue;
      const month = tds[0].replace(/\s+/g,"");
      const calls = bgNum(tds[1]); const mins = bgNum(tds[2]);
      if(month && /\d/.test(month)) rows.push({ month, calls: calls==null?null:calls, mins: mins==null?null:mins });
    }
    if(!rows.length) return { ok:false, reason:"sin-filas" };
    await patchState({ months: rows, monthlyAt: Date.now(), monthlyVia: "background" });
    const cur = rows[0];
    if(cur) await logEvent("ok","Mensual en segundo plano: "+cur.month+" = "+cur.calls+" / "+cur.mins+" min (sin pestana)");
    return { ok:true, months: rows.length };
  }catch(e){ await logEvent("warn","Mensual en segundo plano fallo; uso la pestana como respaldo", String(e)); return { ok:false, reason:String(e) }; }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  (async ()=>{
    if(!msg || !msg.type){ if(sendResponse) sendResponse({ ok:false }); return; }
    const _allowWithoutAhk = (msg.type === "ahkCheck" || msg.type === "logClient" || msg.type === "overlayCmd" || msg.type === "safeCfg" || msg.type === "audioStat");
    if(!_allowWithoutAhk && !(await requireAhkReady("mensaje:"+msg.type))){ if(sendResponse) sendResponse({ ok:false, blocked:true, reason:AHK_BLOCK_MESSAGE }); return; }
    if(msg.type === "log"){ await logEvent(msg.level || "info", msg.msg, msg.data, msg.mod || "content"); }
    else if(msg.type === "dashboardToday"){
      const st = await getState();
      const prev = (typeof st.todayMins === "number") ? st.todayMins : null;
      const changed = prev !== msg.mins;
      // Reconciliacion v3.8: cuando el contador OFICIAL sube, descuenta de pendingSecs
      // los segundos que el Dashboard acaba de absorber (evita contarlos dos veces).
      let pendingSecs = (typeof st.pendingSecs === "number" && st.pendingSecs > 0) ? st.pendingSecs : 0;
      let officialUpAt = st.officialUpAt || 0;
      if(prev != null && typeof msg.mins === "number" && msg.mins > prev){
        const caughtSec = (msg.mins - prev) * 60;
        const before = pendingSecs;
        pendingSecs = Math.max(0, pendingSecs - caughtSec);
        if(pendingSecs > 0 && pendingSecs < RESIDUAL_SEC) pendingSecs = 0; // v3.10: limpia resto de redondeo
        officialUpAt = Date.now();
        if(before > 0) await logEvent("info","El Dashboard sumo "+(msg.mins-prev)+" min; pendientes "+Math.round(before)+"s -> "+Math.round(pendingSecs)+"s");
      }
      await patchState({ todayCalls: msg.calls, todayMins: msg.mins, dashboardAt: Date.now(), feedStale: false, lastChangeAt: changed ? Date.now() : st.lastChangeAt, pendingSecs: pendingSecs, officialUpAt: officialUpAt });
      await updateBadge(msg.mins);
      await pushHistory(msg.mins);
      if(prev != null && msg.mins > prev){
        const dMin = msg.mins - prev;
        const dMXN = Math.round(dMin * MXN_MIN);
        const g = (typeof st.goal === "number" && st.goal > 0) ? st.goal : GOAL_DEFAULT;
        await logEvent("ok","+"+dMin+" min hoy (+$"+dMXN+" MXN) -> "+msg.mins+"/"+g);
        if(prev < g && msg.mins >= g){
          const vuelta = Math.floor(msg.mins/g) + 1;
          await logEvent("ok","META CUMPLIDA: "+g+" min. La barra reinicia para la vuelta "+vuelta);
          notify("goal_"+Date.now(), "Globo: meta diaria cumplida", g+" min logrados (~$"+Math.round(msg.mins*MXN_MIN)+" MXN). La barra se pone azul y arranca la vuelta "+vuelta+".");
        } else {
          notify("delta_"+Date.now(), "Globo: +"+dMin+" min", "Hoy "+msg.mins+"/"+g+" min - ganado ~$"+Math.round(msg.mins*MXN_MIN)+" MXN");
        }
      } else if(!msg.silent && changed){
        await logEvent("ok","Dashboard: hoy "+msg.calls+" llamadas / "+msg.mins+" min");
      }
    }
    else if(msg.type === "recentJobs"){ await patchState({ recentJobs: msg.rows || [], recentJobsAt: Date.now() }); }
    else if(msg.type === "monthly"){
      await patchState({ months: msg.months || [], monthlyAt: Date.now() });
      const cur = (msg.months || [])[0];
      if(cur) await logEvent("ok","Mensual: "+cur.month+" = "+cur.calls+" / "+cur.mins+" min");
    }
    else if(msg.type === "callLogSample"){ await patchState({ callLogSample: msg.sample, callLogCols: msg.cols }); }
    else if(msg.type === "callLogData"){
      await patchState({ callLogAt: Date.now(), callLogCount: (msg.calls || []).length });
      const r = await insertCalls(msg.calls || []);
      if(sendResponse) sendResponse(r);
      return;
    }
    else if(msg.type === "liveState"){
      const stl = await getState();
      const now = Date.now();
      const CALL_GRACE_MS = 12000; // anti-parpadeo: ignora caidas breves del detector
      let callStartedAt = stl.callStartedAt || null;
      const hardOff = !!msg.hardOff; // v3.19: UI visible dice "Not In Call"; sin gracia anti-parpadeo.
      let lastTrueAt = stl.callLastTrueAt || 0;
      const pageStart = (typeof msg.startedAt === "number" && msg.startedAt > 0 && msg.startedAt <= now + 1000) ? msg.startedAt : null;
      if(msg.inCall){
        let pendingSecs = (typeof stl.pendingSecs === "number" && stl.pendingSecs > 0) ? stl.pendingSecs : 0;
        // v3.10: detector MUDO mucho tiempo (pestana cerrada/crasheada a media llamada, SW
        // dormido) => callStartedAt rancio. Banco el tramo OBSERVADO de esa llamada huerfana
        // y arranco un cronometro FRESCO para no marcar horas falsas en la siguiente llamada.
        if(callStartedAt && lastTrueAt && (now - lastTrueAt) > REENTRY_GAP_MS){
          const orphanSec = Math.round((lastTrueAt - callStartedAt)/1000);
          if(orphanSec > 0 && orphanSec < 6*60*60){ pendingSecs = Math.min(PENDING_CAP_SEC, pendingSecs + orphanSec); }
          await logEvent("info","Detector mudo "+Math.round((now-lastTrueAt)/1000)+"s; banco ~"+orphanSec+"s de la llamada anterior y reinicio el cronometro");
          callStartedAt = null;
        }
        lastTrueAt = now;
        if(!callStartedAt){
          callStartedAt = pageStart || now;
          await logEvent("ok","Llamada iniciada (cronometro en vivo activo)");
          notify("call_on","Globo: llamada en curso","El cronometro en vivo esta corriendo.");
        } else if(pageStart && pageStart < callStartedAt && (callStartedAt - pageStart) > 3000){
          callStartedAt = pageStart; // afina al inicio real si la pagina lo expone
        }
        await patchState({ inCall: true, callStartedAt: callStartedAt, callLastTrueAt: lastTrueAt, liveSeenAt: now, pendingSecs: pendingSecs });
      } else if(callStartedAt && !hardOff && (now - lastTrueAt) < CALL_GRACE_MS){
        // Falso momentaneo dentro de la gracia: NO reseteamos; el cronometro sigue.
        // v3.19: si el Dashboard ya dice "Not In Call", cerramos inmediato.
        await patchState({ inCall: true, callLastTrueAt: lastTrueAt, liveSeenAt: now });
      } else {
        if(callStartedAt){
          const secs = Math.round((now - callStartedAt)/1000);
          let pendingSecs = (typeof stl.pendingSecs === "number" && stl.pendingSecs > 0) ? stl.pendingSecs : 0;
          if(secs > 0 && secs < 6*60*60){ pendingSecs = Math.min(PENDING_CAP_SEC, pendingSecs + secs); }
          await logEvent("info","Llamada finalizada (~"+secs+"s); +"+secs+"s a la espera de que el Dashboard los sume");
          await patchState({ inCall: false, callStartedAt: null, callLastTrueAt: lastTrueAt, liveSeenAt: now, pendingSecs: pendingSecs, pendingSince: now });
          try{ await flushAudioWindow("fin-llamada"); }catch(e){}
        } else {
          await patchState({ inCall: false, callStartedAt: null, callLastTrueAt: lastTrueAt, liveSeenAt: now });
        }
      }
    }
    else if(msg.type === "availState"){ await avReport({ tel: msg.tel, vid: msg.vid, mas: msg.mas }); }
    else if(msg.type === "avPing"){ await avSettle("ping"); }
    else if(msg.type === "audioStat"){
      const m = (msg.metrics && typeof msg.metrics === "object") ? msg.metrics : {};
      const now = Date.now();
      await chrome.storage.local.set({ audioMeter: { at: now, m: m, source: msg.source || "" } });
      if(!_audWin) _audReset(now);
      const cr = _audNum(m.concealRate), dlz = _audNum(m.dPacketsLost), jk = _audNum(m.jankMaxMs), lr = _audNum(m.lossRate);
      const lt = _audNum(m.longtasks), ltms = _audNum(m.longtaskMs), ac = _audNum(m.accelSamples), de = _audNum(m.decelSamples), jb = _audNum(m.avgJbDelayMs);
      const w = _audWin; w.n++;
      if(cr!=null){ w.sumConceal += cr; if(cr>w.maxConceal) w.maxConceal = cr; }
      if(lr!=null){ w.sumLoss += lr; if(lr>w.maxLoss) w.maxLoss = lr; }
      if(dlz!=null) w.dLost += dlz;
      if(jk!=null){ w.sumJank += jk; w.jankN++; if(jk>w.maxJank) w.maxJank = jk; }
      if(lt!=null) w.longtasks += lt;
      if(ltms!=null) w.longtaskMs += ltms;
      if(ac!=null) w.accel += ac;
      if(de!=null) w.decel += de;
      if(jb!=null){ w.sumJbMs += jb; w.jbN++; if(jb>w.maxJbMs) w.maxJbMs = jb; }
      const spike = (cr!=null && cr>=AUD_SPIKE_CONCEAL) || (jk!=null && jk>=AUD_SPIKE_JANK) || (dlz!=null && dlz>=AUD_SPIKE_LOST) || ((ac!=null&&ac>=AUD_SPIKE_WARP)||(de!=null&&de>=AUD_SPIKE_WARP));
      if(spike){
        w.spikes++;
        if(now - _lastSpikeAt >= AUD_SPIKE_COOLDOWN_MS){
          _lastSpikeAt = now;
          const cond = await _condLabel();
          await logEvent("warn","PICO de audio: ocultamiento "+(cr!=null?(Math.round(cr*1000)/10+"%"):"\u00b7")+", jank "+(jk!=null?Math.round(jk)+"ms":"\u00b7")+", perdidos +"+(dlz!=null?dlz:"\u00b7")+", estira/comprime "+(de!=null?de:"\u00b7")+"/"+(ac!=null?ac:"\u00b7")+" \u00b7 ["+cond+"] \u00b7 ext:"+(_bgTouchedInWin?"si":"no"), m, "livecall");
        }
      }
      if(now - w.startedAt >= AUD_WINDOW_MS) await flushAudioWindow("ventana");
    }
    else if(msg.type === "safeCfg"){
      const cur = await getSafe();
      if(msg.key && (msg.key in cur) && typeof msg.val === "boolean"){ cur[msg.key] = msg.val; await chrome.storage.local.set({ safe: cur }); await logEvent("info","Modo seguro: "+msg.key+" = "+(msg.val?"ON":"OFF"), null, "system"); }
      if(sendResponse) sendResponse({ ok:true, safe: cur }); return;
    }
    else if(msg.type === "syncNow"){ await syncAllTabs("boton"); }
    else if(msg.type === "openMissing"){ await openMissing(); }
    else if(msg.type === "logClient"){ await logEvent(msg.level || "info", msg.msg || "evento UI", msg.data || null, msg.mod || "options"); }
    else if(msg.type === "ahkCheck"){ const stAhk = await checkAhkDependency(msg.reason || "manual", true); if(stAhk && stAhk.ok) await runOperationalStartup("ahk-verificado"); if(sendResponse) sendResponse({ ok:true, ahkStatus: stAhk }); return; }
    else if(msg.type === "overlayCmd"){
      // v3.18: el panel flotante vive en la pagina (content.js). El panel de opciones solo
      // escribe el estado deseado en storage (ov / viz); content.js lo aplica en cada
      // pestana de Globo via chrome.storage.onChanged. Sin puente nativo.
      var _act = msg.action;
      var _ovo = await chrome.storage.local.get(["ov","viz"]);
      var _ov = _ovo.ov || {};
      if(_act==="vizset"){ var _idx=(typeof msg.idx==="number")?msg.idx:parseInt(msg.idx,10); if(!(_idx>=0 && _idx<=3)) _idx=0; await chrome.storage.local.set({ viz: _idx }); }
      else if(_act==="viz_cycle"){ var _n=((typeof _ovo.viz==="number"?_ovo.viz:0)+1)%4; await chrome.storage.local.set({ viz:_n }); }
      else if(_act==="hud_toggle"){ _ov.hud=!_ov.hud; await chrome.storage.local.set({ ov:_ov }); }
      else if(_act==="money_toggle"){ _ov.money=!_ov.money; await chrome.storage.local.set({ ov:_ov }); }
      else if(_act==="cheatsheet"){ _ov.cheat=!_ov.cheat; await chrome.storage.local.set({ ov:_ov }); }
      else { await logEvent("warn","overlayCmd ignorado (accion no reconocida): "+_act, null, "system"); }
      await logEvent("info","overlayCmd desde panel: "+_act+(_act==="vizset"?(" idx "+msg.idx):""), null, "system");
    }
    if(sendResponse) sendResponse({ ok:true });
  })();
  return true;
});

// ---- Limpieza AUTO-SANABLE de duplicados (una sola vez, sobrevive recargas) ----
// Se reanuda sola en cada arranque del service worker y se auto-desactiva al terminar.
async function runDupCleanupIfPending(reason){
  try{ const o = await chrome.storage.local.get("dupCleanupDone"); if(o.dupCleanupDone) return; }
  catch(e){ return; }
  if(globalThis.__dupCleanupRunning) return;
  globalThis.__dupCleanupRunning = true;
  const H = { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NV, "Content-Type": "application/json" };
  try{
    await logEvent("info","[limpieza] arrancando/reanudando limpieza de duplicados ("+(reason||"")+")");
    let pass = 0;
    while(pass++ < 50){
      const groups = new Map();
      let cursor = undefined, pages = 0;
      do{
        const body = { page_size: 100 };
        if(cursor) body.start_cursor = cursor;
        const res = await notionFetch(`${NOTION}/databases/${DB_ID}/query`, { method:"POST", headers:H, body: JSON.stringify(body) });
        if(!res || !res.ok){ await logEvent("error","[limpieza] lectura fallida HTTP "+(res?res.status:"?")+"; reintento en el proximo arranque"); return; }
        const j = await res.json();
        (j.results||[]).forEach(p=>{
          const t = p.properties && p.properties["Call ID"] && p.properties["Call ID"].title;
          const raw = t && t[0] && (t[0].plain_text || (t[0].text && t[0].text.content));
          const id = raw == null ? "" : String(raw).trim();
          if(!id) return;
          if(!groups.has(id)) groups.set(id, []);
          groups.get(id).push(p.id);
        });
        cursor = j.has_more ? j.next_cursor : undefined;
        pages++;
        if(cursor) await sleep(150);
      } while(cursor && pages < 800);
      if(cursor){ await logEvent("error","[limpieza] base demasiado grande para leer completa; aborto pasada"); return; }
      const extras = [];
      for(const [,ids] of groups){ for(let k=1;k<ids.length;k++) extras.push(ids[k]); }
      if(!extras.length){
        await chrome.storage.local.set({ dupCleanupDone: true });
        await logEvent("ok","[limpieza] COMPLETADA. Sin duplicados. (auto-desactivada)");
        return;
      }
      await logEvent("info","[limpieza] quedan "+extras.length+" duplicados; archivando...");
      let done = 0;
      for(const pid of extras){
        const res = await notionFetch(`${NOTION}/pages/${pid}`, { method:"PATCH", headers:H, body: JSON.stringify({ archived: true }) });
        if(res && res.ok){ done++; await bumpStat("dupArchived",1); }
        await sleep(160);
      }
      await logEvent("info","[limpieza] pasada "+pass+": archivadas "+done+" de "+extras.length);
    }
  }catch(e){ await logEvent("error","[limpieza] excepcion", String(e)); }
  finally{ globalThis.__dupCleanupRunning = false; }
}

// ---- Abrir la UI en su propia pestana, FIJADA a la izquierda y sin duplicados ----
async function openUiTab(){
  try{
    const url = chrome.runtime.getURL("options.html");
    const findMine = (tabs)=> (tabs||[]).filter(t=> (t.url && t.url.indexOf(url) === 0) || (t.pendingUrl && t.pendingUrl.indexOf(url) === 0));
    let tabs = []; try{ tabs = await chrome.tabs.query({}); }catch(e){ tabs = []; }
    let mine = findMine(tabs);
    // Tras una recarga la pestana vieja tarda un instante en reaparecer; reintenta una vez.
    if(!mine.length){ await sleep(600); try{ tabs = await chrome.tabs.query({}); }catch(e){ tabs = []; } mine = findMine(tabs); }
    if(mine.length){
      const keep = mine[0];
      for(let i=1;i<mine.length;i++){ try{ await chrome.tabs.remove(mine[i].id); }catch(e){} }
      try{ await chrome.tabs.update(keep.id, { pinned: true, active: true }); }catch(e){}
      try{ if(keep.windowId != null) await chrome.windows.update(keep.windowId, { focused: true }); }catch(e){}
    } else {
      try{ await chrome.tabs.create({ url, pinned: true, active: true }); }catch(e){}
    }
  }catch(e){ try{ await logEvent("error","openUiTab fallo", String(e)); }catch(_){} }
}

function setupAlarm(){ chrome.alarms.create("poll", { periodInMinutes: POLL_MIN }); chrome.alarms.create("tx", { periodInMinutes: 1 }); chrome.alarms.create("ahk", { periodInMinutes: 5 }); }
setupAlarm();
checkAhkDependency("arranque-sw", true).then(st=>{ if(st && st.ok) runOperationalStartup("arranque-sw"); else openAhkUi(); });
chrome.runtime.onInstalled.addListener((details)=>{ setupAlarm(); updateBadge(null); const _prev=(details&&details.previousVersion)?details.previousVersion:null; const _reason=(details&&details.reason)?details.reason:"install"; chrome.storage.local.remove("hbSig"); logEvent("ok","cycle_start "+(_prev?("v"+_prev+" -> "):"")+"v"+VERSION+" ("+_reason+")",{prev:_prev,version:VERSION,reason:_reason},"system").then(()=>flushTelemetry("arranque")); checkAhkDependency("instalacion", true).then(st=>{ if(st && st.ok) runOperationalStartup("instalacion"); openAhkUi(); }); });
chrome.runtime.onStartup.addListener(()=>{ setupAlarm(); logEvent("info","Navegador iniciado, alarma activa (telemetria de desarrollo v"+VERSION+")",null,"system").then(()=>flushTelemetry("arranque")); checkAhkDependency("arranque-navegador", true).then(st=>{ if(st && st.ok) runOperationalStartup("arranque-navegador"); else openAhkUi(); }); });
chrome.alarms.onAlarm.addListener(a=>{ if(a.name === "poll"){ requireAhkReady("alarma-poll").then(ok=>{ if(ok){ runDupCleanupIfPending("alarma"); syncAllTabs("alarma"); } }); } else if(a.name === "tx"){ maybeHeartbeat("latido").then(()=>flushTelemetry("alarma")); } else if(a.name === "ahk"){ checkAhkDependency("alarma", true).then(st=>{ if(st && st.ok) runOperationalStartup("alarma-ahk-ok"); }); } });
chrome.notifications.onClicked && chrome.notifications.onClicked.addListener((id)=>{ if(id===AHK_NOTIFY_ID) { void openAhkUi(); } else { try{ chrome.runtime.openOptionsPage(); }catch(e){} } });
chrome.action.onClicked.addListener(()=>{ checkAhkDependency("click-extension", true); openUiTab(); });

// v3.10 - puerto keep-alive durante llamadas: mantiene vivo el service worker para que el
// cronometro y el watchdog sigan procesandose mientras dura la llamada.
chrome.runtime.onConnect.addListener(function(port){
  if(port.name !== "globo-live") return;
  port.onMessage.addListener(function(){ /* ping: mantiene vivo el SW */ });
  port.onDisconnect.addListener(function(){ void chrome.runtime.lastError; });
});

// ===== v3.20: VERIFICACION AHK 2.0 POR NATIVE MESSAGING =====
// La extension exige AHK 2.0 como dependencia ChromeDev y lo verifica con un host
// registrado en HKCU, sin elevacion. Los atajos in-page siguen existiendo como
// degradacion local, pero la UI avisa si AHK no esta detectado.

// ---- Estado activo/inactivo del sistema para el cronometro offline (chrome.idle) ----
try{
  chrome.idle.setDetectionInterval(AV_IDLE_SEC);
  chrome.idle.queryState(AV_IDLE_SEC, (s)=>{ _avActive = (s === "active"); });
  chrome.idle.onStateChanged.addListener((s)=>{ avSettle("idle:"+s).finally(()=>{ _avActive = (s === "active"); }); });
}catch(e){}