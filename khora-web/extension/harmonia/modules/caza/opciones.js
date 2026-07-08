// Cazagangas - opciones.js (v0.4.3): configuracion fusionada dentro del cerebro
(() => {
  const CFG = "cazagangas.config";
  const $ = s => document.querySelector(s);
  const gLocal = k => new Promise(r => chrome.storage.local.get(k, r));
  const sLocal = o => new Promise(r => chrome.storage.local.set(o, r));

  async function getCfg(){
    const l = await gLocal(CFG);
    return Object.assign({ zona:"queretaro", busquedas:['webcam logitech c920','webcam logitech c270','camara web','microfono usb','headset usb','audifonos con microfono','monitor 22','monitor 24','teclado mecanico','mouse logitech','router wifi','repetidor wifi','ssd 240gb','ssd 480gb','memoria ram ddr4','taladro','rotomartillo','herramienta','multimetro','mochila','maleta','botas impermeables','tenis nike','bicicleta','lote ropa','remate','urge vender','mudanza'], categoriasActivas:['trabajo','perifericos','redes','componentes','herramienta','uso_personal','reventa_baja'], umbral:20, pararFueraZona:true, modoComida:true, maxBusquedas:28, dbId:"f038f642-18e5-4eb0-ac6f-b4118ea4f0b0" }, l[CFG]||{});
  }
  async function setCfg(patch){
    const l = await gLocal(CFG);
    await sLocal({ [CFG]: Object.assign({}, l[CFG]||{}, patch) });
  }
  function st(m){ const s=$("#cg-o-status"); if(s) s.textContent=m; }

  function montar(){
    if ($("#cg-o-panel")) return;
    const w = document.createElement("div");
    w.id = "cg-o-panel";
    w.style.cssText = "margin:12px 0;padding:12px;border:1px solid #ccc;border-radius:8px;font-family:system-ui,sans-serif;max-width:680px";
    w.innerHTML =
      '<div style="font-weight:600;margin-bottom:8px">Configuracion (zona, busquedas, umbral)</div>'+
      '<label style="display:block;font-size:13px;margin:4px 0 2px">Zona</label>'+
      '<input id="cg-o-zona" type="text" style="width:100%;padding:6px;box-sizing:border-box">'+
      '<label style="display:block;font-size:13px;margin:8px 0 2px">Busquedas (una por linea)</label>'+
      '<textarea id="cg-o-busq" rows="4" style="width:100%;padding:6px;box-sizing:border-box"></textarea>'+
      '<label style="display:block;font-size:13px;margin:8px 0 2px">Umbral de ganga (percentil, ej. 20)</label>'+
      '<input id="cg-o-umbral" type="number" min="1" max="50" style="width:120px;padding:6px">'+
      '<div style="margin-top:8px"><button id="cg-o-save" style="padding:6px 14px;font-weight:600">Guardar configuracion</button></div>'+
      '<div id="cg-o-status" style="margin-top:8px;color:#444;font-size:13px">-</div>';
    document.body.appendChild(w);
    getCfg().then(c => {
      $("#cg-o-zona").value = c.zona || "";
      $("#cg-o-busq").value = (Array.isArray(c.busquedas)?c.busquedas:[]).join("\n");
      $("#cg-o-umbral").value = c.umbral != null ? c.umbral : 20;
    });
    $("#cg-o-save").addEventListener("click", async () => {
      const zona = $("#cg-o-zona").value.trim();
      const busquedas = $("#cg-o-busq").value.split("\n").map(s=>s.trim()).filter(Boolean);
      const umbral = parseInt($("#cg-o-umbral").value, 10) || 20;
      await setCfg({ zona, busquedas, umbral });
      st("Guardado: zona="+zona+" | busquedas="+busquedas.length+" | umbral=p"+umbral);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();