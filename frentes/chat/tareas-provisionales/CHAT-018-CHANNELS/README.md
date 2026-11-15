# CHAT-018 · Comunicación durable entre frentes

**Estado:** pendiente · **Fase:** Evolución posterior a ENT01  
**ID:** local al OCP; no es folio ni control independiente.

## Instrucción y fuente
> Especificación histórica propone Channel por frente, thread por rama y bus durable.

## Lectura operativa derivada
Revalidar Channels/Sub-agents; ledger mensajes/eventos/permisos, correlation/idempotency, acuse y reconciliación.

## Estado/evidencia
Diseño histórico dice transporte no implementado y flags desactivados por defecto; equivalente main no acreditado.

## Criterio de cierre
Entrega/acuse distintos; permisos por frente; replay sin duplicados; reconexión sin pérdida; no compartir contexto implícitamente.

## Límites
No amplía autorización de egress, gasto, ingestión personal, cambios de seguridad, SQL/backfill/borrado productivo, merge o deploy. Aplican los gates del OCP.

## Enlaces
[OCP](../../OBJETO-CANONICO.md) · [Lista provisional](../../LISTA-TAREAS-PROVISIONAL.md) · [Antecedentes](../../antecedentes/ANTECEDENTES-UNIFICADOS.md)
