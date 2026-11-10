# CUSTODIA-B2-005 · Revalidar el acceso al histórico Vercel Blob

> **Estado:** RESUELTA POR REENFOQUE · diagnóstico histórico preservado; no reabrir esta tarea.  
> **OCP padre:** [frentes/custodia/OBJETO-CANONICO.md](../../../OBJETO-CANONICO.md).  
> **Control:** hereda titularidad y autorización del OCP padre; no crea autoridad independiente.

## Objetivo al reanudar

Comprobar si los objetos históricos de khora-audio vuelven a ser legibles desde Vercel Blob después de que el propietario reactive el servicio. El bloqueo actual no autoriza inferir que los archivos hayan sido borrados o corrompidos.

## Condiciones de reanudación

1. El propietario reactiva/paga el servicio Vercel Blob.
2. El estado del store deja de aparecer suspendido y se confirma acceso GET/exportación.
3. El operador solicita expresamente reanudar esta comprobación.
4. Se utilizan credenciales existentes autorizadas; no se crean ni rotan claves por esta tarea.

## Alcance al reanudar

- Comprobar estado del almacén y una muestra de lecturas físicas autorizadas.
- Separar 403 por bloqueo de proveedor, 404 real, error de red e integridad de objeto.
- Confirmar qué objetos históricos son recuperables sin cambiar sus localizadores.
- Entregar evidencia minimizada para decidir la fase posterior CUSTODIA-B2-002.

## Exclusiones

Mientras permanezca diferida, no realizar probes repetidos, descargas, copia de objetos, backfill, actualización de referencias Neon, borrado de originales, escrituras Blob ni cambios de configuración del proveedor.

La copia histórica Blob→B2 no se ejecuta en esta tarea. Requiere una autorización específica posterior, inventario fuente legible y aceptación de la estrategia de migración.


## Disposición de cierre · 2026-11-10 · reenfoque de CUSTODIA

**Estado de gestión:** RESUELTA POR REENFOQUE. El operador definió que el único objetivo actual del frente es el inventario forense de dictados/archivos conservados y la conciliación del panel «Recuperar capturas» (CUSTODIA-01).

Este cierre es administrativo y de alcance. No significa que el objetivo técnico histórico de este expediente se haya ejecutado, probado o aceptado; en particular, no convierte builds, preflights, E2E pendientes, migraciones diferidas o propuestas en PASS. Se conserva todo el contenido y evidencia histórica de este README.

No reabrir ni ejecutar este expediente dentro del alcance actual. Sus referencias a objetos, localizadores o diagnósticos podrán consultarse como fuentes de evidencia subordinadas a CUSTODIA-01, sin reactivar el objetivo anterior. No se ha modificado código, Neon, B2, Blob, configuración ni producción.
