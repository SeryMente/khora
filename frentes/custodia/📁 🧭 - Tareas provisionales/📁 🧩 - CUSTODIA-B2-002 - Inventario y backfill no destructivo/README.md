# CUSTODIA-B2-002 · Migración histórica Vercel Blob → Backblaze B2

> **Estado:** RESUELTA POR REENFOQUE · no ejecutar dentro del alcance vigente.  
> **Condición de reanudación:** Vercel Blob reactivado por el propietario, GET físico confirmado y autorización explícita del operador para iniciar la migración.

## Objetivo cuando se reabra

Migrar de forma no destructiva los objetos históricos Vercel Blob a Backblaze B2, cotejar cada objeto físico, verificar bytes/longitud/SHA-256 y reconciliar todas sus referencias. Esta tarea no participa en la implementación ni en la publicación de la persistencia nueva.

## Trabajo permitido ahora

Ninguna operación de migración. Se conserva la evidencia histórica existente y el identificador de esta tarea. No ejecutar probes repetidos, descargas, copia, backfill, cambios SQL/JSONB ni eliminación de fuentes.

## Secuencia futura, sujeta a nueva autorización

1. Comprobar que el store Blob está activo y permite GET.
2. Inventariar exhaustivamente los objetos fuente y reconciliar el inventario con todas las referencias en Neon, incluidas las ocurrencias JSONB.
3. Copiar cada objeto a B2 en forma no destructiva y reanudable.
4. Leer cada destino y cotejar bytes, longitud y SHA-256.
5. Preparar reconciliación exacta y transaccional de referencias en una fase separada.
6. Mantener los originales Blob hasta la aceptación expresa del propietario.

## Exclusiones vigentes

- No forma parte de la tarea activa CUSTODIA-B2-006.
- No se ejecuta antes de reactivar/pagar Blob.
- No se considera autorizada por la instrucción de implementar la persistencia nueva B2.
- No incluye promoción automática, reescritura de referencias productivas ni borrado de originales.

El estado permanece DIFERIDA hasta que se satisfagan todas las condiciones anteriores.


## Disposición de cierre · 2026-11-10 · reenfoque de CUSTODIA

**Estado de gestión:** RESUELTA POR REENFOQUE. El operador definió que el único objetivo actual del frente es el inventario forense de dictados/archivos conservados y la conciliación del panel «Recuperar capturas» (CUSTODIA-01).

Este cierre es administrativo y de alcance. No significa que el objetivo técnico histórico de este expediente se haya ejecutado, probado o aceptado; en particular, no convierte builds, preflights, E2E pendientes, migraciones diferidas o propuestas en PASS. Se conserva todo el contenido y evidencia histórica de este README.

No reabrir ni ejecutar este expediente dentro del alcance actual. Sus referencias a objetos, localizadores o diagnósticos podrán consultarse como fuentes de evidencia subordinadas a CUSTODIA-01, sin reactivar el objetivo anterior. No se ha modificado código, Neon, B2, Blob, configuración ni producción.
