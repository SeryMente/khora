// Cazagangas - descubrir.js (v0.1.0) Barrido de mercado: volumen + precio + dispersion (NO valua)
(() => {
  const VER = "0.1.0";
  const CFG = "cazagangas.config";
  const DESC = "cazagangas.descubrimiento";
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a,b) => a + Math.random()*(b-a);
  const gLocal = k => new Promise(r => chrome.storage.local.get(k, r));
  const sLocal = o => new Promise(r => chrome.storage.local.set(o, r));

  const SEEDS_DEFAULT = ["iphone","samsung galaxy","xiaomi","motorola","nintendo switch","playstation","xbox","airpods","audifonos","bocina jbl","apple watch","smartwatch","ipad","tablet","laptop","macbook","tarjeta de video","monitor","gopro","camara","dron","taladro","herramienta","tenis nike","perfume","lego","bicicleta"];
  const AREA = {"iphone":"Celulares","samsung galaxy":"Celulares","xiaomi":"Celulares","motorola":"Celulares","nintendo switch":"Gaming","playstation":"Gaming","xbox":"Gaming","airpods":"Audio","audifonos":"Audio","bocina jbl":"Audio","apple watch":"Wearables","smartwatch":"Wearables","ipad":"Tablets","tablet":"Tablets","laptop":"Computo","macbook":"Computo","tarjeta de video":"Computo","monitor":"Computo","gopro":"Foto/Drones","camara":"Foto/Drones","dron":"Foto/Drones","taladro":"Herramienta","herramienta":"Herramienta","tenis nike":"Moda","perfume":"Belleza","lego":"Juguetes","bicicleta":"Deporte"};
  const areaDe = t => AREA[t] || "Otro";
  const precioFmt = n => (n==null||isNaN(n))?"\u2014":("$"+Number(n).toLocaleString("es-MX"));

  function quantile(sorted, q){ if(!sorted.length) return null; const pos=(sorted.length-1)*q; const base=Math.floor(pos); const rest=pos-base; if(sorted[base+1]!==undefined) return sorted[base]+rest*(sorted[base+1]-sorted[base]); return sorted[base]; }

  function abrir(url){ return new Promise(res=>chrome.tabs.create({url, active:false}, t=>res(t))); }
  function cerrar(id){ return new Promise(res=>{ try{ chrome.tabs.remove(id, ()=>res()); }catch(e){ res(); } }); }
  function esperarCarga(tabId, timeoutMs){ return new Promise(resolve=>{ let done=false; const fin=v=>{ if(done) return; done=true; clearTimeout(to); chrome.tabs.onUpdated.removeListener(l); resolve(v); }; const to=setTimeout(()=>fin(false),timeoutMs); function l(id,info){ if(id===tabId && info.status==="complete") fin(true); } chrome.tabs.onUpdated.addListener(l); chrome.tabs.get(tabId,t=>{ if(t && t.status==="complete") fin(true); }); }); }

  async function scrapeBusqueda(zona, term){
    const url="https://www.facebook.com/marketplace/"+encodeURIComponent(zona)+"/search/?query="+encodeURIComponent(term);
    const tab=await abrir(url);
    if(!tab||tab.id==null) return [];
    try{
      await esperarCarga(tab.id, 22000); await sleep(rnd(1800,2800));
      await chrome.scripting.executeScript({target:{tabId:tab.id}, func: async ()=>{ for(let i=0;i<5;i++){ window.scrollTo(0,document.body.scrollHeight); await new Promise(r=>setTimeout(r,1200)); } return true; }});
      const chk=await chrome.scripting.executeScript({target:{tabId:tab.id}, func: ()=> (document.body.innerText||"").slice(0,1200) });
      const head=(chk&&chk[0]&&chk[0].result)||"";
      if(/inicia sesi|log in to continue|\/checkpoint\/|introduce tu contrase/i.test(head)) throw new Error("checkpoint/login");
      const r=await chrome.scripting.executeScript({target:{tabId:tab.id}, func: ()=>{
        const out=[], seen=new Set();
        Array.from(document.querySelectorAll('a[href*="/marketplace/item/"]')).forEach(a=>{
          const u=(a.href||"").split("?")[0]; if(!u||seen.has(u)) return; seen.add(u);
          const txt=(a.innerText||"").trim(); if(!txt) return;
          const lines=txt.split("\n").map(s=>s.trim()).filter(Boolean);
          let price=null;
          for(const ln of lines){ const m=ln.replace(/\s/g,"").match(/\$([\d,]{2,})/); if(m && price===null){ const num=parseInt(m[1].replace(/,/g,""),10); if(!isNaN(num)) price=num; } }
          const cand=lines.filter(ln=>!/^\s*(mx)?\$/i.test(ln)); cand.sort((x,y)=>y.length-x.length);
          out.push({url:u, price, title:(cand[0]||"").slice(0,120)});
        });
        return out;
      }});
      return (r&&r[0]&&r[0].result)||[];
    } finally { await cerrar(tab.id); }
  }

  function resumir(term, items){
    const precios=items.map(x=>x.price).filter(p=>typeof p==="number" && p>0 && p<2000000).sort((a,b)=>a-b);
    const n=items.length, conPrecio=precios.length;
    const med=quantile(precios,0.5), p25=quantile(precios,0.25), p75=quantile(precios,0.75);
    const min=precios[0]||null, max=precios[precios.length-1]||null;
    const disp=(med&&med>0&&p25!=null&&p75!=null)?((p75-p25)/med):0;
    const volScore=Math.min(1, Math.log10(n+1)/Math.log10(40));
    const dispScore=Math.min(1, disp/0.8);
    const score=Math.round(100*(0.55*volScore+0.45*dispScore));
    const muestras=items.filter(x=>typeof x.price==="number").sort((a,b)=>a.price-b.price).slice(0,3).map(x=>({url:x.url,price:x.price,title:x.title}));
    return {term, area:areaDe(term), n, conPrecio, med, p25, p75, min, max, disp:Math.round(disp*100)/100, score, muestras};
  }

  function senalDe(s){ if(s>=70) return ["Alta","#0a7d28","#e7f6ec"]; if(s>=45) return ["Media","#b4790a","#fdf4e3"]; return ["Baja","#c0271a","#fdecea"]; }
  function status(m){ const s=$("#czg-desc-status"); if(s) s.textContent=m; console.log("[descubrir]",m); }
  function prog(p,l){ const b=$("#czg-desc-bar"); const t=$("#czg-desc-bartxt"); if(b) b.style.width=Math.max(0,Math.min(100,p))+"%"; if(t&&l!=null) t.textContent=l; }

  function pintarBoard(res){
    const box=$("#czg-desc-board"); if(!box) return;
    const safe=s=>(s||"").replace(/</g,"&lt;").replace(/"/g,"&quot;");
    const ord=res.slice().sort((a,b)=>b.score-a.score);
    const filas=ord.map(r=>{ const [lab,c,bg]=senalDe(r.score);
      return '<tr style="border-top:1px solid #eef0f3">'+
        '<td style="padding:6px 8px;font-weight:600">'+safe(r.term)+'</td>'+
        '<td style="padding:6px 8px;font-size:11px;color:#555">'+safe(r.area)+'</td>'+
        '<td style="padding:6px 8px;text-align:right">'+r.n+'</td>'+
        '<td style="padding:6px 8px;text-align:right"><b>'+precioFmt(r.med)+'</b></td>'+
        '<td style="padding:6px 8px;text-align:right;font-size:11px;color:#777">'+precioFmt(r.min)+" - "+precioFmt(r.max)+'</td>'+
        '<td style="padding:6px 8px;text-align:right">'+(r.disp!=null?r.disp:"\u2014")+'</td>'+
        '<td style="padding:6px 8px;text-align:center;font-weight:700">'+r.score+'</td>'+
        '<td style="padding:6px 8px;text-align:center"><span style="font-size:11px;font-weight:700;color:'+c+';background:'+bg+';padding:2px 8px;border-radius:20px">'+lab+'</span></td>'+
        '</tr>';
    }).join("");
    // rollup por area
    const ag={}; res.forEach(r=>{ const a=r.area; if(!ag[a]) ag[a]={n:0,s:0,c:0}; ag[a].n+=r.n; ag[a].s+=r.score; ag[a].c++; });
    const areas=Object.keys(ag).map(a=>({a, n:ag[a].n, avg:Math.round(ag[a].s/ag[a].c)})).sort((x,y)=>y.avg-x.avg);
    const arows=areas.map(x=>'<span style="display:inline-block;margin:3px 6px 3px 0;font-size:12px;background:#eef2f8;border-radius:6px;padding:3px 9px">'+safe(x.a)+': <b>'+x.avg+'</b> ('+x.n+')</span>').join("");
    box.innerHTML='<div style="margin-bottom:8px">'+arows+'</div>'+
      '<table style="border-collapse:collapse;width:100%;font:13px system-ui"><thead><tr style="text-align:left;color:#888;font-size:11px;text-transform:uppercase"><th style="padding:6px 8px">Termino</th><th style="padding:6px 8px">Area</th><th style="padding:6px 8px;text-align:right">n</th><th style="padding:6px 8px;text-align:right">Mediana</th><th style="padding:6px 8px;text-align:right">Rango</th><th style="padding:6px 8px;text-align:right">Disp.</th><th style="padding:6px 8px;text-align:center">Score</th><th style="padding:6px 8px;text-align:center">Oport.</th></tr></thead><tbody>'+filas+'</tbody></table>';
  }

  function leerSeeds(){ const t=$("#czg-desc-seeds"); const raw=(t&&t.value||"").split("\n").map(s=>s.trim()).filter(Boolean); return raw.length?raw:SEEDS_DEFAULT.slice(); }
  function maxN(){ const e=$("#czg-desc-max"); const v=parseInt(e&&e.value,10); return (isNaN(v)||v<1)?18:Math.min(v,40); }
  function disable(b){ document.querySelectorAll("#czg-desc button, #czg-desc input, #czg-desc textarea").forEach(x=>x.disabled=b); }

  async function barrer(){
    const seeds=leerSeeds().slice(0, maxN());
    if(!seeds.length){ status("Agrega al menos un termino."); return; }
    if(!confirm("Barrido de descubrimiento: abrire "+seeds.length+" busquedas en Facebook (segundo plano) para medir el mercado. Continuar?")) return;
    const cfg=(await gLocal(CFG))[CFG]||{}; const zona=cfg.zona||"queretaro";
    disable(true);
    const res=[]; let ceros=0;
    try{
      for(let i=0;i<seeds.length;i++){
        const term=seeds[i];
        prog(2+(i/seeds.length)*96, "Barriendo \""+term+"\" ("+(i+1)+"/"+seeds.length+") en "+zona+"...");
        let items=[];
        try{ items=await scrapeBusqueda(zona, term); }
        catch(e){ if(/checkpoint/.test((e&&e.message)||"")){ status("DETENIDO: login/checkpoint en Facebook. Resuelvelo y reintenta."); break; } console.warn("[descubrir]",term,e); }
        if(!items.length){ ceros++; if(ceros>=3 && res.every(r=>r.n===0)){ status("Varias busquedas sin resultados: posible bloqueo o sesion cerrada. Detengo."); break; } }
        res.push(resumir(term, items));
        pintarBoard(res);
        if(i<seeds.length-1) await sleep(rnd(4000,7000));
      }
      await sLocal({[DESC]:{zona, fecha:Date.now(), seeds:res}});
      prog(100, "Barrido terminado: "+res.length+" terminos. Datos guardados.");
    }catch(e){ status("ERROR: "+((e&&e.message)||e)); }
    finally{ disable(false); }
  }

  async function exportar(){ const d=(await gLocal(DESC))[DESC]; if(!d){ status("Aun no hay barrido que exportar."); return; } try{ const blob=new Blob([JSON.stringify(d,null,1)],{type:"application/json"}); const u=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=u; a.download="cazagangas-descubrimiento.json"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },1500); status("Descubrimiento exportado a Descargas."); }catch(e){ status("ERROR export: "+((e&&e.message)||e)); } }

  function montar(){
    if($("#czg-desc")) return;
    const p=document.createElement("div");
    p.id="czg-desc";
    p.style.cssText="margin:14px 0;padding:0;border:1px solid #d9c79a;border-radius:14px;font-family:system-ui,sans-serif;max-width:1080px;background:#fff;box-shadow:0 2px 12px rgba(80,60,20,.07);overflow:hidden";
    p.innerHTML=
      '<div style="padding:14px 20px;background:linear-gradient(90deg,#8a6d1f,#b4900f);color:#fff">'+
        '<div style="font-size:16px;font-weight:800">Barrido de Descubrimiento <span style="font-weight:500;opacity:.85;font-size:12px">v'+VER+'</span></div>'+
        '<div style="font-size:12px;opacity:.92;margin-top:2px">Mide el mercado (volumen + precio + dispersion). NO valua: sirve para decidir QUE categorias cazar.</div>'+
      '</div>'+
      '<div style="padding:14px 20px">'+
        '<div style="font-size:12px;color:#777;margin-bottom:4px">Terminos a barrer (uno por linea):</div>'+
        '<textarea id="czg-desc-seeds" style="width:100%;height:90px;font:12px monospace;border:1px solid #ddd;border-radius:6px;padding:8px">'+SEEDS_DEFAULT.join("\n")+'</textarea>'+
        '<div style="margin:8px 0;font-size:12px">Maximo de terminos por barrido: <input id="czg-desc-max" type="number" value="18" min="1" max="40" style="width:60px;padding:3px 6px"> <span style="color:#999">(menos = mas seguro y rapido)</span></div>'+
        '<button id="czg-desc-go" style="background:#b4900f;color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:800;cursor:pointer">Iniciar barrido</button>'+
        '<button id="czg-desc-exp" style="margin-left:8px;padding:9px 14px;border:1px solid #b4900f;background:#fff;color:#8a6d1f;border-radius:8px;cursor:pointer">Exportar datos</button>'+
        '<div style="margin-top:12px;background:#f3eede;border-radius:8px;height:18px;overflow:hidden"><div id="czg-desc-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#b4900f,#d8b53a);transition:width .35s"></div></div>'+
        '<div id="czg-desc-bartxt" style="margin-top:6px;font-size:12px;color:#555">Listo para barrer.</div>'+
        '<div id="czg-desc-status" style="margin-top:2px;font-size:12px;color:#888"></div>'+
        '<div id="czg-desc-board" style="margin-top:12px;overflow:auto"></div>'+
      '</div>';
    const dash=document.querySelector("#czg-dash");
    if(dash && dash.parentNode) dash.parentNode.insertBefore(p, dash.nextSibling);
    else if(document.body.firstChild) document.body.insertBefore(p, document.body.firstChild);
    else document.body.appendChild(p);
    $("#czg-desc-go").addEventListener("click", barrer);
    $("#czg-desc-exp").addEventListener("click", exportar);
    console.log("[descubrir] panel montado v"+VER);
  }
  setTimeout(montar, 600);
})();