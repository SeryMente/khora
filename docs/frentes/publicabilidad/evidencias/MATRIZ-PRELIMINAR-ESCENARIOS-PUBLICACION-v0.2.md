# Matriz preliminar de escenarios · Protocolo Situacional de Publicación

**Versión:** 0.2 provisional (la v0.1 se conserva como fotografía histórica).  
**Corte observado:** 2026-10-29, ciclo 03; ver informe para refs, jobs y fechas exactas.  
**Objeto rector:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md), PUBLICABILIDAD-v0.3. Esta evidencia no constituye una fuente canónica independiente.

## Propósito

Preparar la futura versión 1.0 del Objeto Canónico de Persistencia: un Protocolo Situacional de Publicación (PSP) que indique a priori qué vía elegir y cuál es la secuencia de pasos más eficiente en cada escenario operativo identificado.

La eficiencia se evalúa solo entre rutas elegibles, seguras y autorizadas. Primero contrato, permisos y seguridad; después pruebas y trazabilidad SHA → deployment → URL → smoke; después evitar duplicados/races; finalmente minimizar pasos manuales, transiciones, latencia, reintentos, cuota y dependencias locales. Si no hay medición, indicar «no medido». No saltarse comprobaciones para reducir pasos.

## Dimensiones para clasificar cada escenario

| Dimensión | Valores que cambian la secuencia |
|---|---|
| Objetivo | Preview, producción, diagnóstico o rollback |
| Estado del cambio | Solo conversación, archivos locales, rama remota o commit en main |
| Capacidades de IA | Lectura, escritura Git/PR, MCP Vercel read-only, MCP Vercel de escritura, terminal o ninguna |
| Plan y cliente | ChatGPT Free, Pro, Business, Enterprise/Edu; web/móvil; permisos del workspace |
| Estado de Vercel | OAuth activo/expirado, equipo accesible, cuota suficiente/desconocida/agotada, build listo/fallido |
| Salud de GitHub | Actions sana, ejecución fallida, logs inaccesibles, permisos/límites |
| Estado de Git→Vercel | Preview creado, no creado, branch no enlazada, build fallido, protección de preview |
| Estado de solicitud | No enviada, aceptada, timeout ambiguo o deployment existente |
| Entorno local | No necesario, RDC verificado, RDC desconectado o CLI/dependencias ausentes |

## Preflight común

1. Confirmar objetivo y SHA exacto; leer main y el SHA de producción si «última versión» es ambiguo.
2. Comprobar OCP, autorización, permisos, elegibilidad contractual y cuota pertinente.
3. Inspeccionar el último deployment, branch/SHA, estado y URL; no tomar READY como prueba de publicación correcta.
4. Clasificar la causa del fallo anterior; no repetir una llamada si puede haberse aceptado.
5. Elegir una sola vía por intento; evitar invocar MCP, Actions, Git integration y CLI en paralelo.
6. Definir qué evidencia demostrará el éxito y cuándo hay que detenerse.

## Capacidades MCP de ChatGPT: distinguir servidor, cliente y plan

La guía actual de OpenAI documenta MCP completo con acciones de escritura para Business y Enterprise/Edu en web; Pro puede conectar MCP personalizado con permisos de lectura/obtención. La guía no acredita MCP personalizado con escritura para Free. En el PSP, el escenario Free se clasificará como escritura MCP no disponible/no verificada hasta confirmar una capacidad distinta en la cuenta real; no gastar intentos repitiendo la conexión como si fuese un fallo transitorio.

Fuentes:
- https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- https://vercel.com/docs/agent-resources/vercel-mcp
- https://vercel.com/changelog/chatgpt-is-now-supported-on-vercel-mcp (referencia histórica, no prevalente frente a la guía vigente de OpenAI)

## Escenarios y secuencias candidatas

### S01 · Servidor Vercel MCP disponible y escritura realmente autorizada en la sesión
1. Confirmar el conector oficial, OAuth, equipo, proyecto y repositorio.
2. Consultar deployment y SHA actual.
3. Probar en preview con un ref/SHA explícito.
4. Seguir deployment hasta estado final; guardar ID, SHA, URL, estado y logs.
5. Verificar acceso y pruebas pertinentes.
6. Producción solo mediante la autoridad elegida; el flujo actual de producción incluye migración runtime, provenance y smoke, por lo que no debe sustituirse improvisadamente por MCP.

### S02 · Pro con MCP solo lectura
1. Usar MCP para diagnóstico, logs y estado.
2. No intentar escrituras fuera de los permisos disponibles.
3. Usar Actions solo si la ruta única está sana; si falla, pasar a diagnóstico en S07.
4. No saltar directamente a producción por Dashboard/CLI.

### S03 · ChatGPT Free sin escritura MCP acreditada
1. Verificar qué herramientas Git están realmente disponibles en esa sesión.
2. Si hay escritura Git/PR autorizada: crear rama, aplicar cambio, commit y leer de vuelta el SHA; después comprobar preview y checks.
3. Si solo hay lectura: no repetir MCP; usar una herramienta Git con escritura autorizada o interfaz GitHub.
4. Si el cambio solo existe localmente y no hay escritura remota, evaluar RDC según S08.
5. Bloquear producción si el workflow actual falla y no existe una ruta de release equivalente, revisada y autorizada.

### S04 · MCP ausente o plan/cliente sin permiso de escritura
1. Clasificar si es plan, cliente, configuración del workspace o instalación.
2. Si el plan no permite escribir, cambiar de ruta, no reintentar.
3. Diagnosticar desde Dashboard o herramientas autorizadas.
4. Para preview, preferir Git si genera deployment; investigar por qué no lo genera antes de elevar a producción.

### S05 · OAuth o acceso al equipo fallido
1. Inspeccionar el equipo/proyecto en lectura.
2. Corregir consentimiento/autenticación por el flujo oficial; nunca pegar tokens en chat.
3. Confirmar proyecto y repositorio correctos.
4. Reintentar una operación de preview solo después de validar permisos.
5. Si el acceso legítimo no existe, parar o usar una vía autorizada.

### S06 · Timeout tras solicitar un deployment
1. No repetir inmediatamente.
2. Consultar deployments recientes por branch, SHA y timestamp.
3. Si el deployment existe, seguir su estado y revisar logs.
4. Si no se ve, confirmar mediante evidencia que no fue aceptado; un filtro parcial no basta.
5. Reintentar una vez solo después de descartar una ejecución en curso.

### S07 · GitHub Actions fallando o logs inaccesibles
1. No usar workflow_dispatch a ciegas: los runs observados de CI/UI/deploy fallan en segundos.
2. Recuperar el error real desde Actions/Vercel; si la herramienta no devuelve logs, registrar esa limitación y usar una fuente autorizada alternativa.
3. Clasificar con evidencia permisos/secretos, política/límite, YAML/trigger, checkout/ref, dependencia externa o fallo de ejecución.
4. Corregir en una rama y validar.
5. Reprobar la misma ruta en un candidato no productivo si es posible.
6. Solo tras éxito observable usar la ruta rutinariamente.

Estado actual: logs/steps consultados devolvieron respuestas vacías o BlobNotFound; la causa permanece NO DETERMINADA.

### S08 · CLI mediante RDC
Solo si una ruta remota no cubre el objetivo, la CLI local es necesaria y la operación está autorizada.

1. Verificar que la sesión RDC está activa antes de toda acción local. Si no existe, detenerse y solicitar que se inicie mediante el procedimiento vigente de RDC; no fingir conexión.
2. Confirmar repositorio, carpeta del proyecto Vercel, equipo/proyecto, branch/SHA y árbol limpio.
3. Si el candidato solo existe en local, versionarlo en rama autorizada; no publicar archivos divergentes de Git sin excepción explícita.
4. Revalidar main, producción, cuota y workflow.
5. Verificar identidad CLI, proyecto correcto y disponibilidad de Node/npm/CLI sin mostrar secretos.
6. Para preview: ejecutar desde árbol limpio y ref exacto; registrar URL e inspeccionar deployment ID/estado/SHA/logs.
7. Para producción: no ejecutar CLI directa mientras el flujo actual carezca de diagnóstico. El workflow existente corre migración runtime antes del build, estampa provenance y verifica smoke. Un runbook local debe replicar esas condiciones y ser validado antes de uso productivo.
8. Si el runbook no está validado o no hay rollback claro, detenerse.

Éxito requiere ID, SHA, URL, estado final, provenance y smoke; que la CLI no devuelva error no basta. La sesión de esta investigación no ejecutó RDC.

### S09 · Git de Vercel genera preview
1. Publicar un commit en rama autorizada.
2. Consultar el proyecto por branch/SHA.
3. Seguir preview hasta estado final, verificar acceso y ejecutar pruebas.
4. No confundir preview READY con producción.
5. Revisar efectos de merge a main.

El modelo está documentado oficialmente; no se encontró preview de la rama Publicabilidad en el filtro consultado.

### S10 · Git de Vercel no genera preview
1. Confirmar push/ref y filtro por branch/SHA.
2. Revisar conexión del proyecto, rama de producción, root directory, reglas y logs.
3. Distinguir trigger deshabilitado, permisos Git, build fallido, protección preview o filtro de búsqueda.
4. Probar MCP preview por SHA solo si está habilitado.
5. No escalar a producción con causa desconocida.

### S11 · Build fallido o cuota agotada
1. Distinguir error de código/build, rate limit, uso agotado o bloqueo.
2. Consultar Usage y el límite específico.
3. Corregir build o esperar el reset indicado; no repetir deployments por probar.
4. Si hay pausa o elegibilidad no resuelta, bloquear publicación en ese hosting.

### S12 · READY pero dominio/acceso público no funciona
1. Consultar deployment, alias y SHA.
2. Confirmar dominio y protección SSO.
3. Probar el nivel de acceso esperado sin transferir cookies ni enlaces secretos.
4. Reconciliar el smoke: el workflow de producción verifica khora-web.vercel.app, mientras post-deploy-smoke.yml consulta khora-ten.vercel.app.
5. No afirmar acceso público sin comprobación sin sesión.

### S13 · Rollback
1. Identificar deployment actual y anterior sano por ID/SHA.
2. Reconfirmar límites actuales de rollback Hobby.
3. Comprobar migración runtime frente al rollback; revertir código no necesariamente revierte datos.
4. Obtener autorización, usar una sola ruta y verificar SHA, dominio y smoke.
5. Persistir la crónica. No hay rollback probado desde este frente.

### S14 · No hay escritura Git remota; cambio solo en conversación/local
1. Confirmar que no existe commit remoto.
2. Usar herramienta Git autorizada si existe; si no, interfaz GitHub, agente autorizado o equipo local con RDC verificado.
3. No reconstruir un proyecto grande como deployment inline, ni perder historial Git.
4. Con el commit creado, volver al flujo preview/CI.

### S15 · Workflow sano, publicación rutinaria desde main
1. Confirmar candidato aprobado y SHA fijo.
2. Confirmar publicador único y ninguna ejecución concurrente.
3. Ejecutar el flujo con checks, migración si aplica, build, deployment, provenance y smoke.
4. Seguir a estado final y cotejar SHA/ID/URL.
5. Ante fallo pasar a S07/S11, no declarar publicación por la mera existencia del commit.
Estado: objetivo futuro; runs actuales fallan en segundos.

## Hallazgos frescos del ciclo 03 (2026-10-29)

- HEAD observado de main: e463e0c6efa857f4c4229894a96fab747a8a7574.
- Producción: dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, SHA b528660e16552633d232a2397cbe42441a03438c, estado READY. La comparación informa 102 commits de diferencia; no equivale a un candidato aprobado.
- La API reporta protected=false para main. Branch protection y rulesets devolvieron 403; no se afirma la ausencia de otras salvaguardas.
- CI, UI Quality y Deploy to Production fallaron sin runner/steps recuperables; logs devolvieron BlobNotFound. Causa raíz: NO DETERMINADA. El propietario debe revisar runner/billing/permisos/estado de Actions.
- Workflow GitHub invoca migrate-runtime explícitamente; el comando de build Vercel observado también lo contiene. Doble invocación posible, no probada. No se corrieron migraciones.
- Producción smoke usa khora-web.vercel.app y el otro smoke usa khora-ten.vercel.app. Acceso anónimo y Usage siguen sin verificar.
- Vercel MCP permite crear preview/production técnicamente; el permiso de escritura depende de la sesión/cliente. Este ciclo se limitó a lectura.

Bloqueo productivo: no publicar hasta diagnosticar Actions, seleccionar candidato y autoridad, reconciliar migración y URL smoke, comprobar acceso y obtener autorización.

## Orden provisional de fallback

1. Diagnosticar antes de escribir; comprobar si ya existe deployment.
2. Usar ruta remota aprobada que conserve checks; Actions solo cuando esté sana, Git/MCP para preview.
3. Dashboard solo si no omite migración, checks ni provenance.
4. MCP/API de escritura solo si autorizado y habilitado, con SHA explícito, idempotencia, logs y verificación.
5. RDC/CLI solo si es necesario, con conexión activa y runbook fiel.
6. Si ninguna vía cumple requisitos, detenerse y reportar el bloqueo.

## Límites oficiales de Vercel Hobby consultados

Las páginas actuales indican, entre otros, 200 proyectos; 100 deployments/día; máximo 45 minutos de build por deployment; 50 dominios/proyecto; 100 GB Fast Data Transfer; 10 GB Fast Origin Transfer; 1 millón de CDN requests; 4 CPU-hours activos; 360 GB-hours de memoria aprovisionada; 1 millón de invocaciones de funciones; 5.000 transformaciones de imagen; 300.000 lecturas y 100.000 escrituras de caché; 50.000 eventos mensuales de Web Analytics; 50.000 Workflow Events/mes. Generalmente, exceder límites Hobby puede exigir esperar hasta 30 días; deployments tiene cadencia diaria.

Son topes publicados, no consumo restante. La documentación oficial consultada sí lista 32 builds por cada 3.600 segundos, 100 deployments por cada 86.400 segundos, 2.000 deployments creados mediante CLI por semana y 6.000 minutos de ejecución de build incluidos en Hobby; también limita un build individual a 45 minutos. Son límites distintos y no deben confundirse entre sí ni con el consumo restante de la cuenta.

Fuentes:
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits
- https://vercel.com/docs/pricing/manage-and-optimize-usage

## Pendientes para PSP v1.0

- El propietario debe diagnosticar runners/billing/permisos/estado de GitHub Actions y recuperar logs legibles; la causa raíz sigue NO DETERMINADA.
- Confirmar acceso anónimo al dominio y fijar una sola URL smoke.
- Confirmar branch rules/protections desde la interfaz del propietario.
- Comprobar Usage y elegibilidad contractual Hobby.
- Probar preview no productivo con SHA y recibo.
- Verificar capacidades MCP por plan/sesión.
- Reconciliar la posible doble invocación de migración entre workflow y comando de build Vercel; verificar idempotencia/orden antes de publicar.
- Validar runbook CLI/RDC fiel a migración/provenance/smoke, con autorización.
- Medir pasos, tiempo, reintentos, cuota y calidad del recibo.
- Integrar procedimiento final por escenario en el OCP.
