# CUSTODIA-B2-005 · Revalidar el acceso al histórico Vercel Blob

> **Estado:** DIFERIDA · **Prioridad:** condicionada a la reactivación del origen.  
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
