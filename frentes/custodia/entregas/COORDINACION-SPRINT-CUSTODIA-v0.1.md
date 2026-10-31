# Protocolo provisional de coordinación y continuidad del sprint Custodia

**Versión del objeto:** v0.1  
**Fecha de creación:** 2026-10-31 · 12:30 · America/Mexico_City  
**Estado:** PROVISIONAL · NO CANÓNICO · PERSISTENCIA DE CONTINUIDAD  
**Repositorio:** `SeryMente/khora` · rama `main`  
**Ubicación:** `frentes/custodia/entregas/COORDINACION-SPRINT-CUSTODIA-v0.1.md`  
**Frente objetivo:** CUSTODIA  
**Finalidad:** conservar el modelo de coordinación entre dos frentes, el alcance del sprint, las reglas de eficiencia, las dependencias, las solicitudes recursivas, las decisiones, los permisos y la evidencia necesaria para continuar desde una conversación nueva sin reconstruir el trabajo ni ampliar su alcance.

> Este documento es una ayuda provisional de coordinación, no un segundo OCP ni una fuente de estado canónico. No crea frente, titularidad, sesión, autorización, control, tarea ni folio. No modifica ni sustituye `frentes/custodia/OBJETO-CANONICO.md`, `CONTROL-RESPONSABILIDAD.json` ni `LISTA-TAREAS-PROVISIONAL.md`. El estado vigente continúa residiendo en el OCP de Custodia y sus evidencias enlazadas. Este archivo conserva únicamente la dinámica del sprint y una fotografía fechada de continuidad.

---

## 1. Objetivo único y definición de MVP

El sprint existe para desbloquear y resolver **las tres tareas ya activas del frente Custodia**:

1. **CUSTODIA-01:** recuperar y verificar todas las unidades que aparecen en Ingresos → Dictado → Recuperación.
2. **CUSTODIA-03:** localizar y determinar el estado real de las capturas esperadas que no aparecen, en especial el dictado comunicado como realizado después de la última entrada visible del 28-10-2026 a las 17:08, hora local.
3. **CUSTODIA-04:** corregir los defectos demostrados que afectan la recuperabilidad y probar el flujo integrado de extremo a extremo.

Las tres permanecen P0. CUSTODIA-02 está retirada del plan activo y su identificador no se reutiliza.

**MVP de este sprint:** la resolución mínima, suficiente y demostrable de los criterios de aceptación ya establecidos para CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04. MVP no significa rebajar sus criterios, aceptar recuperaciones incompletas ni declarar garantías no probadas. Significa no añadir capacidades, rediseños o documentación que no sean necesarios para cerrar esos criterios.

### 1.1 Resultado mínimo exigible por tarea

**CUSTODIA-01**
- Obtener, con identidad y autorización válidas, el catálogo completo de Recuperación y recorrer todas las páginas hasta `nextCursor=null`.
- Reconciliar las fuentes local y remota por identidad; eliminar duplicados sin ocultar una versión local más reciente.
- Clasificar cada unidad y cotejar sus partes/objetos.
- Ejecutar únicamente la recuperación autorizada para cada unidad; verificar el resultado mediante lectura de vuelta, contenido, audio cuando corresponda, integridad y procedencia, preservando el original.
- Una unidad no verificada permanece pendiente; no se compensa con conteos agregados.

**CUSTODIA-03**
- Buscar en las fuentes autorizadas: catálogo abierto paginado, registros de revisiones/checkpoints y capturas archivadas en Custodia.
- Distinguir hora del cliente, hora de recepción del servidor, identidad de sesión, propietario, revisión y evidencia de persistencia.
- Clasificar cada captura ausente: localizada y recuperable; localizada pero no recuperable; no localizada con búsqueda completa; o estado indeterminado por falta de fuente/permisos.
- No concluir pérdida definitiva por la ausencia en una pantalla, una página o un catálogo parcial. Si una fuente crítica no está disponible o el estado de una captura no puede demostrarse, la tarea permanece abierta para ese caso.

**CUSTODIA-04**
- Resolver los defectos demostrados de reconciliación, paginación, deduplicación, verificación física de Blob y tratamiento del corte de audio ausente/cero.
- R-09 debe comprobar el objeto físico: lectura de Blob, descifrado cuando corresponda, tamaño y SHA-256 recalculados, lectura de vuelta del destino y preservación de la fuente.
- R-10 debe preservar las partes de audio válidas cuando `corteAudio` no existe o `hastaParte=0`; clasificarlas como no sincronizadas cuando no pueda probarse alineación. Nunca fabricar sincronía ni descartar audio por un corte cero.
- Integrar solo una corrección vigente y revisada, con pruebas de regresión pertinentes y aceptación en el entorno autorizado.
- La certificación final depende de evidencia real de CUSTODIA-01 y CUSTODIA-03; pruebas sintéticas no sustituyen la recuperación productiva.

### 1.2 Fuera del objetivo

No se incorporan al sprint: rediseño general de Custodia, mejoras cosméticas, nuevas funciones de dictado, migraciones generales de proveedor, cambios de arquitectura sin defecto demostrado, nuevas tareas, nuevos OCP, cambios de metodología, investigación de otros frentes, mejoras generales de Khora MCP/Jules ni automatizaciones futuras. Solo podrán entrar si una evidencia demuestra que son imprescindibles para uno de los tres criterios de aceptación y el alcance/permiso correspondiente se autoriza.

---

## 2. Modelo de coordinación: dos frentes, un coordinador

El sprint contiene **dos frentes funcionales**. La conversación central integra y secuencia el trabajo, pero no constituye un tercer frente.

### 2.1 Frente habilitador: Khora MCP / Observabilidad MCP

Responsabilidad dentro de este sprint: habilitar, bajo autorización y contrato aceptado por el titular de Custodia, una vía de lectura autenticada, acotada y de solo lectura para obtener evidencia real de Custodia.

Herramientas previstas en la rama de trabajo:
- `khora_custodia_catalogo`: catálogo de metadatos con paginación y aislamiento por propietario.
- `khora_custodia_revisiones`: historial de revisiones/checkpoints, diferenciando marcas del cliente y recepción del servidor.
- `khora_custodia_verificar_integridad`: lectura física del Blob y comprobación actual de tamaño/hash, sin exponer bytes, audio, credenciales ni URL privada.

El frente habilitador no es dueño de los datos ni de las decisiones de política de Custodia. La existencia del código, schemas, mocks o pruebas locales no autoriza la conexión productiva ni implica aceptación del contrato. El dictamen del titular de Custodia es necesario sobre las decisiones de propiedad, identidad, snapshot, scopes, cifrado/legado, presupuesto, retención y privilegios efectivos.

**Límite:** estas herramientas tienen finalidad de lectura. No se transforman en autorización para INSERT, UPDATE, DELETE, migración de datos, reparación productiva, escritura de recuperación, eliminación de Blob, cambio de permisos o despliegue. Cada operación material requiere autorización específica y titularidad vigente.

### 2.2 Frente objetivo: Custodia

Responsabilidad dentro del sprint: definir los criterios de aceptación del frente, proteger sus datos y originales, dictaminar el contrato de lectura, utilizar las fuentes autorizadas cuando estén disponibles y determinar si las tres tareas quedan demostradas.

La responsabilidad documental observada pertenece a generación 5, alias operativo `chatgpt-custodia-INSTANCE-20261030-01A18F85`. El alias no es un identificador nativo de plataforma. El control autoriza responsabilidad documental y mantenimiento del OCP; **no autoriza por sí solo cambios de código de producto, credenciales, seguridad, proveedor, producción, despliegues ni recuperaciones**.

El trabajo de producto puede ser preparado o revisado, pero no ejecutado en nombre de Custodia sin la autorización específica que falte y sin verificar el control vigente.

### 2.3 Coordinador central

La conversación coordinadora:
- Mantiene el objetivo único, el registro de decisiones y las solicitudes pendientes.
- Recibe las respuestas de los dos frentes, comprueba su procedencia y contrasta cada afirmación con la evidencia.
- Determina el único siguiente paso que pueda desbloquear materialmente el sprint.
- Evita revisiones generales repetidas y no delega a un frente trabajo que pertenece al otro.
- Prepara prompts de trabajo para que el operador los reenvíe. No afirma que fueron enviados hasta que exista confirmación.
- No asume automáticamente la titularidad ni las autorizaciones de ninguno de los frentes.

### 2.4 Operador

El operador conserva la autoridad sobre prioridades, decisiones de producto, autorizaciones materiales, acceso a fuentes y aceptación final. El silencio, la preparación de un prompt o la respuesta técnica de otro modelo no sustituyen una autorización explícita.

---

## 3. Principios de eficiencia y avance a MVP

Se adoptan para este sprint las reglas operativas del objeto de coordinación OCP MCP y, en particular, la restricción del Principio Anti-Ineficiencia (PAI) del DUG: no iniciar, sostener, repetir o prolongar trabajo cuyo resultado no pueda cambiar materialmente la solución, la decisión o el cumplimiento de un control esencial; detener una vía cuyo costo previsible sea desproporcionado respecto de su aporte.

Reglas ejecutables:

1. **Bloqueo primero.** Cada intervención comienza identificando el bloqueo que impide cerrar una de las tres tareas. No empieza con una revisión general del proyecto.
2. **Una entrega concreta por turno.** Toda solicitud define un resultado verificable, la evidencia mínima y el criterio de aceptación. No pide «revisar todo» ni una nueva evaluación general.
3. **Iterar con causa.** Solo se repite una revisión cuando puede resolver una contradicción material, un bloqueo, una condición de autorización/seguridad/integridad o una prueba imprescindible.
4. **No repetir trabajo aprobado.** Una decisión aceptada no se reabre sin evidencia nueva de conflicto, inviabilidad o riesgo material. Una prueba ya ejecutada no se repite si el cambio no afecta su superficie.
5. **Pruebas focalizadas.** Se ejecuta primero la prueba más pequeña que discrimine el defecto o desbloqueo. La suite amplia se reserva para los gates de integración y aceptación que realmente correspondan.
6. **Sin perfeccionismo documental.** La documentación se limita a lo necesario para construir, decidir, auditar y migrar el contexto. Mejoras de presentación, abstracciones o exhaustividad marginal quedan fuera.
7. **No inflar el MVP.** No agregar herramientas, scopes, endpoints, funciones, automatizaciones ni tareas por conveniencia. La solución mínima debe satisfacer los criterios existentes.
8. **Una pregunta esencial.** Si falta un dato que impide avanzar, formular una sola pregunta concreta. No volver a preguntar algo que ya conste en el OCP, control, evidencia o conversación.
9. **Ciclos cortos.** Cada intervención debe cerrar una decisión, resolver un bloqueo, entregar evidencia o habilitar el siguiente paso. Si no produce uno de esos efectos, no se justifica continuar.
10. **Sin límite arbitrario de iteraciones.** La recursividad puede continuar mientras cada vuelta reduzca un bloqueo material. Se detiene la deliberación general al satisfacer los criterios y pasa a ejecución/aceptación; los asuntos secundarios quedan diferidos.

### 3.1 Clasificación de bloqueos

**P0:** ausencia de autorización o titularidad requerida; imposibilidad de autenticar o demostrar propiedad; lectura incompleta de catálogo/checkpoints; riesgo para originales; fallo de integridad; Blob no comprobable; ausencia de una corrección esencial; o falta de evidencia de recuperación/lectura de vuelta exigida por el criterio.

**No P0 por sí solos:** mejoras cosméticas, refactorizaciones sin defecto demostrado, soporte de más clientes, optimización prematura, documentación adicional no necesaria, telemetría ampliada o funcionalidades futuras que no alteren los tres criterios de aceptación.

Un bloqueo P0 se resuelve en su fuente. Un asunto no P0 no detiene la aceptación del MVP.

---

## 4. Protocolo recursivo de solicitudes y respuestas

### 4.1 Regla de espera

**No se prepara una segunda solicitud para un mismo frente mientras siga pendiente la respuesta a la última solicitud enviada/preparada para ese frente.** Primero se recibe la respuesta, se analiza, se registran sus decisiones y se determina si hace falta una única corrección focalizada.

Se procura mantener un solo turno activo de coordinación global. Si al migrar el hilo hay solicitudes pendientes a ambos frentes, primero se reciben y procesan esas respuestas; no se acumulan nuevos prompts.

Los prompts son instrucciones preparadas para que el operador las reenvíe. Su preparación no demuestra reenvío. El reenvío solo se registra como confirmado cuando el operador lo afirma o existe evidencia verificable.

### 4.2 Secuencia de cada vuelta

1. El coordinador selecciona el frente que controla el bloqueo actual.
2. Formula un único encargo, limitado a una entrega.
3. El encargo incluye el contexto mínimo, los archivos/commits a consultar, el resultado esperado y su criterio de aceptación.
4. El operador reenvía el prompt.
5. El frente ejecuta únicamente las acciones autorizadas y devuelve evidencia, límites y estado.
6. El coordinador contrasta la respuesta con las fuentes canónicas y la última decisión aceptada.
7. Si el bloqueo sigue abierto, prepara una corrección focalizada; si desapareció, pasa al siguiente bloqueo/tarea.
8. El prompt de retorno se entrega al operador para el siguiente turno; no se da por enviado automáticamente.

### 4.3 Contenido obligatorio de una respuesta de frente

Toda respuesta debe indicar:
- Resultado concreto de la intervención.
- Evidencia: rutas, SHA, commit, PR, pruebas, consulta, lectura de vuelta o registro pertinente.
- Qué se propuso, autorizó, intentó, ejecutó, verificó y aceptó, por separado.
- Qué no se pudo ejecutar y por qué.
- Bloqueo principal que permanece, si existe.
- Única siguiente acción mínima.
- Un **PROMPT DE RETORNO PARA EL COORDINADOR** listo para copiar, dirigido al frente que deba actuar después y limitado a esa acción.

El prompt de retorno no puede inventar autorizaciones, declarar hechos no probados ni ampliar el alcance. Si no existe siguiente acción material, debe declarar que no hace falta otro prompt.

### 4.4 Estados del intercambio

Usar únicamente los estados pertinentes:

- `NO_SOLICITADO`
- `PROMPT_PREPARADO`
- `REENVÍO_NO_VERIFICADO`
- `REENVÍO_CONFIRMADO`
- `RESPUESTA_PENDIENTE`
- `RESPUESTA_RECIBIDA`
- `EN_ANÁLISIS`
- `CORRECCIÓN_FOCALIZADA_PENDIENTE`
- `BLOQUEADO_P0`
- `CERRADO`

Una respuesta recibida no equivale a aceptación. Una prueba local no equivale a integración; integración no equivale a despliegue; despliegue no equivale a recuperación verificada.

---

## 5. Evidencia, seguridad y condiciones de aceptación

### 5.1 Escalera de evidencia

Registrar cada afirmación en el nivel más alto realmente probado:

1. Propuesta o diseño.
2. Código/contrato inspeccionado.
3. Prueba local unitaria o de integración sintética.
4. Build o CI efectivamente ejecutado.
5. Prueba del servicio real con identidad y permisos autorizados.
6. Lectura física del objeto/registro y verificación criptográfica.
7. Recuperación ejecutada sin alterar el original.
8. Lectura de vuelta del destino y cotejo de contenido, integridad y procedencia.
9. Aceptación explícita del titular/operador según el criterio correspondiente.

No elevar un nivel por inferencia.

### 5.2 Evidencia que no cierra tareas productivas

No bastan por sí solos: mocks, fixtures sintéticos, PGlite, tests unitarios, build local, `tools/list`, HTTP 200/401, metadatos OAuth, captura de pantalla, número de páginas consultadas de forma parcial, un estado histórico «verificado» o un manifiesto que declara partes.

Para CUSTODIA-01/03 se requiere información real, autorizada y reconciliada. Para afirmar integridad física se necesita leer el objeto y recalcular el hash. Para afirmar recuperación se necesita leer de vuelta el destino y verificar que el original permanece intacto.

### 5.3 Límites invariantes

- No acceder a cuentas, perfiles, sesiones, datos, tokens o credenciales ajenos.
- No eludir OAuth, controles del proveedor, permisos de repositorio ni límites de cuenta.
- No copiar transcripciones, audio, Base64, ciphertext, UUID reales de sesiones, cookies, tokens, claves o URLs privadas a GitHub o a respuestas.
- No inferir propiedad por nombre, correo, coincidencia parcial o contexto.
- No ejecutar escrituras de recuperación, migraciones, cambios de esquema, eliminación de objetos, cambios de privilegios o reparación productiva sin autorización específica.
- No fusionar ni desplegar PRs por el solo hecho de que las pruebas locales pasen.
- Preservar originales y trazabilidad; cualquier fallo debe terminar en estado explícito y recuperable, no en descarte silencioso.

---

## 6. Fotografía de continuidad al crear v0.1

Esta sección es una captura fechada. No reemplaza la consulta de fuentes actuales al reinstanciar. Si el repositorio o una PR cambian después de la fecha de creación, prevalece el estado remoto revalidado.

### 6.1 Custodia: estado de las tareas

| Tarea | Estado observado | Resultado pendiente |
|---|---|---|
| CUSTODIA-01 | EN CURSO · P0 | Catálogo autenticado completo; cotejo individual y recuperaciones verificadas. |
| CUSTODIA-03 | ABIERTA · P0 | Localizar o determinar el estado de las capturas ausentes, incluida la ventana posterior a 2026-10-28 17:08. |
| CUSTODIA-04 | EN CURSO · P0 | Correcciones aceptadas e integradas, pruebas pertinentes y recuperación de extremo a extremo en entorno autorizado. |

Estado productivo asentado en el OCP al corte leído: **0 unidades del catálogo productivo cotejadas y 0 recuperaciones productivas**. El dictado reportado como ausente continúa sin localizarse; su pérdida definitiva no está demostrada. Las garantías de producto no están certificadas.

### 6.2 Khora MCP: dependencia de lectura

- OCP de Khora MCP en rama `work/obs-mcp-custodia-tools-20261030-01a18dcb`: v0.3.11, blob `0ce709e2a5c37e9156b0879c2749da38e2d3f0de`.
- Control de ese frente: generación 4, blob `c0d7731bad4701f5d7e69235ae23ef0bdd039964`. Su autorización vigente cubre el alcance expresamente consignado en ese control; no se debe inferir de ella un permiso adicional para cambiar datos o tareas de Custodia.
- Revisión del contrato de lectura: `REVISION-TITULAR-CUSTODIA-LECTURA.md`, blob `40f4b33045900f81d74d902b18ef20231ad50b16`; estado **PREPARADO PARA REVISIÓN · NO ACEPTADO POR EL TITULAR**.
- Evidencia local informada por el OCP: 598/598 unitarias PASS y pruebas PGlite aisladas; fixtures sintéticos. Esto no acredita datos reales, Neon Production ni Blob Production.
- Migración 034 no aplicada a Neon Production en la evidencia consultada. OAuth real, rol efectivo de `KHORA_READONLY_DATABASE_URL`, conexión productiva, lectura real de Blob y aceptación del titular siguen pendientes.
- La rama es una dependencia de habilitación, no una autorización de lectura productiva por sí misma.

### 6.3 Propuestas de producto #339 y #340

Consulta actual de metadatos GitHub al 2026-10-31:
- PR **#339**: cerrada, no fusionada; head `cbb9efd89048daf3bd9f07cc69c2e6d7209aa55d`.
- PR **#340**: cerrada, no fusionada; head `e2ec67600885315fd4493911da89af1d4aafc297`.

La lista de tareas v0.11 todavía describe la #339 como abierta en borrador; esa descripción está desactualizada respecto del estado vivo de GitHub. No asumir que cualquiera de las dos PR está integrada o desplegada. Sus ramas, diffs y pruebas pueden utilizarse como antecedentes al preparar una corrección nueva, después de refrescar su estado y comparar con `main`.

En la PR #340 constan pruebas locales unitarias, PGlite, navegador y build aprobadas, pero la E2E completa quedó en 117 pass, 17 fail y 6 skipped. Sus resultados usan datos/Blob sintéticos. CI remoto no ejecutó pasos en los jobs informados; no hay verificación productiva ni recuperación real.

### 6.4 Solicitud recursiva anterior a Cora MSP

En el hilo previo se preparó un prompt focalizado para que Cora MSP desbloquee las tareas CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04 y genere un prompt de retorno al terminar cada unidad de trabajo. En la información disponible al crear este objeto **no consta confirmación de reenvío ni se ha incorporado una respuesta de Cora**.

Estado que debe conservarse hasta que el operador aporte la respuesta:
- Solicitud: `PROMPT_PREPARADO`.
- Reenvío: `REENVÍO_NO_VERIFICADO`.
- Respuesta: `RESPUESTA_PENDIENTE`.

No preparar otra solicitud acumulativa a Cora antes de recibir y analizar la respuesta a la última solicitud que realmente se haya reenviado.

---

## 7. Reinstanciación en un hilo fresco

La conversación nueva debe continuar el sprint, no redescubrirlo.

1. Leer el DUG vigente desde `SeryMente/metodologia/main`; comprobar versión, firma, SHA, precedencia y la regla Anti-Ineficiencia.
2. Leer este protocolo y tratar la sección 6 solo como fotografía histórica.
3. Leer el OCP, control y lista de tareas actuales de Custodia. Confirmar generación, titular, autorización y SHA antes de cualquier escritura.
4. Leer el OCP y control actuales de Khora MCP en la rama vigente, además de la revisión del contrato de lectura. Confirmar si el contrato fue aceptado y qué quedó realmente autorizado.
5. Refrescar rama, commit, PR, CI, deployment y evidencia del servicio. Nunca copiar sin comprobación estados históricos de este objeto.
6. Procesar primero la respuesta a la solicitud pendiente de Cora MSP, si el operador la aporta. Si no se ha recibido, conservar el estado pendiente y no emitir una solicitud duplicada.
7. Elegir el siguiente bloqueo P0 entre las dos dependencias. Solicitar al frente dueño una sola entrega focalizada.
8. Continuar con el menor número de iteraciones que permita demostrar los tres criterios de aceptación, sin debilitar controles ni rebajar evidencia.
9. No reconstruir ni reabrir decisiones que sigan vigentes. No volver a ejecutar pruebas que no hayan sido afectadas por el cambio.
10. Al cierre de cada ciclo, registrar únicamente delta: resultado, evidencia nueva, decisión, bloqueo restante y siguiente acción.

Si el control, la titularidad o la autorización no pueden verificarse, detener únicamente la operación protegida afectada y formular la pregunta mínima necesaria. No convertir la ausencia de autorización en una revisión general del proyecto.

---

## 8. Condición de cierre del sprint

El sprint se cierra cuando:

- CUSTODIA-01 cumple su criterio con inventario completo y resultados por unidad, con lectura de vuelta e integridad/procedencia comprobadas.
- CUSTODIA-03 determina el estado de las capturas esperadas con búsqueda autorizada y evidencia suficiente. Ninguna ausencia se convierte en pérdida definitiva por inferencia.
- CUSTODIA-04 tiene las correcciones materiales aceptadas, pruebas pertinentes aprobadas y evidencia integrada de recuperación real en el entorno autorizado.
- No quedan bloqueos P0 ni declaraciones de garantía superiores a la evidencia disponible.
- El operador acepta el resultado o señala el criterio preciso aún incumplido.

Los asuntos no esenciales se registran como trabajo posterior, no se incorporan retroactivamente al MVP. Si una dependencia externa impide demostrar un criterio, la tarea correspondiente permanece abierta y el bloqueo se declara; no se fabrica un cierre administrativo.

---

## 9. Fuentes observadas y procedencia

| Fuente | SHA/blob leído | Uso |
|---|---|---|
| [DUG · Samantha v373 · NX-373m](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html) | `cac4525de77d4f47a8a59c25201968ecf2056b90` | Precedencia, PAI, autorización y no-simulación. |
| [Coordinación Sprint OCP MCP v0.1](https://github.com/SeryMente/metodologia/blob/main/frentes/mcp-metodologia/entregas/COORDINACION-SPRINT-OCP-MCP-v0.1.md) | `32e4657db94155f2dfb1c13ab1082c243937efd0` | Modelo de coordinación, turnos seriales y foco MVP. |
| [Control de Custodia](https://github.com/SeryMente/khora/blob/main/frentes/custodia/CONTROL-RESPONSABILIDAD.json) | `1917f056e8fc084f2f6f023ebf73e167e8a41467` | Titularidad, generación 5 y límites de autorización. |
| [OCP Custodia](https://github.com/SeryMente/khora/blob/main/frentes/custodia/OBJETO-CANONICO.md) | `c4f715f0fd91905f5d380b5d3e8dbf677ce7b813` | Estado vivo y propósito del frente. |
| [Lista provisional de tareas](https://github.com/SeryMente/khora/blob/main/frentes/custodia/LISTA-TAREAS-PROVISIONAL.md) | `9bd90fb79ef767dfbe4214e35ace7150c34bc6bc` | Criterios de CUSTODIA-01/03/04. |
| [Incidente de dictado ausente](https://github.com/SeryMente/khora/blob/main/frentes/custodia/evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md) | `a59c32b54a9e44df2c8bc29ea30ba9d143a1a029` | Hipótesis y límites de evidencia del incidente. |
| [Contrato Custodia de dictados](https://github.com/SeryMente/khora/blob/main/khora-web/docs/CUSTODIA-DICTADOS.md) | `661706171cde293d740b7f3480a084fe7825d2d1` | Invariantes, persistencia, recuperación y pruebas. |
| [OCP Khora MCP](https://github.com/SeryMente/khora/blob/work/obs-mcp-custodia-tools-20261030-01a18dcb/docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md) | `0ce709e2a5c37e9156b0879c2749da38e2d3f0de` | Estado de la dependencia técnica de lectura. |
| [Control Khora MCP](https://github.com/SeryMente/khora/blob/work/obs-mcp-custodia-tools-20261030-01a18dcb/docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json) | `c0d7731bad4701f5d7e69235ae23ef0bdd039964` | Titularidad y alcance del frente habilitador. |
| [Revisión del titular de Custodia](https://github.com/SeryMente/khora/blob/work/obs-mcp-custodia-tools-20261030-01a18dcb/docs/frentes/observabilidad-mcp/REVISION-TITULAR-CUSTODIA-LECTURA.md) | `40f4b33045900f81d74d902b18ef20231ad50b16` | Dictamen contractual pendiente. |

Los SHA anteriores identifican las revisiones leídas al crear este objeto; no garantizan que sigan siendo las cabezas actuales.

---

## 10. Mantenimiento del objeto

Actualizar este protocolo solo cuando cambie un elemento de continuidad: respuesta recibida, prompt reenviado, decisión aceptada, autorización, estado de bloqueo, rama/PR relevante, evidencia nueva o cierre de tarea. Cada actualización debe conservar la procedencia y el estado anterior; no reescribir antecedentes como si hubieran ocurrido en la fecha nueva.

No usar este archivo como registro alternativo de tareas ni copiarlo entero al OCP. Mantener aquí la dinámica, los límites y el último estado suficiente para migrar el hilo. Los resultados y evidencias sustantivas se registran en sus fuentes correspondientes.

Al cerrar las tres tareas, registrar la aceptación y el estado final, y dejar el objeto como antecedente del sprint o archivarlo según instrucción del operador. **No canonizarlo automáticamente.**

---

**Regla de oro:** dos frentes, un coordinador, una solicitud activa por frente, cada iteración justificada por un bloqueo material, y ninguna declaración de cierre superior a la evidencia. Alcanzar el MVP de CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04 con el menor trabajo necesario, sin sacrificar autorización, integridad ni recuperación demostrable.


---

## 11. Actualización de continuidad y evaluación de recuperabilidad · 2026-10-31

> Esta sección añade el delta posterior a la fotografía inicial de §6. No reescribe el historial ni sustituye el OCP, el control o la lista de tareas. Los estados locales informados por otro frente se distinguen de los commits y lecturas efectivamente observados en GitHub.

### 11.1 Dictamen del titular de Custodia sobre el contrato MCP

**Estado: DICTAMEN TÉCNICO EMITIDO EN ESTA conversación; no equivale a autorización operativa productiva.**

| Área | Decisión emitida | Consecuencia que debe implementarse |
|---|---|---|
| Titularidad | ACEPTO CON MODIFICACIONES | `custodia_owner` canónico; no atribución automática por COALESCE; discrepancias/históricos sin procedencia quedan sin atribuir; el titular de sesión puede consultar checkpoints de esa sesión aunque el autor sea otro. |
| Identidad del actor | ACEPTO CON MODIFICACIONES | Igualdad exacta/sensible a mayúsculas sobre principal estable; JWT usa `sub`; token manual no accede a Custodia sin vinculación canónica demostrable. |
| Snapshot | RECHAZO | No descifrar `dictado_checkpoint.snapshot` para obtener manifiesto; crear manifiesto mínimo independiente; legado sin manifiesto = `LEGACY_UNAVAILABLE`. |
| Scopes | ACEPTO CON MODIFICACIONES | metadata usa `custodia:metadata:read`; integridad usa `custodia:integrity:verify`; retirar `norm:turn` solo de las tres herramientas Custodia. |
| KHC1/legacy | ACEPTO CON MODIFICACIONES | Audio nuevo KHC1; legacy solo con procedencia acreditada y estados separados de integridad/cifrado; sin procedencia = `UNVERIFIABLE`. |
| Presupuesto | ACEPTO CON MODIFICACIONES | Por página 32 MiB/45 s; acumulado por ejecución 512 MiB/12 min activos; máximo 30 min y 15 min de inactividad; estado server-side no reiniciable por cursor. |
| Retención | RECHAZO | No CASCADE para partes; RESTRICT/NO ACTION/tombstone; sin TTL/purgas; preservar originales, partes, checkpoints, derivados y Blob. |
| Rol efectivo | ACEPTO CON MODIFICACIONES | `khora_lector` NOLOGIN y solo SELECT mínimo; verificar `session_user`, `current_user`, membresías y privilegios efectivos; no conceder snapshot. |

Este dictamen orienta la implementación y no modifica por sí solo la política canónica ni la lista de tareas. Permanecen fuera de autorización: migración productiva, provisionamiento/cambio de roles o credenciales, lectura de registros reales, lectura física de Blob Production, recuperación, merge y deployment.

### 11.2 Rama limpia del frente Khora MCP: estado contrastado

- Rama reportada por el frente: `work/mcp-custodia-read-contract-20261031`.
- Base reportada: `4463009fdf8ebd7f5e6e0fd493dba93efa9868d6`.
- GitHub fue consultado después de recibir el reporte: la rama existe en remoto, pero su HEAD sigue en `4463009fdf8ebd7f5e6e0fd493dba93efa9868d6`.
- Comparación GitHub `main...work/mcp-custodia-read-contract-20261031`: `identical`, 0 ahead, 0 behind, 0 archivos cambiados.
- El frente informó modificaciones locales (borrador de migración 034 y helper `custodia-audio-manifest.ts`), pero no hay commit de implementación ni lectura remota que permita verificar esos archivos. Las modificaciones locales quedan **REPORTADAS · NO VERIFICADAS EN GITHUB**.
- El código lector, route, scopes, KHC1, guard, pruebas adaptadas, typecheck y build permanecen pendientes según el reporte recibido. No se informó prueba ejecutada con el nuevo contrato.
- Bloqueo material identificado: presupuesto acumulado entre páginas necesita estado server-side atómico; no puede escribirse mediante `KHORA_READONLY_DATABASE_URL`. No se debe fingir que una variable de proceso o cursor firmado satisface ese requisito. Investigar mecanismo de escritura existente con privilegio mínimo; si no existe, mantener ese bloque separado como bloqueado sin contaminar el lector.

**Siguiente entrega técnica prioritaria informada:** completar el manifiesto separado de extremo a extremo: escritores normal y recuperación dentro de la transacción del checkpoint, lectura MCP desde el manifiesto sin seleccionar/descifrar snapshot, permisos mínimos y pruebas. Al finalizar ese bloque, exigir commit publicado y read-back de GitHub antes de declararlo entregado.

### 11.3 Evidencia local previa relevante para la posibilidad de recuperación

El inventario `INVENTARIO-RECUPERABILIDAD-INGRESOS.md`, v0.9, blob `c14900bb0d594b3d07199de3963e341718f1677c`, conserva una auditoría anterior de una **copia de trabajo de IndexedDB** obtenida de un perfil Chrome distinto del perfil de mantenimiento. En esa copia se informó:

- 998 registros: 5 snapshots y 993 registros de audio independientes.
- 5 sesiones locales distintas con audio.
- Las 993 partes se descifraron con autenticación AES-GCM satisfactoria (993/993).
- Índices consecutivos 1…N, sin duplicados ni índices ausentes en los grupos examinados.
- 81.100.193 bytes de audio descifrado (aprox. 77,3 MiB).
- Los cinco snapshots tenían `audioPartes.length = 0`, a pesar de existir filas de audio independientes. Esto demuestra que el patrón de audio presente/manifiesto vacío existe en al menos esa copia.
- Las cinco concatenaciones se sometieron a prueba FFmpeg; la de 707 partes generó avisos de DTS no monótonas y requiere reconstrucción temporal específica. Otro grupo de 53 partes dio duración aproximada 4:29,45 frente a 4:30 declarados. Un grupo contenía audio con texto vacío.
- La copia no se modificó ni se subió durante aquella auditoría. Sus reconstrucciones temporales no constituyeron una recuperación oficial.

**Límites:** esa auditoría no emparejó las cinco sesiones con las unidades reales de la interfaz; no probó que las 20/21 unidades reportadas tengan el mismo patrón; no demuestra que los objetos Blob remotos sigan accesibles; tampoco certifica ahora que el perfil/copia local siga disponible. La correspondencia temporal aproximada con una unidad del 24-10-2026 no equivale a identidad demostrada.

### 11.4 Evaluación honesta de la recuperación total

- El número real de unidades visibles sigue sin adquirirse: 20 fue el reporte inicial y aproximadamente 21 una estimación posterior; ninguno es denominador verificado.
- Unidades productivas cotejadas individualmente: **0**.
- Objetos Blob Production leídos y comparados con SHA-256: **0** en la evidencia disponible.
- Recuperaciones productivas verificadas con lectura de vuelta: **0**.
- La diferencia 40→20 es compatible con los defectos de concatenación/deduplicación en hidratación local/remota y con un contador que cuenta elementos cargados, no el total global; no demuestra que las veinte entradas de diferencia sean pérdidas ni que todas sean duplicados.
- Hay evidencia favorable concreta de que existieron cinco sesiones locales con 993 fragmentos autenticables en una copia de IndexedDB y que el manifiesto vacío puede ocultar audio. Esto hace razonable investigar rescate de audio en esas unidades en lugar de asumir que falta.
- **No hay base para prometer que se recuperará todo el catálogo.** La posibilidad de recuperar la mayoría o incluso todas las unidades visibles es plausible, pero sigue sin cuantificarse por falta de inventario real y lectura física de objetos. Algunas pueden estar incompletas, tener objetos no disponibles, problemas temporales de decodificación o ausencia de fuente/clave.
- La captura denunciada después de 2026-10-28 17:08 continúa en estado **NO LOCALIZADA / NO DETERMINADA**. No se obtuvo el acuse remoto de checkpoint ni se verificó si IndexedDB sobrevivió al cierre/reinicio del perfil del cibercafé. No se ha demostrado pérdida definitiva.
- No convertir el estado histórico `verificado` ni el manifiesto, el contador o la fila DB en prueba de bytes actuales. La prueba requiere lectura física, descifrado cuando aplique, tamaño y SHA recalculados, reconstrucción/decodificación cuando corresponda, recuperación a destino separado y lectura de vuelta, conservando el origen.

### 11.5 Control de contexto para hilos frescos y tareas del operador

Al cierre de **cada ciclo**, el coordinador debe preguntarse y contestar explícitamente:

1. ¿Un hilo nuevo puede identificar el objetivo y las tareas activas CUSTODIA-01/03/04 sin depender de la conversación anterior?
2. ¿Están enlazados el OCP, control, lista provisional, inventario, informe de incidente, contrato de Dictado y coordinación sprint, con SHA/versión observados?
3. ¿Constan rama, HEAD base, HEAD actual, commits, PR y qué estado fue verificado remotamente frente a lo meramente reportado localmente?
4. ¿Constan decisiones del titular, autorizaciones operativas y límites que continúan pendientes?
5. ¿Están diferenciados datos reales verificados, pruebas sintéticas, hipótesis, evidencia local histórica y ausencia de evidencia?
6. ¿El bloqueo P0 actual y la única siguiente acción están escritos de forma ejecutable?
7. ¿Se distingue prompt preparado, reenviado, respuesta recibida, cambio ejecutado y cambio aceptado?
8. ¿La tarea del operador contiene el objetivo, enlaces a las fuentes de recuperación y la instrucción para releer/validar estado actual? Si no puede inspeccionarse la aplicación de tareas, consignar **TAREA PERSONAL NO VERIFICADA**; no afirmar que está actualizada.

**Resultado de esta comprobación al 2026-10-31:** los artefactos de GitHub permiten reconstruir el objetivo, las decisiones, los criterios de aceptación, los principales hallazgos y los límites. Sin embargo, la lista provisional v0.11 conserva estado obsoleto respecto de PR #339 (GitHub la muestra cerrada sin merge), y la fotografía inicial de este protocolo aún no contenía el dictamen ni la nueva rama. Esta actualización cierra esa brecha de continuidad en GitHub sin modificar el OCP, el control ni la lista de tareas.

**Tareas personales/Todoist:** no se inspeccionaron. La integración Todoist no está conectada en esta sesión; por tanto, no se afirma que el título o descripción de la tarea personal contenga ya estos enlaces/contextos. No copiar secretos, transcripciones, audio, UUID privados ni URLs privadas a la tarea.

**Paquete mínimo que debe abrir un hilo fresco:** DUG vigente; este protocolo (incluida esta sección); OCP + control + lista de tareas de Custodia; inventario + informe del incidente; contrato Custodia de Dictados; HEAD actual de `main` y rama MCP nueva; dictamen de §11.1; y una nueva lectura de GitHub para distinguir cambios publicados de cambios locales. Después, ejecutar solo la siguiente acción focalizada indicada en §11.2.

