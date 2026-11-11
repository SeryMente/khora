<!-- TASK_VERSION=1.4; TASK_STATUS=ACTIVE; PARENT=CUSTODIA-01; NOT_INDEPENDENT_CONTROL=true -->
# CUSTODIA-01 · Archivo de todos los registros recuperables

> **Estado:** EN CURSO · **Prioridad:** P0 · **Único expediente activo del frente CUSTODIA.**  
> **OCP padre:** [OBJETO-CANONICO.md](../../OBJETO-CANONICO.md).  
> **Control de responsabilidad:** [CONTROL-RESPONSABILIDAD.json](../../CONTROL-RESPONSABILIDAD.json).  
> **Índice provisional:** [LISTA-TAREAS-PROVISIONAL.md](../../LISTA-TAREAS-PROVISIONAL.md).

## 1. Objetivo vigente

Archivar todos los registros históricos de dictado/captura que puedan archivarse con el contenido existente, la titularidad comprobada y las autorizaciones aplicables. Al cerrar, deben quedar pendientes únicamente los registros que no puedan archivarse en este momento por un impedimento concreto y documentado.

El alcance es operativo y acotado al archivo de los registros que el sistema alcanzó a conservar. No incluye auditoría general de resiliencia, pruebas de nuevos dictados, escenarios sintéticos de fallo, reparación general de producto, rediseño de arquitectura ni certificación de que KHORA no pierde datos.

## 2. Reglas de archivo

1. Archivar cada unidad elegible sin duplicar Volcados ya existentes y sin sobrescribir la fuente.
2. Verificar cada resultado persistido con la lectura de vuelta y los cotejos disponibles; no considerar suficiente la respuesta HTTP ni un estado escrito en metadatos.
3. Mantener el estado de cada componente por separado: texto/checkpoint, cada parte de audio y MP3. Una parte archivada no convierte automáticamente toda la captura mixta en archivada.
4. Si hay transcripción y no se localiza audio, archivar el texto sin audio, con `Audio: No localizado` y `Procedencia: No verificada`. No afirmar que fue copy/paste ni inferir su origen.
5. Un objeto Vercel Blob localizado pero bloqueado por suspensión/cuota no equivale a audio inexistente. Debe permanecer registrado como existente/bloqueado; no marcarlo `No localizado`.
6. Para los 216 fragmentos locales de las dos sesiones identificadas, aplicar el mecanismo de KHORA, transferir a B2 y cotejar bytes/longitud/SHA antes de vincularlos; conservar intactos los originales locales. La decisión C fue autorizada expresamente por el operador.
7. No archivar bajo la cuenta del operador sesiones de otros titulares ni registros sin titularidad demostrada. No usar `reclamarSesion()` como prueba de titularidad histórica.
8. Excluir lo que ya está correctamente archivado y deduplicar por vínculos/identidad comprobable.
9. No inventar texto, audio, procedencia, titularidad, UUID, ID de Volcado, URL, SHA, tamaño ni estado de verificación.

## 3. Secuencia interna de CUSTODIA-01

Las siguientes fases son subunidades del expediente existente. No crean IDs maestros adicionales ni folios.

### CUSTODIA-01.a · Conciliación de candidatos y exclusiones · EN CURSO

- Reunir sesiones, texto, revisiones, partes, MP3, localizadores, snapshots y Volcados.
- Confirmar propietario y excluir archivados/duplicados.
- No utilizar el monitor, Chrome local ni RDC para esta retoma, por instrucción posterior expresa del operador. La evidencia local ya identificada se preserva sin inspeccionarla por esos canales; solo se retomará con una vía independiente expresamente permitida.
- Tratar los conteos heredados como línea base reportada hasta su nueva lectura.

### CUSTODIA-01.b · Archivo de texto sin audio localizado · BLOQUEADA POR CONTEXTO NEXTAUTH INDEPENDIENTE

- Archivar las transcripciones elegibles aunque no se localice audio, conforme a la instrucción del operador.
- Marcar audio como `No localizado` y procedencia como `No verificada`.
- No atribuirles origen copy/paste, voz ni otro canal sin evidencia.

### CUSTODIA-01.c · Archivo de audio B2 · PREVALIDADA, GET HISTÓRICO PENDIENTE

- Leer los objetos B2 de las sesiones elegibles.
- Cotejar bytes, longitud y SHA-256 del objeto leído frente al manifiesto y los datos de Neon.
- Archivar y vincular cada sesión/parte solo después del cotejo requerido.
- Si un objeto no se puede leer o no coincide, conservarlo como pendiente con el motivo preciso.

### CUSTODIA-01.d · Archivo de audio local autorizado (decisión C) · BLOQUEADA POR CANAL LOCAL EXCLUIDO

- Procesar los 216 fragmentos cifrados de dos sesiones con el mecanismo de descifrado propio de KHORA.
- No exponer claves ni texto/audio en logs o documentación.
- Escribir los objetos en B2 y validar la copia con read-back, longitud y SHA-256.
- Vincularlos a las sesiones correspondientes y preservar todos los registros/bytes locales originales.

### CUSTODIA-01.e · Casos con bloqueo actual · EN CURSO

- Mantener identificados los objetos Vercel Blob que existen por referencia/listado pero no se pueden leer por suspensión/cuota.
- Mantener pendientes los registros con referencias B2 no cotejadas físicamente.
- Mantener separados los registros sin propietario demostrado y los que pertenecen a otros titulares.
- No convertir un bloqueo temporal en irrecuperabilidad ni borrar evidencia.

### CUSTODIA-01.f · Cierre de archivo y residuales · PENDIENTE

- Para cada registro, consignar estado final de archivo, componentes incluidos/faltantes, vínculos, prueba de lectura de vuelta y fecha.
- Retirar del conjunto pendiente solo los registros cuyo archivo haya sido verificado.
- Dejar como residuales únicamente los registros con impedimento actual, individualizado y sustentado, o sin contenido/titularidad demostrables.
- Conciliar el resultado con «Recuperar capturas»: archivados fuera, parciales/bloqueados visibles con el estado real y sin duplicaciones.

### Estado operativo vigente · 2026-11-11

| Fase | Estado actual | Dependencia/criterio inmediato |
|---|---|---|
| 01.a | EN CURSO | Conciliación remota de fuentes y titularidad; sin acceso a Chrome/monitor/RDC. |
| 01.b | BLOQUEADA | Falta un contexto NextAuth del propietario por un canal independiente permitido. El candidato textual ya está individualizado; requiere GET/descifrado/SHA, POST canónico y read-back. |
| 01.c | PREVALIDADA · GET PENDIENTE | El preflight Production mostró PASS de autenticación/configuración B2; falta GET físico por objeto y cotejo de bytes, longitud y SHA histórico. |
| 01.d | BLOQUEADA | Los 216 fragmentos locales están identificados y la autorización previa se conserva, pero no se accederá a ellos mediante monitor, Chrome local o RDC. Falta un canal alternativo permitido. |
| 01.e | EN CURSO | Consolidar impedimentos actuales por registro y componente, sin llamar perdido a Blob bloqueado. |
| 01.f | PENDIENTE | Cierre tras verificar Volcados, vínculos y residuales del inventario completo. |

La autenticación de usuario, el GET físico B2 y el acceso a IndexedDB local son compuertas distintas. No se agrupan como un único bloqueo de «runtime».

## 4. Estados de salida

| Estado | Criterio |
|---|---|
| ARCHIVADO_VERIFICADO | Volcado/vínculos persistidos y lectura de vuelta cotejada para los componentes archivados. |
| PARCIAL_ARCHIVADO | Se archivó un componente (por ejemplo, texto), pero otro componente de la misma captura sigue pendiente. |
| BLOQUEADO_AHORA | El contenido existe/localizador confirmado, pero un impedimento actual impide completar su archivo. |
| PENDIENTE_TITULARIDAD | Hay contenido o referencia, pero no está probada la titularidad que permita archivarlo bajo esta cuenta. |
| PENDIENTE_INTEGRIDAD | Existe referencia, pero falta lectura física o cotejo de integridad. |
| SIN_CONTENIDO_LOCALIZADO | Solo queda metadata/telemetría o no se localizó contenido tras inspeccionar fuentes pertinentes. |
| IRRESOLUBLE_EN_ESTE_MOMENTO | Se agotaron los pasos permitidos y el impedimento concreto impide archivarlo ahora; mantener evidencia y no borrar fuentes. |

Los estados se asignan por registro y por componente; no se infiere el estado de audio a partir del texto ni viceversa.

## 5. Límites y compuertas

- No auditar resiliencia general, probar nuevas capturas ni ejecutar fault injection/E2E ajenos al archivo histórico.
- No reparar código, UI, proveedor o datos como parte de este objetivo. Si el archivo requiere una modificación de producto no comprendida en el control vigente, documentar el bloqueo y no implementarla por inferencia.
- No migrar el histórico Vercel Blob a B2 como tarea de proveedor independiente; el objetivo es archivar registros elegibles. Los objetos Blob bloqueados permanecen intactos.
- No borrar ni sobrescribir fuentes locales, B2, Blob o Neon.
- La respuesta afirmativa del operador a la ampliación de autorización se registra en el OCP-v0.47 y en `CONTROL-RESPONSABILIDAD.json`, generación 11. Autoriza ejecutar el archivo de las sesiones elegibles de su cuenta, incluidas las escrituras de archivo en Neon Production, los read-back B2 y el procesamiento de las dos sesiones locales, dentro de este expediente.
- La autorización no permite borrar/sobrescribir originales, atribuir otros titulares, inspeccionar el perfil Chrome excluido, crear claves B2 adicionales ni mezclar credenciales EP.
- Eficiencia: agrupar consultas y lotes; reutilizar cotejos trazables de objetos inmutables; continuar ante fallos individuales. No omitir titularidad, no duplicación, SHA/longitud/bytes al copiar, idempotencia, read-back del archivo y preservación de fuentes.

## 6. Criterio de cierre

CUSTODIA-01 se resuelve cuando todos los registros elegibles están archivados y verificados, los ya archivados/duplicados están excluidos y solo quedan registros imposibles de archivar en el momento del cierre por bloqueos concretos y documentados, falta de titularidad o ausencia confirmada de contenido. Los bloqueos temporales se describen como actuales, no como pérdidas definitivas.

**Resultado final requerido:** archivo máximo no destructivo de todo lo recuperable con los medios y permisos vigentes, acompañado de una relación exacta de los únicos residuales que no se pueden archivar ahora.

## 7. Autorización operativa y eficiencia

La autorización específica de ejecución quedó confirmada por el operador en respuesta a la pregunta formal previa. Se conserva el literal y contexto en el OCP-v0.47 y en el original vinculado. La tarea puede avanzar con escrituras de archivo en Neon Production para registros elegibles, procesamiento de los 216 fragmentos locales y operaciones B2 incluidas en el alcance. La instrucción posterior del operador excluye expresamente el uso de su monitor, Chrome local y RDC; por ello, la autorización sobre los 216 fragmentos no se ejecutará a través de esos canales. La fase 01.d permanece bloqueada hasta disponer de un medio alternativo permitido, sin que esto revoque la autorización de preservación/archivo.

La optimización solicitada consiste en minimizar llamadas y rondas redundantes, agrupar lecturas y lotes, reutilizar evidencia de integridad cuando corresponda al mismo objeto inmutable y aislar fallos por registro. La calidad se conserva mediante controles críticos: titularidad, deduplicación, integridad de copias, idempotencia, lectura de vuelta y preservación de originales. No se realizan reparaciones generales ni pruebas de resiliencia.


## 8. Ejecución autorizada · resultado del primer intento

Revalidación Neon: 78 sesiones pendientes; 44 con audio remoto (1.039 partes: 785 B2 y 254 Blob); 34 sin partes remotas, de las que dos tienen audio local (216 fragmentos) y 32 no tienen audio local/remoto localizado. En estas 32, 27 tienen SHA de texto no vacío/no compuesto solo por salto de línea y son candidatas a archivo textual; cinco no muestran texto significativo por SHA. No se descifró contenido.

**Bloqueo:** el conector Vercel oculta los valores sensibles de `X_KHORA_KEY` y de la Master Application Key B2 (`decrypted=false`); las rutas canónicas requieren sesión autenticada. No se hicieron inserciones manuales en Neon porque eludirían el flujo de `guardarDictado()`. Blob sigue suspendido. Ningún Volcado nuevo fue creado en este intento.

La autorización del operador está registrada y no necesita repetirse. La próxima acción es ejecutar el archivo desde el runtime KHORA autenticado, manteniendo los controles mínimos y agrupando lotes.


## 9. Localización de la clave KHORA y bóvedas EP

X_KHORA_KEY es la clave criptográfica de KHORA Web, independiente de la contraseña maestra de EP Vault y LastPass. El runbook histórico indica que KHORA_API_KEY se provisiona como alias X_KHORA_KEY; la bóveda KHORA contiene ese nombre, pero sigue cifrada y no se verificó que el valor coincida con producción.

Se localizaron la bóveda EP y copias cifradas R1/R2. La arquitectura efectiva es ep-medio-architectura.md v1.0.4 / NX-326m; EP-ARCHITECTURE.md es solo una redirección. No se localizó sesión DPAPI vigente ni notas DPAPI en las rutas inspeccionadas; la GUI EP Vault está disponible pero SELLADA. No se realizó fuerza bruta ni se sobrescribió ciphertext.

Siguiente paso seguro: si el operador recuerda la contraseña EP, introducirla en la GUI local; después consultar nombres de variables sin revelar valores y usar KHORA_API_KEY en un proceso hijo de allowlist exacta. Nunca copiar la contraseña maestra al chat ni imprimir los valores. La evidencia está en evidencias/LOCALIZACION-CLAVE-KHORA-EPVAULT-20261110.md.

Esta búsqueda no constituye archivo de datos CUSTODIA ni elimina el bloqueo de ejecución del objetivo principal.


## 10. Bóveda web KHORA: PIN y estado de GitHub

La salida de Seguridad mostró Control MCP generación #1, dos Bearer Tokens manuales activos con scopes efectivos runtime:read, volcados:read, norm:turn y último uso Nunca; bóveda web cerrada; capacidad local 1 expirada/0 activas. No se usaron, emitieron ni revocaron tokens.

El código de producción demuestra que Restablecer PIN actualiza únicamente el hash Scrypt/sal y crea una cookie temporal de 30 minutos; no rota X_KHORA_KEY ni re-cifra registros. El PIN es una puerta web, no la raíz criptográfica. GitHubSecretsPanel separa norm y ep y expone solo estado configured/updatedAt. Leer el token ep requiere un token de sesión EP con scopes ep:bootstrap y ep:github:read.

El restablecimiento de PIN queda como alternativa; no es necesario para la prueba EP del §11 y no se ha ejecutado. La ruta prioritaria es la sesión EP nueva y lectura de solo lectura de la credencial ep. No compartir PIN/token, no revocar Control MCP, no rotar la clave. Evidencia: evidencias/ESTADO-BOVEDA-WEB-KHORA-20261110.md.


## 11. Próximo paso: lectura EP autenticada sin revelar la credencial

La fuente actual khora-web/lib/server/ep.ts incluye ep:github:read en sesiones EP nuevas. El endpoint POST /api/ep/github-credential requiere ep:bootstrap + ep:github:read, valida el propietario y descifra exclusivamente la credencial ep almacenada. Puede comprobarse si X_KHORA_KEY aún permite abrir el ciphertext.

El operador debe emitir una sesión EP nueva desde Entorno Persistente; esto revoca la sesión EP anterior, no los Bearer Tokens manuales MCP. Después se consumirá el JWT solo en memoria local contra ese endpoint y se emitirá únicamente OK/código de error. No pegar el token en el chat. No ejecutar el comando de bootstrap ni crear VHDX/deploy. OCP §22.


## 12. CUSTODIA-01.j · Backlog de dependencia criptográfica de Recuperar capturas

**Estado:** BACKLOG · NO ACTIVO · NO IMPLEMENTADO.  
**OCP:** §24.  
**Evidencia:** [DEPENDENCIA-X-KHORA-KEY-CATALOGO-RECUPERACION-20261110.md](../../evidencias/DEPENDENCIA-X-KHORA-KEY-CATALOGO-RECUPERACION-20261110.md).  
**Instrucción:** [INSTRUCCION-BACKLOG-DEPENDENCIA-X-KHORA-KEY-20261110.md](../../originales/INSTRUCCION-BACKLOG-DEPENDENCIA-X-KHORA-KEY-20261110.md).

### Hallazgo

El catálogo de Recuperar capturas descifra los snapshots de Neon para crear título/vista previa/metadatos de las tarjetas. Si `X_KHORA_KEY` falta o no coincide, la construcción del catálogo puede terminar en `503 catalogo_no_disponible`, aunque las filas y ciphertext continúen almacenados. Revisiones, lectura de checkpoints y recuperación también necesitan descifrar snapshots.

La misma llave es raíz criptográfica de los helpers AES-256-GCM de KHORA para texto y bytes. En los call sites revisados cubre checkpoints/snapshots, audio por partes, MP3, texto/versiones de Volcados y credenciales GitHub. Los registros nuevos que pasen por esas rutas requieren la llave vigente en el servidor para escribir y, más tarde, leer. No se afirma que cada metadato o fila de Neon esté cifrado.

### Separación respecto de Blob

- Blob suspendido: impide descargar físicamente objetos legacy.
- X_KHORA_KEY ausente/divergente: impide descifrar snapshots y bytes cifrados KHC1, incluso cuando el objeto se obtiene desde B2.
- Falta de revisión y falta de titularidad: causas distintas que la llave no corrige.

### Acciones de backlog

1. Confirmar por una prueba autenticada y sin exponer el secreto si Production conserva la misma llave de los ciphertext existentes.
2. Recorrer el catálogo y sus revisiones por páginas, conciliando con los registros persistidos.
3. Clasificar cada caso por causa y componente; no confundir 503 de catálogo, falta de revisión, Blob inaccesible o titularidad.
4. Evaluar una propuesta de producto para aislar un snapshot no descifrable y evitar que una tarjeta haga fallar toda una página. No implementar sin autorización específica.
5. Preservar la llave actual y los ciphertext; no rotar, reemplazar, regenerar ni re-cifrar.

**No ejecutado:** no hubo consulta productiva, cambio de entorno, ejecución de endpoint, lectura de objetos ni modificación de código/datos.


## 8. Dependencias condicionales y guardrails

- La búsqueda de X_KHORA_KEY en las dos bóvedas autorizadas no es una fase independiente. Solo se activa si una unidad elegible demuestra un fallo de descifrado atribuible a esa llave. No rotar ni reemplazar la llave.
- Restablecer el PIN no recupera X_KHORA_KEY y no es una tarea de CUSTODIA-01.
- La lectura de credencial GitHub/EP no es necesaria para archivar registros de dictado y no bloquea el sprint; se retira de la secuencia activa.
- El backlog de dependencia del catálogo respecto de X_KHORA_KEY queda separado y no activo; no implementar cambios de producto dentro de CUSTODIA-01.




## 13. Reconciliación R3 y prueba de ejecución por servidor · 2026-11-11

**Evidencia:** [RECONCILIACION-NEON-Y-RUNTIME-SERVIDOR-20261111-R3.md](../../evidencias/RECONCILIACION-NEON-Y-RUNTIME-SERVIDOR-20261111-R3.md).  
**OCP vigente:** §33 / CUSTODIA-v0.66.  
**Índice ejecutivo:** [LIST_VERSION 0.54](../../LISTA-TAREAS-PROVISIONAL.md).

Este apartado actualiza el estado operativo; los conteos en apartados anteriores se conservan como historia, no como corte vigente.

### 13.1 Titularidad e inventario

Se aplicó el predicado completo `COALESCE(custodia_owner, checkpoint_usuario, volcado.usuario)`. El universo comprende 95 sesiones: 84 con propietario directo en sesión/checkpoint y 11 ya enlazadas cuyo titular se demuestra por `volcado.usuario`. Hay 16 sesiones enlazadas a Volcado (13 `archivado`, 3 `en_revision`) y 79 sin vínculo. No se reprocesan las 16 enlazadas.

Las 79 pendientes conservan 1.039 partes: 785 B2 en cinco sesiones y 254 Blob en 39 sesiones. Hay 34 sesiones textuales sin audio (29 checkpoints vigentes potencialmente significativos, cuatro vacíos y uno solo con salto de línea) y una sin checkpoint/texto ni audio localizado.

### 13.2 Prueba de runtime

Se transfirieron al sandbox Vercel efímero los módulos canónicos de Production y se cotejaron sus SHA con `main`. La importación de las funciones de archivo, almacenamiento, cifrado y custodia pasó. El sandbox se detuvo al terminar.

No se pudieron ejecutar las operaciones: los secretos de Production (KHC1 y Master B2) no fueron entregados por la conexión Vercel (`decrypted=false`), y el sandbox no poseía identidad NextAuth del titular. Se usó una conexión temporal Neon únicamente para SELECT; se confirmaron 36 columnas requeridas y el inventario. No se llamó a `guardarDictado()` ni a `reclamarSesion()`; no se ejecutó GET/read-back B2/Blob; no se escribieron datos.

### 13.3 Estado actualizado por fase

| Fase | Estado R3 | Criterio pendiente |
|---|---|---|
| 01.a Conciliación de candidatos | EN CURSO | 95 atribuibles; 16 enlazados excluidos; 79 pendientes individualizados |
| 01.b Texto sin audio | BLOQUEADA | Acceso de runtime a X_KHORA_KEY y contexto de propietario; ejecutar guardarDictado/read-back |
| 01.c Audio B2 | BLOQUEADA POR ACCESO | GET físico de 785 partes, descifrado y cotejo bytes/longitud/SHA; resolver índice 317 |
| 01.d Audio local autorizado | BLOQUEADA POR CANAL EXCLUIDO | 216 fragmentos preservados; no usar monitor, Chrome local ni RDC |
| 01.e Residuales | EN CURSO | GET Blob de 254 partes; no marcar como perdido por bloqueo actual |
| 01.f Cierre | PENDIENTE | Solo cerrar tras Volcados, vínculos y read-back verificados |

### 13.4 No-acciones y dictamen

No hubo cambios de código, deployment, credenciales, variables, configuración B2, tablas, datos productivos, Volcados, Blob ni objetos B2. No hubo merge. El control de responsabilidad generación 11 permanece intacto. El sandbox fue detenido.

La tarea **no está archivada ni cerrada**. El inventario completo y la ruta de código están conciliados, pero el acceso a las claves sensibles y la identidad del titular no estuvieron disponibles para ejecutar el archivado canónico. Las partes B2/Blob y el audio local conservan sus estados residuales por separado. No se sustituye autorización de propietario por el rol de Neon ni se omiten los controles canónicos.


## 14. Verificación del worker secundario y bloqueo del archivo primario · 2026-11-11

**Evidencia:** [R4 · ruta de ejecución secundaria](../../evidencias/RUTA-EJECUCION-SECUNDARIA-NO-ARCHIVADO-20261111-R4.md).  
**OCP:** §34 / CUSTODIA-v0.67.  
**Lista:** §20 / LIST_VERSION 0.55.

### Objetivo del ciclo

Identificar si un ejecutor de servidor ya existente podía archivar los checkpoints huérfanos respetando la identidad del propietario, el cifrado canónico y la procedencia.

### Tareas verificadas

1. Revisar el worker CLI y sus funciones llamadas.
2. Contrastar la ruta auxiliar autenticada y la ruta primaria de archivo.
3. Verificar el estado de activación versionado y metadata Vercel disponible.
4. Registrar la conclusión y las no-acciones con lectura de vuelta documental.

### Resultado

El worker `scripts/custodia-worker.ts` no es un archivador primario: llama a `reconciliarCustodia()`, que genera/reconcilia MP3 a partir de audio ya verificado y procesa tareas secundarias de título/espejo para Volcados existentes. No invoca `guardarDictado()` ni `reclamarSesion()`. La ruta `POST /api/dictado/reconciliar` también requiere NextAuth y solo activa esa reconciliación secundaria.

El archivo primario continúa pasando por `POST /api/dictado`, que obtiene el correo de NextAuth, valida la pertenencia con `reclamarSesion()` y persiste con `guardarDictado()`. No se sustituye esa identidad por el rol de Neon, por el correo leído de forma aislada ni por la identidad genérica de un proceso.

La documentación declara que el worker no se arranca con build/instalación y que no hay servicio/cron productivo activado. No se encontró comando npm para iniciarlo ni `vercel.json` en la raíz o en `khora-web/`. No se ejecutó el worker porque su modo de ejecución puede procesar MP3, títulos y espejos de varios titulares sin archivar los checkpoints de CUSTODIA-01.

### Estado y límite

CUSTODIA-01 sigue EN CURSO. El inventario R3 permanece: 95 sesiones atribuibles, 16 enlazadas, 79 sin Volcado, 1.039 metadatos de partes de audio, 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. No hubo Volcados nuevos, lecturas físicas B2/Blob ni escrituras productivas. Tampoco hubo acceso a monitor, Chrome local o RDC.

El siguiente paso requiere un contexto de ejecución de archivo primario formalmente autorizado, con clave KHC1, credenciales de almacenamiento necesarias y acreditación del titular. Si ese contexto no está disponible, no se fuerza la ejecución ni se marca como completado el registro.


## 15. Ruta de archivo primario y credencial de servicio · 2026-11-11

**Evidencia:** [R5 · archivo primario/API de servicio](../../evidencias/RUTA-ARCHIVO-PRIMARIO-Y-LIMITE-DE-API-SERVICIO-20261111-R5.md).  
**OCP:** §35 / CUSTODIA-v0.68.  
**Lista:** §21 / LIST_VERSION 0.56.

### Objetivo del ciclo

Encontrar una ruta de servicio distinta de NextAuth que cree un Volcado canónico desde un checkpoint huérfano conservando titularidad, cifrado, manifiesto, vínculo e idempotencia.

### Tareas ejecutadas

1. Rastrear los llamadores de `guardarDictado()` y `archivarVolcado()`.
2. Revisar `POST /api/volcado` y el contrato de identidad que utiliza.
3. Revisar las rutas de checkpoint/recuperación y distinguirlas de la creación de Volcado.
4. Revisar `KHORA_API_KEY`/ `X-Khora-Key`, `/api/v1/ingesta`, `/api/ingesta` y los scripts de reparación.
5. Registrar evidencia y lectura de vuelta sin ejecutar operaciones de negocio.

### Resultado

`POST /api/dictado` continúa siendo el único escritor canónico enlazado a sesión y exige NextAuth, `reclamarSesion()` y `guardarDictado()`. `POST /api/volcado` puede crear texto cifrado, pero no acepta ni vincula sessionId/revisionId/manifiesto y genera un ID nuevo por llamada; no se utiliza para las sesiones CUSTODIA porque perdería trazabilidad y permitiría duplicados.

La API key del puente FastAPI solo permite la ingesta secundaria en Neo4j de un Volcado/version/SHA ya existentes. No crea el Volcado primario en Neon ni demuestra identidad del propietario. El endpoint de checkpoint y recuperación sigue bajo NextAuth y no crea Volcados.

### No-acciones y estado

No se llamó a ningún endpoint, script reparador o worker. No hubo secretos/plaintxt leídos, escrituras, Volcados nuevos, GET B2/Blob, cambios de código/configuración/Production, merge o deployment. No se usó monitor, Chrome local ni RDC.

El inventario no cambia: 95 sesiones atribuibles, 16 enlazadas excluidas, 79 sin Volcado, 1.039 partes de audio por metadata, 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. CUSTODIA-01 permanece EN CURSO.

### Compuerta siguiente

Comprobar si el runtime Production dispone de identidad de titular y acceso server-side aprobado a KHC1/almacenamiento desde un canal no interactivo. No crear una credencial, token o ruta de servicio nueva por inferencia; no exponer secretos al chat; no utilizar el rol Neon como identidad de usuario. Si esa ruta no existe, conservar el bloqueo individualizado.


## 16. Identidad y secretos server-side en Production · 2026-11-11

**Evidencia:** [R6 · barrera de runtime Production](../../evidencias/BARRERA-RUNTIME-PRODUCTION-IDENTIDAD-Y-SECRETOS-20261111-R6.md).  
**OCP:** §36 / CUSTODIA-v0.69.  
**Lista:** §22 / LIST_VERSION 0.57.

### Objetivo del ciclo

Comprobar, sin revelar secretos ni utilizar la interfaz local, si Production ofrece una identidad no interactiva del titular junto con acceso autorizado a KHC1 y almacenamiento.

### Tareas ejecutadas

1. Leer solo metadatos de variables Vercel Production con `decrypt=false`.
2. Rastrear el uso en código de `INTERNAL_TRIGGER_SECRET`.
3. Verificar los workflows programados asociados al secreto.
4. Consultar logs runtime/daemon en la ventana admitida por la retención.
5. Registrar qué prueba y qué no prueba cada resultado.

### Resultado

Las variables nominales de KHC1, B2, `AUTH_SECRET`, `DATABASE_URL`, `KHORA_API_KEY`, `X_KHORA_KEY` e `INTERNAL_TRIGGER_SECRET` están registradas en Production. Sus valores secretos no son legibles por el conector (`decrypted=false`). La presencia nominal no demuestra validez del par de credenciales o acceso físico al objeto.

El trigger interno se limita a Jules y al orquestador del tablero. Los workflows programados hallados llaman esos endpoints, no Custodia. En los últimos 30 minutos no se devolvieron runtime logs ni daemon logs; la consulta de 7 días fue rechazada por límite de retención. Esto no se interpreta como ausencia histórica de procesos.

No se obtuvo identidad NextAuth del titular ni existe un canal de ejecución autorizado que combine esa identidad con KHC1 y el almacenamiento. No se intentó emitir o fabricar una sesión, reutilizar el trigger interno o extraer secretos.

### No-acciones y estado

No se descifraron/mostraron secretos, no se invocaron endpoints ni workflows, no hubo escrituras, lecturas físicas B2/Blob, Volcados nuevos, cambios de producto, configuración o deployment. No se usaron monitor, Chrome local ni RDC.

El inventario permanece en 95 sesiones atribuibles, 16 enlazadas excluidas, 79 sin Volcado, 1.039 partes de audio por metadata, 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. CUSTODIA-01 continúa EN CURSO.

### Compuerta siguiente

Revisar mecanismos de identidad/ejecución server-side ya documentados por KHORA/EP para determinar si alguno proporciona titularidad verificable en runtime productivo. No crear ni activar credenciales o rutas por inferencia. Si no existe, cerrar el diagnóstico de acceso y mantener los residuales individualizados, bloqueados por causa concreta.


## 17. OAuth/MCP no aporta identidad de servicio ni permiso de archivo CUSTODIA · 2026-11-11

**Evidencia:** [R7 · contratos OAuth/MCP](../../evidencias/MCP-OAUTH-SCOPES-Y-AUSENCIA-DE-ARCHIVO-20261111-R7.md).  
**OCP:** §37 / CUSTODIA-v0.70.  
**Lista:** §23 / LIST_VERSION 0.58.

### Objetivo del ciclo

Comprobar si los mecanismos OAuth/MCP existentes permiten ejecutar archivo CUSTODIA como titular o mediante un actor delegado, sin reutilizar la interfaz local.

### Tareas ejecutadas

1. Revisar la matriz activa de herramientas/scopes MCP.
2. Contrastar los handlers de lectura de Volcados con los escritores de archivo.
3. Revisar la base de datos utilizada por MCP en Production.
4. Examinar emisión de tokens manuales y flujo OAuth Authorization Code/PKCE.
5. Confirmar la separación entre propuestas históricas y permisos implementados.

### Resultado

El contrato vigente expone 24 herramientas. Los scopes son lectura de Volcados/runtime, ciclo normativo y Jules read/write. No hay herramientas ni scopes de escritura CUSTODIA, volcados:write o dictado:write. Las herramientas de Volcados utilizan getMcpReadOnlyDb(); en Production, KHORA_READONLY_DATABASE_URL es obligatoria.

Los scopes custodia:metadata:read y custodia:integrity:verify solo aparecen en documentación histórica/propuestas, no en el contrato productivo activo. La emisión de OAuth y tokens manuales requiere sesión NextAuth del actor; el token queda ligado a ese sujeto y no lo convierte en una identidad de servicio.

MCP normativo permanece DESACTIVADO. La inspección fue estática: no se llamó al servidor MCP/OAuth, no se creó ni consultó un token y no se accedió a cookies/sesiones.

### Dictamen y no-acciones

No existe en el contrato vigente una herramienta de archivo primario que cree y enlace un Volcado desde un checkpoint huérfano. Tampoco existe actor no interactivo acreditado. La ruta canónica continúa siendo POST /api/dictado, con NextAuth del titular, reclamarSesion() y guardarDictado().

No hubo escrituras de negocio, Volcados nuevos, lecturas físicas B2/Blob, cambios de scopes, código de producto, configuración o deployment. No se usaron monitor, Chrome local ni RDC. El inventario permanece: 95 sesiones atribuibles, 16 enlazadas excluidas, 79 sin Volcado, 1.039 partes de audio por metadata, 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. CUSTODIA-01 sigue EN CURSO.

### Compuerta siguiente

Individualizar las 79 sesiones pendientes según la evidencia ya disponible y el bloqueo específico: titularidad/procedencia, checkpoint/manifest, clave KHC1, objeto B2/Blob y verificación física, o contenido fuente. Solo se considerarán ejecutables las unidades con identidad y contenido demostrables y un canal de ejecución autorizado; no se completarán vacíos mediante inferencias.
