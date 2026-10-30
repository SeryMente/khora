<!-- PUBLICABILIDAD_VERSION=v0.11; PUBLICABILIDAD_SEAL=PUBLICABILIDAD-v0.11 -->
# Objeto Canónico de Persistencia · Publicabilidad

## 1. Identidad y estado

- **Frente:** Publicabilidad.
- **Repositorio:** SeryMente/khora.
- **Ruta:** docs/frentes/publicabilidad/OBJETO-CANONICO.md.
- **Versión:** v0.11 · escenario ordinario KHORA main → Vercel Production.
- **Sello:** PUBLICABILIDAD-v0.11.
- **Estado:** DOCUMENTADO; la llamada de MCP con target=production aún no ha sido ejecutada en vivo.
- **Rama documental:** publicabilidad/psp-main-chatgpt-vercel-20261030, creada desde el SHA de main observado al abrir este ciclo. No cambia main.
- **Titularidad:** el control permanece unassigned, generation 1. Esta tarea documenta una instrucción puntual; no transfiere titularidad exclusiva del frente.
- **Gobernanza adquirida en este ciclo:** DUG v362 · NX-362m; Metacanon 1.24; GOW 2.11; blob cbf549d5e36c044d1e908228944f00ae911cdda4, leído de SeryMente/metodologia/main.

## 2. Decisión de alcance fijada por el operador

El objeto de este ciclo no es evaluar cuántos commits separan main de producción, decidir qué cambios deben fusionarse ni reabrir decisiones de integración. El operador controla qué queda incorporado a main. El frente resuelve exclusivamente cómo tomar el HEAD vigente de main y publicarlo en el proyecto y dominio canónicos de Vercel, desde ChatGPT, con identificación exacta del commit y verificación posterior.

**Escenario cotidiano:** main ya contiene el conjunto de cambios que el operador decidió integrar; el operador solicita publicar main a producción; ChatGPT crea directamente un deployment de producción desde el SHA exacto mediante el conector Vercel.

No se crea Preview como etapa, no se promueve un Preview, no se usa CLI local, RDC ni Work, no se transfieren tokens y no se modifica el contenido de main.

## 3. Configuración canónica observada

| Elemento | Valor observado |
|---|---|
| Repo | SeryMente/khora |
| Rama | main |
| Vercel team | victorhugotorresmendez-8991s-projects |
| Team ID | team_QBa5UlffJWznZ8ogFfKjaGQb |
| Plan | Hobby |
| Proyecto | khora-web |
| Project ID | prj_hRN86BKITXYKTnNlp0ygVhaMwFfx |
| Framework / Node | Next.js / 24.x |
| URL canónica | https://khora-web.vercel.app/ |
| Último deployment de producción leído | dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH |
| SHA de ese deployment | b528660e16552633d232a2397cbe42441a03438c |

El dominio khora-web.vercel.app consta asociado al proyecto y verificado. La protección SSO del proyecto se observó habilitada para all_except_custom_domains; la comprobación autenticada desde ChatGPT no demuestra por sí sola accesibilidad anónima del dominio. No cambiar la política SSO en este escenario.

El SHA de main observado al documentar fue a515d653a6822c1c7aa695617bb38824b3aa4572. Es una fotografía, no un SHA que deba reutilizarse en releases futuros.

## 4. Autoridad de publicación y conflicto actual

La ruta cotidiana documentada usa **ChatGPT → Vercel MCP → Git source SHA → target production**.

Hechos que condicionan esa decisión:
1. El conector Vercel de esta sesión ofrece lectura y creación de deployments y ya construyó desde GitHub privado un deployment Preview para un SHA exacto. La construcción remota por Git source está demostrada; la primera ejecución con target production todavía no.
2. En main, CI #40959059770, UI Quality #40959059776 y Deploy to Production #40959059940 concluyeron en failure; las seis jobs consultadas devolvieron steps=[] (ningún step ejecutado). Esto acredita que esos jobs no ejecutaron su secuencia, pero el detalle del motivo del runner no está disponible y la causa raíz exacta no quedó demostrada.
3. .github/workflows/deploy-production.yml escucha push a main y workflow_dispatch. Si los runners se recuperan, puede convertirse en un segundo publicador de producción. El procedimiento verifica su ejecución para el SHA candidato y jamás inicia un segundo deployment mientras ese publicador esté activo o ya haya terminado correctamente.
4. La integración Git automática de Vercel con repositorios privados de organizaciones tiene restricciones en Hobby documentadas por Vercel. No se cambia plan, propiedad ni visibilidad. La ruta MCP se apoya en la autorización Git de servidor del conector Vercel y en el proyecto existente; su primera publicación a producción debe acreditar que ese caso concreto supera las restricciones de la cuenta.

**No declarar que Actions es la causa del fallo ni que el plan es la causa del fallo de runners:** la evidencia disponible solo establece que no llegaron a ejecutarse los steps.

## 5. Protocolo rector

El detalle ejecutable está en [PROTOCOLO-PUBLICACION-MAIN-CHATGPT-VERCEL-001.md](PROTOCOLO-PUBLICACION-MAIN-CHATGPT-VERCEL-001.md). Invariantes:

1. Resolver el SHA actual de main en cada solicitud; no reutilizar SHA histórico ni basar la decisión en un conteo de commits.
2. Verificar repo, team, proyecto y dominio antes de escribir.
3. Detectar un deployment ya existente para ese SHA y cualquier ejecución concurrente del workflow productivo.
4. Si el SHA ya está publicado en el alias canónico, informar y no crear otro deployment.
5. Si existe una ejecución productiva activa, esperar y verificarla; no lanzar un publicador paralelo.
6. Si Actions concluyó sin desplegar y no existe deployment productivo para el SHA, usar el conector Vercel desde ChatGPT.
7. Fijar gitSource.sha al SHA consultado y usar requestBody.target = production explícitamente. No omitir target (su valor por defecto crea Preview).
8. Esperar el estado terminal de Vercel y exigir READY, target=production, SHA/branch/repo correctos y alias khora-web.vercel.app.
9. Probar la URL canónica y revisar build/runtime logs. Distinguir acceso autenticado por SSO de disponibilidad anónima.
10. Ante timeout ambiguo, consultar deployments del SHA antes de reintentar. Ante build fallido, inspeccionar migraciones y logs antes de cualquier nuevo intento.

## 6. Particularidades del build de producción

En el último build productivo leído, Vercel ejecutó el Build Command:

    if [ "$VERCEL_ENV" = "production" ]; then node scripts/migrate-runtime.mjs; fi && next build --webpack

Por ello:
- El deployment directo a target=production ejecuta el build command del proyecto; el script de migración forma parte de ese build.
- No ejecutar manualmente migrate-runtime.mjs antes o después de crear el deployment.
- Si el build falla, no reintentar a ciegas: una migración puede haber terminado antes del fallo de Next.js.
- El workflow antiguo de Actions también invoca la migración explícitamente antes de vercel build --prod. Si vuelve a ejecutarse, debe observarse la posibilidad de doble aplicación antes de autorizar una segunda vía productiva.
- khora-web/package.json contiene un prebuild con typecheck, UI Review, contrato UI, tests unitarios y preflight, pero el Build Command observado invoca next build --webpack directamente; ese prebuild no se debe presentar como gate ejecutado por Vercel.
- Esta ruta valida el build de Vercel y la procedencia del deployment; no equivale a CI completo ni a ejecución de suites unitarias, E2E, API o Python/Neo4j.

## 7. Condiciones de parada

Detenerse sin mutar más si:
- Falta el conector Vercel, su sesión OAuth o permiso para crear deployments.
- Cambian team, project, repo, branch o domain respecto de los valores canónicos.
- main cambia entre la fijación del candidato y la creación del deployment.
- Hay un workflow o deployment productivo activo para el mismo SHA.
- Ya existe un deployment READY del mismo SHA asignado al dominio canónico.
- Vercel rechaza la fuente Git por elegibilidad/autoría/plan, o agota cuota.
- El build falla, el deployment no termina en READY, el SHA no coincide o no se asigna el alias canónico.
- El smoke no permite distinguir una respuesta de aplicación de un bloqueo SSO.

No cambiar billing, plan, visibilidad/propiedad del repo, tokens, secretos, variables, settings, dominios ni workflows como reacción automática a estos bloqueos.

## 8. Alcance siguiente

Este v0.11 libera únicamente el escenario cotidiano. Quedan fuera, para documentación posterior: restauración de GitHub Actions, OAuth MCP no disponible, timeout con resultado ambiguo, build fallido después de migración, cuota/rate limit Hobby, bloqueo por autoría o repo privado, deployment READY sin alias, SSO y acceso anónimo, rollback, actualización de Node/configuración, cambios de dominio y recuperación desde RDC/CLI.

## 9. Procedencia

Antecedente documental completo v0.10: [rama inaugural](https://github.com/SeryMente/khora/tree/publicabilidad/inauguracion-20261028/docs/frentes/publicabilidad). Esa rama está divergida de main; no fusionarla en bloque. Esta rama nueva parte del main observado a515d653a6822c1c7aa695617bb38824b3aa4572 para aislar el procedimiento actualizado.

No se realizó deployment productivo, migración, modificación de secretos, configuración Vercel ni cambio a main durante este ciclo.
