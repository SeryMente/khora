// Cazagangas · integridad — verificacion de checksums SHA-256 v1.0.0
// Recalcula el hash de cada archivo del paquete y lo compara contra integrity.json.
(function(){
  "use strict";
  if (window.__CZ_INTEGRITY_RAN__) return;
  window.__CZ_INTEGRITY_RAN__ = true;
  var MAN = "integrity.json";

  function log(){ try{ if (window.CZ_TEL && CZ_TEL.log) CZ_TEL.log.apply(null, arguments); }catch(e){} }

  function hex(buf){
    var b = new Uint8Array(buf), s = "";
    for (var i=0;i<b.length;i++){ s += b[i].toString(16).padStart(2,"0"); }
    return s;
  }

  function chip(state, text, detail){
    try{
      if (!document.body){ return setTimeout(function(){ chip(state,text,detail); }, 30); }
      var c = document.getElementById("cz-integ");
      if (!c){
        c = document.createElement("div");
        c.id = "cz-integ";
        c.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:2147483647;font:11px/1.4 ui-monospace,Menlo,Consolas,monospace;padding:4px 9px;border-radius:7px;cursor:pointer;opacity:.92;border:1px solid #26395f;background:#0b1220;color:#9fb4d8;max-width:62vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        c.title = "Integridad de archivos · click para detalle";
        c.addEventListener("click", function(){ try{ alert(c.getAttribute("data-detail") || "Integridad: sin detalle"); }catch(e){} });
        document.body.appendChild(c);
      }
      var col = state==="ok" ? ["#0c1f17","#43c595","#1f5e46"]
              : state==="bad" ? ["#2a0e10","#e0726a","#7a2a28"]
              : ["#0b1220","#9fb4d8","#26395f"];
      c.style.background = col[0]; c.style.color = col[1]; c.style.borderColor = col[2];
      c.textContent = text;
      if (detail != null) c.setAttribute("data-detail", detail);
    }catch(e){}
  }

  function url(f){
    try{ if (window.chrome && chrome.runtime && chrome.runtime.getURL) return chrome.runtime.getURL(f); }catch(e){}
    return f;
  }

  function sha256(u){
    return fetch(u, { cache:"no-store" }).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    }).then(function(buf){
      return crypto.subtle.digest("SHA-256", buf);
    }).then(hex);
  }

  function finish(man, okc, bad, missing, total){
    var problems = bad.length + missing.length;
    var res = {
      status: problems ? "fail" : "ok",
      ok: !problems, total: total, verified: okc,
      mismatched: bad, missing: missing,
      algo: man.algo || "SHA-256", version: man.version || null, generated: man.generated || null
    };
    window.__CZ_INTEGRITY__ = res;
    try{ window.dispatchEvent(new CustomEvent("cz-integridad",{ detail: res })); }catch(e){}
    if (!problems){
      chip("ok", "\u2713 integridad " + okc + "/" + total,
        "Todos los archivos verificados (SHA-256).\nVersion: " + (man.version||"?") + "\nGenerado: " + (man.generated||"?"));
      log("integridad","ok","verificada",{ total: total, version: man.version });
    } else {
      var det = "INTEGRIDAD COMPROMETIDA (SHA-256)\nVersion manifiesto: " + (man.version||"?") + "\n";
      if (bad.length)     det += "\nAlterados:\n - " + bad.join("\n - ");
      if (missing.length) det += "\nNo accesibles:\n - " + missing.join("\n - ");
      chip("bad", "\u26a0 integridad " + okc + "/" + total, det);
      log("integridad","error","comprometida",{ alterados: bad, faltantes: missing, total: total });
    }
  }

  function run(){
    chip("chk", "integridad: verificando\u2026", null);
    fetch(url(MAN), { cache:"no-store" }).then(function(r){
      if (!r.ok) throw new Error("no se pudo leer " + MAN + " (HTTP " + r.status + ")");
      return r.json();
    }).then(function(man){
      var files = (man && man.files) ? Object.keys(man.files) : [];
      var bad = [], missing = [], okc = 0, total = files.length, i = 0;
      function next(){
        if (i >= files.length){ return finish(man, okc, bad, missing, total); }
        var f = files[i++];
        sha256(url(f)).then(function(got){
          if (String(got).toLowerCase() === String(man.files[f]).toLowerCase()) okc++; else bad.push(f);
        }).catch(function(){ missing.push(f); }).then(next);
      }
      next();
    }).catch(function(e){
      var msg = String(e && e.message || e);
      chip("bad", "integridad: sin manifiesto", msg);
      log("integridad","error","sin-manifiesto",{ msg: msg });
      window.__CZ_INTEGRITY__ = { status:"error", ok:false, reason:"no-manifest", error: msg };
      try{ window.dispatchEvent(new CustomEvent("cz-integridad",{ detail: window.__CZ_INTEGRITY__ })); }catch(_){}
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
