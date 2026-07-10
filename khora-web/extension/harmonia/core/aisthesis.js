/* Aísthesis · carcasa anfitriona unica (Hierofante)
 * Una sola UI para toda la sombrilla. Cada extension-origen es una LENTE
 * (modo conmutable), no una ventana rival. Embebe las UIs existentes intactas
 * via iframes del mismo origen chrome-extension:// -> no se pierde ninguna funcion.
 *   - Chronos (Χρόνος)  = Globo  -> modules/globo/options.html
 *   - Agora   (Ἀγορά)  = Cazagangas -> modules/caza/runtime.html
 */
(function(){
  "use strict";
  var cella   = document.getElementById("cella");
  var velo    = document.getElementById("velo");
  var lentes  = Array.prototype.slice.call(document.querySelectorAll(".lente"));
  var marcos  = {};   // lente -> iframe
  var cargada = {};   // lente -> bool (lazy)

  function veloFuera(){ if(velo){ velo.classList.add("ido"); } }
  function veloDentro(){ if(velo){ velo.classList.remove("ido"); } }

  function marco(lente, src){
    if(marcos[lente]) return marcos[lente];
    var f = document.createElement("iframe");
    f.className = "marco";
    f.setAttribute("title", lente);
    f.dataset.lente = lente;
    f.dataset.src = src;
    cella.appendChild(f);
    marcos[lente] = f;
    return f;
  }

  function activar(lente){
    var def = lentes.filter(function(b){ return b.dataset.lente === lente; })[0];
    if(!def) return;
    var src = def.dataset.src;
    var f = marco(lente, src);
    // Lazy load: solo monta la UI la primera vez que se abre la lente.
    if(!cargada[lente]){
      cargada[lente] = true;
      veloDentro();
      f.addEventListener("load", function once(){ f.removeEventListener("load", once); setTimeout(veloFuera, 120); });
      f.src = src;
    } else {
      veloFuera();
    }
    // Conmuta visibilidad sin destruir las otras (preserva su estado vivo).
    Object.keys(marcos).forEach(function(k){ marcos[k].classList.toggle("viva", k === lente); });
    lentes.forEach(function(b){ b.classList.toggle("activa", b.dataset.lente === lente); });
    try{ localStorage.setItem("aisthesis.lente", lente); }catch(e){}
  }

  lentes.forEach(function(b){ b.addEventListener("click", function(){ activar(b.dataset.lente); }); });

  // Permite que una UI interna pida cambiar de lente (p.ej. boton "Abrir Agora").
  window.addEventListener("message", function(ev){
    var d = ev && ev.data;
    if(d && d.aisthesis === "lente" && d.to){ activar(String(d.to)); }
  });

  // ===== Pulso AHK en la cabecera (dependencia ChromeDev compartida) =====
  function pintarAhk(st){
    var box = document.getElementById("ahk");
    var txt = document.getElementById("ahkTxt");
    if(!box || !txt) return;
    box.classList.remove("ok","bloq");
    if(st && st.ok){ box.classList.add("ok"); txt.textContent = "AHK · verificado"; }
    else if(st && st.checked){ box.classList.add("bloq"); txt.textContent = "AHK · no verificado"; }
    else { txt.textContent = "AHK · verificando"; }
  }
  function leerAhk(){
    try{
      chrome.storage && chrome.storage.local.get(["globo.ahk.status","ahk.status"], function(o){
        pintarAhk((o && (o["globo.ahk.status"] || o["ahk.status"])) || null);
      });
    }catch(e){}
  }
  try{ chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener(function(ch,area){
    if(area==="local" && (ch["globo.ahk.status"] || ch["ahk.status"])){ leerAhk(); }
  }); }catch(e){}
  leerAhk(); setInterval(leerAhk, 5000);

  // Lente inicial: la ultima usada, o Chronos por defecto.
  var inicial = "chronos";
  try{ var g = localStorage.getItem("aisthesis.lente"); if(g === "agora" || g === "chronos") inicial = g; }catch(e){}
  if((location.hash||"").indexOf("agora") >= 0) inicial = "agora";
  if((location.hash||"").indexOf("chronos") >= 0 || (location.hash||"").indexOf("ahk") >= 0) inicial = "chronos";
  activar(inicial);
})();
