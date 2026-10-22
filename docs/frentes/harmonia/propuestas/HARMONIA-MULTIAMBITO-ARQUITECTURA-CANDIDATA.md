# Harmonia · propuesta candidata de arquitectura multiámbito

**Estado:** PROPUESTA DOCUMENTAL · NO APROBADA · NO IMPLEMENTAR COMO ARQUITECTURA VIGENTE  
**Frente:** Harmonia · **Folio de sesión:** `SES-20261021-F8R3M6Q2`  
**Versión fuente de candidata:** v0.4.0 en PR #333; **aceptación E2E:** ABIERTA

## 1. Propósito

Preparar una opción modular para añadir nuevos ámbitos de observación sin reescribir el núcleo de Harmonia. Esta propuesta pertenece al trabajo no esencial: no debe retrasar ni sustituir la primera aceptación E2E de la observabilidad de ChatGPT.

La propuesta no declara que la arquitectura ya existe, no otorga permisos adicionales y no autoriza cambios de captura, privacidad, storage, permisos de extensión ni publicación. La formalización de decisiones materiales queda diferida al FT de Metacanon correspondiente.

## 2. Límites de diseño

- El núcleo compartido coordina ciclo de vida, eventos, validación, telemetría de ejecución y selección de ámbito; no conoce selectores o semántica particulares del sitio.
- Cada ámbito se define por un adaptador versionado y un catálogo verificable. Un ámbito sin catálogo suficiente permanece `unmapped`; no se infiere su completitud por analogía.
- La observación estructural de una superficie y la captura de contenido/eventos por pestaña son contratos distintos. Un líder estructural no puede suprimir contenido válido procedente de otras pestañas.
- Cada evento conserva identidad de evento, sesión, pestaña/origen autorizado, ámbito, versión de contrato y marca temporal. El colector valida y normaliza el evento antes de persistirlo.
- Los datos, índices, credenciales y políticas se separan por ámbito mediante namespaces explícitos. Ningún adaptador obtiene acceso al almacén de otro ámbito de manera implícita.
- Los permisos de host y las capacidades se conceden al mínimo. Añadir un ámbito nuevo debe mostrar exactamente qué origen/permisos requiere antes de activar código.
- No se descargará ni ejecutará JavaScript remoto desde el repositorio como mecanismo de sincronización. La sincronización de catálogo/metadatos queda separada de las actualizaciones controladas del código ejecutable.
- Los requisitos de privacidad del núcleo (no leer borradores, valores de campos ni razonamiento oculto) son invariantes. Cualquier propuesta que necesite ampliarlos debe escalarse como una decisión material independiente.

## 3. Contratos candidatos

### 3.1 Descriptor de ámbito

Cada descriptor propone declarar:
- `schema` y `contractVersion`;
- `scopeId` estable y `displayName`;
- coincidencia de origen/ruta y método de clasificación;
- adaptador responsable de observar la superficie;
- catálogo de capacidades y fuentes de verificación;
- política de completitud, sus umbrales y condiciones para no mapear;
- política de privacidad, campos capturados/excluidos y redacción aplicable;
- namespace de persistencia;
- permisos requeridos y razón de cada permiso;
- pruebas de contrato y criterios de aceptación.

El descriptor es metadato validado, no código ejecutable ni autorización automática.

### 3.2 Adaptador

Un adaptador implementa únicamente las operaciones del contrato común:
1. clasificar una URL dentro del ámbito;
2. enumerar capacidades visibles verificables;
3. emitir observaciones con identificadores y origen del evento;
4. notificar cambios posteriores sin duplicar eventos ni perder actualizaciones;
5. devolver estado de cobertura con razones explícitas y desconocidos;
6. declarar de forma determinista qué no puede observar.

Un adaptador no modifica el scheduler compartido, las credenciales, la política global, el almacén de otro ámbito ni los permisos por su cuenta.

### 3.3 Catálogo de cobertura

El catálogo mantiene la diferencia entre documentación oficial leída, observación natural y cobertura realmente capturada. Una puntuación de mapeo no es porcentaje de precisión, garantía de exhaustividad ni aceptación de E2E.

La completitud solo se habilita cuando existe un catálogo validado y cada condición declarada pasa; de lo contrario, el estado permanece `unmapped` o `exploring`. El catálogo y su espejo empaquetado deben tener igualdad de contenido comprobada.

### 3.4 Aislamiento de persistencia

La propuesta recomienda un contrato común con namespaces como `<scopeId>/<schemaVersion>/`, sujeto a revisión de migración. Índices y deduplicación deben ser idempotentes y preservar tanto la superficie única como los avistamientos individuales. La ubicación física, retención, cuotas y borrado se decidirán después con un esquema de recuperación y una política aprobada; no se fijan aquí como canon.

## 4. Incorporación de un nuevo ámbito

1. Documentar propósito, origen, datos capturados y excluidos.
2. Elaborar descriptor y catálogo candidatos.
3. Revisar permisos mínimos, separación de almacenamiento y redacción.
4. Validar esquemas y contratos estáticos.
5. Probar el adaptador contra fixtures sintéticos claramente identificados como tales.
6. Ejecutar integración local con persistencia, replay, concurrencia, fallos y recuperación.
7. Ejecutar pruebas reales en el entorno autorizado, comparando eventos esperados con observados.
8. Aceptar el ámbito mediante evidencia y versionado explícitos; hasta entonces se mantiene desactivado/no mapeado.

## 5. Pruebas y criterios de aceptación propuestos

- Rechazar origen, contrato, evento, versión o permiso fuera de alcance.
- Mantener los contratos comunes estables cuando cambia un adaptador.
- No tener colisiones entre IDs de eventos y namespaces de ámbitos distintos.
- Persistir y reconstruir índices sin pérdidas tras reinicio/recuperación.
- Respetar observadores estructurales por región sin suprimir captura de contenido por pestaña.
- Demostrar que eventos excluidos no llegan a persistencia.
- Demostrar que los catálogos sin criterios suficientes nunca alcanzan falsamente `complete`.
- Verificar permisos mínimos y que no se ejecute código obtenido remotamente.
- Mantener un camino de desactivación/rollback del ámbito sin modificar otros ámbitos.

Las pruebas de rendimiento y la optimización quedan explícitamente para después de la primera aceptación E2E. En esa fase futura se fijará una línea base y se comparará la cobertura; esta propuesta no prescribe ninguna optimización de CPU/RAM ni de fingerprints.

## 6. Decisiones abiertas; no resolver por inferencia

- Si el núcleo debe ejecutarse en una única extensión o dividirse en paquetes/adaptadores cargables.
- Versionado y compatibilidad de los contratos entre ámbitos.
- Retención, cuotas, compactación y restauración de cada namespace.
- Granularidad exacta de los permisos y consentimiento por ámbito.
- Modelo de identidad de conversación/tabs en ámbitos que no sean ChatGPT.
- Taxonomía de pruebas compartidas y pruebas específicas.
- Mecanismo autorizado de release, migraciones de catálogo y rollback.

Estas cuestiones requieren decisión/revisión antes de convertir la propuesta en arquitectura aceptada.

## 7. Relación con el orden operativo de Harmonia

1. Primero cerrar los esenciales E2E del núcleo ChatGPT con CI interpretable, integración comprobada, validación del entorno y aceptación real.
2. Después formalizar esta propuesta mediante el FT de Metacanon y aprobar las decisiones abiertas.
3. Implementar ámbito por ámbito con pruebas de contrato e integración.
4. Solo al final de la aceptación funcional correspondiente, medir rendimiento y evaluar optimizaciones frente a una línea base sin pérdida de cobertura.

## 8. Estado de esta propuesta

Se publica en la rama revisable de Harmonia para discusión y trazabilidad. No se incorpora a `main` como diseño aprobado, no modifica el comportamiento de la extensión y no satisface el requisito de aceptación E2E.
