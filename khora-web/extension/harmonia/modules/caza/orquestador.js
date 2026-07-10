(function(){
  var VER = "0.1.0";
  var SRC_KEYS = ["cazagangas.corpus","cazagangas.enriquecidos","cazagangas.hallazgos","cazagangas.descubrimiento"];
  var OUT_KEY = "cazagangas.sonda";
  var debTimer = null;
  var corriendo = false;
  var ultimo = null;
  var ultimoStatus = "";

  function log(){ try{ console.log.apply(console, ["[CZG orq]"].concat([].slice.call(arguments))); }catch(e){} }

  function esc(s){
    s = (s==null) ? "" : String(s);
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function money(n){
    if(n==null || n==="" || isNaN(n)) return "-";
    var r = Math.round(Number(n));
    try{ return r.toLocaleString("es-MX") + " MXN"; }catch(e){ return r + " MXN"; }
  }
  function pick(o){
    for(var i=1;i<arguments.length;i++){
      var k = arguments[i];
      if(o && o[k]!=null && o[k]!=="") return o[k];
    }
    return null;
  }
  function aLista(res){
    if(!res) return [];
    if(Array.isArray(res)) return res;
    if(Array.isArray(res.lista)) return res.lista;
    if(Array.isArray(res.comprables)) return res.comprables;
    if(Array.isArray(res.items)) return res.items;
    return [];
  }
  function root(){
    var d = document.getElementById("czg-dash");
    return d || document.body;
  }
  function panel(){
    var p = document.getElementById("czg-sonda-panel");
    if(p) return p;
    p = document.createElement("div");
    p.id = "czg-sonda-panel";
    p.style.cssText = "margin:12px 0;padding:12px;border:1px solid #2a2a2a;border-radius:10px;background:#111;color:#eee;font:13px system-ui,sans-serif";
    var head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px";
    var title = document.createElement("div");
    title.innerHTML = "<b>Comprables (Sonda)</b> <span id='czg-sonda-ver' style='opacity:.5'></span>";
    var btn = document.createElement("button");
    btn.id = "czg-sonda-refresh";
    btn.textContent = "Refrescar";
    btn.style.cssText = "cursor:pointer;border:1px solid #444;background:#1d1d1d;color:#eee;border-radius:8px;padding:6px 10px";
    btn.addEventListener("click", function(){ correr("manual"); });
    head.appendChild(title);
    head.appendChild(btn);
    var status = document.createElement("div");
    status.id = "czg-sonda-status";
    status.style.cssText = "opacity:.7;margin-bottom:8px";
    var body = document.createElement("div");
    body.id = "czg-sonda-body";
    p.appendChild(head);
    p.appendChild(status);
    p.appendChild(body);
    var r = root();
    if(r.firstChild) r.insertBefore(p, r.firstChild); else r.appendChild(p);
    return p;
  }
  function setStatus(t){
    panel();
    ultimoStatus = t;
    var s = document.getElementById("czg-sonda-status");
    if(s) s.textContent = t;
    var v = document.getElementById("czg-sonda-ver");
    if(v) v.textContent = "v"+VER;
  }
  function pintar(res){
    panel();
    var body = document.getElementById("czg-sonda-body");
    if(!body) return;
    var lista = aLista(res);
    if(!lista.length){
      body.innerHTML = "<div style='opacity:.6'>Sin comprables que valgan la pena en el pool actual.</div>";
      return;
    }
    var rows = "";
    for(var i=0;i<lista.length;i++){
      var it = lista[i] || {};
      var modelo = pick(it,"modelo","titulo","anuncio","nombre") || "-";
      var capac = pick(it,"capacidad","cap") || "-";
      var estado = pick(it,"estado") || "-";
      var precio = pick(it,"precio","precioNum","precioCompra");
      var ref = pick(it,"ref","precioRef","mediana","referencia");
      var margen = pick(it,"margenNeto","margen");
      var ver = pick(it,"veredicto") || (it.valeLaPena ? "vale" : "-");
      var u = pick(it,"url");
      var link = u ? ("<a href='"+esc(u)+"' target='_blank' style='color:#8ab4ff'>ver</a>") : "";
      rows += "<tr>"
        + "<td style='padding:4px 6px'>"+(i+1)+"</td>"
        + "<td style='padding:4px 6px'>"+esc(modelo)+"</td>"
        + "<td style='padding:4px 6px'>"+esc(capac)+"</td>"
        + "<td style='padding:4px 6px'>"+esc(estado)+"</td>"
        + "<td style='padding:4px 6px;text-align:right'>"+money(precio)+"</td>"
        + "<td style='padding:4px 6px;text-align:right'>"+money(ref)+"</td>"
        + "<td style='padding:4px 6px;text-align:right'><b>"+money(margen)+"</b></td>"
        + "<td style='padding:4px 6px'>"+esc(ver)+"</td>"
        + "<td style='padding:4px 6px'>"+link+"</td>"
        + "</tr>";
    }
    body.innerHTML = "<div style='overflow:auto'><table style='border-collapse:collapse;width:100%'>"
      + "<thead><tr style='text-align:left;opacity:.6'>"
      + "<th style='padding:4px 6px'>#</th><th style='padding:4px 6px'>Modelo</th><th style='padding:4px 6px'>Cap</th><th style='padding:4px 6px'>Estado</th>"
      + "<th style='padding:4px 6px;text-align:right'>Compra</th><th style='padding:4px 6px;text-align:right'>Ref</th><th style='padding:4px 6px;text-align:right'>Margen</th>"
      + "<th style='padding:4px 6px'>Veredicto</th><th style='padding:4px 6px'></th>"
      + "</tr></thead><tbody>"+rows+"</tbody></table></div>";
  }
  function espejoNotion(res){
    try{
      if(window.CZG_notion && typeof window.CZG_notion.sincronizarComprables === "function"){
        window.CZG_notion.sincronizarComprables(res);
        log("espejo notion: enviado");
      }
    }catch(e){ log("espejo notion no disponible", e); }
  }
  function correr(motivo){
    if(corriendo) return;
    if(!window.CZG_sonda || typeof window.CZG_sonda.comprables !== "function"){
      setStatus("Esperando motor Sonda...");
      return;
    }
    corriendo = true;
    setStatus("Analizando pool ("+(motivo||"auto")+")...");
    var p;
    try{ p = window.CZG_sonda.comprables(); }
    catch(e){ corriendo=false; setStatus("Error al invocar Sonda: "+((e&&e.message)||e)); return; }
    Promise.resolve(p).then(function(res){
      ultimo = res;
      pintar(res);
      var n = aLista(res).length;
      var stamp = new Date().toLocaleTimeString("es-MX");
      setStatus(n+" comprables - actualizado "+stamp+" ("+(motivo||"auto")+")");
      corriendo=false;
      espejoNotion(res);
    }).catch(function(e){
      corriendo=false;
      setStatus("Error en Sonda: "+((e&&e.message)||e));
    });
  }
  function deb(motivo){
    if(debTimer) clearTimeout(debTimer);
    debTimer = setTimeout(function(){ correr(motivo); }, 1200);
  }
  function vigilarDom(){
    try{
      var obs = new MutationObserver(function(){
        if(!document.getElementById("czg-sonda-panel")){
          panel();
          if(ultimo) pintar(ultimo);
          if(ultimoStatus){
            var s = document.getElementById("czg-sonda-status");
            if(s) s.textContent = ultimoStatus;
          }
        }
      });
      obs.observe(root(), { childList:true });
    }catch(e){ log("observer no disponible", e); }
  }
  function arranque(){
    panel();
    setStatus("Listo. Esperando datos...");
    vigilarDom();
    correr("arranque");
    var intentos = 0;
    var iv = setInterval(function(){
      intentos++;
      if(window.CZG_sonda && typeof window.CZG_sonda.comprables === "function"){
        clearInterval(iv);
        correr("motor-listo");
      } else if(intentos > 40){
        clearInterval(iv);
        setStatus("Motor Sonda no detectado. Revisa que sonda.js este cargado.");
      }
    }, 500);
    try{
      chrome.storage.onChanged.addListener(function(changes, area){
        var tocar = false;
        for(var k in changes){
          if(k === OUT_KEY) continue;
          for(var i=0;i<SRC_KEYS.length;i++){
            if(k === SRC_KEYS[i]){ tocar = true; break; }
          }
        }
        if(tocar) deb("datos-nuevos");
      });
    }catch(e){ log("storage.onChanged no disponible", e); }
  }

  window.CZG_orq = { VER: VER, correr: correr, pintar: pintar };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", arranque);
  } else {
    arranque();
  }
})();