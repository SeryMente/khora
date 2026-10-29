# Investigación inicial · Publicabilidad

**Fecha local de corte:** 2026-10-28, America/Mexico_City.  
**Referencias normativas leídas:** DUG v358 · NX-358m; Metacanon 1.23; GOW 2.7; blob 89a28e4d05f5baab9c4b86abdb9fbfc532690c75.  
**Fuente de aplicación:** SeryMente/khora, main.  
**Alcance:** investigación documental, lectura de GitHub/Vercel y estado de flujos publicados. No se ha ejecutado deployment, cambiado configuración de Vercel ni leído secretos.

## 1. Resumen ejecutivo

Vercel Hobby ya está conectado con Khora y la conexión actual de esta sesión expone herramientas Vercel capaces de inspeccionar y crear deployments desde una fuente Git. Por ello, publicar sin RDC/CLI local es técnicamente viable en varias formas. La decisión sistémica importante es seleccionar una autoridad de producción y arreglar el pipeline actual antes de añadir otro.

La configuración existente combina una conexión Git de Vercel, que produce despliegues desde ramas, y GitHub Actions, que ejecuta la CLI alojada para producir una publicación de producción. La última producción observada es anterior al HEAD de main. Los últimos workflows consultados —incluido Deploy to Production— fallaron casi inmediatamente; sus logs no fueron recuperables con las herramientas disponibles. El workflow de smoke test apunta a khora-ten.vercel.app, pero el dominio de producción observado para khora-web es khora-web.vercel.app. Esto impide presumir que la tubería sea saludable solo porque el proyecto está conectado.

**Recomendación actual:** restaurar y verificar el camino existente antes de diseñar un publicador nuevo. No desplegar automáticamente el HEAD actual por el solo hecho de que esté 81 commits por delante. Primero debe reconciliarse qué versión se quiere publicar, la causa del fallo, la condición contractual de Hobby y la protección del dominio.

## 2. Evidencia observada

### 2.1 Repositorio y aplicación

- Repositorio consultado: https://github.com/SeryMente/khora.
- HEAD de main en el momento de abrir esta rama: 595a1db89daa087315ef9844b0d9fc50aa8fc5a6, commit del 2026-10-29T01:38:26Z. La rama de investigación se creó desde ese HEAD; main puede avanzar después.
- Lectura posterior de frescura, 2026-10-29T01:40:34Z: main avanzó a 4cdedc37f32446e06d1a8bede40657b7d43cba41. El último deployment de producción seguía en b528660e16552633d232a2397cbe42441a03438c; el delta observado pasó a 86 commits. Esta actualización no cambia la base de la rama de investigación.
- Se leyó el manifiesto khora-web/package.json, blob 9d3124a7a0cbd231d7eb5451b541c501d2b407f5. La app declara Next.js, versión 0.3.8, Node 24.x en la configuración de Vercel.
- El script prebuild de la aplicación ejecuta typecheck, revisión UI, contrato de navegación, pruebas unitarias, preflight de experiencia y compilación de extensión. Debe comprobarse en los logs reales del build qué pasos se ejecutan, con qué resultado y si coinciden con la suite de CI/E2E requerida.
- No se encontró khora-web/vercel.json en la revisión consultada.
- Los workflows de calidad están repartidos entre CI y UI Quality. Ambos usan checks para la aplicación web; UI Quality también corre Playwright sobre un subconjunto de E2E.

Fuentes de aplicación:  
https://github.com/SeryMente/khora/blob/main/khora-web/package.json  
https://github.com/SeryMente/khora/blob/main/.github/workflows/ci.yml  
https://github.com/SeryMente/khora/blob/main/.github/workflows/ui-quality.yml

### 2.2 Cuenta y proyecto Vercel

La conexión disponible informó el equipo “victorhugotorresmendez-8991's projects”, team ID team_QBa5UlffJWznZ8ogFfKjaGQb, con plan Hobby. El contexto Git identificó el proyecto khora-web (ID prj_hRN86BKITXYKTnNlp0ygVhaMwFfx) enlazado al repositorio SeryMente/khora. La app se detectó como Next.js y Node 24.x. El dominio khora-web.vercel.app aparece asociado y verificado.

La consulta del proyecto muestra SSO habilitado con alcance all_except_custom_domains y live=false; otra llamada encontró un deployment de producción READY y un alias khora-web.vercel.app. Estos campos no prueban que un visitante anónimo pueda acceder de manera pública. La comprobación HTTP anónima de dominio/SSO sigue pendiente.

**Última producción observada:** deployment dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, READY, target production, creación 2026-10-24T21:59:10.581Z, branch main, commit b528660e16552633d232a2397cbe42441a03438c. El commit asociado se fechó 2026-10-22T22:48:57Z.

La comparación inicial entre b528660e16552633d232a2397cbe42441a03438c y el HEAD usado para crear la rama, 595a1db89daa087315ef9844b0d9fc50aa8fc5a6, informó 81 commits de diferencia. En la última lectura de frescura del ciclo, main se observó en 4cdedc37f32446e06d1a8bede40657b7d43cba41 y el delta era de 86 commits. Es una diferencia de commits, no una orden automática de desplegar todos esos cambios. Hay que determinar el cambio de producto que realmente debe publicarse.

**Cuota consumida restante:** NO VERIFICADA. El equipo y las deployments son visibles, pero las herramientas utilizadas no expusieron el panel de Usage ni los contadores restantes. La presencia del plan Hobby no equivale a disponibilidad garantizada de builds/cuota en este momento.

### 2.3 Automatización de producción existente

Archivo: https://github.com/SeryMente/khora/blob/main/.github/workflows/deploy-production.yml  
Blob al consultar: 89a25e99dcc9ef22db3bd64d7cc4d14a370fc63e.

Su comportamiento documentado/observado:
- Se dispara en push a main o workflow_dispatch.
- Usa VERCEL_TOKEN, VERCEL_ORG_ID y VERCEL_PROJECT_ID como secretos; no se leyeron sus valores.
- Crea un registro GitHub Deployment sobre el SHA del workflow.
- Escribe khora-web/public/ep-main-live.json con la rama y el SHA exacto.
- Instala Node 24, ejecuta npm ci, hace vercel pull de producción, ejecuta scripts/migrate-runtime.mjs antes de construir, corre vercel build --prod y usa vercel deploy --prebuilt --prod.
- Comprueba el SHA en ep-main-live.json y hace un smoke de la URL de khora-web.
- La concurrencia está configurada como cancel-in-progress=true.
- Al crear el registro de GitHub Deployment entrega required_contexts vacío.
- La documentación adyacente advierte que una publicación manual y el workflow pueden coexistir si se usan simultáneamente.

El hecho de que la CLI corra en GitHub Actions demuestra una vía que no requiere terminal local. Sin embargo, su robustez y estado actual no están acreditados. La migración de runtime antes del build requiere una revisión de idempotencia, compatibilidad hacia atrás, posibilidad de reversión y efectos si el build falla. El valor de cancel-in-progress también merece evaluación para producción.

No se debe dar por hecho que Actions es el único disparador: la conexión Git de Vercel está activa y hay deployments preview procedentes de ramas Git. Es necesario leer la configuración de producción/preview y escoger una autoridad de release.

### 2.4 Workflow post-deploy

Archivo: https://github.com/SeryMente/khora/blob/main/.github/workflows/post-deploy-smoke.yml  
Blob al consultar: fc339ef251840f47492634979180a612747f1dea.

Este workflow escucha deployment_status y en éxito verifica https://khora-ten.vercel.app/. La documentación del workflow de producción, en cambio, verifica https://khora-web.vercel.app/. Ambas cadenas no están alineadas. No se concluye que khora-ten sea inválido; se concluye que hay que resolver cuál es el hostname productivo autoritativo y corregir/retirar el contrato de prueba sobrante cuando exista evidencia.

### 2.5 Estado de las ejecuciones

Las llamadas a GitHub Actions consultadas el 2026-10-28 local mostraron, para HEAD de main observado, varios runs recientes terminados en failure en unos 2–4 segundos: CI, UI Quality, Deploy to Production (Vercel), sync-repos e Integrity Manifest Refresh. Por ejemplo:
- Deploy to Production: https://github.com/SeryMente/khora/actions/runs/40801629132
- CI: https://github.com/SeryMente/khora/actions/runs/40801629149
- UI Quality: https://github.com/SeryMente/khora/actions/runs/40801629274

Las solicitudes de pasos de job devolvieron listas vacías y las de logs devolvieron BlobNotFound. La causa exacta es desconocida. No atribuir el fallo a secretos ausentes, al límite de minutos de GitHub, a Vercel ni a un error del YAML sin obtener una evidencia diferenciadora.

### 2.6 Relectura de frescura antes del cierre

En 2026-10-29T01:40:34Z, main era 4cdedc37f32446e06d1a8bede40657b7d43cba41. La comparación con el SHA productivo b528660e16552633d232a2397cbe42441a03438c informó 86 commits de diferencia. El proyecto Vercel aún devolvía como último deployment de producción dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, SHA b528660e16552633d232a2397cbe42441a03438c, creado 2026-10-24T21:59:10.581Z.

Los workflows recientes correspondientes al HEAD de main seguían fallando al terminar en pocos segundos; los logs no estuvieron disponibles. Como ejemplo, Deploy to Production: https://github.com/SeryMente/khora/actions/runs/40801841347; CI: https://github.com/SeryMente/khora/actions/runs/40801841394; UI Quality: https://github.com/SeryMente/khora/actions/runs/40801841341. La causa continúa NO DETERMINADA. Esta lectura es una captura temporal, no garantía de que main siga en ese SHA.

## 3. Límites publicados de Vercel Hobby

Fuente principal de límites y elegibilidad:
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits
- https://vercel.com/legal/terms

En la documentación consultada figuran, entre otros, estos límites generales del plan Hobby: hasta 200 proyectos; hasta 100 deployments al día; una referencia de rate limit de 32 deployments por hora; hasta 2.000 despliegues mediante CLI por semana; un build concurrente y un tiempo máximo de build de 45 minutos; 6.000 minutos de build; 1 millón de invocaciones de funciones; y límites de transferencia, CPU y memoria aprovisionada. Son cuotas publicadas, no el consumo efectivo de esta cuenta; el detalle exacto y la cadencia de cada límite deben revisarse en la página oficial vigente y en Usage antes de diseñar una guarda.

La documentación también señala que Hobby es para uso personal/no comercial. Esa condición es una compuerta arquitectónica y contractual, no solo una diferencia de cuota. No se ha afirmado que Khora sea comercial ni no comercial: el operador debe resolver la clasificación aplicable antes de decidir la permanencia de Hobby.

Vercel publica que superar límites puede pausar proyectos o funciones, y algunas cuotas requieren esperar a que se restablezcan. El front debe diseñar el manejo de una cuota agotada como un estado degradado/pausa controlada, no como una promesa de disponibilidad garantizada.

La cuota restante no se verificó en la lectura actual. El panel de Usage indicado por Vercel es la fuente adecuada para comparar consumo del equipo y del proyecto durante los últimos 30 días. Una tabla con topes publicados no sustituye esa medición.

## 4. Opciones de publicación investigadas

### A. Integración Git nativa de Vercel

Vercel puede crear deployments preview desde pushes a ramas que no son la rama de producción y un deployment productivo cuando se actualiza/mezcla la rama de producción configurada. Un flujo PR → preview → checks/revisión → merge → producción permite publicar sin CLI local, tokens del desarrollador ni RDC.

Ventajas: conexión directa al SHA del repositorio, automatización gestionada por el proveedor, URLs preview, bajo esfuerzo operativo y menos credenciales propias. Condiciones: branch de producción configurada, acceso Git correcto, límites de Hobby, protección/SSO coherente y un único evento que mueva producción. La evidencia de una conexión Git activa no confirma por sí misma que el deployment productivo se actualice con main ni que no coexista con Actions.

Fuente oficial: https://vercel.com/docs/git

### B. GitHub Actions + Vercel CLI ejecutado en la nube

El repositorio ya contiene esta vía. La CLI se ejecuta en runners de GitHub; una instancia local o RDC no es requisito. Puede estampar provenance, construir, desplegar y verificar el SHA productivo.

Ventajas: control personalizado del pipeline, integración con las pruebas y el registro de GitHub, posibilidad de ejecutar migraciones y validaciones explícitas, y trazabilidad. Costes: mantener secretos y workflow, comprender fallos de Actions, revisar seguridad de actions externas, tratar estados de cuota/concurrencia y mantener alineado el smoke test. El pipeline actual no está probado como sano, y su última ejecución observada falla sin logs legibles.

Fuente del workflow actual: https://github.com/SeryMente/khora/blob/main/.github/workflows/deploy-production.yml

### C. Vercel MCP nativo desde ChatGPT

La documentación oficial de Vercel describe un MCP remoto en https://mcp.vercel.com, compatible con ChatGPT y otros clientes, que permite inspeccionar proyectos/deployments y crear deployments sin la CLI local. La conexión utilizada en esta investigación expuso una herramienta create_deployment capaz de desplegar desde una fuente Git ya conectada.

Esta ruta responde directamente a la pregunta de publicación desde una plataforma de IA: puede evitar RDC y CLI local siempre que el conector esté autorizado, el proyecto Git esté conectado y la acción acepte la fuente/ref deseada. Debe probarse primero con preview, fijando equipo, proyecto, rama/SHA y comprobando el resultado. La disponibilidad en esta sesión no garantiza que todos los usuarios, planes y workspaces de ChatGPT dispongan de las mismas acciones.

La ayuda oficial de OpenAI distingue entre lectura y acciones de escritura para MCP; el soporte de las acciones de escritura varía por plan/workspace y evolución del despliegue de la función. El plan del operador no se verificó. Fuente: https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt

### D. Dashboard de Vercel

El dashboard puede servir de vía manual para seleccionar una rama o commit, reintentar o inspeccionar un deployment. Es útil como mecanismo de diagnóstico/contingencia sin terminal. No debería reemplazar la prevención automatizada de errores ni quedar como la única forma de publicar.

### E. Deploy Hooks

Vercel permite configurar un URL de hook asociado a un proyecto y rama; llamarlo puede provocar un deployment sin CLI. No requiere cabeceras de autenticación, por lo que la propia URL funciona como capacidad de disparo: cualquiera que la obtenga puede activarla. Debe tratarse como secreto, no guardarse en Git ni incluirse en prompts/logs, y revocarse si se expone. Los Deploy Hooks no son un sustituto de la revisión de código, los checks, la autorización de producción ni la verificación de SHA. Vercel documenta un máximo de cinco por proyecto para Hobby/Pro en la documentación consultada.

Fuente oficial: https://vercel.com/docs/deploy-hooks

### F. API/SDK y orquestación propia

Vercel expone API/SDK para crear deployments desde Git. En teoría puede construirse un servicio de release que reciba una solicitud desde ChatGPT u otro agente, compruebe precondiciones, valide branch/SHA, cree el deployment, espere el resultado y escriba un recibo verificable. Esto ofrece máximo control sistémico y se puede mantener independiente del cliente de chat, pero trae coste de desarrollo y una superficie nueva de seguridad (tokens, permisos, autorización, idempotencia, replay, logs y manejo de fallos).

No se recomienda construir este componente hasta descubrir la causa de la tubería actual y comprobar si el MCP nativo satisface las necesidades.

Fuente oficial: https://vercel.com/docs/rest-api/deployments

### G. Vercel CLI mediante RDC/local

La vía local puede ser útil para un artefacto que de verdad solo existe en el equipo o para un build/prebuilt específico. Como vía rutinaria es menos reproducible: exige conexión, terminal, login, permisos, ruta local y concordancia entre el código local y el commit remoto. No es necesaria para el flujo normal Git → preview → producción ni para todas las herramientas MCP disponibles. Debe quedar como excepción acotada, no como dependencia central.

### H. Otras plataformas

Candidatos para evaluar si el contrato de Hobby, el consumo o la compatibilidad lo justifican: Cloudflare Workers con su adapter/framework para Next.js, Netlify y hosting de contenedores/VMs. No se elige aún un sustituto: la equivalencia depende de las funcionalidades Next.js que usa Khora, APIs, Server Actions, sesiones, acceso a base de datos, jobs, almacenamiento, redes y límites de salida. GitHub Pages solo sería pertinente tras demostrar que una exportación estática cubre el producto; no debe suponerse equivalente para una app Next.js dinámica.

Fuentes de entrada para evaluación, no una recomendación de migración:
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/
- https://render.com/docs/web-services

## 5. Diseño sistémico recomendado

El objetivo propuesto se modela como un flujo de releases, no como la elección prematura de una herramienta:

1. **Preflight de elegibilidad y estado:** plan/uso contractual, consumo real, estado de Actions, HEAD de main, SHA productivo, dominio/SSO y configuración de la rama de producción.
2. **Commit de IA a Git:** asegurar que cada cambio propuesto desde una plataforma de IA quede en una rama y en un SHA recuperable. Distinguir cambios locales no versionados.
3. **Preview con SHA conocido:** usar Vercel Git o el MCP nativo para un deployment no productivo; validar la URL y registrar su ID/SHA.
4. **Puerta de calidad:** checks relevantes sobre ese candidato, incluyendo typecheck, contrato UI, tests unitarios y E2E de acuerdo con el área cambiada. No asumir que un deployment READY implica calidad funcional.
5. **Un solo publicador:** seleccionar Git Integration o el workflow de Actions como autoridad de producción. Si MCP se utiliza para releases manuales, definir cómo se desactiva/suprime la otra vía y quién autoriza el target production.
6. **Release con provenance:** usar el SHA exacto, registrar deployment ID, salida, estado y timestamp; impedir carreras y dobles publicaciones; no dar por éxito una solicitud aceptada.
7. **Verificación y rollback:** consultar el deployment por ID y SHA, comprobar alias productivo, verificar la respuesta de forma no autenticada y ejecutar smoke tests alineados con el dominio vigente. Documentar cómo regresar a un artefacto conocido.
8. **Guardas de coste y continuidad:** comprobar cuotas reales y contractualidad de Hobby; tener un comportamiento explícito ante pausa, rate limit, fallo del build o falta de cuota.

No se asignan aún umbrales de alerta numéricos; deberán elegirse después de obtener consumo y límites vigentes. No se cambia el plan ni se crea infraestructura en esta fase.

## 6. Seguridad y riesgos a evaluar

- No copiar VERCEL_TOKEN, IDs secretos de deploy hooks, cookies, variables de entorno descifradas ni secretos de GitHub a los objetos/documentos de este frente.
- Usar permisos mínimos y el mecanismo de secretos de la plataforma para cualquier pipeline personalizado.
- Revisar fijación por SHA de actions externas y permisos del workflow, sin reescribir las acciones existentes sin pruebas.
- Evaluar el orden de la migración de runtime, su idempotencia y compatibilidad, y qué pasa si la publicación posterior falla.
- Evitar cancelar un release productivo ya en marcha solo porque entre otro push; definir serialización y recuperación.
- No permitir que MCP, Deploy Hooks y GitHub Actions compitan como publicadores independientes sin un registro/guardia de autoridad.
- Proteger los deployments preview con las políticas adecuadas sin confundir un deployment protegido con un dominio público no autenticado.
- No exponer públicamente URL/tokenizadas de share o preview por el mero hecho de querer comprobar accesibilidad. Usar herramientas de consulta compatibles con los permisos reales.

## 7. Matriz de decisión a completar

| Criterio | Integración Git | GitHub Actions + CLI remota | Vercel MCP | API/servicio propio |
|---|---|---|---|---|
| Evita RDC/local | Sí | Sí | Sí | Sí |
| Ancla a Git/SHA | Sí, si se verifica el deployment | Sí, el workflow actual estampa provenance | Debe solicitarse y verificarse el ref/SHA exacto | Puede diseñarse |
| Preview | Natural para ramas/PR | Requiere integración adicional o usar Vercel Git | Sí, con target preview | Debe implementarse |
| Gates de calidad | Integración con checks/deployment checks por verificar | Puede orquestar todos los checks | No presupone que CI haya aprobado | Puede orquestar, con más esfuerzo |
| Credenciales propias | Menor necesidad directa de token de despliegue | Sí, secretos de Vercel | Auth del conector/MCP y alcance de equipo | Sí, token/app y vault |
| Reproducibilidad/recibo | Alta con SHA/URL verificados | Alta si se corrige la tubería | Potencialmente alta con ID/SHA verificados | Máxima si se implementa correctamente |
| Complejidad/operación | Menor | Ya existe, pero actualmente no está sana | Baja para llamada manual, depende del plan/cliente | Alta |
| Decisión actual | Candidata a opción base para preview | Candidata principal de continuidad hasta aclarar fallos | Candidata de publicación sin RDC y diagnóstico | No construir antes de probar alternativas simples |

La matriz no es una puntuación cuantitativa ni constituye una decisión ya aprobada.

## 8. Fuentes oficiales consultadas

Vercel:
- Hobby: https://vercel.com/docs/plans/hobby
- Límites: https://vercel.com/docs/limits
- Integración Git: https://vercel.com/docs/git
- Vercel MCP: https://vercel.com/docs/agent-resources/vercel-mcp
- Herramientas MCP Vercel: https://vercel.com/docs/agent-resources/vercel-mcp/tools
- Deploy Hooks: https://vercel.com/docs/deploy-hooks
- Uso y coste: https://vercel.com/docs/pricing/manage-and-optimize-usage
- Términos: https://vercel.com/legal/terms
- API deployments: https://vercel.com/docs/rest-api/deployments

OpenAI:
- Developer mode y MCP con acciones de escritura: https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt

Estas páginas pueden cambiar; volver a leerlas antes de afirmar un límite como vigente o de tomar una decisión contractual. La consulta de la documentación no prueba la cuota restante, la configuración real de la cuenta, permisos de escritura de cualquier otra sesión de ChatGPT ni el resultado funcional del sitio.
