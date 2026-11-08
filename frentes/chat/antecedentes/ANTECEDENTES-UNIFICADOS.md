# Chat · Antecedentes unificados

**Fecha:** 2026-11-08. **Naturaleza:** expediente derivado de tres fuentes; no exportación nativa íntegra.

## A · Conversación del 19-10-2026
Fragmento aportado directamente por el operador. Incluye el OCP histórico, instrucciones de migración y estado técnico de ENT01.
> «Asegúrate de documentar el objeto canónico del frente de trabajo exhaustivamente para poderlo migrar a otra instancia.»
> «Solo enfócate en eso que te acabo de decir para la migración. Sé exhaustivo [...] que no vaya a empezar desde cero, sino que retome tu trabajo.»
El relevo citaba v0.16/E57; después el objeto avanzó a v0.33/E78. E53/E54 preservan acceso vía Khora autenticado, sin entrada directa por Render y pruebas públicas/artificiales con Groq. No autorizan egress personal general.

## B · Conversación del 20-10-2026
Adjunto “Texto pegado(20261108-171957).txt”, 649 líneas. El usuario corrigió el alcance: dirección general EpisTwin, primer hito pequeño y funcional. Open WebUI es interfaz, no sustituto del núcleo. Circuito deseado: contenido autorizado→grafo→agente núcleo→evidencia→respuesta en Open WebUI; repreguntas, fuentes, historial e insuficiencia honesta.
> «La importación del archivo personal sí está autorizada, nada más que quiero que quede acotado el objetivo».
> «Me interesa la integración de OpenWebUI y me interesa empezar a tener un chat funcional [...] pero no tan ambicioso».
> «El objetivo de este hilo era Epistwin [...] una arquitectura que verdaderamente coincida con los papers académicos de Epistwin».
Lumen/Cobalto fue fuente ficticia de prueba. El ciclo del núcleo sí existía; lo no acreditado era su composición integral. H08 visual se verificó históricamente; H09 —prueba y conformidad— quedó pendiente. E76 autoriza importación personal en general, pero no identifica fuente/lote ni permite egress general a Groq/Voyage.

## C · Prompt de migración del 19-10-2026
Segundo adjunto textual “Texto pegado (2)(1).txt”. Exigía continuar sin reiniciar, preservar autenticación/persistencia, diferenciar pruebas aisladas de recorrido real y no pisar otros frentes. En aquel corte PR #331 era draft/sin merge y PR #317 cerrado sin merge. En la consulta actual PR #307/#317/#331 constan cerrados sin merge.

## Síntesis del propósito
Chat debe avanzar hacia una conversación de Khora progresivamente fiel a EpisTwin. ENT01 es un chat textual real, pequeño y verificable, que use núcleo y grafo, fuentes auténticas, repreguntas, insuficiencia, aislamiento e historial. Chat funcional no significa EpisTwin completo.

## Decisiones y límites
| Ref | Decisión | Límite |
|---|---|---|
| E21 | Sin hosting adicional | Reusar Khora |
| E30 | Conversación primero | ENT01 acotada |
| E53/E54 | Khora auth; sin Render directo; primeras pruebas públicas/artificiales | No egress personal |
| E72 | Fuente sintética Lumen/Cobalto | Ya utilizada; no reingerir implícitamente |
| E76 | Importación personal autorizada | Fuente/lote y egress pendientes |
| H09 | Prueba/corrección/conformidad humana | Pendiente; no ENT02 |

## Arquitectura a acreditar
59 UA con clases F formalismo, E experimental, D controles derivados, X extensiones Khora y B fronteras interpretativas (no son 59 pruebas homogéneas). Bloques: memoria tipada/incremental y procedencia; ΦM determinista y extracción generativa; identidad/juicios/ledger; Leiden/fSUM; retrieval topológico; núcleo con política/estado/acciones/Ht; suficiencia global; tVIS efímero; soberanía/borrado; evaluación empírica.

## Auditoría histórica
El dictamen de 2026-10-18 contiene H01–H22: circuitos separados, auto-ratificación, identidad lexical, anclas sin verdad semántica, ocurrencias, ledger, extremos rechazados, contrato Python/TS, éxito prematuro, revisión/índice, publicación de comunidades, filtros de resumen, retrieval/answer, REFINE, fVAL, métricas de estabilidad, identidad/owner, fragmentación/hash, CI/pruebas, IAR/SEA y borrado. Es un corte histórico: cada hallazgo requiere revalidación contra main actual.

## Referencias
- OCP histórico v0.33/E78: https://github.com/SeryMente/khora/blob/docs/chat-epistwin-20261017/docs/frentes/chat-epistwin/OBJETO-CANONICO.md
- Matriz UA histórica: https://github.com/SeryMente/khora/blob/docs/chat-epistwin-20261017/docs/frentes/chat-epistwin/MATRIZ-CANON-EPISTWIN.md
- Arquitectura interfrentes: https://github.com/SeryMente/khora/blob/docs/chat-epistwin-20261017/docs/frentes/chat-epistwin/ARQUITECTURA-FRENTES-INTERCONECTADOS.md
- Matriz main 59 UA: https://github.com/SeryMente/khora/blob/main/khora-web/docs/evidence/graph-architecture-2026-10-18/MATRIZ-EPISTWIN.md
- Auditoría H01–H22: https://github.com/SeryMente/khora/blob/main/khora-web/docs/evidence/graph-architecture-2026-10-18/AUDITORIA-ARQUITECTURA.md

Este expediente deriva de las tres fuentes recibidas; no reemplaza los originales. No reproduce credenciales, tokens ni códigos efímeros.
