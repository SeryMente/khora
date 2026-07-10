// Cazagangas · runtime (cerebro) v0.3.0
const elLatido = document.getElementById("latido");
const elConfig = document.getElementById("config");
const elLista = document.getElementById("lista");
const elResumen = document.getElementById("resumen");
const btnCosechar = document.getElementById("btnCosechar");
const btnPuntuar = document.getElementById("btnPuntuar");
let latidos = 0;

function pintarLatido() {
  latidos++;
  elLatido.textContent = "latido #" + latidos + " - " + new Date().toLocaleTimeString("es-MX");
}
pintarLatido();
setInterval(pintarLatido, 30000);

function mostrarConfig() {
  chrome.storage.local.get("cazagangas.config", (r) => {
    const c = r["cazagangas.config"] || {};
    const busc = (c.busquedas && c.busquedas.length) ? c.busquedas.join(", ") : "-";
    elConfig.textContent = "zona=" + (c.zona || "-") + " - busquedas=" + busc + " - umbral=p" + (c.umbral != null ? c.umbral : "-");
  });
}
function fmtMXN(n) { return n == null ? "-" : "$" + Number(n).toLocaleString("es-MX"); }

function pintarHallazgos() {
  chrome.storage.local.get("cazagangas.hallazgos", (r) => {
    const items = Object.values(r["cazagangas.hallazgos"] || {});
    items.sort((a, b) => (b.score != null ? b.score : -1) - (a.score != null ? a.score : -1));
    elResumen.textContent = items.length + " hallazgos";
    elLista.innerHTML = "";
    for (const it of items.slice(0, 200)) {
      const li = document.createElement("li");
      const score = (it.score != null) ? it.score : "-";
      const ref = (it.precioRef != null) ? (" - ref " + fmtMXN(it.precioRef)) : "";
      const desc = (it.pctDescuento != null) ? (" - " + it.pctDescuento + "%") : "";
      const tag = it.etiqueta ? (" - " + it.etiqueta) : "";
      const a = document.createElement("a");
      a.href = it.url; a.target = "_blank"; a.textContent = it.titulo || "(sin titulo)";
      li.innerHTML = "<b>[" + score + "]</b> " + fmtMXN(it.precioNum != null ? it.precioNum : it.precio) + ref + desc + tag + " - ";
      li.appendChild(a);
      elLista.appendChild(li);
    }
  });
}

function puntuar() {
  chrome.storage.local.get("cazagangas.hallazgos", (r) => {
    const puntuados = CG_SCORING.puntuarTodos(r["cazagangas.hallazgos"] || {});
    chrome.storage.local.set({ "cazagangas.hallazgos": puntuados }, pintarHallazgos);
  });
}

btnCosechar.addEventListener("click", () => chrome.runtime.sendMessage({ tipo: "iniciar-cosecha" }));
btnPuntuar.addEventListener("click", puntuar);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes["cazagangas.hallazgos"]) pintarHallazgos();
  if (changes["cazagangas.config"]) mostrarConfig();
});
mostrarConfig();
pintarHallazgos();