// Logos = telemetria compartida de la suite CoMind. Port del par logEvent + cola TX de
// background.js v3.32 (enqueueTx/flushTelemetry/dead-letter/backoff), adaptado a Node.
// En la extension la cola vivia en chrome.storage.local; aqui vive en memoria + se vuelca a
// la base «Registro de actividad» de Notion. Mantiene el contrato de evento de v3.32.
const TX_MODS = ["background","livecall","availability","session","dedup","notion","content","mainworld","options","system","dependency"];
const TX_QUEUE_CAP = 2000, TX_BATCH = 12, TX_GAP_MS = 300, TX_BACKOFF_MAX = 5 * 60 * 1000, TX_DEAD_CAP = 50;

const _q = [];
const _dead = [];
let _seq = 0;
let _backoffUntil = 0, _backoff = 0, _txBusy = false;
let _notionSink = null; // inyectado por notion.js para evitar dependencia circular.

function setSink(fn){ _notionSink = fn; }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function txSev(level){ return ({ info:"INFO", ok:"OK", warn:"WARN", error:"ERROR" })[level] || "INFO"; }

function enqueueTx(entry){
  let ctx = entry.data;
  if(ctx != null && typeof ctx !== "string"){ try{ ctx = JSON.stringify(ctx); }catch(e){ ctx = String(ctx); } }
  ctx = (ctx == null ? "" : String(ctx)).slice(0, 1900);
  _q.push({ id: entry.id, t: entry.t, level: entry.level, mod: entry.mod, msg: String(entry.msg || "").slice(0,1900), ctx, eid: entry.t + "-" + entry.id });
  while(_q.length > TX_QUEUE_CAP) _q.shift();
}

// log(level,msg,data,mod): identico en intencion a logEvent() de v3.32.
async function log(level, msg, data, mod){
  const entry = {
    t: Date.now(), id: ++_seq, level: level || "info",
    msg: String(msg == null ? "" : msg), data: (data == null ? null : data),
    mod: (TX_MODS.indexOf(mod) >= 0 ? mod : "background"),
  };
  const tag = txSev(entry.level).padEnd(5);
  console.log(`[${new Date(entry.t).toISOString()}] ${tag} ${entry.mod}: ${entry.msg}` + (entry.data ? "  " + (typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data)) : ""));
  enqueueTx(entry);
  try{ if(level === "error" || level === "warn") await flush("urgente"); }catch(e){}
  return entry;
}

// Volcado por lotes a Notion con backoff exponencial y dead-letter (port de flushTelemetry).
async function flush(reason){
  if(_txBusy || !_notionSink) return;
  _txBusy = true;
  try{
    if(!_q.length) return;
    const now = Date.now();
    if(_backoffUntil && now < _backoffUntil) return;
    let hitBackoff = false;
    for(let i = 0; i < TX_BATCH && _q.length; i++){
      const tx = _q[0];
      const r = await _notionSink(tx); // {ok, status, transient}
      if(r && r.ok){ _q.shift(); }
      else if(r && r.transient){ hitBackoff = true; break; }
      else { _dead.push({ eid: tx.eid, status: r && r.status }); while(_dead.length > TX_DEAD_CAP) _dead.shift(); _q.shift(); }
      await sleep(TX_GAP_MS);
    }
    if(hitBackoff){ _backoff = Math.min(TX_BACKOFF_MAX, _backoff ? _backoff * 2 : 15000); _backoffUntil = Date.now() + _backoff; }
    else { _backoff = 0; _backoffUntil = 0; }
  } finally { _txBusy = false; }
}

module.exports = { log, flush, setSink, txSev, TX_MODS, _state: { queue: _q, dead: _dead } };
