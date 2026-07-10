// Cazagangas · shell.js (v3.0.0) — "El Recorrido" (train-ride UX)
// Rediseno UX/UI tipo TREN: el usuario avanza por ESTACIONES (escenas). Entre
// escenas hay PANTALLAS DE CARGA estilo The Sims con mensajes REALES del backend
// (lee cazagangas.runControl + mensajes czg-estado/czg-bloqueo) + tips utiles.
//
//   · shell.js sigue siendo el UNICO dueno de la superficie visible.
//   · El piso (cosecha/scoring/Notion/observatorio) NO se toca: mismas palancas
//     reales (CZG_cosechaAuto.correr, CG_SCORING.puntuarTodos, sincronizador Notion).
//   · Capa nueva = presentacion: recorrido lineal Anden -> Que cazar -> Cazar
//     (loading vivo) -> Puntuar (loading) -> Sincronizar (loading) -> La Mesa.
//   · Atras SIEMPRE libre; avanzar requiere completar la estacion (lineal-para-avanzar).
//   · La UI experta clasica (Mesa/Observatorio/Ajustes/Descubrir/Laboratorio) queda
//     intacta y accesible con el boton "Modo experto" — ninguna funcion se pierde.
//   · Lente de ROTACION RAPIDA: ordena/etiqueta por velocidad de venta esperada
//     (vender hoy o manana), no solo por score.
(function () {
  "use strict";
  var VER = "3.3.0";
  if (window.__CZ_SHELL__) return;
  window.__CZ_SHELL__ = true;

  var CFG="cazagangas.config", HAL="cazagangas.hallazgos", ENR="cazagangas.enriquecidos",
      SYN="cazagangas.synced", DESC="cazagangas.descubrimiento", OBS="cazagangas.observatorio",
      PIPE="cazagangas.pipeline", RUN="cazagangas.runControl";
  var LS_VIEW="cz.view", LS_SCENE="cz.scene", LS_EXPERT="cz.experto";
  var NB=String.fromCharCode(104,116,116,112,115,58,47,47,119,119,119,46,110,111,116,105,111,110,46,115,111,47);
  var KEEP_VISIBLE={"czg-toast":1};
  var PRE_BUSQ=['webcam logitech c920','webcam logitech c270','camara web','microfono usb','headset usb','audifonos con microfono','monitor 22','monitor 24','teclado mecanico','mouse logitech','router wifi','repetidor wifi','ssd 240gb','ssd 480gb','memoria ram ddr4','taladro','rotomartillo','herramienta','multimetro','mochila','maleta','botas impermeables','tenis nike','bicicleta','lote ropa','remate','urge vender','mudanza'];
  var PRE_CATS=['trabajo','perifericos','redes','componentes','herramienta','uso_personal','reventa_baja'];
  var PRE_DB="f038f642-18e5-4eb0-ac6f-b4118ea4f0b0";
  var LAB_IDS=["czg-dash","czg-desc","czg-sonda-panel","czg-espejo-panel"];

  // ---------- helpers ----------
  function el(t,a,h){ var e=document.createElement(t); if(a) for(var k in a) e.setAttribute(k,a[k]); if(h!=null) e.innerHTML=h; return e; }
  function byId(id){ try{ return document.getElementById(id); }catch(e){ return null; } }
  function qs(s,r){ try{ return (r||document).querySelector(s); }catch(e){ return null; } }
  function qsa(s,r){ try{ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }catch(e){ return []; } }
  function gl(keys){ return new Promise(function(r){ try{ chrome.storage.local.get(keys,function(o){ r(o||{}); }); }catch(e){ r({}); } }); }
  function sl(obj){ return new Promise(function(r){ try{ chrome.storage.local.set(obj,function(){ r(); }); }catch(e){ r(); } }); }
  function nKeys(o){ return o?Object.keys(o).length:0; }
  function asList(raw){ return Array.isArray(raw)?raw:(raw&&typeof raw==="object"?Object.keys(raw).map(function(k){return raw[k];}):[]); }
  function safe(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;"); }
  function normUrl(u){ return (u||"").split("?")[0].replace(/\/$/,""); }
  function mxn(n){ if(n==null||isNaN(n)) return "\u2014"; return "$"+Number(n).toLocaleString("es-MX"); }
  function num(v){ if(typeof v==="number") return v; var m=String(v==null?"":v).replace(/[^0-9]/g,""); return m?parseInt(m,10):null; }
  function log(){ try{ console.log.apply(console,["[CZG recorrido]"].concat([].slice.call(arguments))); }catch(e){} }
  function fire(selectors){ for(var i=0;i<selectors.length;i++){ var n=qs(selectors[i]); if(n){ try{ n.click(); return true; }catch(e){} } } return false; }
  function toast(msg){ var t=byId("cz-toast"); if(!t){ t=el("div",{id:"cz-toast"}); t.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0f1828;color:#fff;padding:11px 18px;border-radius:10px;font:600 13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:1200;opacity:0;transition:opacity .2s"; document.body.appendChild(t); } t.textContent=msg; t.style.opacity="1"; clearTimeout(t._h); t._h=setTimeout(function(){ t.style.opacity="0"; },2600); }

  function showFatal(e){ try{ var d=document.getElementById("cz-fatal")||document.createElement("div"); d.id="cz-fatal"; d.style.cssText="position:fixed;inset:0;z-index:2147483600;background:#0d1730;color:#eef2f9;font:14px/1.5 system-ui;padding:28px;overflow:auto"; d.innerHTML='<h2 style="margin:0 0 8px">Cazagangas no pudo iniciar</h2><div style="color:#b3bed3;margin-bottom:12px">Recarga la extensi\u00f3n. Detalle t\u00e9cnico abajo.</div><pre style="white-space:pre-wrap;color:#e0726a;font:12px/1.4 ui-monospace,Menlo,monospace">'+String((e&&e.stack)||e)+'</pre>'; if(document.body) document.body.appendChild(d); }catch(_){ } }

  // ---------- estado en memoria ----------
  var S={config:{},hal:{},enr:{},syn:{},desc:[],obs:{},pipe:{},run:{}};
  var view="mesa", filtro="Perseguir", sesion={logueado:null,dias:null}, cosecha="idle", bloqueo=null;
  var app=null, journeyEl=null, classicEl=null, obs=null, suppressObs=false;
  var scene="anden", modoExperto=false, builtScene=null, tipTimer=null, sceneTimer=null, tipIdx=0, journeyDir="fwd";
  var NAV=[
    {k:"mesa",ic:"\u25c6",t:"Mesa",sub:"decidir"},
    {k:"observatorio",ic:"\u25cc",t:"Observatorio",sub:"medir feed"},
    {k:"ajustes",ic:"\u2699",t:"Ajustes",sub:"qu\u00e9 cazar"},
    {k:"descubrir",ic:"\u2316",t:"Descubrir",sub:"mercados"},
    {k:"lab",ic:"\u25a3",t:"Laboratorio",sub:"avanzado"}
  ];
  var STATIONS=[
    {k:"anden",       n:1,t:"And\u00e9n",      ic:"\ud83d\ude89"},
    {k:"quecazar",    n:2,t:"Qu\u00e9 cazar",  ic:"\ud83c\udfaf"},
    {k:"cazar",       n:3,t:"Cazar",         ic:"\ud83d\udd0d"},
    {k:"puntuar",     n:4,t:"Puntuar",       ic:"\ud83d\udcca"},
    {k:"sincronizar", n:5,t:"Sincronizar",   ic:"\u2601\ufe0f"},
    {k:"mesa",        n:6,t:"La Mesa",       ic:"\u25c6"}
  ];
  // Tips estilo Sims, con el criterio de ROTACION RAPIDA (vender hoy/manana).
  var TIPS=[
    "Apunta a vender hoy o ma\u00f1ana: el capital que circula vale m\u00e1s que el margen atorado.",
    "Prefiere demanda constante sobre margen alto: lo que todos buscan se vende solo.",
    "Perif\u00e9ricos baratos (mouse, teclado, aud\u00edfonos, webcam) rotan rap\u00eddisimo.",
    "Cables y cargadores de celular: baratos, universales, salida casi inmediata.",
    "Necesidad inmediata vende sola: ventiladores, extensiones, focos, regletas.",
    "Antes de comprar preg\u00fantate: \u00bflo revendo en un d\u00eda o menos?",
    "No te enamores del margen: lo que importa es si hay comprador esperando.",
    "Evita muebles grandes y electr\u00f3nica cara o de nicho: rotan lento.",
    "Pide video funcionando antes de comprar: una prueba ahorra una p\u00e9rdida.",
    "Compra barato a la entrada: si deja poco pero sale r\u00e1pido, sirve.",
    "Bicis y patines econ\u00f3micos tienen demanda local constante.",
    "Consolas y videojuegos usados: solo a muy buen precio, se van r\u00e1pido.",
    "No metas todo el capital en una sola pieza sin salida clara.",
    "Lo que se vende en un d\u00eda te deja libre para la siguiente compra.",
    "Log\u00edstica f\u00e1cil = m\u00e1s ganancia real: si tienes que cruzar la ciudad, pi\u00e9nsalo.",
    "Revisa el precio de referencia: sin \u00e9l, no sabes si es ganga.",
    "Tres preguntas por candidato: \u00bfdemanda local? \u00bfreventa en un d\u00eda? \u00bfdeja algo?",
    "Capital peque\u00f1o que gira a diario supera al grande que duerme."
  ];

  // Tooltips de cada estacion: leidos en orden, explican TODO el proceso del sistema.
  var TT={
    anden:{t:"1 · Andén — preparar la corrida",d:"Punto de partida. Cazagangas verifica que tu sesión de Facebook esté activa, confirma la zona y cuántas búsquedas tienes listas, y fija el modo de corrida.\nModo comida: la cacería sigue aunque la ventana pierda el foco; solo se pausa si ocultas la pestaña.\nObjetivo de todo el recorrido: comprar para revender hoy o mañana. El criterio rector es rotación rápida, no margen máximo."},
    quecazar:{t:"2 · Qué cazar — definir la búsqueda",d:"Defines los términos que se rastrearán en Marketplace (uno por línea) y los parámetros de la corrida:\n• Umbral de ganga: percentil de precio bajo el cual una pieza se marca como ganga frente a sus comparables.\n• Máx. búsquedas por corrida: cuántos términos recorrer antes de parar.\n• Detener al salir de zona: corta si los resultados se alejan de tu ciudad.\nLos términos precargados ya vienen sesgados a categorías de rotación rápida (periféricos, cables, herramienta básica)."},
    cazar:{t:"3 · Cazar — cosecha humana",d:"El motor abre cada búsqueda y baja por el feed imitando a una persona: scroll con ritmo y pausas variables para no disparar los bloqueos de Facebook. Si el feed se atora, empuja con fuerza progresiva hasta cargar más.\nDe cada anuncio toma enlace, título y precio, y registra en el Observatorio cuántos vio, cuántos eran nuevos y por qué se detuvo cada término.\nLa pantalla refleja en vivo lo que pasa por dentro: término actual, anuncios hallados y scrolls."},
    puntuar:{t:"4 · Puntuar — de anuncio crudo a señal",d:"Convierte los anuncios cosechados en señales comparables. Agrupa por término, calcula mediana y percentiles de precio y descarta atípicos (precios imposibles o señuelos).\nCon eso clasifica cada pieza —Ganga, Buen precio, Justo o Caro— y estima el margen esperado.\nEs un cálculo local sobre tus propios datos: sin precio de referencia no hay veredicto."},
    sincronizar:{t:"5 · Sincronizar — guardar en Notion",d:"Sube a tu base de Hallazgos en Notion solo lo comprable: piezas con precio y score, sin atípicos y que aún no estén sincronizadas.\nAsí tu trabajo queda respaldado fuera del navegador y puedes filtrarlo y darle seguimiento desde Notion."},
    mesa:{t:"6 · La Mesa — decidir y actuar",d:"El tablero de decisión. Ordena los candidatos por rotación rápida (qué se vende hoy o mañana), no solo por score.\nUna capa de afinidad IA aprende de tu uso: cada vez que persigues o descartas algo, el modelo se ajusta y predice qué tan probable es que te interese (★ Afín).\nDesde aquí mueves cada pieza por el pipeline —Nuevo → Contactado → Comprado → Vendido— y abres el anuncio o el mensaje a Messenger con el texto listo."}
  };
  // ---- tooltips de estacion (flotantes; no se recortan por overflow) ----
  function ensureTipPop(){ var p=byId("czj-tip-pop"); if(!p){ p=el("div",{id:"czj-tip-pop",role:"tooltip","aria-hidden":"true"}); (document.body||document.documentElement).appendChild(p); } return p; }
  function showTipPop(target,k){ try{ var info=TT[k]; if(!info||!target) return; var p=ensureTipPop(); p.innerHTML='<div class="czj-tip-pop-t">'+safe(info.t)+'</div><div class="czj-tip-pop-d">'+safe(info.d)+'</div>'; p.setAttribute("aria-hidden","false"); p.style.visibility="hidden"; p.classList.add("show"); var r=target.getBoundingClientRect(); var pw=p.offsetWidth, ph=p.offsetHeight; var left=Math.round(r.left+r.width/2-pw/2); left=Math.max(10,Math.min(left,(window.innerWidth||pw)-pw-10)); var top=Math.round(r.bottom+10); if(top+ph>(window.innerHeight||ph)-8){ var up=Math.round(r.top-ph-10); top=up>8?up:8; } p.style.left=left+"px"; p.style.top=top+"px"; p.style.visibility=""; }catch(e){} }
  function hideTipPop(){ try{ var p=byId("czj-tip-pop"); if(p){ p.classList.remove("show"); p.setAttribute("aria-hidden","true"); } }catch(e){} }

  // ---------- ocultar el piso (vivo, invisible) ----------
  function hideLegacy(){
    if(!document.body) return;
    Array.prototype.slice.call(document.body.children).forEach(function(c){
      if(c===app) return;
      var tag=(c.tagName||"").toUpperCase();
      if(tag==="SCRIPT"||tag==="STYLE"||tag==="LINK") return;
      if(c.id && KEEP_VISIBLE[c.id]) return;
      if(c.id==="cz-toast"||c.id==="cz-pal-bg") return;
      if(c.getAttribute && c.getAttribute("data-cz-lab")==="1") return;
      if(c.style && c.style.display!=="none"){ c.style.display="none"; c.setAttribute("data-cz-hid","1"); }
    });
  }

  // ================= CONSTRUCCION =================
  function build(){
    if(byId("cz-app")||!document.body) return;
    app=el("div",{id:"cz-app"});

    // ----- CAPA RECORRIDO (default) -----
    journeyEl=el("div",{id:"czj-root"});
    journeyEl.appendChild(el("header",{id:"czj-rail"}));
    journeyEl.appendChild(el("main",{id:"czj-stage"}));
    app.appendChild(journeyEl);

    // ----- CAPA CLASICA (modo experto, oculta) -----
    classicEl=el("div",{id:"cz-classic"});
    var top=el("header",{id:"cz-top"});
    top.appendChild(el("div",{id:"cz-brand"},
      '<span id="cz-logo">\u25c6</span><div><div id="cz-name">Cazagangas</div>'+
      '<div id="cz-tag">Modo experto \u00b7 v'+VER+'</div></div>'));
    top.appendChild(el("div",{id:"cz-vitals"}));
    top.appendChild(el("nav",{id:"cz-nav","aria-label":"Navegaci\u00f3n principal"}));
    var acts=el("div",{id:"cz-actions"});
    var back=el("button",{id:"cz-backjourney","class":"cz-kbtn",type:"button"},"\u2190 Recorrido");
    back.addEventListener("click",function(){ setExperto(false); });
    var cta=el("button",{id:"cz-cta","class":"cz-cta",type:"button"},"\u25b6 Siguiente");
    cta.addEventListener("click",onCta);
    var kb=el("button",{id:"cz-palbtn","class":"cz-kbtn",type:"button",title:"Paleta de comandos"},"Comandos<kbd>\u2318K</kbd>");
    kb.addEventListener("click",openPal);
    acts.appendChild(back); acts.appendChild(cta); acts.appendChild(kb); top.appendChild(acts);
    classicEl.appendChild(top);
    classicEl.appendChild(el("div",{id:"cz-banners"}));
    classicEl.appendChild(el("div",{id:"cz-flow"}));
    var body=el("main",{id:"cz-body"});
    ["mesa","observatorio","ajustes","descubrir","lab"].forEach(function(v){ body.appendChild(el("section",{id:"cz-v-"+v,"class":"cz-view"})); });
    classicEl.appendChild(body);
    classicEl.style.display="none";
    app.appendChild(classicEl);

    // ----- PALETA (compartida) -----
    var palbg=el("div",{id:"cz-pal-bg"});
    var pal=el("div",{id:"cz-pal"});
    var inp=el("input",{id:"cz-pal-inp",type:"text",placeholder:"Buscar comando\u2026 (cazar, puntuar, sincronizar, mesa\u2026)",autocomplete:"off",spellcheck:"false"});
    pal.appendChild(inp); pal.appendChild(el("div",{id:"cz-pal-list"}));
    palbg.appendChild(pal); app.appendChild(palbg);
    palbg.addEventListener("click",function(e){ if(e.target===palbg) closePal(); });
    inp.addEventListener("input",function(){ renderPal(inp.value); });
    inp.addEventListener("keydown",onPalKey);

    document.body.insertBefore(app, document.body.firstChild);
    document.addEventListener("keydown",onGlobalKey,true);

    var sv=null; try{ sv=localStorage.getItem(LS_VIEW); }catch(e){}
    view=(sv&&["mesa","observatorio","ajustes","descubrir","lab"].indexOf(sv)>=0)?sv:"mesa";
    var sc=null; try{ sc=localStorage.getItem(LS_SCENE); }catch(e){}
    scene=(sc&&sceneIndex(sc)>=0)?sc:"anden";
    var ex=null; try{ ex=localStorage.getItem(LS_EXPERT); }catch(e){}
    modoExperto=(ex==="1");
  }

  // ================= CARGA DE ESTADO =================
  function refresh(){
    return gl([CFG,HAL,ENR,SYN,DESC,OBS,PIPE,RUN]).then(function(o){
      S.config=o[CFG]||{}; S.hal=o[HAL]||{}; S.enr=o[ENR]||{}; S.syn=o[SYN]||{};
      S.desc=asList(o[DESC]).filter(function(x){ return x&&x.term; });
      S.obs=o[OBS]||{}; S.pipe=o[PIPE]||{}; S.run=o[RUN]||{};
      if(!Array.isArray(S.config.busquedas)||!S.config.busquedas.length){ S.config=Object.assign({},S.config,{zona:S.config.zona||"queretaro",busquedas:PRE_BUSQ.slice(),categoriasActivas:PRE_CATS.slice(),umbral:S.config.umbral!=null?S.config.umbral:20,pararFueraZona:S.config.pararFueraZona!==false,modoComida:S.config.modoComida!==false,maxBusquedas:S.config.maxBusquedas||28,dbId:S.config.dbId||PRE_DB}); }
      renderAll();
    });
  }
  function renderAll(){
    try{
      if(modoExperto){ renderVitals(); renderNav(); renderFlow(); renderBanners(); renderBody(); syncCtaLabel(); }
      else { renderJourney(); }
    }catch(e){ log("render err",e); }
  }

  // ---------- metricas honestas ----------
  function metrics(){
    var halArr=asList(S.hal);
    var cosechados=halArr.length;
    var puntuados=halArr.filter(function(h){ return h&&h.score!=null; }).length;
    var enNotion=nKeys(S.syn);
    var enrArr=asList(S.enr);
    var perseguir=enrArr.filter(function(r){ return r&&r.veredicto==="Perseguir"; }).length;
    var sinPuntuar = cosechados - puntuados;
    var puntuableSinSync = halArr.filter(function(h){ return h&&h.score!=null&&h.precioNum!=null&&!h.atipico&&!S.syn[h.id]; }).length;
    var pc=pipelineCounts();
    return {cosechados:cosechados,puntuados:puntuados,enNotion:enNotion,perseguir:perseguir,sinPuntuar:sinPuntuar,pendSync:puntuableSinSync,configurado:!!(S.config.busquedas&&S.config.busquedas.length),contactados:pc.Contactado||0,comprados:pc.Comprado||0,vendidos:pc.Vendido||0,descartados:pc.Descartado||0};
  }

  // ================= EL RECORRIDO (TREN) =================
  function sceneIndex(k){ for(var i=0;i<STATIONS.length;i++){ if(STATIONS[i].k===k) return i; } return -1; }
  function sceneDone(k){
    var m=metrics();
    if(k==="anden") return true;
    if(k==="quecazar") return m.configurado;
    if(k==="cazar") return m.cosechados>0 || /completado|detenido_final|detenido|bloqueado/.test(String(S.run.estado||""));
    if(k==="puntuar") return m.cosechados>0 && m.sinPuntuar===0;
    if(k==="sincronizar") return m.enNotion>0 || m.pendSync===0;
    if(k==="mesa") return false;
    return false;
  }
  function canGo(target){
    var ci=sceneIndex(scene), ti=sceneIndex(target);
    if(ti<0) return false;
    if(ti<=ci) return true;                 // atras o misma: SIEMPRE libre
    if(ti===ci+1) return sceneDone(scene);  // avanzar: solo si la estacion actual esta lista
    return false;
  }
  function clearSceneTimers(){ if(tipTimer){ clearInterval(tipTimer); tipTimer=null; } if(sceneTimer){ clearInterval(sceneTimer); sceneTimer=null; } }
  function goScene(k,opts){
    opts=opts||{};
    if(!opts.force && !canGo(k)){
      if(k==="cazar"&&!metrics().configurado){ toast("Configura al menos una b\u00fasqueda primero."); goScene("quecazar",{force:true}); return; }
      toast("Completa esta estaci\u00f3n antes de avanzar."); return;
    }
    journeyDir=(sceneIndex(k)<sceneIndex(scene))?"back":"fwd";
    scene=k; try{ localStorage.setItem(LS_SCENE,k); }catch(e){}
    builtScene=null; clearSceneTimers();
    try{ if(window.CZ_TEL) CZ_TEL.log("recorrido","info","escena",{escena:k,dir:journeyDir}); }catch(e){}
    renderJourney();
  }
  function ensureJourneyVisible(){ if(journeyEl) journeyEl.style.display=""; if(classicEl) classicEl.style.display="none"; }
  function renderJourney(){
    ensureJourneyVisible();
    try{ renderRail(); }catch(e){ log("rail err",e); }
    try{
      if(builtScene!==scene){ clearSceneTimers(); buildScene(scene); builtScene=scene; }
      else lightUpdateScene(scene);
    }catch(e){ log("scene err",e); var st=byId("czj-stage"); if(st&&!st.innerHTML){ st.innerHTML='<div class="czj-scene"><div style="padding:24px;color:#b3bed3">No pude dibujar esta estaci\u00f3n. Abre <b>Modo experto</b> o recarga la extensi\u00f3n.</div></div>'; } }
  }

  function telePin(){ try{ if(!window.CZ_TEL||!CZ_TEL.health) return ""; var h=CZ_TEL.health()||{}; var c=h.cola||0; return '<span class="czj-tele '+(h.ok?"live":"warn")+'" title="Telemetr\u00eda '+safe(h.estado||"")+'">tel '+c+'</span>'; }catch(e){ return ""; } }
  function railStatusLine(){
    var m=metrics();
    var ses;
    if(sesion.logueado===false) ses='<span class="czj-pin bad">Sin sesi\u00f3n FB</span>';
    else if(sesion.logueado===true){ var d=sesion.dias; var dt=(d==null)?"":(d>=1?("~"+Math.round(d)+"d"):("~"+Math.round(d*24)+"h")); ses='<span class="czj-pin '+(d!=null&&d<3?"warn":"ok")+'">Sesi\u00f3n '+dt+'</span>'; }
    else ses='<span class="czj-pin">Sesi\u00f3n \u2014</span>';
    var comida='<span class="czj-pin '+(S.config.modoComida!==false?"ok":"warn")+'">'+(S.config.modoComida!==false?"Modo comida":"Foco estricto")+'</span>';
    return ses+comida+
      '<span class="czj-pin">'+m.cosechados+' cosechados</span>'+
      '<span class="czj-pin">'+m.puntuados+' puntuados</span>'+
      '<span class="czj-pin">'+m.enNotion+' en Notion</span>'+
      '<span class="czj-pin '+(m.perseguir>0?"ok":"")+'">'+m.perseguir+' perseguir</span>'+telePin();
  }
  function renderRail(){
    var r=byId("czj-rail"); if(!r) return; hideTipPop(); var ci=sceneIndex(scene);
    var brand='<div class="czj-brand"><span class="czj-logo">\u25c6</span><div><div class="czj-name">Cazagangas</div><div class="czj-tag">El Recorrido \u00b7 v'+VER+'</div></div></div>';
    var track='<div class="czj-track">';
    STATIONS.forEach(function(s,i){
      var st=(i<ci)?"past":(i===ci?"now":"future");
      var done=sceneDone(s.k);
      var cls="czj-stop "+st+((done&&i!==ci)?" done":"");
      var clickable=(i<=ci+1)&&(i<=ci||sceneDone(scene));
      track+='<button class="'+cls+'" type="button" data-scene="'+s.k+'"'+(clickable?"":" disabled")+'>'+
        '<span class="czj-stop-ic">'+(st==="past"?"\u2713":s.ic)+'</span>'+
        '<span class="czj-stop-t">'+safe(s.t)+'</span></button>';
      if(i<STATIONS.length-1) track+='<span class="czj-link '+(i<ci?"on":"")+'"></span>';
    });
    track+='</div>';
    var tools='<div class="czj-tools"><button id="czj-busq-btn" class="czj-tbtn go" type="button">\ud83c\udfaf B\u00fasquedas</button>'+
      '<button id="czj-pal" class="czj-tbtn" type="button">Comandos <kbd>\u2318K</kbd></button>'+
      '<button id="czj-experto" class="czj-tbtn" type="button">Modo experto</button></div>';
    r.innerHTML=brand+track+tools+'<div class="czj-status">'+railStatusLine()+'</div>';
    qsa("#czj-rail .czj-stop").forEach(function(b){ var k=b.getAttribute("data-scene"); b.addEventListener("click",function(){ goScene(k); }); b.addEventListener("mouseenter",function(){ showTipPop(b,k); }); b.addEventListener("mouseleave",hideTipPop); b.addEventListener("focus",function(){ showTipPop(b,k); }); b.addEventListener("blur",hideTipPop); });
    var pe=byId("czj-pal"); if(pe) pe.addEventListener("click",openPal);
    var ex=byId("czj-experto"); if(ex) ex.addEventListener("click",function(){ setExperto(true); });
    var bb=byId("czj-busq-btn"); if(bb) bb.addEventListener("click",function(){ goScene("quecazar",{force:true}); setTimeout(function(){ var t=byId("czj-busq"); if(t){ try{ t.focus(); t.scrollIntoView({block:"center",behavior:"smooth"}); }catch(e){} } },140); });
  }

  function navBtns(prevK,nextK,nextLabel,nextFn){
    var wrap=el("div",{"class":"czj-nav"});
    if(prevK){ var b=el("button",{"class":"czj-btn ghost",type:"button"},"\u2190 Atr\u00e1s"); b.addEventListener("click",function(){ goScene(prevK,{force:true}); }); wrap.appendChild(b); }
    else wrap.appendChild(el("span",{}));
    if(nextK||nextFn){ var nb=el("button",{"class":"czj-btn primary",type:"button"},nextLabel||"Siguiente \u2192"); nb.addEventListener("click",function(){ if(nextFn) nextFn(); else goScene(nextK); }); wrap.appendChild(nb); }
    else wrap.appendChild(el("span",{}));
    return wrap;
  }

  function buildScene(k){
    var st=byId("czj-stage"); if(!st) return; st.innerHTML=""; st.scrollTop=0; try{ st.setAttribute("data-dir",journeyDir); }catch(e){}
    if(k==="anden") buildAnden(st);
    else if(k==="quecazar") buildQueCazar(st);
    else if(k==="cazar") buildCazar(st);
    else if(k==="puntuar") buildLoadingAction(st,"puntuar");
    else if(k==="sincronizar") buildLoadingAction(st,"sincronizar");
    else if(k==="mesa") buildMesaScene(st);
  }
  function lightUpdateScene(k){
    if(k==="cazar") updateCazarProgress();
    else if(k==="mesa"){ var st=byId("czj-stage"); if(st){ st.innerHTML=""; buildMesaScene(st); } }
  }

  // ---- tips rotativos ----
  function startTips(elemId){
    var n=byId(elemId); if(!n) return; tipIdx=Math.floor(Math.random()*TIPS.length);
    n.textContent=TIPS[tipIdx%TIPS.length];
    if(tipTimer) clearInterval(tipTimer);
    tipTimer=setInterval(function(){ var t=byId(elemId); if(!t){ clearInterval(tipTimer); tipTimer=null; return; } tipIdx++; t.style.opacity="0"; setTimeout(function(){ t.textContent=TIPS[tipIdx%TIPS.length]; t.style.opacity="1"; },220); },4600);
  }
  function loaderBlock(title,sub){
    return '<div class="czj-load">'+
      '<div class="czj-train"><span>\ud83d\ude82</span><i></i><i></i><i></i></div>'+
      '<div class="czj-load-title">'+safe(title)+'</div>'+
      '<div class="czj-backend" id="czj-backend">'+safe(sub||"")+'</div>'+
      '<div class="czj-tipbox"><span class="czj-tip-k">\u00bfSab\u00edas que\u2026?</span><div class="czj-tip" id="czj-tip"></div></div>'+
    '</div>';
  }

  // ---- ESCENA 1: Anden de salida ----
  function buildAnden(st){
    var m=metrics(), c=S.config||{};
    var ses = sesion.logueado===false?'<b class="bad">Sin sesi\u00f3n \u2014 inicia en Facebook</b>':(sesion.logueado===true?'<b class="ok">Activa</b>':'<b>Verificando\u2026</b>');
    var card=el("div",{"class":"czj-scene"});
    card.innerHTML='<div class="czj-eyebrow">ESTACI\u00d3N 1 \u00b7 AND\u00c9N DE SALIDA</div>'+
      '<h1 class="czj-h1">Bienvenido al recorrido</h1>'+
      '<p class="czj-lead">Te llevo paso a paso: <b>configurar \u2192 cazar \u2192 puntuar \u2192 sincronizar \u2192 decidir</b>. '+
      'Entre cada paso ver\u00e1s qu\u00e9 ocurre por dentro. Puedes ir <b>atr\u00e1s y adelante</b> cuando quieras.</p>'+
      '<div class="czj-checks">'+
        '<div class="czj-check"><span>Sesi\u00f3n de Facebook</span>'+ses+'</div>'+
        '<div class="czj-check"><span>Zona</span><b>'+safe(c.zona||"queretaro")+'</b></div>'+
        '<div class="czj-check"><span>B\u00fasquedas listas</span><b>'+(m.configurado?(c.busquedas.length+" t\u00e9rminos"):"sin configurar")+'</b></div>'+
        '<div class="czj-check"><span>Modo</span><b>'+(c.modoComida!==false?"Comida (corre largo)":"Foco estricto")+'</b></div>'+
      '</div>'+
      '<div class="czj-objetivo"><b>Objetivo de esta corrida:</b> comprar para <b>vender el mismo d\u00eda o al d\u00eda siguiente</b>. Criterio = <b>rotaci\u00f3n r\u00e1pida</b>, no margen m\u00e1ximo.</div>';
    st.appendChild(card);
    if(sesion.logueado===false){
      var lg=el("button",{"class":"czj-btn",type:"button",style:"margin-top:6px"},"Iniciar sesi\u00f3n en Facebook"); lg.addEventListener("click",doLogin); st.appendChild(lg);
    }
    st.appendChild(navBtns(null,"quecazar","Empezar recorrido \u2192",function(){ goScene("quecazar",{force:true}); }));
  }

  // ---- ESCENA 2: Que cazar ----
  function buildQueCazar(st){
    var c=S.config||{};
    var card=el("div",{"class":"czj-scene"});
    card.innerHTML='<div class="czj-eyebrow">ESTACI\u00d3N 2 \u00b7 QU\u00c9 CAZAR</div>'+
      '<h1 class="czj-h1">Dile qu\u00e9 buscar</h1>'+
      '<p class="czj-lead">Estos t\u00e9rminos se rastrear\u00e1n en Marketplace. Por defecto vienen precargados con categor\u00edas de <b>rotaci\u00f3n r\u00e1pida</b>.</p>';
    var form=el("div",{"class":"czj-form"});
    form.innerHTML=
      '<div class="czj-field"><label>Zona</label><input id="czj-zona" type="text" value="'+safe(c.zona||"queretaro")+'" placeholder="queretaro"></div>'+
      '<div class="czj-field"><label>B\u00fasquedas (una por l\u00ednea)</label><textarea id="czj-busq" rows="7">'+safe((Array.isArray(c.busquedas)&&c.busquedas.length?c.busquedas:PRE_BUSQ).join("\n"))+'</textarea></div>'+
      '<div class="czj-field-row">'+
        '<div class="czj-field"><label>Umbral de ganga (percentil)</label><input id="czj-umbral" type="number" min="1" max="50" value="'+(c.umbral!=null?c.umbral:20)+'"></div>'+
        '<div class="czj-field"><label>M\u00e1x. b\u00fasquedas por corrida</label><input id="czj-maxb" type="number" min="1" max="28" value="'+(c.maxBusquedas||28)+'"></div>'+
      '</div>'+
      '<label class="czj-toggle"><input id="czj-fuera" type="checkbox"'+(c.pararFueraZona!==false?" checked":"")+'> Detener al salir de la zona</label>'+
      '<label class="czj-toggle"><input id="czj-comida" type="checkbox"'+(c.modoComida!==false?" checked":"")+'> Modo comida (sigue aunque la ventana pierda foco)</label>';
    card.appendChild(form);
    st.appendChild(card);
    var nav=el("div",{"class":"czj-nav"});
    var back=el("button",{"class":"czj-btn ghost",type:"button"},"\u2190 Atr\u00e1s"); back.addEventListener("click",function(){ goScene("anden",{force:true}); }); nav.appendChild(back);
    var go=el("button",{"class":"czj-btn primary",type:"button"},"Confirmar y cazar \u2192");
    go.addEventListener("click",function(){ guardarConfig().then(function(){ doCazar(); goScene("cazar",{force:true}); }); });
    nav.appendChild(go);
    st.appendChild(nav);
  }
  function guardarConfig(){
    var zona=(byId("czj-zona")&&byId("czj-zona").value||"").trim();
    var busquedas=((byId("czj-busq")&&byId("czj-busq").value)||"").split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
    var umbral=parseInt(byId("czj-umbral")&&byId("czj-umbral").value,10)||20;
    var maxb=parseInt(byId("czj-maxb")&&byId("czj-maxb").value,10)||28; maxb=Math.max(1,Math.min(28,maxb));
    var pararFueraZona=byId("czj-fuera")?!!byId("czj-fuera").checked:true;
    var modoComida=byId("czj-comida")?!!byId("czj-comida").checked:true;
    if(!busquedas.length) busquedas=PRE_BUSQ.slice();
    var merged=Object.assign({},S.config,{zona:zona||"queretaro",busquedas:busquedas,umbral:umbral,maxBusquedas:maxb,pararFueraZona:pararFueraZona,modoComida:modoComida});
    S.config=merged;
    return sl({"cazagangas.config":merged});
  }

  // ---- ESCENA 3: Cazar (loading VIVO con telemetria real) ----
  function buildCazar(st){
    var card=el("div",{"class":"czj-scene"});
    card.innerHTML='<div class="czj-eyebrow">ESTACI\u00d3N 3 \u00b7 LA CACER\u00cdA</div>'+
      '<h1 class="czj-h1">Cazando en Marketplace</h1>'+
      loaderBlock("Abriendo b\u00fasquedas y cosechando anuncios\u2026","Preparando la cacer\u00eda\u2026")+
      '<div class="czj-progress"><div class="czj-bar"><i id="czj-bar-fill"></i></div><div class="czj-progress-meta" id="czj-progress-meta">\u2014</div></div>'+
      '<div class="czj-hint">Mant\u00e9n la ventana de Facebook al frente (o deja el <b>modo comida</b> activo). Esta pantalla refleja lo que ocurre por dentro, en vivo.</div>';
    st.appendChild(card);
    var nav=el("div",{"class":"czj-nav"});
    var back=el("button",{"class":"czj-btn ghost",type:"button"},"\u2190 Atr\u00e1s"); back.addEventListener("click",function(){ goScene("quecazar",{force:true}); }); nav.appendChild(back);
    var go=el("button",{id:"czj-cazar-next","class":"czj-btn primary",type:"button",disabled:"disabled"},"Siguiente: Puntuar \u2192");
    go.addEventListener("click",function(){ goScene("puntuar",{force:true}); }); nav.appendChild(go);
    st.appendChild(nav);
    startTips("czj-tip");
    updateCazarProgress();
    if(sceneTimer) clearInterval(sceneTimer);
    sceneTimer=setInterval(function(){ gl([RUN,HAL]).then(function(o){ S.run=o[RUN]||{}; S.hal=o[HAL]||{}; updateCazarProgress(); }); },1300);
  }
  function updateCazarProgress(){
    var be=byId("czj-backend"), bar=byId("czj-bar-fill"), meta=byId("czj-progress-meta"), nx=byId("czj-cazar-next");
    var r=S.run||{}, m=metrics();
    var estado=String(r.estado||(cosecha==="corriendo"?"navegando":""));
    var line="", pct=0;
    if(bloqueo){ line="\u26d4 Bloqueo de seguridad: "+safe(bloqueo)+". Se detuvo para no escalar."; }
    else if(estado==="iniciando"){ line="Preparando la cacer\u00eda\u2026"; pct=4; }
    else if(estado==="navegando"){ line="Navegando \u00ab"+safe(r.termino||"")+"\u00bb \u00b7 b\u00fasqueda "+(r.indice||0)+"/"+(r.totalTerminos||"?"); pct=r.totalTerminos?Math.round((r.indice-0.5)/r.totalTerminos*100):10; }
    else if(estado==="termino_ok"){ line="\u00ab"+safe(r.termino||"")+"\u00bb listo \u00b7 "+(r.encontrados||0)+" anuncios \u00b7 "+(r.scrolls||0)+" scrolls"+(r.stopReason?(" \u00b7 corte: "+safe(r.stopReason)):""); pct=r.totalTerminos?Math.round(r.indice/r.totalTerminos*100):20; }
    else if(estado==="detenido"){ line="\u275a\u275a Detenido en \u00ab"+safe(r.termino||"")+"\u00bb: "+safe(r.motivo||"")+"."; }
    else if(estado==="detenido_final"){ line="\u275a\u275a La secuencia se detuvo: una b\u00fasqueda no cerr\u00f3 bien. Ya puedes continuar con lo cosechado."; pct=100; }
    else if(estado==="bloqueado"){ line="\u26d4 Facebook pidi\u00f3 verificaci\u00f3n. Res\u00fa\u00e9lvelo y reintenta m\u00e1s tarde."; }
    else if(estado==="completado"){ line="\u2705 Cacer\u00eda completa \u00b7 "+(r.encontrados||m.cosechados||0)+" anuncios cosechados."; pct=100; }
    else if(m.cosechados>0){ line="Cosecha disponible \u00b7 "+m.cosechados+" anuncios. Puedes continuar."; pct=100; }
    else { line="Esperando a que empiece la cosecha\u2026 si no abri\u00f3 Marketplace, revisa tu sesi\u00f3n."; pct=2; }
    if(be) be.innerHTML=line+'<br><span class="czj-backend-sub">cosechados: '+m.cosechados+' \u00b7 puntuados: '+m.puntuados+'</span>';
    if(bar) bar.style.width=Math.max(2,Math.min(100,pct))+"%";
    if(meta) meta.textContent=(r.indice&&r.totalTerminos)?("b\u00fasqueda "+r.indice+" de "+r.totalTerminos):(m.cosechados+" anuncios");
    var listo = sceneDone("cazar");
    if(nx){ if(listo){ nx.removeAttribute("disabled"); } else { nx.setAttribute("disabled","disabled"); } }
    var train=qs("#czj-stage .czj-train"); if(train){ if(cosecha==="corriendo"&&!bloqueo) train.classList.add("go"); else train.classList.remove("go"); }
  }

  // ---- ESCENAS 4 y 5: acciones rapidas con loading honesto ----
  function buildLoadingAction(st,kind){
    var conf = (kind==="puntuar")?{
      eyebrow:"ESTACI\u00d3N 4 \u00b7 PUNTUAR", h1:"Puntuando los hallazgos",
      title:"Convirtiendo anuncios crudos en se\u00f1ales comparables\u2026",
      phases:["Agrupando comparables por t\u00e9rmino\u2026","Calculando medianas y percentiles\u2026","Detectando precios at\u00edpicos\u2026","Etiquetando gangas y calculando margen\u2026"],
      prev:"cazar", next:"sincronizar", nextLabel:"Siguiente: Sincronizar \u2192", run:doPuntuar
    }:{
      eyebrow:"ESTACI\u00d3N 5 \u00b7 SINCRONIZAR", h1:"Sincronizando a Notion",
      title:"Subiendo lo comprable a tu base de Hallazgos\u2026",
      phases:["Filtrando lo accionable\u2026","Evitando duplicados por ID\u2026","Enviando a Notion\u2026","Confirmando filas guardadas\u2026"],
      prev:"puntuar", next:"mesa", nextLabel:"Siguiente: La Mesa \u2192", run:doSincronizar
    };
    var card=el("div",{"class":"czj-scene"});
    card.innerHTML='<div class="czj-eyebrow">'+conf.eyebrow+'</div><h1 class="czj-h1">'+safe(conf.h1)+'</h1>'+
      loaderBlock(conf.title,conf.phases[0])+
      '<div class="czj-result" id="czj-result" style="display:none"></div>';
    st.appendChild(card);
    var nav=el("div",{"class":"czj-nav"});
    var back=el("button",{"class":"czj-btn ghost",type:"button"},"\u2190 Atr\u00e1s"); back.addEventListener("click",function(){ goScene(conf.prev,{force:true}); }); nav.appendChild(back);
    var go=el("button",{id:"czj-act-next","class":"czj-btn primary",type:"button",disabled:"disabled"},conf.nextLabel);
    go.addEventListener("click",function(){ goScene(conf.next,{force:true}); }); nav.appendChild(go);
    st.appendChild(nav);
    startTips("czj-tip");

    var antes=metrics();
    try{ conf.run(); }catch(e){ log("run "+kind,e); }
    // Coreografia de fases (legibilidad), el trabajo real corre en paralelo.
    var ph=0; var be=byId("czj-backend");
    var phaseTimer=setInterval(function(){ ph++; var b=byId("czj-backend"); if(!b){ clearInterval(phaseTimer); return; } b.textContent=conf.phases[Math.min(ph,conf.phases.length-1)]; if(ph>=conf.phases.length-1) clearInterval(phaseTimer); },650);
    // Espera a que el estado real cambie (con piso de tiempo para que se lea).
    var t0=Date.now(); var floorMs=(kind==="puntuar")?1700:2400; var maxMs=(kind==="puntuar")?9000:20000;
    if(sceneTimer) clearInterval(sceneTimer);
    sceneTimer=setInterval(function(){
      gl([HAL,SYN]).then(function(o){
        S.hal=o[HAL]||{}; S.syn=o[SYN]||{}; var m=metrics(); var elapsed=Date.now()-t0;
        var done = (kind==="puntuar")?(m.sinPuntuar===0&&m.cosechados>0):(m.enNotion>antes.enNotion||m.pendSync===0);
        if((done&&elapsed>=floorMs)||elapsed>=maxMs){
          clearInterval(sceneTimer); sceneTimer=null; clearInterval(phaseTimer);
          mostrarResultadoAccion(kind,antes,m,elapsed>=maxMs&&!done);
        }
      });
    },500);
  }
  function mostrarResultadoAccion(kind,antes,m,timedOut){
    var load=qs("#czj-stage .czj-load"); if(load) load.style.display="none";
    var res=byId("czj-result"); var nx=byId("czj-act-next");
    var html="";
    if(kind==="puntuar"){
      html='<div class="czj-result-ic">\ud83d\udcca</div><h2>Hallazgos puntuados</h2>'+
        '<div class="czj-result-stats"><span><b>'+m.puntuados+'</b> puntuados</span><span><b>'+m.cosechados+'</b> cosechados</span><span><b>'+m.perseguir+'</b> con se\u00f1al</span></div>'+
        (timedOut?'<p class="czj-warn">Algunos quedaron sin puntuar. Puedes reintentar o continuar.</p>':'<p>Cada anuncio ahora tiene precio de referencia, descuento y margen estimado.</p>');
    } else {
      html='<div class="czj-result-ic">\u2601\ufe0f</div><h2>Sincronizado a Notion</h2>'+
        '<div class="czj-result-stats"><span><b>'+m.enNotion+'</b> en Notion</span><span><b>'+m.pendSync+'</b> pendientes</span></div>'+
        (timedOut?'<p class="czj-warn">No confirm\u00e9 cambios nuevos. Si no se configur\u00f3 el token de Notion, puedes continuar igual y revisar la mesa local.</p>':'<p>Lo accionable qued\u00f3 guardado en tu base de Hallazgos.</p>');
    }
    if(res){ res.innerHTML=html; res.style.display=""; }
    if(nx) nx.removeAttribute("disabled");
    if(tipTimer){ clearInterval(tipTimer); tipTimer=null; }
  }

  // ---- ESCENA 6: La Mesa (resultado final, lente rotacion rapida) ----
  function buildMesaScene(st){
    var m=metrics();
    var card=el("div",{"class":"czj-scene wide"});
    card.innerHTML='<div class="czj-eyebrow">ESTACI\u00d3N 6 \u00b7 LA MESA</div>'+
      '<h1 class="czj-h1">Tu mesa: qu\u00e9 perseguir</h1>'+
      '<p class="czj-lead">Ordenado por <b>velocidad de venta esperada</b> (vender hoy o ma\u00f1ana), no solo por score.</p>';
    st.appendChild(card);

    if(m.cosechados===0){
      var e=el("div",{"class":"czj-empty"},'<div class="czj-empty-ic">\u26cf\ufe0f</div><h3>A\u00fan no hay anuncios</h3><p>Vuelve a la estaci\u00f3n <b>Cazar</b> para correr una cacer\u00eda.</p>');
      var b=el("button",{"class":"czj-btn primary",type:"button",style:"margin-top:12px"},"\u2190 Ir a Cazar"); b.addEventListener("click",function(){ goScene("cazar",{force:true}); }); e.appendChild(b);
      st.appendChild(e);
      st.appendChild(navBtns("sincronizar",null,null,null));
      return;
    }
    var rows=mesaRows();
    rows.forEach(function(r){ r._vv=velocidadVenta(r); });
    var persig=rows.filter(function(r){ return r.vd==="Perseguir"; });
    var pool=(persig.length?persig:rows).slice();
    pool.sort(function(a,b){ if(b._vv.score!==a._vv.score) return b._vv.score-a._vv.score; return (b.score!=null?b.score:-1)-(a.score!=null?a.score:-1); });

    // Panel "que hacer ahora"
    var top3=pool.slice(0,3);
    var topHtml=top3.length?top3.map(function(r){ var d=decisionFor(r); return '<li><b>'+safe((r.titulo||"(sin t\u00edtulo)").slice(0,60))+'</b><span><i class="czj-vv '+r._vv.nivel.toLowerCase()+'">Venta '+r._vv.nivel+'</i> \u00b7 '+d.accion+' \u00b7 '+mxn(r.precio)+'</span></li>'; }).join(""):'<li><b>Sin candidato claro</b><span>Corre otra cacer\u00eda o ajusta b\u00fasquedas.</span></li>';
    var pc=pipelineCounts();
    var hoy=el("div",{"class":"czj-hoy"});
    hoy.innerHTML='<div class="czj-hoy-head"><h3>Qu\u00e9 perseguir primero</h3>'+
      '<div class="czj-mini"><span>Contactados <b>'+(pc.Contactado||0)+'</b></span><span>Comprados <b>'+(pc.Comprado||0)+'</b></span><span>Vendidos <b>'+(pc.Vendido||0)+'</b></span></div></div>'+
      '<ol class="czj-top">'+topHtml+'</ol>';
    st.appendChild(hoy);

    var listWrap=el("div",{"class":"czj-rows"});
    pool.slice(0,120).forEach(function(r){ listWrap.appendChild(rowNode(r,r._vv)); });
    st.appendChild(listWrap);

    var acc=el("div",{"class":"czj-mesa-acts"});
    var bMkt=el("button",{"class":"czj-btn",type:"button"},"\ud83d\udd0d Abrir Marketplace"); bMkt.addEventListener("click",doAbrirMarketplace); acc.appendChild(bMkt);
    var bAgain=el("button",{"class":"czj-btn",type:"button"},"\u21bb Otra cacer\u00eda"); bAgain.addEventListener("click",function(){ goScene("quecazar",{force:true}); }); acc.appendChild(bAgain);
    var bFull=el("button",{"class":"czj-btn",type:"button"},"Abrir mesa completa (modo experto)"); bFull.addEventListener("click",function(){ view="mesa"; setExperto(true); }); acc.appendChild(bFull);
    st.appendChild(acc);
    st.appendChild(navBtns("sincronizar",null,null,null));
  }

  // lente de ROTACION RAPIDA (velocidad de venta esperada)
  var FAST_KW=[/audifon|auricular|headset|earbud|airpod/,/\bmouse\b|rat[o\u00f3]n/,/teclad/,/webcam|c[a\u00e1]mara web|c920|c270/,/cargador|cable|adaptador|hub usb|tipo c|type c/,/ventilador|extensi[o\u00f3]n|regleta|multicontacto|\bfoco\b|l[a\u00e1]mpara/,/microfono|micr[o\u00f3]fono/,/control|joystick|\bmando\b/,/bicicleta|\bbici\b|pat[i\u00ed]n|patineta|scooter/,/\bssd\b|memoria ram|micro sd|\bsd\b|usb /,/router|repetidor|extensor wifi|modem/];
  var SLOW_KW=[/mueble|sof[a\u00e1]|\bsala\b|comedor|ropero|closet|cama king|colch[o\u00f3]n/,/refrigerador|lavadora|estufa|secadora/,/colecci[o\u00f3]n|antig|vintage/];
  function velocidadVenta(r){
    var t=String((r&&r.titulo)||"").toLowerCase();
    var fast=FAST_KW.some(function(re){ return re.test(t); });
    var slow=SLOW_KW.some(function(re){ return re.test(t); });
    var p=(r&&r.precio!=null)?Number(r.precio):null;
    var sc=0; if(fast) sc+=3; if(slow) sc-=3;
    if(p!=null){ if(p<=400) sc+=2; else if(p<=900) sc+=1; else if(p>=2500) sc-=2; else if(p>=1500) sc-=1; }
    var logi=logisticaSimple(r); if(logi==="F\u00e1cil") sc+=1; else if(logi==="Mala") sc-=2;
    var nivel=sc>=3?"R\u00e1pida":(sc>=1?"Media":"Lenta");
    return {nivel:nivel,score:sc};
  }

  function setExperto(on){
    modoExperto=!!on; try{ localStorage.setItem(LS_EXPERT,on?"1":"0"); }catch(e){}
    if(on){ clearSceneTimers(); if(journeyEl) journeyEl.style.display="none"; if(classicEl) classicEl.style.display=""; renderVitals(); renderNav(); renderFlow(); renderBanners(); renderBody(); syncCtaLabel(); }
    else { builtScene=null; renderJourney(); }
  }

  // ================= CLASICO (modo experto) =================
  function renderNav(){
    var n=byId("cz-nav"); if(!n) return; n.innerHTML="";
    NAV.forEach(function(item){
      var b=el("button",{"class":"cz-nav-item"+(view===item.k?" on":""),type:"button","data-view":item.k,"aria-current":view===item.k?"page":"false"},
        '<span class="cz-nav-ic">'+safe(item.ic)+'</span><span class="cz-nav-txt"><b>'+safe(item.t)+'</b><small>'+safe(item.sub)+'</small></span>');
      b.addEventListener("click",function(){ setView(item.k); });
      n.appendChild(b);
    });
  }
  function chip(dotCls,label,val){ return '<span class="cz-chip"><span class="cz-dot '+dotCls+'"></span>'+label+(val!=null?(' <b>'+val+'</b>'):'')+'</span>'; }
  function keyOf(r){ return String((r&&r.id)||normUrl(r&&r.url)||""); }
  function pipeOf(r){ var k=keyOf(r); return (k&&S.pipe&&S.pipe[k])?S.pipe[k]:{estado:"Nuevo",resultado:"sin_dato"}; }
  function pipelineCounts(){ var out={Nuevo:0,Contactado:0,Comprado:0,Vendido:0,Descartado:0}; var p=S.pipe||{}; Object.keys(p).forEach(function(k){ var e=(p[k]&&p[k].estado)||"Nuevo"; out[e]=(out[e]||0)+1; }); return out; }
  function setPipe(r,estado,extra){
    var k=keyOf(r); if(!k){ toast("No pude guardar el estado de este hallazgo."); return Promise.resolve(); }
    var p=Object.assign({},S.pipe||{}), prev=p[k]||{};
    p[k]=Object.assign({},prev,extra||{},{estado:estado,actualizado:Date.now()});
    try{ if(window.CZG_aprendizaje){ var _y=(estado==="Descartado")?0:((estado==="Contactado"||estado==="Comprado"||estado==="Vendido")?1:null); if(_y!=null) window.CZG_aprendizaje.confrontar(k,_y,featLearn(r)); } }catch(_e){}
    var o={}; o[PIPE]=p;
    return sl(o).then(function(){ S.pipe=p; toast("Estado: "+estado); renderAll(); });
  }
  function riesgoSimple(r){ var txt=String((r&&r.riesgo)||"").toLowerCase(); if(/da\u00f1|dani|bloque|pieza|credito|cr\u00e9dito|riesgo|alto/.test(txt)) return "Alto"; if(/limpio|bajo/.test(txt)) return "Bajo"; if((r&&r.ref)==null || (r&&r.margen)==null) return "Duda"; return "Medio"; }
  function logisticaSimple(r){ var txt=String((r&&r.logistica)||(r&&r.zona)||(r&&r.fuente)||"").toLowerCase(); if(/requiere|desplaz|lejos|foraneo|for\u00e1nea|fuera/.test(txt)) return "Mala"; if(/envio|env\u00edo|domicilio|traen|local|queretaro|quer\u00e9taro/.test(txt)) return "F\u00e1cil"; return "Duda"; }
  function decisionFor(r){
    var vd=r.vd||"Revisar", riesgo=riesgoSimple(r), logi=logisticaSimple(r);
    var score=(r.score!=null)?Number(r.score):null, margen=(r.margen!=null)?Number(r.margen):null;
    var accion="Observar", razon="Falta evidencia suficiente: mira precio de referencia y condiciones.";
    if(vd==="Evitar" || riesgo==="Alto" || logi==="Mala"){ accion="Descartar"; razon=(riesgo==="Alto")?"Riesgo alto: no conviene aprender pagando errores.":(logi==="Mala"?"La log\u00edstica puede comerse la ganancia.":"El veredicto ya marca evitar."); }
    else if(vd==="Perseguir" && riesgo!=="Alto" && logi!=="Mala"){ accion="Contactar"; razon="Tiene se\u00f1al suficiente: pregunta disponibilidad y pide prueba antes de comprar."; }
    else if(margen!=null && margen>0 && riesgo!=="Alto"){ accion="Negociar"; razon="Hay margen posible, pero conviene bajar precio o confirmar estado."; }
    else if(score!=null && score>=70 && r.ref==null){ accion="Observar"; razon="Buen score, pero sin referencia: no compres a ciegas."; }
    if(r.precio!=null && r.precio>=1200 && accion==="Contactar") razon+=" Capital alto: no apartes dinero sin confirmar demanda.";
    return {accion:accion,razon:razon,riesgo:riesgo,logistica:logi};
  }
  function mensajePara(r){
    var t=String((r&&r.titulo)||"publicaci\u00f3n").slice(0,70);
    var d=decisionFor(r), base="Hola, vi tu publicaci\u00f3n: "+t+". \u00bfSigue disponible?";
    var low=t.toLowerCase();
    var prueba=" \u00bfMe podr\u00edas mandar una foto o video corto funcionando?";
    if(/monitor|pantalla|laptop|celular|iphone|samsung|tablet|consola|xbox|play/.test(low)) prueba=" \u00bfMe podr\u00edas mandar video funcionando y confirmar que no tiene bloqueo ni detalles?";
    else if(/taladro|herramient|sierra|rotomartillo|pulidor|esmeril/.test(low)) prueba=" \u00bfMe podr\u00edas mandar video funcionando y decir si incluye cargador/accesorios?";
    else if(/tenis|bota|zapato|mochila|maleta|ropa/.test(low)) prueba=" \u00bfMe confirmas talla/medidas y me mandas fotos de detalles/desgaste?";
    var cierre=(d.accion==="Negociar")?" Si todo est\u00e1 bien, \u00bfcu\u00e1l ser\u00eda tu mejor precio?":" \u00bfCu\u00e1l ser\u00eda tu mejor precio?";
    return base+prueba+cierre;
  }
  function aprendizajeSimple(rows){
    var pc=pipelineCounts(), list=rows||mesaRows();
    var sinRef=list.filter(function(r){ return r&&r.vd==="Perseguir"&&r.ref==null; }).length;
    var alto=list.filter(function(r){ return r&&r.precio!=null&&r.precio>=1200&&r.vd==="Perseguir"; }).length;
    var comprados=pc.Comprado||0, contactados=pc.Contactado||0;
    var regla="No compres sin precio de referencia o prueba de funcionamiento.";
    var cuidado=sinRef?"Hay "+sinRef+" perseguible(s) sin referencia: primero confirma precio real.":"Si no hay evidencia nueva, no fuerces compra.";
    if(comprados>contactados) cuidado="Alerta simple: marcaste m\u00e1s compras que contactos. Baja velocidad; primero pregunta y confirma.";
    else if(alto) cuidado="Capital alto detectado: no metas mucho dinero en una sola pieza sin salida clara.";
    var mejor=list.filter(function(r){ return r&&r.vd==="Perseguir"; }).slice(0,1)[0];
    return {regla:regla,cuidado:cuidado,mejor:mejor?(mejor.titulo||"revisar el primer perseguible"):"sin candidato claro todav\u00eda"};
  }
  function renderVitals(){
    var v=byId("cz-vitals"); if(!v) return; var m=metrics();
    var estTxt, estDot;
    if(bloqueo){ estTxt="Bloqueo de seguridad"; estDot="bad"; }
    else if(cosecha==="corriendo"){ estTxt="Cosechando"; estDot="run"; }
    else if(cosecha==="pausado"){ if(S.config.modoComida!==false){ estTxt="Trabajando (modo comida)"; estDot="run"; } else { estTxt="Pausado (foco)"; estDot="warn"; } }
    else { estTxt="En reposo"; estDot="ok"; }
    var sesTxt,sesDot;
    if(sesion.logueado===null){ sesTxt="Sesi\u00f3n \u2014"; sesDot=""; }
    else if(!sesion.logueado){ sesTxt="Sin sesi\u00f3n FB"; sesDot="bad"; }
    else { var d=sesion.dias; var dt=(d==null)?"":(d>=1?("~"+Math.round(d)+"d"):("~"+Math.round(d*24)+"h")); sesTxt="Sesi\u00f3n "+dt; sesDot=(d!=null&&d<3)?"warn":"ok"; }
    v.innerHTML=chip(estDot,estTxt)+chip(S.config.modoComida!==false?"ok":"warn",S.config.modoComida!==false?"Modo comida":"Foco estricto")+chip(sesDot,sesTxt)+chip("","Cosechados",m.cosechados)+chip("","Puntuados",m.puntuados)+chip("","En Notion",m.enNotion)+chip(m.perseguir>0?"ok":"","Perseguir",m.perseguir)+chip("","Contactados",m.contactados)+chip("","Vendidos",m.vendidos);
  }
  function nextStep(){ var m=metrics(); if(!m.configurado) return "cfg"; if(m.cosechados===0) return "cazar"; if(m.sinPuntuar>0) return "puntuar"; if(m.pendSync>0) return "sync"; return "revisar"; }
  function renderFlow(){
    var f=byId("cz-flow"); if(!f) return; var m=metrics(); var nx=nextStep();
    var steps=[
      {k:"cfg",   n:1,t:"Configurar",  sub:(m.configurado?(S.config.busquedas.length+" b\u00fasquedas \u00b7 "+(S.config.zona||"sin zona")):"sin b\u00fasquedas"), done:m.configurado, go:function(){ setView("ajustes"); }},
      {k:"cazar", n:2,t:"Cazar",       sub:(m.cosechados?(m.cosechados+" anuncios"):"sin cosechar"), done:m.cosechados>0, go:doCazar},
      {k:"puntuar",n:3,t:"Puntuar",    sub:(m.cosechados?(m.puntuados+"/"+m.cosechados+" puntuados"):"\u2014"), done:m.cosechados>0&&m.sinPuntuar===0, go:doPuntuar},
      {k:"sync",  n:4,t:"Sincronizar", sub:(m.pendSync>0?(m.pendSync+" pendientes"):(m.enNotion+" en Notion")), done:m.enNotion>0&&m.pendSync===0, go:doSincronizar},
      {k:"revisar",n:5,t:"Revisar",    sub:(m.perseguir+" para perseguir"), done:false, go:function(){ filtro="Perseguir"; setView("mesa"); }}
    ];
    f.innerHTML="";
    steps.forEach(function(s){
      var cls="cz-step"+(s.done?" done":"")+(s.k===nx?" next":"")+((view==="mesa"&&s.k==="revisar")?" active":"");
      var node=el("div",{"class":cls,role:"button",tabindex:"0"},
        '<div class="cz-step-top"><span class="cz-step-n">'+(s.done?"":s.n)+'</span>'+s.t+'</div>'+
        '<div class="cz-step-sub">'+safe(s.sub)+'</div>'+
        (s.k===nx?'<button class="cz-step-go" type="button">'+(s.k==="revisar"?"Ver":"Hacer")+' \u2192</button>':''));
      var act=function(ev){ if(ev) ev.stopPropagation(); s.go(); };
      node.addEventListener("click",act);
      node.addEventListener("keydown",function(ev){ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); act(); } });
      f.appendChild(node);
    });
  }
  function renderBanners(){
    var b=byId("cz-banners"); if(!b) return; b.innerHTML="";
    if(bloqueo){ b.appendChild(el("div",{"class":"cz-banner bad"},'\u26d4 Facebook pidi\u00f3 verificaci\u00f3n ('+safe(bloqueo)+'). Se detuvo la cosecha para NO escalar el bloqueo. Res\u00fa\u00e9lvelo en Facebook y reintenta m\u00e1s tarde.')); return; }
    if(cosecha==="pausado"&&S.config.modoComida===false) b.appendChild(el("div",{"class":"cz-banner warn"},'\u275a\u275a Cosecha en pausa: la ventana perdi\u00f3 el foco. Vuelve a la pesta\u00f1a de Facebook para continuar.'));
    if(sesion.logueado===false){ var bn=el("div",{"class":"cz-banner warn"},'\ud83d\udd34 Sin sesi\u00f3n de Facebook. Inicia sesi\u00f3n para poder cosechar.'); var lg=el("button",{"class":"cz-btn",type:"button"},"Iniciar sesi\u00f3n"); lg.addEventListener("click",doLogin); bn.appendChild(lg); b.appendChild(bn); }
  }
  function setView(v){ view=v; try{ localStorage.setItem(LS_VIEW,v); }catch(e){} renderNav(); renderFlow(); renderBody(); syncCtaLabel(); }
  function renderBody(){
    ["mesa","observatorio","ajustes","descubrir","lab"].forEach(function(v){ var s=byId("cz-v-"+v); if(s) s.className="cz-view"+(v===view?" on":""); });
    if(view==="mesa") renderMesa(); else if(view==="observatorio") renderObservatorio(); else if(view==="ajustes") renderAjustes(); else if(view==="descubrir") renderDescubrir(); else if(view==="lab") renderLab();
  }
  function navHeader(title,sub,rightBtns){
    var h=el("div",{"class":"cz-h"},'<h2>'+safe(title)+'</h2><span class="cz-h-sub">'+safe(sub)+'</span>');
    var right=el("div",{"class":"cz-h-right"});
    (rightBtns||[]).forEach(function(rb){ var btn=el("button",{"class":"cz-btn"+(rb.primary?" primary":""),type:"button"},rb.label); btn.addEventListener("click",rb.on); right.appendChild(btn); });
    h.appendChild(right); return h;
  }
  function mesaRows(){
    var halByUrl={}, halArr=asList(S.hal);
    halArr.forEach(function(h){ var u=normUrl(h.url); if(u) halByUrl[u]=h; });
    var rows=[], enrArr=asList(S.enr);
    if(enrArr.length){
      enrArr.forEach(function(r){ var u=normUrl(r.url); var h=halByUrl[u]||{};
        rows.push({url:r.url,titulo:r.titulo||h.titulo,vd:r.veredicto||null,score:(r.score!=null?r.score:h.score),precio:(h.precioNum!=null?h.precioNum:num(h.precio)),ref:h.precioRef,pct:h.pctDescuento,margen:h.margenReventa,etq:h.etiqueta,id:h.id,riesgo:r.riesgo,fuente:r.fuente}); });
    } else {
      halArr.forEach(function(h){ rows.push({url:h.url,titulo:h.titulo,vd:null,score:h.score,precio:(h.precioNum!=null?h.precioNum:num(h.precio)),ref:h.precioRef,pct:h.pctDescuento,margen:h.margenReventa,etq:h.etiqueta,id:h.id}); });
    }
    rows.sort(function(a,b){ return (b.score!=null?b.score:-1)-(a.score!=null?a.score:-1); });
    return rows;
  }
  function renderMesa(){
    var root=byId("cz-v-mesa"); if(!root) return; root.innerHTML=""; var m=metrics();
    root.appendChild(navHeader("Mesa de Comerciante","Compra con criterio: ver, actuar y aprender",[
      {label:"\u25b6 Cazar",primary:true,on:doCazar},
      {label:"\ud83d\udd0d Abrir Marketplace",on:doAbrirMarketplace},
      {label:"\ud83d\udcca Observatorio",on:function(){ setView("observatorio"); }},
      {label:"Puntuar",on:doPuntuar},
      {label:"Sincronizar",on:doSincronizar}
    ]));
    root.appendChild(renderUsoGuia(m));
    if(m.cosechados===0){ root.appendChild(coldStart()); return; }
    var rows=mesaRows();
    var hayVd=rows.some(function(r){ return r.vd; });
    var counts={Perseguir:0,Revisar:0,Evitar:0,Todos:rows.length};
    rows.forEach(function(r){ if(r.vd&&counts[r.vd]!=null) counts[r.vd]++; });
    root.appendChild(renderHoyPanel(rows));
    var filters=el("div",{id:"cz-filters"});
    var fdef=hayVd?["Perseguir","Revisar","Evitar","Todos"]:["Todos"];
    if(!hayVd) filtro="Todos";
    fdef.forEach(function(fk){ var c=el("button",{"class":"cz-fchip"+(fk===filtro?" on":""),type:"button"},safe(fk)+' <span class="cz-count">'+counts[fk]+'</span>'); c.addEventListener("click",function(){ filtro=fk; renderMesa(); }); filters.appendChild(c); });
    root.appendChild(filters);
    if(!hayVd) root.appendChild(el("div",{"class":"cz-lab-note",style:"margin-bottom:14px"},'Ordenado por Score. El Veredicto (Perseguir/Revisar/Evitar) aparece tras el an\u00e1lisis profundo de la c\u00e1ceria completa (\u25b6 Cazar).'));
    var list=rows;
    if(hayVd&&filtro!=="Todos") list=rows.filter(function(r){ return r.vd===filtro; });
    if(!list.length){ root.appendChild(el("div",{"class":"cz-empty"},'<div class="cz-empty-ic">\ud83e\udd37</div><h3>Nada en \u201c'+safe(filtro)+'\u201d todav\u00eda</h3><p>Cambia de filtro o corre una c\u00e1ceria.</p>')); return; }
    var mesa=el("div",{id:"cz-mesa"});
    list.slice(0,300).forEach(function(r){ mesa.appendChild(rowNode(r)); });
    root.appendChild(mesa);
  }
  function renderUsoGuia(m){
    var nx=nextStep();
    var labels={cfg:"1. Ajusta qu\u00e9 cazar",cazar:"2. Caza en Marketplace",puntuar:"3. Punt\u00faa hallazgos",sync:"4. Sincroniza Notion",revisar:"5. Revisa la mesa"};
    var hint={cfg:"Define zona, b\u00fasquedas y corte fuera de zona.",cazar:(S.config.modoComida!==false?"Corre largo: no cierres Chrome ni suspendas el equipo.":"Mant\u00e9n Facebook al frente; si desenfocas, se pausa."),puntuar:"Convierte anuncios crudos en se\u00f1ales comparables.",revisar:"Elige Perseguir / Revisar / Evitar sin ruido.",sync:"Guarda lo accionable en Hallazgos de Notion."};
    return el("div",{"class":"cz-usage"},'<div><span class="cz-usage-k">Siguiente paso</span><b>'+safe(labels[nx]||"Revisar")+'</b><small>'+safe(hint[nx]||"")+'</small></div><ol><li class="'+(nx==="cfg"?"on":"")+'">Ajustar</li><li class="'+(nx==="cazar"?"on":"")+'">Cazar</li><li class="'+(nx==="puntuar"?"on":"")+'">Puntuar</li><li class="'+(nx==="sync"?"on":"")+'">Notion</li><li class="'+(nx==="revisar"?"on":"")+'">Decidir</li></ol>');
  }
  function renderHoyPanel(rows){
    var a=aprendizajeSimple(rows), pc=pipelineCounts();
    var ia=(window.CZG_aprendizaje&&window.CZG_aprendizaje.estado)?window.CZG_aprendizaje.estado():null;
    var top=(rows||[]).filter(function(r){ return r.vd==="Perseguir"; }).slice(0,3);
    var card=el("div",{"class":"cz-hoy"});
    var topHtml=top.length?top.map(function(r){ var d=decisionFor(r); return '<li><b>'+safe((r.titulo||"(sin t\u00edtulo)").slice(0,62))+'</b><span>'+safe(d.accion)+' \u00b7 '+mxn(r.precio)+' \u00b7 margen '+mxn(r.margen)+'</span></li>'; }).join(""):'<li><b>Sin top claro</b><span>Corre cacer\u00eda o punt\u00faa hallazgos.</span></li>';
    card.innerHTML='<div class="cz-hoy-head"><div><div class="cz-eyebrow">TABLERO SIMPLE</div><h3>Qu\u00e9 hacer ahora</h3><p>Una decisi\u00f3n clara por vez: perseguir, negociar, observar o descartar.</p></div><div class="cz-mini-stats"><span>Contactados <b>'+((pc.Contactado||0))+'</b></span><span>Comprados <b>'+((pc.Comprado||0))+'</b></span><span>Vendidos <b>'+((pc.Vendido||0))+'</b></span><span>Descartados <b>'+((pc.Descartado||0))+'</b></span>'+(ia?'<span title="Modelo de afinidad que aprende de tu uso">IA afinidad <b>'+ia.n+(ia.acc!=null?(" \u00b7 "+ia.acc+"%"):"")+'</b></span>':'')+'</div></div><div class="cz-hoy-grid"><div><div class="cz-small-title">Top simple</div><ol class="cz-top-list">'+topHtml+'</ol></div><div><div class="cz-small-title">Aprendizaje simple</div><div class="cz-rule"><b>Regla:</b> '+safe(a.regla)+'</div><div class="cz-rule warn"><b>Cuidado:</b> '+safe(a.cuidado)+'</div><div class="cz-rule"><b>Mejor pista:</b> '+safe(a.mejor)+'</div></div></div>';
    return card;
  }
  function rowNode(r,vv){
    var sc=(r.score!=null)?r.score:null;
    var scCls=sc==null?"lo":(sc>=70?"hi":(sc>=45?"mid":"lo"));
    var vd=r.vd||null; var vdCls=vd?vd:"none"; var vdTxt=vd||"sin an\u00e1lisis";
    var pct=(r.pct!=null)?(Math.round(r.pct<=1?r.pct*100:r.pct)+"%"):null;
    var pipe=pipeOf(r), dec=decisionFor(r);
    var cel=(window.CZG_celular&&window.CZG_celular.analizar)?window.CZG_celular.analizar(r):null;
    var af=null; try{ if(window.CZG_aprendizaje){ var _x=featLearn(r); var _pr=window.CZG_aprendizaje.predecir(_x); af=_pr.score; window.CZG_aprendizaje.registrar(keyOf(r),_x,_pr.p); } }catch(_e){}
    var row=el("div",{"class":"cz-row cz-simple"});
    var meta='';
    if(vv) meta+='<span class="cz-pill vv-'+vv.nivel.toLowerCase()+'">Venta '+safe(vv.nivel)+'</span>';
    meta+='<span><b>'+mxn(r.precio)+'</b></span>';
    if(r.ref!=null) meta+='<span>ref '+mxn(r.ref)+'</span>';
    if(pct) meta+='<span class="pos">-'+pct+'</span>';
    if(r.margen!=null) meta+='<span class="pos">margen '+mxn(r.margen)+'</span>';
    meta+='<span class="cz-pill risk-'+safe(dec.riesgo.toLowerCase())+'">Riesgo '+safe(dec.riesgo)+'</span>';
    meta+='<span class="cz-pill logi-'+safe(dec.logistica.toLowerCase())+'">Log\u00edstica '+safe(dec.logistica)+'</span>';
    if(r.etq) meta+='<span>'+safe(r.etq)+'</span>';
    if(cel&&cel.esCelular){ var _spec=window.CZG_celular.resumen(cel); if(_spec) meta+='<span class="cz-pill" title="Caracteristicas del celular">\ud83d\udcf1 '+safe(_spec)+'</span>'; }
    if(af!=null) meta+='<span class="cz-pill" title="Afinidad aprendida con tu uso (0-100)">\u2605 Af\u00edn '+af+'</span>';
    var head=el("div",{"class":"cz-row-head"},'<div class="cz-score '+scCls+'"><b>'+(sc==null?"\u2014":sc)+'</b><span>score</span></div><div class="cz-row-main"><div class="cz-row-title">'+safe((r.titulo||"(sin t\u00edtulo)"))+'</div><div class="cz-row-meta">'+meta+'</div><div class="cz-reason">'+safe(dec.razon)+'</div></div><div class="cz-actionbox"><span class="cz-vd '+vdCls+'">'+safe(vdTxt)+'</span><span class="cz-next">'+safe(dec.accion)+'</span><span class="cz-state">'+safe(pipe.estado||"Nuevo")+'</span></div><span class="cz-caret">\u203a</span>');
    head.addEventListener("click",function(){ row.classList.toggle("open"); });
    row.appendChild(head);
    var kv='';
    kv+='<span>Acci\u00f3n: <b>'+safe(dec.accion)+'</b></span>';
    kv+='<span>Estado: <b>'+safe(pipe.estado||"Nuevo")+'</b></span>';
    kv+='<span>Score: <b>'+(sc==null?"\u2014":sc)+'</b></span>';
    kv+='<span>Precio: <b>'+mxn(r.precio)+'</b></span>';
    kv+='<span>Referencia: <b>'+mxn(r.ref)+'</b></span>';
    if(pct) kv+='<span>Descuento: <b>'+pct+'</b></span>';
    if(r.margen!=null) kv+='<span>Margen reventa: <b>'+mxn(r.margen)+'</b></span>';
    if(vv) kv+='<span>Velocidad de venta: <b>'+safe(vv.nivel)+'</b></span>';
    kv+='<span>Riesgo: <b>'+safe(dec.riesgo)+'</b></span>';
    kv+='<span>Log\u00edstica: <b>'+safe(dec.logistica)+'</b></span>';
    var msg=mensajePara(r);
    var det=el("div",{"class":"cz-row-detail"},'<div class="cz-kv">'+kv+'</div><div class="cz-msg"><b>Mensaje listo:</b> '+safe(msg)+'</div>');
    var btns=el("div",{"class":"cz-rowbtns"});
    var bCopy=el("button",{"class":"cz-btn primary",type:"button"},"Copiar mensaje"); bCopy.addEventListener("click",function(ev){ ev.stopPropagation(); copiarMensaje(r,msg); }); btns.appendChild(bCopy);
    var bMsg=el("button",{"class":"cz-btn",type:"button",style:"background:#0084ff;color:#fff;border-color:#0084ff"},"\ud83d\udcac Messenger"); bMsg.addEventListener("click",function(ev){ ev.stopPropagation(); enviarMessenger(r,msg,cel); }); btns.appendChild(bMsg);
    var bC=el("button",{"class":"cz-btn",type:"button"},"Contactado"); bC.addEventListener("click",function(ev){ ev.stopPropagation(); setPipe(r,"Contactado",{ultimoMensaje:msg,resultado:"sin_dato"}); }); btns.appendChild(bC);
    var bBuy=el("button",{"class":"cz-btn",type:"button"},"Comprado"); bBuy.addEventListener("click",function(ev){ ev.stopPropagation(); setPipe(r,"Comprado",{resultado:"sin_dato",impulso:pipe.estado!=="Contactado"}); }); btns.appendChild(bBuy);
    var bSell=el("button",{"class":"cz-btn",type:"button"},"Vendido"); bSell.addEventListener("click",function(ev){ ev.stopPropagation(); setPipe(r,"Vendido",{resultado:"bien"}); }); btns.appendChild(bSell);
    var bDrop=el("button",{"class":"cz-btn ghost",type:"button"},"Descartar"); bDrop.addEventListener("click",function(ev){ ev.stopPropagation(); setPipe(r,"Descartado",{resultado:"mal"}); }); btns.appendChild(bDrop);
    var bA=el("button",{"class":"cz-btn",type:"button"},"\u2197 Abrir anuncio"); bA.addEventListener("click",function(ev){ ev.stopPropagation(); try{ window.open(r.url,"_blank"); }catch(e){} }); btns.appendChild(bA);
    var pid=r.id?S.syn[r.id]:null;
    if(pid){ var bN=el("button",{"class":"cz-btn ghost",type:"button"},"Abrir en Notion"); bN.addEventListener("click",function(ev){ ev.stopPropagation(); try{ window.open(NB+String(pid).replace(/-/g,""),"_blank"); }catch(e){} }); btns.appendChild(bN); }
    det.appendChild(btns); row.appendChild(det);
    return row;
  }
  function copiarMensaje(r,msg){
    try{ navigator.clipboard.writeText(msg).then(function(){ setPipe(r,"Contactado",{ultimoMensaje:msg,resultado:"sin_dato"}); toast("Mensaje copiado \u00b7 estado Contactado"); },function(){ toast("No pude copiar, pero el mensaje est\u00e1 visible."); }); }
    catch(e){ toast("No pude copiar, pero el mensaje est\u00e1 visible."); }
  }
  function mensajeCelular(r,cel){
    var base="Hola, sigue disponible "+((cel&&cel.modelo)?cel.modelo:"tu telefono")+((cel&&cel.almacenamiento)?(" de "+cel.almacenamiento):"")+"?";
    var preg=" \u00bfEst\u00e1 liberado y libre de cuenta (iCloud/Google)? \u00bfC\u00f3mo est\u00e1 la bater\u00eda/salud y tiene alg\u00fan detalle?";
    return base+preg+" \u00bfCu\u00e1l ser\u00eda tu mejor precio?";
  }
  function enviarMessenger(r,msg,cel){
    var m=(cel&&cel.esCelular)?mensajeCelular(r,cel):msg;
    try{ navigator.clipboard.writeText(m); }catch(e){}
    var u=r&&r.url;
    try{ if(typeof chrome!=="undefined"&&chrome.tabs&&chrome.tabs.create){ chrome.tabs.create({url:u,active:true}); } else { window.open(u,"_blank"); } }catch(e){ try{ window.open(u,"_blank"); }catch(e2){} }
    toast("Abr\u00ed el anuncio para enviar mensaje al vendedor (Messenger) \u00b7 texto copiado: pega y env\u00eda.");
    setPipe(r,"Contactado",{ultimoMensaje:m,resultado:"sin_dato",via:"messenger"});
  }
  function featLearn(r){
    var cel=(window.CZG_celular&&window.CZG_celular.analizar)?window.CZG_celular.analizar(r):{};
    var pct=(r&&r.pct!=null)?(r.pct<=1?r.pct*100:r.pct):((r&&r.ref&&r.precio)?((r.ref-r.precio)/r.ref*100):null);
    return window.CZG_aprendizaje.featuresDe({ score:r&&r.score, pctDescuento:pct, riesgo:r&&r.riesgo, veredicto:r&&r.vd, margen:r&&r.margen, precioNum:r&&r.precio, precioRef:r&&r.ref, cel:cel, cerca:/envio|env\u00edo|domicilio|local|queretaro|quer\u00e9taro/i.test(((r&&r.titulo)||"")+" "+((r&&r.fuente)||"")) });
  }
  function coldStart(){
    var m=metrics(); var e=el("div",{"class":"cz-empty"});
    if(!m.configurado){ e.innerHTML='<div class="cz-empty-ic">\u2699\ufe0f</div><h3>Primero, dile qu\u00e9 cazar</h3><p>A\u00fan no hay b\u00fasquedas configuradas. Define tu zona y los t\u00e9rminos a rastrear y empieza a cosechar.</p>'; var b=el("button",{"class":"cz-cta",type:"button"},"Configurar b\u00fasquedas"); b.addEventListener("click",function(){ setView("ajustes"); }); e.appendChild(b); }
    else { e.innerHTML='<div class="cz-empty-ic">\u26cf\ufe0f</div><h3>Mesa vac\u00eda \u2014 empieza por Cazar</h3><p><b>\u25b6 Cazar</b> abre Facebook Marketplace con tus b\u00fasquedas, cosecha, punt\u00faa y trae los hallazgos a esta mesa.</p>'; var b2=el("button",{"class":"cz-cta",type:"button"},"\u25b6 Cazar ahora"); b2.addEventListener("click",doCazar); e.appendChild(b2); var b3=el("button",{"class":"cz-btn",type:"button",style:"margin-left:8px"},"\ud83d\udd0d Abrir Marketplace"); b3.addEventListener("click",doAbrirMarketplace); e.appendChild(b3); }
    return e;
  }
  function renderObservatorio(){
    var root=byId("cz-v-observatorio"); if(!root) return; root.innerHTML="";
    root.appendChild(navHeader("Observatorio","C\u00f3mo se comporta Marketplace para tus b\u00fasquedas",[{label:"\u25b6 Cazar y medir",primary:true,on:doCazar},{label:"Actualizar",on:refresh}]));
    var db=S.obs||{}, runs=Array.isArray(db.runs)?db.runs.slice():[], by=db.byQuery||{};
    if(!runs.length){ root.appendChild(el("div",{"class":"cz-empty"},'<div class="cz-empty-ic">\ud83d\udcca</div><h3>A\u00fan no hay observaciones</h3><p>Corre <b>\u25b6 Cazar</b>. Cada b\u00fasqueda guardar\u00e1 posici\u00f3n, scroll, zona, frontera local, nuevos/repetidos y cambios de ranking.</p>')); return; }
    runs.sort(function(a,b){ return (b.startedAt||0)-(a.startedAt||0); });
    var totalRuns=runs.length; var last=runs[0]||{}; var qKeys=Object.keys(by);
    var totalSeen=qKeys.reduce(function(acc,k){ var q=by[k]||{}; return acc+(q.totalSeen||0); },0);
    var locales=runs.reduce(function(acc,r){ return acc+(r.itemsLocales||0); },0);
    var vistos=runs.reduce(function(acc,r){ return acc+(r.itemsVistos||0); },0);
    var cards=el("div",{"class":"cz-grid"});
    function stat(t,v,s){ cards.appendChild(el("div",{"class":"cz-card"},'<div style="font-size:12px;color:#8696ac">'+safe(t)+'</div><div style="font-size:28px;font-weight:900;margin-top:4px">'+safe(v)+'</div><div style="font-size:12px;color:#8696ac;margin-top:3px">'+safe(s||"")+'</div>')); }
    stat("Corridas",String(totalRuns),"b\u00fasquedas medidas");
    stat("Items \u00fanicos",String(totalSeen),"memoria por query");
    stat("Localidad",vistos?Math.round(locales/vistos*100)+"%":"\u2014","items locales observados");
    stat("\u00daltima",last.query||"\u2014",last.stopReason?"corte: "+last.stopReason:"\u2014");
    root.appendChild(cards);
    var qRows=qKeys.map(function(k){ var q=by[k]||{}, lr=q.lastRun||{}; var localRate=(lr.itemsVistos?Math.round((lr.itemsLocales||0)/lr.itemsVistos*100):null); var frontera=lr.fronteraDetectada?("pos. "+(lr.fronteraPosicion||"?")):"no"; var topNew=lr.topNewRate!=null?Math.round(lr.topNewRate*100)+"%":"\u2014"; var overlap=lr.overlapTop20!=null?Math.round(lr.overlapTop20*100)+"%":"\u2014"; var shift=lr.rankShiftPromedio!=null?lr.rankShiftPromedio:"\u2014"; var ver=(localRate!=null&&localRate>=65&&lr.itemsNuevos>0)?"Fuerte":(localRate!=null&&localRate<35?"Ruido/for\u00e1nea":"Medir m\u00e1s"); return '<tr><td><b>'+safe(q.query||k)+'</b><div style="color:#8696ac;font-size:11px">'+(q.runs||0)+' corridas \u00b7 '+(q.totalSeen||0)+' \u00fanicos</div></td><td style="text-align:right">'+(lr.itemsVistos||0)+'</td><td style="text-align:right">'+(lr.itemsLocales||0)+'</td><td style="text-align:right">'+(localRate==null?'\u2014':localRate+'%')+'</td><td style="text-align:right">'+(lr.itemsNuevos||0)+'</td><td style="text-align:right">'+safe(frontera)+'</td><td style="text-align:right">'+topNew+'</td><td style="text-align:right">'+overlap+'</td><td style="text-align:right">'+shift+'</td><td style="text-align:center"><b>'+safe(ver)+'</b></td></tr>'; }).join("");
    var qCard=el("div",{"class":"cz-card"}); qCard.appendChild(el("h3",{},"Score de b\u00fasquedas")); qCard.appendChild(el("div",{id:"cz-desc-board"},'<table><thead><tr><th>B\u00fasqueda</th><th style="text-align:right">vistos</th><th style="text-align:right">locales</th><th style="text-align:right">% local</th><th style="text-align:right">nuevos</th><th style="text-align:right">frontera</th><th style="text-align:right">top nuevo</th><th style="text-align:right">overlap</th><th style="text-align:right">rank \u0394</th><th style="text-align:center">lectura</th></tr></thead><tbody>'+qRows+'</tbody></table>')); root.appendChild(qCard);
    var rRows=runs.slice(0,24).map(function(r){ return '<tr><td><b>'+safe(r.query||"")+'</b><div style="color:#8696ac;font-size:11px">'+safe(r.endedLocal||r.startedLocal||"")+'</div></td><td style="text-align:right">'+(r.itemsVistos||0)+'</td><td style="text-align:right">'+(r.itemsLocales||0)+'</td><td style="text-align:right">'+(r.itemsForaneos||0)+'</td><td style="text-align:right">'+(r.itemsNuevos||0)+'</td><td style="text-align:right">'+(r.scrollsEjecutados||0)+'</td><td style="text-align:right">'+(r.fronteraDetectada?(r.fronteraPosicion||"s\u00ed"):"no")+'</td><td style="text-align:right">'+safe(r.stopReason||"")+'</td></tr>'; }).join("");
    var rCard=el("div",{"class":"cz-card"}); rCard.appendChild(el("h3",{},"\u00daltimas corridas")); rCard.appendChild(el("div",{id:"cz-desc-board"},'<table><thead><tr><th>Query</th><th style="text-align:right">vistos</th><th style="text-align:right">locales</th><th style="text-align:right">for\u00e1neos</th><th style="text-align:right">nuevos</th><th style="text-align:right">scrolls</th><th style="text-align:right">frontera</th><th style="text-align:right">corte</th></tr></thead><tbody>'+rRows+'</tbody></table>')); root.appendChild(rCard);
  }
  function renderAjustes(){
    var root=byId("cz-v-ajustes"); if(!root) return; root.innerHTML="";
    root.appendChild(navHeader("Ajustes","Zona, b\u00fasquedas y umbral de ganga",[]));
    var c=S.config||{}; var card=el("div",{"class":"cz-card"});
    card.appendChild(el("div",{"class":"cz-field"},'<label>Zona</label><input id="cz-f-zona" type="text" value="'+safe(c.zona||"queretaro")+'" placeholder="queretaro">'));
    card.appendChild(el("div",{"class":"cz-field"},'<label>B\u00fasquedas (una por l\u00ednea)</label><textarea id="cz-f-busq" rows="6">'+safe((Array.isArray(c.busquedas)&&c.busquedas.length?c.busquedas:PRE_BUSQ).join("\n"))+'</textarea><div class="cz-hint">Cada l\u00ednea es un t\u00e9rmino que se rastrear\u00e1 en Marketplace.</div>'));
    card.appendChild(el("div",{"class":"cz-field"},'<label>Umbral de ganga (percentil)</label><input id="cz-f-umbral" type="number" min="1" max="50" value="'+(c.umbral!=null?c.umbral:20)+'" style="max-width:140px"><div class="cz-hint">Precios por debajo de este percentil del grupo se marcan como ganga.</div>'));
    card.appendChild(el("div",{"class":"cz-field"},'<label><input id="cz-f-fuera" type="checkbox"'+(c.pararFueraZona!==false?' checked':'')+' style="margin-right:8px;vertical-align:middle">Detener al salir de la zona</label><div class="cz-hint">Corta la caza cuando Marketplace empieza a mostrar resultados fuera de tu b\u00fasqueda/zona.</div>'));
    card.appendChild(el("div",{"class":"cz-field"},'<label>Modo largo / comida</label><label style="font-weight:700"><input id="cz-f-comida" type="checkbox"'+(c.modoComida!==false?' checked':'')+' style="margin-right:8px;vertical-align:middle">Seguir aunque la ventana pierda foco visible</label><div class="cz-hint">\u00dasalo para dejarlo trabajando mientras comes. No puede vencer un apagado ni suspensi\u00f3n del equipo.</div>'));
    card.appendChild(el("div",{"class":"cz-field"},'<label>M\u00e1ximo de b\u00fasquedas por corrida larga</label><input id="cz-f-maxb" type="number" min="1" max="28" value="'+(c.maxBusquedas||28)+'" style="max-width:140px"><div class="cz-hint">28 usa todas las b\u00fasquedas preconfiguradas.</div>'));
    var save=el("button",{"class":"cz-cta",type:"button"},"Guardar configuraci\u00f3n");
    save.addEventListener("click",function(){ var zona=(byId("cz-f-zona").value||"").trim(); var busquedas=(byId("cz-f-busq").value||"").split("\n").map(function(s){ return s.trim(); }).filter(Boolean); var umbral=parseInt(byId("cz-f-umbral").value,10)||20; var ff=byId("cz-f-fuera"); var pararFueraZona=ff?!!ff.checked:true; var mc=byId("cz-f-comida"); var modoComida=mc?!!mc.checked:true; var maxb=parseInt((byId("cz-f-maxb")&&byId("cz-f-maxb").value),10)||28; maxb=Math.max(1,Math.min(28,maxb)); var merged=Object.assign({},S.config,{zona:zona,busquedas:busquedas,umbral:umbral,pararFueraZona:pararFueraZona,modoComida:modoComida,maxBusquedas:maxb}); sl({"cazagangas.config":merged}).then(function(){ toast("Configuraci\u00f3n guardada \u00b7 "+busquedas.length+" b\u00fasquedas"); refresh(); }); });
    card.appendChild(save); root.appendChild(card);
  }
  function renderDescubrir(){
    var root=byId("cz-v-descubrir"); if(!root) return; root.innerHTML="";
    root.appendChild(navHeader("Descubrir","\u00bfQu\u00e9 categor\u00edas tienen volumen y dispersi\u00f3n (oportunidad)?",[{label:"\u25b6 Iniciar barrido",primary:true,on:doDescubrir}]));
    if(!S.desc.length){ root.appendChild(el("div",{"class":"cz-empty"},'<div class="cz-empty-ic">\ud83e\udded</div><h3>Sin barrido a\u00fan</h3><p>El barrido mide volumen y dispersi\u00f3n de precios por t\u00e9rmino para revelar d\u00f3nde hay oportunidad de reventa.</p>')); return; }
    function sig(s){ if(s>=70) return ["alta","Alta"]; if(s>=45) return ["media","Media"]; return ["baja","Baja"]; }
    var ord=S.desc.slice().sort(function(a,b){ return (b.score||0)-(a.score||0); });
    var rows=ord.map(function(r){ var sg=sig(r.score||0); return '<tr><td><b>'+safe(r.term)+'</b></td><td style="color:#8696ac;font-size:12px">'+safe(r.area||"")+'</td><td style="text-align:right">'+(r.n||0)+'</td><td style="text-align:right"><b>'+mxn(r.med)+'</b></td><td style="text-align:right;color:#8696ac;font-size:12px">'+mxn(r.min)+' \u2013 '+mxn(r.max)+'</td><td style="text-align:right">'+(r.disp!=null?r.disp:"\u2014")+'</td><td style="text-align:center;font-weight:800">'+(r.score!=null?r.score:"\u2014")+'</td><td style="text-align:center"><span class="cz-sig '+sg[0]+'">'+sg[1]+'</span></td></tr>'; }).join("");
    var card=el("div",{"class":"cz-card"}); card.appendChild(el("div",{id:"cz-desc-board"},'<table><thead><tr><th>T\u00e9rmino</th><th>\u00c1rea</th><th style="text-align:right">n</th><th style="text-align:right">Mediana</th><th style="text-align:right">Rango</th><th style="text-align:right">Disp.</th><th style="text-align:center">Score</th><th style="text-align:center">Oport.</th></tr></thead><tbody>'+rows+'</tbody></table>')); root.appendChild(card);
  }
  function renderLab(){
    var root=byId("cz-v-lab"); if(!root) return;
    if(byId("cz-lab-host")){ adoptLab(); return; }
    root.innerHTML="";
    root.appendChild(navHeader("Laboratorio","Herramientas avanzadas \u2014 paneles originales, intactos",[]));
    root.appendChild(el("div",{"class":"cz-lab-note"},'Estos son los paneles t\u00e9cnicos originales (centro de mando, descubrir, sondas y espejo Notion), sin modificar.'));
    root.appendChild(el("div",{id:"cz-lab-host"})); adoptLab();
  }
  function adoptLab(){ var host=byId("cz-lab-host"); if(!host) return; LAB_IDS.forEach(function(id){ var n=byId(id); if(n && n.parentNode!==host){ n.setAttribute("data-cz-lab","1"); n.style.display=""; n.removeAttribute("data-cz-hid"); host.appendChild(n); } }); }

  // ================= ACCIONES (palancas reales) =================
  function doCazar(){
    var m=metrics();
    if(!m.configurado){ toast("Configura al menos una b\u00fasqueda primero."); if(modoExperto) setView("ajustes"); else goScene("quecazar",{force:true}); return; }
    cosecha="corriendo"; if(modoExperto){ renderVitals(); renderBanners(); } else { renderRail(); if(scene==="cazar") updateCazarProgress(); }
    try{ if(window.CZG_cosechaAuto&&typeof CZG_cosechaAuto.correr==="function"){ CZG_cosechaAuto.correr(); toast("C\u00e1ceria iniciada: abriendo Marketplace\u2026 mant\u00e9n Facebook al frente."); return; } }catch(e){ log("correr",e); }
    if(fire(["#czg-auto-go","#czg-go"])){ toast("C\u00e1ceria humanizada iniciada\u2026 mant\u00e9n el foco en Facebook."); return; }
    doAbrirMarketplace();
    try{ setTimeout(function(){ try{ chrome.runtime.sendMessage({tipo:"iniciar-cosecha"}); }catch(e){} },9000); }catch(e){ cosecha="idle"; }
  }
  function marketplaceUrls(){ var c=S.config||{}; var zona=c.zona||"queretaro"; var terms=(Array.isArray(c.busquedas)?c.busquedas:[]).filter(Boolean); return terms.map(function(t){ return "https://www.facebook.com/marketplace/"+encodeURIComponent(zona)+"/search/?query="+encodeURIComponent(t); }); }
  function doAbrirMarketplace(){
    var m=metrics(); if(!m.configurado){ toast("Configura al menos una b\u00fasqueda primero."); if(modoExperto) setView("ajustes"); else goScene("quecazar",{force:true}); return; }
    var urls=marketplaceUrls(); if(!urls.length){ toast("No hay b\u00fasquedas configuradas."); return; }
    try{ if(typeof chrome!=="undefined"&&chrome.tabs&&chrome.tabs.create){ chrome.tabs.create({url:urls[0],active:true}); for(var i=1;i<urls.length;i++) chrome.tabs.create({url:urls[i],active:false}); toast("Abriendo Marketplace para "+urls.length+" b\u00fasqueda(s)\u2026"); } else { urls.forEach(function(u){ try{ window.open(u,"_blank"); }catch(e){} }); toast("Abriendo Marketplace\u2026"); } }catch(e){ try{ window.open(urls[0],"_blank"); }catch(e2){} }
  }
  function doPuntuar(){
    if(typeof CG_SCORING==="undefined"||!CG_SCORING.puntuarTodos){ toast("El motor de scoring no est\u00e1 disponible."); return; }
    gl([HAL]).then(function(o){ var puntuados=CG_SCORING.puntuarTodos(o[HAL]||{}); sl({"cazagangas.hallazgos":puntuados}).then(function(){ toast("Hallazgos puntuados."); refresh(); }); });
  }
  function doSincronizar(){
    if(fire(["#cg-n-sync","#czg-go"])){ toast("Sincronizando a Notion\u2026"); }
    else if(window.CZG_notion&&CZG_notion.sincronizarComprables){ try{ CZG_notion.sincronizarComprables(); toast("Sincronizando comprables a Notion\u2026"); }catch(e){ toast("No pude sincronizar."); } }
    else toast("No encuentro el sincronizador de Notion.");
  }
  function doDescubrir(){ if(fire(["#czg-desc-go"])) toast("Barrido de descubrimiento iniciado\u2026"); else { setExperto(true); setView("lab"); toast("Abre el barrido desde el Laboratorio."); } }
  function doLogin(){ if(fire(["#czg-auto-login"])) toast("Abriendo el login de Facebook\u2026"); else { try{ chrome.tabs.create({url:"https://www.facebook.com/login",active:true}); }catch(e){ try{ window.open("https://www.facebook.com/login","_blank"); }catch(e2){} } } }
  function onCta(){ var nx=nextStep(); if(nx==="cfg") setView("ajustes"); else if(nx==="cazar") doCazar(); else if(nx==="puntuar") doPuntuar(); else if(nx==="sync") doSincronizar(); else { filtro="Perseguir"; setView("mesa"); } }
  function syncCtaLabel(){ var c=byId("cz-cta"); if(!c) return; var nx=nextStep(); var map={cfg:"\u2699\ufe0f Configurar",cazar:"\u25b6 Cazar",puntuar:"\ud83d\udcca Puntuar",sync:"\u2601\ufe0f Sincronizar",revisar:"\ud83c\udfaf Revisar"}; c.textContent=map[nx]||"\u25b6 Siguiente"; }

  // ================= PALETA DE COMANDOS =================
  var palCmds=[
    {ic:"\ud83d\ude89",lb:"Ir al recorrido (And\u00e9n)",ds:"vista guiada",run:function(){ setExperto(false); goScene("anden",{force:true}); }},
    {ic:"\u26cf\ufe0f",lb:"Cazar (c\u00e1ceria completa)",ds:"cosecha + punt\u00faa + Notion",run:doCazar},
    {ic:"\ud83d\udd0d",lb:"Abrir Facebook Marketplace",ds:"abre tus b\u00fasquedas configuradas",run:doAbrirMarketplace},
    {ic:"\ud83c\udf3e",lb:"Solo cosechar",ds:"requiere Marketplace abierto",run:function(){ try{ chrome.runtime.sendMessage({tipo:"iniciar-cosecha"}); toast("Cosecha lanzada (necesita una pesta\u00f1a de Marketplace abierta)."); }catch(e){} }},
    {ic:"\ud83d\udcca",lb:"Puntuar hallazgos",ds:"scoring",run:doPuntuar},
    {ic:"\u2601\ufe0f",lb:"Sincronizar a Notion",ds:"subir comprables",run:doSincronizar},
    {ic:"\ud83d\udcca",lb:"Ir al Observatorio",ds:"feed, frontera, nuevos",run:function(){ setExperto(true); setView("observatorio"); }},
    {ic:"\ud83e\udded",lb:"Barrido de descubrimiento",ds:"oportunidad",run:doDescubrir},
    {ic:"\ud83d\udd11",lb:"Iniciar sesi\u00f3n en Facebook",ds:"sesi\u00f3n",run:doLogin},
    {ic:"\u25c6",lb:"Ir a La Mesa (recorrido)",ds:"resultado final",run:function(){ setExperto(false); goScene("mesa",{force:true}); }},
    {ic:"\u2699\ufe0f",lb:"Ir a Ajustes (experto)",ds:"config",run:function(){ setExperto(true); setView("ajustes"); }},
    {ic:"\ud83e\uddea",lb:"Ir al Laboratorio",ds:"avanzado",run:function(){ setExperto(true); setView("lab"); }},
    {ic:"\ud83d\uddc2\ufe0f",lb:"Abrir base Hallazgos en Notion",ds:"notion",run:function(){ var db=S.config&&S.config.dbId; try{ window.open(db?(NB+String(db).replace(/-/g,"")):NB,"_blank"); }catch(e){} }},
    {ic:"\ud83e\udde0",lb:"Reiniciar aprendizaje (afinidad IA)",ds:"borra lo aprendido del uso",run:function(){ if(!window.CZG_aprendizaje){ toast("Aprendizaje no disponible."); return; } if(typeof confirm==="function"&&!confirm("\u00bfReiniciar todo lo que el sistema ha aprendido de tu uso?")) return; window.CZG_aprendizaje.reset().then(function(){ toast("Aprendizaje reiniciado a base."); try{ renderAll(); }catch(e){} }); }}
  ];
  var palSel=0, palView=palCmds;
  function openPal(){ var bg=byId("cz-pal-bg"); if(!bg) return; bg.classList.add("on"); var i=byId("cz-pal-inp"); if(i){ i.value=""; i.focus(); } renderPal(""); }
  function closePal(){ var bg=byId("cz-pal-bg"); if(bg) bg.classList.remove("on"); }
  function renderPal(q){ q=(q||"").toLowerCase().trim(); palView=palCmds.filter(function(c){ return !q || c.lb.toLowerCase().indexOf(q)>=0 || (c.ds&&c.ds.toLowerCase().indexOf(q)>=0); }); palSel=0; var list=byId("cz-pal-list"); if(!list) return; list.innerHTML=""; palView.forEach(function(c,idx){ var it=el("div",{"class":"cz-pal-item"+(idx===0?" sel":"")},'<span class="ic">'+c.ic+'</span><span class="lb">'+safe(c.lb)+'</span><span class="ds">'+safe(c.ds||"")+'</span>'); it.addEventListener("click",function(){ closePal(); c.run(); }); it.addEventListener("mousemove",function(){ setSel(idx); }); list.appendChild(it); }); }
  function setSel(i){ palSel=i; qsa("#cz-pal-list .cz-pal-item").forEach(function(n,idx){ n.classList.toggle("sel",idx===i); }); }
  function onPalKey(ev){ if(ev.key==="ArrowDown"){ ev.preventDefault(); setSel(Math.min(palSel+1,palView.length-1)); scrollSel(); } else if(ev.key==="ArrowUp"){ ev.preventDefault(); setSel(Math.max(palSel-1,0)); scrollSel(); } else if(ev.key==="Enter"){ ev.preventDefault(); var c=palView[palSel]; if(c){ closePal(); c.run(); } } else if(ev.key==="Escape"){ closePal(); } }
  function scrollSel(){ var n=qsa("#cz-pal-list .cz-pal-item")[palSel]; if(n&&n.scrollIntoView) try{ n.scrollIntoView({block:"nearest"}); }catch(e){} }
  function onGlobalKey(ev){ if((ev.metaKey||ev.ctrlKey)&&(ev.key==="k"||ev.key==="K")){ ev.preventDefault(); openPal(); return; } var bg=byId("cz-pal-bg"); var open=bg&&bg.classList.contains("on"); if(!open && ev.key==="/"){ var t=ev.target, tag=(t&&t.tagName||"").toLowerCase(); if(tag!=="input"&&tag!=="textarea"&&tag!=="select"&&!(t&&t.isContentEditable)){ ev.preventDefault(); openPal(); } } }

  // ================= SESION FB (solo lectura) =================
  function leerSesion(){
    try{ chrome.cookies.get({url:"https://www.facebook.com",name:"c_user"},function(cu){ if(!cu){ sesion={logueado:false,dias:null}; postSesion(); return; } chrome.cookies.get({url:"https://www.facebook.com",name:"xs"},function(xs){ var exp=(xs&&xs.expirationDate)||(cu&&cu.expirationDate)||null; var dias=exp?Math.max(0,(exp*1000-Date.now())/86400000):null; sesion={logueado:true,dias:dias}; postSesion(); }); }); }catch(e){ sesion={logueado:null,dias:null}; }
  }
  function postSesion(){ if(modoExperto){ renderVitals(); renderBanners(); } else { renderRail(); if(scene==="anden"){ builtScene=null; renderJourney(); } } }

  // ================= SUSCRIPCIONES =================
  function subscribe(){
    try{ chrome.storage.onChanged.addListener(function(changes,area){ if(area!=="local") return; if(changes[CFG]||changes[HAL]||changes[ENR]||changes[SYN]||changes[DESC]||changes[OBS]||changes[PIPE]||changes[RUN]) refresh(); }); }catch(e){}
    try{ chrome.runtime.onMessage.addListener(function(msg){ if(!msg) return; if(msg.tipo==="czg-estado"){ cosecha=(msg.estado==="corriendo")?"corriendo":(msg.estado==="pausado"?"pausado":"idle"); if(modoExperto){ renderVitals(); renderBanners(); } else { renderRail(); if(scene==="cazar") updateCazarProgress(); } } else if(msg.tipo==="czg-bloqueo"){ bloqueo=msg.motivo||"verificaci\u00f3n"; cosecha="idle"; if(modoExperto){ renderVitals(); renderBanners(); } else { renderRail(); if(scene==="cazar") updateCazarProgress(); } } else if(msg.tipo==="hallazgos"){ cosecha="corriendo"; if(modoExperto) renderVitals(); else if(scene==="cazar") updateCazarProgress(); } }); }catch(e){}
  }

  // ================= OBSERVER =================
  function startObserver(){ try{ obs=new MutationObserver(function(){ if(suppressObs) return; suppressObs=true; try{ hideLegacy(); if(modoExperto&&view==="lab") adoptLab(); }catch(e){} suppressObs=false; }); obs.observe(document.body,{childList:true}); }catch(e){} setInterval(function(){ try{ hideLegacy(); }catch(e){} },1500); }

  // ================= ARRANQUE =================
  function start(){
    if(!document.body){ return setTimeout(start,30); }
    try{ if(window.CZ_TEL){ CZ_TEL.init({app:"cazagangas",modulo:"shell",ver:VER}); CZ_TEL.log("shell","info","arranque"); } }catch(e){}
    try{ window.addEventListener("error",function(ev){ try{ if(window.CZ_TEL) CZ_TEL.log("shell","error",(ev&&ev.message)||"error",{archivo:(ev&&ev.filename)||""}); }catch(_){} }); }catch(e){}
    try{ build(); }catch(e){ log("build err",e); showFatal(e); return; }
    try{ var bc=byId("btnCosechar"); if(bc&&bc.parentNode&&bc.parentNode!==app) bc.parentNode.style.display="none"; }catch(e){}
    hideLegacy();
    try{ renderAll(); }catch(e){ log("first paint err",e); }   // pintado inmediato: no esperar al storage
    subscribe(); leerSesion(); setInterval(leerSesion,60000);
    refresh().then(function(){ if(modoExperto){ renderBody(); syncCtaLabel(); } }, function(e){ log("refresh err",e); try{ renderAll(); }catch(_){} });
    startObserver();
    try{ var _bdg=document.getElementById("cz-boot-badge"); if(_bdg) _bdg.style.display="none"; }catch(e){}
    log("El Recorrido v"+VER+" listo");
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
