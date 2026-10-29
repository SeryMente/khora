# Diagnóstico transversal de GitHub Actions · posible bloqueo de billing/uso privado

**Fecha local:** 2026-10-29 · America/Mexico_City  
**Prioridad:** P0 — desbloquear publicación KHORA desde ChatGPT Free → GitHub → Vercel  
**Estado de causa raíz:** **ALTA PROBABILIDAD: gate de facturación/entitlement de Actions en repositorios privados; aún NO CONFIRMADO**.  
**OCP rector:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md), PUBLICABILIDAD-v0.6 al completar este ciclo.  
**Referencia normativa leída:** DUG de SeryMente v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.  
**Modalidad:** solo consulta remota de GitHub, revisión documental y diagnóstico acotado con RDC. Ninguna mutación de facturación/configuración, rerun, `workflow_dispatch` o deployment.

## 1. Resumen ejecutivo

El fallo ya no debe tratarse como un problema genérico de YAML, pruebas o código de KHORA. El mismo patrón ocurre en **tres repositorios privados distintos** de la organización SeryMente, mientras un workflow reciente de un repositorio público de la misma organización sí se ejecuta en un runner y termina correctamente.

La combinación observada es:
- jobs de 1–3 segundos, que terminan en fallo antes de exponer pasos;
- `runner_id=0`, `runner_name` vacío y `steps=[]`;
- log endpoint responde `BlobNotFound`;
- dos anotaciones registradas en cada check run consultado (`annotations_count=2`), aunque el contenido de esas anotaciones no pudo recuperarse mediante la integración disponible.

Esta firma coincide muy estrechamente con reportes en los que el contenido de una anotación indicó que el trabajo no había empezado porque la cuenta estaba bloqueada por un problema de facturación. GitHub documenta oficialmente que una retención de autorización fallida puede bloquear Actions incluso en Free, y que el uso de runners alojados en repositorios privados se bloquea al agotarse la cuota incluida si no hay un método de pago válido.

**Conclusión operativa:** revisar primero la elegibilidad de Actions, los presupuestos/uso y el estado de facturación para la organización propietaria `SeryMente`, además del propietario personal de facturación cuando corresponda. No editar workflows ni instalar herramientas locales como primera respuesta. La causa raíz exacta queda sin confirmación porque no pudimos leer las anotaciones ni el dashboard de facturación mediante las herramientas autorizadas.

## 2. Evidencia comparativa

### 2.1 Repositorios privados afectados

| Repositorio/run | Job ID | Resultado observable | Logs |
|---|---:|---|---|
| [KHORA CI #40913146359](https://github.com/SeryMente/khora/actions/runs/40913146359) | `123586201893`, `123586202374`, `123586202444` | Tres jobs; fallaron entre 2 y 3 s, `runner_id=0`, runner vacío, `steps=[]`. Los check runs registran dos anotaciones cada uno. | `BlobNotFound` para el job consultado. |
| [Metodología #40903838336](https://github.com/SeryMente/metodologia/actions/runs/40903838336) | `123553074772` | Falló en ~1 s; `runner_id=0`, runner vacío, `steps=[]`; dos anotaciones registradas. | `BlobNotFound`. |
| [GDP #40876634258](https://github.com/SeryMente/GDP/actions/runs/40876634258) | `123457013462` | Falló en ~2 s; `runner_id=0`, runner vacío, `steps=[]`; dos anotaciones registradas. | `BlobNotFound`. |

El repositorio `SeryMente/personal` no devolvió runs en el endpoint consultado y `khora-effectif` tampoco. Esos resultados no demuestran nada sobre facturación, solo que no había runs accesibles en la respuesta consultada.

### 2.2 Control positivo: repositorio público de la misma organización

[Signal Interpreter run #40922616949](https://github.com/SeryMente/signal-interpreter/actions/runs/40922616949), rama `main`, SHA `99223451ff5b815bc4ebea67fd8f45bf94171941`, se ejecutó el 2026-10-29T17:34:27Z y terminó **SUCCESS** a las 17:35:17Z. El job tuvo `runner_id=1000046885`, nombre `GitHub Actions 1000046885` y pasos reales completados. Es una prueba de que los runners hospedados podían ejecutar al menos ese flujo público, en la misma ventana aproximada en que los flujos privados fallaban.

También se observa un workflow CodeQL de `SeryMente/otrogranprograma` en éxito el 2026-10-25, pero el control reciente de Signal Interpreter es más pertinente temporalmente.

### 2.3 Anotaciones

El endpoint de check runs por commit devolvió `annotations_count=2` para cada check afectado, por ejemplo:
- KHORA check `123586202444`
- Metodología check `123553074772`
- GDP check `123457013462`

La integración disponible permite leer el recuento y la URL de anotaciones, pero rechaza la ruta directa `/check-runs/{id}/annotations`; por tanto, **el texto de las anotaciones de estos repositorios no se observó**. No se debe citar como mensaje de KHORA el texto observado en repositorios comunitarios.

## 3. Evidencia externa y explicación probable

### Documentación oficial

GitHub explica que:
- una autorización de pago fallida puede bloquear facturación personal y bloquear GitHub Actions u otros accesos de nivel gratuito, incluso si la cuenta permanece en Free;
- para repositorios privados, los runners estándar consumen minutos incluidos; al exceder la cuota, si no hay método de pago válido, la ejecución se bloquea;
- un método de pago con autorización fallida debe corregirse desde Billing & Licensing / Payment information; si la pantalla no muestra el motivo, se debe abrir un caso de soporte para revisar el bloqueo.

Fuentes oficiales:
- https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/billing/how-tos/view-usage

### Reportes de la comunidad con firma equivalente

1. [GitHub Community #210692](https://github.com/orgs/community/discussions/210692): jobs de `ubuntu-latest` que fallan antes de iniciar, `runner_id=0`, runner vacío, `steps=[]`, logs `BlobNotFound`; la anotación exacta expuesta en ese caso fue `The job was not started because your account is locked due to a billing issue.`
2. [GitHub Community #208287](https://github.com/orgs/community/discussions/208287): bloqueo de facturación a nivel de cuenta confirmado por una anotación; después de corregir una autorización fallida, la ejecución privada volvió a funcionar. La resolución fue confirmada por quien publicó, pero el caso no demuestra por sí mismo que la cuenta SeryMente tenga la misma condición.

Estos informes se utilizan como evidencia comparativa, no como sustituto de la anotación faltante en SeryMente.

## 4. Diagnóstico diferencial actualizado

| Hipótesis | Evaluación | Justificación |
|---|---|---|
| Error en YAML o comando de CI de KHORA | **Baja para explicar este síntoma** | Tres jobs distintos de KHORA fallan antes de pasos; lo mismo ocurre en Metodología y GDP. No se ejecuta ningún comando de proyecto. |
| Saturación general de runners GitHub | **Menos probable, no imposible** | Un job público de Signal Interpreter en la misma organización ejecutó pasos reales y pasó en la misma ventana aproximada. |
| Error global del proveedor de logs | **Insuficiente para explicar todo** | `BlobNotFound` explica la ausencia de logs, pero no el patrón de `runner_id=0` en varios repos privados cuando el control público sí inicia. |
| **Gate de facturación, uso o entitlement para Actions privadas** | **Alta probabilidad, pendiente confirmación** | Patrón exacto documentado en reportes comunitarios; docs oficiales confirman bloqueos por autorización fallida o por cuota privada sin método válido; varios repos privados afectados y control público exitoso. |
| Restricción/política de organización u otra condición de cuenta | **Posible** | Si la pantalla de facturación está limpia, revisar las políticas de Actions y escalar a GitHub Support para revisar anotaciones/telemetría interna. |

## 5. Acciones de resolución recomendadas

### P0 — revisión del propietario de facturación

1. En GitHub, abrir **Settings → Billing & Licensing → Plans and usage** para la organización propietaria `SeryMente`. Confirmar cuota de minutos y almacenamiento de Actions incluidos, consumo, saldo, presupuesto/límite de gasto y cualquier bloqueo visible.
2. Revisar **Payment information** para la organización. Comprobar si hubo autorización fallida, método inválido o saldo pendiente.
3. Si las páginas de la organización no muestran un problema, revisar la cuenta personal que mantiene la facturación o el método de pago, porque GitHub documenta bloqueos personales por autorizaciones fallidas que pueden bloquear Actions incluso en Free.
4. **No aumentar el presupuesto ni autorizar un gasto automáticamente.** Si la causa es la cuota agotada con un límite de gasto en cero, que el propietario decida explícitamente si desea mantener cero gasto o habilitar una cantidad determinada.
5. Si no aparece un problema de pago/uso o después de resolverlo persisten los fallos, abrir un ticket en GitHub Support adjuntando los run/job IDs de las secciones 2.1 y señalando que la API reporta dos anotaciones pero no expone sus cuerpos mediante la integración disponible. Pedir explícitamente el contenido de las anotaciones y motivo de rechazo antes de la asignación del runner.

### P0 — reanudación controlada después de resolver el gate

1. No volver a disparar workflows mientras no se haya revisado billing/entitlement.
2. Cuando el propietario confirme que el bloqueo está resuelto, ejecutar **una sola prueba controlada** en una rama no productiva o esperar el siguiente push intencional ya necesario; verificar que el job tenga `runner_id > 0`, nombre de runner y un paso `Set up job`.
3. Comprobar que los logs se generan y que el job avanza. Solo entonces separar los fallos de código reales de los fallos de infraestructura/entitlement.
4. No usar `workflow_dispatch` para el deployment productivo; no fusionar Publicabilidad a `main` ni publicar KHORA como parte de esta resolución de Actions.
5. Después de que CI vuelva a funcionar, retomar la revisión de la autoridad única de publicación, migración duplicada, gates efectivos y dominio smoke de Vercel.

## 6. Diagnóstico local con RDC

RDC se utilizó solamente para la reproducción/diagnóstico local de este bloqueo en el dispositivo PC-14 (`C:\Users\PC 13`). La inspección limitada a ubicaciones de proyecto habituales mostró:
- no hay clon de `SeryMente/khora` en las rutas de proyecto/Escritorio consultadas;
- `git` no está instalado o no está en PATH;
- GitHub CLI `gh` no está instalado;
- Node.js `v24.22.2` sí está disponible.

No se instaló Git/gh, no se clonó el repositorio, no se inspeccionaron archivos personales ajenos y no se alteró el entorno. En un job que nunca alcanza el primer step y tiene una probable barrera de facturación/cuenta, ejecutar manualmente tests locales no reproduciría el gate de GitHub. **RDC no puede corregir por sí solo un bloqueo remoto de facturación/entitlement**, y la ausencia de clon/herramientas impide una reproducción local fiable sin preparar otro entorno. No conviene preparar ese entorno hasta verificar billing y que Actions vuelva a asignar runners.

## 7. Límites y estado de corrección

- Estado de la causa: **alta probabilidad de gate billing/uso privado; no confirmación directa**. Faltan el cuerpo de la anotación de SeryMente y la pantalla de uso/facturación.
- No se hicieron reruns, `workflow_dispatch`, commits de aplicación, instalación de Git, clones, acciones de pago, cambios de presupuesto, modificaciones de workflow/settings de Actions, ni deployments de Vercel.
- No se modificó `main`, los otros repositorios, secretos, dominios, configuración de Vercel ni bases de datos.
- La siguiente acción bloqueante corresponde al propietario de facturación de SeryMente: confirmar y resolver la condición de Billing/Actions, o abrir soporte con la evidencia de los checks.
