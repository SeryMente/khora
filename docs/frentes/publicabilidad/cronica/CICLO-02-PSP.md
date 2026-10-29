# Crónica · Ciclo 02 · Protocolo situacional de publicación

**Frente:** Publicabilidad.  
**Fecha de lectura:** 2026-10-28 local / fuentes UTC hasta 2026-10-29T02:15:30Z.  
**OCP:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md), PUBLICABILIDAD-v0.2.  
**Fuente normativa adquirida:** DUG v358 · NX-358m · Metacanon 1.23 · GOW 2.7; blob 89a28e4d05f5baab9c4b86abdb9fbfc532690c75.

## Instrucción adicional y resultado documental

El operador precisó que el alcance de Publicabilidad es de investigación y documentación, y que la versión 1.0 del OCP debe incorporar un Protocolo Situacional de Publicación (PSP). La investigación debe determinar la secuencia más eficiente para cada escenario material, no limitarse a listar plataformas. Cada secuencia debe especificar precondiciones, pasos ordenados, fallback, condición de parada, evidencia y comprobación del éxito. La eficiencia se mide entre rutas elegibles, seguras y autorizadas, evitando duplicados y reintentos ciegos antes de minimizar pasos y latencia.

## Hallazgos añadidos

- La matriz preliminar enumera escenarios de disponibilidad MCP, permisos por plan, timeout ambiguo, fallos de Actions, preview Git, cuotas, acceso público, RDC/CLI y rollback.
- La documentación actual de OpenAI indica MCP completo con escritura para Business/Enterprise/Edu; Pro admite lectura/obtención y Free no queda acreditado para escritura.
- La documentación actual de Vercel Hobby publica límites de uso, incluido 100 deployments/día, y restricción a uso personal/no comercial. El consumo real y la clasificación de uso de Khora siguen pendientes.
- El último deployment productivo consultado permanece en el SHA previamente observado; main se encontró 97 commits por delante al corte. Las ejecuciones recientes de CI/UI/deploy fallan rápidamente y la causa sigue NO DETERMINADA.

## Estado de ejecución

Esta crónica registra documentación, no una publicación. No se ejecutó deployment, no se cambió Vercel y no se modificó main. El runbook de CLI productiva permanece pendiente de validación porque debe preservar migración runtime, provenance y smoke del workflow existente.

## Referencias

- [Investigación inicial actualizada](../evidencias/INVESTIGACION-INICIAL-2026-10-28.md)
- [Matriz preliminar de escenarios](../evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.1.md)
- [Instrucción fundacional literal](../originales/INSTRUCCION-FUNDACIONAL-2026-10-28.txt)
