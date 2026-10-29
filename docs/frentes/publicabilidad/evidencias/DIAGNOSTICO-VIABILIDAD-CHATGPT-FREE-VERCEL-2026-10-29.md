# Diagnóstico de viabilidad · ChatGPT Free → GitHub → Vercel

**Fecha:** 2026-10-29 · America/Mexico_City  
**Prioridad:** P0 — método de publicación sin terminal local  
**Objeto rector:** [OCP Publicabilidad](../OBJETO-CANONICO.md), PUBLICABILIDAD-v0.5 (tras persistir este ciclo).  
**Fuente normativa realmente leída:** DUG v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.  
**Alcance ejecutado:** investigación y documentación remotas de solo lectura, más escritura documental en la rama Publicabilidad. No se creó deployment, no se usó RDC y no se modificaron configuración/secretos ni código de producto.

## 1. Conclusión ejecutiva

Hay que distinguir dos objetivos:

1. **Publicación enteramente nativa y remota desde ChatGPT Free, sin intervención en GitHub/Vercel y sin máquina local.** No está acreditada por los mecanismos oficiales actuales. La app de GitHub conectada a ChatGPT es de solo lectura; MCP personalizado con escritura se ofrece a Business y Enterprise/Edu, no a Free; Codex está incluido en todos los planes, pero Codex Cloud no está incluido en Free. La aplicación de escritorio/CLI/IDE de Codex puede incluir ejecución local, pero esa modalidad no cumple el objetivo de publicar sin usar un entorno/terminal local.
2. **Flujo sin coste adicional y sin terminal local, con transferencia manual por navegador.** Es viable como diseño: ChatGPT Free produce el parche y el plan de prueba; el operador crea una rama y aplica el cambio desde la interfaz web de GitHub; Vercel genera un Preview desde Git; después de pasar gates y resolver la autoridad productiva, se integra en `main` y el publicador cloud elegido ejecuta el release. La app de GitHub de ChatGPT no realiza la escritura; la interfaz web de GitHub es el puente manual.

El objetivo inmediato es hacer este segundo flujo sólido, con el mínimo de pasos manuales y sin fingir que una publicación de producción ya está habilitada.

## 2. Límites verificados de ChatGPT Free

| Capacidad | Evidencia oficial actual | Consecuencia para el diseño |
|---|---|---|
| Leer repositorios con la app de GitHub de ChatGPT | La app permite recuperar contenido autorizado para análisis/búsqueda; la propia guía dice que solo permite leer repositorios, no empujar código o PRs. | Útil para comprender/citar código; no sirve por sí sola para crear una rama, commit o PR. |
| Escribir a GitHub con Codex | OpenAI indica que Codex está incluido en todos los planes, incluido Free; los límites varían por plan. | Codex puede ser una alternativa de edición, pero no equivale a habilitar escritura MCP en el chat estándar. |
| Codex Cloud | OpenAI señala explícitamente que no está incluido en Free/Go. | No se puede basar el procedimiento gratuito, remoto y sin máquina local en Codex Cloud. |
| MCP personalizado con acciones de escritura/modify | La guía actual de OpenAI indica disponibilidad de MCP completo para Business y Enterprise/Edu en web. Pro dispone de lectura/obtención; la guía no acredita escritura nativa para Free. | No asumir que una conexión a Vercel MCP permite desplegar desde la sesión de ChatGPT Free. |
| Escritura desde la web de GitHub | GitHub permite al operador crear ramas, editar archivos y abrir PR desde el navegador, sujeto a sus permisos. | Es el puente manual sin CLI/local cuando ChatGPT no dispone de una ruta de escritura autorizada. |
| Build Preview en Vercel a partir de Git | La integración Git de Vercel crea previews por ramas/PR y una production deployment al hacer merge/push a la rama de producción configurada. | Permite comprobar el candidato por URL sin publicar manualmente con CLI local. |

Fuentes oficiales:
- GitHub conectado a ChatGPT: https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt
- Codex y planes de ChatGPT: https://help.openai.com/es-419/articles/11369540-using-codex-with-your-chatgpt-plan
- MCP personalizado en ChatGPT: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- Git deployments de Vercel: https://vercel.com/docs/git
- Deployment Checks de Vercel: https://vercel.com/docs/deployment-checks
- Ignored Build Step de Vercel: https://vercel.com/docs/project-configuration/project-settings ; https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel

## 3. Estado vivo relevante

### GitHub

- Repositorio: `SeryMente/khora`.
- `main`: `e463e0c6efa857f4c4229894a96fab747a8a7574`.
- Run CI de la rama Publicabilidad: [40900763575](https://github.com/SeryMente/khora/actions/runs/40900763575), SHA `c364fea2750d4f67b3dbae41285e1835cefb5503`.
- Sus jobs `khora-web-gate`, `api-tests` y `calidad` terminaron en 1–2 segundos con `runner_id=0`, runner vacío y `steps=[]`; recuperar los logs dio `BlobNotFound`.
- El mismo patrón aparece en cuatro workflows programados de `main`: Jules Auto-Respond (`40904382749`), Sync Todoist and Notion (`40889858840`), Board Orchestrator (`40889195532`) y Khora API Healthcheck (`40878917996`). Los jobs revisados también duran 1–2 segundos, tienen `runner_id=0`, runner vacío y `steps=[]`; sus logs dan `BlobNotFound`.
- El snapshot del endpoint público de estado de GitHub consultado indicaba «All Systems Operational» a las `2026-10-29T15:04:55Z`, antes de los runs recientes a las 15:21Z y 15:43Z. No demuestra el estado de Actions en el momento de esos fallos.
- Existen reportes comunitarios anteriores con el patrón de runner no asignado y `BlobNotFound`, y antecedentes de incidentes de asignación de runners, pero son indicios de una clase posible de fallo, no una causa raíz para este repositorio. Véanse https://github.com/orgs/community/discussions/210692, https://github.com/orgs/community/discussions/210224 y el historial de https://www.githubstatus.com/history.
- **Diagnóstico actual:** causa raíz **NO DETERMINADA**; no existe todavía un step/comando identificable para reproducir localmente. No se ejecutó rerun ni `workflow_dispatch`. No se usó RDC.

### Vercel

- Team: `victorhugotorresmendez-8991s-projects`, plan observado `hobby`.
- Proyecto: `khora-web`, ID `prj_hRN86BKITXYKTnNlp0ygVhaMwFfx`, conectado a `SeryMente/khora`.
- Último deployment con `target=production`: `dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH`, READY, SHA `b528660e16552633d232a2397cbe42441a03438c`, alias `khora-web.vercel.app`, creado `2026-10-24T21:59:10.581Z`.
- Comparación viva de GitHub: `main` está **102 commits por delante** del SHA productivo. El delta no es una autorización para publicar todo `main`; hay que escoger un candidato.
- Último deployment a nivel del proyecto: `dpl_4NQWjXhtdaf9MWx2VDbVrdSZUXvm`, READY pero `target=null`, rama `feat/mcp-jules-tools-20261025`, SHA `d695f3e25ec0fe6edbdd80e03d7dd1a7d20ff58d`, URL `khora-b5c5ip5lb-victorhugotorresmendez-8991s-projects.vercel.app`, creado `2026-10-25T22:13:16.095Z`. Es un deployment de rama/preview, **no** el deployment de producción.
- Los logs de ese Preview muestran que Vercel clonó directamente el repo/commit Git y ejecutó la compilación Next.js con el comando configurado:
  `if [ "$VERCEL_ENV" = "production" ]; then node scripts/migrate-runtime.mjs; fi && next build --webpack`.
  El deployment quedó READY. Como el target de ese deployment no es production, esta evidencia demuestra la ruta de Preview de Git, no prueba la migración de runtime de producción.

### Conflicto entre publicadores y migración

El workflow `.github/workflows/deploy-production.yml` se dispara por push a `main` y `workflow_dispatch`, ejecuta `migrate-runtime.mjs` explícitamente, después `vercel build --prod`, hace deploy preconstruido, verifica `ep-main-live.json` y prueba `https://khora-web.vercel.app/`.

A la vez, el proyecto está conectado a Git y Vercel documenta que puede producir deployments automáticamente a partir de los commits/merges de la rama productiva. Por tanto, hay dos rutas capaces de publicar desde `main`. Además, los logs Vercel muestran que el Build Command configurado invoca la migración cuando `VERCEL_ENV=production`, mientras el workflow de Actions ya ejecuta la migración antes de `vercel build --prod`. **La doble invocación es un riesgo concreto que hay que validar y eliminar antes de publicar; no se declara que haya sucedido dos veces en un run observado.**

La URL smoke también diverge: `deploy-production.yml` consulta `khora-web.vercel.app`, mientras `.github/workflows/post-deploy-smoke.yml` consulta `khora-ten.vercel.app`.

## 4. Método objetivo, compatible con ChatGPT Free y sin terminal local

Este procedimiento requiere el navegador de GitHub/Vercel como puente manual; no es una escritura nativa automática desde el conector GitHub de ChatGPT.

### Fase A — Preparar el cambio en ChatGPT Free

1. Identificar el repositorio, rama y SHA base exactos. Leer el OCP pertinente y los archivos relacionados, no editar a partir de una descripción incompleta.
2. Solicitar un cambio acotado. La respuesta de ChatGPT debe incluir los archivos exactos, el parche completo, pruebas/impacto, riesgos, y una lista explícita de secretos/configuración que **no** deben cambiarse.
3. No enviar secretos ni tokens a la conversación.
4. Preparar un mensaje de commit/PR y criterios de aceptación, pero no declarar que ya existe un commit remoto.

### Fase B — Transferencia remota por GitHub web

1. En la interfaz web de GitHub, crear una rama de trabajo desde el SHA base aprobado.
2. Aplicar los cambios del parche mediante edición web o carga de archivos, manteniendo archivos separados y sin alterar otros destinos.
3. Verificar el diff completo en la interfaz y crear un Pull Request. No escribir directamente en `main`.
4. Confirmar el SHA del commit, los archivos cambiados y el URL del PR. Si no puede aplicarse con fidelidad o el cambio afecta demasiados archivos para una operación fiable por navegador, detenerse y no improvisar.

### Fase C — Preview automático sin terminal

1. Dejar que la integración Git de Vercel genere el Preview de la rama/PR.
2. Verificar en Vercel el deployment ID, ref, commit SHA, estado final, URL, logs y Build Command real.
3. Probar la URL Preview y los criterios de aceptación específicos del cambio. READY solo significa que el deployment terminó; no equivale a aceptación funcional completa.
4. No usar Preview como sustituto de las pruebas de API/Python/contratos que no se ejecuten en el Build de Vercel.
5. No publicar a producción si Actions continúa fallando o los gates no son verificables.

### Fase D — Release a producción (bloqueada hasta resolver los P0)

La arquitectura candidata que mejor conserva los controles ya existentes es **GitHub Actions como único publicador productivo** (migra, construye, despliega, verifica provenance y ejecuta smoke en el runner cloud), mientras Vercel Git queda para Preview. Esto evita depender de terminal local y conserva trazabilidad; requiere que Actions vuelva a ejecutar y que se corrija la duplicación de publicadores/migración.

Antes de habilitar este camino hay que cerrar estas condiciones:

1. **Restaurar diagnóstico/ejecución de Actions.** Capturar logs legibles o recibir diagnóstico del proveedor; no hay comando reproducible local por ahora. El propietario debe revisar permisos/configuración/billing/estado del servicio y abrir soporte con los IDs de run/job si los fallos pre-runner persisten.
2. **Una única autoridad de producción.** Configurar la integración Git de Vercel para que no publique automáticamente los commits de `main`, pero mantenga Previews para ramas; Vercel documenta el campo *Ignored Build Step*, en el que exit code `0` omite un build y `1` lo ejecuta. Debe probarse de manera controlada antes de confiar en la configuración.
3. **Una sola ejecución de migraciones.** Si Actions conserva el paso explícito `migrate-runtime.mjs`, cambiar el Build Command del proyecto para que ejecute la compilación sin volver a invocar migraciones. Confirmar este comportamiento sobre un entorno/Preview no productivo y con un procedimiento de revisión; no editar configuración en este ciclo.
4. **Gates antes de `main`.** El estado de la API reporta `protected=false` para `main`; la integración no pudo leer toda la protección/rulesets. El propietario debe verificar Settings/rulesets y establecer un flujo de PR con checks requeridos; el workflow actual de deploy se dispara por push y no declara por sí solo dependencia de los jobs separados de CI.
5. **Verificación única y exacta.** Fijar el dominio smoke canónico; exigir coincidencia commit SHA → deployment ID → dominio de producción; capturar logs/provenance y pruebas pertinentes.
6. **Elegir un único candidato.** No promover los 102 commits del delta automáticamente. Revisar commits/PRs y seleccionar el conjunto que deba publicarse.
7. **Probar primero sin producción.** La ruta de Preview está observada, pero el flujo completo de release no está probado. La prueba de Preview, la prueba de la configuración de Ignore Build Step y cualquier ensayo de escritura deben ser autorizados y trazados.

No debe usarse el Dashboard, un Deploy Hook ni el Vercel MCP como atajo de producción mientras los gates, migraciones, provenance y smoke no sean equivalentes a la ruta elegida.

## 5. Por qué no activar hoy una publicación productiva

El estado actual no satisface el criterio de «método sólido»:

- cinco workflows distintos presentan el patrón de fallo previo a steps; causa raíz no determinada y logs no disponibles;
- no está demostrada la protección efectiva de `main`;
- `main` está 102 commits por delante del SHA productivo;
- coexisten Git Integration y la ruta de deploy de Actions;
- la migración aparece tanto en el Build Command como en el workflow;
- los workflows smoke consultan dominios diferentes;
- no se ha probado de forma concluyente el acceso anónimo al dominio ni el saldo de cuotas/uso.

La ruta de Preview sí está observada en Vercel a partir de una rama Git; no equivale a release productivo.

## 6. Siguientes acciones priorizadas

**P0.1 — GitHub Actions:** el propietario debe recuperar logs/telemetría del runner y resolver o escalar el fallo con IDs de run/job. No corresponde usar RDC hasta que haya un step/comando local que pueda reproducirse; no realizar reruns a ciegas.

**P0.2 — Decisión del publicador:** confirmar formalmente GitHub Actions como único publicador de producción y Vercel Git como proveedor de Previews, o elegir otra arquitectura solo después de documentar equivalencia. Esta investigación recomienda la primera por los controles ya implementados.

**P0.3 — Quitar doble ruta/migración:** preparar y revisar el cambio de Ignore Build Step y Build Command como propuesta de configuración, y reconciliar la URL smoke. Requiere autorización expresa antes de aplicar ajustes de Vercel/workflows.

**P0.4 — Hacer observable el candidato:** seleccionar SHA/PR y ejecutar Preview autorizado; exigir diffs y checks verdes antes de merge.

**P0.5 — Validar el puente gratuito:** durante una prueba autorizada, ejecutar una modificación documental inocua en rama desde GitHub web, verificar el Preview, y medir los pasos manuales. No hacer esta prueba sobre `main`.

## 7. Límite de viabilidad

Si el requisito se interpreta como «ChatGPT Free debe escribir en GitHub y desplegar producción sin que el operador toque GitHub/Vercel, sin terminal local y sin servicio intermedio», no existe una ruta nativa documentada que podamos dar por disponible. Para automatización totalmente remota haría falta cambiar una restricción: habilitar una interfaz con escritura autorizada (p. ej., un plan/workspace con MCP de escritura), usar un agente/entorno local de Codex, o construir una orquestación externa estrecha y segura. Estas alternativas no se adoptan ahora; la prioridad es la ruta gratuita de navegador con controles robustos.

## 8. Registro de evidencia

- OpenAI GitHub read-only: https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt
- OpenAI Codex plan / Free / Cloud exclusion: https://help.openai.com/es-419/articles/11369540-using-codex-with-your-chatgpt-plan
- OpenAI custom MCP write availability: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- Vercel Git auto deployment: https://vercel.com/docs/git
- Vercel build/deployment checks: https://vercel.com/docs/deployment-checks
- Vercel Ignored Build Step: https://vercel.com/docs/project-configuration/project-settings ; https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel
- CI failure: https://github.com/SeryMente/khora/actions/runs/40900763575
- Other workflow examples: https://github.com/SeryMente/khora/actions/runs/40904382749 ; https://github.com/SeryMente/khora/actions/runs/40889858840 ; https://github.com/SeryMente/khora/actions/runs/40889195532 ; https://github.com/SeryMente/khora/actions/runs/40878917996
- Production deployment: https://vercel.com/victorhugotorresmendez-8991s-projects/khora-web/H7ModaV6GTefp9qbjiUnpiHmxgFH
- Latest observed Preview deployment: https://vercel.com/victorhugotorresmendez-8991s-projects/khora-web/4NQWjXhtdaf9MWx2VDbVrdSZUXvm

## 9. Límites del ciclo

No se modificó `main`, código de producto, workflows, secretos, configuración de Vercel, protección de ramas, dominio, plan/facturación o base de datos. No se ejecutó migración, workflow_dispatch, rerun, deployment/preview nuevo, prueba HTTP anónima ni sesión RDC. La causa raíz de Actions sigue sin determinarse. Todo ajuste de Vercel/workflow descrito arriba es una propuesta pendiente de autorización y validación.
