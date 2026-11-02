# HARMONIA · reinstanciación local tras pérdida total de entorno · generación 14 · 2026-11-01

## Declaración de pérdida y nueva autoridad RDC

El operador declaró la pérdida completa del entorno local y de la sesión RDC anteriores. Para esta continuidad no se presume supervivencia de clones, archivos, procesos, variables, credenciales, perfiles de Chrome ni sesiones remotas previas. La evidencia remota ya publicada en GitHub se conserva como fuente independiente.

Nueva conexión: 015RENTA01, UUID RDC aacf2eb5-17f4-428e-9242-c24a1fe4a2ec, versión Desktop Commander 0.3.1. El control autoritativo se actualizó en main mediante commit c994caeab849c89b97b094ce3718e485b12c2971 y blob 90e24321237000fea6b594c62fc3564445c82bc6. La lectura de vuelta confirmó:
- titular HARMONIA sin cambio: alias operativo chatgpt-harmonia-01a19969-8e70-7dcb-b9fd-7db62736f279;
- generación 14 conservada porque no hubo transferencia a otro titular;
- nuevo dispositivo autorizado: 015RENTA01 / aacf2eb5-17f4-428e-9242-c24a1fe4a2ec;
- PC-8 / 7595d30a-bd63-4bc0-a274-f4ae90928247 preservado como antecedente supersedido;
- FOL1 no activa y session_folio=null.
Evento local UUIDv7: 01a199c8-8bc1-79fb-a4a8-e3088850c9bc.

## Identidad local observada

Verificación RDC/PowerShell:
- MachineName: 015RENTA01.
- Windows identity: 015RENTA01\015RENTA01.
- SID: S-1-5-21-4061665785-3686036472-903815331-1003.
- USERPROFILE: C:\Users\PC.
- LOCALAPPDATA: C:\Users\PC\AppData\Local.
- Windows x64, PowerShell 5.1.26100.7920, Node v24.22.2.
- Chrome existe en C:\Program Files\Google\Chrome\Application\chrome.exe.
- Git no está en PATH ni en las ubicaciones comunes comprobadas; VS Code no está en las ubicaciones comunes comprobadas. npm.ps1 está bloqueado por ExecutionPolicy; npm.cmd funciona.
- Escritorio inicial vacío de repositorios. No se encontró ni se reutilizó el antiguo clon. No se accedió a perfiles Chrome ni a secretos locales.

## Workspace de validación

Se creó C:\Users\PC\Desktop\Khora\khora-main como workspace fresco de validación parcial. No es un clon Git completo. Solo contiene los archivos del candidato HARMONIA requeridos para pruebas; los archivos se transfirieron desde la rama feat/harmonia-local-first-mainline-20261101 y cada Git blob SHA se cotejó localmente.

Nueve archivos exactos, sin BOM y con LF:
- collector/ep-consumer-adapter.js — 430ab91ff4ba103df9266aa525461a12d1a98223
- collector/server.js — 48888b7b6315b7b73edae6d7e9663c533505c3fd
- collector/tests/ep-consumer-adapter.test.js — e34f33c49269bcb0c719d8a8c827202346af4186
- collector/tests/server-local-first.integration.test.js — 805b72660f50c91416c061f72a518cfd3c280354
- extension/durable-outbox.js — 51b53b0daac91562e0f37204fbf40362390b45ee
- extension/tests/durable-outbox.test.js — c3581a411c8423f47e288a11db23c1ab58bb5c9d
- coverage-catalog.json — d18285374d5b54561738882222b2981dff3168be
- extension/service-worker.js — f8b9d4566f0cfe1ed06866ebf3a3f0eed9671254
- extension/popup.js — 1c349e5f07434e7a472e335f7b78b43afb54984f

Dependencia de pruebas: fake-indexeddb@6.2.7 instalada por npm.cmd con --no-save --ignore-scripts; exit code 0. No se instalaron secretos ni credenciales.

## Resultado de validación local

- Node --check: 8/8 archivos PASS.
- Node --test: 10 tests, 10 PASS, 0 FAIL, 0 cancelled/skipped/todo; duración reportada 2.9827589 segundos; exit code 0.
- Casos cubiertos: reconciliación local de originales, exclusión del histórico preactivación, identidad idempotente, recuperación tras reinicio del colector, conflicto de hash, flush remoto bloqueado sin contrato/allowlist, verificación local sin falsificar EP, escritura JSONL/ledger durable, reconstrucción de índice y outbox IndexedDB con reintentos/ACK explícito.
- El PASS aplica al test local-first en Node v24.22.2/Windows; no equivale al CI de GitHub Actions, no prueba Node 22 ni valida la extensión ejecutándose en Chrome.

## Estado restante

La PR #351 sigue abierta en borrador. GitHub Actions sigue terminando en failure con jobs sin pasos y logs BlobNotFound; su causa raíz permanece NO DETERMINADA. Este resultado local reduce la incertidumbre sobre la suite local-first, pero no explica el fallo del runner.

Chrome no se cargó ni recargó; no hubo aceptación natural, mediciones CPU/RAM/latencia, escrituras Neon, operaciones B2, transporte EP, backfill, merge ni despliegue. OCP-MCP sigue siendo el destino EP normativo exclusivo según OEP §91; contrato, auth/scopes, allowlist, recibo, read-back y permisos de bucket/key/prefix no están verificados.

## Fuentes

- Control: docs/frentes/harmonia/CONTROL-RESPONSABILIDAD.json, commit c994caeab849c89b97b094ce3718e485b12c2971, blob 90e24321237000fea6b594c62fc3564445c82bc6.
- Evidencia: docs/frentes/harmonia/evidencias/EV-HARMONIA-RDC-RESET-TEST-20261101.json, blob 180d046bc32c998513c455d71607b247fddb821b.
- PR: https://github.com/SeryMente/khora/pull/351
- Rama: https://github.com/SeryMente/khora/tree/feat/harmonia-local-first-mainline-20261101
- DUG: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html
- OEP: https://github.com/SeryMente/metodologia/blob/main/frentes/ep/OEP.md
