# Crónica · Ciclo 05 · Prioridad ChatGPT Free → Vercel

**Fecha local:** 2026-10-29, America/Mexico_City.  
**OCP:** PUBLICABILIDAD-v0.5.  
**Fuente normativa adquirida:** DUG v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## Objetivo

Atender la prioridad urgente que indicó el operador: conseguir un método sólido para publicar actualizaciones de KHORA a Vercel desde el uso gratuito de ChatGPT, sin depender de una terminal local o RDC para desplegar.

## Hallazgo de viabilidad

- OpenAI documenta que la app GitHub conectada a ChatGPT es de solo lectura; para generar, editar y empujar cambios remotos apunta a Codex.
- Codex está incluido en Free, pero Codex Cloud no está incluido en Free. La edición local por Codex no satisface el requisito de flujo remoto sin terminal local.
- MCP personalizado con acciones de escritura se documenta para Business y Enterprise/Edu; no se acredita escritura MCP en ChatGPT Free.
- Por tanto, no se declara viable un flujo enteramente automático `ChatGPT Free → GitHub write → Vercel deployment` dentro del chat. El flujo gratuito que sí se puede diseñar es ChatGPT produce parche → operador aplica el cambio en GitHub Web sobre una rama → Vercel genera Preview desde Git → CI y gates verdes → merge controlado → un único publicador cloud de producción.

Fuentes:
- https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt
- https://help.openai.com/es-419/articles/11369540-using-codex-with-your-chatgpt-plan
- https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- https://vercel.com/docs/git

## Evidencia relevante de GitHub/Vercel

- `main` sigue en `e463e0c6efa857f4c4229894a96fab747a8a7574`; la producción observada sigue en el SHA `b528660e16552633d232a2397cbe42441a03438c`. GitHub informa un delta de 102 commits; no debe publicarse de manera indiscriminada.
- El Preview de Vercel `dpl_4NQWjXhtdaf9MWx2VDbVrdSZUXvm` en READY procede de la rama `feat/mcp-jules-tools-20261025`, SHA `d695f3e25ec0fe6edbdd80e03d7dd1a7d20ff58d`, y logs muestran build directo desde Git. Es prueba de que la ruta de Preview está observada, no de que el flujo actual de producción esté certificado.
- Cinco workflows (CI de la rama y cuatro workflows programados de `main`) presentan fallos de 1–2 segundos, `runner_id=0`, runner vacío, `steps=[]` y logs `BlobNotFound`. El snapshot de status.github.com consultado a las 15:04:55Z reportaba operación normal antes de los runs recientes a las 15:21Z y 15:43Z. La causa raíz sigue NO DETERMINADA; no hay comando local reproducible.
- `.github/workflows/deploy-production.yml` y la integración Git de Vercel son dos posibles rutas productivas. El Build Command observado contiene migración runtime condicionada a producción; el workflow ejecuta esa migración explícitamente antes de construir. La doble invocación es un riesgo que hay que resolver, no un hecho demostrado en el mismo run.
- El smoke del workflow de producción consulta `khora-web.vercel.app`; el workflow de post-deploy consulta `khora-ten.vercel.app`.
- La API convencional informa `protected=false` para `main`, y no fue posible acreditar las reglas completas desde la integración disponible.

## Decisión provisional de arquitectura

Se recomienda GitHub Actions como **único publicador de producción** y Vercel Git para Previews, una vez que Actions vuelva a ejecutar y se corrija la doble ruta/migración. Motivo: el workflow cloud existente ya contiene el paso de migración explícito, construcción, deployment, provenance por SHA y smoke, sin requerir terminal local. Para materializarlo se debe:
1. restaurar/diagnosticar Actions;
2. verificar y exigir PR/checks efectivos antes de `main`;
3. configurar Vercel Git para conservar Previews y omitir publicación automática de la rama productiva;
4. eliminar la migración del Build Command si Actions la mantiene explícita;
5. unificar el dominio smoke;
6. confirmar el SHA/candidato exacto y probar la ruta de Preview antes de cualquier release.

Estos ajustes son propuestas de diseño; no se cambiaron settings, workflows ni protección de ramas durante este ciclo. No se hizo deployment ni se ejecutó migración.

## Restricciones respetadas

- Solo lectura de GitHub/Vercel y escritura documental en `publicabilidad/inauguracion-20261028`.
- No se modificó `main`, código de producto, settings/secretos/plan de Vercel ni reglas de GitHub.
- No se usó RDC/CLI local, porque el fallo de Actions no expone step/comando reproducible.
- El control de responsabilidad permanece `unassigned`.

## Artefactos persistidos

- [OCP Publicabilidad v0.5](../OBJETO-CANONICO.md).
- [Diagnóstico de viabilidad ChatGPT Free → Vercel](../evidencias/DIAGNOSTICO-VIABILIDAD-CHATGPT-FREE-VERCEL-2026-10-29.md).
- [PSP v0.2 con S03 revisado](../evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.2.md).
- [Estado vivo e investigación del ciclo 04](../evidencias/INVESTIGACION-CICLO-04-2026-10-29.md).

## Resultado

La prioridad queda incorporada al OCP v0.5 con un camino gratuito, sin terminal local, y con los bloqueos productivos expresamente fijados. El flujo de producción continúa **no probado / bloqueado** hasta que Actions, el publicador único y las migraciones/Smoke queden reconciliados.
