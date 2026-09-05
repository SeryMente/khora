# UI_REVIEW · Cómo ver la interfaz de Khora

> Documento canónico. Si eres un modelo de lenguaje al que Victor Hugo dirigió
> aquí, lee esta página completa antes de opinar sobre el diseño de Khora.

## 1. Qué es esto

Khora expone un **gemelo fiel de su interfaz** en rutas públicas de solo
lectura. No es una maqueta ni una reconstrucción: renderiza **exactamente los
mismos componentes de React** que usa el sistema en producción, alimentados con
datos sintéticos.

Sirve para que cualquier persona o modelo pueda ver, citar y proponer cambios
sobre la interfaz vigente sin acceder a datos reales.

## 2. Enlaces

Base: `https://khora-web.vercel.app`

| Ruta | Para qué | Requiere JavaScript |
|---|---|---|
| `/ui-review/estatico` | **Empieza aquí.** Índice de pantallas | No |
| `/ui-review/<pantalla>/estatico` | Todos los escenarios de una pantalla, ya renderizados | No |
| `/ui-review/manifest.json` | Inventario legible por máquina | No |
| `/ui-review` | Harness interactivo con selector de escenario y viewport | Sí |
| `/ui-review/<pantalla>?scenario=<escenario>` | Un escenario concreto | Sí |

**Si no ejecutas JavaScript** (la mayoría de los recuperadores web, incluidos
agentes de ChatGPT, Notion y Claude vía fetch): usa siempre las rutas que
terminan en `/estatico`. Las demás te devolverán un cascarón vacío con el texto
`Cargando escenario sintético...`, que **no** es la interfaz.

**Si controlas un navegador real** (Claude in Chrome, Playwright, una persona):
`/ui-review` te da además pestañas de pantalla, selector de escenario,
conmutador Desktop/Mobile y resaltado de identificadores.

## 3. Las siete pantallas

| Pantalla | Qué muestra | Componente compartido |
|---|---|---|
| `ingreso` | Dictado en vivo, escritura y adjuntar audio | `IngresoView` |
| `archivo` | Lista de volcados capturados | `PipelineView` |
| `revision` | Mesa de revisión, audio y hallazgos | `PipelineView` |
| `aprobacion` | Compuerta de aprobación de versión | `PipelineView` |
| `ingesta` | Envío al kernel y grafo | `PipelineView` |
| `registro` | Log de eventos del sistema | `RegistroView` |
| `grafo` | Proyección cognitiva de nodos y aristas | `GrafoView` |

Cada pantalla tiene entre 3 y 9 escenarios: estados inactivo, cargando, vacío,
error, y los estados propios de su flujo. El manifiesto los enumera todos.

## 4. Identificadores estables (`ui_id`)

Cada elemento relevante lleva un atributo `data-ui-id`, por ejemplo
`ingreso.btn-adjuntar` o `revision.btn-resolver-incidente`.

**Úsalos para referirte a la interfaz con precisión.** En lugar de «el botón de
la derecha», escribe `ingreso.btn-adjuntar`. Son estables entre versiones y
están garantizados por pruebas automáticas.

## 5. Garantía de fidelidad

Tres mecanismos impiden que lo que ves aquí se aleje de la interfaz real:

1. **Fuente única de componentes.** Las rutas de producción y UI Review importan
   los mismos archivos de `khora-web/app/components/shared/`. No existen dos
   versiones de la interfaz.
2. **Acoplamiento por tipos.** Los estados sintéticos de
   `khora-web/lib/ui-review/states.ts` están declarados con los tipos reales que
   exigen esos componentes. Si las props cambian, el proyecto deja de compilar.
3. **Prueba antideriva en CI.** `tests/unit/ui_review_drift.test.ts` compara los
   `data-ui-id` presentes en los componentes contra el registro de escenarios.
   Si alguien añade, renombra o borra uno sin registrarlo, la prueba falla y la
   fusión se bloquea.

Consecuencia: **si UI Review muestra algo, la interfaz real lo tiene.** No hace
falta mantenerlo a mano.

## 6. Qué no encontrarás aquí

- Datos reales. Todos los volcados, eventos y nodos son sintéticos.
- Efectos externos. Los botones no escriben en base de datos ni llaman APIs.
- Secretos ni credenciales.
- Autenticación. Estas rutas son de lectura pública, por diseño.

En el prerender estático los controles se muestran pero no responden: es un
retrato de la interfaz, no una aplicación funcionante.

## 7. Cómo pedir ayuda de diseño

Formulación recomendada al dirigir a un modelo:

> Revisa `https://khora-web.vercel.app/ui-review/ingreso/estatico`. Es la
> interfaz real de mi sistema, con datos sintéticos. Propón mejoras al escenario
> `idle` refiriéndote a los elementos por su `ui_id`.

## 8. Activación

Las rutas dependen de la variable de entorno `KHORA_UI_REVIEW_MODE=1` en el
proyecto de Vercel, con tipo **config** (no *secret*: en Edge Runtime una
variable marcada como secreto no llega al middleware y las rutas responden 404).

Si `/ui-review/estatico` devuelve `{"error":"Not Found"}`, esa variable falta o
está mal tipada.

## 9. Archivos del sistema

| Archivo | Función |
|---|---|
| `khora-web/lib/ui-review/registry.ts` | Registro canónico de escenarios y `ui_id` |
| `khora-web/lib/ui-review/states.ts` | Estados sintéticos tipados. Fuente única |
| `khora-web/lib/ui-review/fixtures.ts` | Datos sintéticos |
| `khora-web/app/ui-review/[screen]/estatico/page.tsx` | Prerender sin JavaScript |
| `khora-web/app/ui-review/ReviewHarnessShell.tsx` | Harness interactivo |
| `khora-web/tests/unit/ui_review_drift.test.ts` | Guardián antideriva |
| `khora-web/scripts/check_ui_review.ts` | Verificación de integridad |

## 10. Añadir una pantalla o un escenario

1. Añade el `data-ui-id` en el componente compartido correspondiente.
2. Regístralo en el escenario adecuado de `registry.ts`.
3. Si es una pantalla nueva, añade su `ScreenId` en `types.ts`, su constructor
   de estado en `states.ts` y su caso en el prerender.
4. Ejecuta `npm run test:unit` y `npm run ui-review:check`.

La prueba antideriva te dirá exactamente qué falta. No hay pasos ocultos.

---

*Khora · la máquina propone, el sujeto ratifica; nada se asienta en silencio.*
