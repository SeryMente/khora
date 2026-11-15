# CHAT-012 · Propiedad, aislamiento y durabilidad multiusuario

**Estado:** en_curso · **Fase:** ENT01  
**ID:** local al OCP; no es folio ni control independiente.

## Instrucción y fuente
> E53/E54: Khora autenticado; sin entrada directa por Render.

## Lectura operativa derivada
Propagar owner/ámbito a API, grafo, índices, resúmenes, cachés e historial; probar restart/concurrencia/revocación.

## Estado/evidencia
Proxy web valida auth() y mantiene API key server-side; H18 encontró root global/stores compartidos en audit anterior.

## Criterio de cierre
Dos usuarios no leen/infieren datos cruzados; historial se reabre tras restart; acceso anónimo rechazado.

## Límites
No amplía autorización de egress, gasto, ingestión personal, cambios de seguridad, SQL/backfill/borrado productivo, merge o deploy. Aplican los gates del OCP.

## Enlaces
[OCP](../../OBJETO-CANONICO.md) · [Lista provisional](../../LISTA-TAREAS-PROVISIONAL.md) · [Antecedentes](../../antecedentes/ANTECEDENTES-UNIFICADOS.md)
