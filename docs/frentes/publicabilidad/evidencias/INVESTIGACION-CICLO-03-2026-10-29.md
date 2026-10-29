# Investigación documental · Ciclo 03 · Publicabilidad

Fecha: 2026-10-29, America/Mexico_City. OCP rector: PUBLICABILIDAD-v0.3. Alcance: lectura GitHub/Vercel y documentación; no prueba de publicación.

## 1. Resumen ejecutivo

Los jobs recientes de CI, UI Quality y Deploy to Production fallaron en aproximadamente 1–2 segundos. GitHub devolvió runner_name vacío y steps vacíos; las solicitudes de logs devolvieron BlobNotFound. Esto es compatible con un problema previo a los steps o de asignación/inicialización del runner, pero no identifica causa raíz. No se ha demostrado agotamiento de cuotas, falta de secretos, YAML inválido, fallo de Vercel ni un incidente de GitHub.

main está en e463e0c6efa857f4c4229894a96fab747a8a7574 y producción en b528660e16552633d232a2397cbe42441a03438c (dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH), con 102 commits de diferencia informados por GitHub. Esto no autoriza promover todo el delta ni demuestra cuál es el candidato correcto.

Se identifican tres riesgos: main informa protected=false y no se pudieron leer protecciones/rulesets; Vercel build parece ejecutar migrate-runtime mientras GitHub Actions también lo invoca; los workflows smoke consultan khora-web.vercel.app y khora-ten.vercel.app. Nada de esto se modificó.

## 2. Norma vigente adquirida

Se leyó el documento normativo único de SeryMente/metodologia/main: Documento Único de Gobernanza (DUG) de Ser y Mente · Samantha v359; NX-359m; Metacanon 1.24; GOW 2.8; blob b2ff2845a5a99dc4ce3cafafc4f8e43607d48145. Fuente: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html. No se editó la metodología ni se creó un canon espejo.

## 3. GitHub: refs, runs y evidencias

| Dato | Valor observado |
|---|---|
| Repositorio | SeryMente/khora, privado |
| Rama documental antes del ciclo | publicabilidad/inauguracion-20261028 |
| HEAD documental antes del ciclo | 38b295e99a0f57deea2d7e6afa02a22e5f265941 |
| main | e463e0c6efa857f4c4229894a96fab747a8a7574 |
| SHA de producción | b528660e16552633d232a2397cbe42441a03438c |
| Diferencia | 102 commits según compare GitHub |

Runs inspeccionados:

- Deploy to Production: https://github.com/SeryMente/khora/actions/runs/40807127395 ; job deploy-and-notify, inicio 02:34:11Z, fin 02:34:13Z, runner vacío y steps vacíos.
- CI: https://github.com/SeryMente/khora/actions/runs/40807127325 ; khora-web-gate, api-tests y calidad fallaron en 1–2 s sin runner/steps.
- UI Quality: https://github.com/SeryMente/khora/actions/runs/40807127357 ; UI E2E y UI Contract fallaron en 1–2 s sin runner/steps.
- CI en la rama documental: https://github.com/SeryMente/khora/actions/runs/40806513561 ; tres jobs con steps no recuperables.

Logs consultados devolvieron BlobNotFound y los endpoints de pasos devolvieron listas vacías.

### Interpretación limitada

Observado: varios workflows distintos fallan antes de exponer pasos. Hipótesis prioritaria: inicialización/asignación del runner o una condición previa de Actions. No probado: cuotas/billing, permisos, secreto faltante, incidente de GitHub, YAML, aplicación o Vercel. El propietario debe revisar Actions billing/usage, hosted runners, permisos/configuración y estado del servicio cerca de 2026-10-29T02:34Z. No se ejecutó workflow_dispatch ni reintentos.

## 4. Gobierno de main

La API devolvió protected=false para main. Branch protection respondió 403 Resource not accessible by integration; rulesets devolvió 403 con el mensaje de que se requiere GitHub Pro o repositorio público. Por tanto, el indicador convencional reporta main como no protegida, pero la integración no pudo acreditar todas las reglas. El propietario debe inspeccionar Settings, porque push a main dispara el workflow productivo. No se modificó ninguna regla.

## 5. Vercel: producción, protección y cuotas

- Equipo: victorhugotorresmendez-8991's projects; plan Hobby.
- Proyecto khora-web, ID prj_hRN86BKITXYKTnNlp0ygVhaMwFfx, conectado a SeryMente/khora.
- Último deployment target production: dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, estado READY, SHA b528660e16552633d232a2397cbe42441a03438c, creado 2026-10-24T21:59:10.581Z.
- Dominio khora-web.vercel.app asociado y verificado por la API.
- Protección reportada: SSO enabled=true, all_except_custom_domains; passwordProtection=false; proyecto live=false.

No se hizo prueba HTTP anónima concluyente ni se obtuvo el saldo Usage. Hobby tiene límites publicados y se destina a uso personal/no comercial; el operador no ha clasificado el uso real de Khora.

Fuentes: https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits ; https://vercel.com/docs/deployment-protection

## 6. Posible doble invocación de migración runtime

El workflow deploy-production.yml invoca migrate-runtime.mjs explícitamente tras vercel pull y luego ejecuta vercel build --prod. Los logs Vercel de la última producción muestran el comando de build configurado con migrate-runtime.mjs antes de next build --webpack. Existe posible doble invocación si ese comando se aplica al build de CI; no se observó un run actual ejecutándolo dos veces.

El script recorre migraciones 023–029 y 032. Algunos SQL usan CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION y DROP TRIGGER IF EXISTS; eso no prueba idempotencia total ni ausencia de carreras/efectos. No se ejecutó build ni migración. Antes de elegir el publicador, definir una sola responsabilidad de migración y un único comando de build.

## 7. Divergencia de smoke URL

deploy-production.yml comprueba https://khora-web.vercel.app/; post-deploy-smoke.yml consulta https://khora-ten.vercel.app/. No hay evidencia de equivalencia. No cambiar por conjetura; confirmar dominio canónico y alinear el smoke.

## 8. MCP Vercel y publicación sin RDC

Vercel MCP permite crear deployments desde fuente Git o archivos y especificar target preview o production: https://vercel.com/docs/agent-resources/vercel-mcp/tools/deployments/create_deployment. Esto prueba la capacidad técnica del servidor, no la autorización de escritura del ChatGPT de cada operador ni la ejecución automática de migración, provenance, gates y smoke.

La guía actual de OpenAI documenta MCP personalizado con escritura para Business/Enterprise/Edu web y lectura/obtención para Pro; Free no tiene escritura acreditada por esa guía. Para Free o Plus se deben revisar las herramientas reales expuestas por el cliente. Solo se usó Vercel en modo lectura.

## 9. Consecuencias PSP

1. Diagnosticar Actions antes de reintentar.
2. No publicar HEAD automáticamente; seleccionar y aprobar candidato.
3. Reconciliar migración, provenance, smoke y concurrencia antes de elegir una única autoridad productiva.
4. Verificar protección efectiva de main mediante el propietario.
5. Tratar acceso anónimo y Usage como pendientes.
6. Probar MCP primero con preview explícito por SHA y autorización; no promoverlo a publicador de producción sin equivalencia demostrada.

## 10. Referencias

- Metodología: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html
- Deploy to Production: https://github.com/SeryMente/khora/actions/runs/40807127395
- CI: https://github.com/SeryMente/khora/actions/runs/40807127325
- UI Quality: https://github.com/SeryMente/khora/actions/runs/40807127357
- Workflow de producción: https://github.com/SeryMente/khora/blob/main/.github/workflows/deploy-production.yml
- Workflow smoke: https://github.com/SeryMente/khora/blob/main/.github/workflows/post-deploy-smoke.yml
- Hobby, límites y protección: https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits ; https://vercel.com/docs/deployment-protection
- Vercel MCP: https://vercel.com/docs/agent-resources/vercel-mcp/tools/deployments/create_deployment
- OpenAI custom MCP: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt

Límites: no se recuperaron logs legibles, no se consultó saldo Usage ni se hizo petición HTTP anónima concluyente, no se ejecutaron build o migraciones, ni se probaron preview, MCP escritura, rollback, RDC o CLI. No hubo cambios a main, secretos, configuración Vercel o deployments.