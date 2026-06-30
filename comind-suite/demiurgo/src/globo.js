// Cliente GLOBO. Port de checkGloboSession + bgFetchCallLog + bgFetchMonthly (background.js
// v3.32). La captura real NO es DOM: son fetch autenticados a endpoints JSON/HTML.
// DEPENDENCIA DURA #1 (sesion): en la extension la cookie la ponia el navegador
// (credentials:'include'). En nube la inyectamos via header Cookie (GLOBO_COOKIE) o, mejor,
// via login headless que la renueva (ver session.js / README). No se simula la sesion.
const C = require("./config");
const { bgStrip, bgNum, bgISO, bgParseRow } = require("./parsers");
const { insertCalls } = require("./notion");
const { log } = require("./logos");

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
// Cabeceras de sesion. Nota de portabilidad honesta: en Node (undici) redirect:'manual'
// devuelve la respuesta 3xx real (status 301/302), NO el 'opaqueredirect' del navegador;
// por eso aqui detectamos expiracion por 3xx/401/403 o por URL de login.
function sessionHeaders(extra){
  const h = Object.assign({ "Accept": "application/json, text/javascript, */*; q=0.01", "X-Requested-With": "XMLHttpRequest" }, extra || {});
  if(C.COOKIE) h["Cookie"] = C.COOKIE;
  return h;
}
function looksExpired(res){
  if(!res) return true;
  if(res.status === 401 || res.status === 403) return true;
  if(res.status >= 300 && res.status < 400) return true;
  if(res.status === 200 && res.url && /sign[_-]?in|log[_-]?in/i.test(res.url)) return true;
  return false;
}

async function checkGloboSession(){
  try{
    const res = await fetch(C.DASHBOARD_URL, { method:"GET", headers: sessionHeaders(), redirect:"manual", cache:"no-store" });
    const expired = looksExpired(res);
    if(expired) await log("warn","Sesion de Globo EXPIRADA o ausente: renueva la cookie/credenciales (Secret).", null, "session");
    return expired ? false : true;
  }catch(e){ await log("warn","checkGloboSession excepcion", String(e), "session"); return null; }
}

// Call Log completo via DataTables server-side (port fiel de bgFetchCallLog).
async function fetchCallLog(reason){
  try{
    const out = []; let start = 0; const PAGE = 1000, MAX = 100000; let draw = 1, total = null;
    while(true){
      const params = new URLSearchParams();
      params.set("draw", String(draw++));
      params.set("start", String(start));
      params.set("length", String(PAGE));
      const res = await fetch(C.CALLS_ENDPOINT + "?" + params.toString(), { method:"GET", headers: sessionHeaders(), redirect:"manual", cache:"no-store" });
      if(looksExpired(res)) return { ok:false, reason:"sesion" };
      if(!res.ok) return { ok:false, reason:"http "+res.status };
      let j; try{ j = await res.json(); }catch(e){ return { ok:false, reason:"no-json" }; }
      const data = (j && (j.data || j.aaData)) || [];
      for(let i=0;i<data.length;i++) out.push(data[i]);
      if(total === null) total = (j && (typeof j.recordsFiltered==="number"?j.recordsFiltered:j.recordsTotal)) || out.length;
      if(data.length < PAGE || out.length >= total || (start+PAGE) >= MAX) break;
      start += PAGE; await sleep(150);
    }
    if(!out.length) return { ok:false, reason:"vacio" };
    if(out[0] && (typeof out[0] !== "object" || Array.isArray(out[0]))) return { ok:false, reason:"forma-array" };
    const calls = out.map(bgParseRow).filter(c => c && c.id);
    await log("ok","Call Log leido en nube: "+calls.length+" filas ("+(reason||"")+")", null, "background");
    const r = await insertCalls(calls);
    return { ok:true, inserted:r.inserted, skipped:r.skipped, total: calls.length };
  }catch(e){ await log("warn","Call Log en nube fallo", String(e), "background"); return { ok:false, reason:String(e) }; }
}

// Mensual via HTML + regex sin DOMParser (port fiel de bgFetchMonthly).
async function fetchMonthly(reason){
  try{
    const res = await fetch(C.MONTHLY_URL, { method:"GET", headers: sessionHeaders(), redirect:"manual", cache:"no-store" });
    if(looksExpired(res)) return { ok:false, reason:"sesion" };
    if(!res.ok) return { ok:false, reason:"http "+res.status };
    const html = await res.text();
    const m = html.match(/details-table[\s\S]*?<tbody[\s\S]*?>([\s\S]*?)<\/tbody>/i);
    const body = m ? m[1] : html;
    const rows = []; const trRe = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi; let tr;
    while((tr = trRe.exec(body))){
      const tds = []; const tdRe = /<td[\s\S]*?>([\s\S]*?)<\/td>/gi; let td;
      while((td = tdRe.exec(tr[1]))) tds.push(bgStrip(td[1]));
      if(tds.length < 3) continue;
      const month = tds[0].replace(/\s+/g,"");
      const calls = bgNum(tds[1]); const mins = bgNum(tds[2]);
      if(month && /\d/.test(month)) rows.push({ month, calls: calls==null?null:calls, mins: mins==null?null:mins });
    }
    if(!rows.length) return { ok:false, reason:"sin-filas" };
    const cur = rows[0];
    if(cur) await log("ok","Mensual en nube: "+cur.month+" = "+cur.calls+" / "+cur.mins+" min", null, "background");
    return { ok:true, months: rows };
  }catch(e){ await log("warn","Mensual en nube fallo", String(e), "background"); return { ok:false, reason:String(e) }; }
}

module.exports = { checkGloboSession, fetchCallLog, fetchMonthly, looksExpired, sessionHeaders };

if(require.main === module){
  // `npm run session`: verifica la sesion sin tocar Notion.
  checkGloboSession().then(ok => { console.log("sesion globo:", ok); process.exit(ok ? 0 : 1); });
}
