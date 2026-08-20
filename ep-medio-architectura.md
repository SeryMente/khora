# Entorno Persistente Medio · Arquitectura canónica v1.0.0

**Estado:** normativa · restauración inaugural 1.0.0
**Host KHORA:** 7.3.0
**Repositorio:** `SeryMente/khora`, tratado como privado
**Punto de entrada único:** `scripts/khora/khora.ps1`
**Firma de instrucción:** NX-326m

Este documento es la única especificación normativa del subsistema **Entorno Persistente Medio**. Un modelo de inteligencia artificial con acceso autorizado debe leerlo antes de instanciar, analizar, modificar o referenciar el subsistema. `EP-ARCHITECTURE.md` existe únicamente como redirección de compatibilidad.

## 1. Precedencia y alcance

La prioridad es, sin excepción:

1. invariantes no negociables y confidencialidad;
2. verificabilidad, persistencia del registro y limpieza;
3. eficiencia de arranque compatible con 1 y 2;
4. comodidad y decisiones inferiores.

La decisión posterior de privatizar el sistema sustituye el requisito anterior de publicación anónima. La arquitectura sigue siendo central y referenciable, pero se accede mediante un **Personal Access Token de GitHub** con permiso sobre el repositorio privado. El instanciador y las bitácoras se sirven por Khora tras autenticación.

## 2. Resultados obligatorios

Una sesión válida cumple simultáneamente:

- parte de una computadora Windows distinta o pública;
- descubre dinámicamente el Escritorio del usuario interactivo;
- crea en el Escritorio una carpeta efímera que contiene solamente un archivo de **Disco Duro Virtual versión 2** y metadatos mínimos de limpieza no sensibles;
- cifra el Disco Duro Virtual versión 2 con BitLocker, XTS-AES-256 y cifrado de espacio utilizado;
- deriva el secreto de desbloqueo de la misma llave de la bóveda recibida al inicio;
- coloca dentro del volumen cifrado el clon, Visual Studio Code, perfiles, dependencias, cachés, variables, registros locales y temporales;
- ejecuta el orden interno **llave de bóveda → GitHub → Vercel → Visual Studio Code → importación completa de bóveda**;
- mantiene una bitácora remota persistente y encadenada por hash;
- presenta identificadores estables en la interfaz y en el registro técnico;
- conserva continuidad mediante rama remota `ep-wip/*` y perfil cifrado;
- limpia por finalización manual, cierre de Visual Studio Code, muerte de la terminal lanzadora o supervisor, mecanismo de hombre muerto, inactividad o reinicio, lo que ocurra primero;
- publica en `EP-IN-080` el SHA exacto de `main` como producción y verifica el alias canónico antes de continuar;
- nunca continúa sin cifrado, sin registro remoto crítico o sin limpieza al reinicio.

## 3. Modelo de acceso privado

### 3.1 Credenciales distintas

| Credencial | Emisor | Alcance | Vida | Persistencia permitida |
|---|---|---|---|---|
| Token Khora de sesión | Khora, después de Google OpenID Connect | descargar el gate y leer/escribir bitácoras de la sesión actual o anterior | una sola sesión; 12 horas por defecto, máximo 24 | hash de `jti` en servidor; texto plano solo en memoria y blobs de protección de datos dentro del volumen |
| Llave de bóveda | usuario | raíz criptográfica de la bóveda, BitLocker y perfil de Visual Studio Code | sesión | `SecureString` y Protección de Datos de Windows dentro del volumen |
| Personal Access Token de GitHub | GitHub | leer/escribir `SeryMente/khora` privado | definido por GitHub | memoria y Protección de Datos de Windows dentro del volumen |
| `VERCEL_TOKEN` | bóveda | `vercel whoami` y `vercel link` | sesión | variable de proceso dentro del volumen; nunca argumentos de proceso |

El token Khora no sustituye el Personal Access Token de GitHub ni la llave de la bóveda. Su paso ocurre **antes de la instanciación** y, por ello, no altera el orden interno no negociable.

### 3.2 Emisión por Google OpenID Connect y Sección Seguridad

1. El usuario navega a la sección principal **Seguridad** (`/sistema/seguridad`) o mediante la redirección HTTP 308 desde `/sistema/entorno-persistente` hacia `/sistema/seguridad#entorno-persistente`.
2. Auth.js valida la sesión mediante el proveedor configurado por `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID` y `OIDC_CLIENT_SECRET`.
3. El proveedor valida firma, emisor y reclamación de audiencia (`aud`) de Google.
4. Khora compara el correo con `EP_ALLOWED_EMAIL` y falla cerrado si no coincide.
5. `POST /api/ep/token` acepta el parámetro opcional de plataforma (`{ "platform": "windows" }`, por defecto `"windows"` si se omite). Plataformas no soportadas como `"linux"` o `"macos"` devuelven HTTP 400 con `unsupported_platform`.
6. Se aplica un límite de tasa en base de datos (`ep_bootstrap_tokens`): máximo 5 emisiones por usuario cada 15 minutos (HTTP 429 `rate_limit_exceeded`).
7. `POST /api/ep/token` crea un identificador de sesión y emite un JSON Web Token HMAC-SHA256 con:
   - `iss = khora-ep`;
   - `aud = EP_CANONICAL_URL`;
   - `sub = correo autenticado`;
   - `sid = identificador de sesión`;
   - `scope = ep:bootstrap ep:logs:write ep:logs:read`;
   - `jti`, `iat`, `exp` y `typ = ep-session`.
8. Devuelve además el descriptor del lanzador (`launcher`: id, platform, shell, minimumVersion, storageBackend, status, command) e incluye los encabezados `Cache-Control: no-store` y `Pragma: no-cache`.
9. Emitir un token nuevo revoca cualquier token de Entorno Persistente todavía activo del mismo usuario. Por eso se requiere una generación nueva por sesión.
10. El servidor guarda únicamente SHA-256 de `jti`; el token completo se muestra una sola vez.

Variables de producción obligatorias:

- `EP_BOOTSTRAP_JWT_SECRET`, aleatorio y de al menos 32 caracteres;
- `EP_CANONICAL_URL`, por ejemplo `https://khora.example/api/ep`;
- `EP_ALLOWED_EMAIL`;
- `DATABASE_URL`;
- `AUTH_SECRET`;
- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID` y `OIDC_CLIENT_SECRET`.

La migración requerida es `khora-web/db/migrations/016_ep_persistent_sessions.sql` y se aplica con `npm run migrate:ep`.

### 3.3 Publicación obligatoria de `main` al instanciar

Después de autenticar GitHub y antes de abrir Visual Studio Code, `EP-IN-080` debe:

1. confirmar que `origin/main` sigue siendo el SHA fijado en `EP-IN-060`;
2. autorizar y enlazar el proyecto Vercel sin persistir el token fuera del volumen cifrado;
3. exportar el SHA mediante `git archive`, añadir únicamente la prueba de procedencia y ejecutar `vercel deploy --prod` desde ese árbol desechable;
4. insertar en el artefacto estático `ep-main-live.json` con rama, SHA y hora UTC;
5. consultar el alias canónico hasta que devuelva exactamente el SHA publicado;
6. fallar cerrado si `main` cambia durante la secuencia o si el alias no acredita el SHA;
7. eliminar el archivo local de variables descargado por Vercel y solo entonces restaurar la rama `ep-wip/*`.

Esta publicación es parte constitutiva de la instanciación, no una acción opcional ni un despliegue del trabajo WIP.

### 3.3 Comando sin secreto en el historial

La página entrega primero un comando fijo y después el token. El usuario:

1. copia y pega el comando en PowerShell sin ejecutarlo;
2. copia el token Khora;
3. vuelve a PowerShell y presiona Enter.

El comando lee el token desde el portapapeles, borra el portapapeles, descarga `GET /api/ep/bootstrap` con `Authorization: Bearer`, ejecuta el gate en memoria y elimina sus variables. El token no aparece como texto en el historial de la terminal.

### 3.4 Acceso de modelos

Un modelo autorizado puede:

- usar un Personal Access Token de GitHub para leer el repositorio privado y este documento;
- usar el token Khora de la sesión para consultar:
  - `GET /api/ep/logs?which=current`;
  - `GET /api/ep/logs?which=last`;
  - añadir `format=ndjson` para JSON delimitado por saltos de línea.

Ningún endpoint acepta acceso anónimo. El token solo puede leer sesiones cuyo `usuario` coincide con su `sub`.

## 4. Bitácora persistente resistente a fallos

### 4.1 Dos registros complementarios

1. **Registro local técnico:** `logs/events.log` y `logs/events.jsonl` dentro del volumen cifrado. Alimenta la ventana Registro y puede ser tan detallado como sea útil.
2. **Libro mayor remoto:** tablas `ep_sessions`, `ep_bootstrap_tokens` y `ep_events` en la base de Khora. Sobrevive cierre abrupto, muerte de procesos, falta de finalización manual, eliminación local y reinicio.

Antes de ejecutar una etapa crítica, el cliente confirma remotamente su evento `START`. Al terminar confirma `OK` o `FAIL`. Si la máquina desaparece durante la acción, el último `START` sin estado terminal identifica de manera inequívoca el punto de interrupción. Si el servidor de bitácora no confirma una etapa crítica después de tres intentos, la secuencia falla cerrada.

### 4.2 Integridad

Cada sesión conserva `siguiente_secuencia` y `ultimo_hash`. El servidor toma un bloqueo transaccional por sesión y calcula:

`event_hash = SHA-256(hash_anterior || representación_canónica_del_evento)`

Cada fila almacena `hash_anterior` y `event_hash`; `(session_id, secuencia)` es único. Esto detecta supresión, reordenamiento o modificación posterior. El reloj de servidor es autoritativo; el reloj de cliente es informativo.

### 4.3 Sanitización

Cliente y servidor redactan Personal Access Tokens, tokens Khora, tokens Vercel y encabezados Bearer. No se transmiten valores de variables, contenido de la bóveda, portapapeles, archivos de usuario ni argumentos que contengan secretos. Los mensajes se limitan a 4 000 caracteres y el detalle estructurado a 16 000.

## 5. Identificadores estables de secuencia

Los identificadores son API de observabilidad. **Nunca se renumeran ni reutilizan.** Nuevas etapas ocupan huecos o números posteriores. Los subeventos heredan el identificador de su etapa padre.

Formato visible amigable:

- `› [EP-IN-080] Autorizando Vercel y publicando main…`
- `✓ [EP-IN-080] main está live y verificado · 3.2 s`
- `! [EP-IN-080] No se pudo completar. Reporta EP-IN-080.`

Formato técnico:

`2026-08-20T16:30:00.000Z [EP-IN-080][FAIL] ... durationMs=3200`

### 5.1 Instanciación

| ID | Elemento | Criterio de salida |
|---|---|---|
| `EP-IN-010` | Windows, elevación y Escritorio | Windows, administrador, funciones requeridas y Escritorio resuelto |
| `EP-IN-020` | llave de bóveda | `SecureString` no vacío aceptado |
| `EP-IN-030` | volumen cifrado | BitLocker `ProtectionStatus=On` y `EncryptionPercentage=100` |
| `EP-IN-040` | limpieza al reinicio | tarea `AtStartup`, `SYSTEM`, privilegio máximo registrada |
| `EP-IN-050` | GitHub | Personal Access Token identifica usuario y permite escritura al repositorio privado |
| `EP-IN-060` | commit exacto | archivo `zipball/{sha}` autenticado, extraído dentro del volumen |
| `EP-IN-070` | GitHub y main exacto | Git, GitHub CLI, `fetch`, autenticación y SHA de `main` verificados |
| `EP-IN-080` | Vercel y main live | `VERCEL_TOKEN`, `whoami`, `link`, build y despliegue del SHA exacto; el alias canónico devuelve `ep-main-live.json` con ese SHA; después se restaura `ep-wip/*` |
| `EP-IN-090` | Visual Studio Code | distribución portátil verificada, perfil restaurado y proceso iniciado |
| `EP-IN-100` | bóveda completa | variables de la bóveda importadas solo al proceso supervisor |
| `EP-IN-110` | dependencias | Python, Node.js y gestores hidratándose dentro del volumen |
| `EP-IN-120` | vigilancia | Guardian, salida manual, inactividad y vigilancia de procesos activas |
| `EP-IN-130` | operativo | dependencias listas, cifrado vigente y superficies visibles correctas |

### 5.2 Ejecución

| ID | Elemento |
|---|---|
| `EP-RUN-010` | commit y push WIP periódico verificado por SHA |
| `EP-RUN-020` | latido de supervisor o Guardian |
| `EP-RUN-030` | solicitud de cierre o disparo de hombre muerto |

### 5.3 Salida

| ID | Elemento |
|---|---|
| `EP-OUT-010` | aceptar motivo de cierre |
| `EP-OUT-020` | detener Visual Studio Code y procesos del volumen |
| `EP-OUT-030` | exportar y cifrar perfil de Visual Studio Code |
| `EP-OUT-040` | commit, push y verificación remota por SHA |
| `EP-OUT-050` | purgar variables, Personal Access Token y llave de trabajo |
| `EP-OUT-060` | bloquear BitLocker |
| `EP-OUT-070` | desmontar Disco Duro Virtual versión 2 |
| `EP-OUT-080` | eliminar contenedor y carpeta del Escritorio |
| `EP-OUT-090` | desregistrar tarea de reinicio |
| `EP-OUT-100` | confirmar cierre remoto y purgar token Khora |

## 6. Superficies visibles

La terminal usada para lanzar no cuenta como ventana adicional. Se permiten exactamente dos superficies adicionales del subsistema:

1. **Interfaz:** durante el arranque es la consola amigable de etapas. Cuando Visual Studio Code está listo, la consola se oculta y Visual Studio Code la reemplaza como interfaz principal, mostrando `KHORA-STATUS.md` y la sesión restaurada.
2. **Registro:** una consola dedicada exclusivamente a seguir `events.log`; no acepta comandos operativos.

La interfaz usa lenguaje breve, indicadores y duraciones. La ventana Registro conserva diagnóstico detallado. Ambas muestran el mismo identificador. El texto de error siempre explica qué identificador reportar.

## 7. Cifrado y espacio de trabajo

### 7.1 Construcción

- carpeta exterior: `<Escritorio>\KHORA-EP-<session-id>`;
- contenedor: `khora-ep-medio.vhdx`, dinámico, máximo lógico 65 536 MB;
- letra: primera libre de `Z:` a `R:`;
- etiqueta: `KHORA_EP_V1`;
- sistema de archivos: NTFS;
- BitLocker: XTS-AES-256, `UsedSpaceOnly`, protector de contraseña;
- secreto BitLocker: SHA-256 de `llave_de_bóveda || KHORA-EP-V1 || session-id`.

La derivación hace que la llave de la bóveda sea la raíz de acceso y genera una contraseña compatible con políticas de BitLocker. El texto de la llave no se escribe en disco.

No existe alternativa con Encrypting File System. Si falta BitLocker, elevación, tarea al reinicio o verificación al 100 %, no se descarga el repositorio.

### 7.2 Contenido interno

`<unidad>\khora-ep` contiene:

- `repo\` — commit privado exacto y rama de continuidad;
- `tools\` — Git, GitHub CLI, Node.js, Python, Vercel CLI y Visual Studio Code portátiles cuando faltan versiones aceptables del host;
- `session-state\` — manifiesto y blobs de Protección de Datos de Windows;
- `logs\` — registro local;
- `cache\`, `tmp\`, `venv\` y perfil portátil.

`TEMP`, `TMP`, `GH_CONFIG_DIR`, `GIT_CONFIG_GLOBAL`, `NPM_CONFIG_CACHE`, `PIP_CACHE_DIR`, `XDG_CONFIG_HOME` y `XDG_DATA_HOME` apuntan al volumen.

### 7.3 Límite de amenaza viva

Exfiltrar la carpeta exterior o el Disco Duro Virtual versión 2 produce ciphertext inútil sin la llave. Ningún diseño puede impedir que malware con privilegios equivalentes lea el volumen mientras está montado para Visual Studio Code. La v1.0 protege datos en reposo, copias físicas y residuos; no afirma aislamiento frente a un sistema operativo host ya comprometido.

## 8. Eficiencia de arranque

La seguridad define las compuertas; el paralelismo empieza después de ellas:

1. BitLocker usa Disco Duro Virtual versión 2 dinámico y cifrado de espacio utilizado.
2. Tras `EP-IN-050`, se precargan en paralelo Visual Studio Code, Python, Node.js, Git y GitHub CLI que falten.
3. Herramientas existentes se reutilizan solo si cumplen versión/firma y toda su configuración puede redirigirse al volumen.
4. Visual Studio Code se abre en `EP-IN-090`; Python y Node.js se hidratan paralelamente antes de declarar `EP-IN-130`.
5. No se ejecutan durante arranque: navegador, Docker, Render, pruebas completas ni servidores de desarrollo. La excepción obligatoria es el despliegue remoto de producción del árbol limpio de `main` en `EP-IN-080`.
6. Cada etapa registra `durationMs`; la optimización se basa en medición Windows real y no en tiempos inventados.

## 9. Visual Studio Code y continuidad

- se usa la distribución ZIP oficial en modo portátil;
- `data\user-data`, `data\extensions` y `data\tmp` quedan dentro del volumen;
- `ep-state/vscode-profile.v1.enc` usa AES-256-CBC, HMAC-SHA256, sal aleatoria y PBKDF2-SHA256 con 200 000 iteraciones;
- se persiste `user-data` y la lista de extensiones; los binarios se reinstalan;
- Python, Node.js, entornos virtuales y dependencias se reconstruyen;
- la tarea `KHORA: Finalizar sesion` escribe `cleanup.request`; nunca inicia un proceso sin secretos;
- el autosave evita `git add -A` y excluye `.env`, tokens, logs y estado de sesión;
- un push cuenta como exitoso solo si `git ls-remote` devuelve el mismo SHA local.

## 10. Cierre y fallos

Guardian vigila:

- proceso de la terminal lanzadora;
- proceso de Visual Studio Code;
- `cleanup.request`;
- inactividad configurable, 15 minutos por defecto;
- latido del supervisor.

Los blobs Guardian están cifrados mediante Protección de Datos de Windows y residen dentro de BitLocker. Permiten concluir registro y continuidad si el supervisor muere. Ante conflicto, la confidencialidad gana: aun si falla `EP-OUT-030` o `EP-OUT-040`, se ejecutan bloqueo, desmontaje y eliminación. La bitácora remota conserva el fallo y la posible pérdida de continuidad.

La tarea de arranque como `SYSTEM` elimina la carpeta exterior tras un reinicio inesperado. No deja cuarentena local.

## 11. API de Khora

| Método y ruta | Autenticación | Resultado |
|---|---|---|
| `POST /api/ep/token` | sesión Google OpenID Connect | token, identificador, vencimiento y comando |
| `GET /api/ep/token` | sesión Google OpenID Connect | dos sesiones más recientes |
| `GET /api/ep/bootstrap` | Bearer `ep:bootstrap` | gate PowerShell exacto, sin caché |
| `POST /api/ep/events` | Bearer `ep:logs:write` | uno a cien eventos transaccionales |
| `GET /api/ep/logs` | Bearer `ep:logs:read` | sesión actual o anterior, JSON o NDJSON |

Los endpoints Bearer están excluidos del middleware de cookies, pero validan firma, emisor, audiencia, scopes, expiración, revocación, sesión y usuario en su propia ruta. `/api/ep/token` continúa protegido por Auth.js.

## 12. Manifiesto y contrato de archivos

- `scripts/khora/khora.ps1` — gate y único punto de entrada;
- `scripts/khora/khora.barrel.ps1` — orden contractual de módulos;
- `scripts/khora/modules/00..15,90` — componentes;
- `scripts/khora/env-vault.ps1` — bóveda y cifrado de perfil;
- `scripts/khora/llave/ARRANCAR.cmd` — entrada local de mantenimiento;
- `khora-web/lib/server/ep.ts` — tokens, autorización, bitácora y consulta;
- `khora-web/app/api/ep/*` — API;
- `khora-web/app/sistema/entorno-persistente/page.tsx` — emisión autenticada;
- `khora-web/db/migrations/016_ep_persistent_sessions.sql` — persistencia;
- `scripts/khora/tests/Test-Arranque.ps1` y `tests/validate_ep.py` — validación.

## 13. Validación de versión

La restauración no se considera ejecutada en Windows hasta pasar, en una máquina de prueba:

1. análisis sintáctico de todos los PowerShell;
2. migración de base de datos;
3. compilación Next.js;
4. emisión Google OpenID Connect y revocación de token anterior;
5. arranque frío con repositorio privado;
6. confirmación visual de identificadores y dos superficies adicionales;
7. corte forzado durante cada etapa y lectura posterior del `START` remoto;
8. extracción del Disco Duro Virtual versión 2 cerrado y prueba negativa sin llave;
9. salida manual, cierre de Visual Studio Code, muerte de terminal, inactividad y reinicio;
10. ausencia de contenedor, tarea, procesos, configuración GitHub/Vercel y secretos.

Las verificaciones Linux o estáticas no sustituyen esta matriz. Cualquier resultado no ejecutado debe declararse **NO VERIFICADO**.

## 14. Huellas de implementación

El paquete final incluye `ep-integrity-manifest.sha256`, calculado después de todas las modificaciones. El manifiesto no se incluye a sí mismo y cubre la arquitectura, gate, módulos, API, migración y pruebas. Un modelo debe verificarlo antes de atribuir comportamiento a v1.0.
