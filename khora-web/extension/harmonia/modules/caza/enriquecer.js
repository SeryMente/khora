// Cazagangas - enriquecer.js (v0.9.0) MOTOR: captura+analisis, expone API (sin UI propia)
(() => {
  const VER = "0.9.0";
  const ENR = "cazagangas.enriquecidos";
  const COR = "cazagangas.corpus";
  const TOP = 30, V_ALTO = 78;
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a,b) => a + Math.random()*(b-a);
  const gLocal = k => new Promise(r => chrome.storage.local.get(k, r));
  const sLocal = o => new Promise(r => chrome.storage.local.set(o, r));

  const RIESGOS = {
    "daniado":  ["danad","roto","rompi","quebrad","estrellad","trizad","rajad","partido","cuartead","no enciende","no prende","no carga","bateria mala","pila mala","pantalla rota","pantalla mala","no da imagen","mojad","sumergi","golpe fuerte"],
    "cosmetico":["detalle en pantalla","detalle en la pantalla","tiene detalle","con detalle","un detalle","detallito","pequeno detalle","rayit","rayon","raspad","raspon","marcas de uso","marca de uso","manchas","astillad","despostillad"],
    "piezas":   ["para piezas","por piezas","para refacc","refacciones","repuesto","desarme","no completo","no sirve","no funciona","para reparar","o reparar","para reparacion","para emergencia"],
    "bloqueo":  ["icloud","cuenta google","cuenta de google","frp","imei reportad","reportad","bloqueo de","bloqueado de","bloqueado por icloud","cuenta de icloud","bloquead"],
    "credito":  ["payjoy","pay joy","a credito","krediya","financ","mensualidad","enganche","quincenal"],
    "origen":   ["sin factura","no aclaro origen","no preguntes origen","no pregunten origen","clonad","robad"]
  };
  const EVITAR_CATS = ["daniado","piezas","bloqueo","credito","origen"];
  const POSITIVOS = {
    "liberado":   ["liberado","liberada","desbloqueado","desbloqueada","para cualquier compania","cualquier compania"],
    "factura":    ["con factura","factura original","tengo factura"],
    "sellado":    ["sellado","nuevo en caja","nuevo sellado","en su caja"],
    "buen_estado":["como nuevo","excelente estado","buen estado","seminuevo","poco uso","sin detalles","sin ningun detalle"],
    "accesorios": ["con cargador","con caja","caja y accesorios","todos sus accesorios"]
  };

  function norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
  function recortePalabra(s, max){ s=(s||"").replace(/\s+/g," ").trim(); if(s.length<=max) return s; const cut=s.slice(0,max); const sp=cut.lastIndexOf(" "); return (sp>Math.floor(max*0.5)? cut.slice(0,sp): cut).trim(); }
  function negado(t, idx){ const pre=t.slice(Math.max(0,idx-20),idx); if(/\b(no|sin|ni|nunca|jamas|tampoco)\s+(\w+\s+){0,2}$/.test(pre)) return true; if(/des\W{0,2}$/.test(t.slice(Math.max(0,idx-4),idx))) return true; return false; }
  function buscar(texto, listas){ const t=norm(texto), h={}; for(const c in listas){ const matched=[]; listas[c].forEach(k=>{ let idx=t.indexOf(k); while(idx!==-1){ if(!negado(t,idx)){ matched.push(k); break; } idx=t.indexOf(k, idx+1); } }); if(matched.length) h[c]=matched; } return h; }
  function condicion(texto, riesgos){ const t=norm(texto); if(riesgos.piezas) return "Por piezas"; if(/\bnuevo\b|sellad|en caja|\bnueva\b/.test(t) && !/seminuevo|semi nuevo/.test(t)) return "Nuevo"; if(/usado|seminuevo|semi nuevo|de uso|poco uso/.test(t)) return "Usado"; return ""; }
  function contexto(texto, kw){ const t=norm(texto); const i=t.indexOf(kw); if(i<0) return ""; let a=Math.max(0,i-38), b=Math.min(t.length,i+kw.length+38); let seg=t.slice(a,b); if(a>0){ const sp=seg.indexOf(" "); if(sp>0&&sp<16) seg=seg.slice(sp+1); } if(b<t.length){ const sp=seg.lastIndexOf(" "); if(sp>0&&sp>seg.length-16) seg=seg.slice(0,sp); } return seg.replace(/\s+/g," ").trim(); }
  function itemIdDe(url){ const m=(url||"").match(/\/item\/(\d+)/); return m?m[1]:""; }
  function limpiaCtx(s){ return recortePalabra((s||"").replace(/(^\.\.\.)|(\.\.\.$)/g,"").trim(), 90); }
  function clasifRiesgo(r){ const k=Object.keys(r); if(!k.length) return "Limpio"; if(r.daniado||r.piezas) return "Da\u00f1o confirmado"; return "Con riesgo"; }
  function senalPrecio(score){ if(score>=80) return "Ganga"; if(score>=64) return "Buen precio"; return "Normal"; }
  function veredicto(score, r, p){ if(EVITAR_CATS.some(c=>r[c])) return "Evitar"; if(r.cosmetico) return "Revisar"; const fu=["liberado","buen_estado","sellado","factura"]; const tf=Object.keys(p).some(x=>fu.indexOf(x)>=0); if(score>=V_ALTO && tf) return "Perseguir"; return "Revisar"; }
  function notaEvidencia(r,p,ctx,desc){ const rk=Object.keys(r); if(rk.length) return recortePalabra(rk.map(c=>c+": "+limpiaCtx(ctx[c]||"")).join(" | "),1900); const pk=Object.keys(p); if(pk.length) return "+: "+pk.join(", "); return recortePalabra(desc||"",180); }
  function freqDescAuto(arr){ const f={}; arr.forEach(c=>{ const d=(c.descAuto||"").trim(); if(d.length>=30){ const k=norm(d).slice(0,200); f[k]=(f[k]||0)+1; } }); return f; }
  function elegirDesc(c, freq){ const d=(c.descAuto||"").trim(); const k=norm(d).slice(0,200); const cont=d.length>=30 && freq[k]>=2; if(d.length>=30 && !cont){ const og=(c.og||"").length>=30?"  ||  "+c.og:""; return {desc:d+og, fuente:"desc", contaminado:false}; } if((c.og||"").length>=30) return {desc:c.og, fuente:"og", contaminado:false}; if(cont) return {desc:"", fuente:"contaminado", contaminado:true}; return {desc:"", fuente:"vacio", contaminado:false}; }

  function candidatosDom(){
    const out=[], seen=new Set();
    document.querySelectorAll('a[href*="/marketplace/item/"]').forEach(a=>{
      const url=(a.href||"").split("?")[0]; if(!url||seen.has(url)) return;
      let row=a; for(let up=0; up<5 && row && row.parentElement; up++){ row=row.parentElement; if(/\[\d+\]/.test(row.textContent)) break; }
      const txt=row?row.textContent:a.textContent; const m=txt.match(/\[(\d+)\]/); if(!m) return;
      if(/atipico|sin datos/i.test(txt)) return;
      seen.add(url); out.push({url, score:parseInt(m[1],10), titulo:(a.textContent||"").trim()});
    });
    out.sort((x,y)=>y.score-x.score); return out;
  }
  function candidatosCount(){ try{ return candidatosDom().length; }catch(e){ return 0; } }

  function abrir(url){ return new Promise(res=>chrome.tabs.create({url, active:false}, t=>res(t))); }
  function cerrar(id){ return new Promise(res=>{ try{ chrome.tabs.remove(id, ()=>res()); }catch(e){ res(); } }); }
  function esperarCarga(tabId, timeoutMs){ return new Promise(resolve=>{ let done=false; const fin=v=>{ if(done) return; done=true; clearTimeout(to); chrome.tabs.onUpdated.removeListener(l); resolve(v); }; const to=setTimeout(()=>fin(false),timeoutMs); function l(id,info){ if(id===tabId && info.status==="complete") fin(true); } chrome.tabs.onUpdated.addListener(l); chrome.tabs.get(tabId,t=>{ if(t && t.status==="complete") fin(true); }); }); }
  async function scrapeCrudo(tabId){
    try{
      const r=await chrome.scripting.executeScript({ target:{tabId}, func:()=>{
        const meta=document.querySelector('meta[property="og:description"]'); const og=meta?(meta.content||""):"";
        const main=document.querySelector('[role="main"]')||document.body;
        const mainText=(main&&main.innerText)?main.innerText.slice(0,12000):"";
        let descAuto="";
        try{ const els=Array.from(main.querySelectorAll('span[dir="auto"], div[dir="auto"]'));
          els.forEach(el=>{ const t=(el.innerText||"").trim(); if(t.length<=30||t.length>=3000) return; if(el.closest('a[href*="/marketplace/item/"]')) return; if(/productos similares|productos relacionados|quiz[aá] te interese|tambi[eé]n te puede/i.test(t)) return; if(t.length>descAuto.length) descAuto=t; });
        }catch(e){}
        return {og, mainText, descAuto, title:document.title};
      }});
      return (r&&r[0]&&r[0].result)?r[0].result:{og:"",mainText:"",descAuto:"",title:""};
    }catch(e){ return {og:"",mainText:"",descAuto:"",title:"",err:(e&&e.message)||String(e)}; }
  }

  function st(m){ const s=$("#czg-status"); if(s) s.textContent=m; console.log("[czg]",m); }

  async function _capturarLista(cands, fresh, onProg){
    if(!cands.length){ st("Nada para capturar."); return; }
    const corpus = fresh ? {} : ((await gLocal(COR))[COR]||{});
    let ok=0, err=0;
    for(let i=0;i<cands.length;i++){
      const h=cands[i];
      st("Capturando "+(i+1)+"/"+cands.length+" en Facebook (ok "+ok+" / err "+err+")...");
      const tab=await abrir(h.url);
      if(!tab||tab.id==null){ err++; if(onProg) onProg(i+1,cands.length); continue; }
      try{
        await esperarCarga(tab.id,20000); await sleep(rnd(2000,3500));
        const d=await scrapeCrudo(tab.id);
        if(/inicia sesi|log in to continue|\/checkpoint\//i.test((d.mainText||"").slice(0,1500))){ await cerrar(tab.id); await sLocal({[COR]:corpus}); throw new Error("checkpoint/login en Facebook - resuelvelo y reintenta"); }
        corpus[h.url]={url:h.url, titulo:h.titulo, score:h.score, og:d.og||"", descAuto:d.descAuto||"", mainText:d.mainText||"", title:d.title||"", capturedAt:Date.now()};
        ok++;
      }catch(e){ if(/checkpoint/.test((e&&e.message)||"")) throw e; err++; console.warn("[capturar]",h.url,e); }
      finally{ await cerrar(tab.id); }
      await sLocal({[COR]:corpus});
      if(onProg) onProg(i+1, cands.length);
      if(i<cands.length-1) await sleep(rnd(4000,8000));
    }
    descargar(corpus);
    st("Captura lista. Pool: "+Object.keys(corpus).length+" (ok "+ok+" / err "+err+").");
  }
  async function capturarTodo(onProg){ const c=candidatosDom().slice(0,TOP); if(!c.length) throw new Error("No hay anuncios puntuados. Da 'Cosechar ahora' y 'Puntuar hallazgos' arriba primero."); await _capturarLista(c, true, onProg); }
  async function reintentarAuto(onProg){ const corpus=(await gLocal(COR))[COR]||{}; const arr=Object.keys(corpus).map(k=>corpus[k]); if(!arr.length) throw new Error("Pool vacio: corre la caceria completa primero."); const f=freqDescAuto(arr); const malos=arr.filter(c=>{const e=elegirDesc(c,f); return e.contaminado||!e.desc;}).map(c=>({url:c.url,score:c.score,titulo:c.titulo})); if(!malos.length){ if(onProg) onProg(1,1); st("Nada que reintentar."); return; } await _capturarLista(malos, false, onProg); }

  async function analizar(){
    const corpus=(await gLocal(COR))[COR]||{};
    const arr=Object.keys(corpus).map(k=>corpus[k]).sort((a,b)=>b.score-a.score);
    if(!arr.length){ st("Pool vacio. Corre la caceria o importa un respaldo."); return {nPer:0,nRev:0,nEvi:0,nCont:0,total:0}; }
    const freq=freqDescAuto(arr); const enr={}; let nPer=0,nRev=0,nEvi=0; const fz={desc:0,og:0,contaminado:0,vacio:0};
    arr.forEach(c=>{
      const {desc,fuente,contaminado}=elegirDesc(c,freq); fz[fuente]=(fz[fuente]||0)+1;
      if(contaminado || !desc){ const nota=contaminado?"Sin descripcion confiable (la captura tomo otro anuncio) - reintentar":"Sin descripcion capturada - reintentar"; enr[c.url]={url:c.url, itemId:itemIdDe(c.url), titulo:c.titulo, score:c.score, estado:"", riesgo:"", banderasPos:[], banderasNeg:[], senal:senalPrecio(c.score), veredicto:"Revisar", notas:nota, fuente, fetchedAt:Date.now()}; nRev++; return; }
      const blob=desc+" "+(c.titulo||""); const r=buscar(blob,RIESGOS); const p=buscar(blob,POSITIVOS); const ctx={}; for(const cat in r){ ctx[cat]=contexto(blob,r[cat][0]); }
      const estado=condicion(blob,r); const riesgo=clasifRiesgo(r); const bP=Object.keys(p); const bN=Object.keys(r); const senal=senalPrecio(c.score); const ver=veredicto(c.score,r,p); const notas=notaEvidencia(r,p,ctx,desc);
      if(ver==="Perseguir")nPer++; else if(ver==="Revisar")nRev++; else nEvi++;
      enr[c.url]={url:c.url, itemId:itemIdDe(c.url), titulo:c.titulo, score:c.score, estado, riesgo, banderasPos:bP, banderasNeg:bN, senal, veredicto:ver, notas, fuente, fetchedAt:Date.now()};
    });
    await sLocal({[ENR]:enr});
    const nCont=(fz.contaminado||0)+(fz.vacio||0);
    st("Analisis: "+arr.length+" -> Perseguir "+nPer+" / Revisar "+nRev+" / Evitar "+nEvi+" (contaminadas "+(fz.contaminado||0)+").");
    return {nPer,nRev,nEvi,nCont,total:arr.length};
  }

  function descargar(corpus){ try{ const blob=new Blob([JSON.stringify(corpus)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="cazagangas-pool.json"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1500); return true; }catch(e){ return false; } }
  async function exportar(){ const c=(await gLocal(COR))[COR]||{}; const n=Object.keys(c).length; if(!n){ st("Nada que exportar."); return; } descargar(c); st("Pool exportado ("+n+") a Descargas."); }
  function importar(file){ const fr=new FileReader(); fr.onload=async()=>{ try{ const o=JSON.parse(fr.result); if(!o||typeof o!=="object"||Array.isArray(o)) throw new Error("formato invalido"); await sLocal({[COR]:o}); st("Pool importado: "+Object.keys(o).length+". Ya puedes analizar."); }catch(e){ st("ERROR import: "+((e&&e.message)||e)); } }; fr.readAsText(file); }

  async function poolInfo(){ const c=(await gLocal(COR))[COR]||{}; const ks=Object.keys(c); let min=Infinity; ks.forEach(k=>{ const t=c[k].capturedAt; if(t&&t<min)min=t; }); return {n:ks.length, capturadoEn:isFinite(min)?min:null}; }
  async function fallidasCount(){ const c=(await gLocal(COR))[COR]||{}; const arr=Object.keys(c).map(k=>c[k]); const f=freqDescAuto(arr); return arr.filter(x=>{const e=elegirDesc(x,f); return e.contaminado||!e.desc;}).length; }

  window.CZG_enr = { VER, capturarTodo, reintentarAuto, analizarAhora: analizar, exportar, importar, poolInfo, fallidasCount, candidatosCount };
  console.log("[enriquecer] motor listo v"+VER);
})();