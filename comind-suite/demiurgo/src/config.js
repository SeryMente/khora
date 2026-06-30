// Constantes portadas de background.js v3.32. Lo que era hardcodeado pasa a env (Secrets).
const RATE_USD = 0.14;
const TC = Number(process.env.GLOBO_TC || 17.28); // v3.32 fijaba 17.28; en nube se parametriza.
module.exports = {
  NOTION: "https://api.notion.com/v1",
  NV: "2022-06-28",
  TOKEN: process.env.NOTION_TOKEN || "",            // v3.32: HARDCODEADO -> ahora Secret.
  DB_ID: process.env.GLOBO_CALLS_DB_ID || "69b2a69b-e923-4c0f-b438-f38b0cd35b95",
  POLL_MIN: Number(process.env.GLOBO_POLL_MIN || 2),
  LOG_CAP: 300,
  RATE_USD,
  TC,
  MXN_MIN: RATE_USD * TC,
  STALE_MS: 7 * 60 * 1000,
  GOAL_DEFAULT: 200,
  GOAL_PROP: "Objetivo diario (min)",
  ACTIVITY_DB_TITLE: "Registro de actividad",
  EXT_LABEL: "Globo Scraper",
  VERSION: "demiurgo-globo/0.1.0 (port fiel de Globo Scraper v3.32)",
  // Fuente de datos GLOBO (confirmada 20-jun-2026).
  GLOBO_BASE: "https://globohq.com",
  DASHBOARD_URL: "https://globohq.com/linguist_dashboard/index",
  CALLS_ENDPOINT: "https://globohq.com/interpreter/calls_index_data",
  MONTHLY_URL: "https://globohq.com/interpreter/monthly_minutes",
  COOKIE: process.env.GLOBO_COOKIE || "",
  LOCAL_EXECUTOR_URL: process.env.GLOBO_LOCAL_EXECUTOR_URL || "",
};
