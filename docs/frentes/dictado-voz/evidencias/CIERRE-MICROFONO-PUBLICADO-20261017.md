## Cierre verificable — micrófono y conversación migrada — 2026-10-17

Fusión normal #312: c02f5142d7609c35d8a2dc2c549726edc4016f13. Candidata READY comprobada antes de promoción. Alias público verificado con /api/version y guardia anónima 401; verificación repetida posterior. Sin force/admin ni cambios de protecciones, claves o facturación.
Corrección: preparación autenticada independiente del catálogo; historial 503 no bloquea una captura nueva. Preparación 503 mantiene bloqueo explícito y reintento; 401 no habilita micrófono.
Pruebas locales de combinación con main: 502 unitarias y tipos; benchmark previo de 30 pruebas reutilizado por huella intacta, 29 regresiones de navegador y 13 comprobaciones SQL aisladas. Compilación acreditada por candidata Vercel. No equivalen a voz física ni custodia productiva certificadas.
Conversación adjunta: docs/frentes/dictado-voz/originales/CONVERSACION-MIGRADA-20261017.txt, 51233 bytes, SHA-256 f079409bd77923f54dfffeb04314a118b19cfd5718c0225b2dbfa9e846342809; GitHub leído de vuelta y comparado byte por byte, también en revisión fusionada. Se conserva el original anterior. Atributos -text -diff protegen la custodia exacta con CRLF/espacios del original; no se normalizó el adjunto.
GitHub Actions: 9/9 trabajos observados no iniciados por facturación; no contados como aprobados.
Pendientes humanos/materiales: voz física y navegador autenticado; comprobar audio en proveedor. Suspensión de khora-audio observada antes del corte: no levantada por esta corrección, sin cambio de plan. No se simula aceptación humana.
Objeto canónico: https://github.com/SeryMente/khora/blob/c02f5142d7609c35d8a2dc2c549726edc4016f13/docs/frentes/dictado-voz/OBJETO-CANONICO.md

```json
{
  "result": "MICROPHONE_RELEASE_AND_CUSTODY_VERIFIED",
  "verifiedAt": "2026-10-17T22:13:00.382Z",
  "merge": {
    "mergeCommit": {
      "oid": "c02f5142d7609c35d8a2dc2c549726edc4016f13"
    },
    "mergedAt": "2026-10-17T22:07:01Z",
    "state": "MERGED",
    "url": "https://github.com/SeryMente/khora/pull/312"
  },
  "sha": "c02f5142d7609c35d8a2dc2c549726edc4016f13",
  "deploymentId": "dpl_DD5RsHVrkSCoYjFoumRvRMTncNtU",
  "production": "https://khora-web.vercel.app",
  "checks": [
    {
      "path": "/api/version",
      "status": 200,
      "body": {
        "commit": "c02f5142d7609c35d8a2dc2c549726edc4016f13",
        "rama": "HEAD",
        "desplegado_desde_git": true,
        "entorno": "production",
        "rutas": [
          "/sistema/custodia",
          "/api/volcado"
        ],
        "ahora": "2026-10-17T22:11:19.176Z"
      }
    },
    {
      "path": "/api/dictado/checkpoint?bootstrap=1",
      "status": 401
    }
  ],
  "tests": {
    "unit": 502,
    "browserBenchmark": 30,
    "additionalBrowserRegression": 29,
    "realIsolatedPostgreSQL": 13,
    "types": "passed",
    "navigation": "passed",
    "uiRegistry": "passed"
  },
  "benchmarkInputsUnchanged": true,
  "custody": {
    "status": "VERBATIM_VERIFIED",
    "sha": "aa97d8d7d0ef1b3e539d26cd638a7aa68069a116",
    "path": "docs/frentes/dictado-voz/originales/CONVERSACION-MIGRADA-20261017.txt",
    "blob": "d7e1749b37f40b2cfd7794411c45e6bad82ddfa1",
    "bytes": 51233,
    "sha256": "f079409bd77923f54dfffeb04314a118b19cfd5718c0225b2dbfa9e846342809",
    "remoteByteEquality": true,
    "previousOriginalSha256": "9eeef45f66d432b109ad4dbf04b2295bbfa990f08327c1fe7127e8a1c204abe5",
    "mergedRevision": "c02f5142d7609c35d8a2dc2c549726edc4016f13",
    "mergedByteEquality": true
  },
  "ci": [
    {
      "name": "calidad",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073732173/job/117516475076"
    },
    {
      "name": "calidad",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073727950/job/117516462290"
    },
    {
      "name": "UI Contract",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073732177/job/117516475306"
    },
    {
      "name": "khora-ok",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073732272/job/117516475625"
    },
    {
      "name": "api-tests",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073732173/job/117516474942"
    },
    {
      "name": "api-tests",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073727950/job/117516462179"
    },
    {
      "name": "UI E2E",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073732177/job/117516475119"
    },
    {
      "name": "khora-web-gate",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073732173/job/117516475108"
    },
    {
      "name": "khora-web-gate",
      "conclusion": "FAILURE",
      "notStartedForBilling": true,
      "url": "https://github.com/SeryMente/khora/actions/runs/39073727950/job/117516462388"
    }
  ],
  "limits": [
    "Physical microphone and authenticated operator session not tested.",
    "SQL tests isolated and external speech services controlled, not productive audio certification.",
    "Audio storage previously observed suspended; release does not remove provider suspension or authorize billing changes.",
    "GitHub Actions are not approved by local test success."
  ]
}
```