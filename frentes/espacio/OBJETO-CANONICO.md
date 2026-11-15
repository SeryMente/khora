<!-- METACANON_VERSION=1.31; OBJECT_VERSION=0.1.0; OBJECT_SEAL=ESPACIO-v0.1.0; VCU_SEAL=VCU-ESPACIO-v1; SINGLE_LIVE_OBJECT=true -->
# ESPACIO · Frente de trabajo de Khora

> **ESTADO · FRENTE INAUGURADO · CONTROL ASIGNADO · GENERACIÓN 1 · DEFINICIÓN FUNCIONAL EN DESCUBRIMIENTO.** Este documento es el núcleo operativo y la VCU únicos del frente. La versión 0.1.0 identifica el OCP documental; no es una versión del producto.

## 1. Control e identidad

- **Nombre canónico:** ESPACIO.
- **Nombre desarrollado:** Espacio de trabajo de Khora.
- **Identidad:** `KHORA-ESPACIO`.
- **Repositorio:** `SeryMente/khora`, rama `main`.
- **OCP:** `frentes/espacio/`.
- **Núcleo operativo/VCU único:** este `OBJETO-CANONICO.md`, sello `VCU-ESPACIO-v1`.
- **Control autoritativo único:** [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json), `status=assigned`, generación `1`.
- **Titular operativo:** `chatgpt-espacio-01a1e0b4-9f9b-77b7-9a90-ca1568b927e5` (alias local; no es un ID nativo de conversación).
- **UUIDv7 local:** `01a1e0b4-9f9b-77b7-9a90-ca1568b927e5`; `owner_thread=null` porque el ID nativo no está expuesto.
- **Folio de sesión:** PENDIENTE / NO ASIGNADO. FOL1 permanece PREPARADO, no ACTIVO.
- **Evento local de apertura:** `ESPACIO-APERTURA-20261115-FCAE05C8`.
- **Evento de registro metodológico:** `C-KHORA-ESPACIO-APERTURA-20261115-FCAE05C8`.
- **Procedencia:** instrucción directa del operador recibida el 2026-11-15; original completo en [originales/INSTRUCCION-ORIGINAL-20261115.md](originales/INSTRUCCION-ORIGINAL-20261115.md).
- **Control de integridad:** la titularidad y la generación se consultan en el JSON único; alias/UUID son metadatos de procedencia, no permisos ni fencing universal.

## 2. LEER PRIMERO

1. Adquirir desde `SeryMente/metodologia/main` el punto de entrada [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md) y el [DUG canónico](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html). Leer §ARR, verificar versión/firma/commit/blob y aplicar los principios pertinentes por precedencia.
2. Leer este núcleo, [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json), [README.md](README.md), el [original de apertura](originales/INSTRUCCION-ORIGINAL-20261115.md) y la [crónica de apertura](cronica/APERTURA-20261115.md) cuando exista.
3. Confirmar que la rama consultada es `main`, que las rutas y controles siguen siendo los únicos vigentes y que la lectura de vuelta coincide con la revisión esperada.
4. No presumir implementación, acceso a proveedor, sincronización, capacidades, secretos, ID nativo ni aceptación funcional.
5. La Metodología `main` gobierna la estructura y la normativa; este OCP es la fuente del estado operativo de ESPACIO. MCP-NORMATIVO permanece DESACTIVADO.

## 3. Referencia metodológica

- **DUG vigente tras el registro:** Samantha v399 · NX-399m.
- **Metacanon:** 1.31. **GOW:** 2.25. §ARR fue leído para esta apertura.
- **DUG blob en main:** `04741e3d77564db586faaa3bffa78b681c92886a`; commit que incorporó v399: `4ec2737b44fdb2edfc5f02fee6bad2a14990e372`.
- **Methodology main tras el registro e inventario:** `dba4d71f3dd7289f235079e9a226ad9ea898eb42` (2026-11-15T19:37:25Z).
- **Registro en ART-031:** actualización incremental limitada a `SeryMente/khora/main`; no constituye una auditoría global de los demás repositorios.
- **Principios pertinentes consultados:** P001 (cascada), P004 (no simulación), P005 (autorización explícita), P038 (preponderancia canónica), P043 (anti-ineficiencia) y P044 (precedencia del operador).
- **Anexos/Metacanon consultados:** ART-019, ART-021, ART-024, ART-029, ART-031; Metacanon §§3, 4, 27, 28, 39 y 46.
- **MCP-NORMATIVO:** DESACTIVADO. No confundirlo con el servidor MCP de producto Khora.

## 4. Propósito y alcance

### Propósito dictado por el operador — extractos literales con procedencia

El propósito no se infiere del nombre. El operador aportó el prompt íntegro conservado en `originales/INSTRUCCION-ORIGINAL-20261115.md`; entre sus enunciados literales están:

> “Básicamente lo que se quiere hacer es construir una plataforma de chat que compita con las, no en términos de mercado, pero al menos sí en operabilidad, calidad y desempeño con las plataformas líderes como las de Cloud, ChatGPT, Google AI Studio, etcétera.”

> “Espacio de trabajo es un ámbito del sistema que replica, al igual que el frente de trabajo chat o construye un dispositivo de espacio de trabajo que compita con los líderes, igual, no a nivel de mercado, pero sí en términos de operabilidad y desempeño en cuestión de espacios de trabajo para gestión administrativa de proyectos.”

> “Espacio de trabajo mejor. Y que contenga lo que tiene que ver con la plataforma de chat.”

La fuente completa preserva las vacilaciones, correcciones, variantes «Cora/Khora» y grafía recibida. Las citas son extractos literales y no sustituyen el original.

### Lectura operativa separada

Desarrollar una plataforma de Espacio de trabajo de Khora que integre una experiencia de chat con modelos de lenguaje remotos y locales y una experiencia de gestión administrativa de proyectos, priorizando operabilidad, calidad y desempeño. Para la faceta de gestión, Notion es la referencia mínima de operabilidad y capacidades expresada por el operador.

Esta lectura sintetiza el propósito dictado; no lo reemplaza ni eleva funcionalidades no especificadas a requisitos aprobados.

### Responsabilidad incluida

- Descubrir, definir, diseñar, coordinar y validar la experiencia de producto integrada de ESPACIO.
- Ofrecer chat con modelos remotos y locales, sujeto a capacidades, permisos e integraciones verificadas.
- Desarrollar la faceta de gestión administrativa de proyectos y trabajo, desde requisitos esenciales hacia capacidades avanzadas.
- Evaluar operabilidad, calidad y desempeño con escenarios y criterios observables.
- Determinar interfaces compartidas —identidad, navegación, contexto, búsqueda, permisos y persistencia— cuando requisitos y evidencia las justifiquen.

### Composición funcional inicial

Estos módulos son subfrentes funcionales internos; heredan el OCP, núcleo, autoridad y control del frente. No son FT ni OCP independientes.

**MOD-CHAT · Plataforma conversacional**
- Propósito derivado: proporcionar una interfaz coherente para modelos cloud y modelos instalados localmente.
- Línea base reportada: el operador informa que el repositorio ya contiene una integración con Open WebUI.
- Estado de línea base: REPORTADA POR EL OPERADOR; NO AUDITADA EN ESTA APERTURA. No se presume versión, adaptación, proveedor, configuración, instalación efectiva ni capacidad operativa.
- Descubrimiento: modelos y proveedores; selección y configuración de conexiones; conversaciones; contexto y archivos; herramientas/extensiones; privacidad y permisos; persistencia; observabilidad; rendimiento y experiencia de uso.
- Límite: no leer, copiar ni documentar secretos o llaves API; no cambiar credenciales ni proveedores sin autorización específica.

**MOD-WORKSPACE · Gestión del espacio de trabajo**
- Propósito derivado: construir una experiencia de gestión administrativa de proyectos y trabajo con operabilidad, como mínimo, comparable a la referencia que el operador encontró en Notion.
- Notion es una referencia funcional y de operabilidad, no una dependencia tecnológica ni una decisión de integración.
- Descubrimiento: espacios/proyectos; tareas y estados; colecciones o bases de datos; propiedades y relaciones; vistas/filtros; documentos y conocimiento; navegación; plantillas; colaboración; automatización; permisos; búsqueda; recuperación y exportación.
- Estado: REQUISITOS PENDIENTES. Esta lista orienta el descubrimiento, no declara funcionalidades instaladas o aprobadas.

### Exclusiones y fronteras

- **Khora MCP (`KHORA-MCP`):** conserva el servidor MCP, host, catálogo, contratos, capacidades programáticas, acceso e integración. ESPACIO puede consumir sus interfaces mediante contratos autorizados; no absorbe ni gobierna ese frente.
- **Dictado:** conserva su OCP de captura por voz, pantalla, transcripción, edición y continuidad.
- **Custodia transversal:** conserva su OCP y responsabilidad de persistencia, seguridad y recuperación transversal.
- **Notas:** conserva su OCP independiente; no se absorbe por compartir experiencias de trabajo.
- **Harmonia y Tareas automáticas:** conservan sus OCP y responsabilidades.
- No se crea un FT independiente llamado Chat ni otro llamado Workspace.
- La apertura no autoriza código, cambios de esquema/datos, credenciales, seguridad, proveedores, despliegues ni operaciones productivas.

## 5. Roles y colaboración

- **Operador:** titular de las decisiones de producto, alcance, propósito y aprobaciones que le correspondan.
- **Asistente mediador ESPACIO:** esta instancia de ChatGPT; organiza contexto, análisis, alternativas, decisiones pendientes y continuidad entre operador y trabajo técnico.
- **Constructor técnico:** NO ASIGNADO en esta apertura. No se inventa una segunda instancia ni se presume su acceso, rol o prompt.
- **Módulos MOD-CHAT y MOD-WORKSPACE:** facetas de coordinación; no tienen titulares ni controles separados.
- La colaboración técnica futura debe conservar la única autoridad del frente y respetar la autoridad propia de Khora MCP y de otros frentes conectados.

## 6. Autoridad

- La instrucción del operador autoriza la apertura del frente, el registro documental y la coordinación/descubrimiento dentro del alcance descrito.
- Las propuestas del asistente no son decisiones ratificadas por el operador.
- Las decisiones sobre producto, arquitectura objetivo, prioridades y criterios terminales corresponden al operador.
- La asignación de este frente no amplía permisos técnicos ni productivos. Código, datos, credenciales, seguridad, proveedores, migraciones, despliegues y producción requieren la autorización específica que corresponda.
- No modificar unilateralmente contratos, límites, arquitectura o decisiones del frente Khora MCP ni de otros OCP.

## 7. Perfil de entorno

- **Repositorio:** privado, `SeryMente/khora`.
- **Rama de referencia:** `main`.
- **Ruta del OCP:** `frentes/espacio/`.
- **Entorno local/host/SID/LocalPath:** NO VERIFICADO en esta apertura; no importar datos de otros frentes ni inferir rutas locales.
- **Open WebUI:** integración reportada en el repositorio; código, instalación, versión y configuración aún no inspeccionados en esta apertura.
- **Modelos cloud/locales conectados y activos:** NO VERIFICADO.
- **Secretos/llaves:** fuera de este OCP y de Git; no se solicitan ni registran.
- **Persistencia/sincronización entre clientes:** no se presume; se establecerá por inspección y prueba autorizada.

## 8. Estado vivo

### Las cuatro preguntas de continuidad

- **De dónde viene:** instrucción directa del operador y prompt explicativo recibidos el 2026-11-15; preservados literalmente en `originales/INSTRUCCION-ORIGINAL-20261115.md`.
- **Dónde está:** OCP `SeryMente/khora/frentes/espacio/`; generación inicial 1; dos módulos funcionales propuestos.
- **A dónde va:** inventariar la integración Open WebUI, medir su cobertura de chat y distinguir sus capacidades reales de los requisitos del workspace administrativo.
- **Qué cambió:** se creó ESPACIO como un único FT; Metodología v399 lo incorpora al directorio taxonómico y al inventario de repositorios; Notas también se añadió al corte actualizado.

### 🔄 Estado vivo

**Acción en curso:** inauguración y establecimiento de la línea base documental del frente.  
**Siguiente paso atómico:** inspeccionar en `SeryMente/khora/main` la integración Open WebUI existente y levantar un inventario de componentes/rutas sin exponer secretos.  
**Pendientes en secuencia:** (1) inspección técnica Open WebUI; (2) matriz de capacidades de chat; (3) casos de gestión administrativa y umbral Notion; (4) matriz de brechas; (5) recomendación de arquitectura para decisión del operador.

### ⚗️ En prueba / recién fallido

Open WebUI está reportado, pero no auditado ni probado en este ciclo. No se ha demostrado equivalencia con Notion ni ejecución de modelos cloud/locales desde esta apertura.

### 🔔 Recordatorios latentes

- No confundir interfaz de chat con un sistema completo de gestión de proyectos.
- Notion es referencia de capacidades; no implica clonación ni obligación de usar Notion como proveedor.
- Conservar la separación de autoridad entre ESPACIO, Khora MCP, Dictado, Notas y Custodia.
- No elevar una capacidad reportada a instalada, verificada o aceptada sin evidencia.

## 9. Aceptación y viabilidad

### Aceptación de la apertura documental

La apertura se considera documentalmente verificada cuando main contiene un núcleo, un control único, los originales, la ruta OCP y el registro metodológico; las lecturas de vuelta deben coincidir. La verificación se informa por artefacto y revisión.

### Criterios de viabilidad del producto

- **Chat:** escenarios reproducibles para elección/uso de modelos cloud y locales; calidad observable de conversación; continuidad/contexto; archivos/herramientas cuando se requieran; privacidad y control de acceso; latencia y fiabilidad medibles.
- **Workspace:** escenarios reales de organización y administración de proyectos; tareas/estados; relaciones y vistas; documentación/conocimiento; búsqueda/recuperación; navegación; colaboración/permisos; automatización; exportabilidad.
- **Comparación:** matriz requisito → Open WebUI observado → Notion como referencia → brecha → alternativa → evidencia. No comparar por etiquetas o impresión general.
- **Arquitectura:** recomendación entre extensión de Open WebUI, integración con subsistema de workspace, uso de componentes complementarios o desarrollo propio, sustentada por el inventario y la matriz.
- Ningún criterio funcional se marca ACEPTADO hasta tener prueba pertinente, entorno y resultado observables.

## 10. Formato de ciclo

Cada ciclo sustantivo de ESPACIO conserva, en el orden de Metacanon §4:

1. Identidad operativa y gobierno vigente; OCP/control/generación; versiones/firma de Metodología y Sam; GOW; estado MCP-NORMATIVO.
2. Dónde estamos; si hay salida previa conservada, citarla literalmente con ruta/procedencia; no reconstruirla.
3. Actualización/delta y fuentes revisadas.
4. Qué avanzó, qué no se tocó y qué permanece solo reportado/inferido/desconocido.
5. Qué falta y bloqueos concretos.
6. Viabilidad: intención, resultado realizable, evidencia, aceptación y límites.
7. Tiempo/ciclos: solo datos medidos y fuente; sin estimaciones arbitrarias.
8. Siguiente acción atómica.
9. Continuación y traspaso cuando corresponda.
10. Persistencia: ruta, commit/blob, lectura de vuelta y próximo checkpoint.

FOL1 no está ACTIVO: no emitir CV/CY/A/B globales ni inventar SES. Conservar referencias locales de evento y los originales disponibles.

## 11. Crónica y fuentes

- **Original de apertura:** [originales/INSTRUCCION-ORIGINAL-20261115.md](originales/INSTRUCCION-ORIGINAL-20261115.md).
- **Crónica de este ciclo:** [cronica/APERTURA-20261115.md](cronica/APERTURA-20261115.md); debe conservar la instrucción literal, el resultado visible, la acción/evidencia y los límites sin sustituir el original.
- **DUG:** Samantha v399 · NX-399m; blob `04741e3d77564db586faaa3bffa78b681c92886a`; commit de actualización `4ec2737b44fdb2edfc5f02fee6bad2a14990e372`.
- **Methodology main:** `dba4d71f3dd7289f235079e9a226ad9ea898eb42`; inventario Khora blob `8514b83902f0fdbdae30d08e72cf652d798991f4`; `INICIO.md` blob `fc9b209ea56266742641b8ea384d4ec8580999c3`.
- **MCP-NORMATIVO:** DESACTIVADO.
- Los originales conservan su forma recibida; interpretaciones y resúmenes permanecen separados.

## 12. Reinstanciación

Al abrir una nueva conversación responsable:
1. Leer Metodología §ARR y DUG vigente antes de aplicar instrucciones de este frente.
2. Leer este núcleo completo y el control autoritativo. Comprobar titularidad, generación, rutas y blobs contra main.
3. Leer el original de apertura y la última crónica; citar literalmente el último estado vivo y la salida previa que realmente esté persistida.
4. Retomar en la siguiente acción pendiente sin repetir auditorías o escrituras que ya estén demostradas.
5. No inventar un constructor, contraparte, ID nativo, folio, archivo ni salida anterior. La asignación de roles/prompts adicionales queda pendiente de decisión del operador.

## 13. Persistencia y revisión

- **Fuente de estado:** este núcleo en `SeryMente/khora/main`.
- **Titularidad/generación:** únicamente `CONTROL-RESPONSABILIDAD.json`.
- **Originales:** archivos inmutables o rectificados mediante nueva entrada; no reemplazar el texto recibido con resúmenes.
- **Crónica:** registros secuenciales bajo `cronica/`; nunca mantener un segundo estado vivo.
- **Integridad:** escribir sobre revisión inspeccionada, comparar SHA, leer de vuelta y cotejar contenido/rutas. Un fallo de read-back impide declarar persistido el artefacto afectado.
- **Rutas:** el OCP nuevo usa `frentes/espacio/`; no mover OCP heredados ni crear copias.
- **Sincronización:** no se presume sincronización perpetua ni captura automática de otras aplicaciones.
- **Foliación:** FOL1 PREPARADO/NO ACTIVO; ningún folio global asignado.

