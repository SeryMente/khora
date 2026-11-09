<!-- LIST_VERSION=0.23; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Lista provisional de tareas · Frente Custodia

> **ESTADO: PROVISIONAL · NO CERTIFICADA CONTRA EL DISEÑO METODOLÓGICO FINAL.** Se conserva aquí por instrucción expresa del operador. CUSTODIA-02 fue retirada de las tareas activas por instrucción del operador; no se reutiliza su identificador. Esa retirada no certifica metodológicamente esta materialización. Este archivo no crea un segundo objeto canónico ni otro control de responsabilidad; el núcleo único del frente sigue siendo [OBJETO-CANONICO.md](OBJETO-CANONICO.md).

- **Frente:** Custodia.
- **Versión de esta lista provisional:** 0.23.
- **Última actualización:** 2026-11-09 (autorización contextual recibida para verificar/corregir solo credenciales B2 de Production mediante bóveda canónica y desplegar a producción únicamente después de superar todas las pruebas; ejecución aún pendiente).
- **Metodología en la primera redacción:** Samantha v348 · NX-348m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `a4c90bd8ff1cd360b1f1662ff55371bd1b56b4cd`.
- **Revalidación antes del cierre (intermedia):** Samantha v351 · NX-351m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `f069d2385f47731ac9d0f0ca76bfd3cef859cdd2`.
- **Última lectura de metodología del ciclo 2 (referencia histórica):** Samantha v352 · NX-352m; Metacanon 1.21; GOW v2.3; blob `94473eccb6fa71303d5908ce678f7efeb191c215`.
- **Última lectura metodológica histórica (ciclo 4):** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798`.
- **Última lectura metodológica histórica (C008):** Samantha v358 · NX-358m; Metacanon 1.23; GOW v2.7; blob `89a28e4d05f5baab9c4b86abdb9fbfc532690c75`.
- **Revalidación metodológica C009–C011 (histórica):** Samantha v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`, leído de `SeryMente/metodologia/main` el 2026-10-29.
- **Gobierno vigente revalidado en esta retoma (2026-11-08):** Samantha v383 · NX-383m; Metacanon 1.29; GOW 2.18; DUG blob `cad464717c43733aa84b49f8c9c3af0875597fbd`; commit main `5f703622f11182a048db97419d8d6ef96b40a1c9`. Se leyó §ARR y se consideraron los principios de cascada, no simulación, autorización explícita, resolución de colisión de responsabilidad, preponderancia del repositorio y anti-ineficiencia. MCP-NORMATIVO: DESACTIVADO.
La lista sigue provisional; ni el relevo ni esta revalidación certifican su diseño.
- **Alcance y orden operativo vigente:** para restablecer el servicio, la secuencia inmediata aprobada es (1) CUSTODIA-B2-006, restaurar archivado; (2) CUSTODIA-B2-005, verificación E2E y diagnóstico residual; (3) CUSTODIA-B2-007, estabilización; (4) CUSTODIA-RES-001, diseño multialmacén; (5) CUSTODIA-RES-002, implementación/certificación. CUSTODIA-03 y CUSTODIA-01 permanecen abiertas y conservan sus evidencias; su ejecución se retoma tras recuperar el archivado, sin declararlas cerradas ni renumerarlas. CUSTODIA-04 continúa abierta y no se sustituye.
- **Autorización recibida 2026-11-09:** el operador respondió «Correcto , actualiza tareas provisionales rapidamente, y resuelve.» a la pregunta explícita de autorización para actuar sobre credenciales B2 de Production y desplegar a producción condicionado a pruebas satisfactorias. Se registra como asentimiento contextual limitado a verificar/corregir solo variables B2 de Production mediante la bóveda canónica y a desplegar solo cuando todos los gates técnicos pasen. Original: [INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md](originales/INSTRUCCION-AUTORIZAR-B2-PRODUCTION-20261109.md), A UUIDv7 local `01a1c17d-189a-7fea-a644-6be002e2c07a`.
- **Compuerta de despliegue:** la autorización no equivale a ejecución ni aceptación. Antes de producción deben pasar pruebas de autenticación, bucket privado/identidad, PUT/GET físico sintético, SHA-256/bytes, vínculo y manifiesto de partes, archivado E2E y recuperación tras recarga. Debe inspeccionarse primero el hook de build existente; no ejecutar SQL/backfill ni migraciones productivas fuera de autorización.
- **Regla provisional de custodia de información:** no copiar a este repositorio el texto o audio de dictados reales, secretos, credenciales ni identificadores personales innecesarios. Registrar resultados mediante evidencia minimizada y sanitizada, en el soporte autorizado que corresponda.

### Secuencia de ejecución · antecedente histórico y secuencia vigente

Secuencia histórica (C006; antecedente conservado y supersedido por la secuencia operativa vigente del 2026-11-06):
  1. Línea base no destructiva de CUSTODIA-03.
  2. Recuperación de CUSTODIA-01 en paralelo con investigación de ausencias.
  3. Corrección E2E de CUSTODIA-04.
  Esta secuencia se conserva como antecedente histórico; no rige la prioridad actual.

**Secuencia operativa vigente · 2026-11-06**
  1. **CUSTODIA-03 — rescate de lo presuntamente perdido (PRIORIDAD #1):** comenzar por el candidato textual de las 20:29 del 28-10-2026 (264 checkpoints), verificarlo con la identidad propietaria y la bóveda desbloqueada; en paralelo revisar las otras seis sesiones/1,038 checkpoints posteriores al corte de las 17:08. Reconciliar todas las páginas del catálogo y las sesiones archivadas. Después abordar candidatos de audio B2, Vercel Blob, IndexedDB del perfil original y cualquier fuente adicional autorizada. Preservar orígenes; restaurar en destino separado; leer de vuelta. La sesión 20:29 es solo candidata y no contiene partes de audio registradas en Neon.
  2. **CUSTODIA-01 — unidades visibles en Recuperación (PRIORIDAD #2):** después de asegurar la primera pasada de rescate de CUSTODIA-03, adquirir el catálogo completo paginado y recuperar/verificar cada unidad visible. Se puede adelantar una unidad positiva y segura si hacerlo no desplaza el rescate de ausentes ni consume la única sesión/perfil autorizado.
  3. **CUSTODIA-04 — corrección sistémica y pruebas (PRIORIDAD #3):** mantener como paréntesis acotado la investigación de «Archivar registro». La revisión estática anterior localizó el mensaje en la compuerta cliente de Dictado antes del POST /api/dictado; el error de referencia es «No se puede archivar el registro: Khora no ha verificado la custodia íntegra de todas las partes de audio». No repetir ese diagnóstico sin nueva evidencia. Capturar el estado runtime solo si no interrumpe el rescate. La corrección de código, cambios de producción o despliegue no se anteponen a la recuperación de fuentes históricas y requieren su autorización específica.
  4. **Regla transversal de rescate:** en cualquier fuente candidata, primero identificar y preservar; después recuperar en destino separado, verificar identidad/contenido/partes/huellas mediante lectura de vuelta, y solo entonces marcar como recuperada. No confundir localizada, histórica/verificada al subir, recuperable ahora, restaurada ni aceptada. No declarar irrecuperable antes de agotar fuentes autorizadas.

---


## Secuencia de trabajo · 2026-11-09 · APROBADA PARA EJECUCIÓN ACOTADA

**Instrucción fuente:** [INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](originales/INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md).  
**Decisión nueva:** el objetivo final deja de ser migrar de forma exclusiva de Vercel Blob a B2. Se construirá una arquitectura con varios medios, salud/capacidad, enrutamiento, réplicas y recuperación. B2 sigue siendo el medio inmediato para recuperar el archivado mientras se diagnostica y se habilita.  
**Estado de esta secuencia:** APROBADA por instrucción del operador en esta conversación. CUSTODIA-B2-006 está EN CURSO en rama/no producción. El visto bueno no levanta las compuertas específicas de producción, credenciales, seguridad, SQL productivo ni objetos originales.

| Orden | ID | Prioridad | Estado | Resultado que cierra |
|---:|---|---|---|---|
| 1 | CUSTODIA-B2-006 | P0 | EN CURSO | Restablecimiento inmediato de archivado con B2; autenticación, PUT/GET físico, SHA/bytes, vínculo de partes y archivo E2E en entorno aislado |
| 2 | CUSTODIA-B2-005 | P0 | EN CURSO | Verificación E2E y diagnóstico residual: estado actual de Blob, respuesta B2 saneada y matriz de fallos de la cadena completa |
| 3 | CUSTODIA-B2-007 | P1 | PROPUESTA | Estabilizar y simplificar la implementación sin perder integridad ni lectura histórica necesaria |
| 4 | CUSTODIA-RES-001 | P1 | PROPUESTA | Diseño validado de persistencia local-first, réplica y failover multi-proveedor |
| 5 | CUSTODIA-RES-002 | P2 | PROPUESTA | Implementación aislada y certificación de fallos/restauración; producción queda como compuerta independiente |

**Recuperación histórica conservada:** CUSTODIA-03 y CUSTODIA-01 siguen abiertas y con su evidencia original; no se consideran completadas por restablecer el archivado. Se reanudan tras recuperar el servicio, sin borrar ni renumerar tareas existentes.

**Decisión supersedida:** la instrucción del 2026-11-07 que declaraba B2 como único backend final queda preservada en el historial, pero no rige la arquitectura objetivo tras la nueva instrucción del 2026-11-09. El uso inmediato de B2 no implica que sea el único proveedor final.

**Límites de esta actualización:** solo documentación provisional. No se modificaron código, variables, credenciales, buckets, seguridad/CORS, base productiva, objetos originales ni despliegues. La aprobación de esta secuencia será la compuerta previa al trabajo de implementación.


## Orden de prioridad y criterio de coordinación · antecedente histórico (reordenado temporalmente el 2026-11-09)

| Orden | Tarea existente | Objetivo prioritario | Condición para avanzar |
|---|---|---|---|
| 1 | CUSTODIA-03 | Rescatar dictados ausentes/presuntamente perdidos y sus fuentes candidatas. | Empezar por las rutas positivas ya conocidas; no esperar el inventario global para preservar un candidato confirmado. |
| 2 | CUSTODIA-01 | Recuperar todo el catálogo visible de Recuperación. | Iniciar tras la primera pasada del candidato ausente; no se exige cerrar CUSTODIA-03. |
| 3 | CUSTODIA-04 | Corregir brechas sistémicas y certificar el flujo E2E. | El diagnóstico del botón es un paréntesis acotado; la implementación no desplaza el rescate. |

**Objetivo rector inmediato:** convertir cada candidato de pérdida en un estado verificable y, cuando sea recuperable, en una restauración leída de vuelta en destino separado. «No visible» no significa «perdido»; «metadatos verificados» no significa «objeto recuperable ahora». No prometer recuperación de datos que ya no existan en ninguna fuente, pero agotar las fuentes autorizadas y preservar todo lo rescatable.

---

## CUSTODIA-03 · Localizar y rescatar los dictados presuntamente perdidos; determinar el alcance real de la posible pérdida

**Prioridad estructural:** P0 · CRÍTICA · PRIORIDAD #1 del rescate histórico de información. **Orden temporal actual:** inicia después del restablecimiento de archivado de CUSTODIA-B2-006 y su verificación E2E residual CUSTODIA-B2-005; no desplaza la urgencia de recuperar el servicio.

**Estado:** ABIERTA · P0 · PENDIENTE DE REANUDACIÓN TRAS B2-006/B2-005. No se ha efectuado todavía la recuperación productiva; existen candidatos concretos que deben cotejarse primero.

**Motivo:** el incidente reportado el 28-10-2026 dejó de permitir asumir que todas las capturas relevantes están presentes en el inventario visible. El operador informa que falta un dictado realizado hacia el final de una sesión de terminal y que la última entrada visible en Recuperación fecha del 28-10-2026 a las 17:08. También reporta un contador que cambia de 40 a 20. La explicación de duplicados local/remoto es plausible por el código inspeccionado, pero no se ha comparado el catálogo real y no cuantifica las capturas ausentes.

**Objetivo rector:** localizar y recuperar primero el dictado específico que se considera perdido y cualquier otra unidad ausente con fuente candidata; preservar todas las fuentes y restaurar en un destino separado con lectura de vuelta. Después, cuantificar el universo de dictados ausentes, duplicados, archivados, locales solamente, incompletos, inaccesibles o irrecuperables. No se tomará «no visible» como sinónimo de «perdido» ni «metadatos presentes» como sinónimo de «recuperable ahora».


### Evidencia adicional 2026-11-07 · candidato de texto en snapshot Neon

- En la rama no predeterminada `custodia-b2-migration-test-20261031`, creada el 2026-10-31 a partir de un snapshot de main con parent timestamp 2026-10-31T20:42:02Z, se inspeccionó el esquema y solo se consultaron agregados en la copia `neondb`.
- Aparece una sesión creada entre 20:29 y 20:30 del 28-10 (hora America/Mexico_City) con **264 revisiones únicas**; las 264 filas tienen texto y snapshot no vacíos. Suma agregada de longitudes: 769,749 caracteres. No se leyó ni exportó el contenido.
- Metadatos de la misma sesión: estado `checkpoint`, `total_partes=0`; 0 filas de `dictado_audio_parte`, 0 de `dictado_mp3`, 0 de historial MP3, 0 `volcado_id` y 0 relaciones `volcado` con audio. Esto respalda un candidato de texto, no audio recuperable.
- La consulta por `dictado_checkpoint.client_at` desde 17:08 hasta medianoche devolvió **2 sesiones/268 checkpoints** en este snapshot: una de 264 y otra de 4. No coincide con C014 (7 sesiones/1,038 checkpoints); ambos cortes quedan preservados y la diferencia no está reconciliada. No sustituir el dato C014 con esta muestra.
- La base separada `custodia_b2_e2e` no tenía datos en las tablas de audio/migración inspeccionadas (tamaño de tabla 0 bytes); no es fuente para este rescate.
- Evidencia sanitizada: [CUSTODIA-03-CANDIDATO-TEXTO-NEON-SNAPSHOT-20261107.md](evidencias/CUSTODIA-03-CANDIDATO-TEXTO-NEON-SNAPSHOT-20261107.md), blob `9bfaac04eb2aff22cb212de1ca5c90fc4494d867`.
- **Estado:** candidato localizado en snapshot, identidad con el dictado buscado NO CONFIRMADA, contenido no leído, recuperación NO EJECUTADA, audio NO ENCONTRADO en las tablas de esta sesión. La rama es copia de datos de main y puede contener información real; no se interpreta como entorno sintético.
- **Siguiente paso:** cotejar el contenido de ese único candidato con lo que busca el operador, bajo acceso/autoridad del propietario y sin reproducirlo ni persistirlo en GitHub; después, si coincide, restaurar solo a destino separado y verificar lectura de vuelta. En paralelo, mantener la investigación física de B2/Vercel Blob e IndexedDB original.


**Orden de rescate por valor y evidencia disponible**

1. **Candidato textual prioritario — sesión del 28-10-2026 a las 20:29:** en C014 se observaron siete sesiones y 1,038 checkpoints posteriores al corte reportado de las 17:08. Una sesión abierta a las 20:29 contiene 264 checkpoints. No tiene filas de partes de audio en Neon; es candidata a rescate de texto, no identificación demostrada del dictado ni recuperación de audio. Desde la aplicación Khora con cuenta propietaria y bóveda desbloqueada, localizar la sesión por ventana temporal, abrir todas las revisiones y compararlas con el dictado que el operador espera. No copiar texto ni identificadores reales a GitHub.
2. **Otras sesiones/checkpoints del mismo periodo:** recorrer el catálogo completo hasta nextCursor=null, deduplicar por identidad estable y revisar estados abiertos/cerrados/archivados. Comparar la ventana del incidente con las siete sesiones posteriores y cualquier otra referencia de Custodia; distinguir hora del cliente y recepción del servidor.
3. **Audio histórico Backblaze B2:** seis sesiones históricas con 736 filas de audio, 2,147 checkpoints y 60,150,069 bytes cifrados según metadatos, fechadas el 20 y 22 de octubre. Todas se marcaron históricamente como verificadas, pero no hay GET físico actual ni SHA recalculado. Usar solo una ruta S3 privada/autorizada y de solo lectura, paginar el listado, cotejar sesión/parte/bytes/SHA, descargar, descifrar KHC1 y recalcular tamaño/SHA-256. No usar el rol khora_lector, el endpoint no autenticado /api/auditoria en modo APPLY ni fusionar la rama B2 divergida.
4. **Audio histórico Vercel Blob:** 624 filas de 140 sesiones; 306 marcadas históricamente verificadas y 318 pendientes. El último antecedente reportó 636 objetos (1,010,497,194 bytes) y suspensión por cuota; eso no prueba borrado ni disponibilidad actual. Enumerar todos los cursores y hacer lectura privada/descarga de los objetos candidatos para validar existencia física, descifrado, longitud y SHA. El listado de una sola página del reconciliador actual no es inventario exhaustivo.
5. **IndexedDB del perfil original:** auditoría histórica del 28-10: cinco grupos, 993 partes descifradas entonces; cuatro snapshots con texto/parcial y uno solo con audio. El grupo de 707 partes mostró avisos DTS no monótonos y necesita validación/remultiplexación. La disponibilidad presente del perfil original y su CryptoKey es NO VERIFICADA. Solo inspeccionar el perfil propietario original; no tocar perfiles alternos ni intentar reconstruir claves.
6. **Otras fuentes del propietario:** la búsqueda de Gmail/adjuntos no pudo ejecutarse en el ciclo C014. No declarar que no existan correos o adjuntos. Revisar esta vía solo si vuelve a estar disponible una conexión autenticada y autorizada, sin exportar contenido privado a GitHub.

**Secuencia de ejecución**
1. Identificar y preservar primero el candidato 20:29 y sus 264 revisiones; extender al conjunto de siete sesiones/1,038 checkpoints si no coincide.
2. Reconciliar el catálogo completo y los estados de Custodia; no esperar al final de la auditoría para rescatar una fuente positiva ya identificada.
3. Verificar físicamente los candidatos B2 y Vercel; cotejar luego IndexedDB del perfil original y otras fuentes autorizadas.
4. Para cada candidato confirmado, preparar una restauración en un destino nuevo/separado, conservar el original y verificar por lectura de vuelta la identidad, el texto/audio, los índices, bytes, SHA e integridad aplicables. La recuperación productiva debe usar la autorización específica vigente para la escritura de destino; no usar una operación destructiva o que sobrescriba el origen.
5. Marcar cada unidad como LOCALIZADA, CANDIDATA, RECUPERADA, RECUPERACIÓN PARCIAL, NO LOCALIZADA TRAS BÚSQUEDA o IRRECUPERABILIDAD DEMOSTRADA, según evidencia. Mantener NO DETERMINADO mientras falte una fuente necesaria.
6. Documentar brechas y prevención después de asegurar los rescates positivos.


1. Con la identidad autenticada y autorización correctas, recorrer todas las páginas remotas de Recuperación hasta `nextCursor=null`, reconciliar el inventario por identidad estable y comparar el resultado con el estado local que siga disponible. No inferir que el delta 40→20 equivale a 20 dictados perdidos.
2. Investigar la ventana del incidente: la última unidad visible reportada a las 17:08 del 28-10-2026 y el dictado que el operador esperaba haber realizado después. Buscarlo tanto entre capturas abiertas/checkpoints como en el catálogo de Custodia si pudo haber sido archivado; distinguir las horas del cliente de las horas de recepción del servidor.
3. Bajo acceso autorizado de solo lectura, cotejar las filas de checkpoint, el acuse de envío, los estados de sesión y las referencias de objetos que puedan asociarse a la ventana. No entrar a otros perfiles/cuentas ni eludir límites de autenticación.
4. Establecer una clasificación por unidad, con evidencia mínima: visible y recuperable; localizada pero archivada; local solamente; duplicada; parcial/incompleta; existe el registro pero no se verifica el objeto; no localizada tras revisar las fuentes disponibles; o irrecuperabilidad demostrada. Si falta evidencia, conservar «NO DETERMINADO», sin convertir la ausencia de resultado en prueba de pérdida.
5. Si una unidad se encuentra, crear/usar un destino separado, preservar el origen y verificar por lectura de vuelta su contenido, integridad y procedencia antes de declararla recuperada. No sobrescribir o borrar originales ni sacar contenido sensible al repositorio documental.
6. Cuantificar el universo observado y sus límites: número de sesiones únicas, solapamientos local/remoto, páginas recorridas, entradas ocultas por filtros/estado, capturas recuperadas, parciales, no localizadas y efectivamente irrecuperables cuando eso se pueda demostrar. Documentar el método y la revisión exacta del despliegue si se logra obtenerla.
7. Determinar causa(s) raíz y medidas preventivas del incidente. Separar la corrección de la evidencia forense; proponer las modificaciones y pruebas de producto necesarias. No cambiar código, base de producción, credenciales, configuración ni despliegue sin la autorización específica del ciclo de implementación.

**Criterio de cierre**
- El dictado específico esperado queda identificado y, cuando haya una fuente recuperable, restaurado en un destino separado con lectura de vuelta; si no se puede localizar, existe un registro exacto de fuentes autorizadas revisadas y límites. No identificar la sesión 20:29 como el dictado buscado sin cotejar contenido con el operador.
- Se han investigado las fuentes prioritarias en el orden anterior, con conteos/paginación completos dentro del acceso autorizado; los datos históricos B2/Vercel/IndexedDB se clasifican con disponibilidad física actual separada de sus estados históricos.
- Cada unidad que se rescate pasa cotejo de lectura de vuelta, integridad y procedencia, con el original preservado.
- Se conserva un dictamen causal, los límites de evidencia y un plan de prevención. Si la fuente necesaria no está disponible o quedan capturas sin estado demostrable, la tarea permanece abierta.

**Dependencias:** navegador bajo la identidad propietaria y bóveda desbloqueada para cotejar el texto; acceso de solo lectura al catálogo/checkpoints; credenciales autorizadas y privadas de B2/Vercel para verificar bytes; y perfil/clave originales para IndexedDB. La falta de un medio bloquea solo esa fuente; no autoriza a inferir ni a declarar pérdida definitiva.

**Evidencia inicial:** [informe provisional del incidente](evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md); [inventario provisional de recuperabilidad](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md); candidato textual C014 20:29/264 revisiones; candidatos de audio B2 (736 partes/6 sesiones) y Vercel Blob (624 filas/140 sesiones).

---

## CUSTODIA-01 · Recuperar y verificar las unidades que muestra Ingresos → Dictado → Recuperación

**Prioridad:** P0 · URGENTE · PRIORIDAD OPERATIVA #2, después de la primera pasada de rescate de ausentes en CUSTODIA-03.

**Estado:** EN CURSO · SEGUNDA LÍNEA OPERATIVA — investigación de código ampliada con defectos de conteo/paginación; catálogo real completo y recuperaciones por unidad pendientes. No desplaza el rescate prioritario de CUSTODIA-03. La ejecución del objetivo principal no está cerrada.

**Avance documentado en el ciclo CUSTODIA-INV-RECUP-SES-20261028-R6K2M9Q4**

- Se creó [el inventario provisional de hallazgos](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md), versión 0.1, enlazado desde el OCP. Contiene hallazgos de código, límites de evidencia, los datos auxiliares del almacén local identificados por separado, clases de resultados por unidad y requisitos de aceptación.
- La lectura de código de main confirmó que el catálogo construye `audioParts` a partir del manifiesto/corte y no del conteo `audio_count` de partes verificadas; el flujo de recuperación remota limita también las partes copiadas al corte/manifiesto declarado. Esto explica un defecto potencial real, pero no cuantifica cuántas unidades visibles están afectadas.
- No se pudo obtener el catálogo autenticado de Ingresos → Dictado → Recuperación ni cotejar la disponibilidad real de los objetos remotos. Unidades reales cotejadas individualmente: 0; recuperaciones de producción confirmadas: 0. Cero cotejos no significa catálogo vacío.
- No se modificó código ni se alteraron sesiones/objetos de producción. La auditoría previa de cinco snapshots locales se conserva como evidencia auxiliar y no se usa como inventario de las unidades de la UI.

**Registro de lo conocido y lo desconocido**
- El operador informó inicialmente que la interfaz indicaba **20 dictados recuperables** y luego estimó que podrían ser aproximadamente 21. El número exacto no ha sido adquirido de la interfaz en este ciclo; ese dato no se debe usar como denominador cerrado.
- La unidad de inventario es el conjunto real que devuelve la sección **Ingresos → Dictado → Recuperación**; no se debe reemplazar por snapshots arbitrarios del navegador.
- El operador aún no ha revisado qué contienen las entradas del conjunto, y este ciclo tampoco obtuvo el catálogo autenticado.
- No se dispone todavía de una lista verificada de elementos, su contenido, sus identificadores, sus fuentes ni su estado individual.
- No se ha intentado aquí la recuperación de esos dictados y no se afirma que alguno ya haya sido recuperado o validado.

**Objetivo:** recuperar efectivamente el conjunto completo de unidades que aparece en Ingresos → Dictado → Recuperación, incluyendo todas las páginas y reconciliando entradas locales/remotas, y comprobar individualmente la efectividad del mecanismo. Esta tarea cubre el conjunto actualmente visible; la investigación de unidades esperadas que no aparecen se separa en CUSTODIA-03. El reporte inicial mencionó 20 unidades y una estimación posterior habló de aproximadamente 21; la cifra definitiva debe obtenerse de la interfaz autenticada y registrarse como evidencia.

**Secuencia prevista**
1. Acceder a la interfaz autenticada de Khora, observar el conjunto completo que ofrece Recuperación y registrar su número real, fechas, procedencia y metadatos mínimos sin copiar contenido privado. El número anterior de 20/21 es solo una referencia reportada, no el denominador comprobado.
2. Identificar cada entrada real de ese conjunto con una referencia anónima estable y registrar evidencia mínima suficiente para distinguir sus resultados, sin volcar contenido personal real a GitHub.
3. Recuperar las unidades mediante el flujo apropiado, evitando sobrescribir, borrar o sustituir sus originales.
4. Verificar individualmente el resultado de cada recuperación y cotejar contenido, integridad, partes de audio, disponibilidad del objeto y procedencia hasta donde el sistema lo permita. No confundir el contador de elementos disponibles con la recuperación consumada.
5. Evaluar el diseño y la efectividad observada del mecanismo para el conjunto completo, diferenciando recuperación demostrada, recuperación parcial, error, duplicado y resultado no verificable.
6. Documentar los resultados y brechas con evidencia sanitizada. Si algún elemento no se puede recuperar, mantenerlo explícitamente abierto y describir el impedimento; no declarar completa la tarea por haber intentado la operación.

**Criterio de cierre:** se adquiere y registra el conjunto real de entradas de Recuperación; cada unidad queda clasificada y sometida al flujo de recuperación apropiado; las recuperaciones exitosas se cotejan individualmente en texto, audio, integridad y procedencia con el original intacto. El conteo objetivo será el que muestre la interfaz en la revisión autenticada registrada, no una cifra inferida. Si alguna unidad no puede recuperarse, la tarea permanece abierta para esa unidad y la limitación queda explícita.

**Siguiente acción:** tras la primera pasada del candidato ausente de CUSTODIA-03, obtener el catálogo autenticado real de Recuperación, recorrer todas las páginas hasta cursor nulo, deduplicar por identidad y registrarlo de forma sanitizada; cotejar cada entrada con las partes y objetos correspondientes. Después, definir y ejecutar una recuperación por unidad sin sobrescribir ni borrar originales; cotejar el destino antes de declararlo recuperado. Se puede adelantar una unidad visible si es un rescate positivo que no desplaza ni consume la única sesión/perfil necesario para CUSTODIA-03.

### Incidente añadido a CUSTODIA-01 · dictado ausente y contador 40→20 · 2026-10-28

- El operador informa que falta un dictado realizado hacia el final de una sesión de terminal; la última entrada que ve en Recuperación fecha del 28-10-2026 a las 17:08. También informa que el contador pasa de 40 a 20 cuando termina de cargar.
- Se inspeccionó el código: la hidratación inicial concatena copias locales y remotas sin la misma deduplicación usada por la recarga; el contador refleja `recoveryItems.length`; el catálogo remoto pagina de 20 en 20. Esto ofrece una explicación plausible para el contador, no una prueba de qué contienen las 20 diferencias.
- Se documentó el incidente en [INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md](evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md) y se preservó la instrucción literal del operador.
- La captura ausente sigue sin localizarse: no se obtuvo catálogo autenticado, acuse del checkpoint, fila de base de datos ni estado del perfil tras el reinicio. La pérdida definitiva no está demostrada.
- Siguiente acción dentro de CUSTODIA-01: recorrer las páginas autenticadas hasta cursor nulo, deduplicar por identidad de sesión, revisar Custodia para posibles capturas archivadas y cotejar de forma autorizada la ventana de checkpoints del incidente. No copiar texto privado/UUID reales a GitHub ni intentar acceso a otro perfil o cuenta.
- La lista muestra ahora los defectos de código conocidos y las pruebas de cierre R-06 a R-08 en el inventario; no se ha autorizado ni realizado un cambio de producto.


---

## CUSTODIA-04 · Completar la investigación y actualizar el sistema para restablecer la recuperabilidad comprobable

**Prioridad:** P0 · CRÍTICA · PRIORIDAD OPERATIVA #3. La corrección sistémica va después de preservar los candidatos de CUSTODIA-03 y avanzar el catálogo CUSTODIA-01; solo se permite en paralelo el paréntesis de diagnóstico del archivo.

**Estado:** EN CURSO · TERCERA LÍNEA OPERATIVA. La corrección de reintento de archivado fue integrada por PR #355 en `main` (merge `8489a09c03a330b85f3e31297415ada7a19fe10e`) y desplegada en Vercel production con estado READY (`dpl_HRPV5F7FteWVZquUjfZcumA52atg`). Las pruebas locales disponibles incluyen typecheck, UI Contract, UI Review, 572/572 unitarias, build webpack, E2E audio 3/3 y smoke 4/4. GitHub Actions no ejecutó pasos; la suite UI focal quedó 20/23 con tres fallos en Grafo; la E2E general se detuvo tras timeouts y pytest/kernel/API no se ejecutó. No hay prueba autenticada del flujo live ni prueba de proveedor físico no productivo. CUSTODIA-04 sigue ABIERTA para aceptación E2E; la causa runtime del incidente original permanece NO DETERMINADA.

**Objetivo:** concluir la investigación de las brechas de recuperabilidad identificadas y actualizar KHORA para que las unidades admisibles puedan catalogarse, recuperarse y verificarse de manera consistente. No se considera lograda la recuperabilidad por el mero hecho de modificar o compilar código.

**Estado factual de ejecución (C008):** la punta de la rama `fix/custodia-recovery-reconcile-20261028` es `cbb9efd89048daf3bd9f07cc69c2e6d7209aa55d`; PR [#339](https://github.com/SeryMente/khora/pull/339) sigue en borrador y no se fusionó. `typecheck` pasó en el worktree con el arnés actualizado; `ui-review:check` y `ui:contract` habían pasado en la validación previa y después solo cambió el arnés de integración. La suite unitaria registró 549/550: una prueba de sincronización canónica agotó tiempo (`TLS handshake timeout`); el esquema local/canónico fue comparado aparte y coincide por blob SHA. La integración PostgreSQL/PGlite ya pasó **15 comprobaciones** en un motor WASM aislado, con usuario/clave sintéticos y sin servicios productivos. Los workflows de GitHub Actions fueron reintentados y terminaron fallidos en 2–3 segundos sin runner ni pasos, logs no disponibles; causa exacta no determinada. No se recorrió catálogo autenticado ni se recuperaron dictados de producción.



**Estado factual de continuación (C011, 2026-10-29):** la propuesta #339 fue inspeccionada de nuevo estáticamente. Sigue abierta en borrador, divergida respecto de `main` y sin despliegue. Además del F-13/R-09 documentado en el ciclo anterior, se encontró F-14/R-10: el fallback para audio legacy no se activa cuando existe `corteAudio` con `hastaParte=0`, aunque haya filas de audio verificadas. En esa combinación el total sigue en cero, el filtro excluye todas las partes y la recuperación propuesta no copia el audio, pese a que la UI candidata puede mostrar `storedAudioParts>0`. Es un defecto de la propuesta candidata, no un defecto productivo medido; no debe fusionarse hasta que se corrija y tenga pruebas de regresión.

La propuesta continúa sin comprobar los bytes actuales de los objetos remotos ni recalcular SHA-256 contra esos bytes. Los workflows de la punta registrada siguen fallidos sin pasos ni logs utilizables; no equivalen a CI verde y la causa de infraestructura no está determinada. Las pruebas C008 (15 comprobaciones PGlite y typecheck, más 549/550 unit tests) son históricas y no validan una punta reconciliada actual. El despliegue READY observado apunta al commit previo `b528660e16552633d232a2397cbe42441a03438c`; no se hizo despliegue.

**Estado productivo:** no se obtuvo acceso autorizado al catálogo, checkpoints ni objetos de audio. Continúan en 0 las unidades productivas cotejadas y las recuperaciones productivas. El dictado reportado como ausente sigue sin localizarse; su pérdida definitiva no está demostrada.

**Alcance mínimo**
1. Consolidar el inventario y las causas que CUSTODIA-01 y CUSTODIA-03 hayan demostrado, separando defectos de código, incidentes productivos confirmados e hipótesis todavía abiertas.
2. Corregir la reconciliación de las capturas locales/remotas para que la carga inicial y la recarga compartan reglas deterministas de identidad, deduplicación y elección de la versión sin ocultar una copia local más reciente.
3. Corregir el contrato de audio y la recuperación de capturas legacy: las partes, su orden, integridad y referencias deben comprobarse y preservarse explícitamente. No inventar alineación ni descartar audio existente por la mera ausencia de un manifiesto.
4. Dar al contador un significado fiable y visible: total único comprobado por el servidor o etiqueta inequívoca de elementos cargados, con paginación hasta el fin del catálogo. No presentar una página de veinte como total global.
5. Probar fallos de checkpoint, interrupción de solicitud, recarga, cierre, reinicio/cambio de perfil, recuperación parcial, duplicados, múltiples páginas y ausencia de audio/manifest. Mantener separada la copia local de la confirmación remota.
6. Añadir/ajustar pruebas unitarias, integración y navegador con datos sintéticos; ejecutar los controles aplicables del proyecto y registrar revisión, resultados y limitaciones.
7. Verificar la actualización efectiva en el entorno autorizado. Cuando las autorizaciones y la vía de publicación lo permitan, comprobar el despliegue/revisión correspondiente y realizar una recuperación real de prueba con lectura de vuelta; no tocar contenido personal sin autorización.
8. Documentar qué garantías quedaron demostradas, qué brechas continúan abiertas y el siguiente paso de cada brecha. Si no hay acceso productivo autorizado o falta evidencia de lectura real, mantener explícitamente el estado sin certificar.

**Criterio de cierre:** causas y alcance documentados con evidencia; defectos de código demostrados corregidos; pruebas automatizadas pertinentes aprobadas y reproducibles; inventario/contador/paginación coherentes; recuperación de referencia de texto y audio comprobada con integridad y procedencia, preservando los originales; y estado del entorno actualizado verificado. Cualquier parte que dependa de acceso productivo no disponible permanece abierta y no puede declararse garantizada.

**Dependencias:** línea base no destructiva de CUSTODIA-03; resultados y casos recuperados/verificados de CUSTODIA-01; revisión identificable de rama/despliegue; entorno de prueba y acceso productivo autorizados. La tarea puede preparar correcciones en cuanto exista evidencia suficiente de un defecto reproducible, pero su aceptación final espera la validación integrada.

**Relación con las otras tareas:** CUSTODIA-04 resuelve las causas sistémicas y deja la capacidad de recuperación al corriente; no sustituye la recuperación individual de CUSTODIA-01 ni demuestra por sí misma el destino del dictado ausente investigado por CUSTODIA-03.

### Subalcance incorporado 2026-11-06 · Contrato E2E Dictado→Custodia al archivar registro

**Límite de responsabilidad acordado por el operador:** Dictado responde desde la entrada a la pantalla Dictado hasta el clic en «Archivar registro»; Custodia asume desde ese mismo evento la verificación y el cierre durable. El clic es una frontera compartida, no una transferencia de titularidad entre OCP.

**Diagnóstico estático (sin reproducción de la sesión):** en `khora-web/app/components/ingreso/IngresoWorkspace.tsx`, `guardar()` muestra el mensaje «No se puede archivar el registro: Khora no ha verificado la custodia íntegra de todas las partes de audio» antes del POST `/api/dictado`. La compuerta valida partes presentes, índices, bytes, SHA-256 y estado verificado. Una subida fallida puede quedar en `pendingUploadsRef` y conservar solo una copia IndexedDB local; el flujo de archivar espera la subida en curso, pero no garantiza ejecutar todos los reintentos pendientes antes de validar. Una captura de micrófono sin partes generadas también falla, aunque el mismo mensaje genérico no distingue ese caso. Son rutas de código posibles, no la causa forense de la sesión del operador.

**Contrato de Custodia observado:** `/api/audio` hace GET/read-back del objeto tras la escritura y coteja tamaño/SHA-256 descifrado antes de marcarlo verificado. `guardarDictado()` contrasta las partes recibidas con filas de manifiesto ya persistidas en `dictado_audio_parte`. `evaluarCustodiaAudio()` verifica metadatos del manifiesto, pero no lee por sí mismo el Blob actual en la validación final. Se mantiene abierto F-13/R-09: presencia de metadatos no equivale a disponibilidad física actual. La prueba `e2e/contracts/audio-por-partes.spec.ts` simula `verificado:true`; no acredita el proveedor físico, restauración tras reinicio ni recuperabilidad E2E.

**Criterios adicionales de aceptación:**
1. Dictado debe cerrar la captura explícitamente, recoger el último chunk y esperar ACK de cierre, finalización de la grabadora y todas las subidas; no debe existir chunk ni operación de subida pendiente al solicitar el sellado.
2. Antes de archivar, reconciliar el número esperado de partes con índices únicos y contiguos y el manifiesto del servidor. Ante una parte faltante, reintentar automáticamente de forma idempotente y preservar el original local; no presentar el rechazo genérico como diagnóstico suficiente.
3. Hacer que reintentar y archivar sea seguro ante timeout, ACK tardío y respuesta perdida; el mismo `sessionId` y firma de manifiesto deben resolver el mismo registro, sin duplicarlo ni sobrescribir otra captura.
4. Custodia debe validar sesión/propietario, orden, cantidad, bytes, SHA-256, referencias del proveedor y estado de verificación del manifiesto; separar explícitamente «verificado al subir», «manifiesto persistido» y «objeto físicamente recuperable ahora».
5. La aceptación de recuperabilidad de audio exige leer el objeto real del proveedor autorizado, descifrar si aplica, recalcular tamaño y SHA-256, y realizar lectura de vuelta de destino conservando el original. Metadatos o una respuesta simulada no satisfacen el criterio.
6. Conservar checkpoint recuperable de texto completo/parcial y estado de audio durante la captura y ante el fallo de archivado. Una falla de audio no puede borrar, descartar ni bloquear el acceso al texto ya capturado. Distinguir estado local y remoto; no borrar copia local antes del recibo durable de Custodia.
7. Tras recarga, cierre/reapertura del navegador y recuperación desde una sesión autorizada, reconstruir el texto y las partes admisibles con identidad, integridad y procedencia verificables.
8. La interfaz debe exponer un estado simple y accionable para el usuario: «Reintentar y archivar» como acción principal, progreso y una razón concreta (cero partes, parte pendiente, índice faltante/duplicado, SHA/bytes inválidos, ACK de cierre ausente, checkpoint no confirmado o almacén no disponible). Telemetría sin texto/audio ni SHA completo.
9. Ejecutar pruebas unitarias, integración y navegador con fallos inyectados: cero/una/múltiples partes, corte final, upload fallido, timeout, ACK tardío, duplicados, índices no contiguos, retry, idempotencia, recarga y restauración. Añadir un ensayo no productivo con proveedor real autorizado y lectura de vuelta; la simulación de proveedor no reemplaza esa prueba.
10. Evaluar usabilidad con usuarios representativos de TDAH: reducir pasos y carga de memoria, evitar mensajes ambiguos y pérdida silenciosa, y permitir recuperar/continuar sin exigir una secuencia manual compleja. Es criterio de usabilidad a medir; no constituye afirmación clínica ni promesa terapéutica.

**Estado de este subalcance:** DIAGNÓSTICO ESTÁTICO DOCUMENTADO. El error de referencia que ya obra en el original es «No se puede archivar el registro: Khora no ha verificado la custodia íntegra de todas las partes de audio». El operador ahora recuerda una variante como «no se puede garantizar la integridad de la…»; no se presume que sea un mensaje diferente ni se exige repetirlo, salvo que el texto actual contradiga la cita anterior. El paréntesis se limita a una captura diagnóstica runtime/read-only y no autoriza corrección, despliegue ni datos productivos. Reproducción, logs de sesión, corrección de código, suites nuevas, prueba de proveedor, recuperación tras reinicio y aceptación siguen pendientes. No se declara garantía de producto.

**Decisión de estructura:** no crear CUSTODIA-05. Estos criterios amplían CUSTODIA-04, cuyo objetivo existente ya abarca correcciones y pruebas E2E; crear un ID superior duplicaría el mismo resultado. CUSTODIA-02 permanece retirada y no se reutiliza.


### Actualización 2026-11-07 · PR #354, transferencia y validación de archivado

- La PR [#354](https://github.com/SeryMente/khora/pull/354), titulada «fix(dictado): reintentar custodia de audio antes de archivar», permanece OPEN; su descripción declara expresamente que no se ha fusionado ni desplegado.
- El cambio candidato implementa drenaje secuencial/single-flight de subidas pendientes, espera/reintentos antes de validar el manifiesto, protección contra doble activación y bloqueo conservador cuando persiste un fallo. No se relaja la compuerta de integridad ni se elimina la copia local.
- La descripción de PR registra typecheck aprobado; unitarias 572/572; UI Contract y UI Review aprobados; Playwright focal 3/3 y `git diff --check` aprobado. Son resultados locales documentados para el commit `55449a08719f04982dbfceb15ec28f43c7b68118`; no se presentan como validación de una punta diferente no cotejada.
- En el mismo expediente, CI remoto registra seis jobs fallidos sin pasos (`steps=[]`), por lo que Actions no ejecutó las pruebas. `npm run build` no se ejecutó en ese corte.
- No se ha realizado ensayo de escritura + lectura física de vuelta con Blob/Neon no productivo; las rutas de proveedor de Playwright son simuladas. Tampoco se ha reproducido la sesión concreta del operador ni determinado su causa runtime.
- **Siguiente aceptación de CUSTODIA-04:** runner CI funcional, ensayo autorizado con proveedor no productivo y lectura física/descifrado/cotejo de bytes y SHA, restauración tras recarga/reapertura y evidencia de la sesión causante, sin alterar producción. CUSTODIA-04 continúa abierta.
- La transferencia documental del frente se ejecutó de generación 7 → 8 tras el «Si» explícito del operador; control leído de vuelta. El folio de sesión continúa PENDIENTE/NO ASIGNADO porque FOL1 no está ACTIVO. No se crea CUSTODIA-05 ni se reactiva CUSTODIA-02.


### Seguimiento PR #354 · fotografía remota 2026-11-07

- **Estado:** OPEN · DRAFT · NOT MERGED. Se consultó rama `fix/custodia-04-dictado-archivar-e2e-20261106`; comparación con `main`: **diverged**, 32 commits ahead / 7 behind, merge-base `0aa7497a6316772ccf846620685a87b0711e346c`. No se intentó rebase, merge, rerun ni push.
- **Solapamiento:** los ocho archivos de PR incluyen `OBJETO-CANONICO.md` y `LISTA-TAREAS-PROVISIONAL.md`. La rama conserva snapshots de Custodia en generación 7; `main` ya está en generación 8. Reconciliar ambas rutas documentales antes de cualquier integración; conservar el control gen. 8 y no sobrescribir estado canónico.
- **CI:** runs `42308741732` (CI), `42308741716` (UI Quality) y `42308741666` (khora-ok/gate). Jobs `128208028419`, `128208028719`, `128208028973`, `128208046111`, `128208046680` y `128208066638` terminaron completed/failure; la consulta de pasos individuales devolvió `[]` para los seis. Por tanto no ejecutaron pruebas. Los contextos Vercel/Netlify continúan rechazados por la restricción del plan/repositorio privado; no son pruebas de código.
- **Validación local del expediente PR:** commit `55449a08719f04982dbfceb15ec28f43c7b68118`: typecheck, 572/572 unitarias, UI Contract, UI Review, Playwright 3/3 y diff-check reportados aprobados. E2E utiliza respuestas simuladas; `npm run build` no se ejecutó en ese corte. Sin proveedor físico no productivo ni read-back actual.
- **Evidencia:** [SEGUIMIENTO-PR354-RECONCILIACION-20261107.md](evidencias/SEGUIMIENTO-PR354-RECONCILIACION-20261107.md), blob `9f986a773dcd55bb922d13a9ad8aa6517133d010`. La corrección candidata permanece sin integrar y el producto NO CERTIFICADO.


### Reparación del bloqueo de archivado · PR #355 · 2026-11-07

- **Solicitud operativa:** corregir el incidente reportado el 2026-11-06 que impide archivar registros nuevos con el mensaje de falta de custodia íntegra de todas las partes.
- **Diagnóstico estático:** `IngresoWorkspace.tsx::guardar()` presenta el mensaje antes de POST `/api/dictado`. Si una parte queda en `pendingUploadsRef`, la implementación previa esperaba la subida activa, pero no drenaba toda la cola de reintentos antes de validar el manifiesto. Defecto de coordinación compatible con el síntoma; causa runtime de la sesión concreta NO DETERMINADA.
- **Rama limpia:** `fix/custodia-04-archive-retry-20261107-g8`, base `main` `3c35c0f41a943b54b971fa3bcf5bcd6112019cbb`, HEAD `2841425d6ea4aa2a43998a717c7d585be3f5084f`; comparación: 6 commits ahead / 0 behind, merge-base en la base actual de main.
- **PR:** [#355](https://github.com/SeryMente/khora/pull/355), OPEN · DRAFT · NOT MERGED. Cuatro rutas modificadas, solo código y pruebas; no arrastra documentos del OCP.
- **Comportamiento:** drena subidas pendientes en orden; serializa reintentos y archivado; bloquea doble activación; vuelve a validar el manifiesto; no omite partes ni relaja integridad; si persiste el fallo, no llama a `/api/dictado` y conserva texto/copias locales; expone «Reintentar y archivar».
- **Pruebas de regresión:** 503 transitorio → reintento satisfactorio y una sola llamada de archivo incluso con doble clic; 502 persistente → archivo bloqueado y texto preservado.
- **Identidad de contenido validado:** los blobs de los cuatro archivos de código/pruebas coinciden byte por byte con el commit `55449a08719f04982dbfceb15ec28f43c7b68118`, cuya validación local documentada fue typecheck, 572/572 unitarias, UI Contract, UI Review, Playwright 3/3 y diff-check aprobados.
- **CI de la nueva punta:** runs `42394103598` (UI Quality), `42394103601` (CI), `42394103652` (khora-ok/gate). Seis jobs: `128467683626`, `128467683788`, `128467683229`, `128467683435`, `128467683566`, `128467684110`; todos completed/failure con `runner_id=0`, `runner_name=""` y `steps=[]`. Ningún workflow ejecutó pasos; no clasificar como regresión de código ni como CI verde. Netlify/Vercel Preview fallaron por restricción de repo privado en plan Hobby.
- **Evidencia:** [REPARACION-ARCHIVADO-20261107-PR355.md](evidencias/REPARACION-ARCHIVADO-20261107-PR355.md), blob `155b969ac17b3cd1387e3ff32876336f1d343a90`.
- **Límites:** no se ha ejecutado build nuevo, ensayo con proveedor físico no productivo, diagnóstico runtime de la sesión original, merge, despliegue ni operación productiva. La PR #354 previa permanece abierta/divergida y sin cerrar. CUSTODIA-04 permanece ABIERTA; producto NO CERTIFICADO.
- **Siguiente aceptación:** runner GitHub con pasos efectivos y gates aprobados; build; prueba con proveedor real no productivo y lectura física de vuelta; captura de evidencia runtime autorizada; aceptación E2E. No merge/deploy ni cambios productivos sin autorización específica.



---

- **2026-11-06 · REORDENAMIENTO-PRIORIDAD-RESCATE · versión 0.13:** se preserva la instrucción literal en [originales/INSTRUCCION-REORDENAMIENTO-PRIORIDAD-RECUPERACION-20261106.md](originales/INSTRUCCION-REORDENAMIENTO-PRIORIDAD-RECUPERACION-20261106.md). La secuencia vigente pasa a CUSTODIA-03 (#1: rescate de ausentes y fuentes candidatas), CUSTODIA-01 (#2: unidades visibles) y CUSTODIA-04 (#3: corrección sistémica); el diagnóstico de «Archivar registro» queda como paréntesis limitado. CUSTODIA-03 se amplía y se coloca primero en el documento, preservando sus identificadores y la historia de tareas. Se prioriza el candidato textual 28-10 20:29/264 checkpoints, seguido de las siete sesiones/1,038 checkpoints, B2, Vercel Blob, IndexedDB del perfil original y otras fuentes autorizadas. Ninguna ruta se declara recuperada por metadatos históricos; no se realizó recuperación productiva en esta actualización.
### Actualización 2026-11-08 · B2 nativo y retoma documental

- **Titularidad:** TRANSFER_RESPONSIBILITY de generación 9→10, registrada en [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json) y leída de vuelta. Alias operativo local `chatgpt-custodia-01a1bc33-32d5-7d64-b132-a52bdeb1e800`; ID nativo no expuesto; folio FOL1 no asignado.
- **Original:** [ChatGPT-CUSTODIA-20261108-1121.md](originales/ChatGPT-CUSTODIA-20261108-1121.md), 39,896 bytes, SHA-256 `CB264E5979AA545F082B5CC9C59DEDA30CE9547100DB29B138A520C3592A866A`, Git blob `b7e13e3fe9fed70873535640e1124577f5b037e4`, commit `5d6cf7055f2ab5f0020bde220d078ffe077512a6`; lectura de vuelta con blob idéntico.
- **Código B2:** el commit `7be5712a19aa98837e6d34449585ecb40e634af3` está integrado en `main`. `khora-web/lib/server/object-storage.ts` usa `b2_authorize_account`, valida Master Key/capacidades del account y enruta nuevas escrituras cifradas a B2. Se conserva lectura de referencias Blob históricas; no hay escritura dual, pero la ruta legacy sigue existiendo mientras falta la migración histórica. El ejemplo de entorno define `KHORA_B2_MASTER_APPLICATION_KEY_ID` y `KHORA_B2_MASTER_APPLICATION_KEY`.
- **Límite de aceptación:** no se ha demostrado autenticación real, preflight de bucket, PUT/GET y read-back físico, SHA de objeto B2 ni migración/backfill histórico. El original informa que el intento anterior de captura falló con `VAULT_PASSPHRASE_INVALID` y que no se agregaron credenciales; la guía de Khora prohíbe reutilizar la bóveda/cache de EP. El control vigente excluye cambios de credenciales/llaves, producción, SQL/backfill productivo, CORS y eliminación de fuentes. No se tocó ninguno.
- **Estado:** CUSTODIA-03 → CUSTODIA-01 → CUSTODIA-04 permanece abierto; CUSTODIA-B2-004 sigue en curso/P0. La API nativa en código no equivale a persistencia B2 aceptada ni a garantía de producto.

## Registro de cambios

- **2026-11-09 · AUTORIZACION-B2-PRODUCTION · versión 0.23:** se registra el asentimiento contextual del operador a la autorización específica de verificar/corregir credenciales B2 Production mediante bóveda canónica y desplegar a producción únicamente tras superar todos los gates técnicos; se conserva el original A y se mantiene la ejecución/aceptación como PENDIENTE.
- **2026-11-09 · REORDENAMIENTO-RESTABLECER-ARCHIVADO-PRIMERO · versión 0.22:** el operador aprobó que la recuperación del archivado sea prioridad inmediata. B2-006 pasa al hito 1 y EN CURSO; el prediagnóstico B2-005 sirve como insumo y su cierre diagnóstico/verificación ampliada queda en hito 2, sin bloquear el inicio de la reparación. Después se conservan B2-007 → RES-001 → RES-002. No se autorizan merge/deploy/cutover productivo ni cambios de credenciales. CUSTODIA-03/01/04 siguen abiertas.
- **2026-11-09 · ARQUITECTURA-MULTIALMACEN-PROPUESTA · versión 0.21 (antecedente):** se preserva la instrucción literal y la secuencia previa diagnóstico → restablecimiento → pulido → diseño → implementación. Fue reorganizada por instrucción posterior del operador; el objetivo B2 exclusivo permanece supersedido.

- **2026-11-07 · CUSTODIA-B2-EXCLUSIVO · versión 0.19:** por instrucción literal del operador, se descarta persistencia dual, fallback y lectura dual Blob/B2. B2 será el único backend de objetos de Khora. CUSTODIA-B2-004 pasa a EN CURSO/P0; abarca adaptación de todos los flujos, captura por partes, inventario/backfill histórico, observabilidad correlacionada, cutover y pruebas E2E/restauración. La PR #348 es solo base técnica en draft; aún no demuestra autenticación ni lectura/escritura física B2 ni migración histórica. Se observó que variables KHORA_B2_* y KHORA_OBJECT_STORAGE existen en Vercel Production sin revelar valores; falta verificar la cuenta/bucket con preflight real. No borrar Blob fuente ni declarar aceptación antes de read-back SHA/KHC1 y reconciliación completa.



- **2026-11-07 · CUSTODIA-04-REPARACION-ARCHIVADO-PR355 · versión 0.17:** se registra reparación candidata en rama limpia/PR #355, con reintento secuencial *single-flight*, bloqueo de archivados duplicados, nueva evaluación del manifiesto y conservación de texto ante fallo persistente. Los cuatro archivos de código/pruebas coinciden con SHA de archivos ya validados localmente en commit 55449a0; CI nuevo disparó seis jobs sin runner ni pasos. PR #354 queda como antecedente divergido sin integración. Producto no certificado; no merge/deploy.

- **2026-11-07 · CUSTODIA-03-NEON-SNAPSHOT · versión 0.16:** se registra en evidencia un candidato textual del 28-10 a las 20:29 con 264 revisiones/checkpoints no vacíos en un snapshot Neon de no producción. Los metadatos indican 0 partes de audio, 0 MP3, 0 historial y sin vínculo a volcado. El contenido no fue leído ni recuperado. La ventana completa en el snapshot devuelve 2/268 por `client_at`, discrepante con el corte C014 7/1,038; se conservan ambos y queda pendiente reconciliación.

- **2026-11-07 · SEGUIMIENTO-PR354-RECONCILIACION · versión 0.15:** se añade fotografía de rama PR #354 divergida (32 ahead/7 behind), solapamiento de los dos documentos de Custodia con main gen. 8 y seis jobs remotos sin pasos. Se preservan resultados locales reportados para SHA 55449a0, se aclara que no equivalen a CI ni proveedor físico, y se prohíbe inferir aceptación/merge. CUSTODIA-03 → CUSTODIA-01 → CUSTODIA-04 sigue vigente.

- **2026-11-07 · CUSTODIA-TRANSFER-20261107 · versión 0.14:** transferencia de titularidad documental/operativa a generación 8 por autorización expresa «Si» y actualización condicionada por SHA del control; lectura de vuelta verificada. Se actualiza el estado de CUSTODIA-04 con la evidencia actualmente documentada en PR #354: corrección en rama y validaciones locales, CI sin pasos, sin build en ese corte y sin prueba física con proveedor real no productivo. Se mantienen las prioridades CUSTODIA-03 → CUSTODIA-01 → CUSTODIA-04; el frente y sus garantías continúan abiertos/no certificados.

- **2026-11-06 · CUSTODIA-RETOMA-DIAGNOSTICO-DICTADO · versión 0.12:** instrucción literal conservada en `originales/ChatGPT-CUSTODIA-20261106-1424.txt` (blob `c1cb21131cc4576a4787bdb5fc76bcb978295610`). Se retoma responsabilidad documental mediante `TRANSFER_RESPONSIBILITY`, generación 6→7; control leído de vuelta. Se incorpora en CUSTODIA-04 el contrato E2E Dictado→Custodia, compuerta de archivado, reintentos, conservación de checkpoints, lectura física y criterios específicos de prueba/usabilidad. No se crea CUSTODIA-05. Se corrige el estado actual de PR #339: cerrada sin merge; su rama sigue divergida. La investigación fue estática en main: no se reprodujo la sesión, no se ejecutaron pruebas y no se modificó producto, datos o despliegue. CUSTODIA-01 y CUSTODIA-03 permanecen abiertas; garantías no certificadas.


- **2026-10-28 · Creación provisional:** se añaden únicamente las dos tareas expresamente solicitadas. CUSTODIA-01 queda primera por urgencia; CUSTODIA-02 queda pendiente para revisar el diseño de la propia lista.
- **2026-10-28 · Revisión documental previa al cierre del ciclo 2:** se actualizó la referencia metodológica hasta Samantha v352 y se confirmó por lectura de vuelta que el documento conserva exactamente dos tareas. La versión 0.2 no validaba el diseño.
- **2026-10-28 · Ciclo 3, inventario de recuperabilidad:** versión 0.3. CUSTODIA-01 pasa de «PENDIENTE — NO INICIADA» a «EN CURSO» por haber ejecutado análisis estático y documentado hallazgos; el catálogo autenticado y la recuperación real siguen pendientes. Se enlaza el inventario provisional sin guardar datos reales de dictados. El OCP se actualizó a CUSTODIA-v0.3; el diseño de esta lista sigue sin certificar.
- **2026-10-28 · CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004 · versión 0.4:** documenta el incidente del dictado ausente, el conteo reportado 40→20 y la discrepancia entre hidratación inicial/recarga, y deja explícito que el catálogo completo, la fila de checkpoint y la causa raíz siguen sin verificar.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005 · versión 0.5:** se formaliza CUSTODIA-03 para investigar el dictado no visible y cualquier otra captura esperada que no aparezca o parezca irrecuperable. CUSTODIA-01 y CUSTODIA-03 quedan como prioridades operativas P0; CUSTODIA-02 se registró entonces como revisión metodológica P1.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C006 · versión 0.6:** por nueva instrucción del operador, CUSTODIA-02 se retira de la lista activa y su identificador histórico no se reutiliza. Se agrega CUSTODIA-04 y se define la secuencia de línea base no destructiva, recuperación paralela a la investigación de ausencias y validación sistémica.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C007 · versión 0.7:** CUSTODIA-04 pasa a EN CURSO; se propone la reconciliación local/remota y la preservación de audio legacy en la PR #339 en borrador. La integración PGlite estaba pendiente y la suite unitaria tenía una falla ambiental de red.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C008 · versión 0.8:** se ejecuta con éxito el ensayo PostgreSQL/PGlite aislado (15 comprobaciones), y `typecheck` vuelve a pasar sobre el worktree. Se documentan por separado el timeout de la prueba de contrato canónico y los fallos de los jobs remotos sin runner/pasos. La PR #339 sigue en borrador; no se ha adquirido el catálogo autenticado ni se han realizado recuperaciones productivas. Las garantías siguen sin certificar.
- **2026-10-29 · CUSTODIA-TRANSFERENCIA-SES-20261029-C9K4M2R8 · C009 · versión 0.9:** se transfiere la responsabilidad a la sesión de alias operativo `chatgpt-custodia-SES-20261029-C9K4M2R8`, generación 3, tras autorización directa del operador. Se leyó la metodología Samantha v359 / Metacanon 1.24 / GOW 2.8. La rama de corrección se confirmó divergida de `main` (branch diverged; exact ahead/behind counts must be recalculated before integration); PR #339 permanece en borrador. El despliegue de producción comprobado corresponde a un SHA anterior; el catálogo autenticado sigue sin cotejar (0 unidades), y no hubo recuperación de producción. La continuación C009 queda documentada sin afirmar garantías no verificadas.
- **2026-10-29 · CUSTODIA-PLAN-RECUP-SES-20261029-C9K4M2R8-C010 · versión 0.10:** se incorpora F-13/R-09: la verificación de metadatos de audio no implica una lectura actual de bytes remotos ni un hash recalculado. PR #339 sigue divergida frente a main; los workflows consultados terminan sin pasos ni logs útiles, por lo que no equivalen a una suite ejecutada. No hay catálogo real ni recuperaciones productivas; el incidente del dictado ausente continúa abierto.
- **2026-10-29 · CUSTODIA-PLAN-RECUP-SES-20261029-C9K4M2R8-C011 · versión 0.11:** la inspección de PR #339 detecta F-14/R-10: el fallback de audio legacy no cubre `corteAudio.hastaParte=0` cuando el objeto de corte existe y hay partes almacenadas. La PR queda bloqueada para fusión hasta corregir y probar la rama reconciliada; R-09 sigue pendiente para lectura real/hash de bytes remotos. No hubo catálogo ni recuperaciones productivas.
- **Fuente del encargo literal inicial:** [originales/INSTRUCCION-PENDIENTES-2026-10-28.md](originales/INSTRUCCION-PENDIENTES-2026-10-28.md).
- **Fuente de ampliación del alcance:** [originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md](originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md), commit d3c84153bbdc8844e7c3147e4ab0a6375be3dc68.
- **Nueva instrucción literal:** [originales/INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md](originales/INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md).
- **Salida de ejecución parcial C007:** [originales/SALIDA-MODELO-CUSTODIA-IMPLEMENTACION-PARCIAL-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-IMPLEMENTACION-PARCIAL-2026-10-28.md), commit `423115ff56c8ae10fb9abd02d0fd978eddfaf2a8`.
- **Salida de validación de integración C008:** [originales/SALIDA-MODELO-CUSTODIA-VALIDACION-INTEGRACION-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-VALIDACION-INTEGRACION-2026-10-28.md), commit `ba57b98cf4045f57e841add13e5d1b9d64895d41`.
- **Estado de ejecución:** no se recuperaron ni inspeccionaron dictados como parte de esta modificación documental.
