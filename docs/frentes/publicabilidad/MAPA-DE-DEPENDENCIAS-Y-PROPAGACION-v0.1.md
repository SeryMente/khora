# Mapa preliminar de dependencias y propagación · Publicabilidad

**Versión:** 0.1 provisional  
**Fecha de corte:** 2026-10-29 · America/Mexico_City  
**Objeto rector:** [OCP Publicabilidad](OBJETO-CANONICO.md), PUBLICABILIDAD-v0.4 (en este ciclo).  
**Referencia normativa leída:** DUG de Ser y Mente v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.  
**Naturaleza:** mapa de evidencia y preguntas pendientes; no es una segunda fuente canónica y no certifica rutas que aún no se han probado.

## 1. Tesis operativa

Publicabilidad no equivale a «desplegar KHORA en Vercel». Es la capacidad de trasladar un cambio desde su fuente de verdad hasta todas las superficies que dependen de él, de forma autorizada, verificable y recuperable. Incluye, al menos, código de aplicaciones, gobernanza, instrucciones y contexto de las plataformas de modelos, sitios y activos públicos, extensiones instalables, backends, datos/configuración dependientes y sus instrumentos de comunicación.

No existe un único repositorio que sea fuente de verdad para todos los activos. El principio es **una fuente canónica por activo, más un registro explícito de sus dependencias y destinos**. El mapa no centraliza ni reubica archivos por uniformidad nominal, ni convierte copias derivadas en cánones paralelos.

Un cambio se considera propagado solo cuando:
1. se identifica su fuente canónica y su revisión exacta;
2. se determinan los destinos directos y las dependencias transitivas relevantes;
3. se actualizan únicamente los destinos autorizados;
4. se verifica cada destino con evidencia específica (versión, SHA, deployment, lectura de vuelta o prueba funcional);
5. se registran los destinos no actualizados, bloqueos y vías de recuperación.

Un commit, un deployment `READY`, una instalación local o una copia de un prompt no prueban por sí solos que todas las superficies derivadas estén actualizadas.

## 1.1 Relación estratégica entre ámbitos y activos

El operador declara la siguiente relación de programa: **Otro Gran Programa es el proyecto insignia y depende de la construcción de KHORA/CoMind y de Metodología para poder resolver su objetivo**. Esta dependencia estratégica forma parte del alcance aun cuando todavía no estén identificadas todas sus interfaces, contratos o artefactos técnicos.

No confundir el proyecto/programa completo con el repositorio `SeryMente/otrogranprograma`: su README identifica ese repositorio como el **instrumento público de comunicación** del programa. Es una superficie dentro del OCP general, no prueba de que el repositorio contenga por sí solo todos los componentes del proyecto insignia.

Representación conceptual actual (la arista es estratégica; las dependencias de código/datos concretas siguen pendientes):

```text
SeryMente/metodologia (gobernanza y método) ───┐
                                               ├──> Otro Gran Programa (programa insignia)
KHORA / CoMind (prótesis cognitiva) ────────────┘             │
                                                             └──> SeryMente/otrogranprograma
                                                                  (instrumento público de comunicación)
SeryMente/serymente ──> sitio web/marketing WordPress + Divi
Signal Interpreter / GDP ──> herramientas operativas especializadas
```

El esquema no afirma una integración técnica ya implementada entre estos componentes: expresa la relación estratégica dictada por el operador y separa lo conocido de las interfaces todavía por investigar.

## 2. Inventario inicial de repositorios identificados

Una búsqueda de repositorios de GitHub con ámbito `org:SeryMente` devolvió los nueve repositorios de la tabla. Es una **primera enumeración accesible, no una certificación de exhaustividad de toda la organización**: debe contrastarse con la lista completa del propietario y con activos externos a GitHub. Los alcances abajo se derivan de la búsqueda y de los README que se pudieron leer; las incógnitas no se completan por inferencia.

| Repositorio | Activo/superficie declarada | Ruta de propagación conocida o candidata | Brecha principal |
|---|---|---|---|
| [SeryMente/khora](https://github.com/SeryMente/khora) | Prótesis cognitiva Khora; aplicación Next.js, frentes, flujos de CI y publicación Vercel | Git → CI/quality gates → autoridad de release por determinar → deployment → dominio/smoke. El workflow productivo actual y la integración Git Vercel pueden coexistir; no está resuelta la autoridad única. | CI falla sin runner/steps observables; causa raíz no determinada. Hay posible doble invocación de migración y dos URLs de smoke distintas. |
| [SeryMente/khora-effectif](https://github.com/SeryMente/khora-effectif) | Repositorio privado identificado en la búsqueda | Sin ruta asignable todavía. La lectura de `README.md` devolvió 404; esto no demuestra que el repositorio carezca de documentación o activos. | Caracterizar propósito, canonicalidad, publicadores, consumidores y relación con KHORA. |
| [SeryMente/metodologia](https://github.com/SeryMente/metodologia) | Fuente preponderante de gobernanza y método | `main` → documento normativo canónico → superficies derivadas identificadas (prompts, instrucciones de modelos, guías y espejos aplicables) → lectura de vuelta/reconciliación. | La lista concreta de plataformas/espejos y la ruta para propagar una modificación normativa no está inventariada aquí. El README consultado apunta a versiones anteriores frente al HTML normativo v359; registrar y reconciliar el delta, no corregirlo silenciosamente. |
| [SeryMente/serymente](https://github.com/SeryMente/serymente) | Código personalizado de WordPress + Divi, páginas, blog y plugin propio | Git → preparación/revisión del código → mecanismo real de incorporación al WordPress/Divi productivo → prueba del sitio. | El README explica el código y el entorno Codespaces, pero el destino público, el mecanismo de importación/publicación, las credenciales autorizadas, el rollback y los checks en vivo no se verificaron. |
| [SeryMente/otrogranprograma](https://github.com/SeryMente/otrogranprograma) | Instrumento público de comunicación/marketing; sitio estático, experiencia narrativa, JSON canónico/runtime y PWA/service worker | Repo → publicación GitHub Pages declarada en README → dominio público → validación de versión, recursos, caché y service worker. | La configuración efectiva de Pages, el SHA realmente servido y el protocolo de invalidación/recuperación de la PWA no fueron comprobados. |
| [SeryMente/signal-interpreter](https://github.com/SeryMente/signal-interpreter) | Extensión Chrome, puente Native Messaging para Windows y scripts de instalación/prueba | Git → paquete ZIP reproducible → huellas/instalador/host → extensión cargada en Chrome → prueba real por equipo. | Distinguir artefacto construido, host instalado, extensión cargada y prueba en vivo; no se inventaría en esta sesión el estado de cada dispositivo. |
| [SeryMente/GDP](https://github.com/SeryMente/GDP) | Gestor de Procesos: extensión Chrome, Apps Script, Google Sheets/Drive y servicio local auxiliar | Fuente de extensión + fuente Apps Script → release coordinado → deployment remoto/versionado → datos y helper local compatibles → probes/E2E. | El README observado declara extensión HF33 y backend HF32/versión 12, con aceptación E2E pendiente: ejemplo de propagación parcial que requiere protocolo multi-destino. |
| [SeryMente/personal](https://github.com/SeryMente/personal) | OCPs, documentos de trabajo, instrucciones, evidencia y referencias a activos locales | OCP/repositorio → destinos explícitos de cada frente o activo local autorizado → comprobación de versión/hash. | Los destinos y relaciones se deciden por cada OCP; no se presume que todo archivo requiera publicación externa. |
| [SeryMente/tercer-ambito](https://github.com/SeryMente/tercer-ambito) | Documentación de Tercer Ámbito; árbol declarado `etica/`, fuentes, evidencia y originales | Fuente documental → espejos/destinos que declare el OCP correspondiente → lectura de vuelta. | OCP/control de responsabilidad y destinos efectivos deben verificarse antes de una propagación material. |

### Superficies externas que deben inventariarse como destinos explícitos

- **Gobernanza/modelos:** plataformas donde se aplican prompts, instrucciones, contexto, conectores o documentación de trabajo. La lista exacta, permisos, versión aplicada y método de lectura de vuelta siguen pendientes; no asumir sincronización automática.
- **Vercel y GitHub Actions:** la aplicación KHORA, sus gates, migraciones, provenance, dominios, acceso esperado y recuperación.
- **WordPress/Divi:** el sitio público de Ser y Mente y los lugares donde se instalan módulos/estilos/plugins procedentes del repositorio.
- **GitHub Pages/PWA:** el instrumento público de Otro Gran Programa y sus recursos estáticos, JSON y service worker.
- **Chrome/Native Messaging:** artefactos de Signal Interpreter, instalación del host y cada extensión desplegada en los equipos autorizados.
- **Apps Script/Sheets/Drive/helper local:** componentes de GDP que deben permanecer compatibles entre sí.
- **Otros destinos de negocio o comunicación:** se agregan solo cuando se confirme la relación con el activo canónico; no se fabrican integraciones a partir del nombre de un repositorio.

## 3. Contrato mínimo de propagación de cambios

Para cada cambio material, registrar en el OCP correspondiente o su evidencia:

| Campo | Contenido requerido |
|---|---|
| Identificador de cambio | Folio estable del evento; no llamarlo ID nativo de plataforma si no lo es. |
| Fuente canónica | Repositorio/ruta/plataforma y ref exacto; el documento canónico por activo. |
| Revisión de origen | SHA, versión, hash o ID que realmente identifique la revisión. |
| Cambio y clase | Gobernanza, código, contenido público, extensión, datos/backend, configuración o contexto de modelos. |
| Grafo afectado | Destinos directos y dependencias transitivas conocidas; incertidumbres marcadas como tales. |
| Autoridad de cada destino | Quién o qué lo actualiza, permisos reales, herramienta y condición de autorización. |
| Precondiciones | Compatibilidad, credenciales disponibles sin exponer secretos, cuota/plan cuando aplique, controles y estado del destino. |
| Verificación | Evidencia específica por destino; no basta con que el paso de publicación haya terminado. |
| Excepción | Qué hacer si una propagación parcial deja versiones incompatibles, sin respuesta o con resultado ambiguo. |
| Recuperación | Reintento seguro, reconciliación o rollback; considerar efectos no reversibles en datos, políticas y caché. |
| Cierre | Tabla de destinos: actualizado, verificado, bloqueado, no aplicable o pendiente; evidencia enlazada. |

## 4. Ciclo estándar de propagación

1. **Clasificar:** declarar qué cambia y quién es la fuente canónica; resolver la ambigüedad de identidad antes de escribir.
2. **Leer el estado vivo:** fuente, destino, revisiones, checks, versión desplegada y cualquier operación previa cuyo resultado pueda ser ambiguo.
3. **Construir el grafo:** listar destinos directos, dependencias transitivas, superficies de modelo, consumidores de esquema y artefactos derivados.
4. **Preflight:** comprobar permisos efectivos, contrato/plan, cuota material, compatibilidad, concurrencia, orden de migración y rollback posible.
5. **Aplicar una sola vez en el origen:** conservar commit/versionado; no propagar una edición local no identificada como revisión.
6. **Propagar en orden de dependencia:** preparar primero las interfaces/contratos que los destinos consumen; no ejecutar dos publicadores sobre el mismo objetivo en paralelo.
7. **Verificar cada arista:** cotejar revisión de origen con artefacto/destino efectivo y ejecutar pruebas pertinentes.
8. **Conciliar excepciones:** ante timeout ambiguo, consultar el estado antes de repetir; ante propagación parcial, detener nuevas promociones y recuperar consistencia.
9. **Cerrar evidencia:** guardar resultado, hashes/IDs, URLs, pruebas realizadas, límites observados y tareas pendientes.

## 5. Modelo de excepción y recuperación

| Excepción | Señal observable | Respuesta inicial segura | Condición de parada |
|---|---|---|---|
| Fallo CI antes de iniciar pasos | `runner_id=0`, runner vacío, `steps=[]`, logs no disponibles | Capturar run/job IDs, hora, labels, estado de Actions y logs accesibles; revisar si el fallo tiene un comando reproducible. | No inventar causa ni repetir workflows a ciegas. RDC solo si se identifica una falla GitHub/CI reproducible localmente; para otro uso, avisar primero y esperar autorización. |
| Fuente canónica y espejo divergentes | Versiones, hashes o contenidos distintos | Registrar delta, fijar cuál fuente prevalece según gobernanza y reconciliar destinos de forma explícita. | No fusionar fuentes ni sobrescribir un destino sin conocer su autoridad. |
| Resultado de publicación ambiguo | Timeout, conexión perdida, respuesta incompleta | Consultar destino y revisar si la operación ya fue aceptada antes de reintentar. | No duplicar una operación con efectos secundarios. |
| Propagación parcial/múltiples destinos | Un destino avanzó y otro no | Congelar promociones dependientes, inventariar versiones efectivas y recuperar en orden. | No declarar terminado el cambio mientras queden incompatibilidades críticas. |
| Versión de cliente/backend incompatible | Extensión, schema, API o backend en versiones distintas | Comparar contratos/compatibilidad y pruebas por versión; promover una combinación validada. | No cambiar simultáneamente varios targets sin capacidad de aislar el origen del fallo. |
| Caché o PWA obsoleta | El sitio funciona pero entrega recursos/versiones antiguas | Verificar artefactos y cabeceras/versión; investigar caché y service worker. | No concluir éxito solo por la respuesta HTTP del documento raíz. |
| Permisos/plan/entorno no elegible | Herramienta ausente, 403, límite o política contractual | Distinguir permisos, plan, sesión, configuración, cuota y fallo de servicio. | No probar una vía privilegiada o con coste no autorizado como workaround. |
| Migración o efecto irreversible | Cambio de esquema/datos o tarea no repetible | Identificar orden, idempotencia demostrada, respaldo y procedimiento de restauración. | No reintentar ni hacer rollback de código asumiendo que revierte datos. |

### Aplicación a la incidencia CI actual

En el run de CI `40900763575` de esta rama, los tres jobs terminaron en 1–2 segundos, con runner vacío, `runner_id=0` y pasos vacíos; la consulta de logs devolvió `BlobNotFound`. Se observó el mismo patrón (job de 1–2 segundos, `runner_id=0`, runner vacío, `steps=[]`) en cuatro workflows programados de `main`: Jules Auto-Respond (`40904382749`), Sync Todoist and Notion (`40889858840`), Board Orchestrator (`40889195532`) y Khora API Healthcheck (`40878917996`); sus consultas de logs también devolvieron `BlobNotFound`. Esto hace prioritaria la investigación de una posible condición transversal de Actions, pero la causa raíz sigue **NO DETERMINADA**. La evidencia no expone un comando/step que se pueda reproducir localmente. Se continúa diagnosticando desde GitHub; no corresponde afirmar una reproducción local ni usar RDC para una falla todavía no reproducible.

## 6. Brechas prioritarias

**P0**
1. Diagnosticar el patrón de fallos de GitHub Actions (CI y jobs programados) desde evidencia de runs y configuración/estado del servicio, sin reruns a ciegas.
2. Resolver la autoridad única de publicación de KHORA, posible duplicación de migración y URL de smoke.
3. Identificar en la fuente de Metodología qué espejos de gobernanza/modelos deben existir y cómo verificar cada uno.
4. Confirmar la lista completa de repositorios/activos de la organización y añadir cualquier destino externo que no esté representado en GitHub.

**P1**
5. Documentar el mecanismo efectivo de publicación del sitio WordPress/Divi y definir prueba/rollback.
6. Verificar GitHub Pages y el comportamiento de caché/service worker de Otro Gran Programa.
7. Formalizar paquetes, hashes y pruebas de instalación de Signal Interpreter.
8. Formalizar un release compatible de extensión + Apps Script + datos/helper para GDP.
9. Caracterizar `khora-effectif` y aclarar sus dependencias antes de asignarle una vía.

**P2**
10. Incorporar un registro portable de cambios/targets por OCP; medir duración, pasos, reintentos y calidad del recibo cuando haya datos.
11. Definir automatizaciones preventivas únicamente después de conocer las APIs, permisos y límites reales de cada destino.
12. Evaluar la cobertura de los espejos e instrumentos de comunicación sin convertir todas las plataformas en copias automáticas del canon.

## 7. Límites de esta versión

Este es un mapa inicial basado en resultados de búsqueda de repositorios y lecturas parciales de README, en el DUG canónico consultado y en evidencia de KHORA/GitHub/Vercel. **No se ha efectuado un inventario exhaustivo de código, secretos, integraciones externas, cuentas WordPress, settings GitHub Pages, dispositivos, plataformas de modelos ni destinos de Apps Script.** No se afirma que todos los flujos hayan sido probados.

No se modificó `main`, ningún otro repositorio, código de producto, secretos, configuración de Vercel, dominios, plan/facturación, datos externos ni publicación productiva. Los cambios de este ciclo son documentación en la rama Publicabilidad.
