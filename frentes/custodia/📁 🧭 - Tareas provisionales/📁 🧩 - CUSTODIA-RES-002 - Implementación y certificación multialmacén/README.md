# CUSTODIA-RES-002 · Implementación y certificación multialmacén

> **Estado:** RESUELTA POR REENFOQUE · propuesta archivada; no implementar ni certificar resiliencia en el alcance actual.
> **Depende de:** CUSTODIA-RES-001 aprobada; criterios de diseño ratificados. **Desbloquea:** garantía de producto candidata, sujeta a aceptación.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.

## 1. Objetivo

Implementar en una rama aislada la arquitectura aprobada de persistencia local-first, enrutamiento multialmacén, réplica verificable y reparación automática. Certificarla en entornos no productivos antes de plantear cualquier cambio productivo.

## 2. Alcance

- Contratos/adaptadores de proveedores con estado y capacidades explícitas.
- Cola local cifrada, reanudable e idempotente.
- Enrutador por disponibilidad, cuota, capacidad y resultado de prueba.
- Registro de objetos y réplicas con longitud, SHA-256, sesión, parte y proveedor.
- Replicación asíncrona, circuito de reintentos, reparación y reconciliación.
- Interfaz que comunica con exactitud el estado local/remoto/degradado.
- Pruebas de recuperación desde cada proveedor y de integridad.

**No incluye**
- Cambios productivos antes de aprobación específica.
- Eliminar objetos fuente legacy, datos originales o respaldos.
- Modificar credenciales, llaves, bucket/CORS o SQL productivo sin autorización expresa.
- Declarar garantía de pérdida cero sin evidencia y límites medidos.

## 3. Matriz mínima de pruebas

1. B2 sano y Blob sano; escritura y dos réplicas.
2. Blob suspendido/cuota excedida; B2 recibe la escritura.
3. B2 sin autorización; Blob sano recibe la escritura y B2 queda circuito abierto.
4. Ambos proveedores caídos; captura local durable, estado visible y cola pendiente.
5. Internet interrumpido durante audio multipart; recuperación tras reconexión.
6. Cierre/recarga/reinicio del navegador; reanudación sin duplicados ni pérdida.
7. Réplica incompleta; reparación posterior con mismo ID y mismo hash.
8. Objeto alterado, faltante o eliminado; detección y recuperación desde copia íntegra.
9. Conflicto/duplicado, orden de partes, manifiesto y archivo final.
10. Restauración completa con validación de bytes, cifrado, integridad y procedencia.

## 4. Criterios de aceptación

- Todos los escenarios críticos anteriores ejecutados en entornos aislados.
- Al menos una copia remota física verificada cuando un proveedor esté sano.
- La segunda réplica se repara automáticamente cuando vuelve el proveedor.
- Ningún estado pendiente se presenta como persistencia remota aceptada.
- El historial original no se borra ni sobrescribe.
- Prueba de restauración independiente desde cada proveedor.
- Observabilidad correlacionada sin secretos ni contenido personal.
- Revisión humana del usuario antes de autorizar despliegue/cutover productivo.

## 5. Salida

Código, pruebas, evidencias físicas de escritura/lectura/restauración y decisión explícita de liberación. El merge o despliegue productivo no se deriva de la aprobación del diseño; requiere su compuerta correspondiente.


## Disposición de cierre · 2026-11-10 · reenfoque de CUSTODIA

**Estado de gestión:** RESUELTA POR REENFOQUE. El único objetivo actual del frente es el inventario forense de dictados/archivos conservados y la conciliación del panel «Recuperar capturas» (CUSTODIA-01).

Este cierre es administrativo y de alcance. No significa que el objetivo técnico histórico de este expediente se haya ejecutado, probado o aceptado. Se conserva todo el contenido y evidencia histórica de este README.

No reabrir ni ejecutar este expediente dentro del alcance actual. No se ha modificado código, Neon, B2, Blob, configuración ni producción.
