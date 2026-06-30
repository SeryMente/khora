// Orquestador always-on · Capa de Integración de CoMind (módulo globo de Demiurgo). Sustituye al service worker MV3 +
// chrome.alarms de v3.32. Cada ronda (port de syncAllTabs) hace, en segundo plano:
//   1) verifica sesion, 2) lee Call Log y mensual via fetch, 3) inserta delta en Notion,
//   4) lee el objetivo, 5) vuelca telemetria a Logos/Notion.
// Idempotencia: candado _roundBusy (port de _syncBusy) para no solapar rondas.
// Despliegue: como proceso long-running (PM2/contenedor) o como cron de GitHub Actions
// (GLOBO_RUN_ONCE=1 -> una ronda y salir). Ver README.
const C = require("./config");
const logos = require("./logos");
const log = logos.log;
const notion = require("./notion");
const globo = require("./globo");

let _roundBusy = false;
let _lastGoal = null;

async function runRound(reason){
  if(_roundBusy){ await log("info","Ronda solapada ignorada ("+(reason||"")+")", null, "system"); return; }
  _roundBusy = true;
  const t0 = Date.now();
  try{
    await log("info","Ronda de captura ("+(reason||"manual")+")", null, "background");
    if(!C.TOKEN){ await log("error","Falta NOTION_TOKEN (Secret). No puedo escribir a Notion.", null, "notion"); return; }
    const sess = await globo.checkGloboSession();
    if(sess === false){ await log("warn","Sesion no valida: omito esta ronda (renueva cookie/credenciales).", null, "session"); return; }
    try{ const g = await notion.fetchGoal(); if(g !== _lastGoal){ _lastGoal = g; await log("ok","Objetivo diario: "+g+" min", null, "notion"); } }catch(e){}
    const rMon = await globo.fetchMonthly("ronda").catch(e => ({ ok:false, reason:String(e) }));
    const rCall = await globo.fetchCallLog("ronda").catch(e => ({ ok:false, reason:String(e) }));
    await log("info","Ronda terminada en "+Math.round((Date.now()-t0)/1000)+"s (callLog="+(rCall&&rCall.ok?("+"+rCall.inserted+"/"+rCall.total):rCall&&rCall.reason)+", mensual="+(rMon&&rMon.ok?"ok":rMon&&rMon.reason)+")", null, "background");
  }catch(e){ await log("error","Ronda excepcion", String(e), "system"); }
  finally{ _roundBusy = false; try{ await logos.flush("ronda"); }catch(e){} }
}

async function main(){
  await log("ok","cycle_start "+C.VERSION, { version:C.VERSION, poll_min:C.POLL_MIN }, "system");
  if(process.env.GLOBO_RUN_ONCE){ await runRound("once"); await logos.flush("cierre"); return; }
  await runRound("arranque");
  setInterval(() => { runRound("intervalo"); }, C.POLL_MIN * 60 * 1000);
  setInterval(() => { logos.flush("latido"); }, 60 * 1000); // port del alarm "tx" (1 min)
}

if(require.main === module){
  main().catch(e => { console.error("fatal:", e); process.exit(1); });
}
module.exports = { runRound };
