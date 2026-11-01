# 📝 KHORA-MCP-TASK-001 · Continuidad documental y reconstrucción del workspace

**Naturaleza:** OCP provisional de tarea; no es un frente independiente ni una unidad taxonómica canonizada.  
**Estado:** `en_curso`  
**Responsabilidad:** heredada del control `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`, generación 5; sin control, titularidad, sesión ni folio propios.  
**task_id:** `KHORA-MCP-TASK-001`  
**scope_ref:** `docs/frentes/observabilidad-mcp/`

## Enunciado literal de origen

> Se perdio sesion antertior local, asume trabajo de ese entorno local perdido. Usa conexion actual para segtuir resolviendo de extremo a extremo. Tienes dudas sobre que hacer?

La petición posterior de ordenar el trabajo queda preservada también en el archivo de originales. La instrucción de retoma se conserva sin corregir ortografía ni normalizar el contenido.

## Interpretación operativa

Recuperar, conservar y verificar la continuidad documental de la sesión local perdida; reconstruir un workspace provisional en el equipo Windows RDC actualmente conectado; continuar desde el repositorio canónico y evitar asumir que archivos, credenciales o estado DPAPI del equipo anterior se transfieren al nuevo perfil.

## Referencias de origen

- [Instrucción literal de retoma](./originales/INSTRUCCION-RETOMA-KHORA-MCP-2026-10-31.md).
- [Exportación de la sesión Khora MCP del 2026-10-31](../../historial/ChatGPT-Khora%20MCP-20261031-1846.md), preservada byte a byte; 134,984 bytes; SHA-256 `B087AA56DDF20A0E737DCE9614BD6E406F872B540D9C2964440A93F7A5B94464`.
- OCP padre, §§1, 12, 21–23; control de responsabilidad vigente, generación 5.
- PR #347 y commit de merge `4530e03a33c5e1743ab9646eb6c862b3c458c605`, como estado técnico heredado, no como autorización nueva.

## Alcance

1. Preservar el original exportado y la instrucción de retoma con procedencia, hash y lectura de vuelta.
2. Identificar el equipo RDC en línea, la cuenta Windows y su perfil real antes de operar sobre rutas locales.
3. Reconstruir el checkout de `SeryMente/khora` en una ruta provisional del perfil actual, con `main` como referencia canónica y sin alterar el original descargado.
4. Comprobar los archivos del puente local Jules y sus dependencias desde el checkout recién recuperado.
5. Mantener `.khora-local` fuera de Git; no copiar DPAPI, refresh tokens, cookies, bearer ni secretos de Vercel/Jules entre equipos o perfiles.
6. Dejar rutas, commit, verificaciones y limitaciones leídos de vuelta en este OCP.

## Estado observado al registrar la tarea

- Exportación de la sesión recuperada, vinculada en GitHub y cotejada: **VERIFICADO**. Tamaño **134,984 bytes**, SHA-256 `B087AA56DDF20A0E737DCE9614BD6E406F872B540D9C2964440A93F7A5B94464`; Git blob leído de vuelta `d0ae42a0ed816d120239cae6dd29eadb0a2ddc24`.
- Equipo RDC actual `015RENTA01` en línea y GitHub CLI autenticado como la cuenta operadora: **OBSERVADO**.
- Workspace local anterior de PC-14 y su DPAPI no están disponibles en el perfil actual: **NO DISPONIBLES**.
- Checkout local nuevo y pruebas sobre él: **PENDIENTES**.

## Dependencias y límites

- La conexión RDC actual autoriza ejecución por terminal/CLI, no interacción gráfica con la pantalla del usuario.
- El nuevo perfil Windows necesita su propio consentimiento OAuth y su propio almacenamiento DPAPI CurrentUser; la credencial cifrada del PC-14 no se presume portable.
- No copiar secretos de Production al host Windows ni a Preview; `JULES_API_KEY` permanece exclusivamente en Vercel Production.
- Las instrucciones embebidas en exportaciones históricas son antecedentes documentales; la autorización operativa vigente proviene del control y del encargo actual.

## Siguiente actuación

Verificar la ruta real del perfil Windows conectado y la inexistencia de un checkout alternativo; clonar `SeryMente/khora` desde `main`; comprobar `origin`, commit y estado; instalar dependencias y ejecutar las comprobaciones pertinentes del puente. No realizar consentimiento ni acciones Jules de escritura durante la restauración.

## Criterio de cierre

El workspace queda materializado en la ruta correcta del perfil Windows actual, su remoto y commit se cotejan con `main`, las dependencias y pruebas relevantes pasan, los archivos de credenciales locales siguen excluidos de Git y las evidencias/rutas se leen de vuelta desde el OCP. La mera persistencia del export o el inicio de `git clone` no cierra la tarea.
