<!-- METACANON_VERSION=1.21; OBJECT_VERSION=0.1; OBJECT_SEAL=CUSTODIA-v0.1; SINGLE_LIVE_OBJECT=true -->
# Custodia · Objeto canónico de persistencia del frente de trabajo

> **ESTADO · INICIAL · VIVO · NO CERTIFICADO COMO GARANTÍA DE PRODUCTO.** Identidad: CUSTODIA. Versión documental: CUSTODIA-v0.1. Metacanon: 1.21 · METACANON-OBJETOS-v1.21. Gobierno general consultado: Samantha v346 · NX-346m; GOW v2.2. Corte de repositorio leído antes de la creación: ef2a6e12058f908a3cf469ab0bcdc834a4f79a6f. Este objeto funda el frente documental transversal; no prueba que las garantías descritas ya estén implementadas ni certificadas.

## 1. Control e identidad

- **Frente:** Custodia.
- **Identidad canónica:** CUSTODIA.
- **Propietario documental:** SeryMente/khora, rama main.
- **Directorio OCP:** frentes/custodia/.
- **Único núcleo operativo:** este OBJETO-CANONICO.md.
- **Control único de responsabilidad:** [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json). Se crea en generación 1, sin titularidad continuada asignada; el folio de creación no equivale a una transferencia de responsabilidad.
- **Propósito literal aprobado:** [originales/PROPOSITO-OPERADOR-2026-10-28.md](originales/PROPOSITO-OPERADOR-2026-10-28.md). La sección 4 también conserva el texto aprobado íntegro para que el propósito sea visible en el núcleo.
- **Versión y sello:** CUSTODIA-v0.1. Es la primera versión del objeto documental, no una versión del producto.
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

## 3. Referencia metodológica

- **Fuente normativa consultada:** [METAPROMPT-CANONICO-SAMANTHA.html](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html), rama main, revisión de archivo consultada con blob bc46e261eedb270546f22d3935cd9fdadb47d75c.
- **Versión de gobierno observada:** Samantha v346 · NX-346m.
- **Metacanon:** 1.21 · METACANON-OBJETOS-v1.21.
- **Gobierno general:** GOW v2.2.
- **Cláusulas aplicadas:** §39 (propósito literal y lectura operativa separada); §§3 y 27 (anatomía de trece bloques); §28 (originales, crónica y cotejo al cerrar cada ciclo); §§46 y 48 (directorio para OCP nuevos y conservación de rutas heredadas); §47 (folio operativo y límites de unicidad).
- La lectura de la fuente central acredita la versión documental observada, no una auditoría integral de todos los principios, anexos, recursos o sistemas externos.

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
- **Visibilidad:** dos lecturas consecutivas posteriores a la escritura devolvieron private; README también declara operación privada. La consulta inicial del ciclo devolvió public. No se conoce la causa ni el momento de la diferencia, y no se ha establecido si el contenido estuvo accesible públicamente en algún intervalo.
- No se inspeccionaron credenciales, cuentas personales, contenido real de Gmail/mensajería, configuraciones privadas del proveedor ni almacenes de producción.

## 8. Estado vivo

**Estado del frente: INICIAL — DOCUMENTACIÓN CREADA — GARANTÍAS TRANSVERSALES NO VERIFICADAS.**

### Confirmado en la fuente consultada

- SeryMente/khora contiene ya un frente documental de dictado de voz y un contrato separado para custodia continua de dictados.
- El contrato de custodia de dictados declara explícitamente que su implementación está en rama y que no está certificada en producción.
- El repositorio contiene componentes de código vinculados con persistencia/recuperación de dictados. La presencia de esos archivos no acredita la eficacia integral del sistema.

### Pendiente de evidencia

- Matriz de todos los canales de adquisición incluidos en el propósito y su primer punto real de persistencia.
- Inventario de almacenes, objetos, metadatos, réplicas, retención, cifrado, identidades y dependencias; ubicación y uso actual de Vercel Blob, si lo hubiera.
- Modelo de clasificación y autorización para cada tipo de información sensible o especializada.
- Pruebas de interrupción, cierre, ausencia de guardado explícito, reinicio, cambio de sesión/dispositivo, indisponibilidad del proveedor y recuperación completa.
- Evidencia de restauración verificable, reconciliación de contenido, procedencia, hashes/identificadores y detección de duplicados.
- Viabilidad, restricciones, plan de reversión y aceptación de cualquier eventual migración a Backblaze.
- Determinar la causa y el periodo de la diferencia observada en la visibilidad del repositorio; estado actual informado por dos lecturas consecutivas: private.

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

Cada ciclo futuro dejará en este núcleo, dentro de la crónica, al menos:

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
- **Control único:** blob 671a2264ac498cb191e7a45879e65af2e2d1f3f7 · [lectura en GitHub](https://github.com/SeryMente/khora/blob/main/frentes/custodia/CONTROL-RESPONSABILIDAD.json).
- **Objeto inicial antes de registrar esta lectura de vuelta:** blob db7f8d4434281251829e28da6f927cfe27dfbe21 · [ruta canónica](https://github.com/SeryMente/khora/blob/main/frentes/custodia/OBJETO-CANONICO.md). No se incrusta un SHA autorreferente del nuevo estado de este mismo objeto.
- **Commits de la secuencia documental:** original 67231f6200f0c447c21838509fae986096a79d0f; control 44112cf40c6c2af6f08f3564e69e13682833ca39; objeto inicial d177f6ed19cb653cdc1ecd5cbdb80ff0547b497f; enlace al índice raíz ca415160cec3b273cdc698085fe4324086b8b8b4.
- **Índice raíz:** se añadió la referencia del frente al README; se comprobará por lectura de vuelta final junto con esta revisión del objeto.

### Fuentes y referencias

- [Gobernanza única Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html).
- [Objeto canónico de Dictado de voz](../../docs/frentes/dictado-voz/OBJETO-CANONICO.md).
- [Custodia continua de dictados](../../khora-web/docs/CUSTODIA-DICTADOS.md).
- [Contrato común de captura](../../khora-web/lib/custodia/contrato.ts).
- [Copia local cifrada y recuperación](../../khora-web/lib/client/custodia-local.ts).

## 12. Reinstanciación

Instrucción para una conversación futura:

> Retoma el frente transversal Custodia en SeryMente/khora, rama main. Adquiere primero frentes/custodia/OBJETO-CANONICO.md, CONTROL-RESPONSABILIDAD.json, el original del propósito y el Metacanon vigente en SeryMente/metodologia/main. Mantén separadas las garantías de propósito de la evidencia de producto. Para dictados, lee también el objeto de Dictado de voz y khora-web/docs/CUSTODIA-DICTADOS.md; no dupliques almacenes ni contratos. Antes de implementar, investiga canales, almacenes, permisos, proveedores y pruebas existentes. No cambies código, credenciales, seguridad, despliegues ni servicios sin autorización específica. No declares conservación o recuperación garantizada sin pruebas reproducibles y lectura de vuelta. La titularidad continuada no está asignada en el control actual.

## 13. Persistencia y revisión

- **Núcleo único:** frentes/custodia/OBJETO-CANONICO.md.
- **Control único:** frentes/custodia/CONTROL-RESPONSABILIDAD.json.
- **Original aprobado:** frentes/custodia/originales/PROPOSITO-OPERADOR-2026-10-28.md.
- Las rutas de arriba no constituyen un segundo almacén de producto; son la base documental del frente.
- Tras cada ciclo: leer de vuelta los archivos modificados; comparar el propósito con el original aprobado; verificar el JSON; registrar el SHA real del archivo y el commit real; revisar el diff; no fijar hashes autorreferentes inventados.
- Revisar el Metacanon central y la rama main antes de cada ciclo material. Si la fuente o alguna evidencia no está disponible, declarar exactamente qué no se verificó y bloquear solo las decisiones que dependan de ello.
- No crear otros controles ni estados vivos competidores. Los originales y evidencias pueden ser artefactos congelados, no una segunda fuente de estado.
- **Próximo paso recomendado:** inventariar de forma autorizada los canales y almacenes existentes; después, formular una matriz requisito → componente → prueba → evidencia → aceptación. La investigación de Vercel Blob/Backblaze y las pruebas reales quedan pendientes de autorización y acceso.
