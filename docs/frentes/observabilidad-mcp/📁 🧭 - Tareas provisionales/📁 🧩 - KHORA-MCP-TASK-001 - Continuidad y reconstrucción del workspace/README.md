# 📝 KHORA-MCP-TASK-001 · Continuidad documental y reconstrucción del workspace

**Naturaleza:** OCP provisional de tarea; no es un frente independiente ni una unidad taxonómica canonizada.  
**Estado:** `en_curso`  
**Responsabilidad:** heredada del control `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`, generación 9; titular global `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229` y autoridad arquitectónica modular Jules `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314`; esta tarea no tiene control, titularidad, sesión ni folio propios.  
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
- OCP padre, §§1, 12, 21–23, 26–27; control único vigente, generación 9 (blob `81b7da1282197a967dddf6c241e6ef7e444af2d6`, commit `87fbfdd4ab5f76978f7f016cde9381c274668ece`). La autoridad arquitectónica modular de Jules se mantiene separada de la titularidad global.
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


## Nuevo handshake RDC · 2026-11-01

Los mensajes literales del operador están en [RDC-HANDSHAKE-2026-11-01-150949.md](./originales/RDC-HANDSHAKE-2026-11-01-150949.md). El estado volátil anterior se considera perdido; no se reutilizan procesos, terminales, handles ni variables.

**PC-14:** Online; identidad `PC-14\PC 13`, SID `S-1-5-21-1094932887-1468116028-2730151477-1002`, perfil `C:\Users\PC 13`.

**Checkout previo:** `Desktop\Khora\khora-main` quedó en `feat/custodia-b2-cutover-20261031`, commit `e6c96cbc5c70128380aea0dfddc0835f45b9e0d6`, limpio. Se dejó intacto para evitar colisión con otro frente.

**Checkout dedicado:** `C:\Users\PC 13\Desktop\Khora\khora-mcp-main`; remoto Khora; rama `main`; HEAD inicial y `origin/main` iguales a `5318f6e21bcd7eaf1d6e45754786d5d58f67d94d`; estado limpio. `bridge.mjs` pasa `node --check`; `jules.ps1` y `credential.ps1` pasan el parser PowerShell. `node_modules`, `.env.local` y `.khora-local` están ausentes.

**Bloqueo:** `npm ci` y `npm ci --ignore-scripts` fueron bloqueados antes de ejecutarse. No se eludió el control. Tests, typecheck, UI Review, contrato y build del clon nuevo quedan pendientes. El build de la sesión anterior no tiene resultado final verificable.

**Despliegues:** Production READY en commit `953e69484eabb4e8dc8221d1d8fc188373531bfa`; metadatos OAuth HTTP 200. Preview del puente READY pero sin variables de Preview para esa rama. No copiar secretos productivos.

**Estado:** `en_curso`. Sin consentimiento OAuth, DPAPI ni llamadas Jules autenticadas.


## Persistencia documental adicional · 2026-11-01

Se preservó el original `ChatGPT-Khora MCP-20261101-1912.md` desde el equipo RDC `015RENTA01`, ruta `C:\\Users\\PC\\Downloads\\ChatGPT-Khora MCP-20261101-1912.md`, en [historial del OCP](../../historial/ChatGPT-Khora%20MCP-20261101-1912.md).

- Tamaño original: **191,165 bytes**; **3,995 líneas**.
- SHA-256: `AF046FD336273BC6235050388764F4012C4EC30B1CD48FC233F1CECE46770519`.
- Commit de persistencia: `60de4a1f68ad9543ef010dc44f51d5fc6434d6f2`; Git blob read-back: `1985f4a421af709b297af6bcac99fd871977cd16`.
- Se releyó desde `main` y se cotejó igualdad textual exacta, tamaño y líneas. Estado: **PERSISTIDO_Y_VERIFICADO**.
- Manifiesto: [MANIFIESTO-DOCUMENTAL.json](../../documentos/MANIFIESTO-DOCUMENTAL.json).

El control fue transferido y verificado en generación 9 a `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229`; Jules conserva la corresponsabilidad arquitectónica modular. Se preservó el titular saliente y su historial. La TASK-001 sigue `en_curso`; checkout, pruebas del puente, consentimiento OAuth y aceptación E2E no quedan resueltos por esta transferencia.


## Transferencia de titularidad global verificada · 2026-11-01

- Evento: `KHORA-MCP-TRANSFER-20261101-278FF01D`; `TRANSFER_RESPONSIBILITY` de generación 8 a 9.
- Titular global vigente: `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229` (UUIDv7 local; `owner_thread=null`).
- Jules permanece como autoridad arquitectónica modular: `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314`.
- Control leído de vuelta: blob `81b7da1282197a967dddf6c241e6ef7e444af2d6`; commit `87fbfdd4ab5f76978f7f016cde9381c274668ece`.
- Exactamente dos responsables activos; `session_folio=null`; FOL1 PREPARADO, NO ACTIVO.

La tarea no cambia de alcance ni se cierra por esta transferencia. Continúan pendientes la reconstrucción/validación del checkout, instalación de dependencias permitidas, pruebas pertinentes del puente, consentimiento OAuth en el perfil actual y aceptación E2E autorizada de Jules.
