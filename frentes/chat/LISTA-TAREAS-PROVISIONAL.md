# Chat · Lista de tareas provisionales

**Versión 0.1.** Frente CHAT · OCP frentes/chat/. Main base 6bdda633478eb9693f99b18fe4c6bf1f4883ae08. DUG v383/NX-383m · Metacanon 1.29 · GOW 2.18.

Estados: **completada** = criterio y evidencia releída; **en_curso** = hay código/docs/pruebas pero falta integración o verificación; **pendiente** = no iniciado o fase/gate posterior. Archivo existente o test unitario no demuestra E2E.

## Hecho
- **CHAT-001 · Consolidar tres antecedentes:** Se prepara antecedentes/ANTECEDENTES-UNIFICADOS.md en esta rama; read-back pendiente al materializar.

- **CHAT-002 · Definir propósito y primer hito acotado:** Propósito y alcance quedan en el OCP nuevo; H09 sigue pendiente.

**Activos preexistentes, no entregas completas:** proxy auth/SSE; core/Ht/orchestrator/fVAL; constructor/normalización/extracción/resolución; embeddings/Leiden/GraphRAG/fSUM/tVIS; epistwin_audit y tests. Matriz de 59 UA y auditorías H01–H22 en main con corte 2026-10-18. Evidencia histórica ENT01 con corpus artificial y H08 visual; H09 sigue pendiente.

## En curso
- **CHAT-003 · Reconciliar 59 UA y H01–H22 contra main actual:** Revalidar UA por SHA/código/test/runtime; conservar clases F/E/D/X/B; revalidar hallazgos H01–H22; no usar el corte de octubre como estado presente.

- **CHAT-005 · Conectar ruta de chat con ciclo real del núcleo:** Componer chat con policy, estado Ht, acciones/observaciones, retrieval, generación y fVAL; quitar bypass directo.

- **CHAT-006 · Construcción incremental y procedencia del grafo:** Preservar unidades/ocurrencias/anclas al original, tipos Entity/Literal/Blank, ΦM determinista separada de extracción probabilística y propuestas no autoaceptadas.

- **CHAT-007 · Identidad contextual y ledger durable de juicios:** Resolver homónimos/alias/pronombres, aceptación/rechazo/revocación sobre revisión vista y ledger independiente de propuestas efímeras.

- **CHAT-008 · Generaciones coherentes e índice vectorial consistente:** Manifiesto de fuentes/modelo/prompt/juicios/política, outbox/retry/replay, identidad vectorial, atomicidad e invalidación.

- **CHAT-009 · Comunidades Leiden, reificación y resúmenes seguros:** Partición tras update aceptado; conectividad/cobertura/membresías; fSUM sobre subgrafo inducido y entradas autorizadas.

- **CHAT-010 · Recuperación topológica con fuentes y generación:** Conectar retriever, expansión topológica/comunidades, visibilidad, spans/anclas y generador condicionado a evidencia.

- **CHAT-011 · Política, Ht, REFINE y suficiencia global:** Observaciones rigen siguiente acción; REFINE cambia query; fVAL global nunca se omite; visión solo ante déficit visual.

- **CHAT-012 · Propiedad, aislamiento y durabilidad multiusuario:** Propagar owner/ámbito a API, grafo, índices, resúmenes, cachés e historial; probar restart/concurrencia/revocación.

- **CHAT-014 · Soberanía, borrado e invalidación de derivados:** Trazar fuente→unidades→juicios→grafo→comunidad→resumen→índice→respuesta; definir retención e invalidación.

- **CHAT-015 · Refinamiento visual efímero:** Recuperar imagen original, elegir contexto topológico, tVIS, impedir persistencia de inferencias.

- **CHAT-017 · Evaluación empírica y estabilidad:** Fijar perfil/corpus; reproducir jueces/métricas/nulos/multiseed/resolución; invariancia etiquetas; split/merge/ablaciones.

## Por construir / pendiente
- **CHAT-004 · Integrar Open WebUI real en Khora:** Comparar candidatos PR #307/#317/#331, recuperar solo delta compatible, verificar versión/licencia/atribución, sesión, CSS/assets, URL y no-regresión.

- **CHAT-013 · Delimitar archivo personal y egress:** Identificar origen/lote, minimización/sensibilidad y destinos/proveedores; separar importación de egress a Groq/Voyage.

- **CHAT-016 · Ruta de modelo local junto a proveedor externo:** Adapters comunes, privacidad, herramientas, embeddings/visión, cuotas y fallback explícito.

- **CHAT-018 · Comunicación durable entre frentes:** Revalidar Channels/Sub-agents; ledger mensajes/eventos/permisos, correlation/idempotency, acuse y reconciliación.

- **CHAT-019 · Publicar ENT01 y obtener prueba/conformidad H09:** H01–H08 en mismo commit/runtime, recorrido positivo/negativo/repregunta, persistencia, aislamiento, capacidad, rollback y aceptación humana.

## Índice de fichas
| ID y tarea | Estado | Fase |
|---|---|---|
| [CHAT-001 · Consolidar tres antecedentes](tareas-provisionales/CHAT-001-ANTECEDENTES/README.md) | completada | Documental |
| [CHAT-002 · Definir propósito y primer hito acotado](tareas-provisionales/CHAT-002-ALCANCE-ENT01/README.md) | completada | Documental |
| [CHAT-003 · Reconciliar 59 UA y H01–H22 contra main actual](tareas-provisionales/CHAT-003-BASELINE-UA-HXX/README.md) | en_curso | Auditoría |
| [CHAT-004 · Integrar Open WebUI real en Khora](tareas-provisionales/CHAT-004-OPENWEBUI/README.md) | pendiente | ENT01 |
| [CHAT-005 · Conectar ruta de chat con ciclo real del núcleo](tareas-provisionales/CHAT-005-AGENTE-NUCLEO/README.md) | en_curso | ENT01/EpisTwin |
| [CHAT-006 · Construcción incremental y procedencia del grafo](tareas-provisionales/CHAT-006-MEMORIA-TIPADA/README.md) | en_curso | EpisTwin |
| [CHAT-007 · Identidad contextual y ledger durable de juicios](tareas-provisionales/CHAT-007-IDENTIDAD-LEDGER/README.md) | en_curso | EpisTwin |
| [CHAT-008 · Generaciones coherentes e índice vectorial consistente](tareas-provisionales/CHAT-008-REVISION-INDICE/README.md) | en_curso | EpisTwin |
| [CHAT-009 · Comunidades Leiden, reificación y resúmenes seguros](tareas-provisionales/CHAT-009-LEIDEN-FSUM/README.md) | en_curso | EpisTwin |
| [CHAT-010 · Recuperación topológica con fuentes y generación](tareas-provisionales/CHAT-010-RETRIEVAL/README.md) | en_curso | ENT01/EpisTwin |
| [CHAT-011 · Política, Ht, REFINE y suficiencia global](tareas-provisionales/CHAT-011-HT-REFINE-FVAL/README.md) | en_curso | EpisTwin |
| [CHAT-012 · Propiedad, aislamiento y durabilidad multiusuario](tareas-provisionales/CHAT-012-AISLAMIENTO/README.md) | en_curso | ENT01 |
| [CHAT-013 · Delimitar archivo personal y egress](tareas-provisionales/CHAT-013-CORPUS-EGRESS/README.md) | pendiente | ENT01 |
| [CHAT-014 · Soberanía, borrado e invalidación de derivados](tareas-provisionales/CHAT-014-BORRADO/README.md) | en_curso | EpisTwin |
| [CHAT-015 · Refinamiento visual efímero](tareas-provisionales/CHAT-015-VISION-EFIMERA/README.md) | en_curso | Posterior a ENT01 |
| [CHAT-016 · Ruta de modelo local junto a proveedor externo](tareas-provisionales/CHAT-016-MODELO-LOCAL/README.md) | pendiente | Evolución |
| [CHAT-017 · Evaluación empírica y estabilidad](tareas-provisionales/CHAT-017-EVALUACION/README.md) | en_curso | EpisTwin |
| [CHAT-018 · Comunicación durable entre frentes](tareas-provisionales/CHAT-018-CHANNELS/README.md) | pendiente | Evolución posterior a ENT01 |
| [CHAT-019 · Publicar ENT01 y obtener prueba/conformidad H09](tareas-provisionales/CHAT-019-ACEPTACION-ENT01/README.md) | pendiente | Cierre ENT01 |

## Gates transversales
1. ENT01 es acotada; no equivale a EpisTwin completo.
2. E76 no identifica fuente/lote ni permite egress general a terceros.
3. E53/E54 mantienen Khora autenticado, sin acceso directo por Render.
4. No crear host, chat ni memoria paralela; preservar atribución de Open WebUI.
5. ENT02, modelo local y Channels se posponen hasta aceptación ENT01 salvo autorización posterior.
6. Ninguna tarea autoriza gasto, egress, ingesta personal, cambio credenciales/seguridad, SQL/backfill/borrado productivo, merge o deploy.

CHAT-001…019 son IDs locales estables, no CV/CY/A/B, SES ni controles. Las fichas heredan la autoridad del OCP. No se asignan owners/folios independientes. Cambio de estado exige evidencia y read-back.
