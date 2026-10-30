# Observabilidad MCP y acciones autorizadas de Jules — Khora

## 1. Identidad y control
- Frente único: **Observabilidad MCP**; identidad canónica `OBSERVABILIDAD-MCP`.
- Repositorio: `SeryMente/khora`; OCP: `docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md`.
- OCP: **v0.2.0**. Control: generación 3, titular operativo conservado del control anterior.
- Las tareas provisionales «General» y «Jules» pertenecen a este mismo frente; no crean OCP, frente ni control paralelos.
- `MCP-OBS-DICTADO` permanece como identidad histórica del objeto agregado anterior, no como otro frente activo.

## 2. LEER PRIMERO
Leer README, DUG vigente, este OCP y `CONTROL-RESPONSABILIDAD.json`. La titularidad y alcance se determinan exclusivamente por el control vigente y sus autorizaciones expresas. No heredar autoridad de Dictado, Custodia ni otros frentes.

**Propósito original del operador (verbatim):**

> Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

**Procedencia:** conversación «DICTADO», adjunto `turn0file0`, registro inicial 2026-10-28 16:11:37, 41.447 bytes, SHA-256 `04390ddfd6b347cd7cc8afb31bde7aed7016055cac6cb1eb6fad74c0917c43c2`. La forma «MSP» se conserva literalmente.

**Interpretación operativa separada:** el repositorio denomina MCP al servidor/protocolo y herramientas de Khora; «MSP» se conserva en la cita original. El frente cubre el acceso de modelos/agentes autorizados a observabilidad y la integración controlada con Jules.

## 3. Referencia metodológica
- DUG consultado: **v364 · NX-364m**.
- Metacanon **1.26**; GOW **2.12** (valores declarados por la representación estructurada del DUG consultado).
- Fuente normativa: `SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`.
- MCP-NORMATIVO: **DESACTIVADO**. No debe confundirse con el servidor MCP de producto Khora.
- Ante cambios transversales, prevalece Metodología; las propuestas no son canónicas hasta incorporarse a su repositorio.

## 4. Propósito y alcance

**Propósito:** proporcionar un único servidor MCP de Khora para que clientes compatibles y autorizados consulten observabilidad y ejecuten acciones acotadas sobre Jules, con identidad, scopes, permisos por recurso, privacidad, trazabilidad y controles fail-closed.

### 4.1 Observabilidad — tarea provisional «General»
Incluye endpoint `/api/mcp`, catálogo/contratos, OAuth/Bearer, scopes y gates; consultas de runtime/eventos con filtros, cursores, paginación, aislamiento por sesión y saneamiento; interoperabilidad de clientes y pruebas. El caso inicial de consumo es el diagnóstico de Dictado, sin asumir autoridad para modificar su UX o sus datos.

### 4.2 Integración Jules — tarea provisional «Jules»
La implementación de esta intervención expone siete herramientas:
1. `jules_list_sources`
2. `jules_list_sessions`
3. `jules_get_session`
4. `jules_list_activities`
5. `jules_create_session`
6. `jules_send_message`
7. `jules_approve_plan`

Las cuatro primeras son de lectura y requieren `jules:read`; las tres últimas producen efectos en Jules y requieren `jules:write`. Todas las acciones protegidas por el contrato normativo deben aportar `norm:turn`. `tools/list` filtra las herramientas no autorizadas según los scopes concedidos: no basta con esconder controles en la interfaz.

El permiso se evalúa por combinación exacta de **subject + source + branch**, mediante `khora_private.jules_source_acl`. La ACL es fail-closed, sin permisos implícitos ni concesión global. `khora_lector` solo recibe `USAGE` de ese esquema y `SELECT` de la tabla; no recibe permisos DML. La concesión de filas ACL exige identidad OAuth confirmada, identificador real de fuente y rama, alcance aprobado y atribución verificable del otorgante.

La creación de sesión exige aprobación de plan y usa `AUTO_CREATE_PR`. La aprobación exige `plan_id` y `plan_sha256`, y relee sesión/actividades antes de actuar. Jules no ofrece una aprobación condicional atómica que elimine completamente la carrera entre comprobación y aprobación; el residual T22 queda documentado. No se oculta ni se presenta como garantía transaccional.

### 4.3 Entorno y uso con RDC
RDC puede operar en un equipo autorizado y ejecutar un cliente local que hable MCP, además de abrir/navegar la interfaz web disponible. Esto permite una vía operativa alternativa cuando el cliente ChatGPT no expone una capacidad. No modifica por sí mismo los permisos de la cuenta, no convierte una conexión MCP local en una integración nativa de ChatGPT y no debe usarse para extraer cookies, tokens de sesión o secretos del navegador.

La verificación de B debe distinguir:
- **Integración nativa ChatGPT:** solo se acepta si la interfaz y el plan de la cuenta permiten agregar y ejecutar este servidor MCP con los permisos requeridos.
- **Cliente MCP local operado mediante RDC:** alternativa legítima para invocar Khora desde un cliente compatible instalado/autorizado en el equipo; no equivale a que ChatGPT Free tenga herramientas MCP nativas.
- **Handoff manual ChatGPT ↔ cliente local:** viable como asistencia humana, pero no se etiqueta como integración ni ejecución autónoma de ChatGPT.

### 4.4 Exclusiones
No incluye la pantalla/micrófono, transcripción o reparación UX de Dictado; cambios al frente/ACL/datos de Custodia; creación de un segundo almacén autoritativo; exposición de audio, transcripciones, secretos o payloads sensibles; permisos globales; administración general de Jules; cambios de credenciales no aprobados; ni escrituras de base de datos fuera de la migración ACL y sus concesiones expresamente autorizadas.

## 5. Roles y colaboración
- Operador: propietario del propósito y de las autorizaciones de alcance.
- Titular operativo: el que consta en `CONTROL-RESPONSABILIDAD.json`, sujeto a su generación y vigencia; esta intervención continúa la misma titularidad, no crea otro titular.
- «General» y «Jules»: tareas provisionales dentro de este mismo frente.
- Dictado, Custodia y Harmonia: consumidores o frentes relacionados, nunca subordinados por esta definición.

## 6. Autoridad y autorización
La intervención inicial C044 solo creó el OCP sin titularidad. La generación 2 del control autorizó únicamente las tres herramientas read-only de Custodia y excluyó merge/despliegue/escrituras. Esa autorización histórica no se extiende retroactivamente.

El operador amplió expresamente el alcance en esta conversación el **2026-10-30**: autorizó incorporar Jules, herramientas de escritura, la migración ACL productiva y la publicación posterior, manteniendo separados los permisos de lectura y escritura. La autorización se materializa en la generación 3 del control. La migración aplicada se limita a crear la ACL y conceder `USAGE`/ `SELECT` a `khora_lector`; no inserta autorizaciones de fuentes.

La publicación de código queda sujeta a pruebas y a los pasos de integración descritos en el control. Esta autorización no permite eludir permisos de plataforma, usar credenciales de usuario fuera de su propósito, conceder ACL sin fuente/identidad confirmadas ni tocar datos ajenos a Jules.

## 7. Perfil de entorno verificado
- Repositorio: `SeryMente/khora`; base de trabajo: `main` verificado antes de crear la rama de intervención.
- Rama de implementación: `feat/mcp-jules-clean-main-20261030-r1`.
- Servidor MCP: `khora-web/app/api/mcp/route.ts`; contrato normativo: `khora-web/docs/normative-check.md`.
- Cliente Jules: `khora-web/lib/jules/client.ts`; control ACL: `khora-web/lib/server/jules-access.ts`.
- Proyecto Neon: `khora`; base `neondb`, PostgreSQL 17; rama `main`.
- `KHORA_READONLY_DATABASE_URL` y `JULES_API_KEY` constan como variables sensibles de Production en Vercel; sus valores no se leen ni se exponen.
- `khora_private.jules_source_acl` existe en Neon Production. La lectura de tabla con rol `khora_lector` fue comprobada; la tabla está vacía. No se ha verificado todavía que la URL secreta de Vercel se conecte efectivamente como ese rol.
- Vercel Preview compiló el commit final de la rama con estado READY. Los endpoints MCP/OAuth de Preview devolvieron 503 por configuración de OAuth solo en Production; no se duplicaron secretos en Preview.
- La URL Production existente responde en metadata OAuth, pero sigue sirviendo el código previo a la integración Jules mientras la rama no se integre.
- CI reportó jobs fallidos sin pasos ni logs de ejecución: no constituye prueba de suite ejecutada ni de tests fallidos.

## 8. Seguridad y privacidad
- Scopes de lectura y escritura separados, más `norm:turn` donde aplica.
- ACL por subject/source/branch; ausencia de grant implica denegación.
- Herramientas de escritura no deben anunciarse a clientes sin los scopes necesarios.
- No registrar ni devolver API keys, OAuth secrets, refresh tokens, cookies o payloads privados.
- Operaciones Jules POST no idempotentes no se reintentan automáticamente ante resultado ambiguo.
- La aprobación de plan conserva el riesgo residual T22 documentado.
- Las pruebas deben verificar rechazo sin ACL, lectura autorizada, denegación de escritura sin `jules:write` y exposición mínima en `tools/list`.

## 9. Aceptación
El frente solo se considera aceptado cuando:
1. El código de `main` coincide con el SHA de la implementación aprobada.
2. Migración y privilegios ACL se verifican en la base productiva; `KHORA_READONLY_DATABASE_URL` conecta como rol mínimo esperado.
3. Subject OAuth, fuentes Jules y ramas reales se identifican sin adivinar, y los grants aprobados se insertan y leen de vuelta.
4. OAuth metadata, scopes, `tools/list` y handlers concuerdan en Production.
5. Suite automatizada y tests de contrato pasan; CI incluye evidencia de ejecución real.
6. Un cliente MCP compatible se conecta y prueba lectura/escritura con autorización y denegación explícitas.
7. Se documentan los resultados y el cliente usado: ChatGPT nativo o cliente local por RDC, sin confundirlos.
8. Se verifica saneamiento de datos y se conserva el residual T22.

Estado actual: **IMPLEMENTACIÓN EN RAMA; ACL PRODUCTIVA APLICADA Y VACÍA; ACEPTACIÓN END-TO-END PENDIENTE**.

## 10. Formato de ciclo
Registrar titularidad/generación, DUG/Metacanon/GOW, SHA base y resultado, diferencia de rama, migración/read-back, tests, entorno y URL, identidad/scopes, aceptación, límites y siguiente acción. Distinguir propuesto, autorizado, intentado, ejecutado, verificado y aceptado.

## 11. Crónica
### C001 — creación documental — 2026-10-30
Se separó del OCP Dictado el objetivo de acceso MCP a registros. Se conserva el propósito original y su procedencia. C044 creó el OCP con control inicial sin titular; no se modificó producto en ese acto.

### C002 — titularidad y observabilidad inicial — 2026-10-30
Se adjudicó el control de generación 2 para tres herramientas Custodia de solo lectura y scopes especializados, con exclusión de merge y producción. Esta autorización quedó acotada y no autoriza por sí misma el trabajo Jules posterior.

### C003 — ampliación Jules y ACL — 2026-10-30
El operador autorizó ampliar el mismo frente para integrar siete herramientas Jules con scopes separados, ACL por subject/source/branch y posterior publicación. Se creó y probó la migración sobre una rama temporal Neon; el primer ensayo se canceló y eliminó. La versión ajustada se aplicó a Neon `main`: tabla ACL creada, solo `khora_lector` obtuvo `USAGE` y `SELECT`, read-back como ese rol correcto, 0 filas. No se han concedido grants de fuentes/ramas.

## 12. Reinstanciación
Continuar en el OCP y control únicos `docs/frentes/observabilidad-mcp/`. Leer el control generación vigente, comprobar SHA de `main`, rama/PR, estado de Neon/Vercel y evidencia de aceptación. No crear OCP paralelo para Jules ni asumir grant por defecto. No confundir uso de RDC con integración nativa ChatGPT.

## 13. Persistencia y revisión
Este documento en `main` es el objeto canónico único del frente. El control independiente reside en `CONTROL-RESPONSABILIDAD.json`. Las tareas provisionales General/Jules no tienen autoridad para crear objetos canónicos separados. La metodología general de `SeryMente/metodologia` prevalece en definiciones transversales.
