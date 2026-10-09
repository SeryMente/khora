---
id: KHORA-SPRINT-INGRESO-UNIFICADO-20261007
tipo: sprint
version: v0.2.0
estado: IMPLEMENTACION_EN_RAMA__PR_ABIERTO__CERTIFICACION_GLOBAL_PENDIENTE
fecha: 2026-10-08
repositorio_canonico: https://github.com/SeryMente/khora
ruta_canonica: docs/sprints/SPR-INGRESO-UNIFICADO-20261007.md
rama: refactor/ingreso-volcados-consolidacion-20261008
pull_request: https://github.com/SeryMente/khora/pull/290
base_sha: b94e05f7a3f8e8bb3d48bf635054fd3b44702c4c
owner: KHORA
---

# Sprint KHORA · Ingreso → Volcados · Especificación canónica

**Estado del objeto:** CANÓNICO PARA ESTE SPRINT.  
**Regla de autoridad:** la sección 1 conserva literalmente la especificación aportada por el usuario y es la fuente normativa de intención del sprint. Las decisiones, los criterios de aceptación y el registro técnico de las secciones posteriores son traducciones operativas subordinadas; no pueden alterar ni sustituir el bloque verbatim.  
**Historial:** esta versión (v0.2.0) sustituye la interpretación de (v0.1.0) que trataba Revisión e Ingesta como modos internos de Ingreso. Se conserva el identificador del objeto para mantener una única ruta canónica y continuidad de trazabilidad.

## 0. Cápsula de recuperación

- **Objetivo:** consolidar Ingreso como superficie de captura y colocar Volcados inmediatamente a su derecha como siguiente dominio del flujo de datos.
- **Secuencia funcional:** `Ingreso → Volcados → revisión/ratificación → ingesta → Núcleo`.
- **Rama de implementación:** `refactor/ingreso-volcados-consolidacion-20261008`.
- **PR:** [#290 · refactor(ui): consolidar ingreso y volcados en el flujo canónico](https://github.com/SeryMente/khora/pull/290).
- **Estado real:** la implementación está en la rama del PR y dispone de validaciones locales satisfactorias para los gates indicados abajo. El PR sigue abierto y sin merge; la certificación global de E2E permanece pendiente.
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
- **v0.2.0 · Especificación canónica verbatim:** Ingreso queda como captura; Volcados recibe revisión/edición y la secuencia posterior; Ingesta se trata como procedimiento downstream, manteniendo el orden primario Ingreso → Volcados.

No se debe reactivar una decisión de v0.1.0 sin una nueva instrucción explícita del usuario y una versión posterior del objeto canónico.
