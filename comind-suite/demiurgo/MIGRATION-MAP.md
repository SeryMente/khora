# Mapa de migracion Globo Scraper v3.32 -> Demiurgo `globo`

Contabiliza **todas** las funciones de la extension real v3.32 (background.js 1081, content.js 418,
mainworld.js 351, options.js 625) para que ninguna quede sin destino (mandato: "sin que falte ninguna").

Estados:
- **PORTADA** = reescrita 1:1 en este paquete.
- **NUBE-DIRECTA** = su proposito se cumple mejor en nube por fetch directo; la version DOM/pestana se vuelve innecesaria.
- **N/A-NUBE** = atada a una pestana/navegador vivo del interprete; no existe en nube pura. Su PROPOSITO (saber minutos) ya lo da la captura directa del Call Log, que es la fuente de verdad.
- **DEP-DURA** = punto de integracion real, NO simulado (sesion autenticada / acciones de llamada).
- **PENDIENTE** = portable, aun no incluida en este scaffold inicial.

## Captura y escritura (el corazon) — PORTADA
| v3.32 | Demiurgo | Estado |
|---|---|---|
| `notionFetch` (retry 429/5xx + Retry-After) | `notion.js notionFetch` | PORTADA |
| `getSeenIds` (indice de duplicados) | `notion.js getSeenIds` | PORTADA |
| `insertCalls` (delta + ABORTO si indice incompleto) | `notion.js insertCalls` | PORTADA |
| `fetchGoal` / `getGoal` | `notion.js fetchGoal` | PORTADA |
| `selName`, `bgStrip`, `bgNum`, `bgISO`, `bgParseRow` | `parsers.js` | PORTADA (verbatim) |
| `bgFetchCallLog` (DataTables server-side) | `globo.js fetchCallLog` | PORTADA |
| `bgFetchMonthly` (HTML + regex) | `globo.js fetchMonthly` | PORTADA |
| `checkGloboSession` | `globo.js checkGloboSession` | PORTADA (nota: undici no da opaqueredirect; detecta 3xx/401/403/login) |
| `syncAllTabs` (orquestacion) | `worker.js runRound` | PORTADA (sin tocar pestanas) |
| `_syncBusy` / `_insertBusy` (idempotencia) | candados en `worker.js` / `notion.js` | PORTADA |
| alarmas `poll`/`tx` (chrome.alarms) | `worker.js` setInterval / GitHub Actions cron | PORTADA |

## Telemetria (Logos) — PORTADA
| v3.32 | Demiurgo | Estado |
|---|---|---|
| `logEvent`, `getLog`, `nextLogSeq` | `logos.js log` | PORTADA |
| `enqueueTx`, `flushTelemetry`, `maybeFlushTx` (cola + backoff + dead-letter) | `logos.js enqueueTx/flush` | PORTADA |
| `resolveActivityDb`, `txProps`, `txSev` | `notion.js` (sink) | PORTADA |
| `maybeHeartbeat` (latido si hay cambio) | `worker.js` flush 60s | PARCIAL (latido por evento) |
| `bumpStat`, `pushHistory` | contadores en memoria | PENDIENTE (no crítico) |

## Dependencias duras — DEP-DURA (no simuladas)
| v3.32 | Demiurgo | Estado |
|---|---|---|
| sesion del navegador (`credentials:'include'`) + `tryAutoLogin` | `globo.js sessionHeaders` (COOKIE) / login headless | DEP-DURA #1 |
| hotkeys `doCallAction` + `hkSelectors` + puente AHK (`sendNativeAhk`, `checkAhkDependency`, `requireAhkReady`) | `localExecutor.js callAction` (puente a agente local; o API de la agencia) | DEP-DURA #2 |

## Features de pestana viva — N/A-NUBE (proposito cubierto por la captura directa)
| v3.32 | Por que N/A en nube |
|---|---|
| detector en vivo (`detectLiveState`, `indicatorState`, `domInCall`, `apiInCall`, `detectStartedAt`) | observa DOM/Twilio de una pestana viva; en nube no hay pestana. Los minutos finales llegan por el Call Log. |
| cronometro en vivo + `pendingSecs` + `reconcileOrphanCall` (watchdog) | idem: era para mostrar minutos "casi en vivo" antes de que GLOBO publique la fila; la fila finalizada es la verdad. |
| medidor de audio forense (`wrapRTC`, `sampleStats`, `flushAudioWindow`, longtasks/jank) | mide WebRTC/hilo de la pestana de la llamada; en nube no hay tal pestana (y el problema de audio desaparece al no haber extension en la llamada). |
| overlay/HUD flotante (`ensureHost`, `vizHtml`, `applyOverlay`, vistas 1-4, dinero) | UI in-page; en nube el panel vive en Notion/Khora. |
| modo seguro / kill-switches (`getSafe`, `safeCfg`, `overlayCmd`) | conmutaban features in-page; sin features in-page no aplican. |
| disponibilidad por switch (`avSettle`, `avReport`, `dashOpen`, `chrome.idle`) | lee toggles del DOM del Dashboard; sin pestana no hay toggles. Integrable solo via sesion headless que abra el Dashboard. |
| `injectIntoOpenTabs`, `openMissing`, `ephemeralScrape`, keep-alive port, `openUiTab`, `updateBadge`, `notify` | especificos de pestanas/UI de Chrome; sustituidos por fetch directo + notificaciones de Notion. |
| `readDashboardToday`, `readRecentJobs`, `readMonthly`, `fetchCallsViaPage`, `findDT`, `fetchAll`, `parseRowArray` | NUBE-DIRECTA: el endpoint JSON/HTML reemplaza el raspado DOM/DataTables. |

## Mantenimiento Notion — PENDIENTE (portable)
| v3.32 | Demiurgo | Estado |
|---|---|---|
| `runDupCleanupIfPending` (archiva duplicados en Notion) | `notion.js` (futuro `dupCleanup`) | PENDIENTE (logica 100% portable; se anade en 0.2.0) |

## Novedades v3.34 / v3.35 (bitacora RAP) a reconciliar
- v3.34: telemetria a Notion + diagnostico + optimizacion -> ya cubierto por Logos.
- v3.35: audio-first + boton manual Notion + volcado al colgar -> el "volcado al colgar" en nube equivale a la ronda periodica; el boton manual = endpoint `runRound("manual")`.
