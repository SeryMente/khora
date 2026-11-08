# CHAT-005 · Conectar ruta de chat con ciclo real del núcleo

**Estado:** en_curso · **Fase:** ENT01/EpisTwin  
**ID:** local al OCP; no es folio ni control independiente.

## Instrucción y fuente
> Afirmación histórica: «el agente núcleo no había sido desarrollado»; luego corregida al reconocerse el ciclo existente.

## Lectura operativa derivada
Componer chat con policy, estado Ht, acciones/observaciones, retrieval, generación y fVAL; quitar bypass directo.

## Estado/evidencia
core.py, history.py, orchestrator.py y fval.py existen. H14/H15 del audit describen rutas separadas y REFINE sin efecto causal (corte octubre).

## Criterio de cierre
Traza E2E demuestra política→acción→observación→retrieval→respuesta; REFINE cambia siguiente query; insuficiencia coincide API/UI.

## Límites
No amplía autorización de egress, gasto, ingestión personal, cambios de seguridad, SQL/backfill/borrado productivo, merge o deploy. Aplican los gates del OCP.

## Enlaces
[OCP](../../OBJETO-CANONICO.md) · [Lista provisional](../../LISTA-TAREAS-PROVISIONAL.md) · [Antecedentes](../../antecedentes/ANTECEDENTES-UNIFICADOS.md)
