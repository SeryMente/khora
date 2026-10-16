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
| Revisión visual y sus acciones | `app/sistema/volcados/page.tsx`, `app/components/shared/PipelineView.tsx` |
| Dominio audio/no-audio | `lib/server/domainAudio.ts` |
| Generación de títulos | `lib/server/titulos.ts` |
| Copia secundaria de mejor esfuerzo | `lib/server/espejoNotion.ts` |
| Cifrado y PIN | `lib/server/cripto.ts`, `lib/server/boveda.ts` |
| Migración aditiva | `db/migrations/030_custodia_continua.sql` |

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
- `dictado_mp3`: estado durable del derivado, huella original, huella/tamaño del MP3, ubicación cifrada, intentos, arrendamiento y error.

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

El modo Chrome/Aisthesis tiene su propio capturador de extensión. **No atribuirle automáticamente las garantías del grabador de micrófono.** La cola y confirmación final de esa extensión requieren verificación independiente; consultar la matriz de pendientes antes de certificar ese modo.

## 7. Archivar y recuperación

Antes de cerrar se intenta un checkpoint. La transacción principal verifica manifiesto canónico, mantiene la identidad de sesión, cifra y persiste la captura, sella sesión y vincula partes. Audio sin transcripción se admite para todos los modos de audio con originales verificados, no solo para importación.

La identidad del original se contrasta separadamente del texto vigente, de modo que una edición posterior no debe invalidar el reconocimiento de un reenvío original. El estado de preparación se retorna en el recibo: captura conservada y preparación fallida son estados distintos.

Durante guardado o después del sello, los controles que mutan la captura se bloquean. Limpiar no descarta una captura abierta: exige cerrar antes de comenzar otra. Tras sellar se puede abrir una captura nueva y el título anterior no se arrastra.

Recuperación: autenticar identidad → leer último snapshot local y remoto → comprobar si la sesión local ya se selló → reconstruir manifiesto desde la tabla canónica → recuperar partes locales pendientes → reintentar con mismos índices → restaurar texto/título/fuente/duración. Una respuesta tardía no debe pisar contenido que ya escribió el operador. No borrar recuperables por no poder sincronizarlos.

## 8. MP3: original y derivado

No hay texto a voz. La entrada del conversor son exclusivamente bytes de originales verificados.

Al cerrar una captura con audio se registra trabajo durable y se intenta procesarlo después de persistir la captura. `ffmpeg-static` integra el codec existente FFmpeg; no se añade un proveedor de audio externo. El binario debe corresponder a la plataforma de despliegue y quedar incluido por `next.config.ts`. Preservar sus avisos/licencias y comprobar el tamaño final del paquete de la función.

Estados: pendiente → procesando con arrendamiento → disponible, o fallido con causa. Un proceso vencido puede reintentarse; una marca pendiente no significa disponible.

Secuencia: verificar cada original → reconstruir grupos de grabación → decodificar a PCM → concatenar grupos en orden → codificar MP3 a 192 kbps → decodificar el resultado → contrastar duración (tolerancia actual 250 ms) → cifrar → almacenar → releer/descifrar/comprobar huella y tamaño → marcar disponible.

Una grabadora WebM continua puede generar partes posteriores sin cabecera independiente. Se juntan antes de decodificar. Una cabecera EBML nueva inicia otro grupo: permite pausas/reanudaciones del grabador sin ignorar silenciosamente la segunda grabación. Hay que certificar este comportamiento con los navegadores soportados y archivos reales, no solo tonos WAV sintéticos.

Límites actuales: 128 MiB de originales por conversión; timeout de 90 s por operación de codec; función con duración configurada hasta 300 s, sujeta al plan del proveedor. Superar un límite deja el original y un error explícito; **no cumple todavía conversión universal de grabaciones arbitrariamente largas**. Para ampliar, medir memoria/disco/tiempo y elegir ejecución larga sin reemplazar originales.

Los temporales claros se crean en carpeta única y se eliminan al terminar, también al fallar. La clave de cifrado no se incorpora al archivo ni a la dirección pública. No introducir comandos shell con nombres de archivo proporcionados por usuarios.

## 9. Acceso manual y MCP

Manual: la vista de Volcados solicita el MP3 persistido. Si falta, puede solicitar una generación/reintento; no descarga HTML/JSON como si fuera audio. `GET /api/audio/:id/mp3` exige sesión, propietario y bóveda abierta; verifica bytes antes de devolverlos con `audio/mpeg`, `no-store` y huella. `POST` solicita generación, no certifica su terminación.

El original sigue accesible por sus rutas de partes y por el exportador de originales importados. No presentar una recodificación como original.

MCP: `khora_listar_audios` y `khora_leer_audio`. Reutilizan autenticación Bearer, revocación, `volcados:read` y compuerta normativa. Filtran por propietario comprobable. No emiten enlaces públicos ni introducen una credencial nueva.

Lectura: seleccionar original/parte o MP3; obtener bloques Base64 de hasta 262144 bytes; continuar con `siguiente_offset` hasta null; reconstruir y verificar la huella total declarada. La verificación se realiza sobre el objeto completo antes de servir un bloque. El original multipartes se recupera en orden de índice; conservar el manifiesto. Para escucha directa, preferir el MP3 completo. Base64 no es un resumen, una transcripción ni síntesis.

Las herramientas usan la base de lectura y no generan MP3, migran datos ni cambian estados. Que aparezca una herramienta en la rama no significa que el conector instalado ya la exponga: comprobar descubrimiento después del despliegue.

## 10. Títulos automáticos

La captura obtiene primero título provisional determinista; nunca espera a IA para conservarse. Después del cierre, si el operador no proporcionó título, se intenta el generador IA existente. La actualización usa comparación con el título provisional para no pisar un título cambiado entre tanto.

Si la IA no está configurada o falla, el fallback no se presenta como título generado por IA. La regeneración explícita existente sigue siendo una vía de reintento. **Falta certificar y completar una cola durable de reintento automático de títulos**; el callback posrespuesta por sí solo no demuestra ejecución eventual.

No derivar títulos inventando hechos ausentes. Para audio sin texto, preservar identidad provisional y titular cuando exista contenido verificable suficiente.

## 11. Versiones, revisión y aprobación

Preparar revisión asegura esquema antes de bloquear, crea la versión dentro de la misma conexión y no llama al generador de títulos bajo ese bloqueo. Texto vacío no fabrica v1. La lectura GET de versiones no crea versiones.

Las ediciones y aprobaciones bloquean el mismo volcado. La edición crea versión, actualiza texto vigente, invalida aprobación y registra deltas en una transacción común. Los deltas conservan acentos, puntuación, mayúsculas, espacios, inserciones y borrados. Para entradas demasiado grandes para la comparación fina se conserva diferencia íntegra, no un placeholder.

La interfaz envía versión y huella base. Un conflicto no se trata como éxito silencioso. El motivo predeterminado de edición es enmienda de contenido; un defecto de transcripción debe declararse como tal. No inferir autorización por haber guardado.

La vista conecta hallazgos, incidentes y aprobación; el texto accesible usa la versión seleccionada, no v1 fija. La aprobación requiere compuerta vigente y coincidencia de huella; mantener la validación final de ingesta independiente. Certificar carreras de hallazgos/incidentes contra aprobación con PostgreSQL real.

## 12. Espejo, respaldo y retención

El espejo Notion sigue siendo secundario y de mejor esfuerzo. No es un respaldo íntegro del audio. Su deduplicación, cola durable, lectura posterior, límites de bloques y restauración NO se consideran resueltos por esta implementación.

Retención: no hay borrado automático nuevo de originales, checkpoints remotos o versiones. No añadirlo sin decisión explícita del operador. La cola local de partes puede retirarse solo tras confirmación remota; un snapshot local se retira tras comprobar cierre remoto. No usar limpieza del navegador como procedimiento de respaldo.

Para certificar preservación se debe restaurar base, objetos y claves en otro entorno y abrir/descargar los mismos originales y versiones. Cifrar sin conservar recuperablemente la clave no garantiza preservación.

## 13. Seguridad y límites de las garantías

AES-GCM del servidor no es E2E; servicios autorizados pueden recibir texto claro para IA o espejo. El PIN es una compuerta de acceso, no la llave criptográfica del original. Mantener las llaves fuera de Git.

Las rutas nuevas de checkpoint/MP3 y herramientas de audio verifican propietario. Esto **no certifica aislamiento multiusuario de todas las rutas heredadas** del inventario, texto, partes, hallazgos o incidentes. La auditoría de autorizaciones del conjunto sigue pendiente. Los históricos sin dueño verificable se reportan, no se reclaman automáticamente desde herramientas de lectura.

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

La rama no se considera cierre universal mientras permanezcan:

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
| Abrir Volcados | Seleccionar captura y versión, texto y reproductor por partes | Una fila de inventario no prueba disponibilidad de bytes |
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
- **MP3 fallido**: conservar y recuperar partes originales; solicitar reintento manual. No declarar conversión eventual garantizada mientras no exista reconciliación automática certificada.
- **Título fallido**: conservar el título provisional y todo el contenido. Regeneración explícita disponible; cola automática pendiente.
- **Integridad rota**: no abrir los bytes como si fueran verificados, no reemplazar silenciosamente la huella almacenada. Investigar desde la evidencia original.
- **Datos históricos**: inventariar propiedad, disponibilidad y partes antes de cualquier backfill. No borrar, adjudicar, sobrescribir ni declarar migrados datos no comprobados.
- **Conflicto concurrente**: conservar ambas evidencias y exigir selección explícita; no usar el reloj de una pestaña como prueba de supremacía semántica.

Para rollback, revertir código en una rama revisada; no deshacer migraciones aditivas eliminando tablas con capturas. Mantener las versiones compatibles de lectura y las claves hasta comprobar restauración. Este documento complementa `PREPARACION-VOLCADOS.md` y el contrato MCP vigente; no sustituye sus compuertas.
