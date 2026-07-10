// Registro de modulos de la sombrilla Aisthesis (fuente para el service worker).
// Espejo de cada modules/<id>/module.json. El shell carga los "enabled".
self.AISTHESIS_REGISTRY = [
  {
    id: "globo",
    name: "Globo (Llamadas -> Notion)",
    version: "3.34",
    enabled: true,
    background: "modules/globo/background.js",
    settings: ["GLOBO_CALLS_DB_ID"],
    panel: "modules/globo/options.html"
  },
  {
    id: "caza",
    name: "Cazagangas",
    version: "0.9.41",
    enabled: true,
    background: "modules/caza/background.js",
    settings: [],
    cerebro: "modules/caza/runtime.html"
  },
  {
    id: "todoist",
    name: "Todoist Sincronizador",
    version: "1.0.0",
    enabled: true,
    background: "modules/todoist/background.js",
    settings: ["TODOIST_NOTION_DB_ID"]
  }
];
