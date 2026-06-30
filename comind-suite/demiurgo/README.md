# Capa de Integración de CoMind

> Módulo `globo` de **Demiurgo** (captura de la agencia). Nombre del paquete: **Capa de Integración de CoMind**.

Port en **nube always-on** del **Globo Scraper v3.32** (extension Chrome MV3). Captura el Call Log
de GLOBO y lo escribe en Notion sin depender de que el navegador del interprete tenga pestanas
abiertas. Parte de la **Capa de Integracion CoMind** (Demiurgo).

## Que hace cada ronda (sustituye al service worker + chrome.alarms)
1. Verifica la sesion de GLOBO.
2. Lee el **Call Log completo** via `GET /interpreter/calls_index_data` (DataTables server-side, paginado).
3. Lee el **mensual** via `/interpreter/monthly_minutes` (HTML + regex).
4. Inserta en Notion solo lo nuevo (dedup por `call_unique_identifier`; **aborta** si el indice esta incompleto, para no duplicar).
5. Lee el **objetivo diario** desde Notion.
6. Vuelca **telemetria** (Logos) a la base «Registro de actividad».

## Por que la migracion es viable
La captura real **no es raspado de DOM**: son `fetch` autenticados a endpoints JSON/HTML. Eso se
porta limpio a Node. ~80% del codigo (captura, dedup, insercion, sesion, mensual, objetivo,
telemetria, orquestacion) esta **PORTADO 1:1**. Ver `MIGRATION-MAP.md` para el destino de **cada**
funcion de v3.32.

## Las dos dependencias duras (NO simuladas)
1. **Sesion autenticada.** El portal exige login. Opciones:
   - `GLOBO_COOKIE`: cookie de una sesion valida (rapido, pero expira).
   - `GLOBO_USER`/`GLOBO_PASS` + login **headless** (Playwright) que renueva la cookie sola (robusto).
2. **Acciones de llamada** (contestar/rechazar). No existe en nube pura: actua sobre el telefono
   del interprete. `localExecutor.js` es un **puente** a un agente local minimo; si no se configura
   (`GLOBO_LOCAL_EXECUTOR_URL` vacio) las acciones quedan **deshabilitadas, no simuladas**. Si GLOBO
   HQ expone una API de acciones del lado interprete, este residuo desaparece (a verificar).

## Uso
```bash
cp .env.example .env   # rellena NOTION_TOKEN y la sesion (COOKIE o USER/PASS)
npm run check          # node --check de todos los modulos
npm run session        # verifica solo la sesion de GLOBO
npm start              # always-on (sondeo cada GLOBO_POLL_MIN)
GLOBO_RUN_ONCE=1 npm start   # una ronda y salir (para cron de GitHub Actions)
```

## Despliegue (categoria Chrome Dev: API-primero, secretos por GitHub Secrets)
- **GitHub Actions** (cron): workflow que corre `GLOBO_RUN_ONCE=1` cada N minutos; `NOTION_TOKEN`,
  `GLOBO_COOKIE`/credenciales y `GLOBO_CALLS_DB_ID` como **Secrets** (nunca en el repo).
- **Proceso long-running** (PM2 / contenedor) para sondeo continuo y latido de telemetria.
- El token de Notion que v3.32 tenia **hardcodeado** se externaliza aqui a `process.env`.

## Estructura
```
src/config.js        constantes (env) portadas de v3.32
src/logos.js         telemetria (logEvent + cola TX + backoff + dead-letter)
src/parsers.js       bgStrip/bgNum/bgISO/bgParseRow/selName (verbatim)
src/notion.js        notionFetch/getSeenIds/insertCalls/fetchGoal + sink de telemetria
src/globo.js         sesion + fetchCallLog + fetchMonthly
src/localExecutor.js puente de acciones de llamada (dep dura #2, no simulado)
src/worker.js        orquestador/cron (runRound) + idempotencia
```
