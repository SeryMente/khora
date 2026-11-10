# CUSTODIA-B2-007 · Pulido técnico posterior

> **Estado:** DIFERIDA · sin trabajo activo asignado.  
> **Dependencia:** aceptación de CUSTODIA-B2-006 y existencia de deuda técnica concreta.

## Objetivo cuando se reabra

Reducir complejidad accidental y consolidar la implementación de persistencia híbrida una vez que nuevas escrituras B2, lectura por proveedor y estado legacy por archivo estén aceptados en producción.

## Condiciones de reanudación

1. CUSTODIA-B2-006 aceptada mediante evidencia de persistencia nueva B2 y read-back.
2. Se identifica una deuda técnica concreta, reproducible y relevante para mantenimiento/seguridad/estabilidad.
3. El operador prioriza expresamente ese pulido.

## Exclusiones

No refactorizar ahora por estética ni abrir cambios que desplacen la implementación/validación E2E actual. No eliminar controles de cifrado, integridad, aislamiento de proveedores, idempotencia o fail-closed.

No incluye migración histórica Blob→B2 ni proveedor adicional.
