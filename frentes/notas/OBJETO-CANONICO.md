<!-- METACANON_VERSION=1.31; OBJECT_VERSION=0.1.6; OBJECT_SEAL=NOTAS-v0.1.6; SINGLE_LIVE_OBJECT=true -->
# Notas de Khora · Objeto canónico de persistencia del frente

> **ESTADO · FRENTE ACTIVO · CONTROL ASIGNADO · GENERACIÓN 3 · COMPONENTE NO DESARROLLADO.** Este documento es la única fuente viva del frente. La versión 0.1.6 corresponde al OCP, no al producto.

## 1. Control e identidad

- **Frente:** Notas de Khora.
- **Identidad canónica:** `KHORA-NOTAS`.
- **Repositorio:** `SeryMente/khora`, rama `main`.
- **OCP:** `frentes/notas/`.
- **Núcleo único:** este `OBJETO-CANONICO.md`.
- **Versión documental:** `0.1.6` · sello `NOTAS-v0.1.6`.
- **Control:** [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json), `status=assigned`, generación `3`; alias operativo local `chatgpt-notas-retoma-20261114-01a1db72-d52f-7bc8-bd52-56552d8ccd8d`.
- **UUIDv7 local:** `01a1db72-d52f-7bc8-bd52-56552d8ccd8d`; ID nativo no expuesto (`owner_thread=null`). No se creó folio SES en esta retoma; conforme a ART-024, UUID/alias son metadatos locales opcionales. **FOL1:** PREPARADO, NO ACTIVO; folios globales CONV/CICLO/A/B PENDIENTES / NO ASIGNADOS.
- **Evento de apertura documental:** `01a1d0ca-d1da-75ec-a98d-af5a96f070d1`, UUIDv7 local generado para este evento; no es ID nativo de plataforma.
- **Origen:** instrucción directa del operador del 2026-11-12, preservada en [originales/INSTRUCCION-ORIGINAL-20261112.md](originales/INSTRUCCION-ORIGINAL-20261112.md).

## 2. LEER PRIMERO

Este frente existe para desarrollar el componente **Notas de Khora**. Esta apertura deja su persistencia documental lista para una conversación nueva; no declara diseñado ni implementado el componente.

Al reinstanciar:

1. Adquirir desde `SeryMente/metodologia/main` la puerta [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md) y la fuente [DUG Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html). Leer primero §ARR del GOW, después el DUG y aplicar sus principios en orden.
2. Adquirir Metacanon y GOW vigentes desde el mismo DUG; revisar frescura, commit/blob y delta al inicio y cierre del ciclo. MCP-NORMATIVO: **DESACTIVADO**.
3. Leer este OCP, [README](README.md), [control](CONTROL-RESPONSABILIDAD.json), [original del operador](originales/INSTRUCCION-ORIGINAL-20261112.md), [crónica](cronica/INICIO-20261112.md) y los [prompts](prompts/).
4. Ante una instrucción explícita del operador que identifica el frente y ordena retomar su continuidad, relevar al titular anterior sin pedir su consentimiento ni una segunda confirmación. Actualizar el control solo en el alcance autorizado, sobre el SHA observado y con lectura de vuelta. No abrir un ciclo burocrático separado para la retoma; FOL1 inactivo no bloquea el trabajo.
5. Recuperar la última salida visible persistida; citarla literalmente al iniciar. Si no está disponible, declararlo, sin reconstruirla.
6. Inspeccionar la arquitectura vigente de Khora antes de proponer diseño o código. Definir requisitos y aceptación con el operador; no inferir funciones por el nombre del componente.

La autoridad de este frente no absorbe ni sustituye los OCP de Dictado, Harmonia, Observabilidad MCP o Custodia.

## 3. Referencia metodológica

Fuente canónica: [`SeryMente/metodologia/main`](https://github.com/SeryMente/metodologia/tree/main).

- **DUG:** Samantha v396 · NX-396m según título y metadatos estructurados; el pie HTML aún declara v395 · NX-395m.
- **Metacanon:** 1.31; **GOW:** 2.24, según los metadatos estructurados del DUG. `INICIO.md` aún declara v389/NX-389m, Metacanon 1.30 y GOW 2.19; se conserva la discrepancia, sin modificar Metodología.
- **Revisión canónica de `SeryMente/metodologia/main`:** commit `ac715e04f227ed78ec4d196bbc76d0aa464eda7d` (committer 2026-11-13T22:00:40Z).
- **Blob DUG:** `038e29762038c96afa7291b86ba4c12fab338ff0`. **Blob de `INICIO.md`:** `f4a9b576d43380c57065c46b1f723c89ea67eb7b`.
- **§ARR:** adquirido íntegramente; define vocabulario y relaciones de entrada, no reglas de gobernanza.
- **CNP:** leídos íntegramente P044, P001, P004, P005, P038 y P043, en ese orden. Pertinentes para precedencia del operador, cascada, no simulación, autorización, fuente canónica y economía.
- **Anexos consultados:** ART-024 (registro conversacional, A/B y FOL1), ART-025, ART-027, ART-031 (directorio taxonómico), ART-032 (lectura, ejecución y complementos). La ruta verificada del frente es `SeryMente/khora/frentes/notas/`.
- **MCP-NORMATIVO:** **DESACTIVADO**.

El Metacanon es el método para mantener este frente; KHORA `main` es la fuente del estado y código del producto. Ninguna copia externa desplaza esas fuentes.

## 4. Propósito y alcance

### Propósito original del operador — verbatim

Procedencia: mensaje directo del operador en esta conversación, 2026-11-12. Se conserva también como original independiente en `originales/INSTRUCCION-ORIGINAL-20261112.md`.

```text
Inaugura un frente de trbajo,  para el desarrollo  del  componente Notas rapidas de Khora. Dejalo listo para trabajarlo en otra covnerascion conform el ametodologia.
```

### Lectura normalizada — separada del original

Desarrollar el componente **Notas de Khora**.

### Alcance de apertura

El frente organiza el descubrimiento, definición funcional, diseño, integración, desarrollo y validación del componente, en la medida que el operador concrete y acepte sus requisitos. La apertura no decide todavía:

- Qué acciones puede realizar una nota ni su ciclo de vida.
- Dónde aparece el componente, su navegación, interfaz o interacción.
- Si requiere almacenamiento temporal o persistente, sincronización, modo offline o recuperación.
- Si admite búsqueda, etiquetas, adjuntos, voz, asistencia de IA u otras capacidades.
- El modelo de datos, servicios, APIs, permisos, aislamiento o límites de retención.
- Sus criterios de rendimiento, accesibilidad, pruebas y aceptación.

Estos puntos son **pendientes de definición**, no funcionalidades aprobadas ni compromisos de implementación.

### Fronteras iniciales

- No absorber el frente Dictado ni asumir captura de voz.
- No asumir propiedad de Custodia ni cambiar sus contratos, almacenes o migraciones. Evaluar su integración solo si los requisitos la hacen necesaria y el responsable/operador lo autoriza.
- No modificar Observabilidad MCP, Harmonia u otros frentes por proximidad técnica.
- Esta apertura no ejecutó cambios de código, esquema, datos, credenciales, seguridad, proveedores, despliegue ni producción.

## 5. Roles y colaboración

- **Operador:** propietario del propósito, decisiones de producto, autorización de cambios materiales y aceptación final.
- **Asistente previsto por el marco:** Claudia; coordina, mantiene el OCP, controla alcance, evidencia y continuidad.
- **Constructor previsto por el marco:** Samantha; investiga y ejecuta las unidades técnicas aprobadas, entrega diff/pruebas/checkpoint al asistente.
- **Estado de instancias:** rol asistente (Claudia) adjudicado a esta sesión mediante alias local `chatgpt-notas-retoma-20261114-01a1db72-d52f-7bc8-bd52-56552d8ccd8d` y UUIDv7 local `01a1db72-d52f-7bc8-bd52-56552d8ccd8d`; rol constructor (Samantha) no instanciado. El alias y UUID no son ID nativo.
- Mantener un solo escritor del OCP por vez. El constructor no usa RDC; su uso está reservado al asistente cuando sea estrictamente necesario, autorizado y verificable.

## 6. Autoridad

La instrucción original autorizó la apertura documental. La instrucción directa posterior del operador —«Asue responsabilidad d efrente de trabajo Notas Rapidas de Khora»— autorizó la asunción anterior. El 2026-11-14, el operador instruyó explícitamente a esta sesión tomar el lugar del modelo anterior, retomar el Frente NOTAS y persistir la conversación y su última salida; esta instrucción releva al titular previo y autoriza la actualización documental/control.

El objetivo general del frente es desarrollar Notas. La definición funcional detallada, los criterios de aceptación y las decisiones de arquitectura siguen pendientes de ratificación. No convertir propuestas del asistente/constructor en requisitos aprobados. Los cambios de producto, datos, seguridad, secretos, servicios externos y producción siguen sujetos a sus autorizaciones y compuertas específicas. Esta retoma no amplía esos permisos.

## 7. Perfil de entorno

- Repositorio de documentación y código: `SeryMente/khora`, rama `main`.
- Revisión base de KHORA al abrir el frente: `7781939197333efe98aea35c0fe05c7eb31dd7fb`.
- **RDC usado en esta retoma:** equipo `PC10RCIF4EI4`, perfil `CENTRAL\fila4`; se leyó únicamente `C:\Users\fila4\Downloads\ChatGPT-NOTAS-20261114-1254.md`.
- No se modificó el equipo ni se revalidaron hardware, espacio de disco, credenciales, bases de datos o despliegues. Las especificaciones HP del B histórico pertenecen al ciclo del 12-11-2026 y no se reexaminaron ahora.
- El repositorio es privado; los prompts deben operar con las fuentes y permisos efectivamente disponibles en la conversación nueva.

## 8. Estado vivo

**Acción actual:** la retoma del 2026-11-14 se registró en generación 3; OCP documental **0.1.6**, sello **NOTAS-v0.1.6**. Se archivó la exportación completa de la conversación y una entrada A/B con la instrucción del operador y la última salida final visible del modelo anterior. Esta modificación es documental; el componente sigue **NO DESARROLLADO** y sin especificación funcional detallada. No se modificó código de producto, esquema, datos, credenciales, seguridad, proveedores, despliegue ni producción.

**Siguiente paso de la conversación de trabajo:**

1. Adquirir el contexto de este OCP y recuperar el archivo **originales/ChatGPT-NOTAS-20261112-1630.md**.
2. Inspeccionar en lectura la arquitectura, componentes de interfaz, rutas, patrones y persistencia de KHORA que puedan ser pertinentes.
3. Acordar con el operador el comportamiento mínimo de Notas y sus criterios observables de aceptación.
4. Separar decisiones ratificadas, hipótesis y propuestas; no inferir funcionalidad por el nombre.
5. Preparar una unidad de trabajo acotada para el constructor solo cuando existan definición y autorizaciones específicas.

**Pendientes abiertos:** definición funcional, UX/UI, modelo de estado/datos, persistencia/recuperación, integración con navegación y contratos existentes, seguridad/privacidad, pruebas y aceptación.

## 9. Aceptación y viabilidad

- **Viabilidad del frente:** documentalmente inaugurado; el desarrollo del componente es un objetivo de producto aún no especificado en detalle.
- **Aceptación del componente:** NO DEFINIDA. No declarar implementación, funcionamiento ni aceptación.
- Antes de construir, cada requisito debe tener un resultado observable y un criterio de aceptación verificable. Los requisitos no decididos se mantienen como pendientes, no se rellenan por inferencia.
- La aceptación final corresponde al operador; pruebas automatizadas o compilación no la sustituyen.

## 10. Formato de ciclo

Aplicar el formato obligatorio de Metacanon §4 en cada ciclo sustantivo: identidad y gobierno; ubicación/estado; actualización y delta; avance con evidencia; pendientes; viabilidad; tiempo/ciclos calibrados; siguiente acción; continuación y persistencia. Identificar la revisión exacta del OCP/control y conservar el original A y la salida visible B cuando corresponda. Si FOL1 continúa no activo, folios globales CONV/CICLO/A/B permanecen pendientes/no asignados; no inventarlos.

## 11. Crónica y fuentes

- [Instrucción original del operador](originales/INSTRUCCION-ORIGINAL-20261112.md).
- [Crónica de apertura](cronica/INICIO-20261112.md).
- [Instrucción de asunción](originales/INSTRUCCION-ASUNCION-20261112.md).
- [Salida visible de asunción](originales/SALIDA-MODELO-20261112-ASUNCION.md).
- [Crónica de asunción](cronica/ASUNCION-SES-20261112-4FB90722.md).
- [Crónica de retoma 14-11](cronica/RETOMA-20261114.md): relevo de responsabilidad, A/B y persistencia de la exportación.
- [Salida visible de apertura](originales/SALIDA-MODELO-20261112.md), incorporada y leída de vuelta en el cierre documental de la publicación.
- [Conversación del 12-11](originales/ChatGPT-NOTAS-20261112-1630.md): registro documental condensado.
- [Exportación del 14-11](originales/ChatGPT-NOTAS-20261114-1254.md): archivo recuperado de Downloads por RDC; SHA-256 de la fuente `58315C9FD78A85E5588BB9E861DEFE08E4C9470954BF37904E2CECA1B49A1A7B`.
- [Retoma A/B del 14-11](originales/RETOMA-NOTAS-20261114-AB.md): instrucción actual literal y reproducción de la última salida final visible del ciclo anterior.
- Fuentes de gobierno: `SeryMente/metodologia/main`; estado y discrepancias documentados en §3.
- Fuentes de producto: `SeryMente/khora` en `main`; corte base `7781939197333efe98aea35c0fe05c7eb31dd7fb`.
- La búsqueda indexada inicial de “Notas rápidas”, “frentes/notas-rapidas” y términos equivalentes no devolvió coincidencias. Esto no equivale a una auditoría exhaustiva de todos los recursos de la organización.

## 12. Reinstanciación

- Entrada de la nueva conversación: [prompt de asistente](prompts/ASISTENTE.md).
- Encargo del rol constructor: [prompt de constructor](prompts/CONSTRUCTOR.md).
- Conversación condensada anterior: [ChatGPT-NOTAS-20261112-1630.md](originales/ChatGPT-NOTAS-20261112-1630.md).
- Exportación completa recuperada: [ChatGPT-NOTAS-20261114-1254.md](originales/ChatGPT-NOTAS-20261114-1254.md).
- Último B visible y su A de retoma: [RETOMA-NOTAS-20261114-AB.md](originales/RETOMA-NOTAS-20261114-AB.md).
- Control actual: **assigned**, generación **3**; alias local **chatgpt-notas-retoma-20261114-01a1db72-d52f-7bc8-bd52-56552d8ccd8d**; UUIDv7 local **01a1db72-d52f-7bc8-bd52-56552d8ccd8d**; `session_folio=null`; `owner_thread=null` (ID nativo no expuesto).
- El alias y UUID local no identifican la conversación nativa. FOL1 sigue PREPARADO/NO ACTIVO: no se emiten folios globales CV/CY/A/B.
- La instrucción expresa del operador para tomar el lugar del modelo anterior releva el titular previo; no requiere segunda aprobación ni aceptación del titular saliente.
- Los originales y registros previos se conservan como antecedentes; la nueva exportación se incorpora íntegra y la nueva entrada A/B distingue A literal, B final visible y procedencia.

## 13. Persistencia y revisión

Este directorio es el OCP único de Notas. El presente archivo es la única fuente viva; `README.md` solo facilita entrada y navegación. El control de responsabilidad es único. Originales, prompts y crónica son materiales de procedencia/continuidad, no fuentes paralelas de estado.

Cada ciclo sustantivo debe actualizar este OCP, su crónica y los originales/salidas pertinentes; persistir cambios en GitHub, releerlos y cotejar rutas, SHA y contenido. La adjudicación de generación 1 quedó verificada: commit del control `a3fd045c26b9682530c3d584249a6e9e7acf8751`, blob leído de vuelta `25ebd49b93e5b098d24e13cd0350b002274ebee2`. No declarar sincronización por el mero hecho de escribir. No crear carpetas vacías ni duplicar tableros o controles.

## 14. Adjudicación de responsabilidad · generación 1 · 2026-11-12

El operador instruyó expresamente asumir este frente. La sesión quedó registrada con alias operativo `chatgpt-notas-rapidas-SES-20261112-4FB90722`, UUIDv7 local `01a1d0da-eebf-77de-ac25-06055602c6c2` y folio `SES-20261112-4FB90722`. El ID nativo de conversación no fue expuesto. Se preservó el estado anterior `unassigned`, generación 0; la actualización del control se condicionó al blob observado y pasó a generación 1.

La búsqueda exacta del prefijo diario en los repositorios de SeryMente expuestos devolvió cero coincidencias; la unicidad global permanece NO VERIFICADA. FOL1 está PREPARADO/NO ACTIVO, por lo que no se emiten folios globales CONV/CICLO/A/B.

La instrucción, la lectura normalizada y la procedencia se conservan en [INSTRUCCION-ASUNCION-20261112.md](originales/INSTRUCCION-ASUNCION-20261112.md); la evidencia de la operación y el checkpoint están en [ASUNCION-SES-20261112-4FB90722.md](cronica/ASUNCION-SES-20261112-4FB90722.md).

La asunción no implica desarrollo del producto. Siguiente trabajo: inspección en lectura de la arquitectura de KHORA y especificación funcional mínima con criterios observables, antes de modificar código.

## 15. Renombrado del frente y traslado del OCP · 2026-11-12

El operador instruyó: «Renombra frente a solo notas, modificando la URL del repo y todo». El nombre visible vigente pasa a ser **Notas**; la identidad canónica pasa a **KHORA-NOTAS**; el slug y OCP pasan a **frentes/notas/**. El nombre anterior era **Notas rápidas**, identidad **KHORA-NOTAS-RAPIDAS**, ruta **frentes/notas-rapidas/**.

Se trasladó el directorio completo conservando los blobs de los materiales históricos. Se actualizaron el OCP, el control único, el README del frente, los prompts de asistente y constructor, y el índice raíz del repositorio. Los originales, salidas y crónicas anteriores se mantienen sin reescritura para conservar su valor histórico. El nuevo registro documental condensado de la conversación queda en [originales/ChatGPT-NOTAS-20261112-1630.md](originales/ChatGPT-NOTAS-20261112-1630.md).

**URL del frente antes:** https://github.com/SeryMente/khora/tree/main/frentes/notas-rapidas

**URL del frente ahora:** https://github.com/SeryMente/khora/tree/main/frentes/notas

El repositorio base permanece **SeryMente/khora**. No se renombró el repositorio raíz porque contiene el código y los recursos generales de Khora; cambiar su slug a **notas** equivaldría a renombrar el repositorio del producto completo, no solo este frente. La URL base **https://github.com/SeryMente/khora** permanece vigente.

El cambio de nombre no modifica el alcance funcional, no declara construido el producto y no amplía permisos técnicos. Se conserva el alias de la generación 1 como dato histórico; la responsabilidad actual se registra en el control, generación 2.

## 16. Alcance del registro BMAD/OpenCode/EP y continuidad · 2026-11-12

El archivo [ChatGPT-NOTAS-20261112-1630.md](originales/ChatGPT-NOTAS-20261112-1630.md) se conserva aquí por instrucción expresa del operador. Su tema principal es explorar BMAD, OpenCode, Groq y RDC para el Entorno Persistente; no define requisitos del componente Notas ni modifica el propósito de este frente.

**Separación de alcance:**
- La discusión sobre instalación y arquitectura de BMAD/OpenCode/Groq/RDC pertenece conceptualmente al OCP general de Entorno Persistente y debe contrastarse allí antes de ejecutar instalaciones o cambios.
- Este OCP conserva una referencia de continuidad y la conversación recibida, pero no adquiere autoridad sobre la arquitectura general de EP.
- No se considera aprobada por este registro la instalación de BMAD/OpenCode, la configuración de Groq, el alta de cuentas, cambios de credenciales ni ajustes de RDC.
- La afirmación previa sobre especificaciones del HP ProDesk se conserva como dato reportado en la conversación, no como inspección técnica revalidada en este ciclo.
- El alcance funcional de Notas permanece independiente: sigue pendiente de definición con el operador y no debe inferirse de la conversación archivada.

**Siguiente continuidad sugerida:** retomar la evaluación BMAD/OpenCode/Groq/RDC en el OCP canónico de Entorno Persistente; verificar allí arquitectura y autorización vigentes, comprobar de nuevo el equipo mediante RDC si resulta necesario y decidir la siguiente acción concreta antes de instalar. Mantener este enlace como referencia cruzada, sin duplicar el control de EP.


## 17. Retoma y persistencia · 2026-11-14

El operador ordenó retomar el Frente NOTAS tomando el lugar del modelo anterior, persistir la exportación disponible en Downloads por RDC y reproducir literalmente la última salida final del ciclo previo. La instrucción se conserva en [RETOMA-NOTAS-20261114-AB.md](originales/RETOMA-NOTAS-20261114-AB.md), junto con B. Se conserva también la exportación completa en [ChatGPT-NOTAS-20261114-1254.md](originales/ChatGPT-NOTAS-20261114-1254.md).

- **Fuente A:** mensaje literal del operador en la entrada A del registro A/B.
- **Fuente del volcado:** `C:\Users\fila4\Downloads\ChatGPT-NOTAS-20261114-1254.md`, leído por RDC el 2026-11-14 12:54 (hora local); 71.289 bytes. SHA-256 de la fuente: `58315C9FD78A85E5588BB9E861DEFE08E4C9470954BF37904E2CECA1B49A1A7B`.
- **B conservada:** respuesta final visible fechada originalmente el 2026-11-12 a las 2:37:40 p. m. Empieza «Revisé las especificaciones directamente mediante RDC»; el registro A/B conserva el texto y su formato Markdown. No se incluyeron mensajes intermedios de progreso.
- **Crónica del ciclo:** [RETOMA-20261114.md](cronica/RETOMA-20261114.md).
- **Persistencia comprobada en rama documental:** `docs/notas-retoma-20261114`, creada desde `main` en `3abdecfa552547851621c98fcdda4e93147f1893`. El archivo de conversación se leyó de vuelta y su texto coincide con el contenido enviado; el control también se leyó de vuelta en generación 3.
- **Alcance:** actualización exclusivamente documental y del control de responsabilidad. Sin cambios de código, datos o infraestructura. Las afirmaciones sobre hardware y cuota RDC dentro de B son históricas, no una medición repetida en esta retoma.
- **Continuidad del producto:** mantener separados Notas y EP. La evaluación BMAD/OpenCode/Groq/RDC pertenece al OCP de EP según §16; el desarrollo funcional de Notas continúa pendiente de definición con el operador.
