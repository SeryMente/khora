# CUSTODIA-B2-007 · Pulido de la implementación B2

> **Estado:** propuesta_pendiente_aprobacion · **Prioridad:** P1 · **Hito:** 3 de 5.
> **Depende de:** CUSTODIA-B2-006 y CUSTODIA-B2-005 aceptadas (archivado E2E operativo y diagnóstico residual cerrado). **Desbloquea:** CUSTODIA-RES-001.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.

## 1. Objetivo

Dejar la implementación que restablece el archivado lo más sencilla posible, sin deuda técnica innecesaria y sin quitar ninguna protección esencial de integridad, recuperabilidad, cifrado, idempotencia y observabilidad.

## 2. Alcance

- Revisar el diff completo de la solución que ya funciona.
- Eliminar duplicación, rutas muertas y complejidad accidental demostradas por uso/código.
- Consolidar el contrato de proveedor, manejo de errores, reintentos y verificación de objetos.
- Mantener pruebas focales sobre audio/texto, integridad, fallo de proveedor y recuperación.
- Documentar cada dependencia que se conserva y por qué.

**No incluye**
- Diseñar todavía la topología multialmacén.
- Quitar la lectura de objetos legacy de Vercel Blob mientras sigan existiendo referencias históricas necesarias.
- Borrar objetos, migrar historial o alterar producción por limpieza estética.
- Debilitar una compuerta solo para que el flujo parezca más fluido.

## 3. Secuencia mínima

1. Inventariar el código nuevo y clasificar cada pieza: necesaria, duplicada, temporal o sin uso.
2. Proponer el diff mínimo.
3. Ejecutar pruebas de regresión y revisión de rutas legacy.
4. Medir la reducción real de complejidad y documentar lo que se conserva.
5. Read-back de código, tests y evidencia.

## 4. Criterios de aceptación

| Criterio | Evidencia exigida | Resultado |
|---|---|---|
| No quedan caminos redundantes sin uso | Revisión de imports, rutas y dependencias | PENDIENTE |
| Se conserva el contrato de integridad | Typecheck, unitarias y tests de contrato | PENDIENTE |
| Archivado y recuperación no regresan | E2E con proveedor físico no productivo | PENDIENTE |
| Lectura histórica permanece recuperable | Prueba sobre referencias Blob legacy de fixture | PENDIENTE |
| El diff es mínimo y justificable | Resumen de cada cambio y dependencia restante | PENDIENTE |

## 5. Salida

Una implementación B2 funcional, reducida a lo necesario, probada y documentada. Solo después se abre el diseño de redundancia multialmacén; no se mezcla refactorización con la primera corrección del incidente.
