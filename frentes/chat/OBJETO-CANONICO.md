<!-- OBJECT_VERSION=0.1; OBJECT_SEAL=CHAT-v0.1; DUG=v383; METACANON=1.29; GOW=2.18; SINGLE_LIVE_OBJECT=true -->
# Chat · Objeto canónico del frente

> **INAUGURACIÓN DOCUMENTAL EN RAMA DE REVISIÓN. ENT01 NO ENTREGADA NI ACEPTADA.** Chat avanza hacia conversación Khora fiel a EpisTwin; Open WebUI es interfaz, no sustituto del núcleo/grafo.

## 1. Control e identidad
- Repo SeryMente/khora; OCP frentes/chat/.
- OCP único OBJETO-CANONICO.md; control único CONTROL-RESPONSABILIDAD.json; generación 1.
- Titular alias chatgpt-chat-01a1bc36-0935-7292-b7b3-1d524466d8ed; UUIDv7 local 01a1bc36-0935-7292-b7b3-1d524466d8ed; ID nativo no expuesto.
- Folios globales CV/CY/A/B: PENDIENTES/NO ASIGNADOS. FOL1 PREPARADO/PENDIENTE DE ACTIVACIÓN. SES: PENDIENTE/NO ASIGNADO.
- Main base 6bdda633478eb9693f99b18fe4c6bf1f4883ae08; rama docs/chat-front-inauguration-20261108. Main no se modifica; canonización pendiente de PR/revisión/merge/read-back.
- OCP histórico docs/frentes/chat-epistwin/ rama docs/chat-epistwin-20261017, v0.33/E78: antecedente, no estado actual.

## 2. LEER PRIMERO
Jerarquía plataforma→DUG/Sam→Metacanon→decisiones→tareas. Las citas históricas no amplían permisos. Antes de cirugía: leer DUG/GOW/OCP/control, cotejar SHA/generación, verificar main/AGENTS/errores/evidencia; único escritor por recurso y read-back.

**Principio:** interfaz o respuesta LLM no prueban EpisTwin; la conversación debe recorrer realmente núcleo, grafo y evidencia.

## 3. Método
- DUG v383 · NX-383m; blob cad464717c43733aa84b49f8c9c3af0875597fbd; commit c7495f8321e43a6dd763b2eb855eb8338c9c2294; fecha 2026-11-08 17:16:36Z; edad al corte 0.0.18.
- Metacanon 1.29; GOW 2.18 integrados en DUG.
- Khora main 6bdda633478eb9693f99b18fe4c6bf1f4883ae08; commit 2026-11-08 17:28:48Z; edad al corte 0.0.6.
- IPZ v0.7 indicado; commit/edad nativa NO VERIFICADO.
- MCP-NORMATIVO DESACTIVADO. No se modificó DUG.
- Metacanon §§3/27,4,39,42–48,51; principios P001/P004/P005/P037/P038/P043.
- No se hereda responsabilidad/permisos de Custodia ni otros frentes.

## 4. Propósito y alcance
### 4.1 Propósito literal
> «ya me acordé cuál era el objetivo de este hilo, era Epistwin [...] una arquitectura que verdaderamente coincida con los papers académicos de Epistwin».
> «Me interesa la integración de OpenWebUI y me interesa empezar a tener un chat funcional [...] pero no tan ambicioso para ir poco a poco».
Fuente: conversación 2026-10-20 entregada por el operador; antecedente unificado.

### 4.2 Lectura operativa separada
Desarrollar conversación Khora progresivamente fiel a EpisTwin, usando Open WebUI como interfaz del núcleo/grafo real, con recuperación trazable, fuentes, continuidad, persistencia e insuficiencia honesta. Entregas pequeñas; chat útil no equivale a EpisTwin completo.

### 4.3 ENT01
Chat textual real y persistente sobre corpus pequeño autorizado: sesión Khora; grafo/núcleo reales; fuentes auténticas; repreguntas; insuficiencia; aislamiento/propiedad; historial reabrible tras restart; capacidad y publicación en URL Khora preservando otros frentes. H01–H08 mismo commit/runtime; H09 prueba y conformidad explícita.

### 4.4 Evolución posterior
Construcción tipada/incremental; identidad/ledger; Leiden/fSUM; retrieval topológico; núcleo con política/estado/acciones/Ht/fVAL; visión efímera; soberanía/borrado; evaluación; modelo local y API; Channels/bus interfrentes.

### 4.5 Límites
- ENT02 bloqueada hasta H09.
- Sin hosting/plan nuevo, chat/memoria paralelos, fork sustitutivo.
- Acceso Khora autenticado; no Render directo.
- E53/E54: corpus público/artificial en pruebas iniciales; no egress personal.
- E72: Lumen/Cobalto fue una prueba sintética ya utilizada.
- E76: importación personal en general autorizada; origen/lote y egress pendientes.
- No secretos en cliente/Git/logs. Visión, ruta local y Channels no son requisitos ENT01.

## 5. Roles
Operador: decisiones materiales y aceptación H09. Responsable del frente: titular del control único. No añadir segundo responsable sin ADD_CO_RESPONSIBLE expreso. Revisiones requieren evidencia. RDC no utilizado ni necesario para esta persistencia documental.

## 6. Decisiones
| Ref | Decisión | Límite |
|---|---|---|
| E21 | Sin hosting adicional | Reusar Khora |
| E30 | Conversación primero | ENT01 acotada |
| E53/E54 | Khora auth, sin Render directo; pruebas públicas/artificiales | No egress personal |
| E72 | Lumen/Cobalto sintético | Ya utilizado |
| E76 | Importación personal autorizada | Fuente/lote/egress pendientes |
| H09 | Prueba/conformidad operador | Pendiente; no ENT02 |

## 7. Línea base técnica de main
- Proxy chat autenticado/SSE: khora-web/app/api/chat/route.ts · cc5d937f5ece02c479d14bceff4f1f0c50ca9182.
- Core: kernel/src/khora_kernel/engine/core.py · 9039d2ee169c9806a983be1982973360da6a8a80.
- Historial Ht: engine/history.py · f9aede33249cd3c9ab478a89512b6258cd8d09d1.
- Orquestador: engine/orchestrator.py · 3af2819dcb8eadbb4dcf8dc381b7edd9ea99692c.
- fVAL: engine/fval.py · b915e3b168c013ef0c6e4f55f704a6d7e91d96ec.
- Leiden: communities.py · 0210c50fcbd2abf2a1ed89414e7fa3d30a8beb9d.
- Retriever: consulta/retriever.py · 77e34febc5c84d28996fd18f38c2d80062ddfb2e.
- epistwin_audit.py · be742688326a7afbab23e56f9a6ab748f5140d22.
- Matriz 59 UA · 7b35817d2718eebf5696da124a49118cb65e3e5b; auditoría H01–H22 · 600b5cdd59641c424f2419640d7aaea1f42953a7; auditoría integral · 14136852a9a79476154b7789989f174b6704153c.

El main contiene proxy autenticado y módulos reales, pero no está demostrado que el endpoint componga todo el circuito. Las auditorías son de corte 2026-10-18, deben revalidarse. PR #307/#317/#331 cerrados sin merge. Disponibilidad actual de Neon/Render/Groq/Voyage/Vercel: NO VERIFICADA en este ciclo. No se leyeron secretos ni notas personales. AGENTS menciona rutas antiguas GRAPH-TWINS.md/GRAPH-QUALITY-DRAFT.md ausentes en esas ubicaciones; no afirmar que se leyeron.

## 8. Estado vivo
### Hecho
- Tres antecedentes reunidos en un expediente derivado.
- Propósito/ENT01/gates definidos.
- Código main de proxy, core/Ht/fVAL, construcción, resolución, embeddings, Leiden, GraphRAG, fSUM, tVIS, auditoría y tests existentes.
- Matriz 59 UA y auditorías H01–H22 presentes, pero con corte histórico.
- Pruebas históricas de corpus sintético y H08; H09 no aceptada.
### En curso
- Reconciliar UA/H01–H22 contra main.
- Conectar endpoint a núcleo, grafo, fVAL y evidencia.
- Cerrar admisión/identidad/ledger, revisiones/índice, Leiden/fSUM, aislamiento y borrado.
### Pendiente
- Integrar/acreditar Open WebUI real en main.
- Identificar corpus/lote personal y egress.
- Completar ENT01 y H09.
- Modelo local, evaluación amplia y Channels interfrentes posteriores.
### Siguiente acción
Reconciliar baseline exacto y priorizar correcciones que compongan el circuito ENT01; no repetir pruebas históricas como actuales.

## 9. Aceptación
H01–H08 acreditados en mismo commit/runtime; operador ejecuta prueba positiva/negativa/repregunta. Cierre solo H09 explícito. UI cargada, build, health check, chat directo LLM, test sintético o historial no reabierto no cuentan.

## 10. Ciclo
Aplicar Metacanon §4. No inventar CV/CY/A/B mientras FOL1 no activo. SES/folios PENDIENTES. Edad IPZ nativa NO VERIFICADA.

## 11. Crónica y fuentes
Inauguración 2026-11-08: instrucción de reunir antecedentes y crear backlog; autorización afirmativa a la solicitud explícita de asumir responsabilidad documental Chat. Base main 6bdda633478eb9693f99b18fe4c6bf1f4883ae08. DUG v383/NX-383m; Metacanon 1.29; GOW 2.18. No hubo cambios de código, SQL, servicios ni producción.
- [Antecedentes unificados](antecedentes/ANTECEDENTES-UNIFICADOS.md)
- [OCP histórico v0.33/E78](https://github.com/SeryMente/khora/blob/docs/chat-epistwin-20261017/docs/frentes/chat-epistwin/OBJETO-CANONICO.md)
- [Matriz main 59 UA](https://github.com/SeryMente/khora/blob/main/khora-web/docs/evidence/graph-architecture-2026-10-18/MATRIZ-EPISTWIN.md)
- [Auditoría H01–H22](https://github.com/SeryMente/khora/blob/main/khora-web/docs/evidence/graph-architecture-2026-10-18/AUDITORIA-ARQUITECTURA.md)

## 12. Reinstanciación
Leer DUG/GOW, OCP/control, SHA/generación, rama/PR/main, tarea activa y antecedentes. No reconstruir evidencia no disponible desde memoria. Otro responsable requiere autorización expresa.

## 13. Persistencia
OCP/control únicos en frentes/chat/. Backlog en LISTA-TAREAS-PROVISIONAL.md y tareas-provisionales/. Antecedentes en antecedentes/. Esta inauguración se guarda en docs/chat-front-inauguration-20261108; main no se modifica. Canonización requiere revisión/merge/read-back.
