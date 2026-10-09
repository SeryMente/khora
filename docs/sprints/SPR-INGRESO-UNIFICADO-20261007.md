---
id: KHORA-SPRINT-INGRESO-UNIFICADO-20261007
tipo: sprint
version: v0.5.0
estado: IMPLEMENTACION_SELECTIVA_EN_RAMA__PR_291_ABIERTO__CI_REMOTO_SIN_EJECUCION_UTIL__ING_DIRECT_01_PRODUCCION_PENDIENTE
fecha: 2026-10-09
repositorio_canonico: https://github.com/SeryMente/khora
ruta_canonica: docs/sprints/SPR-INGRESO-UNIFICADO-20261007.md
rama: fix/ingreso-volcados-ingesta-functional-20261009
pull_request: https://github.com/SeryMente/khora/pull/291
base_sha: b94e05f7a3f8e8bb3d48bf635054fd3b44702c4c
owner: KHORA
---

# Sprint KHORA · Ingreso → Volcados · Especificación canónica

**Estado del objeto:** CANÓNICO PARA ESTE SPRINT · v0.5.0 IMPLEMENTACIÓN FUNCIONAL SELECTIVA PUBLICADA EN RAMA · FUSIÓN PENDIENTE · CERTIFICACIÓN DE PRODUCCIÓN BLOQUEADA.  
**Regla de autoridad:** la sección 1 conserva literalmente la especificación aportada por el usuario y es la fuente normativa de intención del sprint. Las decisiones, los criterios de aceptación y el registro técnico de las secciones posteriores son traducciones operativas subordinadas; no pueden alterar ni sustituir el bloque verbatim.  
**Historial:** v0.5.0 aplica la especificación VERBATIM al código de Ingreso, Volcados e Ingesta, suma correcciones de custodia, metadatos, sesión sellada y terna idempotente, y distingue la implementación publicada de la certificación de producción todavía pendiente. v0.4.0 incorpora una segunda pasada independiente por hubs y fuentes normativas de Notion, precisa la pregunta funcional y diferencia intención resuelta de cierre documental/funcional pendiente. v0.3.0 registró la primera auditoría; v0.2.0 sustituyó la interpretación de v0.1.0 que trataba Revisión e Ingesta como modos internos de Ingreso. Se conserva el identificador del objeto para mantener una única ruta canónica y continuidad de trazabilidad.

## 0. Cápsula de recuperación

- **Objetivo:** consolidar Ingreso como superficie de captura y colocar Volcados inmediatamente a su derecha como siguiente dominio del flujo de datos.
- **Secuencia funcional:** `Ingreso → Volcados → revisión/ratificación → ingesta → Núcleo`.
- **Rama de implementación histórica:** `refactor/ingreso-volcados-consolidacion-20261008` (PR #290, sustituida por la rama selectiva).
- **Rama de integración actual:** `fix/ingreso-volcados-ingesta-functional-20261009`.
- **PR actual:** [#291 · fix(audio): close custody and ingestion gaps end to end](https://github.com/SeryMente/khora/pull/291).
- **Estado real vigente:** cambios de código publicados y PR pendiente de merge; no hay certificación integral de CI ni de `ING-DIRECT-01` en producción. No afirmar que se ejecutaron tests locales en esta instancia.
- **No confundir:** que el build local y las pruebas dirigidas pasen no demuestra que el sprint ya esté integrado en `main`, publicado en producción o certificado por la suite E2E completa.

## 1. Especificación canónica del usuario — VERBATIM

El contenido del siguiente bloque es una transcripción literal de la especificación original. No corregir ortografía, puntuación, mayúsculas, repeticiones ni errores de transcripción dentro de este bloque.

```text
Bueno, entonces, qué bueno, al parecer la limitación era tentativa. Así déjalo, está bien. Ahora estoy viendo la actualización del interfaz de usuario en ingreso, sigo viendo en la parte de arriba entrada, dictado, captura, archivo, revisión, ingesta. Este, entrada y dictado pueden fundirse, captura también. De hecho si le hago clic a las tres no cambia nada en la interfaz, parece ser como que es la misma. Archivo también no funciona. Luego revisión manda a una funcionalidad que me permite editar las transcripciones, pero si me voy a volcado, tengo el modo edición, que serviría para lo mismo. Entonces, y además revisión no forma parte de ingreso, eso forma parte de volcado. Por cierto, en los menús principales ingreso debe ir a la izquierda y volcado debe ir a la derecha de ingreso porque es posterior en la secuencia que siguen los datos. y luego ingesta, que es un menú que tengo todavía en ingreso. Yo creo que hace relación al procedimiento de ingesta.   
   
Por cierto ya quedo listro esto?
```

## 2. Decisión canónica derivada

Estas reglas son criterios operativos derivados del texto anterior, no una reescritura del mismo:

1. **Ingreso** es la superficie primaria de captura. Entrada, Dictado y Captura no deben aparecer como modos o pestañas de navegación independientes cuando sus controles no producen una diferencia observable en el workspace.
2. **Archivo** tampoco debe permanecer como pestaña/modo de navegación independiente. La capacidad concreta de importar o adjuntar archivos solo puede darse por operativa cuando exista evidencia específica de que funciona; la especificación original declara que el control visible de Archivo no funciona.
3. **Volcados** es la siguiente superficie primaria, inmediatamente a la derecha de Ingreso. La secuencia de los datos determina el orden de la navegación.
4. **Revisión y edición** pertenecen a Volcados. No deben duplicarse en un modo de Ingreso si Volcados ya ofrece la funcionalidad equivalente para las transcripciones.
5. **Ingesta** es una operación downstream del procedimiento de incorporación. No es un modo de navegación dentro de Ingreso ni un dominio primario independiente. Su ejecución debe permanecer ligada al volcado y a la versión aprobada según el contrato existente.
6. Los aliases históricos pueden seguir resolviendo por compatibilidad, pero no deben hacer reaparecer las superficies eliminadas ni conservar los antiguos modos como destinos canónicos.
7. La eliminación de una pestaña redundante no autoriza a eliminar capacidades útiles de captura, custodia de audio, transcripción, revisión, aprobación o ingesta que sigan teniendo un lugar válido en el flujo.

## 3. Navegación y flujo canónicos

### 3.1 Navegación primaria — orden obligatorio

`Ingreso → Volcados → Grafo → Consulta → Seguridad → Sistema`

- **Ingreso:** `/sistema/ingreso`
- **Volcados:** `/sistema/volcados`

Ingreso debe ser el primer dominio primario. Volcados debe ser el segundo y aparecer inmediatamente a su derecha.

### 3.2 Responsabilidades por dominio

| Dominio/fase | Responsabilidad canónica |
|---|---|
| Ingreso | Captura por los mecanismos de entrada disponibles, sin forzar una elección entre modos equivalentes. |
| Volcados | Archivo de entradas capturadas, selección de un volcado, revisión y edición de transcripciones, historial/versiones y aprobación. |
| Ingesta | Operación posterior aplicada a una versión aprobada de un volcado; no es una superficie primaria independiente. |
| Núcleo | Destino posterior de la secuencia de incorporación. |

### 3.3 Compatibilidad de rutas

- `/capturar` → `/sistema/ingreso`
- `/sistema/dictado` → `/sistema/ingreso`
- `/sistema/editar` → `/sistema/volcados`
- `/sistema/ingesta` → `/sistema/volcados`

La redirección de un alias es compatibilidad técnica, no autorización para preservar una pestaña o modo redundante.

## 4. Límites y contratos preservados

- Mantener los mecanismos útiles de captura existentes en Ingreso.
- Mantener el flujo de revisión, edición, versionado y aprobación en Volcados.
- Preservar el contrato downstream de `/api/ingesta`: el flujo canónico utiliza `volcado_id`, `version` aprobada y la trazabilidad/hash exigidos por el backend.
- No restaurar una vía lateral de ingesta directa a partir de texto o archivo que eluda el volcado aprobado.
- No cambiar el contrato persistente de las APIs salvo necesidad demostrada y tratada como cambio independiente.
- No declarar que la importación de archivos está resuelta solamente porque se haya eliminado su pestaña; requiere verificación específica del mecanismo funcional que permanezca disponible.

## 5. Criterios de aceptación

- [x] El registro de navegación coloca `ingreso` primero y `volcados` segundo.
- [x] Ingreso ya no presenta la navegación interna «Modos de Ingreso».
- [x] Revisión e ingesta dejan de ser modos de navegación dentro de Ingreso.
- [x] Los aliases históricos redirigen a sus superficies canónicas.
- [x] El contrato de ingesta posterior a aprobación se conserva.
- [x] Typecheck, contrato de navegación, pruebas unitarias y build local pasan en el estado registrado en la sección 6.
- [ ] Reejecutar y cerrar la suite E2E global; no declarar certificación total mientras exista cualquier fallo sin clasificar.
- [ ] Verificar de forma específica la capacidad funcional de archivo/importación, porque la especificación original informa que el control Archivo no funcionaba.
- [ ] Integrar el PR en `main` conforme al proceso normal del repositorio.
- [ ] Verificar publicación/entorno compartido tras integración cuando la vía de despliegue legítima esté disponible.

Una casilla marcada solo acredita la evidencia citada en la sección 6. No implica que los criterios pendientes estén satisfechos.

## 6. Registro de implementación y pruebas

### 6.1 Implementación registrada

- `khora-web/app/navigation/registry.ts`: orden canónico y aliases.
- `khora-web/app/components/ingreso/IngresoWorkspace.tsx`: una sola superficie de captura, sin ramas de modo Revisión/Ingesta.
- `khora-web/app/components/shared/IngresoView.tsx`: etiqueta y descripción canónicas de Ingreso.
- Rutas históricas `/capturar`, `/sistema/dictado`, `/sistema/editar` y `/sistema/ingesta`: convertidas en redirects.
- Componentes redundantes `IngresoModeNav`, `IngresoRevisionPanel` e `IngresoIngestaPanel`: eliminados del árbol activo.
- `khora-web/docs/system-navigation.md`: flujo y semántica de navegación actualizados.
- `PipelineView` y el contrato backend de `/api/ingesta`: conservados.

### 6.2 Gates locales registrados como satisfactorios

| Gate | Resultado registrado | Alcance |
|---|---|---|
| `npm.cmd run typecheck` | PASS | TypeScript |
| `npm.cmd run ui:contract` | PASS | Jerarquía, cobertura, enlaces, aliases y rutas |
| `npm.cmd run test:unit` | PASS | 328 pruebas unitarias |
| `npm.cmd run build` con `AUTH_SECRET` local de sesión | PASS | Build de producción local |
| `e2e/shell-v2.spec.ts` en modo producción local | PASS · 3/3 | Navegación primaria y menús |
| `e2e/ui-quality.spec.ts` filtrado a orden y aliases | PASS · 4/4 | Escritorio/móvil, jerarquía y compatibilidad |
| `e2e/contracts/ingreso.spec.ts` y `dictado.spec.ts` | PASS · 2/2 | Contrato UI de Ingreso/Dictado |

### 6.3 Pruebas globales pendientes y límites de evidencia

- La suite completa de `e2e/ui-quality.spec.ts` no se ha vuelto a ejecutar después de la corrección de hidratación y apertura de menús.
- Una ejecución global anterior registró **7 fallos y 10 aprobaciones** antes de la corrección; entre las causas identificadas estaba `/ui-review/estatico` devolviendo 404. No debe presentarse ese resultado como una suite completa satisfactoria.
- Las validaciones dirigidas posteriores sí pasaron, pero no reemplazan la ejecución global.
- Los endpoints de API que requieren sesión devolvieron 401 en una comprobación local sin sesión; la página Volcados renderizó y manejó la lista no disponible. No se modificó la autenticación para ocultar este límite.
- Los proveedores de preview del PR informaron una restricción de plan para repositorio privado de organización. Esto limita el preview externo; no invalida por sí mismo el build local.

## 7. Fases y referencias canónicas del repositorio

### Fase A · Canonización de la especificación
- Objeto de sprint: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/docs/sprints/SPR-INGRESO-UNIFICADO-20261007.md
- PR de implementación: https://github.com/SeryMente/khora/pull/290

### Fase B · Navegación primaria y aliases
- Registro: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/app/navigation/registry.ts
- Contrato automatizado: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/scripts/check_navigation_contract.ts
- Pruebas unitarias: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/tests/unit/system_navigation_hardened.test.ts

### Fase C · Workspace de captura
- Workspace: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/app/components/ingreso/IngresoWorkspace.tsx
- Vista compartida: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/app/components/shared/IngresoView.tsx

### Fase D · Contrato de Volcados e Ingesta
- Superficie de Volcados: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/app/components/shared/PipelineView.tsx
- Endpoint de ingesta: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/app/api/ingesta/route.ts

### Fase E · Navegación documentada y certificación
- Documento de navegación: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/docs/system-navigation.md
- E2E de navegación: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/e2e/shell-v2.spec.ts
- Calidad UI: https://github.com/SeryMente/khora/blob/refactor/ingreso-volcados-consolidacion-20261008/khora-web/e2e/ui-quality.spec.ts

## 8. Historial de decisiones del objeto

- **v0.1.0 · Interpretación inicial (supersedida):** planteaba una sola interfaz de Ingreso con modos internos para Revisión e Ingesta.
- **v0.2.0 · Especificación canónica verbatim:** Ingreso queda como captura; Volcados recibe revisión/edición y la secuencia posterior.
- **v0.3.0 · Auditoría documental:** agrega las fuentes de Notion inspeccionadas, las contradicciones, los límites de frescura/completitud y los bloqueos funcionales/operativos que impiden declarar el sprint cerrado.

No se debe reactivar una decisión de v0.1.0 sin una nueva instrucción explícita del usuario y una versión posterior del objeto canónico.


## 9. Auditoría documental de Notion — corte 2026-10-08

### 9.1. Alcance y límite de la auditoría

Se contrastaron las fuentes identificables directamente relacionadas con intención, UX, arquitectura de interfaz, ciclo de captura/archivo/revisión/ingesta, contratos de audio, gobernanza de cambios, ejecución Jules y estado del tablero. No se revisó cada página ajena a KHORA del workspace completo. Por tanto, esta auditoría **no debe describirse como una lectura literal de todo Notion**.

La integración de Notion entrega las páginas consultadas con corte de recuperación **2026-09-24** y las fuentes clave devuelven `verification.state = unverified`. UI-00 y MDC indican contenido truncado/bloques desconocidos. Dos bloques desconocidos de UI-00 se resolvieron como páginas vacías; un bloque desconocido de MDC y cuatro de Manual siguen sin poder confirmarse por completo. No se encontró una página de Notion posterior a la especificación del usuario del 2026-10-08 que reconciliara ya estos cambios. El bloque verbatim de la sección 1 es la instrucción más reciente para el sprint; no convierte automáticamente todas las fuentes de Notion en reconciliadas.

### 9.2. Fuentes inspeccionadas

| Fuente | Función en la auditoría | Hallazgo principal |
|---|---|---|
| [Plan Maestro · Khora](https://app.notion.com/p/ab55d4a3b25082d78925013d58c8e272) | Constitución global declarada por Notion | Dice que es la fuente única, pero su cierre corresponde a junio y remite las decisiones vivas al Roadmap/documentos subordinados. |
| [Flujo de Trabajo Canónico · Khora OS v1.0](https://app.notion.com/p/07f5d4a3b25082db88d381e888e01dc2) | Gobernanza de diseño→construcción→verificación | Las decisiones de producto/arquitectura nacen en Notion y se sellan antes de construir; merge/despliegue no equivale a prueba real de uso. |
| [Arquitectura de Interfaz v0.9→v0.9.1](https://app.notion.com/p/4575d4a3b25082a3aff801167a1d60f1) | Fuente principal de superficies y compuertas UI | Distingue Captura de Archivo; coloca revisión/ratificación en Archivo; exige no retirar `/sistema/editar` antes del PASS de `ING-DIRECT-01` en producción. Sus secciones 51–55 declaran precedencia operativa sobre secciones históricas. |
| [Diseño UX · Khora](https://app.notion.com/p/d035d4a3b250830394ac81be550b264a) y [Principios de UI](https://app.notion.com/p/29b5d4a3b25083379bfb811ad64265d2) | Principios de interacción | Captura de baja fricción; escribir/hablar/pegar sin pedir clasificación o pasos innecesarios. “Captura/Consulta/Acción” son modos macro del sistema, no pestañas de Ingreso. |
| [UI-00 · Diseño Inicial](https://app.notion.com/p/2d75d4a3b2508211bcf90186517310b7) | Canon UX histórico relacionado | Tiene Cero Variación y problemas de completitud del fetch; no se toma como prueba de estado actual de código. |
| [Contrato Visual · Khora v1](https://app.notion.com/p/d815d4a3b25082a28ef4814e7836b030) | Restricciones visuales | Prohíbe reinterpretar tokens en superficies sujetas a Cero Variación; no resuelve por sí solo el flujo funcional ni las rutas. |
| [L0-003 · Protocolo de Ingesta](https://app.notion.com/p/b385d4a3b25082fbb838011f2fc71bf9) | Contrato de captura/versionado/ratificación/ingesta | El original, las versiones, audio y juicios deben conservarse; ingesta debe usar una versión exacta aprobada con `volcado_id + version + sha256`; escritura solo después de ratificación. |
| [IAR · Planeación provisional consolidada, corte 2026-09-04](https://app.notion.com/p/f375d4a3b25083aa818c0173bcf85e78) | Estado de continuidad de producto | Incluye como pendientes priorizados importar/adjuntar audio y exportarlo directamente desde Ingreso; CAP-1R/CAP-2R no quedan acreditadas como pruebas funcionales completadas. |
| [DOC-09 · Cierre 0.9 DevBeta](https://app.notion.com/p/0895d4a3b25082d58b268116b2a74006) y [VCU · Ventana de Contexto](https://app.notion.com/p/6955d4a3b2508373ab8c01dccce1f601) | Contexto de implementación anterior | Recogen evidencia histórica de dictado, versionado y aprobación, pero ordenan revalidar el repositorio/producción actual; no sustituyen las pruebas del PR vigente. |
| [Paquete Jules v0.8](https://app.notion.com/p/ec85d4a3b25082a1a5c001ca37140a9b), [PROMPT MASIVO v0.6](https://app.notion.com/p/5ca5d4a3b25083b992b301039ccc5c0f) y [handoff del estado Jules](https://app.notion.com/p/2975d4a3b25082bba7b381f46fe27d1f) | Historial operativo y barreras de retiro | J-12 no cuenta con un reporte inequívoco de cierre; la regla conservadora de la arquitectura vuelve a exigir la prueba fresca en producción. Una afirmación de cierre en un prompt antiguo no sustituye evidencia de ejecución. |
| [FIX-DICTADO · Guardia anti-regresión](https://app.notion.com/p/f0e5d4a3b2508386b6ac817a6b9a6d36) y [handoff FIX-DICTADO](https://app.notion.com/p/e3d5d4a3b25082d096a701ed334e76ab) | Preservación del dictado | El arreglo de voz se probó en local en agosto; la guardia que corre con el gate seguía pendiente/por hacer y sin prueba real registrada. Un contrato UI que solo verifica layout no cubre micrófono real/simulado. |
| [G-2 · Exportar/importar](https://app.notion.com/p/5af5d4a3b2508359952801aa40ce23b9) | Integridad de exportación general | PR marcado fusionado, pero la prueba export→import→consulta seguía sin marcar como evidencia; no se toma “Fusionado” como prueba funcional. |
| [Especificación Ejecutable S0](https://app.notion.com/p/4db5d4a3b25082e8a1a201d6cbe81398), [Hitos/Secuencia/Integridad](https://app.notion.com/p/96d5d4a3b25082d9b08401d6cb6c2d51) y [Estándar de oro PWA](https://app.notion.com/p/d965d4a3b25082d7a5b8813d77a76825) | Contratos de construcción y confiabilidad | Capturar, guardar y demostrar una prueba real prevalece sobre declarar la función construida; estos documentos son más generales/antiguos que el sprint actual. |
| [Canon LISA](https://app.notion.com/p/b355d4a3b25083bebf9e01810ddd0c39), [MDC](https://app.notion.com/p/6d05d4a3b25083759039810eca12b894) y [PCA](https://app.notion.com/p/86d5d4a3b250824ca37c01ed73a0472e) | Gobierno de intención y canonización | Distinguen intención del usuario, derivaciones técnicas y ratificación; la codificación de este sprint en GitHub no demuestra por sí sola que el canon de interfaz de Notion haya sido actualizado o reconciliado. |
| [🎙️ Volcados · Khora](https://app.notion.com/p/bcf5d4a3b2508382b61b014a8922e604) y [Roadmap · Khora](https://app.notion.com/p/d835d4a3b25083419c27012a1e6dffe4) | Modelo de archivo y estado operativo | El modelo de Volcados conserva estado de ingesta, audio, partes, `io_id`, `version`, `volcado_id` y `sha256`; la tarjeta FIX-DICTADO figura `Por hacer` y sin prueba real registrada. |
| [Capa de Integración · Khora](https://app.notion.com/p/87b5d4a3b25083b3a1f381c04ad9860c) | Contexto de arquitectura general | Documento amplio y previo; manda Plan Maestro en caso de conflicto y no contiene una decisión más nueva que la especificación de este sprint. |

### 9.3. Reconciliación: lo que el conjunto de fuentes permite afirmar

1. **Fusión de pestañas:** la nueva instrucción elimina la redundancia de Entrada/Dictado/Captura como pestañas de Ingreso. Eso no equivale a borrar mecanismos subyacentes de dictado, audio, captura de Chrome o archivo.
2. **Archivo como pestaña:** que la pestaña visible “Archivo” no funcione no demuestra que la importación de audio deba desaparecer. En la rama hay un botón “Adjuntar audio” conectado a `importAndTranscribeAudio`; el flujo existe en código, pero requiere prueba funcional sin pérdida.
3. **Exportación de audio:** el actual `IngresoView` no expone un botón “Exportar audio”. `/sistema/volcados` sí contiene una acción de exportación MP3. La planeación IAR de septiembre pedía exportar directamente desde Ingreso; esa parte no se considera satisfecha por el cambio actual.
4. **Revisión/edición:** tanto la instrucción del usuario como la arquitectura de Notion colocan revisión/edición en Volcados/Archivo. La implementación conserva `PipelineView`, con edición/versiones, aprobación y la operación “Ingerir versión aprobada”.
5. **Ingesta:** L0-003 confirma el modelo downstream de versión aprobada + tupla de procedencia. Es razonable tratarla como procedimiento y no como pestaña de Ingreso; la frase del usuario “Yo creo que…” por sí sola era tentativa, así que esta lectura se registra como **inferencia corroborada por L0-003**, no como cita literal del usuario.
6. **Compuerta de `/sistema/editar`:** la arquitectura operativa exige conservar la ruta hasta que `ING-DIRECT-01` pase en producción con una tupla nueva y repetida y demuestre idempotencia/no cambio del objeto. El handoff J-12 no acredita un cierre inequívoco y el estado remoto actual no demuestra ese PASS. La rama, sin embargo, redirige ya `/sistema/editar` a `/sistema/volcados`; por tanto este criterio **no está satisfecho** frente al canon de Notion. La instrucción de colocar revisión en Volcados no demuestra por sí sola que la compuerta de retiro ya pasó.
7. **Prueba requerida ausente:** `khora-web/e2e/capability-baseline.spec.ts`, nombrada por el paquete/manifest histórico como parte de esa batería, no se encuentra en la rama ni en `main` en la inspección efectuada. La comprobación visual de botones no sustituye `ING-DIRECT-01`.
8. **Estado remoto:** el último commit auditado tiene los workflows `CI`, `UI Quality` y `khora-ok / gate` en fallo; los estados de preview Vercel/Netlify fallan además por las restricciones de plan del repositorio privado. No hay merge ni certificación integral.
9. **Reconciliación documental:** el texto verbatim es la autoridad de intención de este sprint y su nueva orden de navegación debe reflejarse en la implementación. A fecha de esta auditoría, el canon de arquitectura/UI de Notion continúa en su snapshot anterior y no está reconciliado con ese texto; no se debe afirmar una armonización global del workspace.

### 9.4. Bloqueos de cierre añadidos por la auditoría

- [ ] Ejecutar `ING-DIRECT-01` en producción desde la versión realmente abierta; comprobar la tupla `volcado_id + version + sha256`, respuesta real, repetición de la misma tupla y ausencia de cambios adicionales.
- [ ] Mantener/resolver explícitamente la compuerta de `/sistema/editar`; no dar por cumplido el criterio de retiro con una redirección prematura.
- [ ] Verificar importación/adjunto de audio desde Ingreso de extremo a extremo, incluido fallo de transcripción sin pérdida de audio.
- [ ] Implementar y probar exportación de audio directamente desde Ingreso conforme al corte IAR, o registrarla como diferida por decisión explícita; no considerarla satisfecha porque exista exportación en Volcados.
- [ ] Cerrar la guardia anti-regresión del micrófono/dictado en el gate correspondiente.
- [ ] Ejecutar una suite E2E global sin fallos sin clasificar, repetir los checks del commit final y luego integrar el PR.
- [ ] Reconciliar el canon de Notion con esta especificación nueva mediante el proceso de diseño correspondiente, si se pretende afirmar que Notion y el repo comparten ya la misma arquitectura vigente.

### 9.5. Veredicto de auditoría documental

**Resultado: IMPLEMENTACIÓN PARCIAL; CIERRE BLOQUEADO.** El orden primario y la eliminación de pestañas redundantes están implementados y las pruebas locales dirigidas registradas pasaron. No queda demostrado que se haya preservado/certificado el contrato completo de capacidades de audio ni que haya pasado la compuerta de retiro de `/sistema/editar`; el PR sigue abierto, los checks remotos fallan y Notion no está actualizado a esta especificación. No declarar este sprint “terminado” hasta cerrar los bloqueos listados.

## 10. Segunda pasada independiente de Notion — corte 2026-10-09

### 10.1 Alcance y límite de honestidad

Esta pasada no reutiliza como premisa la lista de fuentes de §9. Se repitió la búsqueda por conceptos, nombres de tareas y contratos históricos; se recorrieron los hubs enlazados de Diseño/UI y Desarrollo, Plan Maestro, Mapa, Roadmap y Sistema; y se recuperaron fuentes normativas, de ejecución y de incidentes para contrastarlas con la intención verbatim de §1 y con el diff del PR #290.

**No se declara auditado exhaustivamente todo el workspace.** La conexión permite buscar y recuperar páginas pertinentes, pero no enumerar ni leer de forma demostrable cada página de todos los espacios. Además, las fuentes estructurales principales que devolvió Notion informan `verification: unverified` y `page_last_edited_at` en torno al 2026-09-24; los cortes operativos escritos dentro de ellas abarcan fechas distintas. La búsqueda de discusiones no devolvió comentarios recuperables y `suggested_edits_status` fue `not_enabled`. Por tanto, no se puede afirmar que no existan decisiones más recientes en páginas no encontradas, comentarios o cambios no incluidos en estos snapshots.

### 10.2 Fuentes adicionales identificadas y su peso

| Fuente | Qué establece para este sprint | Peso y límite |
|---|---|---|
| [Plan Maestro · Khora](https://app.notion.com/p/ab55d4a3b25082d78925013d58c8e272) y hubs [Diseño & UI](https://app.notion.com/p/9545d4a3b25082c489f101177b434b8d), [Desarrollo](https://app.notion.com/p/8de5d4a3b25083c9ae2d012db5059d50) y [Roadmap](https://app.notion.com/p/d835d4a3b25083419c27012a1e6dffe4) | Sitúan el flujo en la arquitectura mayor y declaran una jerarquía documental. | El Plan Maestro se autodefine como fuente global de verdad, pero su snapshot y varios estados del Roadmap son históricos. No se usa un estado fechado en julio como prueba del estado real de octubre. |
| [Arquitectura de Interfaz v0.9→v0.9.1](https://app.notion.com/p/4575d4a3b25082a3aff801167a1d60f1), en particular §§51–55 | El canon ejecutable remite al Paquete Jules v0.8; UI-03/Archivo tiene un gate de integración y protecciones invariantes explícitas. | Fuente operativa crítica para las restricciones de ruta y certificación; su snapshot no está verificado como vigente hoy. |
| [Paquete Jules v0.8](https://app.notion.com/p/ec85d4a3b25082a1a5c001ca37140a9b), tarea J-12, y [PROMPT MASIVO v0.6](https://app.notion.com/p/5ca5d4a3b25083b992b301039ccc5c0f) | Ambos prohíben expresamente tocar, retirar, redirigir o degradar `/sistema/editar` antes de la prueba requerida; J-12 asigna Archivo y la ingesta directa a Volcados. | Restricción explícita y repetida. No está supersedida por §1: la instrucción del usuario elimina pestañas internas redundantes y coloca la revisión en Volcados, pero no ordena retirar anticipadamente la ruta viva. |
| [Diseño UX · Khora](https://app.notion.com/p/d035d4a3b250830394ac81be550b264a) y [Principios de UI](https://app.notion.com/p/29b5d4a3b25083379bfb811ad64265d2) | Distinguen los tres modos macro del sistema —Captura, Consulta y Acción— y priorizan captura de baja fricción. | Precisa el alcance: eliminar subpestañas redundantes dentro de Ingreso no equivale a borrar los modos macro ni sus capacidades. |
| [L0-003 · Protocolo de Ingesta ratificado](https://app.notion.com/p/b385d4a3b25082fbb838011f2fc71bf9) | Divide el dato en zona irreversible (original, audio cuando corresponda, versiones, deltas, tiempos y procedencia), zona derivada reconstruible y zona de juicio humano permanente. La escritura al grafo exige ratificación y procedencia exacta. | Contrato ratificado; impide tratar una refactorización visual como autorización para simplificar custodia o autoaprobar. |
| [IAR · Planeación provisional consolidada, corte 2026-09-04](https://app.notion.com/p/f375d4a3b25083aa818c0173bcf85e78) | Mantiene CAP-1R (importar, grabar, registrar y exportar audio desde Ingreso, independiente del STT) antes de CAP-2R (E2E real y fault injection de no pérdida silenciosa). Declara problemas de pausa/reanudación, callbacks obsoletos y divergencia entre captura y Dictado. | Fuente de planificación más reciente encontrada para este conjunto; el propio documento se declara provisional y su snapshot no está verificado como actualizado después de su corte. |
| [SEA · IAR · RES](https://app.notion.com/p/f485d4a3b250822e9fd0013ea04b7305) | Define el propósito global de la prótesis cognitiva: SEA, Ideación Asíncrona Recuperable y Redacción Enraizada en Sentido. | Responde al propósito global, no demuestra que esos resultados ya estén construidos. |
| [VCU](https://app.notion.com/p/6955d4a3b2508373ab8c01dccce1f601), [DOC-09](https://app.notion.com/p/0895d4a3b25082d58b268116b2a74006) y [Hitos, Secuencia e Integridad](https://app.notion.com/p/96d5d4a3b25082d9b08401d6cb6c2d51) | Refuerzan que se debe comprobar repositorio y producción actuales, evitar pérdida de originales y no avanzar aguas abajo como si estuvieran cerradas etapas previas. | Contexto histórico/procedimental de utilidad; estados de ejecución y fechas antiguas no son prueba del corte actual. |
| [G-2 · Exportar/importar](https://app.notion.com/p/5af5d4a3b2508359952801aa40ce23b9) | Especifica exportación JSONL + `.tar.gz` + manifiesto SHA-256 y una prueba exportar→importar→consultar. | La tarjeta dice fusionada, pero la prueba real seguía sin marcarse. La etiqueta “Fusionado” no demuestra integridad del ciclo. |
| [Incidente de custodia del 6 de agosto](https://app.notion.com/p/1555d4a3b2508311bb858105fa2f0a0d), [fallo del 7 de agosto](https://app.notion.com/p/2c95d4a3b25082c98be101f4c24094ea) y [rescate de volcados abortados](https://app.notion.com/p/e165d4a3b25083ca915281ed2cc46f8e) | Documentan pérdidas reales o no verificadas de audio cuando falló el guardado; texto rescatado fuera del sistema. | Evidencia histórica concreta de por qué una falla parcial debe preservar el original, exponer localizador recuperable y nunca declarar éxito implícito. |
| [Auditoría de no-regresión](https://app.notion.com/p/3f45d4a3b25081438403cf7250a378f5) | Registra invariantes técnicos y bloqueos del PR. | Es un borrador técnico no ratificado: evidencia de análisis, no una enmienda por sí misma al canon de producto. |

### 10.3 Respuesta precisa a la pregunta fundamental

**Dictamen: la pregunta de diseño del flujo de este sprint queda resuelta en su núcleo conceptual, pero no queda resuelta la reconciliación global de todo Notion ni queda demostrada la implementación completa.** No deben confundirse esos tres niveles.

La función que este sprint debe preservar y ordenar es:

1. **Ingreso — capturar con mínima fricción.** Aceptar texto/escritura y voz/dictado sin exigir clasificación previa. Cuando la sesión procede de audio, preservar el audio original y su procedencia; la transcripción es una representación derivada y el fallo de STT no debe destruir ni bloquear la custodia/exportación. La importación de audio y la exportación directa desde Ingreso siguen dentro de CAP-1R; no se consideran satisfechas por existir un botón en otra pantalla. El ingreso manual de texto no debe fingir que existe un audio.
2. **Volcados — custodiar y revisar sin sobrescritura.** Ser la siguiente superficie primaria a la derecha de Ingreso y concentrar el archivo de volcados, escucha/reproducción cuando haya audio, edición como nueva versión, deltas y procedencia, historial y decisión humana de aprobar/rechazar. El original y las versiones anteriores son inmutables; un cambio posterior invalida la aprobación anterior. Una corrección de transcripción debe distinguirse de una enmienda de contenido.
3. **Ingesta — procedimiento posterior, no pestaña redundante de Ingreso.** Incorporar al Núcleo/Grafo solo la versión exacta ratificada mediante `volcado_id + version + sha256`; verificar esa terna en servidor, persistir `io_id`, mantener idempotencia y auditar tanto éxito como fallo. Una respuesta 2xx, una interfaz renderizada o un test con grafo simulado no constituyen por sí solos prueba de escritura real.
4. **Propósito aguas abajo.** Estas etapas son la base forense para SEA/IAR/RES; no equivalen a declarar construidas la recuperación ideacional ni la síntesis cognitiva. La intervención UI debe habilitar captura, procedencia, escucha, edición/ratificación y evidencia, no introducir renovación estética o semántica por sí misma.

La distinción de UX queda cerrada así: **Ingreso y Volcados son superficies de navegación diferentes; Captura/Consulta/Acción siguen siendo modos macro del sistema.** Lo que el usuario observó como redundante eran pestañas internas de Ingreso que no cambiaban la interfaz. Quitar esas pestañas no autoriza retirar sus capacidades subyacentes.

### 10.4 Riesgos concretos al comparar la intención con PR #290

- **Ruta heredada:** PR #290 redirige `/sistema/editar` a `/sistema/volcados`, aunque Arquitectura §§51–55 y J-12 prohíben retirarla/redirectarla hasta que `ING-DIRECT-01` pase en producción. La instrucción verbatim no da permiso para saltar esa compuerta.
- **Exportación de audio en Ingreso:** la vista `IngresoView` de la rama no expone acción de exportación. Volcados tiene exportación MP3, pero eso no satisface el requerimiento CAP-1R de exportar directamente desde Ingreso.
- **Importación aún no probada:** el manejador de adjuntar audio existe, pero debe probarse que el audio importado y ya verificado puede archivarse. En el código revisado, la guardia de archivado contrasta `partesRawRef` y partes subidas; el flujo de adjunto no añade un chunk a `partesRawRef`. Esto es una discrepancia de código que exige prueba/reconciliación, no un fallo de producción declarado sin ejecución.
- **Cobertura eliminada:** PR #290 elimina `e2e/cora-ingesta.spec.ts` (133 líneas), que cubría exclusividad texto/archivo, límites de tamaño, MIME y envíos exitosos. La consolidación de pantallas puede requerir reescribir esos casos, no simplemente perderlos.
- **Contratos UI:** la arquitectura anterior mantenía UI-08 Revisión y UI-09 Ratificación ocultos mientras `CTR-PROP-01`/`CTR-DELTA-01` necesitaran backend. Antes de declarar equivalencia en Volcados hay que mostrar que los contratos reales ahora existen y que aprobación/edición quedan invalidadas correctamente en cada nueva versión.
- **Prueba final:** `ING-DIRECT-01`, CAP-2R, el ciclo exportar→importar→consultar y los checks del SHA final continúan sin evidencia suficiente. Los workflows remotos actuales figuran en fallo; sus logs no pudieron recuperarse y no se atribuye una causa sin ellos.

### 10.5 Estado de certeza

- **Resuelto como intención del sprint:** eliminar subpestañas redundantes dentro de Ingreso; poner Ingreso a la izquierda de Volcados; mover revisión/edición a Volcados; tratar Ingesta como operación sobre una versión aprobada, con el contrato de procedencia intacto.
- **Corroborado por canon ratificado:** preservación append-only, separación dato derivado/juicio humano, procedencia obligatoria y no pérdida silenciosa de audio.
- **No resuelto como capacidad actual:** exportación directa desde Ingreso, aceptación real del audio importado, prueba de ingesta directa en producción, retiro seguro de la ruta heredada y restauración de cobertura E2E eliminada.
- **No resuelto documentalmente a escala de workspace:** reconciliación/ratificación del Plan Maestro y Arquitectura UI con la especificación actual del sprint, verificación de cambios después de los snapshots, y censo exhaustivo de todas las páginas/posibles discusiones del espacio. Esta pasada no autoriza afirmar “todo Notion revisado”.

### 10.6 Cierre documental requerido

- [ ] Reconciliar este dictamen con el Plan Maestro y el canon de interfaz de Notion mediante el procedimiento de gobernanza aplicable; no alterar las páginas de Notion de forma implícita.
- [ ] Conservar `/sistema/editar` hasta un PASS real de `ING-DIRECT-01` en producción con versión nueva y repetida.
- [ ] Probar importación/archivado de WebM, WAV, M4A y MP3; fallo de STT, fallo de DB/vínculo y reintentos idempotentes, sin pérdida del original.
- [ ] Resolver o diferir explícitamente, mediante decisión del operador, la exportación directa desde Ingreso. No marcarla como satisfecha por la exportación disponible en Volcados.
- [ ] Reponer o reemplazar la cobertura funcional de `cora-ingesta.spec.ts`; añadir E2E de captura real/simulada de navegador, no solo comprobaciones de layout.
- [ ] Verificar los contratos de edición/ratificación en Volcados; ejecutar CAP-2R, `ING-DIRECT-01`, exportación→importación→consulta, y la batería completa sobre un único SHA final.
- [ ] Repetir typecheck, contrato de navegación, tests unitarios configurados, build y E2E global; clasificar cualquier fallo remoto con logs accesibles antes de integrar.

### 10.7 Veredicto de esta segunda pasada

**RESULTADO: INTENCIÓN DEL FLUJO RESUELTA; AUDITORÍA TOTAL DE NOTION NO DEMOSTRADA; IMPLEMENTACIÓN Y CIERRE BLOQUEADOS.** La respuesta funcional no debe volver a quedar en la frase genérica “Ingreso → Volcados → Ingesta”: incluye custodia inmutable, juicio humano, exportación/importación independientes del STT y la compuerta de ruta heredada. No mergear PR #290 ni retirar capacidades en nombre de la consolidación hasta cerrar los bloqueos verificables.

## 11. Implementación funcional selectiva v0.5.0

### 11.1 Narrativa de versión

**Antes →** Ingreso mezclaba modos de captura con revisión/ingesta; la importación de audio podía perder el vínculo con el manifiesto verificado, dejar de ofrecer el original ante fallos de transcripción y perder nombre/MIME. La ruta heredada de edición estaba redirigida prematuramente, y el botón de ingesta podía sustituir la versión abierta por la versión ratificada más reciente. En el núcleo, dos solicitudes simultáneas de la misma terna podían superar el precheck al mismo tiempo.

**Cambio →** Se separó la superficie de captura de Volcados sin rediseñar la interfaz en masa; se conserva el acceso directo a `/sistema/editar`. La custodia ahora registra fuente, hash, tamaño, nombre y MIME; el original importado puede exportarse antes o después del archivado únicamente tras revalidar su custodia. Un fallo de STT no borra ni oculta un original verificado. El archivado mantiene sesión estable y captura sellada. La ingesta UI exige identidad exacta de `volcado_id + version + sha256`, requiere un `io_id` real y rechaza resultados HTTP de éxito sin ese identificador. El puente Python verifica la terna existente después de un conflicto concurrente antes de devolver idempotencia.

**Motivo →** Cumplir el VERBATIM del usuario y el protocolo L0-003: cada archivo conserva su original, el historial no se sobrescribe y solo una versión ratificada exacta puede incorporarse al núcleo. El éxito aparente no sustituye la evidencia de custodia o identidad.

**Resultado →** Los cambios y las pruebas de regresión se publicaron en [PR #291](https://github.com/SeryMente/khora/pull/291), con versión de paquete `khora-web 0.3.7`. Esta es una implementación versionada en rama, no una afirmación de que ya esté desplegada o certificada en producción.

### 11.2 Alcance funcional implementado

- **Ingreso:** captura de texto/voz/archivo en una superficie; navegación redundante retirada; guardia de captura sellada y sesión estable; original importado verificado exportable con su nombre y tipo MIME.
- **Volcados:** historial y edición siguen en Volcados; `/sistema/editar` sigue resolviendo directamente a ese dominio mientras exista el gate de producción; abrir una versión explícita no permite sustituirla silenciosamente por la última.
- **Ingesta:** la solicitud envía la versión abierta y su SHA-256 solo si coinciden con la ratificación; el servidor exige la misma terna, persiste el resultado y el `io_id` auténtico, y no degrada una versión posterior por un fallo obsoleto.
- **Núcleo:** la respuesta ante una colisión de identidad concurrente solo será idempotente si una lectura posterior confirma exactamente la misma terna.
- **No-regresión:** se añadieron pruebas unitarias de custodia, idempotencia, exportación, metadatos, sesión sellada y conflictos concurrentes, además del contrato E2E simulado para la ruta directa. Se mantiene `khora-web/e2e/cora-ingesta.spec.ts`; no se depende de un test de layout como sustituto de la prueba funcional.

### 11.3 Evidencia, límites y gate de cierre

- **Publicación:** los cambios están en la rama indicada y agrupados en el PR #291; el objetivo es un squash-merge a `main`, no fusionar íntegramente las ramas divergidas #290/#288.
- **CI remoto:** los workflows recientes reportaron fallo antes de mostrar pasos de runner; las consultas de logs devolvieron `BlobNotFound`. No hay evidencia de salida de `typecheck`, tests unitarios o E2E para este head. Por tanto, el estado no se rotula como “tests aprobados”; una ejecución de runner funcional sigue siendo un criterio de aceptación.
- **Producción:** `ING-DIRECT-01` sigue pendiente: debe probarse contra producción con una tupla nueva y una repetida, validarse un `io_id` no vacío y verificarse que la repetición no modifique el grafo. El E2E simulado de contrato no equivale a ese PASS.
- **Despliegue:** las comprobaciones de preview de Vercel/Netlify reportaron restricciones del servicio de despliegue; no son evidencia de que el código se haya compilado en el runner.
- **Gobernanza:** el bloque de VERBATIM de la sección 1 permanece sin cambios. Esta versión no afirma un censo exhaustivo de Notion ni modifica silenciosamente sus páginas.

**Dictamen v0.5.0:** implementación funcional selectiva publicada; integración en `main` y certificación real todavía pendientes. El gate final solo puede cerrarse después de verificar el merge, ejecutar pruebas con resultados legibles y completar `ING-DIRECT-01` en producción.
