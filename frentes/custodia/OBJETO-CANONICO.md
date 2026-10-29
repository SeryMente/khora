<!-- METACANON_VERSION=1.22; OBJECT_VERSION=0.3; OBJECT_SEAL=CUSTODIA-v0.3; SINGLE_LIVE_OBJECT=true -->
# Custodia · Objeto canónico de persistencia del frente de trabajo

> **ESTADO · VIVO · INVESTIGACIÓN DE RECUPERABILIDAD EN CURSO · GARANTÍAS DE PRODUCTO NO CERTIFICADAS.** Identidad: CUSTODIA. Versión documental: CUSTODIA-v0.3. Metacanon: 1.22. Gobierno general verificado en este ciclo: Samantha v356 · NX-356m; GOW v2.6. Fuente central leída: blob c364e179e8e9b6a3d566a8e690dfa1a7cce91798. Este objeto funda el frente documental transversal; no prueba que las garantías descritas ya estén implementadas ni certificadas.

## 1. Control e identidad

- **Frente:** Custodia.
- **Identidad canónica:** CUSTODIA.
- **Propietario documental:** SeryMente/khora, rama main.
- **Directorio OCP:** frentes/custodia/.
- **Único núcleo operativo:** este OBJETO-CANONICO.md.
- **Control único de responsabilidad:** [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json). Sesión documental asignada en generación 2, folio SES-20261028-R6K2M9Q4, alias operativo chatgpt-custodia-SES-20261028-R6K2M9Q4; el ID nativo de conversación no está expuesto y el alias no se presenta como tal.
- **Propósito literal aprobado:** [originales/PROPOSITO-OPERADOR-2026-10-28.md](originales/PROPOSITO-OPERADOR-2026-10-28.md). La sección 4 también conserva el texto aprobado íntegro para que el propósito sea visible en el núcleo.
- **Lista de tareas:** [LISTA-TAREAS-PROVISIONAL.md](LISTA-TAREAS-PROVISIONAL.md), materialización auxiliar provisional de los pendientes; su diseño debe revisarse en CUSTODIA-02. No se declara todavía conforme a la metodología.
- **Inventario provisional de hallazgos:** [evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md), materialización de evidencia para CUSTODIA-01; no es un segundo estado vivo.
- **Versión y sello vigentes:** CUSTODIA-v0.3. Es la tercera versión documental del objeto; no es una versión del producto.
- **Relación con frentes existentes:** este frente es transversal. No sustituye ni duplica el objeto de Dictado de voz ([docs/frentes/dictado-voz/OBJETO-CANONICO.md](../../docs/frentes/dictado-voz/OBJETO-CANONICO.md)) ni su contrato de implementación ([khora-web/docs/CUSTODIA-DICTADOS.md](../../khora-web/docs/CUSTODIA-DICTADOS.md)).
- **Visibilidad del repositorio:** la consulta inicial de GitHub devolvió public; dos consultas posteriores devolvieron private y coinciden con el README. El estado más reciente observado es private. El momento y la causa de la diferencia, así como una posible exposición pública anterior, no están verificados.

## 2. LEER PRIMERO

1. Adquirir este objeto completo, el control de responsabilidad y el original del propósito; comprobar su versión, estado y enlaces antes de continuar.
2. Consultar la fuente central de Metacanon vigente indicada en la sección 3. La metodología gobierna la forma documental; este objeto no la reemplaza ni la copia como norma paralela.
3. Para cambios relacionados con dictados, leer el [Objeto canónico de Dictado de voz](../../docs/frentes/dictado-voz/OBJETO-CANONICO.md) y [Custodia continua de dictados](../../khora-web/docs/CUSTODIA-DICTADOS.md). Ese contrato marca la implementación como presente en rama y no certificada en producción; no convertir código, mocks, compilación o respuestas HTTP en una garantía de persistencia.
4. Separar siempre propósito deseado, diseño propuesto, código inspeccionado, pruebas ejecutadas, restauración demostrada y aceptación operativa.
5. No crear otro almacén principal, espejo, tablero ni contrato paralelo para resolver un fallo de custodia. Identificar primero los sistemas existentes, sus propietarios, sus datos y sus consumidores.
6. No realizar cambios de producto, de seguridad, de credenciales, de proveedor ni de despliegue por el mero hecho de que el propósito los mencione.
7. La consulta inicial de GitHub devolvió public y dos comprobaciones posteriores devolvieron private. Aunque el estado actual observado es private, no se verificaron la causa ni el periodo de la diferencia; no guardar secretos, credenciales ni datos personales reales en este repositorio mientras no se aclare la exposición histórica.
8. El estado detallado de las tareas se mantiene provisionalmente en `LISTA-TAREAS-PROVISIONAL.md`, enlazada desde el núcleo. No es una plantilla metodológica aprobada: CUSTODIA-02 debe revisar si esta separación y sus campos son adecuados.
9. El inventario técnico y las evidencias minimizadas de CUSTODIA-01 se enlazan en `evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md`. Este archivo clasifica evidencia y límites; el estado vivo sigue en este objeto. No copiar al repositorio datos reales de dictados, audio, UUID de sesión, cookies, credenciales ni URLs privadas.

## 3. Referencia metodológica

- **Fuente normativa consultada durante la primera actualización del ciclo:** [METAPROMPT-CANONICO-SAMANTHA.html](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html), rama main, blob a4c90bd8ff1cd360b1f1662ff55371bd1b56b4cd, Samantha v348 · NX-348m.
- **Última revalidación metodológica del ciclo 2 (histórica):** Samantha v352 · NX-352m, Metacanon 1.21, GOW v2.3; blob de archivo 94473eccb6fa71303d5908ce678f7efeb191c215.
- **Cláusulas aplicadas a este ciclo:** §3 (pendientes ordenados dentro del estado vivo); §§27 y 46 (núcleo único y materializaciones necesarias del OCP); §28 (instrucción original, crónica, evidencia y lectura de vuelta); §§39 y 48 (conservar el propósito y la ruta canónica, sin crear controles u objetos paralelos).
- **Fuente normativa actualizada para el ciclo de inventario:** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798` de `SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`.
- Esta adquisición identifica la versión del canon central al momento de la lectura; no equivale a una auditoría integral de todos sus principios o anexos ni a una declaración de conformidad definitiva del diseño de lista.

## 4. Propósito y alcance

### 4.1 Propósito literal aprobado por el operador

El texto siguiente se conserva exactamente en su redacción, puntuación y estructura aprobadas. No se presenta como transcripción fonética del dictado inicial: es la formulación que el operador reprodujo y ratificó expresamente para quedar como propósito canónico.

> Garantizar la persistencia íntegra, la autenticidad y la recuperabilidad de toda información que ingrese al sistema protésico cognitivo a través de cualquiera de sus canales de adquisición, actuales o futuros, incluidos los dictados, las integraciones con Gmail, las aplicaciones de mensajería instantánea y cualquier otra fuente de datos pertinente a la inteligencia artificial personal. Desde el momento en que la información entra en el alcance del sistema, Custodia debe preservar lo capturado tal como fue expresado o recibido, incluso ante fallos, interrupciones, cierres de aplicaciones, ausencia de guardado explícito, cambios de sesión o de equipo y demás contingencias, y permitir su recuperación verificable sin pérdida de contenido ni de su procedencia.
>
> Asimismo, Custodia debe garantizar el archivo seguro y el tratamiento adecuado de cada clase de información, mediante mecanismos de protección, cifrado y control de acceso acordes con su naturaleza y sensibilidad, incluidos los datos sensibles o especializados. Le corresponde también asegurar la integridad, continuidad y recuperabilidad del sistema de persistencia, así como gobernar la gestión y la migración de sus proveedores de almacenamiento, incluida la verificación de cualquier componente que permanezca en Vercel Blob y su eventual migración a Backblaze.
>
> El objetivo transversal de Custodia es que ninguna información admitida por el sistema se pierda por el simple hecho de no haber sido archivada, por un fallo operativo o por una transición entre dispositivos, sesiones o servicios. Las garantías de conservación, seguridad y recuperación deberán sustentarse en mecanismos comprobables y evidencias de restauración, haciendo visibles las brechas que todavía no estén resueltas o verificadas.

### 4.2 Lectura operativa separada

Custodia es el frente transversal que define, verifica y gobierna las garantías de integridad, procedencia, conservación segura y recuperación de la información admitida por el sistema protésico cognitivo, independientemente del canal que la origine. Debe contemplar desde la adquisición y el primer punto de persistencia hasta la recuperación comprobada, los controles de acceso y la continuidad de los proveedores de almacenamiento. Sus garantías solo pasan a estado verificado cuando existen pruebas reproducibles y evidencia consultable.

### 4.3 Alcance incluido

- Canales presentes y futuros dentro del alcance aprobado: dictados, correo integrado con Gmail, mensajería instantánea y otras fuentes pertinentes a la inteligencia artificial personal.
- Conservación del original recibido o expresado, su procedencia, los identificadores y metadatos necesarios para reconstruir la cadena de custodia.
- Persistencia temprana y recuperación frente a errores, interrupciones, cierres, falta de guardado explícito y transiciones de sesión o dispositivo.
- Clasificación y protección por sensibilidad; cifrado, autorización de acceso, integridad, registro seguro y recuperación comprobada.
- Inventario verificable de almacenes y proveedores; comprobación de los usos que permanezcan en Vercel Blob y evaluación de migración a Backblaze, incluida reconciliación, integridad y restauración.
- Registro explícito de garantías demostradas, fallos, ventanas de riesgo, límites y decisiones pendientes.

### 4.4 Límites y exclusiones

- El propósito no prueba que los canales, garantías, cifrado, controles o restauraciones estén implementados.
- No autoriza acceder a cuentas o datos reales, recopilar mensajes, modificar políticas de seguridad, alterar credenciales, contratar servicios o migrar almacenamiento.
- No autoriza eliminar fuentes originales después de una ingestión, replicación o migración sin reglas de retención aprobadas y evidencia de recuperación.
- No afirma una garantía física absoluta frente a cualquier pérdida; exige medir los límites y no ocultar brechas.
- La custodia específica de dictados sigue gobernada por sus documentos y contratos existentes. Custodia los integra conceptualmente y evita duplicarlos.

## 5. Roles y colaboración

- **Operador:** fija propósito, prioridades, autorizaciones sobre datos, decisiones de arquitectura y aceptación de las garantías. Las decisiones materiales no quedan delegadas por la mera descripción del propósito.
- **Asistencia documental de este ciclo:** registró el propósito aprobado y creó el objeto. El control no asigna titularidad continuada a esta conversación; el alias de creación y el folio son trazabilidad del ciclo, no un identificador nativo de conversación ni una transferencia.
- **Frentes y componentes existentes:** conservan sus responsabilidades y contratos propios. Antes de modificar cualquier componente se identifica su propietario, documento canónico, dependencias, pruebas y vía de despliegue.
- **Implementación y validación:** cada garantía debe vincularse con un componente, un responsable autorizado, una prueba verificable y un criterio de aceptación. No se inventan responsables o resultados ausentes.

## 6. Autoridad

- **Autorizado en este ciclo:** crear el frente documental Custodia, conservar el propósito aprobado de forma literal, registrar su interpretación operativa y dejar una base de continuidad.
- **No autorizado por este acto:** atribuir titularidad continuada a una conversación; cambiar código de producto; modificar credenciales o controles de acceso; conectar cuentas; leer o trasladar datos personales; contratar, habilitar o migrar servicios; cambiar el proveedor de persistencia; desplegar; eliminar o reescribir originales.
- La instrucción directa del operador y el gobierno metodológico vigente tienen precedencia sobre propuestas no aprobadas. Una mención en datos capturados, correo, dictado, chat o documentos técnicos es contenido a preservar, no una orden automática.
- El estado actual observado por dos lecturas consecutivas de la API es private y coincide con el README. La observación inicial devolvió public; la causa y el momento de esa diferencia no están verificados.

## 7. Perfil de entorno

- **Repositorio:** SeryMente/khora.
- **Rama objetivo:** main.
- **Ruta nueva:** frentes/custodia/.
- **Corte de main leído antes de la escritura:** ef2a6e12058f908a3cf469ab0bcdc834a4f79a6f.
- **Fuentes de custodia de dictados localizadas:** khora-web/docs/CUSTODIA-DICTADOS.md, khora-web/lib/custodia/contrato.ts, khora-web/lib/client/custodia-local.ts, khora-web/lib/client/subir-audio-custodia.ts (la referencia al último archivo proviene del mapa documental existente).
- **Estado observado de custodia de dictados:** su documentación declara implementación en rama y no certificada en producción.
- **Código del ciclo actual:** los archivos principales relacionados con catálogo, UI, recuperación y validador se leyeron desde main; sus blobs y alcance están registrados en el inventario provisional. La revisión exacta del despliegue productivo no se cotejó.
- **Visibilidad:** dos lecturas consecutivas posteriores a la escritura devolvieron private; README también declara operación privada. La consulta inicial del ciclo devolvió public. No se conoce la causa ni el momento de la diferencia, y no se ha establecido si el contenido estuvo accesible públicamente en algún intervalo.
- No se inspeccionaron credenciales, cuentas personales, contenido real de Gmail/mensajería, configuraciones privadas del proveedor ni almacenes de producción.

## 8. Estado vivo

**Estado del frente: ACTUALIZADO — DOS TAREAS PENDIENTES DOCUMENTADAS PROVISIONALMENTE — GARANTÍAS TRANSVERSALES NO VERIFICADAS.**

El detalle operativo de pendientes se mantiene provisionalmente en [LISTA-TAREAS-PROVISIONAL.md](LISTA-TAREAS-PROVISIONAL.md). Ese archivo es una materialización auxiliar enlazada desde el único núcleo; su diseño es objeto de la tarea CUSTODIA-02 y no se declara definitivo ni plenamente conforme al método.

### Confirmado en la fuente consultada

- SeryMente/khora contiene ya un frente documental de dictado de voz y un contrato separado para custodia continua de dictados.
- El contrato de custodia de dictados declara explícitamente que su implementación está en rama y que no está certificada en producción.
- El repositorio contiene componentes de código vinculados con persistencia/recuperación de dictados. La presencia de esos archivos no acredita la eficacia integral del sistema.

### Pendiente de evidencia

- Catálogo autenticado de todas las unidades de Recuperación, clasificación individual y cotejo entre snapshot, partes registradas, bytes de objetos remotos y resultado de recuperación.
- Matriz de todos los canales de adquisición incluidos en el propósito y su primer punto real de persistencia.
- Inventario de almacenes, objetos, metadatos, réplicas, retención, cifrado, identidades y dependencias; ubicación y uso actual de Vercel Blob, si lo hubiera.
- Modelo de clasificación y autorización para cada tipo de información sensible o especializada.
- Pruebas de interrupción, cierre, ausencia de guardado explícito, reinicio, cambio de sesión/dispositivo, indisponibilidad del proveedor y recuperación completa.
- Evidencia de restauración verificable, reconciliación de contenido, procedencia, hashes/identificadores y detección de duplicados.
- Viabilidad, restricciones, plan de reversión y aceptación de cualquier eventual migración a Backblaze.
- Determinar la causa y el periodo de la diferencia observada en la visibilidad del repositorio; estado actual informado por dos lecturas consecutivas: private.

La tarea prioritaria CUSTODIA-01 está **EN CURSO**. El análisis de código confirmó un defecto lógico capaz de mostrar «Sin audio» cuando el manifiesto está vacío y de limitar a cero las partes copiadas durante la recuperación remota, aunque haya partes asociadas a la sesión. Sin embargo, el catálogo autenticado real de Ingresos → Dictado → Recuperación no se pudo adquirir; las unidades reales cotejadas individualmente siguen siendo cero. No se ha ejecutado recuperación de producción ni se ha certificado la lectura de objetos remotos. Los cinco snapshots técnicos observados en una copia local son evidencia auxiliar independiente y no sustituyen el inventario del catálogo. Los hallazgos y requisitos de cierre se mantienen en [Inventario provisional de recuperabilidad](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md).

No se declara cero pérdidas, cifrado integral, cobertura de todos los canales, migración terminada ni certificación productiva.

## 9. Aceptación y viabilidad

La viabilidad transversal queda **pendiente de auditoría y pruebas**. Para aceptar una garantía deben existir evidencia y un criterio reproducible, no solo documentación o código.

1. **Integridad y procedencia:** capturar una entrada controlada, probar que su contenido original permanece disponible y cotejar identificadores, orden, metadatos y hash según el tipo de dato.
2. **Persistencia temprana:** demostrar que la captura sobrevive a los fallos contemplados sin depender de un botón de archivo o confirmación posterior cuando el propósito exige persistencia previa.
3. **Recuperación:** restaurar desde la persistencia real después de reinicio/interrupción y verificar contenido y procedencia contra el original de prueba.
4. **Seguridad:** verificar clasificación, cifrado en los puntos aplicables, controles de acceso y ausencia de contenido sensible en registros no autorizados.
5. **Continuidad de proveedor:** si se propone migración, reconciliar inventario de origen y destino, comprobar integridad y recuperabilidad, definir reversión y no retirar el origen antes de aceptar la restauración.
6. **Cobertura por canal:** no extrapolar una prueba de dictados a Gmail, mensajería u otros canales. Cada canal requiere contrato, evidencia y aceptación propios.
7. **Cierre de brechas:** cada limitación no resuelta debe quedar visible con impacto, riesgo, propietario autorizado y siguiente acción.

El criterio de éxito global no es «hay un archivo» ni «la petición HTTP respondió»: es poder demostrar la conservación y recuperación prometidas con los límites expuestos con honestidad.

## 10. Formato de ciclo

Cada ciclo futuro dejará en este núcleo, dentro de la crónica, al menos. El estado detallado de las tareas se materializa provisionalmente en [LISTA-TAREAS-PROVISIONAL.md](LISTA-TAREAS-PROVISIONAL.md); esta separación se revisará como CUSTODIA-02 y no se tomará como diseño final hasta cerrar esa revisión:

- Folio del ciclo y fecha; objetivo y autorización concreta.
- Fuentes realmente adquiridas, rama/revisión y diferencias frente al ciclo anterior.
- Estado de cada garantía: propuesta, inspeccionada, probada, restaurada, aceptada o no verificada.
- Componentes y canales cubiertos; condiciones del entorno de prueba y datos sintéticos usados.
- Operaciones realizadas y resultado observado; artefactos o logs enlazados sin secretos.
- Pruebas positivas y negativas, lectura de vuelta, reconciliación y limitaciones.
- Decisiones del operador, pendientes, riesgos y próximo paso verificable.
- Versión/sello del objeto y SHA de la revisión de repositorio que contiene el cierre.

No se rellenan huecos con inferencias ni se da por ejecutada una prueba porque aparezca escrita en un plan.

## 11. Crónica y fuentes

### Ciclo inicial · CUSTODIA-CREATE-SES-20261028-C8M4R7Q1 · 2026-10-28

- **Entrada del operador:** propósito final reproducido por el operador y ratificado con «Que asi quede».
- **Acción documental:** creación de la carpeta lógica frentes/custodia/, el archivo original del propósito, este núcleo y un control único de responsabilidad.
- **Fuentes de repositorio leídas:** README de SeryMente/khora; objeto canónico de Dictado de voz; contrato khora-web/docs/CUSTODIA-DICTADOS.md; controles de responsabilidad de Dictado de voz y Harmonia.
- **Gobierno leído:** SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html; versión v346 / NX-346m, Metacanon 1.21 / METACANON-OBJETOS-v1.21, GOW 2.2.
- **Colisión de folio:** búsqueda exacta de SES-20261028-C8M4R7Q1 sin coincidencias en el índice del repositorio y de la organización. La unicidad global no está verificada.
- **Resultado:** la base documental queda creada; la titularidad continuada permanece sin asignar; no se ejecutaron cambios de producto, pruebas de recuperación ni migraciones.
- **Incidencia de visibilidad:** la consulta inicial devolvió public; dos lecturas consecutivas posteriores devolvieron private, coincidiendo con README. Se desconoce el motivo y no se verificó posible exposición histórica; el control y el objeto registran las tres observaciones.
- **Lectura de vuelta verificada el 2026-10-28:** se releen los tres archivos del frente desde main. El archivo de propósito contiene el texto aprobado completo, carácter por carácter; el bloque de propósito del núcleo coincide con el original; el control se parsea como JSON válido, está en generación 1 y mantiene titularidad no asignada; el núcleo presenta los trece encabezados requeridos.
- **Original aprobado:** blob 7e3b93e715ec2ac2d75b2f4a09d13acb821661fb · [lectura en GitHub](https://github.com/SeryMente/khora/blob/main/frentes/custodia/originales/PROPOSITO-OPERADOR-2026-10-28.md).
- **Control único:** blob de lectura inicial 671a2264ac498cb191e7a45879e65af2e2d1f3f7; blob vigente tras registrar observaciones de visibilidad 11dc5e21b3fcd9a64113976245b81a466b4b185b · [lectura en GitHub](https://github.com/SeryMente/khora/blob/main/frentes/custodia/CONTROL-RESPONSABILIDAD.json).
- **Objeto inicial antes de registrar esta lectura de vuelta:** blob db7f8d4434281251829e28da6f927cfe27dfbe21 · [ruta canónica](https://github.com/SeryMente/khora/blob/main/frentes/custodia/OBJETO-CANONICO.md). No se incrusta un SHA autorreferente del nuevo estado de este mismo objeto.
- **Commits de la secuencia documental:** original 67231f6200f0c447c21838509fae986096a79d0f; control inicial 44112cf40c6c2af6f08f3564e69e13682833ca39; objeto inicial d177f6ed19cb653cdc1ecd5cbdb80ff0547b497f; enlace al índice raíz ca415160cec3b273cdc698085fe4324086b8b8b4; revisión del control de visibilidad 52dfe1f4d2918c5ec3645ab1a258e1cfbb5f5dde; reconciliación de visibilidad en este objeto d5b73f140970d68033e1f1867128fe1a0aa9c2ce.
- **Índice raíz:** se añadió la referencia del frente al README y se verificó después de la actualización del núcleo; blob README e8194b370541acbcc8217ce295625a411230c3c4 · [lectura en GitHub](https://github.com/SeryMente/khora/blob/main/README.md).

### Ciclo 2 · CUSTODIA-TASKS-SES-20261028-C8M4R7Q1-02 · 2026-10-28

- **Objetivo:** incorporar provisionalmente los dos pendientes expresamente solicitados y conservar la duda metodológica del operador sobre cómo debe diseñarse una lista de tareas de FT/OCP.
- **Instrucción original:** preservada en [originales/INSTRUCCION-PENDIENTES-2026-10-28.md](originales/INSTRUCCION-PENDIENTES-2026-10-28.md), commit inicial 443ca1826b655b068b79096ff59b01515fbc79a8.
- **Autoridad:** instrucción directa del operador para documentar dos tareas en este frente. No implica autorización para ejecutar la recuperación de dictados en este ciclo ni para cambiar código, servicios o datos.
- **Acción documental:** creada [LISTA-TAREAS-PROVISIONAL.md](LISTA-TAREAS-PROVISIONAL.md) en estado provisional, commit inicial 2ec37a0d1e0ec024555cb54249c4215c7f9821ee. CUSTODIA-01 es P0/urgente y está pendiente de inicio; CUSTODIA-02 revisará el diseño de la propia lista conforme al Metacanon vigente.
- **Hipótesis y corrección:** no asumir que el indicador de «20 dictados recuperables» demuestra recuperación efectiva. El número y contenido fueron reportados por el operador; esta sesión no observó la interfaz ni recuperó dictados.
- **Resultado:** las dos tareas quedan materializadas como pendientes. No se inspeccionó contenido de dictados, no se ejecutó recuperación y no se validó el mecanismo.
- **Gobierno adquirido:** Samantha v348 · NX-348m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3. Fuente central: blob a4c90bd8ff1cd360b1f1662ff55371bd1b56b4cd.
- **Refresco de fuente al cierre (intermedio):** main respondió Samantha v351 · NX-351m con blob f069d2385f47731ac9d0f0ca76bfd3cef859cdd2.
- **Última lectura de metodología antes del cierre:** main respondió Samantha v352 · NX-352m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; blob 94473eccb6fa71303d5908ce678f7efeb191c215. La lista sigue marcada como provisional y no conforme hasta la revisión CUSTODIA-02.
- **Lectura de vuelta verificada:** instrucción original leída desde main, texto literal presente: blob `faff139b740e88fa0a6beb20f5e646e04f53aa35` · [original](https://github.com/SeryMente/khora/blob/main/frentes/custodia/originales/INSTRUCCION-PENDIENTES-2026-10-28.md). La lista fue leída, conserva exactamente dos tareas identificadas como CUSTODIA-01 y CUSTODIA-02 y quedó versionada como 0.2 tras actualizar su referencia metodológica; blob previo `2af04cd0fd002cdf5adbbf22ba655345784e3f0b`, blob vigente `a2d571f8e11c7feb5ab675c85b54726405b0a970` · [lista provisional](https://github.com/SeryMente/khora/blob/main/frentes/custodia/LISTA-TAREAS-PROVISIONAL.md). La lectura final verificó que el núcleo mantiene los trece bloques y enlaza la lista; el blob del núcleo antes de esta anotación de última lectura era `2a84d9e8f578424d222661d5e96faf1ae1fa9a41`.
- **Receipts de escritura:** instrucción original `443ca1826b655b068b79096ff59b01515fbc79a8`; lista inicial `2ec37a0d1e0ec024555cb54249c4215c7f9821ee`, actualizaciones de referencia metodológica `56bd38dbcf7ff0156a025d519cc109e8dfab63c8` y `44545dfc3d5eda3c5b48bb896e1eb640aae61580`; núcleo inicial de esta actualización `4f2cc4addabf193c9fd6d1576b339325a409e017`, refresco metodológico intermedio `59cbe61a248d8f3d0095e19aeca4789e2c4c7e3b` y última referencia metodológica `5ff145e25f71dc9fe2994564bc316b1713872d35`.
- **Verificaciones negativas explícitas:** no se inspeccionó la interfaz de Cora; no se listaron de forma independiente los 20 elementos; no se recuperó ni cotejó ningún dictado; no se validó el diseño de la lista ni la eficacia del mecanismo.
- **Límite de evidencia:** el diseño de la lista está expresamente pendiente de revisión; la presencia de la lista en el repositorio no acredita que su esquema sea el óptimo o definitivo.
- **Salida visible final del modelo preservada:** [originales/SALIDA-MODELO-CUSTODIA-CICLO-2-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-CICLO-2-2026-10-28.md), commit de creación `4ec8849fb9ce53dc819e36bee24ed13570d4918f`, blob de lectura `011468232cc212b7d14d007dfb4e042706c9f228`.
- **Lectura de vuelta antes de registrar esta referencia:** el objeto estaba en blob `d274e0919b2ae17a3d99d216e38dad5c4c327c2b`; la lista en `2af04cd0fd002cdf5adbbf22ba655345784e3f0b`; la instrucción literal en `faff139b740e88fa0a6beb20f5e646e04f53aa35`. La fuente central más reciente leída en este cierre es Samantha v352 · NX-352m, Metacanon 1.21, GOW 2.3, blob `94473eccb6fa71303d5908ce678f7efeb191c215`.
- **Siguiente prueba/checkpoint:** comenzar por CUSTODIA-01: validar el listado en la interfaz y procurar la recuperación efectiva de los 20 dictados, con verificación individual, preservando datos personales y originales. Después abordar CUSTODIA-02.


### Ciclo 3 · CUSTODIA-INV-RECUP-SES-20261028-R6K2M9Q4 · 2026-10-28

- **Objetivo e instrucción:** preservar de forma persistente los hallazgos de investigación sobre recuperabilidad de las unidades ofrecidas en la sección Ingresos → Dictado → Recuperación, para corregir después los defectos sin perder la procedencia de cada diagnóstico.
- **Original literal del operador:** [originales/INSTRUCCION-INVENTARIO-RECUPERABILIDAD-INGRESOS-2026-10-28.md](originales/INSTRUCCION-INVENTARIO-RECUPERABILIDAD-INGRESOS-2026-10-28.md), blob 357f3c1cc9081a47f47dc3fa0b838e8f8eeed5a5, commit 3290ebcad27ae140c8a51cc85f4e5e27c2058148.
- **Salida visible previa conservada:** [originales/SALIDA-MODELO-CUSTODIA-ANTERIOR-RECUPERABILIDAD-INGRESOS-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-ANTERIOR-RECUPERABILIDAD-INGRESOS-2026-10-28.md), blob c5feb1e2ac4454dfe60898489f5b7612bc91646a, commit 585227304d8c9f9ca1887867125b0d7863ec6804. Conserva los dos fragmentos visibles finales anteriores; no se presenta como exportación nativa exhaustiva.
- **Responsabilidad:** control autoritativo leído al iniciar sin titular asignado, generación 1, blob 11dc5e21b3fcd9a64113976245b81a466b4b185b. Se asignó esta sesión documental mediante actualización condicionada por SHA, generación 1→2, conservando el estado anterior. Control vigente leído de vuelta: blob 2da19e588e30fe3835696d22fe110a7570a8758f; commit de asignación b9d92cc28b7c6d3e56909caca5bf0603488830a9; actualización posterior de trazabilidad 10edb81894a1c16a1cecef5809cf86283487ebde. Folio SES-20261028-R6K2M9Q4; alias operativo chatgpt-custodia-SES-20261028-R6K2M9Q4, no ID nativo de plataforma. Búsqueda del folio: cero resultados en los índices de búsqueda accesibles; unicidad global NO VERIFICADA.
- **Gobierno adquirido:** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; fuente SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html, blob c364e179e8e9b6a3d566a8e690dfa1a7cce91798. Se aplicaron §27 (OCP único), §28 (registro del ciclo y lectura de vuelta), §46–47 (alcance OCP, control/folio) y §43 (fuente canónica main). Revisión manual; MCP-NORMATIVO: DESACTIVADO.
- **Acción técnica:** lectura estática de los archivos actuales de catálogo, UI, recuperación, validador de audio, recuperación local y subida custodiada. No se modificó código, base de datos, credenciales, proveedor, despliegue ni originales de dictados. El código leído puede no coincidir con la revisión servida por el despliegue productivo; esa correlación no fue probada.
- **Hallazgo central:** el catálogo consulta un conteo de filas de audio verificadas, pero construye el indicador visible desde el manifiesto/corte del snapshot. La interfaz interpreta contador cero como «Sin audio en este punto guardado». El flujo remoto de recuperación copia filas hasta el corte/longitud declarados; si el total declarado es cero, no copia las filas de audio de la sesión fuente. Es un defecto confirmado en código que puede explicar el síntoma; su frecuencia por unidad y el estado real de los objetos remotos permanecen sin verificar.
- **Hallazgos relacionados:** el validador de audio coteja índices, tamaños, SHA-256 y metadatos de verificación suministrados, pero no lee el objeto remoto por sí mismo; el catálogo local también deriva el contador del manifiesto aunque los fragmentos locales se almacenan en registros independientes. La secuencia local elimina cada fragmento después de confirmar su subida individual, por lo que la reanudación del flujo completo debe probarse ante fallos intermedios.
- **Evidencia auxiliar que no sustituye al catálogo:** una copia local separada contenía cinco snapshots con manifiestos vacíos y 993 fragmentos de audio independientes; los 993 se descifraron correctamente. La prueba de decodificación bruta de la sesión de 707 partes emitió avisos DTS no monótonas. La relación exacta de cualquier fila local con el catálogo de Recuperación no está cotejada y no se usó para asignar resultados a REC-001…REC-n.
- **Bloqueo y resultado:** no se obtuvo respuesta autenticada del catálogo ni se pudo consultar la base de datos/objetos remotos; no se intentó recuperar ninguna unidad en producción. El número real de unidades sigue NO VERIFICADO; unidades reales cotejadas: 0; recuperaciones productivas confirmadas: 0. No interpretar cero comparaciones como catálogo vacío.
- **Acción persistente:** creado [evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md), v0.1, blob leído de vuelta b7e4f8c6770368e988f6e14d1fca018e72117aeb, commit de creación 3fa8497ab8c013f4ab43a4d9224b6dae863d21e8. El documento separa código confirmado, evidencia auxiliar local, datos del catálogo pendientes, clasificaciones unitarias, criterios de aceptación y siguiente paso. No es un segundo estado vivo.
- **Impacto en el propósito:** la recuperabilidad de producto continúa NO CERTIFICADA. Hay un defecto de diseño que debe corregirse, pero todavía no sabemos qué porcentaje del catálogo está afectado ni si todos los objetos remotos siguen accesibles.
- **Siguiente prueba/checkpoint:** obtener el catálogo autenticado de la UI real, enumerar las unidades sin guardar datos personales, cruzar cada una con partes de sesión y disponibilidad de objetos, clasificar sus fallos y luego planear una prueba de recuperación no destructiva por patrón antes de autorizar cualquier cambio de código.
- **Salida visible final de este ciclo:** se preservará en [originales/SALIDA-MODELO-CUSTODIA-INVENTARIO-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-INVENTARIO-2026-10-28.md) antes de emitirla; la lectura de vuelta se registrará al cierre.

### Fuentes y referencias

- [Gobernanza única Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html).
- [Objeto canónico de Dictado de voz](../../docs/frentes/dictado-voz/OBJETO-CANONICO.md).
- [Custodia continua de dictados](../../khora-web/docs/CUSTODIA-DICTADOS.md).
- [Contrato común de captura](../../khora-web/lib/custodia/contrato.ts).
- [Copia local cifrada y recuperación](../../khora-web/lib/client/custodia-local.ts).

## 12. Reinstanciación

Instrucción para una conversación futura:

> Retoma el frente transversal Custodia en SeryMente/khora, rama main. Adquiere primero frentes/custodia/OBJETO-CANONICO.md, CONTROL-RESPONSABILIDAD.json, LISTA-TAREAS-PROVISIONAL.md, evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md, los originales enlazados y el Metaprompt vigente en SeryMente/metodologia/main. La lista de tareas permanece provisional y su diseño es asunto de CUSTODIA-02. El folio operativo documental activo de este estado es SES-20261028-R6K2M9Q4, generación 2; el alias no es ID nativo de plataforma. Prioridad inmediata: CUSTODIA-01. El código de main contiene un defecto de manifiesto/conteo y un límite de copia de audio por manifiesto; el catálogo autenticado real aún no fue adquirido y ninguna unidad de la UI ha sido cotejada individualmente por este ciclo. No afirmes que todas las unidades comparten el defecto. Preserva datos y originales; no copies transcripciones, audio, cookies, credenciales, UUID reales ni URLs privadas al repositorio. No dupliques almacenes, controles, objetos ni contratos. No cambies código, datos de producción, credenciales, seguridad, despliegues ni servicios sin autorización específica. No declares recuperación garantizada sin lectura real, cotejo de contenido/procedencia e integridad y verificación de que el original permanece intacto.

## 13. Persistencia y revisión

**Versión actualizada en este ciclo:** CUSTODIA-v0.3. El inventario provisional es evidencia enlazada, no un segundo estado vivo.

- **Núcleo único:** frentes/custodia/OBJETO-CANONICO.md.
- **Control único:** frentes/custodia/CONTROL-RESPONSABILIDAD.json.
- **Original aprobado:** frentes/custodia/originales/PROPOSITO-OPERADOR-2026-10-28.md.
- **Lista auxiliar provisional de tareas:** frentes/custodia/LISTA-TAREAS-PROVISIONAL.md.
- **Inventario provisional de hallazgos:** frentes/custodia/evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md (v0.1, blob b7e4f8c6770368e988f6e14d1fca018e72117aeb).
- **Original de la instrucción de inventario:** frentes/custodia/originales/INSTRUCCION-INVENTARIO-RECUPERABILIDAD-INGRESOS-2026-10-28.md (blob 357f3c1cc9081a47f47dc3fa0b838e8f8eeed5a5).
- **Salida visible previa preservada:** frentes/custodia/originales/SALIDA-MODELO-CUSTODIA-ANTERIOR-RECUPERABILIDAD-INGRESOS-2026-10-28.md (blob c5feb1e2ac4454dfe60898489f5b7612bc91646a).
- **Original de la instrucción de tareas:** frentes/custodia/originales/INSTRUCCION-PENDIENTES-2026-10-28.md.
- **Salida visible del ciclo 2:** frentes/custodia/originales/SALIDA-MODELO-CUSTODIA-CICLO-2-2026-10-28.md.
- **Salida visible final del ciclo 3:** frentes/custodia/originales/SALIDA-MODELO-CUSTODIA-INVENTARIO-2026-10-28.md; conservarla antes de emitir y registrar su blob de lectura de vuelta.
- Las rutas de arriba no constituyen un segundo almacén de producto; son la base documental del frente.
- Tras cada ciclo: leer de vuelta los archivos modificados; comparar el propósito con el original aprobado; verificar el JSON; registrar el SHA real del archivo y el commit real; revisar el diff; no fijar hashes autorreferentes inventados.
- Revisar el Metacanon central y la rama main antes de cada ciclo material. La fuente vigente adquirida el 2026-10-28 fue Samantha v356 · NX-356m, Metacanon 1.22, GOW v2.6, blob c364e179e8e9b6a3d566a8e690dfa1a7cce91798. Si la fuente o alguna evidencia no está disponible, declarar exactamente qué no se verificó y bloquear solo las decisiones que dependan de ello.
- No crear otros controles ni estados vivos competidores. Los originales y evidencias pueden ser artefactos congelados, no una segunda fuente de estado.
- **Próximo paso recomendado:** inventariar de forma autorizada los canales y almacenes existentes; después, formular una matriz requisito → componente → prueba → evidencia → aceptación. La investigación de Vercel Blob/Backblaze y las pruebas reales quedan pendientes de autorización y acceso.
