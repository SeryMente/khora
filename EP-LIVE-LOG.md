# KHORA EP — LIVE LOG

**Propósito:** registro operativo público y sanitizado del Entorno Persistente.
**Versión:** KHORA v7.2.0
**Estado:** ACTIVE
**Última sincronización:** 2026-08-19 17:23:21
**Motivo:** periodic-active-session
**Branch publicado:** main
**HEAD observado:** 6fb2640484a868c73791796076002d615fe61708

> Este archivo es un registro operativo, no sustituye EP-ARCHITECTURE.md.
> Se actualiza bajo demanda, al quedar lista una sesión y al iniciar el cierre de sesión.

## Eventos recientes

[16:10:22][INFO] npm:   npm audit fix
[16:10:22][INFO] npm: 
[16:10:22][INFO] npm: To address all issues (including breaking changes), run:
[16:10:22][INFO] npm:   npm audit fix --force
[16:10:22][INFO] npm: 
[16:10:22][INFO] npm: Run `npm audit` for details.
[16:10:22][INFO] npm: npm warn allow-scripts 5 packages have install scripts not yet covered by allowScripts:
[16:10:22][INFO] npm: npm warn allow-scripts   @firebase/util@1.15.1 (postinstall: node ./postinstall.js)
[16:10:22][INFO] npm: npm warn allow-scripts   @google/genai@2.13.0 (preinstall: echo 'preinstall: no-op')
[16:10:22][INFO] npm: npm warn allow-scripts   protobufjs@7.6.5 (postinstall: node scripts/postinstall)
[16:10:22][INFO] npm: npm warn allow-scripts   sharp@0.34.5 (install: node install/check.js || npm run build)
[16:10:22][INFO] npm: npm warn allow-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
[16:10:22][INFO] npm: npm warn allow-scripts
[16:10:22][INFO] npm: npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.
[16:10:22][OK  ] khora-web: dependencias instaladas (npm ci).
[16:10:22][OK  ] Vercel CLI disponible.
[16:10:22][INFO] Render CLI omitido: el paquete no existe en npm.
[16:10:22][STEP] VS Code
[16:10:22][OK  ] VS Code encontrado: C:\Users\<USER>\AppData\Local\Programs\Microsoft VS Code\Code.exe
[16:10:22][STEP] VS Code: importando configuracion desde el repo
[16:10:22][OK  ] VS Code abierto (PID 25872)
[16:10:22][STEP] Navegador (inteligente)
[16:10:22][OK  ] LastPass detectado en Chrome.
[16:10:22][INFO] Chrome inteligente: 4 URLs | login=False | lastpass=True | running=True
[16:10:22][OK  ] Chrome ya activo: 4 pestanas nuevas agregadas.
[16:10:22][STEP] Guardian KHORA (red de seguridad)
[16:10:23][OK  ] Guardian activo (PID 20336) - inactividad 15min + panico Ctrl+Alt+K
[16:10:23][OK  ] Deadline registrado: limpieza automatica a las 20:00 (2026-08-19)
[16:10:23][STEP] Boveda de entorno (Env Vault)
[16:10:25][STEP] Servidores de desarrollo (AUTO-INICIO garantizado)
[16:10:25][INFO] Arrancando dev servers automaticamente post-token (API + Next.js)...
[16:10:25][INFO] === Start-DevServers: arrancando API (:8000) + Next.js (:3000) ===
[16:10:25][OK  ] API uvicorn -> http://localhost:8000  (nueva ventana)
[16:10:25][INFO] Dev server API uvicorn lanzado en :8000
[16:10:25][OK  ] Next.js dev -> http://localhost:3000  (nueva ventana)
[16:10:25][INFO] Dev server Next.js lanzado en :3000
[16:10:25][INFO] Dev servers iniciados. Sistema listo para trabajar.
[16:10:25][INFO] SESION LISTA en 152s
[16:10:26][INFO] Iniciando precarga paralela de dependencias (background job)...
[16:10:26][INFO] Guardian iniciado: inactividad 900s, panico Ctrl+Alt+K.
[16:10:27][INFO] Monitor de exfiltracion/RAT activo (cada 30s, umbral 25 MB/min).
[16:10:29][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:10:35][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:10:47][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:10:47][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:10:47][WARN] EP-LIVE-LOG no pudo sincronizarse en la instancia inicial.
[16:12:50][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:12:56][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:13:08][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:13:08][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:15:11][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:15:17][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:15:29][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:15:29][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:15:50][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:15:51][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:15:59][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:16:10][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:16:10][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:17:32][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:17:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:17:51][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:17:51][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:19:54][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:20:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:20:12][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:20:12][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:21:13][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:21:15][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:21:22][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:21:33][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:21:33][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:22:15][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:22:22][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:22:33][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:22:33][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:24:37][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:24:45][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:24:57][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:24:57][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:26:36][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:26:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:26:44][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:26:56][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:26:56][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:27:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:27:06][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:27:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:27:20][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:29:23][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:29:31][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:29:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:29:42][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:31:46][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:31:54][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:32:05][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:32:05][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:32:09][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:32:09][INFO] Auto-WIP: logs copiados a repo/logs/ (incluidos en el commit)
[16:32:09][INFO] git add: OK warning: in the working copy of 'diagnostico-pr211-20260819-162804.txt', CRLF will be replaced by LF the next time Git touches it
[16:32:09][INFO] git commit: OK [main 2af9c6c] wip: auto-guardado 16:32:09  2 files changed, 299 insertions(+)  create mode 100644 diagnostico-pr211-20260819-162804.txt  create mode 100644 diagnostico-pr211-final-20260819-163140.txt
[16:32:12][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:32:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:32:32][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:32:32][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:34:08][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:34:15][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:34:26][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:34:26][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:36:30][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:36:36][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:36:48][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:36:48][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:37:35][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:37:35][INFO] Auto-WIP: logs copiados a repo/logs/ (incluidos en el commit)
[16:37:35][INFO] git add: OK 
[16:37:35][INFO] git commit: OK [main 143de68] wip: auto-guardado 16:37:35  1 file changed, 0 insertions(+), 0 deletions(-)
[16:37:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:37:44][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:37:55][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:37:55][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:38:51][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:38:57][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:39:08][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:39:08][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:41:04][FAIL] ALERTA EXFILTRACION/RAT: subida sostenida 27.5 MB/min (posible exfiltracion)
[16:41:11][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:41:17][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:41:29][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:41:29][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:42:59][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:43:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:43:06][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:43:18][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:43:18][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:43:32][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:43:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:43:49][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:43:49][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:45:52][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:45:59][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:46:11][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:46:11][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:48:14][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:48:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:48:31][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:48:31][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:48:34][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:48:36][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:48:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:48:53][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:48:53][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:50:34][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:50:41][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:50:52][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:50:52][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:52:55][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:53:01][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:53:12][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:53:12][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:53:57][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:53:58][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:54:04][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:54:16][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:54:16][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:54:20][FAIL] ALERTA EXFILTRACION/RAT: subida sostenida 25.4 MB/min (posible exfiltracion)
[16:55:15][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:55:22][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:55:33][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:55:33][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:57:36][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:57:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:57:54][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:57:54][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:59:19][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:59:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:59:27][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:59:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:59:38][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:59:57][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:00:03][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:00:14][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:00:14][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:00:58][FAIL] ALERTA EXFILTRACION/RAT: subida sostenida 25.7 MB/min (posible exfiltracion)
[17:02:17][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:02:24][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:02:35][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:02:35][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:04:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:04:44][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:04:56][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:04:56][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:04:59][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:05:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:05:07][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:05:18][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:05:18][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[17:06:59][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:07:05][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:07:16][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:07:16][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:09:19][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:09:26][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:09:37][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:09:37][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:10:21][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:10:22][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:10:29][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:10:44][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:10:44][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[17:11:40][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:11:46][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:11:58][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:11:58][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:14:01][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:14:07][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:14:18][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:14:18][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:15:47][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:15:49][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:15:55][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:16:06][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:16:06][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[17:16:21][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:16:28][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:16:39][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:16:39][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:18:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:18:48][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:19:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:19:00][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:21:03][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:21:09][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:21:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:21:20][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:21:24][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:21:25][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:21:31][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:21:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:21:43][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).

--- HISTORIAL DE SESIONES (ULTIMAS LINEAS) ---
[16:53:12][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:53:12][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:53:57][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:53:58][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:54:04][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:54:16][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:54:16][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:55:15][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:55:22][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:55:33][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:55:33][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:57:36][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:57:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:57:54][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:57:54][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[16:59:19][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[16:59:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[16:59:27][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[16:59:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[16:59:38][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[16:59:57][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:00:03][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:00:14][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:00:14][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:02:17][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:02:24][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:02:35][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:02:35][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:04:38][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:04:44][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:04:56][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:04:56][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:04:59][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:05:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:05:07][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:05:18][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:05:18][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[17:06:59][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:07:05][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:07:16][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:07:16][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:09:19][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:09:26][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:09:37][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:09:37][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:10:21][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:10:22][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:10:29][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:10:44][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:10:44][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[17:11:40][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:11:46][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:11:58][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:11:58][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:14:01][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:14:07][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:14:18][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:14:18][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:15:47][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:15:49][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:15:55][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:16:06][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:16:06][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).
[17:16:21][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:16:28][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:16:39][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:16:39][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:18:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:18:48][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:19:00][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:19:00][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:21:03][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:21:09][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:21:20][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:21:20][WARN] EP-LIVE-LOG: commit creado pero push no verificado.
[17:21:24][WARN] Chrome sin CDP activo o cerrado, omitiendo snapshot de pestañas.
[17:21:25][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 1/3).
[17:21:31][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 2/3).
[17:21:42][WARN] Push-Verified: push OK pero remoto[***] != local[***] (intento 3/3).
[17:21:43][WARN] Auto-WIP NO VERIFICADO: trabajo local sin respaldo remoto (reintento en el proximo ciclo).