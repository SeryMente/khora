<!-- INVENTARIO_VERSION=0.5; INVENTARIO_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Inventario provisional de hallazgos · Recuperabilidad en Ingresos → Dictado → Recuperación

> **ESTADO: PROVISIONAL · INVESTIGACIÓN ABIERTA · RECUPERABILIDAD PRODUCTIVA NO CERTIFICADA.** Este archivo es una materialización de evidencia dentro del OCP de Custodia; no es un OCP adicional ni una segunda fuente de estado. El núcleo vivo es [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).

- **Frente propietario:** CUSTODIA.
- **Versión de este inventario:** 0.5.
- **Ciclo previo:** CUSTODIA-INV-RECUP-SES-20261028-R6K2M9Q4.
- **Ciclo de ampliación por incidente:** CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004.
- **Ciclo de ampliación de tareas:** CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005.
- **Ciclo de ejecución parcial:** CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C007; corrección propuesta en rama `fix/custodia-recovery-reconcile-20261028`, commit `95d7bbf2cbe0bb89b6d8ff01135438152ec8201d`, PR [#339](https://github.com/SeryMente/khora/pull/339) en borrador, no fusionada ni desplegada.
- **Folio activo:** SES-20261028-R6K2M9Q4; control en generación 2.
- **Fecha del registro:** 2026-10-28.
- **Fuente normativa de los ciclos 3–4 (histórica):** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob c364e179e8e9b6a3d566a8e690dfa1a7cce91798.
- **Fuente normativa vigente en C005:** [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html), main; Samantha v358 · NX-358m; Metacanon 1.23; GOW v2.7; blob `89a28e4d05f5baab9c4b86abdb9fbfc532690c75`.
- **Estado de acceso:** las fuentes del código en SeryMente/khora/main se leyeron por GitHub; no se obtuvo el catálogo autenticado de la interfaz ni una lectura de base de datos/objetos de producción.
- **Privacidad:** no se guardan transcripciones, audio, UUID reales de sesiones, cookies, credenciales, URL privadas de objetos ni nombres/títulos reales de las capturas. Los datos locales se resumen por hora, tamaño y resultado técnico únicamente.

---

## 1. Objeto y alcance de la investigación

El objeto de la investigación son **las unidades que aparecen en la interfaz de Khora, pantalla Ingresos → Dictado → Recuperación**. No son intercambiables con cualquier snapshot hallado en IndexedDB. El operador informó inicialmente que la interfaz ofrecía 20 dictados recuperables y posteriormente estimó que podrían ser unos 21; el número exacto debe observarse en esa interfaz y sigue **NO VERIFICADO**.

La garantía que se quiere lograr comprende, por cada unidad recuperable:

1. Preservar el texto capturado y el audio original disponible, aunque haya fallado un punto de guardado o un manifiesto.
2. Distinguir audio realmente ausente de audio que existe pero no está manifestado, no está sincronizado con el corte de texto o no está disponible al leer el objeto remoto.
3. Recuperar mediante una nueva sesión/revisión, sin sobrescribir, sellar, borrar ni sustituir el original.
4. Verificar el efecto persistido y no solo el botón, la petición HTTP, el indicador «recuperable» o el estado almacenado en metadatos.
5. Conciliar cantidad, índices, tamaños, huellas SHA-256, disponibilidad real de los objetos, duración/reproducción decodificable y procedencia, según lo que la unidad conserve.
6. Hacer visibles las partes que no puedan asociarse temporalmente a texto. No inventar alineación si no existe un corte histórico sincronizado.

**Límite esencial:** la presencia de una fila en la interfaz no acredita una recuperación consumada. Un manifiesto vacío tampoco acredita, por sí solo, que los bytes de audio no existan.

### Estados de evidencia utilizados

- **CONFIRMADO EN CÓDIGO:** conducta observable en archivos actuales leídos desde main; no prueba que el despliegue productivo use exactamente esa revisión.
- **OBSERVADO EN COPIA LOCAL:** resultado de lectura técnica de una copia del almacén local; no equivale a una unidad identificada en el catálogo de Recuperación.
- **NO VERIFICADO:** no se obtuvo la fuente requerida o falta cotejo por unidad.
- **HIPÓTESIS / RIESGO:** consecuencia posible derivada del código, pendiente de reproducción end-to-end.
- **REQUISITO DE CORRECCIÓN:** conducta futura exigida para considerar la garantía comprobada; no describe una implementación ya realizada.

---

## 2. Dictamen actual

**Defecto principal confirmado en el código de main:** el sistema usa el manifiesto del snapshot para decidir cuántas partes muestra la interfaz, aunque el catálogo ya consulta un conteo de partes de audio verificadas en la tabla de partes. Durante la recuperación remota, un manifiesto que declara cero puede también limitar a cero las partes copiadas a la nueva sesión.

Esto ofrece una explicación técnica consistente para «Sin audio en este punto guardado» en una unidad que sí conserva audio asociado. No demuestra cuántas unidades de la interfaz están afectadas ni que sus objetos remotos sigan disponibles.

- **Unidades reales del catálogo cotejadas individualmente en este ciclo:** 0. Esto significa «ninguna entrada pudo cotejarse», no que el catálogo esté vacío.
- **Recuperaciones reales completadas en este ciclo:** 0.
- **Recuperaciones reales de producción certificadas por este documento:** 0.
- **Estado del código de corrección:** la propuesta CUSTODIA-04 está en rama aislada/PR de borrador; no está fusionada ni desplegada. No se cambió código, tablas, objetos, credenciales ni configuración de producción.
- **Originales modificados/borrados durante la auditoría local anterior:** ninguno reportado.
- **Estado de la tarea CUSTODIA-01:** EN CURSO; la inspección de código y la auditoría local son avances parciales, no el cierre de la recuperación de las unidades.

---

## 3. Registro de hallazgos de código

### F-01 · La etiqueta «Sin audio» se deriva de un contador de manifiesto

- **Clase:** CONFIRMADO EN CÓDIGO.
- **Fuente:** khora-web/app/components/ingreso/RecoveryDrawer.tsx, blob 3a408e3712d1cbe20578fa5ae923b75b0bc74342.
- **Observación:** la tarjeta muestra el número de partes si choice.audioParts > 0; si no, muestra «Sin audio en este punto guardado». La pantalla no comprueba los objetos de audio al presentar esa etiqueta.
- **Consecuencia:** la frase describe el valor del campo enviado a la tarjeta, no prueba la inexistencia del audio original.
- **Qué falta:** cotejar los registros y objetos reales de cada unidad visible y probar la operación completa de recuperación.

### F-02 · El catálogo remoto calcula audio_count, pero no lo utiliza al construir el resultado

- **Clase:** CONFIRMADO EN CÓDIGO.
- **Fuente:** khora-web/lib/server/custodia-recuperacion.ts, blob 278a479db46e6f2bed72ea7d31f88cc373fa67d1.
- **Observación:** la consulta al catálogo incluye un subquery que cuenta filas de dictado_audio_parte cuyo estado_verificacion es verificado. Sin embargo, al mapear la fila para la interfaz, audioParts se obtiene de s.corteAudio?.hastaParte o de s.audioPartes?.length, no del conteo consultado.
- **Riesgo adicional:** hastaParte es el índice final del corte; no es, por sí mismo, una comprobación de que cada índice exista o de que el objeto remoto pueda leerse.
- **Consecuencia:** un snapshot con manifiesto vacío puede anunciar cero partes aunque la sesión tenga filas de audio. Si se usa el límite del corte como conteo, el valor tampoco sustituye la comprobación de continuidad e integridad.
- **Qué falta:** comprobar la matriz de partes de cada sesión en la base de datos y verificar por lectura cada objeto remoto referenciado.

### F-03 · La recuperación remota puede copiar cero partes cuando el manifiesto tiene cero

- **Clase:** CONFIRMADO EN CÓDIGO; consecuencia productiva todavía NO VERIFICADA.
- **Fuente:** khora-web/lib/server/custodia-recuperacion.ts, blob 278a479db46e6f2bed72ea7d31f88cc373fa67d1.
- **Observación:** la función calcula el total a copiar a partir de original.corteAudio?.hastaParte o de original.audioPartes.length; filtra las partes de la sesión de origen hasta ese total y solo inserta referencias de audio en la sesión nueva si total > 0. Si el snapshot y el corte no declaran partes, el flujo seleccionado no copia las filas de audio existentes más allá de ese límite.
- **Límite del código actual:** el comentario indica que, para snapshots legacy sin corte sincronizado, debe preservarse el manifiesto registrado y no inventar alineación. Esa cautela es correcta respecto de la sincronización, pero no debe convertirse en un falso negativo de existencia ni impedir rescatar el audio sin declarar una alineación que no está acreditada.
- **Consecuencia posible:** puede crearse una nueva recuperación textual sin el audio disponible en la sesión original.
- **Qué falta:** prueba aislada de recuperación con manifiesto vacío y audio real asociado; cotejar fuente y destino, sin sobrescribir ni borrar el origen.

### F-04 · El estado «verificado» no reemplaza una prueba actual de lectura del objeto

- **Clase:** CONFIRMADO EN CÓDIGO acerca del alcance del validador; disponibilidad actual de cada objeto NO VERIFICADA.
- **Fuente:** khora-web/lib/audio/custodia.ts, blob 1628a5841d26941546b58a4d62ef93d0d5e99266.
- **Observación:** evaluarCustodiaAudio valida cantidad/índices consecutivos, duplicados, bytes positivos, formato de SHA-256 y estado de verificación de los registros recibidos. No descarga, lee ni decodifica por sí misma los objetos remotos.
- **Consecuencia:** una tabla de metadatos coherente no demuestra que el objeto siga accesible en el proveedor ni que una secuencia reconstruida se decodifique sin error.
- **Qué falta:** prueba de lectura/descarga de cada objeto, hash contra los bytes leídos y prueba de reconstrucción/decodificación cuando corresponda.

### F-05 · El catálogo local también cuenta el manifiesto, no las filas de audio locales independientes

- **Clase:** CONFIRMADO EN CÓDIGO.
- **Fuentes:**
  - khora-web/app/components/ingreso/IngresoWorkspace.tsx, blob d42f819c2867a678d0d45e309db8f58cad80dc0d.
  - khora-web/lib/client/custodia-local.ts, blob 13129ff0e03f749607631b9c0465230faebcd125.
- **Observación:** snapshotItem fija el contador a x.audioPartes?.length || 0. Los bytes se guardan y recuperan en registros kind="audio" separados de los snapshots en IndexedDB.
- **Observación complementaria:** la ruta local de recuperación sí busca las filas de audio separadas por sessionId y trata de subirlas, pero su catálogo visible sigue derivando el indicador de audio solo del snapshot.
- **Riesgo que necesita prueba:** la copia local de cada fragmento se elimina después de que subirAudioCustodiado devuelve confirmación de parte verificada, antes de completar todas las fases posteriores del punto de recuperación. La subida individual requiere verificado=true, SHA-256 válido y tamaño coincidente, pero falta probar interrupciones entre fragmentos y antes de confirmar la nueva recuperación.
- **Qué falta:** probar fallos/reintentos en la secuencia de recuperación local y verificar que cada fragmento permanezca en algún almacenamiento recuperable hasta que el destino quede validado; no ejecutar esa prueba contra originales reales sin autorización específica.

### F-06 · El contrato del sistema no declara certificación productiva

- **Clase:** CONFIRMADO EN DOCUMENTACIÓN.
- **Fuente:** khora-web/docs/CUSTODIA-DICTADOS.md, blob 661706171cde293d740b7f3480a084fe7825d2d1.
- **Observación:** el contrato declara «IMPLEMENTACIÓN EN RAMA — NO CERTIFICADO EN PRODUCCIÓN» y establece que una intención, un mock, una compilación o una respuesta HTTP no certifican la preservación.
- **Consecuencia:** la inspección estática de main, los resultados locales y la presencia del código no se deben presentar como garantía de que el despliegue actual cumple la misma revisión ni de que la recuperación de cualquier unidad funciona.
- **Qué falta:** correlacionar la revisión desplegada con el código leído y realizar pruebas reales de extremo a extremo con lectura de vuelta.

### F-07 · El mensaje de ausencia de audio y el estado de sincronización son conceptos distintos

- **Clase:** REQUISITO DE CORRECCIÓN a partir del modelo de interfaz actual.
- **Fuente:** RecoveryDrawer.tsx, blob 3a408e3712d1cbe20578fa5ae923b75b0bc74342.
- **Observación:** la interfaz ya distingue el indicador de partes de la etiqueta «Texto y corte de audio vinculados» / «Sin sincronía histórica acreditada», pero la primera etiqueta de audio depende del contador de manifiesto.
- **Conclusión:** la falta de sincronía histórica no debería ocultar que existen bytes de audio. Deben representarse independientemente: existencia de partes, integridad/verificación de partes, disponibilidad real de los objetos y presencia/ausencia de corte sincronizado.
- **Qué falta:** concretar estados de interfaz y criterio de aceptación junto con el cambio de código futuro.

### F-08 · La interfaz y los datos remotos no pudieron cotejarse en este ciclo

- **Clase:** BLOQUEO OBSERVADO.
- **Observación:** los intentos anteriores no consiguieron obtener la respuesta autenticada del catálogo ni consultar directamente la base de datos de producción. La sesión de navegador con la identidad de usuario correcta no pudo controlarse desde el proceso de mantenimiento; las consultas externas de la aplicación protegida devolvieron requisito de autenticación.
- **Consecuencia:** no hay inventario unitario de las capturas reales del catálogo. No se han validado ni descartado objetos remotos.
- **Qué falta:** adquirir el catálogo mediante la sesión autenticada que muestra Recuperación, o usar un acceso de solo lectura autorizado que respete la identidad y el alcance del propietario.

---

### F-09 · La hidratación inicial y la recarga forman listas distintas y pueden contar dos veces la misma sesión

- **Clase:** CONFIRMADO EN CÓDIGO; correspondencia exacta con la lectura 40→20 todavía NO VERIFICADA EN CATÁLOGO REAL.
- **Fuentes:**
  - `khora-web/app/components/ingreso/IngresoWorkspace.tsx`, blob `d42f819c2867a678d0d45e309db8f58cad80dc0d`.
  - `khora-web/app/components/shared/IngresoView.tsx`, blob `59ec9c2e1c7b8ee671770e26b51582fcc6868e37`.
- **Observación:** el efecto automático inicial concatena `localCatalog(local.snapshots)` y `data.items` sin reconciliarlos. La recarga manual usa otra lógica: filtra snapshots locales para sesiones representadas en la página remota con fecha remota igual o posterior y luego recompone la lista.
- **Observación complementaria:** la insignia en Ingreso representa `recoveryItems.length`; no consulta el total único del catálogo.
- **Consecuencia:** el mismo dictado puede aparecer una vez como local y otra como remoto en la hidratación inicial y desaparecer de una de esas representaciones al recargar. El cambio reportado de 40 a 20 es compatible con este defecto.
- **Límite:** no se obtuvo la lista productiva, así que no está probado que las 20 entradas de diferencia sean duplicados, ni que correspondan a capturas perdidas. Hay que cruzar identidades en el catálogo autenticado.
- **Corrección pendiente:** usar una sola función pura y probada para fusionar/deduplicar ambas fuentes en carga inicial, recarga y paginación, sin descartar capturas locales más nuevas ni revisiones históricas.

### F-10 · La insignia indica elementos cargados, no el total global de recuperables

- **Clase:** CONFIRMADO EN CÓDIGO.
- **Fuentes:**
  - `khora-web/lib/server/custodia-recuperacion.ts`, blob `278a479db46e6f2bed72ea7d31f88cc373fa67d1`.
  - `khora-web/app/components/ingreso/RecoveryDrawer.tsx`, blob `3a408e3712d1cbe20578fa5ae923b75b0bc74342`.
  - `khora-web/app/components/shared/IngresoView.tsx`, blob `59ec9c2e1c7b8ee671770e26b51582fcc6868e37`.
- **Observación:** el catálogo remoto usa `limit=20`, consulta hasta 21 para saber si hay otra página, devuelve un máximo de 20 y expresa la continuación mediante `nextCursor`. El panel ofrece «Más capturas anteriores», pero no se devuelve un total global que alimente la insignia.
- **Consecuencia:** «20» puede representar únicamente el conjunto cargado; no prueba que el catálogo completo tenga 20. El indicador cambia además según si se han fusionado las copias locales.
- **Corrección pendiente:** exponer un total global fiable, o renombrar el indicador para expresar exactamente cuántas capturas están cargadas y si quedan páginas.

### F-11 · Dictado ausente después de la última entrada visible comunicada a las 17:08

- **Clase:** INCIDENTE REPORTADO POR EL OPERADOR; existencia de la fila remota y causa raíz NO VERIFICADAS.
- **Fuente original:** `frentes/custodia/originales/INSTRUCCION-INCIDENTE-DICTADO-AUSENTE-2026-10-28.md`.
- **Informe de incidente:** [INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md](INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md).
- **Observación reportada:** el operador esperaba recuperar un dictado hecho hacia el final de una sesión en una terminal de cibercafé; tras abandonar la terminal al finalizar su tiempo de uso y regresar después, no vio la captura en Recuperación. Informó que la última unidad visible data de 2026-10-28 a las 17:08 hora local.
- **Hipótesis que deben distinguirse:** checkpoint remoto nunca confirmado; copia local perdida al limpiar/reiniciar el perfil; sesión bajo otro estado o filtro (incluida sesión archivada); unidad en una página aún no recorrida; fallo de captura/transcripción antes del envío.
- **Límite:** el dato de 17:08 proviene del operador; no se leyó el catálogo real, no se obtuvo el acuse del POST del checkpoint de esa sesión y no se verificó qué datos sobrevivieron al reinicio. No declarar el dictado perdido ni recuperado.
- **Siguiente prueba:** recorrer las páginas autenticadas hasta cursor nulo, buscar la ventana temporal del incidente y revisar Custodia por si la sesión está archivada, siempre en la cuenta propietaria.

### F-12 · La confirmación de persistencia remota es una condición observable, no una garantía inferible del intento local

- **Clase:** CONFIRMADO EN CÓDIGO/CONTRATO; estado de la sesión incidente NO VERIFICADO.
- **Fuentes:**
  - `khora-web/app/components/ingreso/IngresoWorkspace.tsx`, blob `d42f819c2867a678d0d45e309db8f58cad80dc0d`.
  - `khora-web/lib/client/custodia-local.ts`, blob `13129ff0e03f749607631b9c0465230faebcd125`.
  - `khora-web/lib/custodia/contrato.ts`, blob `0ea3251c1270ff2fa988c751e06de6effef4135f`.
- **Observación:** `guardarCheckpoint` intenta conservar primero una instantánea cifrada en IndexedDB local y después ejecuta el POST remoto. Solo marca «Checkpoint confirmado en el servidor» cuando valida la respuesta. Si el POST falla, comunica «Sin confirmación remota; consulta el estado de la copia local».
- **Riesgo:** si el checkpoint remoto no alcanzó acuse y el reinicio eliminó el perfil/datos del sitio, la copia local podría no sobrevivir. El reinicio físico por sí solo no demuestra que el perfil se haya limpiado.
- **Qué falta:** consultar la fila de checkpoint y su hora de recepción en la sesión propietaria; verificar qué política de reinicio/perfil aplicó el cibercafé. No hay prueba de que el checkpoint específico alcanzara o no el servidor.

## 4. Auditoría auxiliar del almacén local — no equivale al catálogo de Recuperación

Esta sección preserva una evidencia técnica obtenida previamente para evitar repetir la inspección, pero **no identifica las unidades reales de la interfaz**. Se inspeccionó una copia de trabajo de IndexedDB en un perfil de Chrome distinto del perfil de mantenimiento. El archivo de origen no se sustituyó ni borró. Las reconstrucciones se generaron en un directorio temporal; no se subieron al servidor ni se usaron para modificar la aplicación.

### Totales agregados observados

- Registros totales del almacén local: **998**.
- Clave de propietario local: **1**.
- Snapshots locales: **5**.
- Revisiones inmutables locales: **0**.
- Registros de audio independientes: **993**.
- Sesiones locales distintas con audio: **5**.
- Sesiones de audio locales sin snapshot asociado dentro de esa copia: **0**.
- Partes que se descifraron con autenticación AES-GCM satisfactoria: **993 de 993**.
- Todos los grupos tenían índices consecutivos 1…N; no se encontraron duplicados ni índices faltantes. Todos los fragmentos tenían metadatos temporales; no aparecieron huecos ni solapamientos superiores a 50 ms en el análisis registrado.
- Tipo de los fragmentos: audio/webm; fuente indicada en metadatos: microphone.
- Volumen total de bytes de fragmentos descifrados: **81.100.193 bytes** (aproximadamente 77,3 MiB).
- Los **5 snapshots** tenían audioPartes.length = 0, pese a que cada sesión tenía filas de audio independientes asociadas localmente. Es evidencia directa de que este patrón de almacenamiento existe al menos en una copia local; no es prueba de que ocurra en cada fila de la interfaz.

### Grupos locales por metadatos y prueba técnica de decodificación

Los tiempos están expresados como se mostraban en la zona horaria local del equipo; no se conservan IDs de sesión ni contenido de texto/audio.

| Fecha/hora local del snapshot | Duración declarada | Caracteres de texto + parcial | Fragmentos | Bytes | Prueba FFmpeg sobre concatenación bruta |
|---|---:|---:|---:|---:|---|
| 22 oct 2026, 17:12:08 | 22 s | 21 | 5 | 316.347 | Código 0, sin diagnósticos |
| 22 oct 2026, 17:35:48 | 1.149 s | 12.075 | 226 | 18.522.003 | Código 0, sin diagnósticos |
| 23 oct 2026, 13:02:59 | 5,485 s | 0 | 2 | 85.249 | Código 0, sin diagnósticos |
| 23 oct 2026, 15:11:22 | 3.607 s | 28.673 | 707 | 57.832.737 | Código 0, pero con avisos repetidos de marcas de tiempo DTS no monótonas |
| 24 oct 2026, 13:35:49 | 270 s | 2.335 | 53 | 4.343.857 | Código 0, sin diagnósticos |

**Límites de esta prueba local:**

1. El retorno 0 de FFmpeg no convierte una concatenación bruta en una prueba de fidelidad integral. El grupo de 707 fragmentos produjo avisos de DTS no monótonas y necesita reconstrucción/re-muxing y validación temporal específicos.
2. Para el grupo de 53 partes, la duración decodificada fue aproximadamente **4:29,45** frente a 4:30 declarados; los metadatos de fragmentos abarcan 269.876 ms. La diferencia exige cautela: no se certifica que todos los instantes del último segmento queden preservados exactamente.
3. En el snapshot local del 23 oct a las 13:02:59, hay 2 partes de audio, pero el total de texto + parcial es cero. Eso constituye un caso local **audio-presente/texto-vacío** que merece clasificación independiente; no prueba que el texto se haya perdido ni corresponde a una unidad identificada del catálogo.
4. El snapshot local de 24 oct a las 13:35:49 se aproxima temporalmente a la unidad que el operador describió en la interfaz como 24 oct, 13:34. La asociación por identidad no se cotejó con la base de datos, así que no se atribuyen esas 53 partes a esa unidad con certeza.
5. Estos datos muestran que las partes locales pueden sobrevivir fuera del manifiesto; no prueban que los objetos remotos existan, que las 20/21 unidades tengan el mismo patrón ni que la recuperación oficial ya funcione.

---

## 5. Registro unitario del catálogo real

**Estado inicial del registro:** todavía no se ha adquirido una copia autenticada del catálogo. No se crean filas ficticias REC-001…REC-021, porque no conocemos el número final de entradas ni sus metadatos visibles.

Por cada entrada real observada se agregará un identificador provisional anónimo (REC-001, REC-002, etc.). No se guardarán la transcripción, el título real ni el audio. Los campos previstos son:

| Campo por unidad | Qué debe comprobarse |
|---|---|
| Referencia anónima y fecha visible | Identificarla sin copiar contenido personal; registrar zona horaria/procedencia |
| Origen mostrado en UI | Servidor / dispositivo local / no determinable |
| Texto del snapshot | Presente, vacío, parcial o ausente; longitud únicamente |
| Manifiesto | Cantidad declarada, corte sincronizado y revisión seleccionada |
| Filas de audio de la sesión | Cantidad total, cantidad con estado verificado y existencia de índices consecutivos |
| Metadatos por fragmento | Bytes, SHA-256, MIME, origen de captura, tiempos y duración |
| Objeto remoto | Lectura real, bytes recibidos y SHA-256 calculado contra el registro |
| Reconstrucción | Orden de partes, huecos/solapamientos, duración decodificada y errores |
| Prueba de recuperación | Identificador destino separado, texto/audio comparados y registro de fuente no alterado |
| Clasificación final | Estado definido en la sección 6 y evidencia/revisión que lo sustenta |

### Clases de resultado por unidad

- **RECUPERADA Y VERIFICADA:** texto y audio original se recuperaron en el destino y el cotejo de integridad/procedencia fue satisfactorio; el original sigue intacto.
- **AUDIO PRESENTE, MANIFIESTO AUSENTE:** hay partes asociadas y verificables, aunque el snapshot no las declare.
- **AUDIO PRESENTE, SIN SINCRONÍA HISTÓRICA ACREDITADA:** se conserva el audio, pero no hay evidencia suficiente para afirmar el alineamiento exacto con el texto/corte.
- **TEXTO PRESENTE, AUDIO NO ENCONTRADO:** tras consultar todas las ubicaciones aplicables, no se encontró audio; debe indicarse el alcance real de la búsqueda.
- **AUDIO PRESENTE, TEXTO VACÍO:** los bytes existen, pero el snapshot no aporta transcripción; se investiga recuperación de texto/revisiones por separado.
- **RECUPERACIÓN PARCIAL:** faltan partes, hay corrupción o la lectura/decodificación no llega al criterio requerido.
- **BLOQUEADA / NO VERIFICADA:** no fue posible acceder a la fuente, correlacionar la unidad o efectuar la prueba.
- **RECUPERACIÓN FALLIDA:** el flujo ejecutado falló; la fuente original se conserva y la falla se documenta.

Ninguna unidad cambia a «RECUPERADA Y VERIFICADA» por tener un botón de recuperación, aparecer en la lista, recibir un HTTP 200 o crear una nueva sesión sin cotejo de bytes.

---

## 6. Requisitos y pruebas que deben cerrar los defectos

### R-01 · Catálogo verdadero

El indicador de interfaz no puede inferir «audio inexistente» a partir de un manifiesto vacío. Debe mostrar por separado el manifiesto histórico y el inventario de partes realmente asociadas, con etiquetas inequívocas para local/remoto y para el estado de sincronización.

**Aceptación:** cada contador visible coincide con el dato que dice representar y no genera un falso negativo para las unidades con audio no manifestado.

### R-02 · Recuperación de audio legacy/no manifestado

La ausencia de corte sincronizado debe impedir afirmar alineación histórica, no impedir recuperar los bytes que existen. La política deberá seleccionar explícitamente las partes recuperables del origen, verificar su continuidad/integridad y etiquetar la sincronización como no acreditada cuando corresponda. Nunca debe inferirse que total = 0 equivale a ausencia de audio sin consultar las filas reales.

**Aceptación:** en un caso controlado de manifiesto vacío con audio existente, la nueva sesión contiene el audio seleccionado, no inventa un corte, y el origen permanece intacto.

### R-03 · Integridad y accesibilidad real

La verificación debe cubrir las propiedades que el sistema afirma: índice, tamaño, SHA-256, estado de verificación, disponibilidad real del objeto remoto y decodificación/reconstrucción del flujo cuando aplique. Debe diferenciar «metadatos coherentes» de «objeto leído y cotejado ahora».

**Aceptación:** la lectura del objeto reproduce los bytes esperados y coincide el SHA-256 registrado; toda discrepancia se refleja como parcial/fallida, nunca como éxito.

### R-04 · Cierre transaccional de la recuperación

La recuperación debe crear un destino separado, preservar procedencia y no borrar ni sustituir originales. Debe ser idempotente y reanudable tras interrupciones en cada fase: subida de fragmento, confirmación del fragmento, checkpoint del texto, creación de la sesión destino y lectura de vuelta.

**Aceptación:** inyectar fallos en puntos intermedios no produce pérdida irrecuperable, duplicados silenciosos ni un destino marcado como completo cuando falta una parte requerida.

### R-05 · Prueba individual sobre el catálogo real

Cada fila de la interfaz debe acabar con un resultado explícito y evidencia minimizada. Si la recuperación se bloquea por autenticación o falta de acceso, se conserva como bloqueada; no se extrapolan resultados de otra unidad.

**Aceptación global:** todas las unidades del catálogo observado tienen registro de estado; toda recuperación declarada completa supera el cotejo de texto, audio, integridad y procedencia, con el original preservado.

---

### R-06 · Fusión local/remota determinista y deduplicación por identidad

La hidratación inicial, la recarga manual y la paginación usan la misma función de reconciliación. Las pruebas cubren una misma sesión presente en local y remoto, una versión local más nueva, sesiones locales sin reflejo remoto y más de una página remota.

**Aceptación:** ninguna sesión se duplica por cambiar de ruta de carga; no se descarta una copia local o versión histórica solo por estar representada en otra fuente.

### R-07 · Semántica exacta del contador y paginación completa

El servicio devuelve un total global verificable, o el indicador comunica «N capturas cargadas» y advierte que hay más cuando `nextCursor` no es nulo. El recuento de entradas cargadas nunca se rotula ni se interpreta como total global.

**Aceptación:** el conteo permanece coherente durante bootstrap, carga inicial, recarga y carga de páginas posteriores; un catálogo con más de veinte elementos se enumera hasta cursor nulo sin saltos ni duplicación.

### R-08 · Resiliencia del checkpoint ante cierre y reinicio de terminal

Pruebas con datos sintéticos interrumpen la petición remota antes de la respuesta, confirman su éxito y luego reinician/cambian el perfil. El estado local y el estado remoto se presentan de forma separada; el sistema no promete recuperación entre perfiles basándose solo en IndexedDB.

**Aceptación:** tras confirmación remota, el punto es recuperable en un perfil de navegador limpio y bajo el mismo propietario; ante falta de acuse o fallo de copia local, la UI hace explícita la condición y mantiene un resultado no confirmado, sin presentar un intento como persistencia demostrada.

## 7. Bloqueos y acciones siguientes

1. **Obtener el catálogo autenticado real de Recuperación.** Es el bloqueo principal para saber si hay 20, 21 u otro número de unidades y cuáles presentan el defecto. Usar la sesión/propiedad autorizada que muestra esos ítems; no sustituir esa lista por los cinco snapshots locales.
2. **Cotejar las filas de base de datos y el estado de cada objeto remoto.** Se requiere acceso de solo lectura autorizado o la propia interfaz autenticada para enumerar, correlacionar y leer los objetos. No se obtuvo ese acceso en el intento anterior.
3. **Probar una unidad representativa por cada patrón, sin modificar la fuente.** Primero el caso confirmado en código (manifiesto vacío con audio real asociado); después manifestación parcial, audio sin texto, audio incompleto y una captura larga.
4. **Revisar la reconstrucción de sesiones largas.** El grupo local de 707 partes emitió avisos de DTS no monótonas; debe probarse una reconstrucción que preserve timestamps y medirse duración/cobertura antes de declarar audio íntegro.
5. **Validar la propuesta de corrección antes de su aceptación.** La rama aislada implementa una función compartida de reconciliación local/remota, un indicador inequívoco de páginas pendientes y la separación entre audio declarado por el snapshot y partes almacenadas verificadas. La recuperación legacy incluye audio solo cuando la cadena es contigua y verificada, sin inventar corte sincronizado. La PR #339 sigue en borrador; falta ejecutar la integración PostgreSQL/PGlite, repetir la suite con conectividad al contrato canónico, cotejar el catálogo productivo autenticado y verificar el despliegue/lectura de vuelta.

---

## 8. Fuentes verificadas de este inventario

### Fuente normativa y estado del frente

- Metaprompt Canónico de Samantha desde SeryMente/metodologia/main, Samantha v356 · NX-356m, Metacanon 1.22, GOW v2.6; blob c364e179e8e9b6a3d566a8e690dfa1a7cce91798.
- [OCP de Custodia](../OBJETO-CANONICO.md); blob antes de esta actualización 2e6466dd361bd6d287fcb18fc67d33d4bed323f7.
- [Lista provisional de tareas](../LISTA-TAREAS-PROVISIONAL.md); blob antes de esta actualización a2d571f8e11c7feb5ab675c85b54726405b0a970.
- [Contrato de custodia de dictados](../../khora-web/docs/CUSTODIA-DICTADOS.md); blob 661706171cde293d740b7f3480a084fe7825d2d1.

### Código inspeccionado en SeryMente/khora/main

El corte de main observado al realizar la lectura de fuentes fue a63987aefe0dd3bfa51c0d0df6df43c6f44b5895. La correlación exacta con el despliegue productivo no se verificó.

| Archivo | Blob |
|---|---|
| khora-web/app/components/ingreso/RecoveryDrawer.tsx | 3a408e3712d1cbe20578fa5ae923b75b0bc74342 |
| khora-web/app/components/ingreso/IngresoWorkspace.tsx | d42f819c2867a678d0d45e309db8f58cad80dc0d |
| khora-web/lib/server/custodia-recuperacion.ts | 278a479db46e6f2bed72ea7d31f88cc373fa67d1 |
| khora-web/app/api/dictado/checkpoint/route.ts | 86138d60e1a2d25d277c468dc9af90f460334243 |
| khora-web/lib/audio/custodia.ts | 1628a5841d26941546b58a4d62ef93d0d5e99266 |
| khora-web/lib/client/custodia-local.ts | 13129ff0e03f749607631b9c0465230faebcd125 |
| khora-web/lib/client/subir-audio-custodia.ts | ed456b00d1d3e1e5aa5392307e6e87fe16ab12db |
| khora-web/lib/server/custodia-schema.ts | 3c46ac96470fa95c77cb5f5ad47822033aedd4da |

### Originales de continuidad asociados

- [Instrucción literal del operador](../originales/INSTRUCCION-INVENTARIO-RECUPERABILIDAD-INGRESOS-2026-10-28.md).
- [Salida visible previa conservada](../originales/SALIDA-MODELO-CUSTODIA-ANTERIOR-RECUPERABILIDAD-INGRESOS-2026-10-28.md).
- [Salida de ejecución parcial C007](../originales/SALIDA-MODELO-CUSTODIA-IMPLEMENTACION-PARCIAL-2026-10-28.md): implementación propuesta, validación parcial y bloqueos de integración/producto.

---

## 9. Incidente del 28-10-2026: dictado ausente y conteo 40→20

Se registró el relato literal y el análisis en [INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md](INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md). La instrucción original permanece en `originales/INSTRUCCION-INCIDENTE-DICTADO-AUSENTE-2026-10-28.md`.

- **Estado:** ABIERTO. No se obtuvo acceso a la interfaz autenticada, historial completo de páginas ni fila de checkpoint del dictado referido.
- **Confirmado en código:** la hidratación automática combina local y remoto sin aplicar el mismo filtro que la recarga; la insignia cuenta `recoveryItems.length`; el catálogo pagina en grupos de 20 mediante cursor.
- **Interpretación provisional:** 40→20 puede ser el efecto de entradas duplicadas entre las copias local y remota y no necesariamente 20 dictados ausentes. El código no prueba la composición real de las entradas que vio el operador.
- **Dictado ausente:** el último punto que el operador dice ver data del 2026-10-28 17:08. No hay prueba disponible para afirmar que el checkpoint remoto del dictado esperado fue confirmado, que el reinicio eliminó IndexedDB o que el contenido esté perdido definitivamente.
- **Acción pendiente de más prioridad:** recorrer todo el catálogo autenticado hasta cursor nulo, cotejar sesiones únicas y copias locales/remotas, revisar Custodia si hubiera archivo y, bajo acceso autorizado de solo lectura, cotejar los checkpoints de la ventana temporal. No copiar contenido personal o identificadores reales al repositorio.
- **Cambios de producto:** no realizados. Las correcciones de reconciliación, semántica del contador y pruebas de reinicio requieren un ciclo posterior autorizado y validación de extremo a extremo.

## 10. Ampliación del plan de trabajo · CUSTODIA-01 / CUSTODIA-03 / CUSTODIA-04

La lista provisional de tareas queda en v0.7 y conserva tres identificadores activos estables:

- **CUSTODIA-01 · P0:** recuperar y comprobar todas las unidades que actualmente aparecen en Recuperación, con paginación completa y reconciliación de entradas locales/remotas.
- **CUSTODIA-03 · P0:** investigar los dictados esperados que no aparecen o parecen irrecuperables; resolver el estado del dictado reportado como ausente tras la sesión de terminal, cuantificar otros casos mediante evidencia y rescatar las unidades localizadas sin alterar sus originales.
- **CUSTODIA-04 · P0:** completar la investigación y actualizar el sistema para que la recuperabilidad quede al corriente, corrigiendo los defectos demostrados y validando el recorrido completo con pruebas reproducibles y lectura de vuelta.

**Secuencia registrada en el ciclo C006:** primero adquirir una línea base no destructiva y reconciliar el catálogo completo; después recuperar y verificar las unidades visibles (CUSTODIA-01) mientras continúa la investigación de capturas ausentes (CUSTODIA-03); finalmente consolidar las causas y actualizar/probar el producto (CUSTODIA-04). CUSTODIA-04 puede preparar correcciones a partir de defectos ya reproducibles, pero no se cierra hasta contar con la evidencia de las dos tareas operativas y una validación integrada.

### Implementación parcial propuesta en CUSTODIA-04 · C007

- **Rama:** `fix/custodia-recovery-reconcile-20261028`; commit `95d7bbf2cbe0bb89b6d8ff01135438152ec8201d`; PR [#339](https://github.com/SeryMente/khora/pull/339), estado borrador. La rama agrupa por sesión y preserva puntos de origen locales/remotos, utiliza la reconciliación en hidratación/recarga/paginación y señaliza que pueden existir páginas pendientes.
- **Audio legacy:** el catálogo diferencia las partes del manifiesto elegido del número de partes verificadas persistidas. Si el manifiesto está vacío, la ruta propuesta puede copiar las partes existentes únicamente si la cadena resulta contigua y verificada; no añade un `corteAudio` que no estuviera acreditado. Una cadena irregular o no verificada produce un rechazo explícito y conserva el origen.
- **Pruebas unitarias nuevas:** cinco casos de reconciliación de sesiones, solapamientos de páginas y preservación de las variantes local/remota.
- **Controles ejecutados en worktree aislado:** `typecheck`, `ui-review:check` y `ui:contract` PASARON. `test:unit`: 549/550 pasaron; la única falla fue `methodology_contract_sync.test.ts` debido a `TLS handshake timeout` en la consulta remota de GitHub. La comprobación independiente de contenido mediante el conector de GitHub encontró el mismo blob SHA local/canónico (`232590a1f6339e2517e67038e1b5f7e8bd1638e3`) y cero diferencias JSON.
- **No ejecutado:** la integración PostgreSQL/PGlite ampliada, porque el entorno no tiene `PGLITE_MODULE` disponible. No se obtuvo sesión UI autenticada; unidades productivas cotejadas y recuperaciones productivas siguen en cero.
- **Estado:** corrección propuesta, no resultado productivo. El PR no se fusionó ni se desplegó; la recuperabilidad permanece sin certificar.

**CUSTODIA-03 no presupone una pérdida.** Cada caso se clasificará como localizado y recuperado, localizado pero bloqueado, archivado, duplicado, parcial/incompleto, no localizado tras revisar las fuentes declaradas, irrecuperabilidad demostrada o no determinado por falta de evidencia. El contador 40→20 no se traducirá en «20 dictados perdidos» sin reconciliar las identidades reales.

La evidencia y los criterios técnicos están en [el informe del incidente](INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md), los hallazgos de código y requisitos en este inventario, y el estado operativo vivo en el [OCP de Custodia](../OBJETO-CANONICO.md). No se han consultado registros productivos ni se han realizado recuperaciones como parte de esta ampliación documental.

### Original de la última instrucción de plan

- [Instrucción literal de retirada de CUSTODIA-02 e incorporación de CUSTODIA-04](../originales/INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md). La instrucción original se conserva como fuente congelada; este inventario sigue subordinado al OCP.

## 11. Registro de cambios del inventario

- **v0.1 · 2026-10-28:** creación provisional de la matriz de hallazgos; separa código confirmado, auditoría local auxiliar y catálogo real pendiente. No declara recuperaciones de producción completadas.
- **v0.2 · 2026-10-28 · CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004:** se añaden F-09 a F-12 para el conteo 40→20, la paginación de 20, el dictado no visible tras las 17:08 y el límite entre copia local y acuse remoto. Se añaden R-06 a R-08; el incidente sigue abierto, el total único del catálogo permanece no verificado y no se realizaron operaciones productivas.
- **v0.3 · 2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005:** registra el alcance histórico de CUSTODIA-01, CUSTODIA-03 y la entonces propuesta CUSTODIA-02; la referencia normativa se refrescó a Samantha v358, Metacanon 1.23, GOW v2.7.
- **v0.4 · 2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C006:** registra la retirada de CUSTODIA-02 de las tareas activas y la incorporación de CUSTODIA-04.
- **v0.5 · 2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C007:** registra los primeros cambios de recuperación propuestos en PR #339 y los resultados de validación parcial. Distingue las pruebas aprobadas de la falla ambiental de sincronización del contrato, la integración PGlite pendiente, el acceso productivo no obtenido y la ausencia de despliegue. No se afirma que el catálogo ni el dictado ausente hayan sido recuperados.
