# Harmonia → Cora · persistencia provisional de observabilidad

**Estado:** implementación candidata en rama de trabajo; no fusionada en `main`, no desplegada y no aceptada en Chrome.  
**Versión de Harmonia prevista:** 0.3.1.  
**Corte:** 2026-10-30.

## 1. Decisión y vigencia

Se autoriza como solución **expresamente provisional** utilizar el backend web de Cora (`https://khora-web.vercel.app`) para persistir una réplica reducida de los eventos técnicos generados por Harmonia. Esta decisión no convierte al repositorio Git en almacén de datos ni traslada a Cora los archivos originales completos.

El flujo provisional se mantiene hasta que el frente defina, implemente y acepte un proveedor permanente de almacenamiento/observabilidad. Esta nota no declara resuelta esa selección ni autoriza borrar, reemplazar o migrar destructivamente los originales locales.

## 2. Recorrido de los datos

1. La extensión Harmonia captura eventos de observabilidad dentro del alcance vigente.
2. El colector local valida cada evento, conserva el original en JSONL y, para una superficie nueva, guarda su representación estructural completa en el directorio local `surfaces/`.
3. Después de guardar el original, el colector crea en `index.json` una entrada de outbox con una **proyección mínima anonimizada**. La proyección no incluye el payload original ni la superficie completa.
4. El service worker consulta la outbox local y agrupa hasta 50 eventos de una misma sesión.
5. Si existe una pestaña de Cora en el dominio canónico, el service worker inyecta en esa pestaña una llamada same-origin a `POST /api/observaciones/runtime`. La petición usa la sesión normal del usuario en Cora (`credentials: include`) y el encabezado de origen esperado. No se guarda una API key de Cora en la extensión.
6. Cora valida `ObservationBatchSchema` v2.0 y llama a `persistObservationBatchRuntime`, que persiste en Neon a través de `eventos_sistema`.
7. Harmonia elimina de la outbox local únicamente los UUID que Cora confirmó como persistidos o duplicados idempotentes. Si el acuse local falla después de la escritura remota, el reintento conserva el mismo UUID y Cora puede reconocerlo como duplicado.

**Dependencias operativas:** colector local activo, Chrome abierto, pestaña de Cora en el dominio canónico, sesión Cora autenticada y conectividad de red. Sin esas condiciones los datos permanecen localmente pendientes.

## 3. Alcance de lo que sale del equipo

La proyección remota usa una lista cerrada. Puede contener:

- UUID aleatorios de evento y sesión, que permiten correlación técnica temporal;
- nombre de evento fijado por el colector (`harmonia.ui.surface.scan`, `harmonia.ui.surface.reused`, `harmonia.capture.started`, `harmonia.capture.stopped`);
- marca temporal, severidad y resultado fijos;
- huella SHA-256 de la superficie;
- versión del catálogo e IDs de capacidades observadas;
- conteos estructurales (controles, nodos, hojas de estilo), dimensiones de viewport, factor de escala, indicador de deduplicación y ordinal de origen;
- duración numérica de la captura cuando está disponible.

La proyección **no** incluye texto de mensajes, borradores, contenido de páginas, etiquetas accesibles de controles, placeholders, valores de campos, DOM/CSS completo, hojas de estilo, URLs, rutas, nombres de cuenta, correo, cookies, credenciales, tokens, audio ni archivos. Tampoco se envía el JSONL original ni los documentos de superficie. No se ejecuta un backfill automático de eventos anteriores a esta versión.

El contrato de Cora clasifica los eventos como `ANONYMIZED_TELEMETRY`. El cliente crea un entorno de diagnóstico deliberadamente genérico (`user_agent=redacted`, plataforma no especificada, idioma `und`, zona `UTC`) para no transmitir una huella innecesaria del dispositivo.

## 4. Límite crítico de aislamiento

La ruta de Cora exige una sesión autenticada (`auth()`) y una cabecera que identifica a Harmonia como fuente. Sin embargo, el almacenamiento inspeccionado de `eventos_sistema` **no particiona estos eventos por usuario/cuenta**: se trata de telemetría anonimizada compartida del sistema.

Por esa razón, esta integración solo es apta para los resúmenes técnicos permitidos en §3. No es apta para datos de usuario, trazas asociadas a una identidad, contenidos personales, información comercial, mensajes, archivos ni respaldos por usuario. La sesión autentica el permiso de envío, pero no crea aislamiento por titular en las filas de telemetría.

## 5. Entrega, reintento y límites

- Lotes: máximo 50 eventos y una única sesión por lote.
- Reintento: cada minuto mientras el entorno de Chrome esté activo y exista una pestaña de Cora disponible.
- Idempotencia: UUID de evento estable, deduplicación del backend y acuse local posterior a la confirmación remota.
- Cola local: máximo 20 000 proyecciones pendientes en el índice local.
- Si se alcanza el límite, los eventos siguientes continúan guardándose en el archivo local y se contabilizan como `local_only`; no se declaran sincronizados.
- Si el endpoint responde 401/403/400/502, la conexión falla o la respuesta no confirma la cantidad total del lote, Harmonia no acusa la entrega y conserva los eventos pendientes.
- El almacén local sigue siendo la copia íntegra y de referencia durante esta etapa.

## 6. Persistencia de Cora utilizada

La integración reutiliza código ya desplegado en el corte revisado de producción de Cora (commit `e36c0ad75546f0647e56ea396dd6adeb4454d419`):

- Endpoint: `khora-web/app/api/observaciones/runtime/route.ts`.
- Contrato: `khora-web/lib/contracts/observation-batch.ts` (`ObservationBatchSchema` v2.0).
- Adaptador: `khora-web/lib/server/observation-runtime.ts`.
- Almacenamiento: Neon PostgreSQL, tabla `eventos_sistema`.

No se requiere una modificación del esquema de Neon ni de las variables de producción para esta integración. Esta implementación candidata modifica el colector y la extensión de Harmonia, no la aplicación productiva de Cora.

## 7. Sustitución por almacenamiento permanente

La retirada de esta solución provisional exige completar, como mínimo:

1. elegir y documentar el proveedor permanente, el responsable y el modelo de aislamiento por usuario/instalación;
2. definir un contrato independiente del proveedor actual y una exportación de eventos sin pérdida;
3. migrar tanto eventos pendientes como el histórico que el titular autorice explícitamente a trasladar;
4. reconciliar conteos y UUID, comprobar SHA-256 y hacer lectura de vuelta desde el destino;
5. probar reintentos, duplicados, restauración y recuperación después de reiniciar;
6. mantener intactos los originales locales hasta que la migración y su aceptación estén verificadas;
7. retirar la ruta provisional y sus permisos solo después de verificar el nuevo flujo de extremo a extremo.

## 8. Criterios de aceptación de esta integración

La fusión/publicación no equivale a aceptación. Antes de declarar operativo el flujo deberán verificarse: pruebas del colector y del conversor, autenticación real en Cora, lote sintético persistido, consulta de lectura de vuelta en Neon, reintento idempotente, recuperación con outbox pendiente tras reinicio, ausencia de campos prohibidos en el lote remoto, y sincronización natural desde la extensión cargada en Chrome. La aceptación física en Chrome requiere la comprobación del operador; no se presume a partir de pruebas sintéticas.


## 10. Validación local de la ruta de sincronización · 2026-10-30

La PR #346 incorporó la prueba automatizada `tests/service-worker-remote-sync.test.js`. En PC-14 mediante RDC, con el runtime oficial Node.js v22.23.4 x64 cuya descarga y binario fueron verificados por SHA-256, se ejecutaron las cuatro comprobaciones sintácticas del workflow y la suite completa: **7/7 PASS**. La prueba usa el colector HTTP real y el service worker/conversor reales; simula Cora con respuestas 401 y 200 para comprobar retención de outbox, reintento con UUID estable, filtrado de campos privados y ACK tras confirmación.

Esta evidencia es una integración local controlada, no una prueba real de navegador ni de persistencia remota. El endpoint productivo devolvió 401 al recibir una solicitud sin sesión, y no se realizó una escritura de prueba. Las huellas de la ruta, del contrato v2.0 y del adaptador en producción coinciden con las de `main` en el corte inspeccionado. Sigue pendiente una sesión Cora autenticada en Chrome, una inserción positiva y lectura de vuelta en Neon, y la navegación natural con la extensión cargada por el operador.

Los workflows de GitHub asociados al head actual continúan finalizando sin pasos ejecutados, con causa subyacente no determinada. Los estados de Vercel/Netlify también muestran fallos externos; los resultados locales no se usan como sustituto de esos gates. La rama de esta PR está dos commits detrás de `main` y no se rebasó ni fusionó.

## 9. Estado del trabajo al corte

Se creó una rama aislada desde `main`: `feat/harmonia-cora-provisional-persistence-20261030`. El código de integración y esta documentación se encuentran en esa rama. La aplicación local v0.4.1 de la rama candidata histórica de Harmonia es divergente respecto de `main`; esta implementación sobre la línea canónica v0.3.x no se materializa automáticamente en ese paquete local. La PR #333 permanece cerrada y no fusionada. No se ha modificado `main`, no se ha desplegado Harmonia ni se ha alterado Chrome en este ciclo.
