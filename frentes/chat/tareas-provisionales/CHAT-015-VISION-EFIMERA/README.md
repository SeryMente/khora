# CHAT-015 · Refinamiento visual efímero

**Estado:** en_curso · **Fase:** Posterior a ENT01  
**ID:** local al OCP; no es folio ni control independiente.

## Instrucción y fuente
> UA-21–25: déficit visual, payload original, contexto efímero, no writeback.

## Lectura operativa derivada
Recuperar imagen original, elegir contexto topológico, tVIS, impedir persistencia de inferencias.

## Estado/evidencia
tvis/corutina y test existen; puerto LLM simulado; prueba Neo4j real puede omitirse.

## Criterio de cierre
Solo déficit visual activa; raw payload usado; contexto pertinente; cero nodos/aristas nuevos.

## Límites
No amplía autorización de egress, gasto, ingestión personal, cambios de seguridad, SQL/backfill/borrado productivo, merge o deploy. Aplican los gates del OCP.

## Enlaces
[OCP](../../OBJETO-CANONICO.md) · [Lista provisional](../../LISTA-TAREAS-PROVISIONAL.md) · [Antecedentes](../../antecedentes/ANTECEDENTES-UNIFICADOS.md)
