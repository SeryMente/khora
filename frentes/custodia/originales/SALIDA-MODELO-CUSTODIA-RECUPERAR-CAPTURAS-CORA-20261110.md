Procesó durante 6m 15s
Sí, continúo. Y la conclusión que arroja la investigación es importante: el panel actual no es un inventario completo de las dictaciones anteriores al 7 de noviembre. No basta con corregir el conteo de audio o añadir las sesiones sin checkpoint. Hay fuentes enteras de evidencia que hoy no participan en la construcción del catálogo.

No he modificado datos ni código. El análisis de Neon fue de solo lectura.

1. Universo histórico localizado
Tomé como corte el comienzo del 7 de noviembre de 2026, hora de Ciudad de México; por tanto, se consideran anteriores los registros con fecha local previa a ese día.

En dictado_session encontré:

Clasificación de las 184 filas de sesión anteriores al corte

Situación

Sesiones

Evidencia

Ya vinculadas a Archivos/Volcados

21

Archivadas

Sin archivar, con texto/checkpoint

81

Texto conservado

Sin archivar, solo con referencias de audio

81

Audio registrado, sin propietario demostrable

Sin archivar, sin texto ni partes de audio

1

Solo existe la fila de sesión

Total

184

Las 81 sesiones con texto se dividen así:

37 tienen texto, pero no partes de audio.

44 tienen texto y referencias de audio.

De esas 44, hay 914 registros de partes de audio.

Las 44 tienen también registros MP3 actuales; 20 conservan historial MP3.

Las otras 81 sesiones sin archivar tienen 244 referencias de audio, pero carecen de propietario registrado. De esas partes, 25 tienen una verificación histórica y 219 siguen pendientes. Además, 11 sesiones presentan índices de partes que comienzan en cero, incompatibles con la validación actual.

Estas 81 sesiones no deben desaparecer del inventario. Tampoco deben asignarse a una cuenta por inferencia. Necesitan representación diferenciada como registros sin propietario comprobado, con acceso a su contenido sujeto a una resolución de identidad.

Hay otra población que las filas de sesión no muestran: la telemetría de dictado contiene 40 identificadores de sesión que no tienen fila en dictado_session. En 34 solo aparece el evento de inicio de edición en sitio; en cinco, un error de recuperación de checkpoint; y en uno, ambos. La telemetría no contiene el texto dictado ni el audio, pero estos identificadores deben cotejarse con las copias locales antes de descartar que quede algo por localizar.

2. Fallos de cobertura confirmados en el panel
A. Hay texto conservado que el catálogo no presenta correctamente
El catálogo remoto busca revisiones en dictado_checkpoint, pero no incorpora como contenido visible el texto que todavía está guardado en dictado_session.checkpoint_text.

He localizado 36 sesiones con texto y sin revisión en dictado_checkpoint. De ellas, 35 tienen también partes de audio.

El endpoint individual de checkpoint ya tiene una ruta capaz de descifrar checkpoint_text, comprobar su SHA-256 y cargar las partes de audio. Sin embargo, el catálogo general no utiliza esa información.

Consecuencia: aparecen registros sin título, sin texto visible y sin una acción disponible, aunque todavía existe texto y, en muchos casos, audio.

B. El conteo de audio del catálogo no representa el audio de la sesión
catalogoRecuperacion() calcula un audio_count, pero no utiliza ese valor al construir las tarjetas. En su lugar, cuenta las partes declaradas dentro del snapshot.

Eso produce una diferencia relevante:

Hay partes de audio registradas en Neon.

Puede faltar el snapshot o su manifiesto de audio.

La tarjeta indica que no hay audio, aunque existan partes asociadas a esa sesión.

El catálogo también deja fuera las partes no verificadas. Para el inventario que estás pidiendo, eso es incorrecto: una parte sin verificar debe aparecer marcada como pendiente, no desaparecer.

C. El catálogo local puede ocultar audio y duplicar archivos ya archivados
recuperarLocal() devuelve dos conjuntos: snapshots y audios. Pero IngresoWorkspace construye las tarjetas usando únicamente los snapshots.

Por tanto, una captura cuyo único resto sea audio en IndexedDB no genera su propia tarjeta. Y una captura con texto y audio local pendiente puede aparecer con un contador de audio incorrecto.

También hay un fallo en la exclusión de archivados: cerrarSnapshotLocal() borra la clave del snapshot mutable, pero no las revisiones inmutables. El catálogo vuelve a leer esas revisiones sin cotejar antes si la sesión ya está archivada.

Esto permite que una captura archivada reaparezca como recuperación local.

Y hay una duplicación adicional: en la carga inicial, si una misma sesión está en el catálogo remoto y en el local, se agregan ambas tarjetas. La interfaz las considera elementos diferentes porque una es local y otra remota.

D. Hay objetos de audio que pueden existir sin una fila de partes
El recorrido de /api/audio confirma un escenario que el catálogo no detecta:

Se reclama la sesión.

Se almacena el objeto cifrado.

Puede fallar la verificación física o el registro de la parte en Neon.

El endpoint devuelve el localizador y declara que el objeto se conserva para recuperación.

No se inserta la fila correspondiente en dictado_audio_parte.

El objeto existe, pero el catálogo no tiene una referencia relacional que lo muestre.

Existe una herramienta llamada lib/server/reconciliation.ts que lista objetos de B2 y Vercel Blob. Pero no está integrada en el panel y tiene limitaciones importantes:

Reconoce únicamente rutas de partes con formato WebM.

No incluye el inventario de staging bajo khora/staging/.

No detecta sesiones con texto/checkpoint si no están asociadas a un volcado o a un objeto de audio listado.

No realiza GET ni coteja bytes y SHA-256 al inventariar.

Su modalidad DRY_RUN ejecuta primero asegurarColumnasDictado(), que contiene DDL. Por eso no la ejecuté: no es una lectura estrictamente inocua.

Su modalidad APPLY modifica relaciones de Volcados y sesiones. Tampoco se ejecutó.

No podemos dar por resuelto el inventario de objetos físicos utilizando esa herramienta tal como está.

E. Las capturas de Aisthesis/Chrome tienen una vía de pérdida diferente
El capturador de la extensión almacena los fragmentos en memoria de su proceso offscreen. Antes de intentar la subida, retira esos fragmentos de la cola local de captura.

Si falla la subida, registra un error, pero no conserva el fragmento en IndexedDB. Al detenerse la grabadora, el estado multimedia se reinicia.

La extensión dispone de telemetría y estado local en chrome.storage.local, pero son datos de diagnóstico, no una copia del audio. El panel no consulta ese inventario.

Esto significa que podemos encontrar evidencia de que se inició o falló una captura sin que sobreviva el archivo de audio. El panel debe distinguir esos casos de una captura con contenido efectivamente localizado.

3. Archivos que ya están en Volcados
También comprobé la exclusión de lo archivado:

Hay 21 sesiones anteriores al corte vinculadas a Volcados.

Existen 22 registros de Volcado relacionados con esas sesiones; una sesión tiene dos vínculos históricos.

Hay otros 54 Volcados antiguos sin session_id.

Esos 54 registros tienen texto; 16 tienen audio_url y 12 tienen un manifiesto audio_partes.

Comparé sus localizadores de audio con las partes de las sesiones candidatas y busqué coincidencias de SHA por propietario. No encontré coincidencias exactas en esas comparaciones.

Esto reduce el riesgo de duplicar esos archivos al ampliar el panel, pero no demuestra una identidad semántica global: un objeto podría tener otro localizador o una transformación distinta. Por eso la exclusión debe basarse primero en vínculos comprobables y después en cotejos de identidad, no únicamente en estado = complete.

4. Límites que impiden certificar todavía la totalidad
Hay tres fuentes que no puedo dar por inventariadas exhaustivamente:

IndexedDB de los dispositivos originales. El almacenamiento khora-custodia-v1 es local, cifrado con una clave no exportable y no tiene un índice central que reúna los dispositivos y perfiles. Este entorno no me da acceso a la IndexedDB de tu navegador autenticado. Además, si una sola fila local no puede descifrarse, recuperarLocal() puede fallar por completo y dejar fuera incluso otras filas válidas.

Objetos físicos de los proveedores. He examinado las referencias de Neon y el código de B2/Blob, pero no he realizado GET de los 1.158 objetos ni una enumeración física autenticada de B2 y Vercel Blob. Las 939 partes marcadas históricamente como verificadas no equivalen a 939 objetos físicamente accesibles hoy. Blob puede estar temporalmente inaccesible sin que eso pruebe que esté perdido.

Identidad de las sesiones sin propietario. El catálogo normal se filtra por el usuario autenticado. Los 81 registros sin propietario no pueden incorporarse a la cuenta de alguien mediante una presunción. La función reclamarSesion() puede rellenar un propietario ausente cuando alguien vuelve a reclamar una sesión; eso no es evidencia histórica de titularidad y no debe usarse para resolver estos registros.

5. Qué debe cumplirse para dar el panel por completo
El inventario debe conciliar, sin duplicaciones, estas fuentes:

Sesiones y texto/checkpoints de Neon.

Todas las partes de audio, verificadas o pendientes.

MP3 actuales e históricos.

Objetos físicos B2 y Vercel Blob, incluidos los que nunca se vincularon a una parte.

Cargas temporales y staging.

Snapshots y audios locales de IndexedDB.

Evidencia de eventos de captura que no llegó a crear una fila de sesión.

Cada unidad debe mostrar por separado: texto, audio, estado de cada parte, proveedor, propietario, presencia física comprobada, vínculo con Volcados y origen de la evidencia.

Una captura mixta debe seguir figurando si solo queda texto o solo audio. Una captura con evidencia de inicio pero sin ningún artefacto debe distinguirse como detectada, sin contenido localizado, no presentarse falsamente como recuperable. Los registros sin propietario deben quedar separados, no desaparecer ni atribuirse.

Y el inventario debe poder indicar expresamente cuándo una fuente no se ha inspeccionado. Un resultado vacío de IndexedDB o de objetos físicos no es válido si el dispositivo o el proveedor no se han consultado.

Dictamen
Panel no certificado como completo
La consulta de base de datos ya descubre más casos de los que representa adecuadamente la interfaz. Además, hay fuentes locales y objetos físicos que el catálogo no incorpora.

Por tanto, todavía no puedo afirmar que todo lo que debe aparecer ya esté en «Recuperar capturas». Hacerlo ahora sería darte una falsa garantía, precisamente lo que buscas evitar.

No he recuperado contenido, reclamado sesiones, modificado Neon, ejecutado reconciliación, cambiado código, creado commits ni desplegado. La rama de trabajo que se había preparado continúa sin cambios de producto.

El trabajo debe permanecer en diagnóstico/inventario hasta cubrir esas fuentes y poder comparar el universo encontrado con las tarjetas del panel. Después de esa comprobación, y solo entonces, podremos considerar cerrado este objetivo.

Fuentes de código contrastadas: IngresoWorkspace, RecoveryDrawer, custodia-recuperacion, custodia-local, reconciliation y capturador Aisthesis.

IPZ: v0.7 · antigüedad NO VERIFICADA.
DUG: v388 · NX-388m · antigüedad NO VERIFICADA.
GOW: metadatos v2.18; encabezado visible §F v2.17 · concordancia pendiente.
CONV / CICLO / A / B: PENDIENTES · NO ASIGNADOS.
OCP: CUSTODIA-v0.43 · vigencia por cotejar.
FOL1: NO ASIGNADO.