<!-- PUBLICABILIDAD_VERSION=v0.4; PUBLICABILIDAD_SEAL=PUBLICABILIDAD-v0.4 -->
# Objeto Canónico de Persistencia · Publicabilidad

## 1. Control e identidad

- **Frente:** Publicabilidad.
- **Repositorio propietario:** SeryMente/khora; el término «Cora» del enunciado se conserva en el original y se normaliza operativamente a Khora conforme al canon de Metodología.
- **Ruta del OCP:** docs/frentes/publicabilidad/OBJETO-CANONICO.md.
- **Versión documental:** v0.4 · objeto provisional de investigación.
- **Sello:** PUBLICABILIDAD-v0.4.
- **Estado:** PROVISIONAL-v0.4; se amplía el alcance a propagación/publicación transversal y se incorpora el mapa preliminar de dependencias y la matriz de escenarios G01–G12. Siguen pendientes la validación completa del inventario, pruebas no productivas y diagnóstico de CI. El frente no autoriza despliegues productivos.
- **Rama en la que se preparó esta entrega:** publicabilidad/inauguracion-20261028. No está integrada en main.
- **Folio de este evento:** SES-20261028-PR8V6M2Q. Es un folio de evento/operación, no un identificador nativo de conversación.
- **Titularidad operativa:** sin titular exclusivo asignado en CONTROL-RESPONSABILIDAD.json. La instrucción inaugura el frente, pero no se ha registrado una transferencia de responsabilidad exclusiva a esta instancia.
- **Última referencia normativa realmente leída:** DUG v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob del documento normativo b2ff2845a5a99dc4ce3cafafc4f8e43607d48145. Fuente: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html.
- **MCP-NORMATIVO:** DESACTIVADO; se consultó manualmente la fuente y las secciones pertinentes.

## 2. LEER PRIMERO

Este frente investiga y diseña el sistema transversal de propagación y publicación de los activos de SeryMente, incluidos los repositorios y destinos externos que dependen de ellos. No autoriza por sí mismo a publicar producción, cambiar configuración, modificar secretos, ejecutar migraciones, alterar ramas principales, comprar servicios o activar facturación. Desktop Commander Remote queda reservado para diagnosticar/reproducir fallas de GitHub/CI cuando se identifique un caso reproducible localmente; para cualquier uso distinto debe avisarse previamente y esperarse autorización expresa.

En cada ciclo:
1. Releer la versión vigente de la Metodología desde main, confirmar su versión/blob y volver a comprobar el OCP y este control.
2. Verificar el estado vivo de GitHub y Vercel: commit de main, último despliegue de producción, rama y SHA del despliegue, estado y URL efectiva.
3. Distinguir fuente observada, hipótesis, propuesta, cambio implementado y resultado probado.
4. Antes de una modificación a main, revisar qué workflows se disparan. En el estado inicial, un push a main dispara Deploy to Production (Vercel), que ejecuta una migración de runtime antes de construir y publicar. No fusionar esta rama sin valorar ese efecto.
5. Preferir una fuente de verdad para el despliegue de producción. No introducir una segunda vía de publicación paralela sin decidir cómo se evita el doble despliegue, los builds redundantes y los resultados de carreras.
6. No almacenar tokens, secretos, variables descifradas, URLs de Deploy Hook secretas ni credenciales en este objeto.
7. No tratar READY como prueba suficiente de que el dominio público responde correctamente, que la última revisión de main está desplegada, que la aplicación es accesible sin SSO o que la experiencia funciona extremo a extremo.

## 3. Referencia metodológica

Fuente canónica: SeryMente/metodologia/main, documento único DUG. Revalidar versión y blob en cada ciclo; no tratar esta copia de estado como una regla normativa paralela. Se aplican Metacanon §4 para la salida de cada ciclo, las compuertas de creación y persistencia, el control de responsabilidad, la no simulación y las políticas obligatorias de la plataforma.

## 4. Propósito y alcance

### Propósito dictado directamente por el operador (verbatim)

El propósito del frente de trabajo Publicabilidad es explorar los límites que supone el utilizar una cuenta gratuita de Vercel para disponer de una versión de producción conectada al repositorio de Cora, que nos permita publicar los cambios que hacemos desde las plataformas de inteligencia artificial de manera fluida, a ver cuáles son los límites de la cuenta gratuita de Vercel, poder saber cuándo se puede publicar, si se puede publicar, por ejemplo, desde la plataforma de ChatGPT, utilizando el complemento nativo sin tener que utilizar una conexión RDC local para acceder a la terminal y poder publicar desde CLI, etcétera. es decir, para saber cuáles son nuestras opciones a la hora de necesitar publicar la versión, por ejemplo, principal del repositorio Cora en la aplicación web. Investígalo con mucho cuidado, porque lo más importante es no el beneficio en el corto plazo de simplemente publicaría, sino disponer de algo que nos beneficie sistémicamente en la mayor medida posible. No importa que no sea a corto plazo y no importa que no sea cómodo estar teniendo que programar todo este sistema a fin de que el resultado final tenga el mayor alcance posible. Es por eso que te pido que no me lo des de la manera sencilla, sino más bien que te tomes tu tiempo para investigar todas las aristas, que conforme a lo que te digo en esta instrucción al inicio, puedas identificar como posibles para el frente de trabajo.

### Interpretación operativa separada

Investigar, con prioridad sistémica y no por rapidez inmediata, las opciones sostenibles para publicar la versión de Khora que corresponde a la rama principal de su repositorio en la aplicación web. Determinar los límites y condiciones del plan Vercel Hobby observado, cómo se dispara la producción, si la publicación desde ChatGPT mediante integración MCP puede ejecutarse sin RDC/CLI local, qué autenticación y capacidades dependen del plan de ChatGPT, cómo saber de forma fiable cuándo una versión puede publicarse y cómo verificar que el dominio sirve exactamente el commit esperado.

El resultado objetivo no es un botón que intente desplegar sin contexto: es un circuito reproducible, observable, de bajo riesgo operativo, con trazabilidad de commit a URL de producción, protección de cuotas, recuperación ante fallos y opción de migrar de plataforma si los límites contractuales o técnicos lo justifican.

### Incluido

- Vercel Hobby: elegibilidad, cuotas publicadas, consumo, pausas y riesgos de crecimiento.
- Configuración del proyecto Vercel khora-web y conexión a SeryMente/khora.
- GitHub Actions existente, integración Git nativa de Vercel y despliegue mediante MCP/API/CLI.
- Publicación desde plataformas de IA sin una terminal local, incluida la capacidad real de la sesión de ChatGPT y sus restricciones por plan.
- Separación preview/production, puertas de calidad, autorización, trazabilidad exacta, smoke tests, rollback, concurrencia, seguridad de tokens y costes.
- Alternativas de hosting cuando exista un motivo documentado para evaluarlas.
- Evidencia verificable del comportamiento real, no solamente lectura documental.

### Excluido por ahora

- Desplegar una nueva versión a producción.
- Cambiar variables de entorno, secretos, dominios, protección SSO, plan/cuenta, registros DNS o configuración del proyecto Vercel.
- Añadir o rotar tokens, crear un Deploy Hook, comprar servicios o activar facturación.
- Cambiar la aplicación o su arquitectura de ejecución.
- Considerar que la existencia de una herramienta MCP en esta sesión garantiza que todas las cuentas y planes de ChatGPT la exponen.

## 5. Roles y colaboración

- **Asistencia (Claudia):** investigar las fuentes oficiales, extraer evidencia vigente, detectar divergencias entre la configuración declarada y la observada, desarrollar alternativas y criterios de aceptación, conservar trazabilidad y preparar instrucciones de implementación sin desplegar por cuenta propia.
- **Construcción (Samantha):** implementar únicamente cambios aprobados al mecanismo elegido, con diffs acotados, comprobación de seguridad, pruebas y lectura de vuelta del resultado.
- **Operador:** conserva las decisiones materiales: elegibilidad de uso comercial de Hobby, elección de la autoridad de publicación, activación de costes, cambios de seguridad, fusiones/producción que impliquen efectos operativos y cambios de proveedor.

Los roles son los roles de este frente, no afirmaciones de que el proveedor/modelo de una instancia determine el rol. El control de responsabilidad sigue sin titular exclusivo asignado.

## 6. Autoridad y decisiones vigentes

- Es una instrucción expresa inaugurar e investigar el frente y preservar literalmente el propósito suministrado.
- Se autoriza documentar hechos, opciones, diferencias, riesgos y un plan. No se autoriza un despliegue productivo ni una mutación de secretos/configuración.
- La fuente DUG v359 · NX-359m consultada en el ciclo 03 es la referencia normativa adquirida para este ciclo; deberá refrescarse antes de cada ciclo material.
- La publicación debe conservar relación demostrable entre commit, artefacto, deployment ID, estado, dominio y prueba posterior.
- La cuenta Hobby observada no se debe considerar apta para producción comercial hasta resolver la condición contractual de uso personal/no comercial.

## 7. Perfil técnico observado

### GitHub

- Repositorio: https://github.com/SeryMente/khora.
- Rama principal observada al instanciar: main, commit 595a1db89daa087315ef9844b0d9fc50aa8fc5a6.
- La rama contiene un workflow de producción y flujos independientes de calidad/CI.
- El commit que se utiliza como base es una captura temporal; reconsultar main antes de cualquier decisión o escritura posterior.

### Vercel

- Equipo/cuenta observada: “victorhugotorresmendez-8991's projects”.
- Plan observado mediante conexión: Hobby.
- Proyecto: khora-web, ID prj_hRN86BKITXYKTnNlp0ygVhaMwFfx.
- Repositorio enlazado: SeryMente/khora.
- Framework observado: Next.js; Node configurado: 24.x.
- Dominio asociado/validado en la respuesta de la API: khora-web.vercel.app.
- La respuesta del proyecto señala SSO habilitado con alcance all_except_custom_domains, y live=false; otra consulta identifica un despliegue de producción READY con el dominio khora-web.vercel.app. La accesibilidad anónima y el estado efectivo del dominio no están demostrados y requieren una comprobación sin autenticación.
- Último despliegue de producción leído: ID dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, READY, destino production, creado 2026-10-24T21:59:10.581Z, rama main, SHA b528660e16552633d232a2397cbe42441a03438c.
- **Lectura de frescura posterior:** el 2026-10-29T01:40:34Z, main se observó en 4cdedc37f32446e06d1a8bede40657b7d43cba41, 86 commits por delante del SHA productivo b528660e16552633d232a2397cbe42441a03438c. El deployment productivo leído seguía siendo dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH. Revalidar la diferencia al retomar; no interpretar que todo el delta deba publicarse.
- Consumo actual y cuota restante: NO VERIFICADOS. La herramienta disponible permitió leer plan/proyectos/despliegues, no el panel de consumo restante.

## 8. Estado vivo y conclusión de la auditoría inicial

**Conclusión principal:** no se debe añadir otra tubería de publicación hasta auditar la ya existente. El repositorio dispone de una integración Vercel/Git y un workflow de GitHub Actions que despliega a producción con Vercel CLI en un runner alojado; la versión productiva observada está desfasada de main y las ejecuciones recientes consultadas de CI/UI/deploy terminan en fallo casi inmediatamente.

Esto no demuestra la causa de los fallos: las herramientas disponibles no devolvieron logs ni pasos de los jobs (las solicitudes de logs respondieron BlobNotFound). No concluir sin pruebas que faltan secretos, que la cuota gratuita se agotó o que Vercel es la causa.

Hallazgos específicos:
1. La configuración de Vercel indica conexión con el repositorio y existen despliegues preview producidos desde ramas Git. La conexión por sí sola no demuestra qué mecanismo debe gobernar la producción.
2. .github/workflows/deploy-production.yml publica al hacer push a main o mediante workflow_dispatch; usa Vercel CLI en GitHub Actions, requiere VERCEL_TOKEN, VERCEL_ORG_ID y VERCEL_PROJECT_ID, y crea el archivo de provenance de main.
3. Ese workflow aplica una migración de runtime antes del build/deploy. Hay que comprender su idempotencia, reversibilidad y por qué ese orden es necesario antes de reutilizar la tubería.
4. El workflow de producción usa concurrency cancel-in-progress=true, lo que puede cancelar una ejecución activa cuando entra otra. Es un riesgo de carreras/cancelación que debe evaluar la fase de corrección.
5. El workflow crea el registro Deployment de GitHub con required_contexts vacío; las ejecuciones de CI y UI Quality son independientes. El diseño actual no prueba una compuerta de release que espere el conjunto completo de checks de calidad.
6. .github/workflows/post-deploy-smoke.yml comprueba khora-ten.vercel.app; el workflow de producción comprueba khora-web.vercel.app. El contrato de URL debe reconciliarse antes de tomar un smoke verde como evidencia de la versión que ve el usuario.
7. En las ejecuciones recientes observadas los workflows CI, UI Quality, Deploy to Production y otros terminaron en failure en unos pocos segundos. No se obtuvo el motivo ni los logs de ejecución.
8. La protección SSO y el campo live=false en la respuesta del proyecto requieren inspección adicional para saber si el dominio Vercel es accesible sin iniciar sesión.
9. Una segunda forma de desplegar directamente desde MCP podría coexistir con Git Integration y GitHub Actions. Antes de habilitarla como vía recurrente, definir cuál camino activa producción y cómo impedir builds duplicados y diferencias de provenance.

### Matriz preliminar de vías

| Vía | Evita RDC/CLI local | Mejor uso | Riesgo/condición |
|---|---|---|---|
| Integración Git nativa de Vercel | Sí | Preview automática por rama/PR y producción al publicar en la rama productiva configurada | Revisar rama productiva, protección, cuotas y duplicación con Actions |
| GitHub Actions + Vercel CLI alojado | Sí | CI/release con tests, registro de deployment y verificación exacta del SHA | Depende de secretos y del estado de Actions; hoy la producción es antigua y las últimas ejecuciones fallan |
| Vercel MCP desde ChatGPT con escritura habilitada | Sí | Inspección y preview; producción solo si lo permite el release aprobado | OpenAI documenta MCP completo con escritura para Business/Enterprise/Edu; Pro se limita a lectura/obtención. Free no está acreditado para escritura. |
| Dashboard de Vercel con rama/SHA Git | Sí | Reintento/manual de un commit exacto bajo revisión humana | No sustituye una compuerta automatizada y puede ocultar la causa de una tubería rota |
| Deploy Hook | Sí | Trigger limitado de una rama desde otro sistema | URL funciona como secreto portador; quien la tenga puede dispararla; no es por sí sola un control de release |
| API/SDK con una orquestación propia | Sí | Futuro mecanismo unificado que comprueba precondiciones, registra evidencias y verifica despliegue | Mayor coste de implementación/seguridad; token y permisos mínimos; no construir hasta conocer la causa actual |
| Vercel CLI mediante RDC local | No | Último recurso para artefactos realmente locales o un build preconstruido | Dependencia de equipo, sesión, credenciales y estado local; menor reproducibilidad si no coincide con un SHA del remoto |

## 9. Arquitectura objetivo propuesta, todavía no aprobada

1. **Una autoridad de producción:** elegir, luego de la auditoría, entre Git Integration como publicador automático o el workflow alojado de Actions. No mantener dos caminos que promuevan a producción por separado.
2. **Cambios IA → rama/PR:** el código producido por plataformas de IA se conserva en Git con commit y SHA verificables. No desplegar directamente un estado local que no esté representado por el repositorio, excepto como excepción explícita.
3. **Preview automática:** por cada rama/PR, usar la capacidad disponible de Vercel para revisar el artefacto sin sustituir producción.
4. **Compuerta de calidad:** verificar CI, typecheck, contratos UI, pruebas unitarias y pruebas E2E aplicables sobre el mismo candidato. La existencia de un workflow o de un build no prueba que todos los checks relevantes pasaron.
5. **Release controlado:** solo una fuente crea/promueve el despliegue productivo. Registrar SHA exacto, URL/deployment ID, estado, hora, checks y autoridad de la acción.
6. **Verificación postdespliegue:** confirmar que el alias de producción sirve el SHA esperado, que responde correctamente sin depender de una sesión SSO no prevista y que los smoke tests prueban el dominio realmente vigente.
7. **Recuperación:** rollback previamente probado y procedimiento que identifique qué despliegue puede restaurarse bajo Hobby. Evitar cancelaciones/carreras y cambios de base de datos irreversibles.
8. **Guardas de consumo/contrato:** verificar plan, consumo restante y uso comercial antes de un release cuando sea material. Un despliegue rechazado por cuotas o un sitio pausado no debe confundirse con una build correcta.
9. **Portabilidad:** separar la descripción del proceso de publicación de Vercel (commit → build → verificación → release) para mantener la posibilidad de migrar a otra plataforma con menor dependencia del proveedor.

No se aplicó ninguna de estas modificaciones durante la inauguración.

## 10. Criterios de aceptación del frente

El frente no se considera terminado hasta que:
- la elegibilidad contractual y el presupuesto/consumo del plan estén comprobados;
- se haya identificado la causa de las ejecuciones fallidas recientes o se haya documentado exactamente qué evidencia lo impide;
- se haya reconciliado el desfase entre main y producción y decidido explícitamente cuál commit debe quedar publicado;
- exista un único mecanismo autoritativo de producción y se haya resuelto la coexistencia con Vercel Git, Actions y MCP;
- una prueba no productiva demuestre el camino elegido sin RDC local y con logs accesibles;
- una publicación autorizada demuestre SHA → deployment → URL productiva → smoke, y las condiciones de rollback estén claras;
- queden documentados los límites reales de uso, costes y continuidad ante cuota excedida;
- el OCP y sus evidencias hayan sido releídos después de persistir.

## 11. Pendientes priorizados

- **P0 — Diagnóstico de despliegue:** obtener evidencia legible de una ejecución fallida de Deploy to Production y de los workflows de calidad; revisar los resultados desde GitHub Actions/Vercel sin revelar secretos.
- **P0 — Estado de producción:** comparar el SHA actual de main con el SHA del despliegue productivo; determinar si la publicación está atascada, deshabilitada, protegida o fallida; verificar acceso anónimo real.
- **P0 — Contrato de Hobby:** confirmar si el uso es personal/no comercial conforme a las condiciones de Vercel. Si es comercial, comparar las alternativas permitidas antes de formalizar la arquitectura.
- **P1 — Una sola autoridad:** mapear los triggers efectivos de Vercel Git y Actions, sus ramas, configuraciones de proyecto, protecciones y el riesgo de despliegues duplicados.
- **P1 — Corregir contrato del smoke:** establecer el dominio productivo autoritativo y alinear el smoke de la aplicación con él.
- **P1 — Puerta de calidad y migración:** evaluar la ejecución previa de tests, el orden de la migración runtime y las reglas de concurrencia/cancelación del workflow.
- **P1 — MCP directo:** precisar la disponibilidad de permisos de escritura desde el plan/conector de ChatGPT real del operador, y probar primero con un preview anclado a un SHA.
- **P2 — Cuotas reales:** capturar el panel de Usage por equipo y proyecto, comparar consumo y resets con los límites publicados, y establecer alertas/preflight sustentados.
- **P2 — Portabilidad/alternativas:** comparar compatibilidad de Next.js y APIs/server actions con alternativas de hosting solamente después de inventariar las dependencias reales de la aplicación y el condicionante comercial.

## 12. Crónica y persistencia

- Instrucción fundacional literal: originales/INSTRUCCION-FUNDACIONAL-2026-10-28.txt.
- Investigación y fuentes oficiales: evidencias/INVESTIGACION-INICIAL-2026-10-28.md.
- Investigación documental del ciclo 03: evidencias/INVESTIGACION-CICLO-03-2026-10-29.md.
- Investigación documental del ciclo 04: evidencias/INVESTIGACION-CICLO-04-2026-10-29.md.
- Mapa preliminar de dependencias y propagación: MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md.
- Matriz de escenarios de propagación transversal G01–G12: evidencias/MATRIZ-ESCENARIOS-PROPAGACION-TRANSVERSAL-v0.1.md.
- Matriz preliminar de escenarios y secuencias: evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.2.md.
- Evento de inicialización: cronica/PUBLICABILIDAD-INSTANCIACION-01.md.
- Crónica del ciclo 02 y ampliación del alcance situacional: cronica/CICLO-02-PSP.md.
- Crónica del ciclo 04 y ampliación transversal: cronica/CICLO-04-ALCANCE-TRANSVERSAL.md.
- Control actual: CONTROL-RESPONSABILIDAD.json.
- Prompts para futuras instancias: prompts/ASISTENTE.md y prompts/CONSTRUCTOR.md.

Al cerrar cada ciclo, actualizar el OCP y su crónica, enlazar los originales y la evidencia, indicar la referencia normativa realmente adquirida y releer los archivos modificados. No se ha efectuado ningún despliegue productivo ni se han cambiado secretos/configuración de Vercel en este ciclo.


## 13. Criterio obligatorio de eficiencia situacional

La investigación debe descubrir y documentar, no suponer, la secuencia más eficiente para cada escenario material. La unidad de análisis combina las capacidades reales de la plataforma, permisos, estado de GitHub/Vercel, objetivo (preview/producción), salud de los workflows, disponibilidad de logs y presencia o ausencia de RDC.

Orden de evaluación:
1. Cumplir contrato, autorización, permisos y seguridad.
2. Preservar calidad y trazabilidad SHA → deployment → URL → prueba.
3. Evitar publicaciones duplicadas, efectos repetidos y carreras.
4. Minimizar trabajo manual, latencia, reintentos, cuotas y dependencias locales.
5. Conservar punto de parada, recuperación y éxito observable.

No considerar más eficiente una secuencia que omite migraciones, pruebas, provenance o verificación. Medir pasos, transiciones, efectos, tiempos, reintentos y consumo cuando sea posible; de lo contrario, marcar «no medido».

## 14. Cobertura objetivo del PSP v1.0

El PSP debe cubrir los escenarios de la matriz preliminar: MCP con escritura; MCP solo lectura; ChatGPT Free sin escritura MCP acreditada; MCP ausente/permiso/OAuth; timeout ambiguo; build o cuota; Actions sano/fallando; Git con/sin preview; ausencia de escritura Git remota; RDC/CLI contingente; deployment READY con acceso público no probado; rollback; y diferencia entre cambios locales, branch remoto y main.

La cobertura no se afirmará como universal. Debe agrupar combinaciones con igual procedimiento y especificar precondiciones, pasos, fallback, decisiones de continuar/reintentar/cambiar/detenerse, controles de seguridad/coste/idempotencia, éxito observable y evidencia persistida.

## 15. Hechos que cambian la elección de vía

- OpenAI no acredita escritura MCP para ChatGPT Free; comprobar la sesión real y cambiar de ruta si no hay escritura, sin repetir intentos.
- Pro queda documentado como custom MCP de lectura/obtención; Business/Enterprise/Edu dispone de MCP completo sujeto a permisos del workspace.
- Vercel Hobby está limitado a uso personal/no comercial; el uso real de Khora no se ha clasificado y Usage no está verificado.
- Actions, CI y UI fallan rápidamente según los runs observados; la causa sigue no determinada. No usar workflow_dispatch a ciegas.
- Al 2026-10-29T02:15:30Z, main es 4bd68f7bf72ddcd068713eb704b37339d5c25a9f; producción observada es b528660e16552633d232a2397cbe42441a03438c, delta 97 commits. No publicar el HEAD solo porque sea más reciente.
- RDC no es el primer fallback ante MCP fallido. Clasificar si el problema es de plan, permiso, timeout, build o cuota, y verificar la conexión RDC antes de una acción local.

## 16. Alcance provisional y condición para v1.0

Esta sección describe un corte anterior del OCP v0.2 y se conserva como antecedente; la ampliación transversal y el estado vivo vigente se registran en las secciones añadidas al final de este documento. El PSP v1.0 requiere secuencia para la contingencia «ChatGPT Free → escritura MCP no disponible → herramientas Git remotas no disponibles → RDC/CLI», con bloqueos y comprobación; runbook de CLI cotejado con la migración/runtime/provenance/smoke; diagnóstico de Actions o fuente alternativa de logs; un solo publicador productivo; y ensayos no productivos cuando estén autorizados.

Cada paso debe distinguirse como documentado, observado, probado o pendiente. Escribir una secuencia no equivale a haberla ejecutado. Publicabilidad sigue siendo de investigación y documentación.

## 17. Relectura de frescura · ciclo 03 · 2026-10-29

Fuente normativa adquirida: Documento Único de Gobernanza (DUG) de Ser y Mente · Samantha v359; NX-359m; Metacanon 1.24; GOW 2.8; blob b2ff2845a5a99dc4ce3cafafc4f8e43607d48145. Fuente única: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html. Las referencias metodológicas de ciclos anteriores son antecedentes históricos.

### Estado observado

- GitHub main: e463e0c6efa857f4c4229894a96fab747a8a7574.
- Producción Vercel consultada: dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, SHA b528660e16552633d232a2397cbe42441a03438c, estado READY, URL khora-ouns596t1-victorhugotorresmendez-8991s-projects.vercel.app, creada 2026-10-24T21:59:10.581Z.
- La comparación de GitHub informa 102 commits de diferencia entre main y producción. El delta no significa que todos los cambios deban desplegarse.
- Deploy to Production run 40807127395 falló en unos dos segundos; el job devolvió runner vacío y steps vacíos. CI 40807127325 y UI Quality 40807127357 mostraron jobs con el mismo patrón. Los logs consultados devolvieron BlobNotFound. La causa raíz sigue NO DETERMINADA; el patrón es compatible con un fallo anterior a los steps o de asignación/inicialización del runner, pero no demuestra causa.
- GitHub reportó protected=false para main. Branch protection y rulesets devolvieron 403 a la integración; no puede afirmarse que no exista ninguna otra regla. El propietario debe verificar la configuración y política efectiva.
- Vercel sigue reportando el proyecto khora-web vinculado a SeryMente/khora en Hobby. La última producción por target sigue siendo la identificada arriba. La API informa SSO con alcance all_except_custom_domains, pero no se probó de forma concluyente acceso anónimo al dominio. Usage/cuota restante tampoco se pudo consultar.
- Los logs de build de la última producción muestran el comando configurado en Vercel incluyendo node scripts/migrate-runtime.mjs antes de next build --webpack; el workflow de GitHub también ejecuta explícitamente migrate-runtime.mjs antes de vercel build --prod. Es una posible doble invocación, no una ejecución doble demostrada en un mismo run. Varios SQL incluyen guardas IF NOT EXISTS, pero no se ejecutó prueba de idempotencia ni de concurrencia.
- El workflow de producción hace smoke a khora-web.vercel.app, mientras .github/workflows/post-deploy-smoke.yml consulta khora-ten.vercel.app. La URL canónica del smoke no está reconciliada.
- La documentación y herramientas Vercel MCP permiten crear deployments preview o production por fuente Git/archivos. Esto no prueba que todos los planes/clientes ChatGPT expongan escritura ni que una acción MCP preserve automáticamente migración, provenance, checks y smoke. Este ciclo usó solo herramientas Vercel de lectura.

### Decisiones y compuertas derivadas

1. Mantener bloqueada cualquier publicación productiva hasta disponer de evidencia diagnóstica razonable de Actions, seleccionar explícitamente el candidato, elegir una autoridad productiva, reconciliar el comando de migración, decidir una URL smoke y comprobar el acceso esperado.
2. Pedir al propietario que revise Actions billing/usage, capacidad de hosted runners, permisos/configuración de Actions y estado del servicio en la ventana de los fallos. No ejecutar workflow_dispatch ni reintentos a ciegas.
3. Confirmar en Settings la protección efectiva de main/rulesets; esta investigación no cambia la configuración.
4. Determinar elegibilidad contractual de Hobby y consultar el saldo de Usage en dashboard; el plan por sí solo no prueba cuota disponible.
5. Hacer prueba de acceso anónimo y un preview explícito por SHA solo cuando exista autorización para ese ensayo.
6. No usar Vercel MCP como un segundo publicador de producción hasta resolver autoridad única y equivalencia de controles.

### Evidencias primarias

- Main: https://github.com/SeryMente/khora/commit/e463e0c6efa857f4c4229894a96fab747a8a7574
- Deploy to Production fallido: https://github.com/SeryMente/khora/actions/runs/40807127395
- CI fallido: https://github.com/SeryMente/khora/actions/runs/40807127325
- UI Quality fallido: https://github.com/SeryMente/khora/actions/runs/40807127357
- Workflow de producción: https://github.com/SeryMente/khora/blob/main/.github/workflows/deploy-production.yml
- Workflow smoke: https://github.com/SeryMente/khora/blob/main/.github/workflows/post-deploy-smoke.yml
- Vercel Hobby, límites y protección: https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits ; https://vercel.com/docs/deployment-protection
- Vercel MCP create deployment: https://vercel.com/docs/agent-resources/vercel-mcp/tools/deployments/create_deployment
- Permisos MCP en ChatGPT: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt

Límites de la observación: no se recuperaron logs legibles de Actions, no se consultó saldo Usage, no se hizo una petición HTTP anónima concluyente, no se ejecutaron build o migraciones, no se probó preview/MCP de escritura/rollback/RDC/CLI. No hubo cambios a main, secretos, variables, settings de Vercel o deployments.

## 18. Ampliación expresa de alcance · ciclo 04 · 2026-10-29

### 18.1 Definición transversal

La instrucción del operador amplía Publicabilidad: no se limita a subir la última versión de KHORA a Vercel. Incluye los cambios que deban propagarse entre **todos los repositorios de la organización SeryMente** y las plataformas/destinos que consuman sus activos, por ejemplo:

- gobernanza y método del repositorio `SeryMente/metodologia`, junto con las superficies de trabajo de modelos donde se aplican instrucciones, prompts, contexto o documentación derivada;
- código, CI, runtime, migraciones, dominios y publicación de KHORA;
- código personalizado y activos públicos de marketing/contenido del sitio Ser y Mente (WordPress/Divi);
- el instrumento público de comunicación Otro Gran Programa, incluido su contenido y runtime estático/PWA;
- extensiones y sus dependencias instalables, como Signal Interpreter y Gestor de Procesos/GDP;
- repositorios auxiliares y documentales identificados o que se identifiquen posteriormente, incluidos `khora-effectif`, `personal` y `tercer-ambito`;
- cualquier otro repositorio o destino de la organización que aparezca al completar el inventario.

El operador establece además que Otro Gran Programa es el proyecto insignia y que necesita que KHORA/CoMind y Metodología se construyan para resolver su objetivo. Esto se registra como dependencia estratégica de alto nivel; las aristas técnicas concretas siguen pendientes de descubrimiento. El repositorio `SeryMente/otrogranprograma` se identifica como instrumento público de comunicación, no necesariamente como el conjunto completo de componentes del programa.

La instrucción fundacional literal de §4 se conserva sin alteraciones. Esta ampliación fija el alcance sistémico alrededor de esa instrucción, no la reemplaza.

### 18.2 Regla arquitectónica: fuente canónica por activo y propagación explícita

No debe imponerse una única fuente universal para todos los activos. Cada activo conserva su repositorio/OCP/plataforma canónica pertinente. Publicabilidad debe registrar las aristas entre esa fuente y cada destino dependiente, con revisión de origen, mecanismo, autorización, orden, precondiciones, señal de éxito, recuperación y lectura de vuelta.

Una propagación se declara terminada únicamente cuando todos los destinos aplicables figuran como actualizados y verificados, o cuando cada excepción queda expresamente bloqueada/pendiente con impacto y responsable de resolución. No tratar un commit, una sincronización intentada, un deployment READY, una instalación preparada o una respuesta HTTP aislada como prueba universal de consistencia.

### 18.3 Catálogo preliminar y cobertura conocida

La búsqueda organizacional devolvió nueve repositorios: `khora`, `khora-effectif`, `metodologia`, `serymente`, `otrogranprograma`, `signal-interpreter`, `GDP`, `personal` y `tercer-ambito`. Es una enumeración inicial, no garantía de exhaustividad. El mapa específico está en [MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md](MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md); los escenarios se encuentran en [MATRIZ-ESCENARIOS-PROPAGACION-TRANSVERSAL-v0.1.md](evidencias/MATRIZ-ESCENARIOS-PROPAGACION-TRANSVERSAL-v0.1.md).

Las rutas de WordPress/Divi, GitHub Pages/PWA, extensiones, Apps Script y plataformas de modelos no se consideran probadas hasta validar los settings, mecanismos de publicación, versiones/destinos efectivos y pruebas pertinentes. La matriz PSP de Khora/Vercel sigue siendo un subconjunto y no representa por sí sola el frente completo.

### 18.4 Hecho nuevo de CI y regla de Desktop Commander Remote

El run de CI `40900763575` de esta misma rama falló sobre el SHA `c364fea2750d4f67b3dbae41285e1835cefb5503`. Los jobs `khora-web-gate`, `api-tests` y `calidad` terminaron en 1–2 segundos con `runner_id=0`, nombre de runner vacío y `steps=[]`; los logs solicitados devolvieron `BlobNotFound`. No existe en la evidencia consultada un step o comando concreto para reproducir localmente esta falla. La causa raíz permanece **NO DETERMINADA** y este ciclo no usó RDC.

RDC puede usarse para una reproducción local específica de una falla GitHub/CI cuando ya exista una señal/comando reproducible. No usarlo para inspección general, otros archivos personales, operaciones locales ajenas o tareas distintas. Para cualquier necesidad distinta de esa reproducción, avisar antes y esperar autorización expresa.

### 18.5 Estado vivo revalidado en ciclo 04

- `main` observado en `e463e0c6efa857f4c4229894a96fab747a8a7574`.
- Rama documental al inicio del ciclo: `publicabilidad/inauguracion-20261028`, HEAD `c364fea2750d4f67b3dbae41285e1835cefb5503`; los commits de este ciclo son posteriores y permanecen en esa rama.
- Último deployment filtrado como `target=production`: `dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH`, READY, SHA `b528660e16552633d232a2397cbe42441a03438c`, creado 2026-10-24T21:59:10Z. No se ha acreditado aquí que main o la rama documental se hayan publicado.
- El objeto del proyecto Vercel devuelve un `latestDeployment` READY `dpl_4NQWjXhtdaf9MWx2VDbVrdSZUXvm` con `target=null`; no se interpreta como producción.
- Las lecturas actuales no demuestran cuota disponible, acceso anónimo, protección efectiva completa de main, ni la URL canónica de smoke.
- La investigación completa del ciclo y sus límites se registra en [INVESTIGACION-CICLO-04-2026-10-29.md](evidencias/INVESTIGACION-CICLO-04-2026-10-29.md).

### 18.6 Orden de trabajo resultante

1. Confirmar el catálogo completo de repositorios y destinos externos con evidencia de propietario.
2. Diagnosticar GitHub Actions; obtener logs legibles/configuración/estado de runner. Solo activar RDC cuando haya reproducción local concreta.
3. Resolver las compuertas P0 de KHORA antes de cualquier release: autoridad única, migración, SHA candidato, URL smoke y criterios de acceso.
4. Identificar y verificar los espejos concretos de Metodología usados en plataformas de modelos; registrar la reconciliación de la divergencia observada en su README conforme al gobierno del repositorio propietario.
5. Confirmar los mecanismos y pruebas reales de los destinos WordPress/Divi y GitHub Pages; definir la cadena de artefactos de Signal Interpreter y GDP.
6. Caracterizar `khora-effectif` y cualquier repositorio/activo adicional sin inferir sus funciones.
7. Automatizar checks de propagación solo después de conocer los permisos, API, contrato y mecanismo real de cada destino.

**Límites:** esta ampliación es documental y preliminar. No autoriza publicación productiva, cambios de código de producto, edición de otros repositorios, modificación de secretos/configuración ni despliegues. No se cambió `main`, Vercel, WordPress, GitHub Pages, Apps Script, datos externos ni plataformas de modelos en este ciclo.
