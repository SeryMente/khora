// DEPENDENCIA DURA #2: ACCIONES DE LLAMADA (contestar video/audio, rechazar).
// En la extension esto vivia en los hotkeys (Alt+Shift+V/A/R) -> doCallAction -> clic en el
// DOM de la llamada entrante (selectores hkSelectors) y/o el puente AHK por Native Messaging.
// NO existe equivalente en nube pura: requiere actuar sobre la UI/telefono del interprete.
//
// Por NO-SIMULACION, este modulo NO inventa clics ni acciones. Es un PUENTE hacia un ejecutor
// LOCAL minimo (un agente en la maquina del interprete) que recibe la orden de Demiurgo y la
// ejecuta de verdad. Si no hay ejecutor configurado (GLOBO_LOCAL_EXECUTOR_URL vacio), las
// acciones quedan DESHABILITADAS y se reporta, en vez de simular.
//
// Alternativa que lo elimina del todo: si GLOBO HQ expone una API de acciones del lado
// interprete (a verificar con la agencia, ver doc §10), este modulo llamaria esa API y el
// residuo de escritorio desapareceria.
const C = require("./config");
const { log } = require("./logos");

const ACTIONS = new Set(["answer_video", "answer_audio", "reject"]);

async function callAction(action, meta){
  if(!ACTIONS.has(action)){ await log("warn","Accion de llamada no reconocida: "+action, null, "dependency"); return { ok:false, reason:"accion-desconocida" }; }
  if(!C.LOCAL_EXECUTOR_URL){
    await log("warn","Accion "+action+" SOLICITADA pero no hay ejecutor local configurado. No se simula (NO-SIMULACION). Configura GLOBO_LOCAL_EXECUTOR_URL o una API de la agencia.", null, "dependency");
    return { ok:false, reason:"sin-ejecutor" };
  }
  try{
    const res = await fetch(C.LOCAL_EXECUTOR_URL.replace(/\/$/,"") + "/call-action", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action, meta: meta || null, ts: Date.now(), from: C.VERSION }),
    });
    if(!res.ok){ await log("error","Ejecutor local respondio HTTP "+res.status+" para "+action, null, "dependency"); return { ok:false, status:res.status }; }
    const j = await res.json().catch(() => ({}));
    await log("ok","Accion "+action+" delegada al ejecutor local: "+(j.detail || "ok"), null, "dependency");
    return { ok:true, detail: j };
  }catch(e){ await log("error","No pude contactar al ejecutor local para "+action, String(e), "dependency"); return { ok:false, reason:String(e) }; }
}

module.exports = { callAction, ACTIONS };
