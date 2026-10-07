# UI_REVIEW · Cómo ver la interfaz de Khora

> Documento canónico. Lee esta página completa antes de evaluar o modificar la
> interfaz de Khora.

## 1. Qué es esto

Khora expone un sistema de revisión de interfaz de solo lectura. No es una
maqueta separada: utiliza los mismos componentes presentacionales compartidos
que consume producción y los alimenta exclusivamente con datos sintéticos.

Hay dos superficies de inspección:

- **Harness interactivo:** selector de pantalla, escenario y viewport.
- **Prerender semántico:** HTML de cada escenario para personas o agentes que no
  ejecutan JavaScript.

## 2. Rutas

Base prevista: `https://khora-web.vercel.app`

| Ruta | Propósito | JavaScript |
|---|---|---|
| `/ui-review/estatico` | Índice de las pantallas | No |
| `/ui-review/<pantalla>/estatico` | Todos los escenarios de una pantalla | No |
| `/ui-review/manifest.json` | Inventario legible por máquina | No |
| `/ui-review` | Harness interactivo | Sí |
| `/ui-review/<pantalla>?scenario=<escenario>` | Escenario concreto | Sí |

Las rutas de UI Review permanecen **fail-closed** y requieren
`KHORA_UI_REVIEW_MODE=1`.

## 3. Las nueve pantallas registradas

| Pantalla | Función | Componente compartido |
|---|---|---|
| `ingreso` | Dictado, escritura y adjuntar audio | `IngresoView` |
| `archivo` | Lista de volcados | `PipelineView` |
| `revision` | Revisión, audio y hallazgos | `PipelineView` |
| `aprobacion` | Compuerta de aprobación | `PipelineView` |
| `ingesta` | Envío al kernel | `PipelineView` |
| `registro` | Registro de eventos | `RegistroView` |
| `grafo` | Nodos y relaciones | `GrafoView` |
| `consulta` | Consulta multi-turno y RAG | `ConsultaView` |
| `kpi` | Métricas y benchmarks | `KpiPanelView` |

Cada pantalla tiene escenarios explícitos de operación, carga, vacío, error y
casos derivados de incidentes cuando aplican.

## 4. Identificadores estables

Los elementos relevantes llevan `data-ui-id`, por ejemplo
`ingreso.btn-adjuntar` o `revision.btn-resolver-incidente`.

El registro de escenarios y los componentes se verifican contra esos IDs. Un
ID nuevo no documentado o un ID registrado que ya no exista hace fallar el
gate.

## 5. Cero deriva

La revisión utiliza tres defensas combinadas:

1. Producción y UI Review comparten `app/components/shared/`.
2. Los estados sintéticos se tipan contra los estados reales de esos componentes.
3. `ui_review_drift.test.ts` compara los `data-ui-id` de producción con el
   registro canónico.

La regla adicional de navegación comprueba que no existan enlaces internos
muertos ni páginas de producto huérfanas.

## 6. Certificación E2E

El workflow **UI Quality** ejecuta:

`typecheck → ui-review:check → ui:contract → test:unit`

y, en un job separado:

`Playwright Chromium → shell-v2 → ui-quality`

La certificación E2E comprueba en escritorio y móvil:

- renderización de todas las superficies de producto;
- ausencia de respuestas HTTP 4xx/5xx en las rutas probadas;
- nombre accesible de controles;
- ausencia de `div[role=button]` como control simulado;
- `alt` en imágenes;
- presencia de `h1`;
- ausencia de overflow horizontal relevante;
- ausencia de errores JavaScript no controlados;
- navegación completa del menú Sistema;
- acceso Seguridad → Control MCP;
- persistencia del cambio de tema;
- prerender de las nueve pantallas de UI Review.

## 7. Qué es deliberadamente técnico

No son módulos de producto y no se incluyen en el inventario operativo:

- autenticación y OAuth;
- `/offline`;
- `/ui-review` y sus subrutas de inspección;
- `/capturar/compartir`, que es un trigger externo de Share Target.

Los aliases históricos `/sistema/boveda`, `/sistema/entorno-persistente` y
`/herramientas/bitacora` deben resolver hacia superficies canónicas existentes.

## 8. Regla de aceptación

Una nueva superficie no queda aceptada únicamente porque compile. Debe tener:

1. ruta funcional;
2. entrada de navegación o trigger externo explícito;
3. cobertura del contrato de navegación;
4. escenarios UI cuando use un componente compartido;
5. typecheck;
6. UI Review;
7. pruebas unitarias;
8. E2E.

---

*Khora · la máquina propone, el sujeto ratifica; nada se asienta en silencio.*
