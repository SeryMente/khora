// Cazagangas - notion-update.js (v0.9.0) CENTRO DE MANDO: 1 boton, lista accionable, contactar, categorias
(() => {
  const VER = "0.9.2";
  const ENR="cazagangas.enriquecidos", SYN="cazagangas.synced", CFG="cazagangas.config", HAL="cazagangas.hallazgos";
  const notionFetch = self.NotionAdapter ? self.NotionAdapter.fetch : window.NotionAdapter ? window.NotionAdapter.fetch : async () => null;
  const getToken = self.NotionAdapter ? self.NotionAdapter.getToken : window.NotionAdapter ? window.NotionAdapter.getToken : () => "";

  const NV="2022-06-28", API="https://api.notion.com/v1/pages/", GAP=420;
  const $=s=>document.querySelector(s);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const gLocal=k=>new Promise(r=>chrome.storage.local.get(k,r));
  const sLocal=o=>new Promise(r=>chrome.storage.local.set(o,r));

  const CAT_NUCLEO=[
    {id:'trabajo', nombre:'Trabajo remoto', terminos:['webcam logitech c920','webcam logitech c270','camara web','microfono usb','headset usb','audifonos con microfono']},
    {id:'perifericos', nombre:'Perifericos liquidos', terminos:['monitor 22','monitor 24','teclado mecanico','mouse logitech']},
    {id:'redes', nombre:'Red e internet', terminos:['router wifi','repetidor wifi']},
    {id:'componentes', nombre:'Componentes chicos', terminos:['ssd 240gb','ssd 480gb','memoria ram ddr4']},
    {id:'herramienta', nombre:'Herramienta compacta', terminos:['taladro','rotomartillo','herramienta','multimetro']},
    {id:'uso_personal', nombre:'Uso personal', terminos:['mochila','maleta','botas impermeables','tenis nike']},
    {id:'reventa_baja', nombre:'Reventa bajo capital', terminos:['bicicleta','lote ropa','remate','urge vender','mudanza']}
  ];
  const CATKW={
    "Celulares":["celular","iphone","galaxy","samsung","xiaomi","redmi","motorola","moto ","poco","honor","realme","oppo","huawei","telefono","note","a06","a5"],
    "Videojuegos":["nintendo","switch","playstation","ps4","ps5","xbox","videojuego","consola","wii","control"],
    "Audio":["audifono","airpod","jbl","bocina","bose","sony wh","beats","parlante","altavoz"],
    "Tablets":["ipad","tablet","tableta"],
    "Smartwatch":["apple watch","smartwatch","galaxy watch","reloj intelig","amazfit"]
  };
  function norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
  function categoriaDe(t){ const n=norm(t); for(const c in CATKW){ if(CATKW[c].some(k=>n.indexOf(k)>=0)) return c; } return "Otro"; }
  function normUrl(u){ return (u||"").split("?")[0].replace(/\/$/,""); }
  function precioFmt(n){ if(n==null||isNaN(n)) return ""; return "$"+Number(n).toLocaleString("es-MX"); }

  function itemIdDe(url){ const m=(url||"").match(/\/item\/(\d+)/); return m?m[1]:""; }
  function pageIdDe(rec, syn){ const id=rec.itemId||itemIdDe(rec.url); return syn[id]||syn[rec.url]||syn[(rec.url||"").replace(/\/$/,"")]||null; }
  function ms(a){ return (a||[]).map(n=>({name:n})); }
  function rt(s){ return [{type:"text",text:{content:(s||"").slice(0,1900)}}]; }
  function props(rec){ const p={}; if(rec.estado) p["Estado"]={select:{name:rec.estado}}; if(rec.riesgo) p["Riesgo"]={select:{name:rec.riesgo}}; p["Banderas +"]={multi_select:ms(rec.banderasPos)}; p["Banderas -"]={multi_select:ms(rec.banderasNeg)}; if(rec.senal) p["Se\u00f1al de precio"]={select:{name:rec.senal}}; if(rec.veredicto) p["Veredicto"]={select:{name:rec.veredicto}}; p["Notas"]={rich_text:rt(rec.notas)}; return p; }
  async function patch(pageId, properties){ const res = await notionFetch(API+pageId,{method:"PATCH",body:JSON.stringify({properties})}); if(!res) throw new Error("reintentos agotados"); if(res.ok) return true; let msg=String(res.status); try{ const j=await res.json(); if(j&&j.message) msg+=" "+j.message; }catch(e){} throw new Error(msg); }
  async function datos(){ const enr=(await gLocal(ENR))[ENR]||{}; const syn=(await gLocal(SYN))[SYN]||{}; const arr=Object.keys(enr).map(k=>enr[k]).sort((a,b)=>b.score-a.score); return {arr,syn}; }
  async function halMap(){ const raw=(await gLocal(HAL))[HAL]; const list=Array.isArray(raw)?raw:(raw&&typeof raw==="object"?Object.keys(raw).map(k=>raw[k]):[]); const m={}; list.forEach(h=>{ const u=normUrl(h.url||h.enlace||""); if(!u) return; let pr=(h.precioNum!=null?h.precioNum:(h.precio!=null?h.precio:null)); if(typeof pr!=="number") pr=parseInt(String(pr||"").replace(/[^0-9]/g,""),10); if(isNaN(pr)) pr=null; m[u]={precio:pr, ref:(h.precioRef!=null?h.precioRef:null), pct:(h.pctDescuento!=null?h.pctDescuento:null)}; }); return m; }

  function prog(pct,label){ const b=$("#czg-bar"); const t=$("#czg-bar-txt"); if(b) b.style.width=Math.max(0,Math.min(100,pct))+"%"; if(t&&label!=null) t.textContent=label; }
  function toast(msg){ let t=$("#czg-toast"); if(!t){ t=document.createElement("div"); t.id="czg-toast"; t.style.cssText="position:fixed;right:18px;bottom:18px;background:#222;color:#fff;padding:10px 16px;border-radius:8px;font:13px system-ui;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999;opacity:0;transition:opacity .25s"; document.body.appendChild(t); } t.textContent=msg; t.style.opacity="1"; clearTimeout(t._h); t._h=setTimeout(()=>{ t.style.opacity="0"; },2600); }

  async function contactar(url,titulo){ window.open(url,"_blank"); const msg="Hola, vi tu publicacion"+(titulo?(' "'+titulo.slice(0,40)+'"'):"")+". Sigue disponible? Cual es tu mejor precio?"; try{ await navigator.clipboard.writeText(msg); toast("Anuncio abierto. Mensaje copiado al portapapeles."); }catch(e){ toast("Anuncio abierto."); } }

  const E=()=>window.CZG_enr||{};
  let FILTRO="perseguir";

  async function refrescarEstado(){
    const enr=(await gLocal(ENR))[ENR]||{}; const syn=(await gLocal(SYN))[SYN]||{};
    const eArr=Object.keys(enr).map(k=>enr[k]);
    const hm=await halMap();
    let pi={n:0}; try{ pi=await E().poolInfo(); }catch(e){}
    const cos=Object.keys(hm).length;
    const enNot=eArr.filter(r=>pageIdDe(r,syn)).length;
    const per=eArr.filter(r=>r.veredicto==="Perseguir").length;
    const set=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
    set("#czg-c-cos",cos); set("#czg-c-cap",pi.n||0); set("#czg-c-ana",eArr.length); set("#czg-c-not",enNot); set("#czg-c-per",per);
  }

  async function renderLista(){
    const cont=$("#czg-list"); if(!cont) return;
    const {arr,syn}=await datos(); const hm=await halMap();
    document.querySelectorAll("#czg-tabs button").forEach(b=>{ const on=b.dataset.f===FILTRO; b.style.background=on?"#2d6cdf":"#fff"; b.style.color=on?"#fff":"#2d6cdf"; });
    let rows=arr;
    if(FILTRO==="perseguir") rows=arr.filter(r=>r.veredicto==="Perseguir");
    else if(FILTRO==="revisar") rows=arr.filter(r=>r.veredicto==="Revisar");
    else if(FILTRO==="evitar") rows=arr.filter(r=>r.veredicto==="Evitar");
    if(!rows.length){ cont.innerHTML='<div style="padding:18px;color:#888;text-align:center">Sin resultados aqui todavia. Corre la caceria.</div>'; return; }
    const safe=s=>(s||"").replace(/</g,"&lt;").replace(/"/g,"&quot;");
    const badge=v=>{ const c=v==="Perseguir"?"#0a7d28":v==="Evitar"?"#c0271a":"#b4790a"; const bg=v==="Perseguir"?"#e7f6ec":v==="Evitar"?"#fdecea":"#fdf4e3"; return '<span style="font-weight:700;font-size:11px;color:'+c+';background:'+bg+';padding:2px 8px;border-radius:20px">'+v+'</span>'; };
    const filas=rows.map(r=>{ const u=normUrl(r.url); const h=hm[u]||{}; const cat=categoriaDe(r.titulo);
      const precio=h.precio!=null?precioFmt(h.precio):"";
      const pct=(h.pct!=null)?(" -"+Math.round((h.pct<=1?h.pct*100:h.pct))+"%"):"";
      const pend=(r.fuente==="contaminado"||r.fuente==="vacio");
      return '<tr style="border-top:1px solid #eef0f3">'+
        '<td style="padding:8px 8px">'+badge(r.veredicto)+'</td>'+
        '<td style="padding:8px 8px"><span style="font-size:11px;color:#444;background:#eef2f8;padding:2px 7px;border-radius:5px">'+cat+'</span></td>'+
        '<td style="padding:8px 8px;max-width:300px"><a href="'+safe(r.url)+'" target="_blank" style="color:#1a3a6b;text-decoration:none;font-weight:500">'+safe((r.titulo||"(sin titulo)").slice(0,52))+'</a>'+(pend?'<div style="font-size:11px;color:#c0271a">sin descripcion confiable</div>':'')+'</td>'+
        '<td style="padding:8px 8px;white-space:nowrap"><b>'+(precio||"\u2014")+'</b><div style="font-size:11px;color:#0a7d28">'+(r.senal||"")+pct+'</div></td>'+
        '<td style="padding:8px 8px;text-align:center;color:#555">'+r.score+'</td>'+
        '<td style="padding:8px 8px;font-size:11px;color:#777">'+(r.riesgo||"\u2014")+'</td>'+
        '<td style="padding:8px 8px"><button class="czg-ct" data-url="'+safe(r.url)+'" data-t="'+safe(r.titulo)+'" style="background:#0a7d28;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-weight:600;cursor:pointer">Contactar</button></td>'+
        '</tr>';
    }).join("");
    cont.innerHTML='<table style="border-collapse:collapse;width:100%;font:13px system-ui"><thead><tr style="text-align:left;color:#888;font-size:11px;text-transform:uppercase"><th style="padding:6px 8px">Veredicto</th><th style="padding:6px 8px">Categoria</th><th style="padding:6px 8px">Anuncio</th><th style="padding:6px 8px">Precio</th><th style="padding:6px 8px">Score</th><th style="padding:6px 8px">Riesgo</th><th style="padding:6px 8px"></th></tr></thead><tbody>'+filas+'</tbody></table>';
    cont.querySelectorAll(".czg-ct").forEach(b=>b.addEventListener("click",()=>contactar(b.dataset.url,b.dataset.t)));
  }

  async function aplicarAuto(onProg){ const {arr,syn}=await datos(); const conPag=arr.filter(r=>pageIdDe(r,syn)); let ok=0,err=0; const fallas=[]; for(let i=0;i<conPag.length;i++){ const rec=conPag[i]; try{ await patch(pageIdDe(rec,syn),props(rec)); ok++; }catch(e){ err++; fallas.push({t:rec.titulo,r:(e&&e.message)||String(e)}); } if(onProg) onProg(i+1,conPag.length,ok,err); await sleep(GAP); } return {ok,err,total:conPag.length,fallas}; }

  async function cazar(){
    if(!E().capturarTodo){ prog(0,"Motor no cargado. Recarga la extension."); return; }
    let nc=0; try{ nc=E().candidatosCount(); }catch(e){}
    if(!nc){ if(!confirm("No veo anuncios puntuados en esta pagina. Primero da 'Cosechar ahora' y 'Puntuar hallazgos' arriba. Continuar de todas formas?")) return; }
    if(!confirm("Cazar gangas: capturare los anuncios en Facebook, los analizare y los guardare en Notion. Continuar?")) return;
    const btns=document.querySelectorAll("#czg-dash .czg-act"); btns.forEach(b=>b.disabled=true);
    try{
      prog(3,"Capturando en Facebook (pestanas en segundo plano)...");
      await E().capturarTodo((d,t)=>prog(5+55*(d/Math.max(1,t)),"Capturando "+d+"/"+t+" en Facebook..."));
      prog(62,"Analizando offline...");
      const r=await E().analizarAhora();
      prog(68,"Analisis: Perseguir "+r.nPer+" / Revisar "+r.nRev+" / Evitar "+r.nEvi+". Guardando en Notion...");
      const res=await aplicarAuto((d,t,ok,err)=>prog(70+30*(d/Math.max(1,t)),"Guardando en Notion "+d+"/"+t+" (ok "+ok+")..."));
      prog(100,"LISTO. "+r.nPer+" para perseguir. Notion: ok "+res.ok+" / err "+res.err+".");
      FILTRO="perseguir"; await renderLista(); await refrescarEstado();
      toast("Caceria completa: "+r.nPer+" gangas para perseguir.");
    }catch(e){ prog(100,"DETENIDO: "+((e&&e.message)||e)); }
    finally{ btns.forEach(b=>b.disabled=false); }
  }

  async function reintentar(){ if(!confirm("Reintentar solo las fallidas/contaminadas y re-guardar en Notion?")) return; const btns=document.querySelectorAll("#czg-dash .czg-act"); btns.forEach(b=>b.disabled=true); try{ prog(3,"Reintentando fallidas..."); await E().reintentarAuto((d,t)=>prog(5+55*(d/Math.max(1,t)),"Reintentando "+d+"/"+t+"...")); prog(62,"Analizando..."); const r=await E().analizarAhora(); prog(68,"Guardando..."); const res=await aplicarAuto((d,t,ok)=>prog(70+30*(d/Math.max(1,t)),"Guardando "+d+"/"+t+"...")); prog(100,"LISTO. Notion ok "+res.ok+" / err "+res.err+"."); await renderLista(); await refrescarEstado(); }catch(e){ prog(100,"DETENIDO: "+((e&&e.message)||e)); } finally{ btns.forEach(b=>b.disabled=false); } }

  async function renderCfg(){
    const cfg=(await gLocal(CFG))[CFG]||{}; const activas=cfg.categoriasActivas||['trabajo','perifericos','redes','componentes','herramienta','uso_personal','reventa_baja'];
    const box=$("#czg-cfg-list"); if(!box) return;
    box.innerHTML=CAT_NUCLEO.map(c=>'<label style="display:inline-flex;align-items:center;gap:6px;margin:4px 12px 4px 0;font-size:13px"><input type="checkbox" class="czg-cat" value="'+c.id+'" '+(activas.indexOf(c.id)>=0?"checked":"")+'> '+c.nombre+' <span style="color:#aaa;font-size:11px">('+c.terminos.length+")</span></label>").join("");
  }
  async function guardarCategorias(){
    const ids=Array.from(document.querySelectorAll(".czg-cat")).filter(c=>c.checked).map(c=>c.value);
    if(!ids.length){ $("#czg-cfg-status").textContent="Selecciona al menos una categoria."; return; }
    const terms=[]; CAT_NUCLEO.forEach(c=>{ if(ids.indexOf(c.id)>=0) c.terminos.forEach(t=>{ if(terms.indexOf(t)<0) terms.push(t); }); });
    const cur=(await gLocal(CFG))[CFG]||{};
    cur.busquedas=terms; cur.categoriasActivas=ids; if(!cur.zona) cur.zona="queretaro"; if(cur.umbral==null) cur.umbral=20; if(cur.pararFueraZona==null) cur.pararFueraZona=true; if(!cur.dbId) cur.dbId="f038f642-18e5-4eb0-ac6f-b4118ea4f0b0";
    await sLocal({[CFG]:cur});
    $("#czg-cfg-status").textContent="Guardado. La proxima 'Cosecha' buscara: "+terms.join(", ");
    toast("Categorias guardadas ("+ids.length+").");
  }

  // ---- Capa manual selectiva (avanzado) ----
  function pintarFallas(fallas){ if(!fallas||!fallas.length) return; const safe=s=>(s||"").replace(/</g,"&lt;"); const li=fallas.map(f=>'<li style="color:#b00">'+safe((f.t||"").slice(0,42))+" - "+safe(f.r)+"</li>").join(""); $("#czg-adv-detalle").insertAdjacentHTML("afterbegin",'<div style="margin:8px 0;padding:8px;border:1px solid #f1c0c0;background:#fff5f5;border-radius:6px"><b>Fallas ('+fallas.length+'):</b><ul style="margin:6px 0 0 18px">'+li+"</ul></div>"); }
  async function previsualizar(){ const {arr,syn}=await datos(); if(!arr.length){ $("#czg-adv-detalle").textContent="No hay analisis."; return; } const safe=s=>(s||"").replace(/</g,"&lt;").replace(/"/g,"&quot;"); let en=0; const f=arr.map(r=>{ const pid=pageIdDe(r,syn); const t=!!pid; if(t)en++; return '<tr style="border-top:1px solid #eee"><td style="padding:3px 6px"><input type="checkbox" class="czg-chk" data-url="'+safe(r.url)+'" data-page="'+(t?"1":"0")+'" '+(t?"checked":"disabled")+'></td><td style="padding:3px 6px">'+r.score+'</td><td style="padding:3px 6px">'+(r.veredicto||"")+'</td><td style="padding:3px 6px">'+(t?"si":"no")+'</td><td style="padding:3px 6px">'+safe((r.titulo||"").slice(0,30))+"</td></tr>"; }).join(""); $("#czg-adv-detalle").innerHTML='<div style="font-size:12px;color:#555;margin:6px 0">'+en+' de '+arr.length+' en Notion. Desmarca lo que no quieras.</div><table style="border-collapse:collapse;font-size:12px;width:100%"><thead><tr style="text-align:left"><th style="padding:3px 6px"></th><th style="padding:3px 6px">Score</th><th style="padding:3px 6px">Veredicto</th><th style="padding:3px 6px">En Notion</th><th style="padding:3px 6px">Anuncio</th></tr></thead><tbody>'+f+'</tbody></table>'; }
  async function aplicarSel(){ const {arr,syn}=await datos(); const mapa={}; arr.forEach(r=>mapa[r.url]=r); const chks=Array.from(document.querySelectorAll(".czg-chk")).filter(c=>c.checked&&c.dataset.page==="1"); if(!chks.length){ toast("Nada seleccionado. Previsualiza primero."); return; } if(!confirm("Escribir "+chks.length+" filas a Notion?")) return; let ok=0,err=0; const fallas=[]; for(let i=0;i<chks.length;i++){ const rec=mapa[chks[i].dataset.url]; if(!rec) continue; const pid=pageIdDe(rec,syn); try{ await patch(pid,props(rec)); ok++; }catch(e){ err++; fallas.push({t:rec.titulo,r:(e&&e.message)||String(e)}); } } toast("Actualizadas "+ok+" / err "+err+"."); pintarFallas(fallas); }

  function montar(){
    if($("#czg-dash")) return;
    const d=document.createElement("div");
    d.id="czg-dash";
    d.style.cssText="margin:14px 0;padding:0;border:1px solid #dfe3ea;border-radius:14px;font-family:system-ui,sans-serif;max-width:1080px;background:#fff;box-shadow:0 2px 12px rgba(20,40,80,.06);overflow:hidden";
    d.innerHTML=
      '<div style="padding:16px 20px;background:linear-gradient(90deg,#1f4fb0,#2d6cdf);color:#fff">'+
        '<div style="font-size:17px;font-weight:800">Cazagangas - Centro de Mando <span style="font-weight:500;opacity:.8;font-size:12px">v'+VER+'</span></div>'+
        '<div style="font-size:12px;opacity:.9;margin-top:2px">Encuentra que comprar con minimo esfuerzo y contacta al vendedor.</div>'+
      '</div>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;padding:14px 20px;background:#f7f9fc;border-bottom:1px solid #eef0f3">'+
        chip("Cosechados","czg-c-cos","#1f4fb0")+chip("Capturados","czg-c-cap","#1f4fb0")+chip("Analizados","czg-c-ana","#1f4fb0")+chip("En Notion","czg-c-not","#1f4fb0")+chip("A perseguir","czg-c-per","#0a7d28")+
      '</div>'+
      '<div style="padding:16px 20px">'+
        '<div style="font-size:12px;color:#777;margin-bottom:8px">Paso 1: <b>Cosechar ahora</b> + <b>Puntuar hallazgos</b>.&nbsp; Paso 2: este boton hace el resto.</div>'+
        '<button id="czg-go" class="czg-act" style="background:#0a7d28;color:#fff;border:none;border-radius:10px;padding:12px 26px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(10,125,40,.25)">Cazar gangas</button>'+
        '<div style="margin-top:14px;background:#eef1f6;border-radius:8px;height:18px;overflow:hidden"><div id="czg-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#0a7d28,#37b85a);transition:width .35s"></div></div>'+
        '<div id="czg-bar-txt" style="margin-top:6px;font-size:12px;color:#555">Listo para empezar.</div>'+
        '<div id="czg-status" style="margin-top:2px;font-size:12px;color:#888"></div>'+
      '</div>'+
      '<div style="padding:0 20px 6px">'+
        '<div id="czg-tabs" style="display:flex;gap:8px;flex-wrap:wrap">'+
          tab("Para perseguir","perseguir")+tab("Para revisar","revisar")+tab("Evitar","evitar")+tab("Todo","todo")+
        '</div>'+
        '<div id="czg-list" style="margin-top:10px;overflow:auto"></div>'+
      '</div>'+
      '<details style="border-top:1px solid #eef0f3;padding:12px 20px"><summary style="cursor:pointer;font-weight:600;font-size:13px;color:#444">Configuracion de categorias</summary>'+
        '<div style="margin-top:10px"><div id="czg-cfg-list"></div>'+
        '<div style="font-size:11px;color:#c0271a;margin:8px 0">Nota: para que los precios de referencia sean limpios, cosecha pocas categorias afines por pasada (mezclar muchas distorsiona el precio de referencia).</div>'+
        '<button id="czg-cfg-load" style="padding:6px 12px;margin-right:6px;border:1px solid #2d6cdf;background:#fff;color:#2d6cdf;border-radius:6px;cursor:pointer">Cargar catalogo nucleo (5)</button>'+
        '<button id="czg-cfg-save" style="padding:6px 12px;border:none;background:#2d6cdf;color:#fff;border-radius:6px;cursor:pointer">Guardar para proxima cosecha</button>'+
        '<div id="czg-cfg-status" style="margin-top:6px;font-size:12px;color:#0a7d28"></div></div>'+
      '</details>'+
      '<details style="border-top:1px solid #eef0f3;padding:12px 20px"><summary style="cursor:pointer;font-weight:600;font-size:13px;color:#444">Avanzado</summary>'+
        '<div style="margin-top:10px">'+
        '<button id="czg-recap" class="czg-act" style="padding:6px 12px;margin:0 6px 6px 0">Reintentar solo fallidas + Notion</button>'+
        '<button id="czg-exp" style="padding:6px 12px;margin:0 6px 6px 0">Exportar pool</button>'+
        '<button id="czg-imp" style="padding:6px 12px;margin:0 6px 6px 0">Importar pool</button>'+
        '<input id="czg-file" type="file" accept="application/json" style="display:none">'+
        '<button id="czg-prev" style="padding:6px 12px;margin:0 6px 6px 0">Previsualizar Notion (selectivo)</button>'+
        '<button id="czg-apl" style="padding:6px 12px;margin:0 6px 6px 0">Aplicar seleccionadas</button>'+
        '<div id="czg-adv-detalle" style="margin-top:8px;overflow:auto"></div></div>'+
      '</details>';
    if(document.body.firstChild){ document.body.insertBefore(d, document.body.firstChild); } else { document.body.appendChild(d); } try{ window.scrollTo({top:0,behavior:"smooth"}); }catch(e){}
    $("#czg-go").addEventListener("click",cazar);
    document.querySelectorAll("#czg-tabs button").forEach(b=>b.addEventListener("click",()=>{ FILTRO=b.dataset.f; renderLista(); }));
    $("#czg-cfg-load").addEventListener("click",()=>{ document.querySelectorAll(".czg-cat").forEach(c=>c.checked=true); $("#czg-cfg-status").textContent="Catalogo cargado. Pulsa Guardar."; });
    $("#czg-cfg-save").addEventListener("click",guardarCategorias);
    $("#czg-recap").addEventListener("click",reintentar);
    $("#czg-exp").addEventListener("click",()=>E().exportar&&E().exportar());
    $("#czg-imp").addEventListener("click",()=>$("#czg-file").click());
    $("#czg-file").addEventListener("change",e=>{ const f=e.target.files&&e.target.files[0]; if(f&&E().importar) E().importar(f); e.target.value=""; });
    $("#czg-prev").addEventListener("click",previsualizar);
    $("#czg-apl").addEventListener("click",aplicarSel);
    renderCfg(); refrescarEstado(); renderLista();
    console.log("[centro-mando] montado v"+VER);
  }
  function chip(label,id,color){ return '<div style="background:#fff;border:1px solid #e4e8ef;border-radius:10px;padding:8px 14px;min-width:84px"><div style="font-size:20px;font-weight:800;color:'+color+'" id="'+id+'">0</div><div style="font-size:11px;color:#888">'+label+'</div></div>'; }
  function tab(label,f){ return '<button data-f="'+f+'" style="border:1px solid #2d6cdf;background:#fff;color:#2d6cdf;border-radius:18px;padding:5px 14px;font-size:12px;font-weight:600;cursor:pointer">'+label+'</button>'; }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",montar); else montar();
})();