# Custodia continua de dictados de Khora

> Entrada canónica de mantenimiento para humanos y agentes. Estado: IMPLEMENTACIÓN EN RAMA — NO CERTIFICADO EN PRODUCCIÓN. No interpretar una intención, un mock, una compilación ni una respuesta HTTP como certificación de preservación.

## 1. Decisión del operador y alcance

Ratificado en la conversación de 2026-10-16: preservar todo texto manual, pegado o transcrito y todo audio grabado; checkpoints continuos con frecuencia inteligente sin depender de Archivar; preservar originales y generar un MP3 completo de acceso; recuperación manual y MCP; títulos automáticos mediante IA; corregir los problemas de la auditoría de código/interfaz. **No convertir texto a voz.** La síntesis de voz queda fuera del alcance.

La auditoría inicial fijó `a7cb55683ee4ad2e6f6d7e3c16a6d7635b609e65`. La implementación parte de `2d66d7064792105ef83e4db1620547a7f04106ae` (incluye los cambios de main disponibles al abrir la rama). Las verificaciones sobre el corte anterior no certifican esta rama ni un despliegue posterior. El commit de la implementación se obtiene de Git; no se inventa ni se fija un hash autorreferente en este documento.

No hacer cambios en el Entorno Persistente ni crear otro tablero, almacén principal, espejo o documento normativo paralelo para resolver esta responsabilidad.

## 2. Invariantes obligatorios

1. El texto y el audio se conservan aunque fallen transcripción, título, revisión, ingesta o espejo.
2. Archivar CIERRA una captura; no debe ser el primer momento de persistencia.
3. Cerrar no aprueba ni ingiere. Solo una versión y SHA-256 ratificados pueden ingerirse.
4. Audio original y MP3 son objetos diferentes. Nunca reemplazar ni borrar el original por haber generado un MP3.
5. Cada parte tiene sesión, índice, tamaño, SHA-256 y verificación por relectura.
6. Una repetición con misma identidad y contenido no duplica; contenido distinto en una identidad sellada es conflicto.
7. Los checkpoints y versiones persistidos se acumulan; no deben borrarse para compactar una pantalla.
8. Ningún éxito de transporte sustituye a una comprobación del efecto persistido.
9. «Local», «confirmado remoto», «cerrado», «en revisión» y «MP3 disponible» NO son sinónimos.
10. No declarar pérdida cero ante cualquier fallo físico: medir y comunicar las ventanas sin confirmación.
11. Sin propietario comprobable no se adjudica un audio histórico por inferencia.
12. Nunca escribir texto, audio Base64, llaves, direcciones privadas o tokens en registros de observabilidad.

## 3. Mapa del código

| Responsabilidad | Archivo |
| --- | --- |
| Captura, edición, recuperación y cierre | `app/components/ingreso/IngresoWorkspace.tsx` |
| Controles y bloqueo de captura sellada/ocupada | `app/components/shared/IngresoView.tsx` |
| Frecuencia y esquema compartido de snapshot | `lib/custodia/contrato.ts` |
| Copia local cifrada y recuperación | `lib/client/custodia-local.ts` |
| Subida idempotente y reintentos acotados de partes | `lib/client/subir-audio-custodia.ts` |
| Checkpoints remotos e historial | `app/api/dictado/checkpoint/route.ts` |
| Registro y transacción de archivo | `lib/server/dictado.ts`, `app/api/dictado/route.ts` |
| Subida, cifrado, relectura y verificación original | `app/api/audio/route.ts` |
| Original importado | `app/api/audio/importar/procesar/route.ts` |
| Exportar original importado | `app/api/audio/sesion/[id]/exportar/route.ts` |
| MP3 cifrado, conversión, comprobación y trabajo durable | `lib/server/audio-mp3.ts` |
| Descargar/reintentar MP3 manualmente | `app/api/audio/[id]/mp3/route.ts` |
| Herramientas de audio autenticadas | `lib/server/mcp-audios.ts`, `app/api/mcp/route.ts` |
| Contrato público de herramientas | `lib/server/mcp-tool-contract.ts`, `docs/normative-check.md` |
| Preparación y aprobación | `lib/server/volcados.ts` |
| Versiones y deltas exactos | `lib/server/correcciones.ts` |
| Revisión visual y sus acciones | `app/sistema/custodia/page.tsx`, `app/components/shared/PipelineView.tsx` |
| Dominio audio/no-audio | `lib/server/domainAudio.ts` |
| Generación de títulos | `lib/server/titulos.ts` |
| Espejo secundario reanudable y verificado | `lib/server/espejoNotion.ts` |
| Cola durable, leases y reconciliación por propietario | `lib/server/custodia-trabajos.ts` |
| Ejecutar trabajo acotado con sesión autenticada | `app/api/dictado/reconciliar/route.ts` |
| Trabajador optativo, sin arranque implícito | `scripts/custodia-worker.ts` |
| Autorización por propietario en recorridos principales | `lib/server/custodia-acceso.ts` |
| Cifrado y PIN | `lib/server/cripto.ts`, `lib/server/boveda.ts` |
| Migraciones aditivas | `db/migrations/030_custodia_continua.sql`, `031_custodia_reconciliacion.sql` |

Todas las rutas anteriores son relativas a `khora-web/`. Leer el código vigente antes de actualizarlo; si diverge de este mapa, corregir el documento en el mismo cambio.

## 4. Modelo de persistencia

### Navegador

IndexedDB `khora-custodia-v1`, almacenes `records` y `keys`. Los snapshots y fragmentos se cifran con AES-GCM usando una CryptoKey no exportable por identidad. El texto de la captura y los bytes de audio no se guardan en claro en `localStorage`.

La llave local se conserva en IndexedDB para permitir recuperación tras reiniciar. **No es cifrado de extremo a extremo ni protección frente a ejecución maliciosa en el mismo origen.** La llave y el ciphertext viven en el mismo perfil; borrar datos del sitio o perder ese dispositivo destruye esa copia. El PIN no cifra esta copia. Los metadatos mínimos del índice local no equivalen al contenido cifrado.

Las escrituras solo se consideran locales confirmadas al completar la transacción IndexedDB. Cuota, modo privado, permisos o fallos criptográficos se comunican; nunca se silencian como éxito. No se eliminan partes pendientes por un error de red. Una parte se elimina de la cola local solo después de confirmar tamaño, SHA-256 y verificación remota.

### Servidor

- `dictado_session`: identidad, propietario, cierre y referencia de recuperación.
- `dictado_checkpoint`: revisiones cifradas acumulativas, UUID de revisión, tiempo del cliente y del servidor, huella del texto recuperable y snapshot completo.
- `dictado_audio_parte`: original por parte, metadatos y verificación.
- `volcado`: proyección textual vigente y referencia a la captura.
- `volcado_version`: historia textual versionada.
- `correccion`: deltas exactos; nuevas escrituras de este flujo se cifran.
- `dictado_mp3`: puntero del derivado vigente, huella original y del manifiesto, número de partes de origen, indicador de captura completa, huella/tamaño MP3, ubicación cifrada, intentos, arrendamiento, próxima ejecución y error saneado.
- `dictado_mp3_historial`: derivado inmutable por sesión/manifiesto; conserva revisiones anteriores para descargas paginadas fijadas por huella.
- `dictado_custodia_trabajo`: intención durable de título/espejo, identidad compuesta, propietario, payload cifrado, estado, intentos, lease con UUID, próxima ejecución y resultado cifrado.

La migración es aditiva. Los mecanismos de compatibilidad de esquema no autorizan a un agente a ejecutar una migración productiva sin verificar el destino. La credencial de lectura del MCP no ejecuta migraciones.

## 5. Checkpoints y frecuencia

El guardado local se intenta con los cambios confirmados de React, sin esperar al botón Archivar. El parcial reconocido se conserva separado del texto final; al recuperar se presenta como contenido pendiente de revisión, no como transcripción autoritativa.

La red usa dos disparadores complementarios:

- Pausa de cambios: `CHECKPOINT_IDLE_MS = 1500`.
- Actividad continua: `CHECKPOINT_MAX_MS = 10000`.

La cola serializa solicitudes y cada snapshot tiene `revisionId` independiente. Los reintentos de una revisión no insertan otra fila. Todas las revisiones remotas se conservan, y una llegada fuera de orden no puede desplazar una revisión con `client_at` mayor. El reloj del cliente no es prueba de cuándo ocurrió el hecho: `creado_en` conserva el tiempo de recepción. La edición simultánea desde dos pestañas conserva revisiones, pero todavía requiere certificación de conflictos y selección de la rama correcta; no prometer fusión automática.

Se intenta un checkpoint adicional al ocultarse la página, recuperar conexión y cerrar captura. **Los eventos de cierre no garantizan terminar solicitudes.** La defensa principal es la conservación previa; no depender de `pagehide`/`beforeunload`.

El endpoint admite texto vacío con contexto de captura: una sesión con audio no necesita fabricar texto para existir. Su respuesta confirma sesión y revisión. Una sesión sellada rechaza checkpoints nuevos con 409 e informa el identificador archivado.

## 6. Captura y subida de audio

Para micrófono, se solicita la grabadora antes de empezar el reconocedor. El navegador emite fragmentos aproximadamente cada segundo: el código intenta conservar el fragmento acumulado localmente. Se agrupan subidas remotas hasta 5 segundos o 2 MiB, además del envío final. Estas frecuencias son objetivos del programa, **no cotas físicas certificadas**: suspensión, presión de memoria y políticas del navegador pueden retrasar eventos.

Cada subida usa la misma sesión e índice al reintentar, con un máximo de tres intentos y esperas de 1 y 2 segundos; timeout de red de 30 segundos por intento. Errores no recuperables no se repiten indiscriminadamente. Un fallo no permite archivar audio parcial como completo.

Servidor: recibir → calcular SHA-256 → cifrar → Blob → releer → descifrar → contrastar tamaño/huella → registrar parte. El registro de partes y el cierre serializan sobre la fila de sesión. Una sesión sellada no permite añadir ni sustituir partes.

El evaluador de manifiesto rechaza vacío, duplicados, índices extra/fuera de rango, huecos, cantidades distintas, tamaños vacíos, huellas inválidas o partes no verificadas. El texto manual se clasifica como texto y no requiere audio por tener un identificador de sesión.

Los errores de reconocimiento suspenden el reconocedor, nunca apagan la grabadora para liberar el micrófono. Si el reconocimiento en vivo no está disponible, la captura conserva audio para una transcripción posterior. Probar físicamente permisos y colisiones entre servicios del navegador.

El modo Chrome/Aisthesis tiene su propio capturador de extensión. **No atribuirle automáticamente las garantías del grabador de micrófono.** Un evento `stopped` sin `sessionId` y `finalPartCount` coincidentes con partes verificadas se rechaza para sellar. La extensión heredada no satisface todavía este contrato y debe actualizarse antes de volver a certificar archivo en ese modo. La cola y confirmación final de esa extensión requieren verificación independiente; consultar la matriz de pendientes antes de certificar ese modo.

## 7. Archivar y recuperación

Antes de cerrar se intenta un checkpoint. La transacción principal verifica manifiesto canónico, mantiene la identidad de sesión, cifra y persiste la captura, sella sesión y vincula partes. Audio sin transcripción se admite para todos los modos de audio con originales verificados, no solo para importación.

La identidad del original se contrasta separadamente del texto vigente, de modo que una edición posterior no debe invalidar el reconocimiento de un reenvío original. El estado de preparación se retorna en el recibo: captura conservada y preparación fallida son estados distintos.

Durante guardado o después del sello, los controles que mutan la captura se bloquean. Limpiar no descarta una captura abierta: exige cerrar antes de comenzar otra. Tras sellar se puede abrir una captura nueva y el título anterior no se arrastra.

Recuperación vigente: abrir con identidad nueva y editor vacío → consultar inventario local/remoto → selección explícita de captura y punto → conservar borrador actual → comprobar propietario y cierre del origen → sincronizar audio local pendiente → crear captura hija transaccional con el prefijo canónico elegido → guardar acuse → aplicar texto/título/fuente/duración. El original y su historia permanecen intactos. Una respuesta tardía no debe pisar contenido escrito entretanto. No borrar recuperables por no poder sincronizarlos. Contrato completo y límites en §23.

## 8. MP3: original y derivado

No hay texto a voz. La entrada del conversor son exclusivamente bytes de originales verificados.

La reconciliación descubre sesiones propias con originales verificados, incluso históricas y abiertas, que no tienen trabajo MP3 o cuyo manifiesto cambió. Mientras la captura sigue abierta genera una copia **hasta N partes**, marcada `captura_completa=false`; nunca la denomina grabación completa. Al sellar vuelve a generar el derivado completo, aunque no haya aumentado N. El cierre también acelera el trabajo durable. No se exige pulsar Archivar para que una captura abierta pueda tener MP3. La cola necesita un ejecutor activo (§20): no confundir persistencia del trabajo con ejecución independiente del navegador. `ffmpeg-static` integra el codec existente FFmpeg; no se añade un proveedor de audio externo. El binario debe corresponder a la plataforma de despliegue y quedar incluido por `next.config.ts`. Preservar sus avisos/licencias y comprobar el tamaño final del paquete de la función.

Estados: pendiente → procesando con arrendamiento → disponible, o fallido con causa. Un proceso vencido puede reintentarse; una marca pendiente no significa disponible.

Secuencia: verificar cada original → reconstruir grupos de grabación → decodificar a PCM → concatenar grupos en orden → codificar MP3 a 192 kbps → decodificar el resultado → contrastar duración (tolerancia actual 250 ms) → cifrar → almacenar → releer/descifrar/comprobar huella y tamaño → marcar disponible.

Una grabadora WebM continua puede generar partes posteriores sin cabecera independiente. Se juntan antes de decodificar. Una cabecera EBML nueva inicia otro grupo: permite pausas/reanudaciones del grabador sin ignorar silenciosamente la segunda grabación. Hay que certificar este comportamiento con los navegadores soportados y archivos reales, no solo tonos WAV sintéticos.

Límites actuales: 128 MiB de originales por conversión; timeout de 90 s por operación de codec; función con duración configurada hasta 300 s, sujeta al plan del proveedor. Superar un límite deja el original y un error explícito; **no cumple todavía conversión universal de grabaciones arbitrariamente largas**. Para ampliar, medir memoria/disco/tiempo y elegir ejecución larga sin reemplazar originales.

Los temporales claros se crean en carpeta única y se eliminan al terminar, también al fallar. La clave de cifrado no se incorpora al archivo ni a la dirección pública. No introducir comandos shell con nombres de archivo proporcionados por usuarios.

## 9. Acceso manual y MCP

Manual: Ingreso permite descargar el corte MP3 conservado de la sesión con audio; Custodia solicita el MP3 del archivo cerrado. La ruta acepta identidad de volcado, folio o sesión y verifica dueño antes de leer. El navegador comprueba también la huella antes de ofrecer la descarga. Las cabeceras `X-Captura-Completa` y `X-Audio-Hasta-Parte` distinguen corte de captura completa. Si falta, puede solicitar una generación/reintento; no descarga HTML/JSON como si fuera audio. `GET /api/audio/:id/mp3` exige sesión, propietario y bóveda abierta; verifica bytes antes de devolverlos con `audio/mpeg`, `no-store` y huella. `POST` solicita generación, no certifica su terminación.

El original sigue accesible por sus rutas de partes y por el exportador de originales importados. No presentar una recodificación como original.

MCP: `khora_listar_audios` y `khora_leer_audio`. Reutilizan autenticación Bearer, revocación, `volcados:read` y compuerta normativa. Filtran por propietario comprobable. No emiten enlaces públicos ni introducen una credencial nueva.

Lectura: seleccionar original/parte o MP3; obtener bloques Base64 de hasta 262144 bytes; continuar con `siguiente_offset` hasta null; reconstruir y verificar la huella total declarada. Para MP3, conservar la huella inicial y enviar `sha256_esperado` en los bloques siguientes; el servidor lee esa revisión del historial, no el puntero que pudo cambiar durante la grabación. Una continuación sin huella se rechaza. Una huella ya emitida no debe cambiar de bytes. La verificación se realiza sobre el objeto completo antes de servir un bloque. El original multipartes se recupera en orden de índice; conservar el manifiesto. Para escucha directa, preferir el MP3 completo. Base64 no es un resumen, una transcripción ni síntesis.

Las herramientas usan la base de lectura y no generan MP3, migran datos ni cambian estados. Que aparezca una herramienta en la rama no significa que el conector instalado ya la exponga: comprobar descubrimiento después del despliegue.

## 10. Títulos automáticos

La captura obtiene primero título provisional determinista; nunca espera a IA para conservarse. Después del cierre, si el operador no proporcionó título, se intenta el generador IA existente. La actualización usa comparación con el título provisional para no pisar un título cambiado entre tanto.

Si la IA no está configurada o falla, el fallback no se presenta como título generado por IA. La regeneración explícita existente sigue siendo una vía de reintento. La intención se inserta en la misma transacción que la captura en `dictado_custodia_trabajo`; no depende del callback. El trabajador exige resultado de nivel `ia`; un fallback conserva pendiente el reintento con backoff. La aplicación al volcado compara título provisional y propietario, por lo que no pisa una elección manual. Activar y certificar el ejecutor independiente sigue siendo una compuerta operativa; el callback posrespuesta solo acelera.

No derivar títulos inventando hechos ausentes. Para audio sin texto, preservar identidad provisional y titular cuando exista contenido verificable suficiente.

## 11. Versiones, revisión y aprobación

Preparar revisión asegura esquema antes de bloquear, crea la versión dentro de la misma conexión y no llama al generador de títulos bajo ese bloqueo. Texto vacío no fabrica v1. La lectura GET de versiones no crea versiones.

Las ediciones y aprobaciones bloquean el mismo volcado. La edición crea versión, actualiza texto vigente, invalida aprobación y registra deltas en una transacción común. Los deltas conservan acentos, puntuación, mayúsculas, espacios, inserciones y borrados. Para entradas demasiado grandes para la comparación fina se conserva diferencia íntegra, no un placeholder.

La interfaz envía versión y huella base. Un conflicto no se trata como éxito silencioso. El motivo predeterminado de edición es enmienda de contenido; un defecto de transcripción debe declararse como tal. No inferir autorización por haber guardado.

La vista conecta hallazgos, incidentes y aprobación; el texto accesible usa la versión seleccionada, no v1 fija. La aprobación requiere compuerta vigente y coincidencia de huella; mantener la validación final de ingesta independiente. Certificar carreras de hallazgos/incidentes contra aprobación con PostgreSQL real.

## 12. Espejo, respaldo y retención

El espejo Notion sigue siendo secundario: **no es respaldo íntegro del audio**. Su intención se registra durablemente en la transacción de archivo. Antes de crear busca identidad exacta de volcado/versión/huella; una identidad ambigua se bloquea, no se duplica. Divide texto sin recortar espacios, saltos ni pares Unicode, en bloques de hasta 1900 unidades UTF-16, envía lotes de hasta 100 y pagina lecturas. Ante una respuesta de creación o anexado perdida, relee el prefijo ya persistido y continúa desde él. Rechaza contenido ajeno o prefijos divergentes sin borrarlos. Solo marca éxito tras releer todo y verificar la huella UTF-8. Hay timeout de 8 s por petición, separación de 350 ms y presupuesto de 100 llamadas o 240 s por intento; textos que excedan de forma sistemática ese presupuesto necesitan un cursor durable adicional, no una promesa de tamaño ilimitado. La prueba de transporte usa almacenamiento Notion sintético, no una base personal real. La restauración productiva sigue pendiente.

Retención: no hay borrado automático nuevo de originales, checkpoints remotos o versiones. No añadirlo sin decisión explícita del operador. La cola local de partes puede retirarse solo tras confirmación remota; un snapshot local se retira tras comprobar cierre remoto. No usar limpieza del navegador como procedimiento de respaldo.

Para certificar preservación se debe restaurar base, objetos y claves en otro entorno y abrir/descargar los mismos originales y versiones. Cifrar sin conservar recuperablemente la clave no garantiza preservación.

## 13. Seguridad y límites de las garantías

AES-GCM del servidor no es E2E; servicios autorizados pueden recibir texto claro para IA o espejo. El PIN es una compuerta de acceso, no la llave criptográfica del original. Mantener las llaves fuera de Git.

Las rutas nuevas de checkpoint/MP3 y herramientas de audio verifican propietario. También se añadieron verificaciones a audio original/manifiesto/parte/exportación, lectura de volcado/versiones, edición, revisión, título y detalle de pipeline; el listado principal filtra por propietario antes de descifrar. Esto **no certifica aislamiento multiusuario de toda la aplicación**: revisar especialmente herramientas MCP textuales heredadas, léxico y otras rutas de hallazgos/incidentes no cubiertas por esas guardas. La auditoría de autorizaciones del conjunto sigue pendiente. Los históricos sin dueño verificable se reportan, no se reclaman automáticamente desde herramientas de lectura.

La integridad con SHA-256 demuestra identidad de bytes, no calidad del reconocimiento, integridad semántica ni que el micrófono capturó toda la situación física. Separar tiempo de captura, reconocimiento, recepción y edición. No inventar fechas del hecho a partir de la fecha de archivo.

## 14. Pruebas obligatorias y evidencia

Pruebas añadidas: `tests/unit/custodia_continua.test.ts` y `custodia_mp3_codec.test.ts`. El segundo usa el binario real con tonos sintéticos, rechaza entrada no-audio y comprueba grabaciones múltiples; no acredita Blob, PostgreSQL ni navegador reales. Las pruebas del contrato MCP ejercen el transporte real con fronteras de identidad/almacenamiento sustituidas, no credenciales de producción.

Comandos de validación del repositorio: `npm run typecheck`, `npm run test:unit`, `npm run ui:contract`, `npm run build`. Ejecutarlos en `khora-web`. Registrar commit y resultados en el acta del cambio; no reutilizar como actuales los 394 casos del corte de auditoría inicial.

Antes de declarar cumplido, ejecutar con identidad y almacenes de prueba:

| Escenario | Prueba terminal requerida | Estado de certificación |
| --- | --- | --- |
| Texto manual/pegado sin Archivar | Recargar y recuperar exacto con huella | Pendiente navegador real |
| Transcripción parcial/final y edición | Recuperar ambas sin fingir autoritatividad | Pendiente navegador real |
| Micrófono continuo | Audio completo tras caída, sin depender de detener | Pendiente micrófono real |
| Audio con transcripción fallida | Original accesible sin texto fabricado | Pendiente servicios reales |
| Cambio de red y reintento | Mismos índices/huellas; sin duplicación | Pendiente interrupción real |
| Última parte contra Archivar | Bloqueos serializan y no pierden sufijo | Pendiente PostgreSQL real |
| Respuesta de archivo perdida | Recuperar identificador sellado sin resucitar borrador | Pendiente extremo a extremo |
| Reenvío original tras edición | Mismo volcado, sin sustituir versión actual | Pendiente PostgreSQL real |
| Dos pestañas | Todas las revisiones conservadas, conflicto explícito | Pendiente concurrencia real |
| MP3 de varias grabaciones | Decodificar todo y contrastar duración | Codec sintético + pendiente navegadores |
| MP3 demasiado largo | Original conservado y límite visible | Pendiente carga |
| Acceso manual y MCP | Mismos bytes/hashes; dueño ajeno denegado | Pendiente entorno integrado |
| Título IA fallido | Captura intacta y reintento comprobado | Pendiente cola durable |
| Chrome sin confirmación final | No sellar integridad desconocida | Pendiente extensión |
| Copia y restauración | Restaurar objetos, filas, versiones y claves | Pendiente ensayo real |
| Producción | SHA exacto desplegado y flujo completo | NO CERTIFICADO |

## 15. Registro de brechas y siguiente trabajo

Inventario histórico del primer corte (conservado para trazabilidad). El estado vigente fila por fila está en §21; no interpretar como pendientes intactos los puntos implementados después. La rama no se considera cierre universal mientras sus compuertas materiales permanezcan abiertas:

1. Certificación con PostgreSQL/Blob/navegador y commit productivo identificado.
2. Cola automática durable de títulos y ejecución eventual verificable.
3. Reconciliación programada de trabajos MP3 estancados y reconstrucción del catálogo histórico sin trabajo registrado.
4. Conversión de capturas mayores al límite actual sin perder originales ni truncar audio.
5. Persistencia de la extensión Chrome/Aisthesis, cuenta final de partes y confirmación de cierre estricta.
6. Revisión de todas las rutas heredadas de autorización, lectura y estados de disponibilidad.
7. Espejo Notion durable, deduplicado y verificable para textos largos.
8. Backups y ensayo de restauración incluyendo claves.
9. Ensayos de cuota local, perfil privado, cierre forzado y varias pestañas.
10. Revisión visual en persona del operador antes de merge/despliegue de las superficies afectadas.
11. MP3 automático de capturas que nunca se sellan: actualmente se conserva el original abierto y puede leerse por MCP, pero el trabajo de MP3 se programa al archivar. No presentar el checkpoint original como un MP3 ya disponible.

Este registro es parte del contrato, no una licencia para presentar una implementación parcial como terminada. Cerrar cada fila solo con prueba enlazable. No borrar filas para hacer que el documento parezca completo.

## 16. Procedimiento obligatorio para futuros agentes

1. Leer este documento, `AGENTS.md`, el contrato MCP y el código vigente de la responsabilidad afectada.
2. Verificar remoto y commit; usar rama aislada y no tocar cambios ajenos.
3. Consultar errores conocidos y permisos antes de operar sobre datos/secretos.
4. Localizar y reutilizar la capacidad existente antes de añadir servicios o almacenes.
5. Mantener originales y revisiones; nunca arreglar un incidente borrando evidencia.
6. Cambiar código, migración, contrato público, pruebas y este documento en el mismo cambio lógico.
7. Probar fallos e interrupciones además de caminos felices. Una prueba de strings no prueba un efecto en PostgreSQL.
8. Mantener `read-only` y las compuertas de autenticación/normativa para MCP.
9. No sustituir el MP3 por texto a voz ni el original por MP3.
10. Publicar evidencia del SHA probado y distinguir rama, merge y producción.
11. Actualizar esta entrada, no crear otro canon de custodia competidor. Enlazar detalles auxiliares desde aquí.

## 17. Evidencia de esta implementación

Validación del árbol de implementación de `feat/custodia-continua-20261016`, ejecutada el 2026-10-16 en worktree aislado de Windows. El commit y el diff exactos quedan identificados en el historial de la rama y en su solicitud de cambios; no extrapolar estos resultados a main ni a producción.

| Verificación | Evidencia del último ciclo | Alcance |
| --- | --- | --- |
| Tipos | `npm run typecheck`, salida 0 | Compilación TypeScript, no servicios |
| Suite | `npm run test:unit`: 450 pruebas, 450 correctas, 0 fallos, 0 omitidas | Incluye contratos y codec; muchas fronteras usan dobles |
| Navegación | `npm run ui:contract`, salida 0 | Integridad estática de rutas/enlaces |
| Escenarios visuales | `npm run ui-review:check`, salida 0 | Integridad del catálogo, no revisión humana |
| Navegador real aislado | `node --import tsx tests/browser/custodia-local.mjs`: 8 comprobaciones correctas | Chromium, IndexedDB, WebCrypto y micrófono **sintético** |
| Audio de navegador | 2 grabaciones WebM, 8 fragmentos, MP3 decodificado de 6.096979 segundos | Ambos grupos íntegros en prueba sintética; ningún dictado real |
| Build | `npm run build`, salida 0 en la ejecución registrada | Secreto efímero de build; no login ni despliegue |

La prueba de navegador comprueba recuperación exacta tras recarga, aislamiento lógico por dueño, ausencia del texto claro en registros, carrera de creación de clave entre dos páginas, recuperación exacta de fragmentos, dos cabeceras WebM, conversión completa y retirada selectiva de cola. No monta `IngresoWorkspace`, no prueba permisos físicos de micrófono, ni conecta PostgreSQL/Blob/Notion/MCP productivos. No equivale a extremo a extremo de la aplicación.

Los logs crudos se conservan fuera del índice Git del worktree de validación. No subirlos indiscriminadamente: pueden incorporar rutas locales o diagnósticos de librerías. Este acta publica solo resultados acotados. Ninguna afirmación de este documento certifica por sí sola un servicio productivo.

### Incidencias durante la validación

- Fixtures antiguos de pruebas no reproducían `Pool.connect()`, la consulta de original inmutable ni la huella requerida en aprobación. Se actualizaron conservando aserciones; se vuelve a ejecutar la suite completa.
- El diagnóstico de huecos de audio rechazaba antes de enumerar índices faltantes. Se corrigió sin aceptar manifiestos vacíos, repetidos o fuera de rango.
- No fue posible agregar esta incidencia al registro de errores de Notion: la herramienta respondió literalmente «This page's ancestor is in the trash. The ancestor must be restored before this page can be updated.». No se restauró ni modificó el ancestro sin permiso; este apartado conserva el incidente y su seguimiento.
- Un intento local de búsqueda usó un nombre inexistente (`lib/server/audio-custodia.ts`); no produjo mutación. La ruta real es `lib/audio/custodia.ts`.

- Primer build: el código compiló, pero la recolección de rutas se detuvo con `AUTH_SECRET env var is required — no fallback allowed`. El worktree no heredó credenciales; no se copiaron secretos productivos. Se repite con un secreto aleatorio efímero exclusivo del proceso de build, sin habilitar bypass de autenticación. Esto no prueba login ni integraciones reales.

### Revalidación del corte y estado de publicación

Se volvió a ejecutar la validación sobre el código exacto `498067e18e064f14c48a11e63461f7ca24206499`: tipos 0; suite 450/450, sin fallos ni omitidas; navegador 8 comprobaciones correctas con IndexedDB real y audio sintético; navegación 0; contrato visual 0; build 0. El build utilizó un AUTH_SECRET aleatorio efímero, no credenciales productivas. El árbol de archivos rastreados permaneció sin modificaciones durante esta revalidación. No equivale a ejecutar IngresoWorkspace contra servicios reales.

La propuesta de cambios es [#301](https://github.com/SeryMente/khora/pull/301), aún abierta. Esta actualización es documental: no fusiona, migra ni despliega. Antes de liberar, integrar y volver a verificar el main vigente; ya existe un avance posterior a la base de la rama (`1697ee2693ed3217523ffc1d1be9b6541d7d849d`, observado durante la comprobación).

La automatización remota NO está aprobada. La anotación de [GitHub Actions](https://github.com/SeryMente/khora/actions/runs/38973252329/job/117216441570) indica literalmente: "The job was not started because recent account payments have failed or your spending limit needs to be increased." Los estados automáticos de Vercel remiten a la restricción del plan Hobby para el repositorio privado de organización. Distinguir trabajos no iniciados, pruebas fallidas y verificaciones locales; no presentar ninguno como aprobación de los demás ni omitir compuertas.

Este párrafo describe el corte anterior: no había certificación productiva ni cierre universal. El ciclo de finalización posterior implementa varias brechas sin borrar su historia; consultar §20–§22 para el estado vigente. Ninguna prueba aislada se extrapola a producción.

## 18. Recorrido operativo desde la interfaz

| Acción o acontecimiento | Efecto implementado | Lo que NO significa |
| --- | --- | --- |
| Escribir/pegar o recibir parcial | Snapshot cifrado local y programación de checkpoint remoto | Un estado de React no acredita persistencia |
| Iniciar micrófono | Adquirir grabadora, después intentar reconocimiento; conservar audio aunque falle ese reconocimiento | Que haya texto no acredita grabación de audio |
| Detener | Cerrar grabadora, drenar partes y solicitar transcripción autoritativa | No archiva, no aprueba y no acredita MP3 |
| Pausar para editar | Detener/grabar grupo antes de reanudar; conservar historia | No autoriza reemplazar el original |
| Archivar | Intentar checkpoint, comprobar partes, POST dictado, transacción de cierre, verificar recibo, bloquear edición de captura | No equivale a ingesta ni a título IA/MP3 terminado |
| Limpiar captura abierta | Rechazar descarte e indicar que se cierre primero | Nunca borrar silenciosamente para mostrar una pantalla vacía |
| Limpiar tras cierre confirmado | Abrir otra captura sin arrastrar título o sesión anterior | No borrar el archivo del servidor |
| Abrir Custodia | Seleccionar captura y versión, texto y reproductor por partes | Una fila de inventario no prueba disponibilidad de bytes |
| Guardar edición | Enviar versión/huella base, crear versión, invalidar aprobación, conservar original y deltas | No es corrección automática ni aprobación heredada |
| Aceptar/rechazar hallazgo | Ejecutar el callback real y recargar decisión de compuerta | Una animación sin petición no acredita resolución |
| Resolver incidente | Pedir código explícito de resolución y llamar al servidor | No fabricar audio ausente ni cancelar incidentes por inferencia |
| Aprobar | Mantener 2 segundos o confirmación accesible de la versión abierta; enviar versión/huella | No ingerir una versión distinta |
| Ingerir aprobada | Reutilizar la compuerta de la versión ratificada y su huella | No saltar controles porque Archivar devolvió 201 |
| Descargar MP3 completo | Descargar derivado verificado; si falta, solicitar generación y mostrar pendiente | Nunca entregar una respuesta JSON como archivo MP3 |
| Regenerar título | Usar el generador existente, independiente de custodia del original | No reconstruir texto perdido ni garantizar que la IA esté configurada |

## 19. Fallos conocidos y tratamiento de recuperación

- **Solo local confirmado**: mantener el mismo perfil y origen; no limpiar datos del sitio. Volver a abrir la captura y sincronizar al restablecer la red.
- **Sin copia local ni remota confirmada**: mantener la página; el estado es un riesgo real, no «guardado». No cerrar ni iniciar otra captura pretendiendo seguridad.
- **Parte pendiente**: reusar sesión/índice/bytes; no incrementar el índice para el mismo reintento ni borrar el original local.
- **Respuesta de cierre perdida**: consultar la sesión; si está sellada, recuperar su identificador, no reconstruir otro archivo con otra sesión.
- **MP3 fallido**: conservar y recuperar partes originales; hay reconciliación con espera durable y reintento manual. Si supera 128 MiB o el timeout, necesita ejecución larga aprobada; repetir el mismo trabajo no elimina ese límite. Sin ejecutor activo no prometer eventualidad temporal.
- **Título fallido**: conservar provisional y contenido; la cola automática reintenta sin aceptar fallback como IA. Hay regeneración explícita. Sin proveedor/ejecutor configurado no declarar título IA obtenido.
- **Integridad rota**: no abrir los bytes como si fueran verificados, no reemplazar silenciosamente la huella almacenada. Investigar desde la evidencia original.
- **Datos históricos**: inventariar propiedad, disponibilidad y partes antes de cualquier backfill. No borrar, adjudicar, sobrescribir ni declarar migrados datos no comprobados.
- **Conflicto concurrente**: conservar ambas evidencias y exigir selección explícita; no usar el reloj de una pestaña como prueba de supremacía semántica.

Para rollback, revertir código en una rama revisada; no deshacer migraciones aditivas eliminando tablas con capturas. Mantener las versiones compatibles de lectura y las claves hasta comprobar restauración. Este documento complementa `PREPARACION-VOLCADOS.md` y el contrato MCP vigente; no sustituye sus compuertas.


## 20. Contrato operativo de reconciliación continua

### Intención durable y ejecución

`guardarDictadoConSesion` encola dentro del mismo `BEGIN`/`COMMIT` que conserva el archivo: título si no lo dio una persona y hay texto, y espejo secundario. Clave: tipo + volcado + versión + SHA-256. Repetir idéntica clave no duplica; un rollback no deja un trabajo huérfano. El payload y el resultado se cifran con la clave de custodia existente. No se añade un proveedor ni almacén principal distinto.

Selección: trabajo del propietario, no completo, vencimiento de backoff cumplido y sin lease vigente; bloqueo `FOR UPDATE SKIP LOCKED` y asignación atómica de lease UUID de 10 minutos. Las actualizaciones finales exigen ese UUID. Estados: pendiente → procesando → completo, o fallido reintentable. Espera: 30 s, 60 s, 120 s… hasta 6 h. El generador MP3 usa igualmente UUID de lease, no compara un timestamp redondeado por el cliente. Un error guarda un código acotado, nunca el mensaje sensible del proveedor. Fallar título/espejo no revierte el original.

La reconciliación intenta una sesión de audio y hasta dos trabajos secundarios por invocación normal (tope programático cinco). No registra dueño en históricos sin evidencia. Un fallo de audio no borra texto ni impide reintentos secundarios. El historial MP3 conserva copias anteriores; el puntero actual no es una identidad inmutable de descarga.

### Disparadores y límites de operación

- Navegador: al preparar dueño, cada 30 s y al recuperar conexión. Solicita trabajo a `POST /api/dictado/reconciliar`, autenticado, acotado a ese usuario. Respuesta 202 = solicitado, no terminado.
- Archivo: `after()` acelera trabajo ya persistido; no es la fuente de durabilidad.
- Ejecutable optativo: `scripts/custodia-worker.ts`, con el entorno de servicio existente. Sin argumentos informa estado **solo de lectura** y presupone migraciones aplicadas. `--execute --once` realiza una pasada acotada; `--execute` mantiene ciclos de 30 s. Detiene en SIGINT/SIGTERM. No se instala ni arranca por build o npm install.

No se ha activado un proceso productivo, cron o servicio en este cambio. Si el navegador está cerrado y no hay trabajador activo, el trabajo permanece durable pero no avanza. Para activar fuera del navegador, el responsable debe aprobar el entorno de ejecución, comprobar identidad/base/Blob y presupuesto, aplicar migraciones aditivas, instalar la supervisión y verificar una captura sintética completa. No improvisar credenciales ni llamar «automático permanente» al mero archivo del script.

### Acceso durante una captura abierta

El MP3 puede representar un prefijo verificado. Listado, lectura y cabeceras deben informar número de partes e indicador de cierre. Una descarga paginada MCP conserva SHA-256 esperado para no mezclar cortes. El acceso a originales sigue disponible aunque no haya codec, título, transcripción, espejo o MP3. No existe aún una pantalla general certificada de todas las sesiones abiertas históricas: la recuperación actual abre la última, y MCP inventaría sesiones propias; no confundirlo con un catálogo manual universal terminado.

## 21. Matriz vigente de cierre y compuertas

| Fila original de §15 | Cambio de este ciclo | Qué falta para certificación universal |
| --- | --- | --- |
| 1 · Integración y producción | Suite ampliada y ensayos aislados separados por frontera | PostgreSQL/Blob/Notion reales, identidad de commit desplegado y recuperación extremo a extremo |
| 2 · Títulos durables | Cola transaccional, reintentos y protección de título humano | Proveedor real y ejecutor supervisado activo |
| 3 · MP3/histórico | Descubrimiento de sesiones verificadas sin trabajo, backoff e historial inmutable | Certificar catálogo real, excluir dueños indeterminados y activar ejecutor |
| 4 · Capturas largas | Se conservan originales; error explícito y límite documentado | Proceso largo/streaming medido para >128 MiB y límites del proveedor |
| 5 · Chrome/Aisthesis | Compuerta exige cierre con sesión, cuenta final y todas las partes verificadas | Persistencia propia de extensión, manifiesto final con cuenta exacta y ACK estricto; la extensión actual no emite el manifiesto final: el cierre queda bloqueado explícitamente, no se finge compatibilidad |
| 6 · Autorización heredada | Guardas de propietario en principales rutas de custodia y pipeline | Barrido completo de herramientas textuales y demás endpoints heredados |
| 7 · Espejo | Cola durable, identidad exacta, texto sin pérdida, paginación y relectura | Integración Notion real, presupuesto para textos extraordinarios y garantía operativa del ejecutor |
| 8 · Respaldo | Ensayo aislado de restauración de datos cifrados y necesidad de clave | Restaurar base, Blob y claves de un entorno real independiente; definir retención y supervisión |
| 9 · Fallos del navegador | IndexedDB real, carreras de clave y pruebas de recarga/red sintéticas | Cuota agotada, perfil privado, cierre forzado y conflictos semánticos entre pestañas soportadas |
| 10 · Revisión humana | Catálogo/contratos estáticos y prueba de interacción automatizada | Operador presente: interfaz, seguridad y decisión de liberación |
| 11 · No pulsar Archivar | Reconciliador genera MP3 de prefijos abiertos y reconstruye completo al sellar | Ejecutor activo, verificación física continua y catálogo manual de todas las sesiones abiertas |

**Dictamen:** implementación ampliada y documentada en rama; no certificación productiva ni preservación universal demostrada. No cerrar estas compuertas por inferencia ni por una compilación. No fusionar/desplegar automáticamente antes de revisión humana y revisión de main vigente. GitHub Actions puede no iniciar por facturación y Vercel puede rechazar el despliegue por plan; esos bloqueos no son pruebas aprobadas ni fallos funcionales del código.

## 22. Evidencia reproducible del ciclo de finalización

Además de la suite, se incluyen:

- `tests/unit/custodia_reconciliacion.test.ts`: payload cifrado, idempotencia de claves, título humano, backoff, ausencia de lease, código de error saneado, manifiesto abierto/cerrado, Unicode exacto y espejo largo cuya respuesta de anexado se pierde después de persistir.
- `tests/integration/custodia-postgres.ts`: motor PostgreSQL real embebido (PGlite/WASM) en almacenamiento aislado, sin Neon ni TCP. Aplica las migraciones dos veces, ejecuta el endpoint real de checkpoints con autenticación sintética, verifica idempotencia/conflictos, rechazo de dueño ajeno, orden de revisiones, sello, rollback y cola. Prueba dump/restore de datos cifrados y fallo al usar clave distinta. Una conexión embebida **no prueba carreras entre conexiones ni recuperación productiva de Blob**. La dependencia de validación se instala fuera del repositorio y `PGLITE_MODULE` indica su entrada; no modifica dependencias de producción.
- `tests/browser/custodia-workspace.mjs`: monta la pantalla real `/sistema/ingreso` en Next local con Chromium e IndexedDB reales y APIs sintéticas. No autoriza hosts públicos. Prueba escritura sin Archivar, recarga, caída simulada de red, copia local no visible en claro y sincronización posterior. No prueba audio físico ni autorización del servidor real.

Los resultados finales se registran debajo después de ejecutar; una prueba añadida no cuenta como aprobada por existir. Revalidar tipos, suite, navegador, navegación, catálogo y build sobre el árbol exacto que se publique. Mantener fuera del índice los logs crudos, dumps, capturas de datos y secretos. El documento y `AGENTS.md` constituyen la ruta de descubrimiento para la siguiente IA; no crear un canon competidor.


### Resultados del árbol de finalización (2026-10-16)

- TypeScript: salida 0.
- Suite principal: **463 correctas, 0 fallos, 0 omitidas**. Los antiguos fixtures del espejo que usaban huellas inventadas y esperaban un POST sin relectura se sustituyeron por aserciones de exactitud y por pruebas de transporte/reanudación registradas en la suite principal; no se aceptan hashes falsos para conservar compatibilidad de pruebas.
- PostgreSQL/PGlite: **11 comprobaciones correctas**, incluidas sentencias exactas de adquisición/confirmación del lease MP3; un UUID obsoleto no actualiza el trabajo.
- Pantalla IngresoWorkspace real con APIs sintéticas: **6 comprobaciones correctas**, sin errores JavaScript no manejados.
- IndexedDB/codec/navegador: **8 comprobaciones correctas**, dos grabaciones sintéticas, ocho fragmentos y MP3 decodificado de 6.096979 s.
- Contrato de navegación y catálogo visual: salida 0 en ambos. No equivale a revisión presencial.

Build directo `next build --webpack`: salida 0 con AUTH_SECRET efímero aleatorio, sin bypass de autenticación. Los preflights de experiencia y extensión se ejecutan separadamente antes del commit. Publicación y commit exacto constan en el acta de la propuesta; no inferir éxito por la existencia de una rama. La evidencia tiene alcance aislado: ni estas pruebas ni el build acceden a dictados reales, certifican un micrófono físico, activan el trabajador o prueban el conector desplegado.

## 23. Incidencias y memoria de prevención de este ciclo

El registro canónico de errores de Notion no pudo actualizarse porque su ancestro está en la papelera. No se restauró sin permiso. Se conserva aquí el aprendizaje operativo requerido antes de otra cirugía:

| Operación y síntoma | Causa e impacto | Corrección y prevención |
| --- | --- | --- |
| Lecturas: `No such file or directory`/ruta inexistente para checkpoints y página de sistema | Copia local parcial y rutas inferidas; solo falló la lectura | Enumerar rutas primero. Reales: `app/api/dictado/checkpoint/route.ts` y `app/sistema/ingreso/page.tsx` |
| Parche: `AssertionError` en ancla de revisión | Dos manejadores tenían la misma ancla; cambios locales previos sin transferir | Reanudar por manejador, sin duplicar guardas; verificar hash antes de copiar y ejecutar tipos/suite |
| Ejecutor SQL: `Top-level await ... cjs` | Prueba TS en paquete CommonJS; ensayo no inició | Encapsular en main asíncrona y respetar formato del repositorio |
| Captura de error de Node interrumpida por PowerShell | Política Stop trató stderr como excepción | spawnSync con salida/código explícitos y log acotado, sin simular éxito del proceso hijo |
| PGlite: `cannot insert multiple commands into a prepared statement` | Adaptador usó protocolo preparado para DDL multisentencia | exec solo para DDL sin parámetros; query parametrizado para datos. Se ejecutan migraciones reales dos veces |
| Montaje: `Cannot read properties of undefined (reading 'filter')` | Fixture genérico incumplía contrato de mediciones, no fallo de persistencia | Fixture específico con records/perfil; conservar aserciones de recuperación y volver a ejecutar |
| Directiva cliente precedida por import durante parche | Inserción antes del prólogo válido | Colocar use client primero; verificar montaje y build después |
| Lease MP3 identificado por TIMESTAMPTZ | Date puede truncar microsegundos; confirmación podía no coincidir | UUID persistido y guardas SQL en éxito/error, con prueba de lease vigente y obsoleto |
| Metadatos GitHub: `GraphQL: Projects (classic) is being deprecated ... projectCards` | gh pr edit falló tras publicar correctamente el código; no hubo merge | PATCH REST con gh api; se releyó propuesta abierta y mismo commit remoto. Usar REST para metadatos con esta versión de CLI |

Nada de este apartado registra secretos, audio ni texto personal. No eliminar evidencia ni relajar aserciones para borrar un fallo del informe.

Corte funcional probado y publicado: `9935d56f8458dd40035d1a757c7cc752679064f6`. La solicitud #301 se releyó abierta y no fusionada; la huella del objeto documental remoto coincidió con Git local. Esta última anotación es solo documental. No activa trabajo, migra ni despliega.


## 24. Integracion excepcional autorizada (2026-10-16)

El operador autorizo expresamente integrar la propuesta #301 en main con las brechas conocidas y sin acreditar revision presencial de interfaz/seguridad. Esta excepcion de integracion no autoriza despliegue ni activacion del ejecutor y no acredita certificacion productiva ni preservacion universal. Las compuertas tecnicas de las secciones 21 y 22 siguen abiertas; no se eliminan ni se consideran aprobadas por la fusion.

Base main incorporada: c9147557c42b07960e44f0b29b56ab6d9b6a8259 (incluye #302). Conflicto exclusivo en README.md resuelto conservando el enlace vigente al objeto canonico del frente dictado-voz y la entrada de custodia; se conservan los cambios de ambas ramas. Revalidacion ejecutada sobre esta combinacion en copia aislada: npm ci correcto; typecheck correcto; 474 pruebas unitarias aprobadas, cero fallos, canceladas u omitidas; contrato de navegacion y catalogo UI Review correctos; npm run build correcto, incluidos sus preflights. AUTH_SECRET efimero para compilar. No se utilizaron dictados reales, no se ejecutaron migraciones productivas ni se activo el ejecutor. Esta evidencia no certifica produccion.

## 25. Custodia y desbloqueo en contexto (2026-10-16)

El operador renombró la sección a Custodia y confirmó la introducción del PIN en la misma pantalla para descargar. Ruta canónica `/sistema/custodia`; `/sistema/volcados` conserva los parámetros de selección/versionado como alias. Menús y copy usan Custodia. APIs, scopes y nombres persistidos históricos permanecen compatibles.

`app/components/os/CustodiaUnlock.tsx` usa el endpoint existente `/api/boveda`, sin reset ni creación: `unlockOnly` rechaza ese caso en servidor. El campo se limpia al enviar y no se persiste el PIN. Tras validar se verifica la cookie vigente y se reintenta una sola vez la descarga elegida. Cambio de selección cancela la descarga pendiente; error, red o caducidad permanecen en la pantalla.

`downloadCustodiaMp3` en `lib/client/export-audio-mp3.ts` consume el MP3 conservado del servidor, valida tipo, SHA-256 y metadatos de corte antes de ofrecer bytes; no vuelve al mecanismo anterior de recodificar el original en el navegador. Un 409 solicita generación y muestra pendiente; no finge un archivo. El original y las guardas de propietario/cifrado/caducidad permanecen intactos. La interfaz de revisión conserva las acciones de aprobación/hallazgos y el envío de versión/huella base incorporados en la solicitud 301.

Validación reproducible focalizada: `npx playwright test --config playwright.custodia.config.ts` desde khora-web. Usa identidad y almacenamiento sintéticos en servidor local y un MP3 generado con codec real desde PCM sintético; no certifica servicios o despliegue productivos. Los resultados anteriores a la incorporación de main 1514af4 son solo evidencia del checkpoint previo, no de esta combinación. Las brechas de las secciones 21–24 permanecen abiertas.

Revalidación de la combinación sobre main 1514af4713eb8ca20e34ff2b6268f13a4ec2ed82: tipos, contratos de navegación/catálogo y compilación optimizada correctos; 480 unitarias correctas, cero fallos/omitidas; 11 passed (50.4s) en Chromium sobre paquete de producción local, incluyendo Custodia y Shell v2. La descarga verifica bytes y huella de un MP3 real producido por FFmpeg desde PCM sintético. Se mantienen fronteras de identidad/almacenamiento sustituidas en interacción y ausencia de credenciales productivas. El commit publicado y la fusión se identifican por Git y la solicitud de integración, no por un hash autorreferente. No certifica despliegue ni compuertas universales.


## Integración de métricas de experiencia y benchmark

El endurecimiento de la experiencia del dictado se integra sobre main f04e815b47fa8a7b5297561df62000478f978108 sin reemplazar captura, checkpoints, custodia local/remota, PIN, MP3 ni reglas de Archivar/Limpiar. Reutiliza los eventos de observación existentes; su cola es independiente y contiene únicamente metadatos consentidos, no texto ni audio. Su falta de entrega no equivale a pérdida de la captura y su acuse no certifica custodia. Preferencias inválidas fallan apagadas; duplicados o eventos tardíos no crean sesiones adicionales. El comentario enviado voluntariamente conserva el endpoint privado/cifrado existente.

Estado, evidencias y límites del frente: [objeto canónico de dictado y voz](../../docs/frentes/dictado-voz/OBJETO-CANONICO.md); contrato operativo: [benchmark y experiencia](../../docs/frentes/dictado-voz/CONTRATO-DICTADO-EXPERIENCE.md). Las pruebas de navegador conservan los fixtures vigentes de propietario de checkpoint y micrófono generado por Chromium; no son voz física ni certificación de producción. Esta integración no implementa análisis clínico ni amplía consentimiento.

## 23. Ingreso rediseñado: selección explícita y cortes de recuperación

### Decisión y anatomía de pantalla

Instrucción posterior del operador: abrir en blanco, ofrecer versiones recuperables de forma profesional, conservar su audio y renovar la interfaz de principio a fin sin acumulación de parches. Se aprueba el diseño general de editor central, recuperaciones laterales y actividad acústica; la aceptación de uso no se presume. No se añade medidor de volumen ni decibelios, escucha permanente, nueva telemetría acústica ni análisis de salud.

La pantalla abre con una identidad nueva y editor vacío: consultar inventario NO restaura contenido ni abre el micrófono. «Recuperar capturas» ofrece tarjetas con fecha, vista previa, duración, caracteres, procedencia local/remota y partes de audio. «Ver puntos guardados» permite elegir una revisión concreta y paginar, sin cargar todo el historial de una vez. Los registros ya archivados se consultan en Custodia. Las opciones secundarias se agrupan bajo «Más opciones»; el diagnóstico técnico se despliega bajo demanda, sin competir con el editor.

### Recuperación no destructiva

1. Autenticar propietario y consultar catálogo con `GET /api/dictado/checkpoint?catalog=1`; páginas de 20 sesiones abiertas y cursor estable por recepción/identidad. Revisiones con `?revisions=1&sessionId=...`, también paginadas. La fecha cliente se conserva, pero no acredita hora física.
2. Guardar el borrador actual antes de sustituir la vista. Una copia local no disponible se informa sin ocultar el inventario remoto. La lectura puede funcionar aunque no haya conectividad suficiente para materializar una recuperación; recuperar exige acuse remoto.
3. Para una copia local, comprobar si el origen ya fue archivado, reintentar sus partes con los mismos índices y sincronizar el punto seleccionado. No borrar partes locales hasta acuse verificado.
4. `POST /api/dictado/checkpoint?recover=1` exige origen de la aplicación, selección explícita, propietario y nueva identidad. Bloquea el origen en transacción, comprueba revisión y prefijo de audio y crea una captura hija con `recuperadaDe`.
5. La hija referencia los originales cifrados ya almacenados: no recodifica, sobrescribe ni borra el audio original. Conserva la historia del origen. Reintentar la misma selección/identidad es idempotente; selección distinta, propietario ajeno o sesión sellada se rechazan.
6. Solo después de guardar el acuse y la copia local se aplica el texto al editor. Una respuesta fallida no vacía el borrador ni finge recuperación. El reconocimiento parcial reaparece como pendiente, no como transcripción autoritativa.

No hay fusión semántica automática entre pestañas ni reclamación de objetos sin propietario. Una sesión archivada nunca se resucita mediante recuperación.

### Corte vinculado de texto y audio

El grabador conserva fragmentos locales aproximadamente cada segundo. Al formar una parte de subida (umbral existente de unos 5 s o 2 MiB), congela el texto/parcial/título de ese momento. Después del acuse íntegro del audio, guarda un punto inmutable con `corteAudio.hastaParte` y `finMs`; el servidor comprueba índices contiguos, tamaños, huellas, verificación y fin real del prefijo. El corte local se guarda aparte del puntero mutable, por lo que un acuse tardío no sustituye el borrador más reciente. Un fragmento sin texto también obtiene snapshot local y puede aparecer en el inventario.

**Vinculación no significa alineación palabra a palabra.** El reconocimiento y MediaRecorder tienen relojes/callbacks independientes; no se afirma que cada palabra corresponda exactamente al límite acústico. Los puntos históricos sin `corteAudio` se muestran sin sincronía acreditada. Si falla el guardado del corte, se conserva el original y se informa; no se anuncia un punto remoto confirmado.

La ventana de pérdida depende del último acuse remoto y de la copia local disponible. **No se garantiza «solo se perderá la última parte» frente a red prolongadamente caída, almacenamiento bloqueado, borrado del perfil, cierre abrupto o pérdida del dispositivo.** En condiciones normales, el prefijo confirmado permite elegir un corte anterior íntegro, dejando fuera el segmento no confirmado. Los puntos posteriores de texto siguen en el historial; no se eliminan para aparentar concordancia.

### Archivo y MP3 de una recuperación

Se corrige la guardia del cliente que comparaba partes recuperadas con blobs del heap de la sesión anterior: al recargar, ese heap está vacío y no prueba ausencia del audio persistido. El total esperado se reconstruye de índices conocidos y pendientes; el evaluador rechaza huecos, duplicados, tamaños/huellas inválidos y partes sin verificación. El servidor conserva su manifiesto estricto y su bloqueo transaccional: esta corrección NO consiste en saltarse la guardia.

El MP3 sigue siendo derivado del audio original por el pipeline real de §8/§20. Recuperar partes no certifica disponibilidad instantánea del MP3. La descarga usa el flujo existente con dueño, bóveda y verificación de bytes. Se conserva la diferencia entre prefijo, captura cerrada y MP3 disponible; no hay texto a voz. Los originales no se eliminan al generar el derivado.

### Actividad acústica y accesibilidad

`AudioActivity.tsx` lee mediante Web Audio el MISMO `MediaStream` del grabador; no solicita otro permiso, no envía muestras ni conserva datos nuevos. La onda representa energía de señal real, no animación decorativa; queda plana al detenerse o si el flujo no está disponible. No es decibelímetro ni diagnóstico. Los recursos del analizador se cierran sin detener las pistas que usa la captura. Con movimiento reducido se actualiza menos; en segundo plano no dibuja continuamente.

Panel con nombre accesible, cierre por Escape cuando no hay operación, confinamiento de tabulación, devolución de foco, bloqueo de scroll del fondo y controles de al menos 44 px. La actividad no se anuncia continuamente por lector de pantalla; el estado y los errores sí. Se revisan escritorio, móvil de 390 px, tema oscuro/claro, captura vacía, grabación, recuperación y error. Una revisión visual automatizada no sustituye la aceptación del operador.

### Código, ensayos y límites

Nuevos puntos de mantenimiento: `lib/server/custodia-recuperacion.ts`, `lib/custodia/recuperacion.ts`, `RecoveryDrawer.tsx`, `AudioActivity.tsx`, `ingreso-studio.module.css`; integrado en IngresoWorkspace, IngresoView, IndexedDB y ruta de checkpoint existentes. No se crea otro almacén principal.

Pruebas: `tests/unit/custodia_recuperacion.test.ts`, `e2e/ingreso-recovery-redesign.spec.ts`, `tests/integration/ingreso-recuperacion-postgres.ts`. El ensayo SQL usa PostgreSQL/PGlite aislado, mismo esquema, transacciones y consultas reales; no certifica bloqueos de conexiones simultáneas ni Neon/Blob productivos. Chromium usa medio generado y respuestas API sintéticas; no voz física, reconocimiento real ni aprobación de comodidad. Se conservan las pruebas de edición/encuesta y sus aserciones de contenido; se actualiza el doble al catálogo nuevo, no se retiran guardias.

Resultados y huellas del corte revisado: `docs/frentes/dictado-voz/evidencias/INGRESO-RECUPERACION.json` desde la raíz del repositorio. Estado operativo único en `OBJETO-CANONICO.md` del mismo frente. La integración y la publicación se acreditan por separado en la solicitud; este texto no certifica una versión futura ni un recorrido humano no realizado.
