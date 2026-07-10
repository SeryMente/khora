// Módulo Compartido: Adaptador Notion (v1.0)
// Encapsula la lectura de NOTION_TOKEN de chrome.storage.local y provee un fetch unificado con backoff.
// Esto elimina la duplicidad de lógica entre los módulos (Caza, Globo, etc).

(function (root) {
  let TOKEN = ""; // NUNCA hardcodeado

  // Inicialización sincrona de la variable (si está disponible) y listener
  try {
    chrome.storage.local.get(["NOTION_TOKEN", "cazagangas.token"], function(v) {
      TOKEN = (v && (v.NOTION_TOKEN || v["cazagangas.token"])) || "";
    });

    chrome.storage.onChanged.addListener(function(ch, area) {
      if (area !== "local") return;
      if (ch.NOTION_TOKEN) TOKEN = ch.NOTION_TOKEN.newValue || "";
      if (ch["cazagangas.token"] && !ch.NOTION_TOKEN) TOKEN = ch["cazagangas.token"].newValue || TOKEN;
    });
  } catch (e) {
    // Entornos sin chrome.storage (pruebas, etc.)
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /**
   * Ejecuta un fetch a Notion añadiendo los headers de auth y manejando reintentos (429, 5xx)
   * @param {string} url - URL de la API de Notion
   * @param {object} opts - Opciones de fetch (method, body, headers...)
   * @param {number} tries - Número máximo de intentos (por defecto 4)
   * @returns {Promise<Response|null>} Response si es exitoso o null si agota reintentos
   */
  async function notionFetch(url, opts = {}, tries = 4) {
    if (!TOKEN) throw new Error("Falta NOTION_TOKEN. Ponlo en Ajustes de la sombrilla y reintenta.");

    const headers = Object.assign({
      "Authorization": "Bearer " + TOKEN,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    }, opts.headers || {});

    const fetchOpts = Object.assign({}, opts, { headers });

    for (let i = 0; i < tries; i++) {
      let res;
      try {
        res = await fetch(url, fetchOpts);
      } catch(e) {
        if (i === tries - 1) throw e;
        await sleep(500 * (i + 1));
        continue;
      }

      if (res.status === 429 || res.status >= 500) {
        const ra = parseFloat(res.headers.get("Retry-After") || "0");
        await sleep(ra > 0 ? ra * 1000 : 600 * (i + 1));
        continue;
      }
      return res;
    }
    return null;
  }

  const NotionAdapter = {
    fetch: notionFetch,
    getToken: () => TOKEN
  };

  // Exportar dependiendo del entorno
  if (typeof module !== "undefined" && module.exports) {
    module.exports = NotionAdapter;
  } else {
    root.NotionAdapter = NotionAdapter;
  }

})(typeof self !== "undefined" ? self : this);
