# Protocolo de Publicación · KHORA main → Vercel Production desde ChatGPT

**ID:** PSP-KHORA-MAIN-CHATGPT-001  
**Versión:** 1.0 · escenario ordinario  
**Estado:** procedimiento documentado; la primera invocación con target Production sigue pendiente de autorización y ejecución real.  
**Alcance:** un main ya integrado por decisión del operador; publicación directa a la URL canónica https://khora-web.vercel.app/.

## 1. Disparador

El procedimiento comienza cuando el operador solicita expresamente publicar el main actual de KHORA en producción, por ejemplo:

> Publica el main actual de KHORA directamente en producción.

Una petición de inspección, diagnóstico, preparación o documentación no dispara un deployment. Antes del disparador, ChatGPT puede inspeccionar GitHub y Vercel, pero no crear el deployment productivo.

El operador decide qué PRs y cambios llegan a main. Este protocolo no impone conteo de commits, antigüedad del último deployment ni revisión del delta como condición de publicación.

## 2. Destino fijo

Revalidar estos valores en cada ejecución; no seleccionar por nombre aproximado ni usar un proyecto alternativo:

| Campo | Valor |
|---|---|
| GitHub repo | SeryMente/khora |
| Git ref | main |
| Vercel team ID | team_QBa5UlffJWznZ8ogFfKjaGQb |
| Vercel project | khora-web |
| Project ID | prj_hRN86BKITXYKTnNlp0ygVhaMwFfx |
| Target | production |
| Dominio | https://khora-web.vercel.app/ |

El proyecto usa Next.js y Node 24.x según la última lectura. No pasar projectSettings ni cambiar el runtime: el deployment debe heredar la configuración de khora-web.

## 3. Camino único cotidiano

### Paso A — fijar el candidato

1. Leer refs/heads/main desde GitHub.
2. Registrar el SHA completo de 40 caracteres, el mensaje y la hora de lectura.
3. Confirmar que pertenece a SeryMente/khora y que el ref es exactamente main.
4. No usar el SHA de una conversación anterior ni el SHA del último deployment.

El SHA es el identificador inmutable del candidato. No se compara la cantidad de commits ni se exige que el delta sea pequeño.

### Paso B — validar el destino y evitar duplicados

1. Consultar el contexto Git/Vercel y el proyecto por ID bajo el team fijado.
2. Confirmar que el repo enlazado es SeryMente/khora, el proyecto es khora-web y el dominio canónico sigue asociado y verificado.
3. Consultar GitHub Actions para el SHA candidato y localizar .github/workflows/deploy-production.yml.
4. Consultar deployments del proyecto, filtrando target=production y el SHA candidato.

Aplicar la siguiente decisión:

| Situación para el SHA fijado | Acción |
|---|---|
| Ya existe deployment READY, target=production, SHA exacto y alias canónico | Declarar ya publicado; no crear otro |
| Existe deployment QUEUED, INITIALIZING o BUILDING | Esperar y seguir ese deployment; no duplicar |
| Workflow Deploy to Production está queued o in_progress | No competir; observar el workflow y después cotejar Vercel |
| Workflow terminó correctamente y hay deployment del SHA | Verificarlo; no crear otro |
| Workflow falló antes de ejecutar steps y no hay deployment para ese SHA | Continuar por el conector Vercel de ChatGPT |
| Workflow falló después de iniciar build/migración, o el resultado es ambiguo | Detenerse; inspeccionar jobs, deployments y logs antes de decidir |
| No hay workflow activo ni deployment para el SHA | Continuar por el conector Vercel de ChatGPT |

Un estado failure no prueba por sí solo que no se haya publicado: debe cotejarse con deployments y pasos/logs. En main, los runs CI #40959059770, UI Quality #40959059776 y Deploy to Production #40959059940 concluyeron en failure; las seis jobs consultadas devolvieron steps=[] (ningún step ejecutado). Esto acredita que esos jobs no ejecutaron su secuencia; la causa raíz del runner sigue sin demostrarse.

### Paso C — última lectura de main

Inmediatamente antes de crear el deployment, volver a leer el SHA de main. Si cambió respecto del candidato fijado, descartar la lectura previa y reiniciar el preflight con el SHA nuevo. No desplegar silenciosamente un main distinto del que se verificó.

### Paso D — crear directamente Production desde el SHA

Usar el conector Vercel de esta conversación, autenticado mediante OAuth. La conexión Git se resuelve del lado del servicio; no copiar ni solicitar VERCEL_TOKEN, credenciales Git o archivos .env.

La llamada debe equivaler a este payload (el SHA es el valor dinámico fijado en los pasos A/C):

    {
      "teamId": "team_QBa5UlffJWznZ8ogFfKjaGQb",
      "requestBody": {
        "name": "khora-web",
        "project": "prj_hRN86BKITXYKTnNlp0ygVhaMwFfx",
        "target": "production",
        "gitSource": {
          "type": "github",
          "org": "SeryMente",
          "repo": "khora",
          "ref": "main",
          "sha": "<SHA completo fijado>"
        }
      }
    }

**Invariante crítica:** target debe ser exactamente production. Omitirlo crea Preview; no usar Preview + Promote, staging, alias manual, Deploy Hook, CLI, RDC o Work. No usar forceNew por defecto. No enviar archivos ni reconstruir el repositorio como source inline. No redefinir projectSettings.

La herramienta concreta en la sesión es mcp__Vercel__create_deployment. Su respuesta inicial es asíncrona y no representa el éxito final.

### Paso E — esperar y validar el deployment

Consultar mcp__Vercel__get_deployment hasta estado terminal. Para aceptar el resultado tienen que coincidir todos estos elementos:

- state/readyState = READY.
- target = production.
- Repo metadata: SeryMente/khora.
- githubCommitRef = main.
- githubCommitSha = SHA fijado.
- El alias asignado contiene khora-web.vercel.app.
- No hay aliasError.

Leer eventos del build con mcp__Vercel__list_deployment_events. El resultado READY sin cotejo de SHA y alias no se declara como publicación completa.

### Paso F — smoke y cierre

1. Consultar https://khora-web.vercel.app/ mediante la herramienta autorizada de lectura de deployment y comprobar respuesta HTTP y contenido de la aplicación.
2. Revisar eventos del build por errores.
3. Consultar logs de runtime de producción asociados al deployment en una ventana posterior al release; distinguir errores nuevos de advertencias o ruido histórico.
4. Conservar deployment ID, SHA, URL única, alias canónico, target, hora, estado, comprobaciones y cualquier advertencia.
5. Reportar PUBLICADO solo si el SHA exacto está en READY/Production, el alias canónico está asignado y el smoke respondió como se esperaba.

La protección SSO del proyecto se observó como all_except_custom_domains. Una lectura autenticada o mediante enlace temporal de Vercel no demuestra acceso anónimo. No quitar SSO ni cambiar el dominio desde este protocolo.

## 4. Particularidad que afecta todos los builds de producción

En el último build productivo inspeccionado, el Build Command de Vercel fue:

    if [ "$VERCEL_ENV" = "production" ]; then node scripts/migrate-runtime.mjs; fi && next build --webpack

El script khora-web/scripts/migrate-runtime.mjs exige DATABASE_URL y ejecuta las migraciones de runtime incluidas en el repositorio. Así, crear un deployment con target=production puede aplicar migraciones antes de que Next termine de compilar.

- No ejecutar migrate-runtime.mjs manualmente como paso adicional.
- Si el build falla, inspeccionar en qué punto falló y si las migraciones concluyeron antes de reintentar.
- El workflow existente .github/workflows/deploy-production.yml invoca además el script de migración explícitamente antes de vercel build --prod; si Actions vuelve a funcionar, este orden puede duplicar la llamada del Build Command.
- El build command observado invoca next build --webpack directamente. No ejecuta npm run build ni su lifecycle prebuild; por ello no declara PASS de typecheck, UI Review, contrato UI, unit tests, E2E, API ni Python/Neo4j.

La publicación prueba que Vercel pudo construir el artefacto y asignarlo a producción; no sustituye todas las suites de CI.

## 5. Condiciones de parada y fallback

| Bloqueo | Respuesta segura |
|---|---|
| MCP Vercel desconectado, OAuth vencido o permiso denegado | Detener; restablecer la conexión autorizada. No pedir/mostrar tokens ni pasar a CLI/RDC por defecto |
| Hobby/GitHub rechaza repo privado o autoría | Guardar error exacto y detener; no cambiar plan, visibilidad, autoría ni propiedad sin decisión del operador |
| Timeout tras crear deployment | Consultar por SHA y ventana temporal antes de repetir; no asumir que la solicitud falló |
| Deployment activo | Esperar; no iniciar otro |
| Build ERROR | Leer eventos y revisar si llegó a ejecutar migraciones; no reintentar automáticamente |
| READY pero SHA/target/repositorio no coinciden | No declarar publicado; detenerse |
| READY sin alias canónico | No asignar dominio manualmente; inspeccionar alias/domain status y detenerse |
| Smoke 401/403 o página SSO | Separar protección de acceso del estado del build; no cambiar SSO en automático |
| Límite de cuota/rate limit | Detener y consultar Usage/limits; no repetir llamadas |
| Actions completa correctamente en el mismo SHA | Verificar el deployment ya creado; no lanzar MCP paralelo |

No se ejecutan reintentos ciegos, migraciones manuales, cambios de facturación, secrets, environment variables, dominio, protección SSO o workflows.

## 6. Evidencia y alcance de la validación actual

- Repositorio y project IDs se leyeron de los conectores GitHub/Vercel.
- El último deployment productivo conocido es dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH (SHA histórico b528660e16552633d232a2397cbe42441a03438c).
- La creación desde Git source privado de GitHub y build remoto por Vercel MCP se probó en Preview con SHA exacto. Esto prueba lectura/build de fuente remota, no el camino de producción.
- La primera llamada con target=production sigue pendiente. Esta operación altera el deployment servido por el dominio canónico y exige una solicitud expresa del operador en el ciclo de publicación.
- Vercel documenta MCP como compatible con ChatGPT; la conexión y la capacidad de escritura deben revalidarse en la sesión concreta. El hecho de que una sesión anterior dispusiera de la herramienta no garantiza futuras conexiones o permisos.

## 7. Referencias oficiales

- [Vercel MCP — integración y clientes admitidos](https://vercel.com/docs/agent-resources/vercel-mcp)
- [Despliegues desde referencias Git y SHA](https://vercel.com/docs/git)
- [Métodos de despliegue](https://vercel.com/docs/deployments)
- [Restricción Hobby para repositorios privados de organizaciones](https://vercel.com/docs/deployments/troubleshoot-project-collaboration)
- [Límites Vercel](https://vercel.com/docs/limits)
