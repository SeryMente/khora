<!-- LIST_VERSION=0.48; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Tareas vigentes · Frente Custodia

> **Estado:** PROVISIONAL · subordinado al [OCP único](OBJETO-CANONICO.md). Esta lista es el índice ejecutivo; no constituye un segundo estado canónico.
> **Actualización:** 2026-11-11 · revalidación de los gates de archivo.
> **Único objetivo activo:** archivar todos los registros históricos que puedan archivarse; dejar pendientes únicamente los que tengan un impedimento actual, concreto y documentado.

**Instrucción literal:** [INSTRUCCION-ARCHIVO-RECUPERABILIDAD-20261110.md](originales/INSTRUCCION-ARCHIVO-RECUPERABILIDAD-20261110.md).  
**Salida literal preservada (ciclo anterior):** [SALIDA-MODELO-CUSTODIA-ARCHIVO-REGISTROS-20261110.md](originales/SALIDA-MODELO-CUSTODIA-ARCHIVO-REGISTROS-20261110.md).  
**Última salida literal (ciclo repetido):** [SALIDA-MODELO-CUSTODIA-BLOQUEOS-ULTIMO-CICLO-20261110.md](originales/SALIDA-MODELO-CUSTODIA-BLOQUEOS-ULTIMO-CICLO-20261110.md).  
**Evidencia de repetición del ciclo:** [ESTADO-OPERATIVO-BLOQUEOS-20261110.md](evidencias/ESTADO-OPERATIVO-BLOQUEOS-20261110.md).  
**Instrucción de retoma:** [INSTRUCCION-RETOMA-ULTIMO-TRAMO-20261110.md](originales/INSTRUCCION-RETOMA-ULTIMO-TRAMO-20261110.md).  
**Estado base:** [ESTADO-BASE-ARCHIVO-RECUPERABILIDAD-20261110.md](evidencias/ESTADO-BASE-ARCHIVO-RECUPERABILIDAD-20261110.md).  
**Diagnóstico previo:** [DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md](evidencias/DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md).

## 1. Único trabajo activo

| Orden | ID existente | Prioridad | Estado | Objetivo |
|---:|---|---|---|---|
| 1 | CUSTODIA-01 | P0 | EN CURSO | Archivar, sin duplicación y con verificación, todos los registros/capturas que puedan archivarse; dejar como pendientes solo los impedimentos actuales documentados. |

Detalle: [CUSTODIA-01 · Archivo de todos los registros recuperables](./📁%20🧭%20-%20Tareas%20provisionales/📁%20🧩%20-%20CUSTODIA-01%20-%20Inventario%20forense%20de%20recuperabilidad/README.md).

## 2. Desglose de fases de CUSTODIA-01

Las fases son subunidades internas del expediente existente, no nuevos expedientes maestros ni folios.

| Fase | Estado | Alcance |
|---|---|---|
| CUSTODIA-01.a | EN CURSO | Conciliar candidatos, propietarios, Volcados/archivados y duplicados; Chrome solo en el perfil autorizado `Profile` de `the.willfreeman@gmail.com` en `PC10RCIF4EI4`. |
| CUSTODIA-01.b | BLOQUEADA POR ACCESO AL RUNTIME | Archivar transcripciones sin audio localizado como texto; marcar `Audio: No localizado` y `Procedencia: No verificada`, sin inferir copy/paste. |
| CUSTODIA-01.c | BLOQUEADA POR ACCESO B2/RUNTIME | Leer y cotejar físicamente las partes B2 elegibles; archivar solo tras comprobar bytes, longitud y SHA-256. |
| CUSTODIA-01.d | BLOQUEADA POR ACCESO AL RUNTIME AUTENTICADO | Procesar las 216 partes locales de dos sesiones conforme a autorización C, copiarlas a B2 con read-back y preservar originales. |
| CUSTODIA-01.e | EN CURSO | Registrar como bloqueados los Blob suspendidos, referencias sin read-back y registros sin titularidad demostrada; no declarar pérdida. |
| CUSTODIA-01.f | PENDIENTE | Verificar cada Volcado, retirar del pendiente lo archivado y dejar solo residuales actualmente no archivables con evidencia. |
| CUSTODIA-01.g | EN CURSO · ALCANCE CERRADO | Limitar la búsqueda de la copia de X_KHORA_KEY a las dos bóvedas indicadas por el operador (primera y reconstruida); no ampliar a LastPass, perfiles alternos ni otros almacenes. Preservar ciphertext. |
| CUSTODIA-01.h | NO APLICABLE PARA RECUPERAR LA LLAVE | No restablecer PIN como intento de recuperar X_KHORA_KEY: solo abre la bóveda web y no recupera ni rota la llave criptográfica. |
| CUSTODIA-01.i | PENDIENTE DEL OPERADOR | Si se necesita distinguir pérdida de la copia en bóvedas frente a clave aún operativa en producción, emitir una sesión EP nueva (invalida la anterior) y ejecutar una sola lectura autenticada de `/api/ep/github-credential`; registrar solo OK/código, sin imprimir token. No ejecutar bootstrap. |
| CUSTODIA-01.j | BACKLOG · NO ACTIVO | Verificar la dependencia de `X_KHORA_KEY` en el catálogo y recuperación; separar el fallo de descifrado de Blob, revisión ausente y titularidad. No rotar ni cambiar la llave; cualquier cambio de código requiere autorización específica. |

## 3. Estados de salida

- **ARCHIVADO_VERIFICADO:** archivo y vínculos comprobados por lectura de vuelta.
- **PARCIAL_ARCHIVADO:** uno o más componentes archivados y otro componente de la misma captura pendiente.
- **BLOQUEADO_AHORA:** el contenido existe, pero un bloqueo actual impide terminar el archivo.
- **PENDIENTE_TITULARIDAD:** no se ha demostrado que el registro pertenezca a la cuenta que se archivaría.
- **PENDIENTE_INTEGRIDAD:** referencia existente, pero sin lectura física/cotejo actual suficiente.
- **SIN_CONTENIDO_LOCALIZADO:** solo señales o metadatos, sin texto/audio/archivo localizado.
- **IRRESOLUBLE_EN_ESTE_MOMENTO:** impedimento actual concreto, sustentado y no superable con las vías permitidas.

El estado se asigna por registro y componente. Un archivo parcial no se presenta como archivo íntegro. Blob localizado pero inaccesible no se etiqueta como audio inexistente.

## 4. Cierre de tareas provisionales anteriores

**Disposición:** RESUELTAS ADMINISTRATIVAMENTE POR REENFOQUE. El cierre retira esos trabajos del conjunto activo; no afirma que cada objetivo técnico haya sido ejecutado, probado o aceptado. Sus documentos, código, resultados y límites históricos se conservan sin borrado.

| ID existente | Estado anterior | Disposición actual |
|---|---|---|
| CUSTODIA-03 | ABIERTA | RESUELTA POR REENFOQUE; su evidencia histórica permanece disponible como insumo para el archivo actual. |
| CUSTODIA-04 | EN CURSO | RESUELTA POR REENFOQUE; no se declara E2E aprobado ni reparación aceptada. |
| CUSTODIA-B2-001 | EN CURSO | RESUELTA POR REENFOQUE; evidencia histórica conservada. |
| CUSTODIA-B2-002 | DIFERIDA | RESUELTA POR REENFOQUE; no se activa migración histórica Blob→B2. |
| CUSTODIA-B2-003 | EN CURSO | RESUELTA POR REENFOQUE; evidencia histórica conservada. |
| CUSTODIA-B2-004 | SUPERSEDIDA | RESUELTA POR REENFOQUE; conserva su condición histórica de supersedida. |
| CUSTODIA-B2-005 | DIFERIDA | RESUELTA POR REENFOQUE; diagnóstico histórico conservado. |
| CUSTODIA-B2-006 | EN CURSO | RESUELTA POR REENFOQUE; la aceptación E2E autenticada sigue técnicamente pendiente y no se declara PASS. |
| CUSTODIA-B2-007 | DIFERIDA | RESUELTA POR REENFOQUE; evidencia histórica conservada. |
| CUSTODIA-RES-001 | PROPUESTA PENDIENTE | RESUELTA POR REENFOQUE; resiliencia multialmacén fuera del alcance actual. |
| CUSTODIA-RES-002 | PROPUESTA PENDIENTE | RESUELTA POR REENFOQUE; resiliencia multialmacén fuera del alcance actual. |

**CUSTODIA-02:** continúa RETIRADA; no se reactiva ni se reutiliza su identificador.  
**CUSTODIA-01:** único expediente activo. No se crea CUSTODIA-05 ni se generan IDs maestros adicionales.

## 5. Límites y compuertas

No auditar resiliencia general ni probar nuevas capturas. No reparar código/datos/proveedores ni rediseñar arquitectura. No borrar, sobrescribir ni destruir originales. No atribuir registros sin titularidad demostrada. No duplicar lo archivado.

Se permite el archivo no destructivo de los registros elegibles, con verificación por componente. La lectura física, la copia local autorizada a B2 y los vínculos de archivo deben respetar el control generación 11 y sus compuertas de producción. La respuesta afirmativa del operador a la ampliación específica se conserva en el OCP y el control generación 11. Quedan autorizadas las escrituras de archivo en Neon Production dentro del alcance de CUSTODIA-01; se mantienen los controles mínimos de titularidad, idempotencia, integridad, read-back y preservación de originales.

## 6. Criterio único de cierre de CUSTODIA-01

El frente se considerará resuelto cuando todos los registros que pueden archivarse con los medios y permisos vigentes estén archivados y verificados, los registros ya archivados/duplicados estén excluidos y solo permanezcan casos actualmente imposibles de archivar por bloqueos concretos, falta de titularidad o ausencia confirmada de contenido. Cada residual debe tener evidencia, causa y componente afectado.

El cierre no requiere reparar el producto ni certificar su resiliencia. El resultado es un archivo máximo no destructivo y una lista exacta de lo que no se pudo archivar en este momento.

## 7. Autorización y política de ejecución · 2026-11-10

El operador confirmó la ampliación de autorización descrita en el OCP-v0.47. Se permite ejecutar el archivo de registros elegibles de su cuenta, incluidos los 216 fragmentos locales de las dos sesiones autorizadas, las partes B2 cotejadas y la creación/vinculación de Volcados en Neon Production. El alcance, los límites y la frase literal están preservados en el OCP y en `originales/INSTRUCCION-AUTORIZACION-ARCHIVO-PRODUCTION-20261110.md`.

**Eficiencia:** agrupar consultas, lecturas y operaciones por lotes; evitar verificaciones duplicadas cuando la evidencia vigente cubra el mismo objeto/versionado; aislar fallos por registro y continuar. No omitir titularidad, deduplicación, SHA/longitud/bytes de las copias, idempotencia, lectura de vuelta del archivo ni preservación de originales.


## 8. Ejecución y bloqueo vigente · 2026-11-10

Revalidación de solo lectura: 78 sesiones pendientes de la cuenta; 44 con audio remoto (1.039 partes: 785 B2 y 254 Blob); 34 sin partes remotas, de las que dos contienen 216 fragmentos locales y 32 no tienen audio local/remoto localizado. De esas 32, 27 presentan SHA de texto no vacío/no whitespace y son candidatas a archivo textual; cinco no muestran texto significativo por SHA (cuatro vacíos y uno solo salto de línea). La revisión no descifró texto.

Bloqueo: el conector Vercel redacciona `X_KHORA_KEY` y las dos variables maestras B2 (`decrypted=false`); las rutas canónicas exigen sesión autenticada. No se hicieron escrituras manuales en Neon porque omitirían `guardarDictado()` y su sellado/idempotencia. Vercel Blob sigue suspendido. No se archivó ningún Volcado en este intento.

La autorización está concedida; el impedimento actual es el acceso seguro al runtime KHORA autenticado/secretos. Continuar desde ese contexto sin pedir una nueva autorización al operador.


## 9. Recuperación segura de la llave de KHORA · 2026-11-10

Se documentó que X_KHORA_KEY protege checkpoints, snapshots, Volcados y audio; no es la contraseña maestra EP. El runbook histórico vincula KHORA_API_KEY como alias de X_KHORA_KEY, pero no se verificó que el valor cifrado de la bóveda KHORA coincida con producción.

Se localizaron ciphertext de EP Vault en la ruta local y en respaldos R1/R2. No hay DPAPI/session activa ni notas recuperables localizadas; la GUI EP Vault permanece sellada. No probar contraseñas ni sobrescribir bóvedas.

Siguiente paso autorizado: si el operador recuerda la contraseña EP, introducirla localmente en la GUI; listar nombres sin revelar valores y utilizar KHORA_API_KEY mediante proceso hijo con allowlist exacta; si no, mantener ciphertext y respaldos intactos. Evidencia: evidencias/LOCALIZACION-CLAVE-KHORA-EPVAULT-20261110.md.


## 10. Bóveda web KHORA y PIN

La UI muestra la bóveda KHORA cerrada y el panel de capacidad local sin capacidad activa. Hay dos Bearer Tokens manuales MCP activos, solo runtime:read / volcados:read / norm:turn, último uso Nunca. No se usarán ni revocarán.

El código confirma que Restablecer PIN solo actualiza el hash Scrypt/sal en boveda_pin y abre una cookie de 30 minutos; no modifica X_KHORA_KEY ni ciphertext. La UI de GitHub solo revela metadatos configured/updatedAt para las credenciales norm y ep. El read real de ep requiere una sesión EP autenticada con ep:bootstrap y ep:github:read.

El restablecimiento de PIN queda como alternativa de inspección visual, no como paso inmediato: la prueba EP del §11 no lo necesita. No se ha ejecutado. Prioridad: sesión EP nueva + lectura autenticada de la credencial ep; no revelar tokens ni emitir/revocar Bearer Tokens MCP. Evidencia: evidencias/ESTADO-BOVEDA-WEB-KHORA-20261110.md.


## 11. Prueba EP de credencial sin exposición

La fuente actual de tokens nuevos incluye ep:github:read. POST /api/ep/github-credential requiere ep:bootstrap + ep:github:read, valida el propietario y devuelve la credencial ep al proceso cliente. Puede verificar si la bóveda de servidor aún descifra con X_KHORA_KEY.

La siguiente prueba es de solo lectura: emitir un token EP nuevo (la UI revoca el anterior), consumirlo en memoria local y reportar solo GITHUB_EP_CREDENTIAL_READBACK_OK o un código de fallo. No pegar el token en chat y no ejecutar el bootstrap largo. No afecta los Bearer Tokens MCP. Ver OCP §22.


## 9. Límite de recuperación de X_KHORA_KEY · 2026-11-10

**Instrucción original:** [INSTRUCCION-LIMITE-RECUPERACION-X-KHORA-KEY-20261110.md](originales/INSTRUCCION-LIMITE-RECUPERACION-X-KHORA-KEY-20261110.md).

La pesquisa de la copia recuperable queda restringida a las dos bóvedas identificadas por el operador: primera bóveda y bóveda reconstruida. No ampliar a LastPass, otros perfiles, DPAPI/notas externas ni ubicaciones adicionales. Buscar el nombre literal `X_KHORA_KEY` y considerar `KHORA_API_KEY` solo como alias si existe evidencia de equivalencia.

- Ambas bóvedas abiertas y enumeradas, sin variable ni alias acreditado: **NO LOCALIZADA EN LAS DOS BÓVEDAS; PRESUNTA PÉRDIDA DEFINITIVA DE LA COPIA RECUPERABLE DENTRO DEL ALCANCE AUTORIZADO**.
- Alguna bóveda sellada o sin enumeración verificable: **NO VERIFICADO**, no ausencia.
- La variable aún configurada en Vercel Production puede seguir operativa aunque la copia de recuperación haya desaparecido. El test autenticado de descifrado EP solo demuestra operatividad para el ciphertext probado; no recupera ni revela la llave.
- No rotar, sustituir, re-inicializar ni re-cifrar con otra llave. No hacer fuerza bruta ni probar contraseñas. No alterar ciphertext ni respaldos. Restablecer PIN web no recupera X_KHORA_KEY.

**Consecuencias:** si la clave activa sigue funcionando en producción, el runtime podría permitir continuar operaciones autenticadas, pero la pérdida de la copia crea un punto único de fallo ante pérdida/cambio de la variable de entorno o del entorno productivo. Si la clave ya no está disponible ni en las bóvedas ni en el runtime, los datos cifrados con ella conservan sus bytes pero no pueden descifrarse con los medios actuales; no deben clasificarse como borrados, pero su recuperación práctica queda bloqueada. Los registros de texto legible y con titularidad demostrada pueden seguir siendo candidatos a archivo textual, respetando las marcas de audio/procedencia y la verificación correspondiente.

El alcance se cierra aquí: no se emprenden nuevas rutas de búsqueda de la clave fuera de las dos bóvedas indicadas. La prueba de producción, si se ejecuta, se clasifica aparte de la recuperación de su copia.


## 10. Backlog · dependencia de X_KHORA_KEY en Recuperar capturas

**Entrada del operador:** [INSTRUCCION-BACKLOG-DEPENDENCIA-X-KHORA-KEY-20261110.md](originales/INSTRUCCION-BACKLOG-DEPENDENCIA-X-KHORA-KEY-20261110.md).  
**Evidencia técnica:** [DEPENDENCIA-X-KHORA-KEY-CATALOGO-RECUPERACION-20261110.md](evidencias/DEPENDENCIA-X-KHORA-KEY-CATALOGO-RECUPERACION-20261110.md).

La ausencia/divergencia de `X_KHORA_KEY` queda registrada como posible causa adicional a Vercel Blob para que registros aún presentes en Neon no puedan aparecer o recuperarse desde el panel. El catálogo descifra snapshots para producir tarjetas; si falla el descifrado, su manejador puede devolver 503 `catalogo_no_disponible`. También se descifran revisiones, checkpoint text y snapshots al recuperar.

La inspección de código confirma AES-256-GCM para payloads marcados `khc1.`/`KHC1`. Los call sites verificados incluyen checkpoints/snapshots, partes de audio, MP3, texto/versiones de Volcados y credenciales GitHub. Los registros nuevos que usen esos flujos requieren la misma llave al escribir y leer. Los metadatos de Neon no se consideran cifrados automáticamente. La compatibilidad con valores históricos sin marca impide generalizar la dependencia a cada fila antigua.

**Separación de causas:** Blob suspendido impide el GET físico del objeto histórico; llave ausente/divergente impide descifrar payloads. B2 tampoco elimina la necesidad de descifrar KHC1. Falta de revisión y falta de titularidad son bloqueos separados.

**Siguiente trabajo .j (backlog, no activo):** comprobar de forma autenticada y sin exponer secretos la disponibilidad funcional de la llave en Production; recorrer catálogo/revisiones por páginas; reconciliar cada registro y separar error criptográfico, ausencia de revisión, titularidad y proveedor; proponer aislamiento de error por tarjeta si una sola snapshot fallida provoca 503 global. No tocar código ni configuración sin autorización expresa y no rotar, sustituir o re-cifrar.


## 12. Último tramo y repetición del ciclo · 2026-11-10 · v0.43

**Salida literal:** [SALIDA-MODELO-CUSTODIA-BLOQUEOS-ULTIMO-CICLO-20261110.md](originales/SALIDA-MODELO-CUSTODIA-BLOQUEOS-ULTIMO-CICLO-20261110.md).  
**Evidencia revalidada:** [ESTADO-OPERATIVO-BLOQUEOS-20261110.md](evidencias/ESTADO-OPERATIVO-BLOQUEOS-20261110.md).

### Resultado revalidado

- `X_KHORA_KEY` figura en la configuración Production de `khora-web`; `KHORA_API_KEY` también figura. Se consultaron solo nombres y metadatos (`decrypt=false`), no valores. La presencia no demuestra igualdad de las dos variables ni prueba un descifrado E2E, pero la ausencia de `X_KHORA_KEY` ya no es un bloqueo demostrado.
- `KHORA_LEGACY_BLOB_READS_ENABLED` no figura en la enumeración completa de variables Production (`hiddenProductionEnvCount=0`). El código solo habilita lecturas si el valor es exactamente `true`.
- El almacén Vercel Blob `khora-audio` continúa `billingState=suspended` y `usageQuotaExceeded=true`. El proveedor está bloqueado además de la compuerta de aplicación.
- Los nombres de las credenciales B2 y `BLOB_READ_WRITE_TOKEN` figuran en Production; no se realizó GET físico de objetos.
- `NOTION_DB_VOLCADOS` no figura en Production; esto afecta el espejo Notion, no crea un bloqueo demostrado para el Volcado canónico en Neon.

### Estado de afirmaciones de la salida literal

La salida literal se conserva íntegra como registro histórico. Sus conteos de 95/79/16/87 sesiones y 1.311 partes, y sus afirmaciones sobre los cuatro trabajos Notion, no se elevan al inventario canónico: no fueron reproducidos en este ciclo y no deben sustituir el estado base anterior hasta contar con consulta y evidencia correspondientes.

### Próxima acción operativa

1. No rotar, sustituir ni buscar fuera de las dos bóvedas autorizadas `X_KHORA_KEY`.
2. No activar aún `KHORA_LEGACY_BLOB_READS_ENABLED`: el store continúa suspendido. Reactivar el proveedor y comprobar GET físico antes de abrir la compuerta.
3. Avanzar en paralelo con la verificación física B2 y el procesamiento de los fragmentos locales autorizados, mediante KHORA y con read-back/SHA; nada de ello se ejecutó en este ciclo.
4. Mantener CUSTODIA-01 como única tarea activa. No modificar código, configuración ni datos de Production sin el paso/autorización específica correspondiente.

**Resultado del ciclo:** persistencia documental y revalidación de metadatos completadas; archivo de registros no ejecutado. No se modificaron Production, Neon, B2, Blob, código ni bóvedas.

## 13. Continuidad con B2 verificado y Blob bloqueado · 2026-11-10 · v0.44

**Instrucción:** [INSTRUCCION-CONTINUIDAD-Y-AYUDA-OPERADOR-20261110.md](originales/INSTRUCCION-CONTINUIDAD-Y-AYUDA-OPERADOR-20261110.md).  
**Salidas del modelo:** [SALIDA-MODELO-CUSTODIA-AVANCE-B2-20261110.md](originales/SALIDA-MODELO-CUSTODIA-AVANCE-B2-20261110.md).  
**Evidencia:** [PREFLIGHT-B2-PRODUCTION-Y-ESTADO-LOCAL-20261110.md](evidencias/PREFLIGHT-B2-PRODUCTION-Y-ESTADO-LOCAL-20261110.md).

- El build de Production pasó el preflight B2: autenticación nativa, Master Key, identidad de bucket, privacidad y SSE-B2 por defecto. Es una comprobación de configuración/identidad, no GET/read-back de cada objeto histórico.
- El store Blob khora-audio permanece limits-exceeded-suspended. Requiere intervención del operador en Vercel Dashboard/soporte para restaurar lectura o solicitar exportación temporal. No borrar ni recrear el store.
- En el perfil Chrome autorizado Profile existen archivos IndexedDB del origen khora-web.vercel.app: 251 archivos Blob y 9 archivos LevelDB. Solo se leyó metadata; no se certificó la presencia o descifrado de los 216 fragmentos.
- El clon local KHORA está en una rama de Harmonia con cambios sin publicar, sin .env.local, sin node_modules ni servidor local. Se deja intacto y no se utilizará como runtime de CUSTODIA.

**Siguiente ruta:** B2 queda apto en el nivel de autenticación/bucket; falta lectura física/read-back/SHA de objetos elegibles mediante KHORA autenticado. Blob requiere reactivación/lectura temporal por Vercel; solo después de GET físico se habilitará la compuerta de aplicación. El procesamiento local requiere runtime KHORA limpio y autenticado.

## 14. Conciliación Neon de 79 sesiones sin vínculo y gate B2 · 2026-11-10 · v0.45

**Instrucción literal:** [INSTRUCCION-CONTINUIDAD-OPERADOR-20261110-B.md](originales/INSTRUCCION-CONTINUIDAD-OPERADOR-20261110-B.md).  
**Salida del modelo:** [SALIDA-MODELO-RECONCILIACION-NEON-B2-20261110.md](originales/SALIDA-MODELO-RECONCILIACION-NEON-B2-20261110.md).  
**Evidencia:** [RECONCILIACION-NEON-MANIFIESTOS-B2-20261110.md](evidencias/RECONCILIACION-NEON-MANIFIESTOS-B2-20261110.md).

- Predicado de titularidad igual al backend: COALESCE(custodia_owner, checkpoint_usuario). 84 sesiones propias; 5 vinculadas a Volcados y 79 sin vínculo.
- Las 79 pendientes suman 1.039 partes (785 B2 y 254 Blob). De 29 sesiones con algún SHA de revisión coincidente con un Volcado, cuatro tienen además el mismo manifiesto de audio (48 partes Blob) y cuatro tienen manifiesto distinto (708 partes B2); 21 son solo texto. No deduplicar automáticamente por SHA de texto.
- Las 50 sesiones sin SHA coincidente: 35 con audio Blob (206 partes), 1 B2 con 77 partes, 12 de solo texto con 1.020 revisiones, 1 solo texto sin revisión y 1 sin texto ni audio.
- Los cinco manifiestos B2 suman 785 partes, todas con estado almacenado verificado, SHA válido y bytes positivos. Cuatro son contiguos (464 partes); uno tiene 321 filas y falta el índice 317. El último no pasa la compuerta de índices consecutivos del código.
- El GET/read-back físico de B2 sigue pendiente. El estado verificado en Neon no demuestra disponibilidad actual de objetos. Blob sigue suspendido.

**Continuación:** localizar/reconciliar el índice 317 por el flujo autorizado; priorizar GET/read-back de los cuatro manifiestos B2 contiguos y procesar solo después mediante POST canónico autenticado. Resolver las 4 posibles duplicidades exactas mediante cotejo, no por suposición. No tocar SQL, credenciales ni configuración para forzar el archivo.


## 15. Revalidación del gate B2 y estado Blob · 2026-11-11 · versión de evidencia

**Evidencia:** [REVALIDACION-GATE-B2-BLOB-20261111.md](evidencias/REVALIDACION-GATE-B2-BLOB-20261111.md).  
**Objeto canónico:** [OBJETO-CANONICO.md §§28–29](OBJETO-CANONICO.md) · CUSTODIA-v0.60.

- **Blob:** `khora-audio` sigue `limits-exceeded-suspended`, `billingState=suspended`, `usageQuotaExceeded=true`. Metadata actual: 636 objetos y 1.010.497.194 bytes. Sin GET/listado físico. El operador debe revisar Vercel Dashboard/soporte; no borrar ni recrear.
- **B2:** el SELECT de este ciclo identificó el manifiesto exacto: sesión `45f0cf5e-d1af-46c3-95af-e9428b8b0f90`, perteneciente al único grupo de titularidad con 84 sesiones. Tiene 77 filas, índices consecutivos 1–77, 6.251.747 bytes, 77 estados `verificado`, cero bytes no positivos y cero SHA mal formados; el endpoint observado es Backblaze B2 (`s3.us-east-005.backblazeb2.com`). Son metadatos, no un GET físico actual. No se obtuvo una sesión KHORA autenticada con bóveda desbloqueada y no se efectuó GET/read-back ni recálculo SHA.
- **Archivo:** ningún Volcado creado o vinculado en este ciclo. No hubo escrituras de datos, cambios de credenciales/configuración, ni modificaciones de código o despliegue.

**Siguiente paso único:** obtener un contexto KHORA Production autenticado como propietario y con la bóveda desbloqueada; después leer físicamente las 77 partes B2 y verificar cada SHA. Solo entonces ejecutar el POST canónico y su lectura de vuelta. Mantener el índice 317 como impedimento independiente del segundo manifiesto B2. CUSTODIA-01 sigue siendo la única tarea activa.


## 16. Reconciliación textual y primer candidato sin audio · 2026-11-11 · v0.48

**Evidencia:** [RECONCILIACION-TEXTO-SIN-AUDIO-20261111.md](evidencias/RECONCILIACION-TEXTO-SIN-AUDIO-20261111.md).  
**Objeto canónico:** [OBJETO-CANONICO.md §29](OBJETO-CANONICO.md) · CUSTODIA-v0.60.

- El universo pendiente contiene 34 sesiones textuales sin audio: 21 con alguna coincidencia SHA de revisión/checkpoint frente a Volcado propio (3.846 revisiones), que requieren reconciliación; 13 sin coincidencia (1.020 revisiones en 12 sesiones y una sin revisiones).
- Primer candidato: sesión `48586f80-63d6-4969-9691-27e55cb5d5f5`, checkpoint `khc1.`, 24.853 caracteres cifrados, SHA válido, sin audio, sin revisiones, sin Volcado ni coincidencia SHA con Volcado propio.
- La ruta `GET /api/dictado/checkpoint?sessionId=...` permite al runtime autenticado recuperar y descifrar el texto y validar SHA sin desbloqueo de bóveda. Después, `POST /api/dictado` archiva texto sin audio; exigir lectura de vuelta del Volcado, titularidad, SHA y vínculo de sesión.
- No se ejecutó el endpoint por falta de sesión NextAuth del propietario desde el canal disponible. No se leyeron plaintexts ni secretos y no se creó ningún Volcado.

**Orden operativo:** 1) archivar el candidato textual sin audio tras autenticación; 2) procesar las otras 12 sesiones textuales sin coincidencia SHA; 3) GET físico y archivo de la sesión B2 de 77 partes; 4) reconciliar las 21 coincidencias SHA sin deduplicación automática. Blob continúa suspendido.
