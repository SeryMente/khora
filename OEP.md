# OEP — Objeto Canónico de Persistencia de Entorno

**Identificador:** OEP  
**Nombre completo:** Persistencia de Entorno Operativo  
**Versión:** v0.1.7
**Estado:** ACTIVO · CANÓNICO PARA ESTE ÁMBITO · EN EVOLUCIÓN CONTROLADA  
**Sistema emisor:** KHORA  
**Plataforma objetivo actual:** Windows

> Este documento es el objeto canónico transversal de OEP. Su función es conservar contexto suficiente para reconstruir el propósito, las invariantes, decisiones, límites, pendientes, fuentes y estado del ámbito de Persistencia de Entorno aunque se pierda el contexto conversacional original.

---

## 0. Recuperación de contexto

Cuando OEP sea recuperado sin el contexto conversacional original, leer en este orden: identidad y versión; fuentes canónicas; invariantes; decisiones; estado; pendientes; desafío activo. No reconstruir por memoria una decisión que esté escrita aquí o en una fuente de mayor autoridad. Ante conflicto, prevalece la fuente de mayor autoridad; si ninguna lo resuelve, el asunto queda BLOQUEADO y se solicita únicamente lo necesario.

## 1. Fuentes canónicas

**Fuente técnica primaria existente:** `SeryMente/khora/ep-medio-architectura.md`, versión observada `v1.0.4`. Es la especificación normativa existente de Entorno Persistente Medio.

**Fuente metodológica superior:** `SeryMente/metodologia/SI-METACOGNITIVO.md`, versión observada `v1.6.8`, nombre de versión **Continuidad Canónica entre Conversaciones**.

**Snapshot de KHORA observado al canonizar OEP:** `main` = `019d7ab396534148db111b7860697ec7c8029d81`. SHA verificado en este ciclo después de integrar las correcciones de toolchain y bootstrap.

**Blob actual de arquitectura EP:** `382e4a929a984a96926fd6f9080f80bedd109a0b`.

## 2. Propósito

OEP proporciona una continuidad de trabajo persistente en su identidad y estado remoto, pero efímera en su materialización local. La computadora donde se trabaja es un medio temporal, no el ancla principal de continuidad.

**Principio rector:** persistencia remota + materialización local efímera + adaptación al host + recuperación verificable.

## 3. Modelo de continuidad

Una misma continuidad lógica atraviesa múltiples instancias locales. Cambiar de computadora o ubicación no equivale a comenzar un trabajo nuevo. La continuidad debe quedar respaldada por repositorios remotos y demás estados autorizados.

## 4. Ubicaciones objetivo actuales

Perfiles iniciales: `LOC-CSEC`, `LOC-OFFICE-DEPOT`, `LOC-LUIS-PASTEUR`.

Las ubicaciones son perfiles de adaptación de un único motor OEP. No deben convertirse en implementaciones independientes.

## 5. Perfil de ubicación / host

Cada materialización debe poder asociarse a un perfil de host que describa como mínimo: Windows y versión; PowerShell; privilegios; BitLocker; espacio libre; Escritorio real del usuario interactivo; escritura local; HTTPS; Git; GitHub CLI; Node.js/npm; Python; Vercel CLI; Visual Studio Code; Notepad++; Chrome; OBS; cámara virtual de OBS; AutoHotkey 2.0; políticas del host; herramientas reutilizables; faltantes e incompatibles.

Estados recomendados: `AVAILABLE`, `AVAILABLE_COMPATIBLE`, `MISSING`, `INCOMPATIBLE`, `BLOCKED`, `NOT_VERIFIED`.

La existencia de una herramienta no implica que pueda reutilizarse.

## 6. Experiencia de arranque objetivo

Llegar a una computadora → abrir KHORA → autenticarse → obtener credencial OEP → recibir de KHORA el comando PowerShell → ejecutar launcher → detectar host → seleccionar/adoptar perfil → materializar únicamente lo necesario → quedar operativo → trabajar → cerrar o perder sesión → volatilizar instancia local.

La intervención manual y el tiempo de arranque deben minimizarse y medirse.

## 7. Regla de desarrollo ciclo a ciclo

Se resuelve un desafío concreto por ciclo. Cada ciclo registra desafío, contexto utilizado, análisis, solución, cambios incorporados, evidencia y nuevos pendientes.

Si el desafío no puede resolverse cabalmente con la información disponible, se detiene la ejecución sustantiva y se solicita únicamente lo necesario.

Estados: `RESUELTO`, `PARCIALMENTE_RESUELTO`, `BLOQUEADO`, `NO-VERIFICADO`, `PENDIENTE`.

## 8. Taxonomía del conocimiento

`FACTO-CANONICO` = existe en fuente normativa o implementación verificable.  
`DECISION-OEP` = decisión adoptada explícitamente.  
`REQUISITO-OEP` = necesidad declarada aún sujeta a diseño.  
`PROPUESTA` = alternativa no adoptada.  
`PENDIENTE` = asunto no resuelto.  
`NO-VERIFICADO` = no probado suficientemente.

Lo no escrito no debe inventarse.

## 9. KHORA como autoridad de emisión

KHORA es el sistema emisor del launcher de OEP. Flujo: KHORA → autenticación → credencial de sesión OEP → launcher PowerShell → bootstrap OEP.

**GitHub Gist queda descartado** como mecanismo de distribución del launcher o recuperación de secretos.

## 10. Launcher PowerShell

Debe ser emitido por KHORA, estar libre de secretos incrustados, soportar Windows PowerShell 5.1 como mínimo actual, recuperar el bootstrap autorizado, adaptarse al host, no exponer el token en historial/salida/argumentos de proceso, limpiar temporales y credenciales y producir errores identificables.

La implementación existente de EP debe ser la base antes de crear un mecanismo paralelo.

## 11. Autenticación

### 11.1 OIDC
Google OIDC permanece como identidad primaria de KHORA. OEP no reemplaza la autenticación global de KHORA.

### 11.2 Acceso rápido específico de OEP
Se adopta como dirección de diseño una credencial rápida específica, provisionalmente denominada `OEP Master Password`, para reducir la fricción de arranque sin convertirla automáticamente en credencial primaria global.

Modelo: OIDC → identidad primaria de KHORA. OEP Master Password → acceso rápido y limitado a la emisión/inicio de OEP.

### 11.3 Mínimo privilegio
Debe limitarse al ámbito OEP y no adquirir automáticamente administración general de KHORA, acceso general a secretos o acceso irrestricto a repositorios.

### 11.4 Seguridad
El diseño debe resolver verificador seguro, derivación resistente a fuerza bruta, salt, rate limiting, bloqueo, revocación, rotación, recuperación, invalidación, protección contra enumeración y reuso. Nunca almacenar la contraseña en claro ni incrustarla en el launcher.

## 12. Token de sesión OEP

El token emitido por KHORA debe ser efímero, asociado a sesión, revocable, limitado por scopes, identificable y protegido contra exposición. La arquitectura EP vigente ya contempla `sid`, `jti`, expiración, scopes, audiencia, emisor, revocación y asociación a usuario.

## 13. Token vs raíz criptográfica

**Pendiente crítico.** La intención aportada contempla utilizar el token de KHORA como llave o componente de la llave de arranque/cifrado. EP Medio v1.0.1 actualmente separa token Khora para bootstrap/logs/autorización y llave de bóveda para raíz criptográfica/BitLocker/perfil. Hasta una decisión explícita: **token de sesión OEP ≠ automáticamente raíz criptográfica**.

## 14. Invariante de cifrado

Los repositorios no deben quedar materializados innecesariamente en claro fuera del perímetro protegido. Modelo: crear perímetro protegido → materializar dentro → trabajar dentro → destruir. No descargar/descomprimir en claro y cifrar después si ello deja una copia externa. La implementación EP vigente utiliza VHDX + BitLocker como perímetro actual.

## 15. Workspace

La raíz lógica deseada es `<Escritorio>/EP/`.

Estructura conceptual: `EP/Gestor-de-Procesos/`, `EP/Signal-Interpreter/`, `EP/Armonía/`, `EP/KHORA/` y otros repositorios seleccionados.

Cada repositorio seleccionado bajo `SeryMente` corresponde a una carpeta de trabajo determinista dentro de `EP`. Armonía es futura y no obliga a materialización en todas las sesiones.

## 16. Extensiones Chrome

Extensiones actuales: Gestor de Procesos y Signal Interpreter. Extensión prevista: Armonía.

Para una extensión Chrome, la carpeta de trabajo del repositorio es directamente la raíz cargable de Chrome. El `manifest.json` vive en esa raíz cuando el proyecto así lo requiera. No crear una copia adicional solo para instalar.

## 17. Selección de repositorios

OEP debe soportar materialización total y subconjuntos. La selección debe formar parte de una configuración de sesión reproducible.

## 18. Manifiesto de sesión

El diseño futuro debe permitir un descriptor reproducible con sesión, perfil de ubicación, repositorios, herramientas, capacidades, preferencias del workspace y políticas de seguridad.

## 19. Herramientas obligatorias

**Visual Studio Code:** IDE principal; conservar la estrategia portátil/persistible de EP cuando sea compatible.

**Notepad++:** obligatorio para edición rápida y bloc de notas híbrido; detectar → verificar → reutilizar si válido → instalar si falta.

**OBS:** objetivo inmediato disponer de cámara virtual; detectar → verificar compatibilidad → verificar cámara virtual → reutilizar o instalar.

**AutoHotkey 2.0:** obligatorio; verificar existencia, versión, ejecución y compatibilidad.

**Google Chrome:** necesario para KHORA, autenticación, extensiones y operación web.

**Git / GitHub CLI / Node.js / npm / Python / Vercel:** dependencias de infraestructura según necesidades de repositorios y despliegues.

## 20. Política de host verificado

Una herramienta del host solo puede reutilizarse si cumple versión, seguridad/firma cuando corresponda, aislamiento de configuración/cachés y contrato OEP. Esto corresponde al principio existente `allow-verified-host`.

## 21. Descubrimiento del Escritorio

El Escritorio se descubre dinámicamente. No asumir una ruta fija. El workspace se crea a partir del Escritorio real del usuario interactivo.

## 22. Bootstrap adaptativo

El bootstrap debe seguir: detección → perfil → evaluación → reutilizar / instalar / reparar / bloquear.

No asumir Git, npm, Python, OBS, Notepad++, AutoHotkey, BitLocker, privilegios, PATH completo, rutas estándar ni políticas permisivas.

## 23. Persistencia remota

La continuidad debe quedar respaldada por repositorios, ramas de continuidad, estados remotos autorizados, perfiles persistibles, bitácoras remotas y otros artefactos explícitamente persistentes.

La instancia local nunca debe ser el único portador de continuidad.

## 24. Git y continuidad

EP vigente utiliza ramas `ep-wip/*` para trabajo en progreso. Cuando una etapa requiere persistencia confirmada, el éxito debe verificarse por SHA local = SHA remoto cuando el contrato lo exige.

## 25. Bitácora

EP vigente utiliza un registro local técnico dentro del perímetro y un libro mayor remoto persistente. La bitácora remota debe sobrevivir cierre abrupto, muerte de procesos, eliminación local y reinicio. La estructura existente usa `ep_sessions`, `ep_bootstrap_tokens` y `ep_events`.

## 26. Integridad de bitácora

La arquitectura existente encadena eventos mediante `SHA-256(hash_anterior || representación_canónica_del_evento)` para detectar supresión, reordenamiento y modificación posterior. El reloj de servidor es autoritativo.

## 27. Identificadores estables

EP vigente utiliza `EP-IN-xxx`, `EP-RUN-xxx` y `EP-OUT-xxx`. No renumerar ni reutilizar identificadores existentes.

## 28. Dead-man trigger

El mecanismo de hombre muerto ya existe en EP y OEP debe reutilizarlo. Si la sesión operativa deja de estar bajo control autorizado, la instancia local debe tender a la volatilización segura. Se contemplan cierre normal, cierre de VS Code, muerte de terminal/supervisor, inactividad, reinicio y vigilancia.

Ante conflicto entre continuidad y confidencialidad, prevalece la confidencialidad.

## 29. Limpieza

Secuencia conceptual: aceptar motivo → detener procesos → persistir lo necesario → verificar continuidad remota → purgar secretos → bloquear → desmontar → eliminar contenedor → eliminar carpeta exterior → retirar tarea solo tras confirmar ausencia de residuos → cerrar sesión OEP remotamente.

Un fallo de continuidad no debe impedir la limpieza crítica.

## 30. Reinicio inesperado

La tarea de arranque de limpieza debe detectar residuos, intentar limpiarlos, confirmar eliminación y permanecer armada si quedan residuos. No crear cuarentena local permanente para residuos sensibles.

## 31. Gestión de secretos

No deben aparecer secretos en historial, logs, salida, argumentos de proceso, repositorios, archivos temporales innecesarios ni portapapeles después de su uso. Debe limpiarse token, variables sensibles, blobs temporales, portapapeles y artefactos de bootstrap.

## 32. Cachés y configuración

Cuando formen parte de la sesión, TEMP, TMP, GH_CONFIG_DIR, GIT_CONFIG_GLOBAL, NPM_CONFIG_CACHE, PIP_CACHE_DIR, XDG_CONFIG_HOME y XDG_DATA_HOME deben redirigirse al perímetro OEP.

## 33. Perfil de VS Code

Persistir configuración útil y extensiones/listas necesarias; reconstruir binarios cuando sea necesario; mantener el estado persistido cifrado; evitar secretos en el perfil.

## 34. Clasificación del estado local

Cada componente local debe clasificarse como `PERSISTENTE`, `RECONSTRUIBLE` o `EFÍMERO`. Un componente necesario para continuidad que no esté respaldado remotamente es una deficiencia arquitectónica que debe registrarse.

## 35. Rendimiento

Objetivo: minimizar el tiempo entre autenticación y entorno utilizable. Cada etapa crítica registra START, estado terminal, duración e identificador estable. Optimizar con mediciones reales.

## 36. Evolución del bootstrap

La mejora basada en uso real sigue: fallo observado → causa → solución → prueba → versión → evidencia → integración. No se considera aprendizaje válido un cambio improvisado sin evidencia. Las causas conocidas no deben repetirse deliberadamente.

## 37. Estados de sesión

Estados conceptuales: `NEW`, `AUTHENTICATED`, `BOOTSTRAPPING`, `PROFILED`, `PROVISIONING`, `MATERIALIZING`, `READY`, `WORKING`, `FINALIZING`, `CLEANING`, `CLOSED`, `FAILED`, `BLOCKED`, `RECOVERY_REQUIRED`.

## 38. Continuidad remota

Estados conceptuales: `REMOTE_CONTINUITY_OK`, `REMOTE_CONTINUITY_PENDING`, `REMOTE_CONTINUITY_FAILED`. Una sesión local `READY` no implica automáticamente continuidad remota confirmada.

## 39. Condición de operativo

Solo declarar una sesión operativa cuando el host es compatible, el perímetro está protegido, las herramientas requeridas están listas, los repositorios requeridos están materializados, la continuidad remota es válida, la vigilancia está activa y las superficies previstas son correctas.

## 40. Reconciliación

Si estado local y remoto discrepan: **NO ELEGIR SILENCIOSAMENTE**. Determinar versión, SHA, sesión, autoría, conflicto y posibilidad de preservación. Ante incertidumbre material: `BLOCKED`.

## 41. SHA como identidad técnica

Cuando una afirmación dependa de contenido, versión o despliegue concreto, preferir el SHA exacto. `main`, `latest` o `production` no sustituyen una identidad exacta cuando se requiere precisión.

## 42. Publicación de main

EP vigente contiene `EP-IN-080`, que exige publicación y verificación del SHA exacto de `main` y restauración posterior de `ep-wip/*`. OEP conserva esta propiedad mientras siga vigente en EP.

## 43. Límites del modelo de amenaza

OEP protege principalmente datos en reposo, copias físicas, residuos locales y materialización efímera. No afirma aislar el volumen contra malware con privilegios equivalentes ni contra un host ya comprometido mientras el entorno está montado.

## 44. RDC

RDC forma parte del contexto operativo cuando el ciclo requiera acceso al host, diagnóstico, ejecución, revisión de sesiones o reinstanciación. El estado RDC debe observarse de forma real y no inferirse. Se prevé capacidad para revisar sesiones RDC desde OEP.

## 45. OEP Hub

Se prevé un Hub gráfico como capa superior para iniciar, seleccionar repositorios, seleccionar perfil, editar configuración, obtener launcher, ver estado, revisar RDC y finalizar. El Hub no debe contener como única copia la lógica crítica del núcleo.

## 46. Independencia del mecanismo de acceso

OEP conserva su identidad aunque se acceda mediante navegador, KHORA, PowerShell, RDC, Hub futuro u otro mecanismo autorizado. La interfaz no define el sistema.

## 47. Ciclo operativo 001 — Perfil de host

**Desafío:** hacer que OEP conozca las capacidades y señales del host antes de declarar el entorno operativo.

**Implementado:** `scripts/khora/khora.ps1` amplía `EP-IN-010` para capturar un perfil `oep-host-profile/v1` y lo persiste dentro del volumen cifrado como `session-state/host-profile.v1.json`; `session-manifest.json` registra esquema, ruta y clasificación. `modules/00-config.ps1` carga el perfil para etapas posteriores.

**Evidencia RDC en PC-7:** Windows 11 Pro build 26200; usuario `PC 7`; administrador `true`; Escritorio `C:\Users\PC 7\Desktop`; ~1002.28 GiB libres en C:; Git y GitHub CLI portátiles presentes en `Desktop\_BootstrapTools`; Node.js y npm presentes; Python resuelve a WindowsApps; VS Code, Notepad++, OBS y AutoHotkey no encontrados por `Get-Command`.

**Señales de administración:** `cyberclient`, `cyberclientproxy`, `vigia`, `DFLocker64` y otras; clasificación `managed-or-public-suspected`, sin inferir ubicación.

**BitLocker del sistema observado:** `FullyEncrypted`, `Protection=Off`, `XtsAes128`, `100%`. Describe C: y **no equivale a EP-IN-030**, que verifica el VHDX de trabajo con XTS-AES-256 y protección activa.

**Resultado:** `RESUELTO` para captura/persistencia del perfil; `NO-VERIFICADO` para bootstrap OEP completo en este host.

## 47.1 Ciclo operativo 003 — Reutilización verificable del toolchain del host

**Desafío:** hacer que OEP/KHORA reutilicen instalaciones válidas del host aunque no estén en `PATH`, y que el bootstrap no dependa de `npm.ps1` cuando la política de ejecución lo bloquee.

**Cambios integrados en KHORA:**
- `scripts/khora/khora.ps1` añade resolución determinista de herramientas en rutas estándar del host y evita tratar el alias de Python en `WindowsApps` como instalación válida.
- `scripts/khora/modules/08-deps.ps1` reutiliza Git, GitHub CLI, Node.js y Python encontrados en rutas estándar y resuelve npm mediante `npm.cmd`.
- `scripts/khora/modules/00-config.ps1` queda alineado con `SCRIPT_VERSION = 7.5.2`.
- `tests/validate_ep.py` exige la presencia del resolvedor de herramientas y de `npm.cmd`.
- `ep-medio-architectura.md` documenta el contrato de reutilización de herramientas del host.
- `khora-web/lib/server/ep-bootstrap-content.ts` fue regenerado para mantener el bootstrap embebido byte-equivalente al gate.

**Evidencia real en PC-7 mediante RDC:**
- PowerShell 5.1.26100.9168.
- Usuario interactivo `PC 7`; administrador `true`.
- Escritorio `C:\Users\PC 7\Desktop`.
- Espacio libre medido: ~1008.32 GiB.
- BitLocker disponible en el sistema.
- Node.js `v24.20.0`; npm `11.19.0` mediante `npm.cmd`.
- Git `2.55.0.windows.5`.
- GitHub CLI `2.102.0`.
- Python `3.11.9`.
- Notepad++ `8.9.8.1`.
- OBS Studio `32.2.2`.
- AutoHotkey 2.0.29.
- No se verificó todavía cámara virtual de OBS.
- En el cierre del ciclo 003, GitHub CLI quedó instalado pero sin autenticación persistente; esa condición histórica se resolvió durante el ciclo 004 mediante autorización web y verificación de la sesión.

**Resultado:** `PARCIALMENTE_RESUELTO`. La reutilización y detección robusta fueron integradas en código y el toolchain quedó materializado en el host real. La ejecución end-to-end de KHORA/OEP permanece `NO-VERIFICADA` hasta completar autenticación GitHub y ejecutar el bootstrap real.

**Causa conocida incorporada:** stderr de CLIs nativas puede convertirse en `NativeCommandError` bajo PowerShell 5.1 con `$ErrorActionPreference='Stop'`; probes futuros deben capturar salida y `$LASTEXITCODE` o usar entrypoints nativos compatibles. `npm.ps1` no debe ser tratado como entrypoint válido cuando está bloqueado por ExecutionPolicy.

## 47.2 Ciclo operativo 004 — Hardening criptográfico, reducción de superficie y validación E2E

**Desafío:** validar extremo a extremo el perímetro cifrado y cerrar diferencias entre host, bootstrap, autenticación de GitHub y aplicación web antes de producción.

**Cambios integrados en KHORA:**
- `scripts/khora/khora.ps1` queda en `7.5.3`, reutiliza herramientas del host por rutas estándar y deriva la contraseña del protector BitLocker EP con PBKDF2-HMAC-SHA256, 200 000 iteraciones, sal `KHORA-EP-V1|session-id` y 32 bytes codificados en Base64.
- `Get-KhoraGitHubToken` intenta primero `gh auth token`, valida la credencial contra GitHub y la conserva solo en memoria; el portapapeles queda como fallback.
- `scripts/khora/modules/08-deps.ps1` evita descargar Python cuando existe una instalación estándar válida.
- Se regeneró el bootstrap embebido para conservar equivalencia byte-a-byte con el gate.
- Se eliminaron `khora-web/app/api/security/setup-recovery/route.ts` y `khora-web/lib/firebase.ts` por estar sin consumidores; también se eliminaron `nodemailer` y `firebase` de producción.
- `tests/validate_ep.py` exige PBKDF2-HMAC-SHA256/200 000 para el secreto BitLocker y rechaza derivación directa mediante `ComputeHash($bytes)`.

**Evidencia real en PC-7 mediante RDC:**
- Autenticación GitHub CLI verificada contra `api.github.com`; la cuenta autenticada dispone de permiso de escritura sobre `SeryMente/khora` sin exponer el token.
- `EP v1.0.1 static validation: OK`.
- Parser PowerShell 5.1: `OK`.
- Prueba viva `KHORA-PBKDF2-CRYPT-TEST`: VHDX cifrado con `XtsAes256`, 100 %, protección activa, bloqueo/desbloqueo y lectura del sentinel; sin residuos después de limpieza.
- `npm audit --omit=dev`: `0` vulnerabilidades después de retirar las dependencias muertas.
- `test:unit`: 323/323, 0 fallos.
- `next build --webpack`: 77/77 páginas estáticas generadas, TypeScript y optimización completados con código de salida 0.

**Host BitLocker:** `C:` continúa `FullyEncrypted`, `ProtectionStatus=Off`, `XtsAes128`, 100 %, sin protectores; TPM está listo. La corrección se intentó y Windows devolvió `0x80070522` por falta del privilegio requerido en la sesión RDC no elevada. No se cambió el cifrado existente de `C:`.

**Vercel:** proyecto `khora-web` vinculado a `SeryMente/khora`, dominio `khora-web.vercel.app` verificado y `AUTH_SECRET` presente en producción. La creación explícita del despliegue para `5dc82b536525c546542509db9694293f6da1885c` fue rechazada por Vercel con HTTP 402, `api-deployments-free-per-day`: más de 100 despliegues diarios en el plan gratuito. La ruta CLI alternativa no estaba instalada en el host.

**Resultado:** `PARCIALMENTE_RESUELTO`. El código, cifrado EP, autenticación y build quedan validados; la protección de `C:` y el despliegue de producción requieren intervención externa al código: UAC/privilegio de BitLocker y resolución de la cuota/plan de Vercel, respectivamente.

## 48. Resiliencia de contexto

Las propiedades esenciales no deben depender de memoria conversacional. Si una propiedad solo existe en la conversación y no en este objeto o una fuente canónica referenciada, existe una deficiencia de resiliencia y debe corregirse en un ciclo.

## 48. Resiliencia ante contradicción

Una propuesta incompatible con una propiedad existente se registra como CONFLICTO DETECTADO. No reemplaza silenciosamente una decisión previa. Toda sustitución debe declarar elemento sustituido, motivo, impacto y nueva propiedad.

## 49. Resiliencia ante cambio de implementación

Separar propiedad de implementación. Ejemplo: la propiedad es materialización local cifrada; la implementación actual es VHDX + BitLocker. Una implementación futura puede sustituir VHDX si conserva las propiedades exigidas.

## 50. Resiliencia ante cambio de host

La ubicación modifica parámetros de ejecución, no el objetivo del sistema. CSEC, Office Depot y Luis Pasteur deben ser perfiles, no motores independientes.

## 51. Registro de decisiones

- `OEP-DEC-001`: el nombre transversal es OEP — Persistencia de Entorno Operativo.
- `OEP-DEC-002`: KHORA es el emisor del launcher PowerShell.
- `OEP-DEC-003`: GitHub Gist queda descartado.
- `OEP-DEC-004`: OIDC permanece como identidad primaria de KHORA.
- `OEP-DEC-005`: se explora una contraseña rápida específica de OEP.
- `OEP-DEC-006`: la contraseña rápida no sustituye automáticamente la identidad global de KHORA.
- `OEP-DEC-007`: las ubicaciones iniciales son CSEC, Office Depot y Luis Pasteur.
- `OEP-DEC-008`: se utilizarán perfiles de ubicación/host.
- `OEP-DEC-009`: la raíz lógica de trabajo es `<Escritorio>/EP/`.
- `OEP-DEC-010`: cada repositorio seleccionado tendrá su carpeta dentro de `EP`.
- `OEP-DEC-011`: las extensiones usan su carpeta de trabajo como raíz cargable de Chrome.
- `OEP-DEC-012`: Gestor de Procesos y Signal Interpreter son extensiones actuales.
- `OEP-DEC-013`: Armonía es una extensión futura prevista.
- `OEP-DEC-014`: Notepad++ es obligatorio.
- `OEP-DEC-015`: OBS debe verificarse y, si falta y el host lo permite, instalarse para cámara virtual.
- `OEP-DEC-016`: AutoHotkey 2.0 es obligatorio.
- `OEP-DEC-017`: el sistema debe minimizar el tiempo de arranque.
- `OEP-DEC-018`: el bootstrap debe adaptarse al host.
- `OEP-DEC-019`: la selección de repositorios debe poder ser parcial.
- `OEP-DEC-020`: debe contemplarse revisión de sesiones RDC.
- `OEP-DEC-021`: se prevé un Hub gráfico para OEP.
- `OEP-DEC-022`: el perfil de host/ubicación es estado de primera clase del arranque y queda persistido dentro del volumen cifrado.
- `OEP-DEC-023`: `Desktop/EP` es una junction verificada hacia el workspace cifrado; no es una segunda copia.
- `OEP-DEC-024`: la selección de repositorios es parte firmada de la sesión OEP y cada repositorio seleccionado obtiene continuidad WIP independiente.
- `OEP-DEC-025`: ScriptPWS queda reconocido como módulo operativo de EP para automatización PowerShell y toolchain Windows; su baseline vigente se gobierna por un índice explícito y retiene hasta tres versiones exitosas verificadas.


## 52. Pendientes actuales

- `OEP-PENDING-001`: diseño seguro y completo de autenticación rápida por contraseña maestra.
- `OEP-PENDING-002`: relación exacta entre token KHORA y raíz criptográfica.
- `OEP-PENDING-003`: esquema formal de Location Profile.
- `OEP-PENDING-004`: estructura formal del manifiesto de sesión.
- `OEP-PENDING-005`: **RESUELTO EN CICLO 002**. `Desktop/EP` es una junction verificada hacia `EP/` dentro del VHDX cifrado; la verificación end-to-end completa permanece pendiente.
- `OEP-PENDING-006`: **PARCIALMENTE RESUELTO**. OBS Studio 32.2.2 está instalado y localizado; cámara virtual de OBS sigue sin verificación.
- `OEP-PENDING-012`: **PARCIALMENTE RESUELTO EN CICLO 004**. GitHub CLI ya está autenticado y el bootstrap puede reutilizar su credencial en memoria; el bootstrap E2E completo de KHORA/OEP no se ejecutó porque la llave/clave maestra de la bóveda no fue aportada y no debe reconstruirse ni regenerarse a ciegas.
- `OEP-PENDING-013`: **PARCIALMENTE RESUELTO EN CICLO 004**. El proyecto `khora-web` está vinculado a `SeryMente/khora`, tiene `AUTH_SECRET` de producción y dominio `khora-web.vercel.app`; la publicación de la revisión `5dc82b5` fue bloqueada por el límite gratuito diario de Vercel. OBS Virtual Camera y VS Code siguen sin verificación.
- `OEP-PENDING-014`: **BLOQUEADO**. `C:` está 100 % cifrado pero `ProtectionStatus=Off`, `XtsAes128` y sin protectores; TPM está disponible, pero `la provisión TPM se intentó desde una tarea `SYSTEM`; `Add-BitLockerKeyProtector` no persistió el protector y `manage-bde -protectors -add C: -tpm` devolvió `0x80070002`. El TPM reporta `RestartPending=True`, por lo que el estado requiere reinicio/provisión UEFI/TPM posterior y verificación final. Requiere una ejecución administrativa interactiva/UAC para añadir el protector TPM y reanudar protección sin cambiar el método actual del volumen.
- `OEP-PENDING-015`: **PENDIENTE**. Tras resolver la cuota de Vercel, crear/verificar el despliegue de producción correspondiente al SHA canónico de `main` y ejecutar smoke tests públicos.
- `OEP-PENDING-007`: **RESUELTO EN CICLO 003**. Notepad++ 8.9.8.1 instalado y localizado.
- `OEP-PENDING-008`: **RESUELTO EN CICLO 003**. AutoHotkey 2.0.29 instalado y localizado.
- `OEP-PENDING-009`: modelo de revisión de sesiones RDC.
- `OEP-PENDING-010`: contrato de evolución/versionado del bootstrap.
- `OEP-PENDING-011`: persistencia/reconstrucción del estado no-Git de cada repositorio.


## 53. Asuntos explícitamente no decididos

No está decidido que la contraseña OEP sustituya OIDC globalmente; que el token de sesión sea directamente la llave criptográfica; que Gist participe; que todos los repositorios se clonen siempre; que OBS deba ejecutarse siempre; que todas las herramientas del host deban reemplazarse; que el Hub exista antes del bootstrap funcional; ni que cada ubicación tenga código independiente.

## 54. Regla de evidencia

Toda afirmación de implementación debe poder vincularse a una fuente, archivo, prueba, ejecución o evidencia equivalente. Distinguir siempre entre existencia, implementación, funcionamiento y funcionamiento reproducido.

## 55. Regla de cierre de ciclo

Un ciclo queda integrado cuando el problema está definido, la solución está formulada, su relación con fuentes existentes está determinada, OEP está actualizado, la implementación fue modificada cuando correspondía, la evidencia quedó registrada y los nuevos pendientes fueron identificados. Si implementación o evidencia requerida aún no existe: `NO-VERIFICADO`.

## 56. Historial

### v0.1.0
Primer objeto canónico transversal de contexto de OEP.

### v0.1.1
Endurecimiento para autosuficiencia y resiliencia de contexto; se añadieron autoridad y snapshots, taxonomía del conocimiento, invariantes, estados, reconciliación, reglas de no-inferencia, recuperación de contexto, resiliencia ante contradicción y cambios de implementación/host, decisiones y pendientes formales, evidencia y cierre de ciclo.

### v0.1.2
Se incorpora el primer corte funcional de OEP: perfil de host `oep-host-profile/v1`, persistencia del perfil dentro del volumen cifrado, exposición al runtime mediante `session-manifest.json` y evidencia del primer host real observado por RDC.

### v0.1.3
Se integra el ciclo 003 de reutilización verificable del toolchain del host, detección fuera de `PATH`, uso de `npm.cmd`, alineación de versión `7.5.2`, refresh del bootstrap embebido y evidencia real de provisión en PC-7.

### v0.1.4
Se integra el ciclo 004 de hardening criptográfico y de superficie de ataque: PBKDF2-HMAC-SHA256 con 200 000 iteraciones para la contraseña del protector BitLocker EP; reutilización de la sesión autenticada de GitHub CLI en memoria; alineación de Host KHORA `7.5.3`; eliminación de un endpoint de recuperación muerto y de `firebase` sin consumidores; auditoría de runtime con `0` vulnerabilidades; validación real de VHDX + BitLocker XTS-AES-256 y build web completo en PC-7. El despliegue de `019d7ab` a Vercel quedó bloqueado por el límite gratuito diario de despliegues; `khora-web.vercel.app` continúa vivo sobre un deployment anterior.

### v0.1.5
Se actualiza el snapshot canónico al commit `019d7ab396534148db111b7860697ec7c8029d81`, se registra que `khora-web.vercel.app` sigue operativo sobre un deployment previo por agotamiento de cuota de despliegues, y se corrige el diagnóstico del host BitLocker: `SYSTEM` puede ejecutar la operación pero el protector TPM no persiste mientras el TPM está en `RestartPending=True`; la reparación final queda pendiente de reinicio/provisión y verificación posteriores.

### v0.1.6
Se incorpora el módulo operativo ScriptPWS, con BASELINE-002 como vigente, BASELINE-001 preservado como fallback, hashes de los dos artefactos aceptados, punto de entrada local, regla de retención de hasta tres versiones y evidencia observada en PC-7. El tercer espacio queda reservado para una versión futura que supere prueba y aceptación; no se inventa una instancia no ejecutada.

## 57. Regla de modificación

Toda modificación material debe aumentar versión, conservar historial, indicar qué cambió, conservar decisiones no sustituidas, marcar sustituciones explícitamente y conservar trazabilidad. No borrar contexto histórico relevante.

## 58. Definición canónica consolidada

> OEP es el ámbito del sistema KHORA dedicado a proporcionar persistencia de entorno operativo mediante una continuidad de trabajo respaldada remotamente y materializaciones locales temporales, cifradas, verificables y adaptativas al host. La ubicación física del trabajo es una variable de ejecución y no una variante del sistema. Cada sesión local debe poder reconstruirse desde el estado autorizado, utilizar únicamente las herramientas y repositorios necesarios, mantener la continuidad remota y volatilizar su materialización local mediante cierre normal o mecanismos de hombre muerto. KHORA constituye el punto de emisión del launcher y de las credenciales de sesión de OEP. OIDC continúa siendo la identidad primaria global de KHORA, mientras que una futura credencial rápida específica de OEP puede reducir la fricción de arranque sin convertirse automáticamente en sustituto de la identidad primaria.

## 59. Estado al cierre

**OEP:** `v0.1.6`
**Estado:** ACTIVO  
**Nivel:** arquitectura transversal en construcción  
**Último ciclo integrado:** 004 · hardening criptográfico, reducción de superficie de ataque y validación E2E
**Implementación completa:** NO VERIFICADA  
**Fuente técnica principal:** `SeryMente/khora/ep-medio-architectura.md v1.0.4`
**Fuente metodológica:** `SeryMente/metodologia/SI-METACOGNITIVO.md v1.6.8`

La ausencia de contexto conversacional no autoriza a reconstruir decisiones fuera de este objeto o de sus fuentes canónicas.

## 60. Módulo ScriptPWS

**Identificador:** `OEP-MOD-SCRIPTPWS`  
**Clasificación:** módulo funcional subordinado al frente Entorno Persistente (EP), no frente independiente.  
**Objeto canónico del módulo:** `docs/frentes/ep/modulos/scriptpws/OBJETO-CANONICO.md`  
**Ubicación dentro del workspace:** `Desktop/EP/khora/docs/frentes/ep/modulos/scriptpws/`, solo cuando KHORA está seleccionado y materializado en la sesión.  
**Baseline vigente:** `BASELINE-002` · v2.0 · comando bootstrap completo de una línea.  
**Fallback:** `BASELINE-001` · v1.0.  
**Espejo:** `BASELINE-CURRENT.ps1`; no cuenta como una versión adicional.

La separación de artefactos es obligatoria: el bootstrap completo es el comando que el operador ejecuta; `RDC-Remote.ps1` es el lanzador runtime generado por el bootstrap; `Remote Desktop Commander.lnk` es un acceso directo. El lanzador runtime generado previamente se conserva en `docs/frentes/ep/modulos/scriptpws/artifacts/RDC-Remote.generated-from-BASELINE-002.ps1`.

El bootstrap V2.0 fue reportado expresamente por el operador como ejecutado sin errores. Comprueba/instala Node.js 24, NPM y NPX; usa `npm.cmd`/`npx.cmd`; prepara y valida el lanzador oficial de RDC; crea el acceso directo; registra transcript en `Desktop/log.txt`; y gestiona diagnóstico en portapapeles.

**Punto de entrada canónico:** contenido íntegro de `docs/frentes/ep/modulos/scriptpws/baselines/BASELINE-CURRENT.ps1`. El archivo contiene el bootstrap completo. No se debe referenciar `START-RDC.ps1`: el bootstrap aceptado no crea ese archivo. El lanzador runtime local generado es `%LOCALAPPDATA%\ScriptPWS\RDC-Remote.ps1`.

**Autenticación nueva:** el operador requiere que cada arranque de RDC no presuma una sesión autenticada anterior y permita seleccionar la cuenta Google correcta. La opción upstream `--no-persist-session` está documentada en Desktop Commander; queda como candidata BASELINE-003 · v2.1, pendiente de prueba y aceptación. BASELINE-002 no se altera mientras tanto.

**Retención:** máximo tres baselines completos exitosos aceptados por el operador. Actualmente existen dos versiones únicas; el espejo CURRENT no ocupa una plaza adicional. SHA-256, byte count y read-back se gobiernan mediante `BASELINE-INDEX.json`.
