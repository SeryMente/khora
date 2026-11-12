<!-- METACANON_VERSION=1.30; OBJECT_VERSION=0.1.4; OBJECT_SEAL=NOTAS-v0.1.4; SINGLE_LIVE_OBJECT=true -->
# Notas de Khora · Objeto canónico de persistencia del frente

> **ESTADO · FRENTE ACTIVO · CONTROL ASIGNADO · GENERACIÓN 1 · COMPONENTE NO DESARROLLADO.** Este documento es la única fuente viva del frente. La versión 0.1.3 corresponde al OCP, no al producto.

## 1. Control e identidad

- **Frente:** Notas de Khora.
- **Identidad canónica:** `KHORA-NOTAS`.
- **Repositorio:** `SeryMente/khora`, rama `main`.
- **OCP:** `frentes/notas/`.
- **Núcleo único:** este `OBJETO-CANONICO.md`.
- **Versión documental:** `0.1.4` · sello `NOTAS-v0.1.4`. 
- **Control:** [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json), `status=assigned`, generación `2`; alias `chatgpt-notas-SES-20261112-7B01D71C`.
- **Folio SES activo:** `SES-20261112-7B01D71C`. UUIDv7 local `01a1d1e4-5a51-7122-8d4e-fa0f7b01d71c`; ID nativo no expuesto (`owner_thread=null`). **FOL1:** PREPARADO, NO ACTIVO; folios globales CONV/CICLO/A/B pendientes y no asignados.
- **Evento de apertura documental:** `01a1d0ca-d1da-75ec-a98d-af5a96f070d1`, UUIDv7 local generado para este evento; no es ID nativo de plataforma.
- **Origen:** instrucción directa del operador del 2026-11-12, preservada en [originales/INSTRUCCION-ORIGINAL-20261112.md](originales/INSTRUCCION-ORIGINAL-20261112.md).

## 2. LEER PRIMERO

Este frente existe para desarrollar el componente **Notas de Khora**. Esta apertura deja su persistencia documental lista para una conversación nueva; no declara diseñado ni implementado el componente.

Al reinstanciar:

1. Adquirir desde `SeryMente/metodologia/main` la puerta [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md) y la fuente [DUG Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html). Leer primero §ARR del GOW, después el DUG y aplicar sus principios en orden.
2. Adquirir Metacanon y GOW vigentes desde el mismo DUG; revisar frescura, commit/blob y delta al inicio y cierre del ciclo. MCP-NORMATIVO: **DESACTIVADO**.
3. Leer este OCP, [README](README.md), [control](CONTROL-RESPONSABILIDAD.json), [original del operador](originales/INSTRUCCION-ORIGINAL-20261112.md), [crónica](cronica/INICIO-20261112.md) y los [prompts](prompts/).
4. Comprobar el control y adjudicar la nueva sesión solo si sigue sin titular, conforme a Metacanon §§42 y 47. Registrar el folio SES y UUIDv7 local que correspondan con comparación SHA/generación y lectura de vuelta.
5. Recuperar la última salida visible persistida; citarla literalmente al iniciar. Si no está disponible, declararlo, sin reconstruirla.
6. Inspeccionar la arquitectura vigente de Khora antes de proponer diseño o código. Definir requisitos y aceptación con el operador; no inferir funciones por el nombre del componente.

La autoridad de este frente no absorbe ni sustituye los OCP de Dictado, Harmonia, Observabilidad MCP o Custodia.

## 3. Referencia metodológica

Fuente canónica: [`SeryMente/metodologia/main`](https://github.com/SeryMente/metodologia/tree/main).

- **DUG:** Samantha v389 · NX-389m.
- **Metacanon:** 1.30 según `INICIO.md` y metadatos estructurados del DUG.
- **GOW:** 2.19; §ARR leído para esta apertura.
- **Revisión `main` consultada en este ciclo:** `85b6fb48b5db03d3dfe27d10fa30b6d644f536a0`; DUG e INICIO mantienen los blobs declarados arriba.
- **Blob del DUG:** `bcd99e72113f444a045d7f1c91b4ad36865b8ea8`.
- **Blob de `INICIO.md`:** `f4a9b576d43380c57065c46b1f723c89ea67eb7b`.
- **Discrepancia textual observada:** el bloque inicial del texto humano de Metacanon conserva una referencia a 1.29, mientras `INICIO.md` y el metadato estructurado señalan 1.30. Se conserva el dato y se deja la divergencia registrada, sin modificar el DUG.
- **Principios revisados por pertinencia:** P001, P038, P002, P003, P004, P005, P037, P006, P007, P008, P039, P040, P041, P042 y P043, respetando su orden en la cascada.
- **MCP-NORMATIVO:** DESACTIVADO.

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
- **Estado de instancias:** rol asistente (Claudia) adjudicado a esta sesión mediante alias operativo local `chatgpt-notas-SES-20261112-7B01D71C`; rol constructor (Samantha) no instanciado. El alias no es ID nativo ni prueba criptográfica de identidad.
- Mantener un solo escritor del OCP por vez. El constructor no usa RDC; su uso está reservado al asistente cuando sea estrictamente necesario, autorizado y verificable.

## 6. Autoridad

La instrucción original autorizó la apertura documental. La instrucción directa posterior del operador —«Asue responsabilidad d efrente de trabajo Notas Rapidas de Khora»— autoriza a esta sesión a asumir la responsabilidad operativa exclusiva del frente y registrar la adjudicación. No amplía las compuertas técnicas: no autoriza cambios de código, esquema/datos, credenciales, seguridad, proveedores, despliegue ni producción.

El objetivo general del frente es desarrollar Notas. La definición funcional detallada, los criterios de aceptación y las decisiones de arquitectura siguen pendientes de ratificación. No convertir propuestas del asistente/constructor en requisitos aprobados. Los cambios de producto, datos, seguridad, secretos, servicios externos y Production quedan sujetos a sus autorizaciones y compuertas específicas.

## 7. Perfil de entorno

- Repositorio de documentación y código: `SeryMente/khora`, rama `main`.
- Revisión base de KHORA al abrir el frente: `7781939197333efe98aea35c0fe05c7eb31dd7fb`.
- Entorno local, terminal del operador, perfil Windows, dispositivos RDC, runtime, credenciales, bases de datos y despliegues: **NO ADQUIRIDOS / NO VERIFICADOS** para esta apertura.
- No se utilizó RDC ni se accedió al entorno local.
- El repositorio es privado; los prompts deben operar con las fuentes y permisos efectivamente disponibles en la conversación nueva.

## 8. Estado vivo

**Acción actual:** el frente cambió de nombre a **Notas**, su OCP pasó de "frentes/notas-rapidas/" a "frentes/notas/" y la responsabilidad se actualizó a generación 2. La versión documental vigente es **0.1.4**, sello **NOTAS-v0.1.4**. Esta modificación es documental y de navegación; el componente sigue **NO DESARROLLADO** y sin especificación funcional detallada. No se modificó código de producto, esquema, datos, credenciales, seguridad, proveedores, despliegue ni producción.

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
- [Salida visible de apertura](originales/SALIDA-MODELO-20261112.md), incorporada y leída de vuelta en el cierre documental de la publicación.
- Fuentes de gobierno: `SeryMente/metodologia/main`, DUG v389/NX-389m, Metacanon 1.30, GOW 2.19; revisiones y discrepancia documentadas en §3.
- Fuentes de producto: `SeryMente/khora` en `main`; corte base `7781939197333efe98aea35c0fe05c7eb31dd7fb`.
- La búsqueda indexada inicial de “Notas rápidas”, “frentes/notas-rapidas” y términos equivalentes no devolvió coincidencias. Esto no equivale a una auditoría exhaustiva de todos los recursos de la organización.

## 12. Reinstanciación

- Entrada de la nueva conversación: [prompt de asistente](prompts/ASISTENTE.md).
- Encargo del rol constructor: [prompt de constructor](prompts/CONSTRUCTOR.md).
- Última conversación preservada: [ChatGPT-NOTAS-20261112-1630.md](originales/ChatGPT-NOTAS-20261112-1630.md).
- Control al cierre de este ciclo: **assigned**, generación **2**; alias operativo **chatgpt-notas-SES-20261112-7B01D71C**; folio SES **SES-20261112-7B01D71C**; UUIDv7 local **01a1d1e4-5a51-7122-8d4e-fa0f7b01d71c**; owner_thread=null.
- El alias, UUID y folio de la generación 1 se conservan como antecedente; no se reutilizan como identificador nativo de esta conversación.
- Una nueva instancia debe leer el control actual y aplicar Metacanon §§42 y 47 ante cualquier relevo o corresponsabilidad. Los identificadores locales no prueban identidad de plataforma ni sustituyen la autorización.
- Las salidas, instrucciones y crónicas anteriores permanecen conservadas como antecedentes históricos. La transcripción de esta conversación se añade sin reemplazarlas.

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

Se trasladó el directorio completo conservando los blobs de los materiales históricos. Se actualizaron el OCP, el control único, el README del frente, los prompts de asistente y constructor, y el índice raíz del repositorio. Los originales, salidas y crónicas anteriores se mantienen sin reescritura para conservar su valor histórico. La nueva transcripción de la conversación queda en [originales/ChatGPT-NOTAS-20261112-1630.md](originales/ChatGPT-NOTAS-20261112-1630.md).

**URL del frente antes:** https://github.com/SeryMente/khora/tree/main/frentes/notas-rapidas

**URL del frente ahora:** https://github.com/SeryMente/khora/tree/main/frentes/notas

El repositorio base permanece **SeryMente/khora**. No se renombró el repositorio raíz porque contiene el código y los recursos generales de Khora; cambiar su slug a **notas** equivaldría a renombrar el repositorio del producto completo, no solo este frente. La URL base **https://github.com/SeryMente/khora** permanece vigente.

El cambio de nombre no modifica el alcance funcional, no declara construido el producto y no amplía permisos técnicos. Se conserva el alias de la generación 1 como dato histórico; la responsabilidad actual se registra en el control, generación 2.