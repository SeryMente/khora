# Diagnóstico independiente: GitHub Actions no inicia los jobs de calidad

**Frente:** MCP-OBS-DICTADO / Dictado de voz  
**Fecha de observación:** 2026-10-29  
**Clasificación:** investigación paralela al acceso MCP; no depende de consultar eventos productivos de KHORA.  
**Estado:** triage técnico realizado; causa raíz externa no determinada; requiere revisión de configuración/uso de Actions por un administrador autorizado.

---

## 1. Resumen

Se contrastaron los archivos de workflows de KHORA y las ejecuciones asociadas al HEAD actual de la candidata PR #335.

Los workflows relevantes declaran runners GitHub-hosted estándar mediante ubuntu-latest y contienen pasos normales de checkout, instalación/configuración y pruebas. En las ejecuciones examinadas, los jobs terminaron en failure con listas de pasos vacías. La descarga de logs de un job devolvió 404 BlobNotFound: no hay un log de ejecución disponible para explicar el rechazo.

La evidencia apunta a un fallo anterior a la ejecución de los pasos del workflow. **No demuestra un fallo de TypeScript, pytest, Playwright ni una aserción de la aplicación. Tampoco identifica por sí sola la causa raíz del provisionamiento.**

La página pública de GitHub Status consultada el 2026-10-29 mostraba los servicios operativos, incluido Actions. El incidente de ese día correspondía a Copilot Cloud, no a Actions, y constaba como resuelto. Los incidentes históricos de asignación de runners en octubre prueban que el tipo de síntoma puede originarse en la plataforma, pero no prueban que ese sea el origen de estas ejecuciones.

No conviene modificar código ni YAML para corregir un runner que no llegó a ejecutar pasos. La siguiente acción útil es que un administrador autorizado compruebe los controles de Actions y el consumo de minutos/compute de la organización o cuenta que factura el repositorio, y después realice un único reintento controlado.

## 2. Alcance y límites de la revisión

Se inspeccionaron:
- .github/workflows/ci.yml
- .github/workflows/ui-quality.yml
- metadata de PR #335 y su HEAD
- ejecuciones de workflows asociadas a ese HEAD
- jobs y listas de pasos de seis jobs
- descarga de logs de UI E2E

No se inspeccionaron:
- configuración privada de facturación/consumo de la organización;
- configuración administrativa de runner groups o políticas enterprise;
- permisos privados de Actions no expuestos por la conexión disponible;
- logs internos de GitHub ni telemetría de provisionamiento;
- todos los pasos de todos los jobs fallidos.

Este documento no declara aceptada ni fusionada la PR #335, no valida sus cambios de producto y no acredita que esos workflows se ejecutaran localmente.

## 3. Estado de la candidata involucrada

En la consulta de GitHub del 2026-10-29, PR #335 reportó:

- Estado: open.
- Merged: false.
- Draft: false.
- Mergeable: true en esa consulta.
- Base: main.
- Head: feat/u06-sobre-ingreso-work-1990819938695134734.
- HEAD: 0e352fbfe03a902011c6c7e0bb63e4148ce8d58e.
- 321 archivos cambiados.
- Título: “feat(ingreso): cumplir instrucciones U01-U06 del operador de extremo a extremo”.

La PR es una candidata amplia y concurrente. **No se debe utilizar como vehículo para corregir el acceso MCP, mezclarla con este entregable ni fusionarla como parte de este triage.** Su evaluación funcional es una decisión separada.

## 4. Ejecuciones verificadas

Las ejecuciones asociadas al HEAD anterior devolvieron:

| Workflow | Run ID | Resultado |
|---|---:|---|
| UI Quality | 40960271583 | completed / failure |
| khora-ok / gate | 40960271574 | completed / failure |
| Ingreso and Blog candidate gates | 40960271585 | completed / failure |
| Blog editorial isolated tests | 40960271495 | completed / failure |
| CI | 40960271558 | completed / failure |

Jobs consultados:

| Workflow/job | Job ID | Resultado de inspección |
|---|---:|---|
| UI E2E | 123750914778 | failure; steps=[] |
| UI Contract | 123750915136 | failure; steps=[] |
| khora-ok | 123750914616 | failure; steps=[] |
| calidad | 123750914423 | failure; steps=[] |
| khora-web-gate | 123750914703 | failure; steps=[] |
| api-tests | 123750914897 | failure; steps=[] |

Para el job UI E2E (123750914778), la descarga del log devolvió HTTP 404 BlobNotFound. Esto indica que no se pudo recuperar un log persistido desde el endpoint consultado; no identifica qué componente rechazó el inicio del job. No se debe extender ese resultado a todos los jobs sin consultar sus endpoints individualmente.

Los jobs full-build e isolated-editorial de “Ingreso and Blog candidate gates” también figuran como fallidos, pero en esta revisión no se inspeccionaron sus pasos ni sus logs. No se infiere que estén afectados por exactamente la misma causa.

## 5. Revisión estática de workflows

### CI

El archivo .github/workflows/ci.yml define tres jobs:

- calidad
- api-tests
- khora-web-gate

Los tres utilizan runs-on: ubuntu-latest. Los pasos incluyen checkout, setup de Python/Node y ejecución de instalación, typecheck, lint o pruebas.

### UI Quality

El archivo .github/workflows/ui-quality.yml define:

- UI Contract
- UI E2E

Ambos utilizan runs-on: ubuntu-latest. El primero realiza checkout, setup-node, npm ci, typecheck, UI review, contrato y pruebas unitarias. El segundo prepara Node, instala Chromium y ejecuta las suites E2E seleccionadas.

No se encontró en los archivos revisados un nombre de runner personalizado, self-hosted label ni una referencia obvia a una máquina propia. La configuración estática no demuestra que GitHub haya podido asignar un runner ni que la cuenta tenga saldo/capacidad disponible.

## 6. Contraste con GitHub Status

Fuente: https://www.githubstatus.com/

Al consultar el 2026-10-29, la página indicaba All Systems Operational, incluido GitHub Actions.

El incidente publicado para el 29 de octubre era “Disruption with Copilot Cloud services”: fallos y latencia en sesiones de agentes Copilot, mitigados y declarados resueltos a las 12:49 UTC. No se debe utilizar este incidente como explicación de los jobs de Actions.

GitHub también documenta incidentes anteriores en octubre que sí afectaron Actions o la asignación de GitHub-hosted runners:
- 19 de octubre: degradación temporal de GitHub Actions, Pages y webhooks; GitHub indicó que 5.13% de los jobs en runners hosted tuvieron retrasos de inicio y 0.02% de los workflow runs fallaron durante el periodo.
- 5 de octubre: incidente de asignación de runners hosted, con jobs retrasados/no iniciados, resuelto por GitHub.

Referencias:
- https://www.githubstatus.com/
- https://www.githubstatus.com/history
- https://github.com/orgs/community/discussions/209575

Estos incidentes solo demuestran que GitHub ha sufrido problemas de provisionamiento similares. No prueban que el fallo de la PR #335 sea un incidente global, ni una restricción de facturación, ni una política particular de esta organización.

## 7. Dictamen

**Hechos confirmados**
1. Los workflows revisados solicitan runners hosted estándar ubuntu-latest.
2. Se observaron cinco workflow runs fallidos en el HEAD consultado.
3. Los seis jobs inspeccionados devolvieron cero pasos.
4. El log del job UI E2E no pudo descargarse: 404 BlobNotFound.
5. La página pública de GitHub Status mostraba Actions operativo al momento de la consulta.

**Interpretación técnica**
- El error observado ocurre antes de que los pasos visibles de los seis jobs inspeccionados puedan aportar evidencia de ejecución.
- No hay evidencia suficiente para atribuirlo a una regresión de código.
- El origen podría estar en una condición de provisionamiento hosted, disponibilidad/política de Actions, límites de cuenta/organización o una incidencia no reflejada en el estado global. Son hipótesis que necesitan revisión administrativa; ninguna queda confirmada.

**No hacer**
- No cambiar runs-on a ciegas.
- No añadir runners self-hosted para sortear el síntoma sin diseño y autorización.
- No eliminar protecciones o gates.
- No modificar el código para “arreglar” una ejecución que no llegó a los pasos.
- No ejecutar reintentos masivos repetidos ni gastar minutos sin una pregunta diagnóstica concreta.
- No marcar tests como aprobados ni fallidos por comportamiento de la aplicación cuando no se ejecutaron pasos.

## 8. Próxima intervención requerida

Un administrador autorizado de la organización/cuenta debe comprobar:

1. GitHub Settings → Billing and licensing / Actions usage: minutos/compute consumidos, cuota aplicable al repositorio privado, presupuestos, límites o suspensión de gasto.
2. Organization Settings → Actions → General: disponibilidad de GitHub-hosted runners, políticas de Actions, restricciones de workflows y políticas heredadas de enterprise.
3. Repository Settings → Actions → General: que Actions esté habilitado y que la política del repositorio permita ejecutar los workflows y las acciones requeridas.
4. Runner groups y restricciones aplicables al repositorio, si la organización usa políticas que afecten a hosted runners.
5. Estado de Actions y anuncios de GitHub Support en el intervalo exacto de las ejecuciones.

Paquete de evidencia para soporte:
- Repositorio: SeryMente/khora (privado).
- PR: #335.
- HEAD: 0e352fbfe03a902011c6c7e0bb63e4148ce8d58e.
- Runs: 40960271583, 40960271574, 40960271585, 40960271495, 40960271558.
- Jobs inspeccionados: 123750914778, 123750915136, 123750914616, 123750914423, 123750914703, 123750914897.
- Síntoma: jobs en failure con steps vacíos; un log consultado devolvió BlobNotFound; workflows declaran ubuntu-latest.

Después de la revisión administrativa, realizar un único reintento controlado de CI y UI Quality sobre una referencia estable y autorizada. Si los jobs inician, inspeccionar sus pasos y separar fallos reales de código. Si vuelven a terminar sin pasos/logs, elevar el caso a GitHub Support con los identificadores anteriores.

## 9. Trabajo realizado en este ciclo

- Se inspeccionaron los workflows y sus declaraciones de runner.
- Se recuperaron IDs de runs y jobs de la candidata.
- Se consultaron los pasos de seis jobs y se intentó recuperar un log.
- Se contrastó el estado público de GitHub Status y la historia reciente de incidentes.
- Se preparó este paquete de diagnóstico para una intervención administrativa precisa.

No se modificó código, YAML, branch protection, configuración de Actions, facturación, secretos, runner groups, producción ni PR #335. No se reintentaron workflows.

**Relación con el acceso MCP:** este triage es paralelo e independiente. No desbloquea S1 ni sustituye la llamada autenticada de observabilidad que requiere el frente de dictado.
