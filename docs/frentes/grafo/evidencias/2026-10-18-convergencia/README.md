# Reparación causal del grafo — candidato, no aceptación integral

## Lo demostrado en este expediente

- Identidades por ocurrencia contextual, no fusión por nombre repetido. Se proponen comparaciones dentro y entre fuentes; solo el juicio de identidad correspondiente autoriza la unión curada.
- Nuevos juicios ligados por huella al contenido/procedencia completos. Cambiar un identificador de transporte no borra su efecto; cambiar significado, tiempo, atribución o fuente impide heredar la aceptación. Juicios antiguos sin huella no reciben firmas retrospectivas ni se transfieren silenciosamente.
- Manifiesto causal: criterio 1.2 con enlace Git inmutable y SHA-256; generador, prompts, corpus/política, propuestas y ledger. Se distingue revisión lógica del conocimiento de la instancia UUID del snapshot.
- Migración 033: archivo cifrado exacto del último snapshot legado y cada instancia futura; conflicto de revisión y mutaciones rechazados. La escritura se bloquea si el trigger no existe. El ejecutor existente de migraciones incluye 033.
- Dependencias de asentamiento: una relación aceptada no recrea extremos rechazados, ausentes, sin juicio o de tipo incompatible. InformationObject de origen y literal terminal conservan casos positivos.
- Aceptación automática atribuida al sistema, nunca al actor ficticio «operador». Procedencia de decisiones almacenada en metadatos derivados; no se acredita autenticación humana en este helper.
- Política del agente existente recibe observaciones/evidencia/juicios operativos. fVAL recibe pregunta y sigue siendo global. Una palabra como «foto» no transforma un déficit textual en visual.
- La web no convierte «insuficiente» en verdadero ni declara una respuesta generada cuando el backend solo devolvió recuperación.
- El contrato TypeScript admite literal, como Python. Esto no acredita paridad exhaustiva de ambos validadores.

## Reproducibilidad

Desde `khora-web`, instalar dependencias del lockfile y ejecutar los tres archivos seleccionados con Node/tsx: `graph_twins.test.ts`, `graph_convergence.test.ts`, `graph-identity-refs.test.ts`. Para almacenamiento ejecutar `graph_history.integration.ts` con `KHORA_PGLITE_MODULE` apuntando a una instalación aislada de `@electric-sql/pglite` (versión fijada en el recibo de entorno). No requiere credenciales productivas.

Desde la raíz, ejecutar pytest sobre `kernel/tests/graph/test_convergence_guards.py` con `PYTHONPATH=kernel/src`. Proveedores y recuperación controlados; SQLite real temporal. La integración usa las funciones reales de almacenamiento/cifrado y migraciones reales; solo sustituye conexión/modelo configurado y bloqueo distribuido. No prueba concurrencia distribuida, semántica de un modelo real ni producción.

`manifest.json` liga el código exacto. Los resultados son de esta reparación, no los 545 tests de un release histórico. La comprobación de tipos fue dirigida a módulos del grafo/almacenamiento, no un typecheck de todo Next. El árbol local es reconstrucción parcial.

## Bloqueos no cerrados

1. Espina compartida PostgreSQL → núcleo EpisTwin/Neo4j: aún NO implementada/acreditada integralmente; publicación atómica de comunidades, resúmenes e índice bajo la misma revisión sigue pendiente.
2. Aislamiento de propietario y revisión en todos los consumidores del núcleo; no se habilita un puente por clave de servicio que mezcle propietarios.
3. Borrado coordinado/retención del historial junto a originales y derivados: requisito EpisTwin pendiente, BLOQUEA promover la migración 033. Append-only no autoriza retención contra una orden legítima de borrado.
4. Referencia semántica independiente y trece tareas reales de calidad. No se usan tests sintéticos como acreditación de Síntesis Existencial Accionable ni Ideación Asíncrona Recuperable.
5. Suite y build completos, integración real y despliegue de ambas aplicaciones. Autenticación/credenciales productivas no disponibles por el canal GitHub; antecedentes de comprobaciones bloqueadas por facturación no equivalen a aprobadas.

La autoridad recibida permite construir, pero no fingir esos cierres. No se fusiona este candidato ni se ejecuta su migración mientras subsistan estas compuertas. La producción y las fuentes originales no se tocaron.
