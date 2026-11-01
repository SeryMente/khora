# 📝 Registro de tareas provisionales del frente Khora MCP

**Estado:** materialización operativa provisional; no modifica ni sustituye el OCP único ni crea un sistema general de gestión de tareas.  
**Contenedor:** `docs/frentes/observabilidad-mcp/📁 🧭 - Tareas provisionales/`  
**OCP padre y fuente de estado:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md)  
**Control heredado:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json), generación **8**, titular de KHORA-MCP `chatgpt-khora-mcp-01a19962-c730-7308-975-5bb49e2d`; corresponsable limitado al módulo Jules `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314`; blob leído de vuelta `68ca6e46db82453839a0cac7ca03fbcd7a26d912`.  
**Evento de creación:** instrucción expresa del operador en esta conversación · 2026-10-31.  
**Fuente normativa vigente:** [DUG Samantha v377 · NX-377m](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html), Metacanon **1.28**, GOW **2.17**.

## Naturaleza y límites

Este contenedor organiza tres tareas provisionales del frente Khora MCP. No son frentes independientes ni unidades taxonómicas ni controles de responsabilidad. Cada tarea conserva un identificador local estable, un directorio y un README propio con enunciado, fuente de origen, estado, límites, siguiente actuación y criterio de cierre. Jules se ha materializado como módulo funcional interno en [modulos/jules](../modulos/jules/README.md); KHORA-MCP-TASK-003 continúa como tarea de implementación y aceptación de ese módulo.

La responsabilidad, titularidad, autorización, generación y sesión se heredan del único OCP/control del frente. Las tareas no crean controles, responsables, sesiones, conversaciones ni folios propios. Los IDs `KHORA-MCP-TASK-###` son locales a este registro; no se declara unicidad global. **FOL1 permanece PREPARADO, NO ACTIVO; no se asignan folios globales ni de sesión.**

El patrón reproduce el índice de frente y un núcleo README por tarea empleado por Gobernanza en [su registro provisional](https://github.com/SeryMente/metodologia/tree/main/frentes/gobernanza/%F0%9F%93%81%20%F0%9F%A7%AD%20-%20Tareas%20provisionales). Se adopta como organización de este frente, sin afirmar que el estándar general de Tareas esté canonizado.

## Registro ejecutivo y orden de ejecución

| Orden | ID local | Estado | Tarea | Núcleo |
|---:|---|---|---|---|
| 1 | KHORA-MCP-TASK-001 | en_curso | Reconstruir workspace y recuperar continuidad documental | [núcleo](./%F0%9F%93%81%20%F0%9F%A7%A9%20-%20KHORA-MCP-TASK-001%20-%20Continuidad%20y%20reconstrucci%C3%B3n%20del%20workspace/README.md) |
| 2 | KHORA-MCP-TASK-002 | en_curso | General — acceso MCP, catálogo, scopes y observabilidad | [núcleo](./%F0%9F%93%81%20%F0%9F%A7%A9%20-%20KHORA-MCP-TASK-002%20-%20General%20-%20acceso%20y%20observabilidad/README.md) |
| 3 | KHORA-MCP-TASK-003 | en_curso | Módulo Jules — puente local OAuth/RDC y aceptación E2E | [núcleo](./%F0%9F%93%81%20%F0%9F%A7%A9%20-%20KHORA-MCP-TASK-003%20-%20Jules%20-%20puente%20local%20OAuth%20y%20RDC/README.md) |

## Secuencia y criterio de orden

1. **Continuidad primero:** conservar los originales, reinstanciar el workspace en el equipo Windows RDC realmente conectado y comprobar el checkout. El PC-14 anterior está fuera de línea y no se presupone que su perfil o DPAPI sean transferibles.
2. **General después:** asegurar la base MCP compartida —endpoint, transporte, autenticación, catálogo, scopes, consultas y límites—. Jules depende de esta base y no debe validarse contra un contrato MCP no comprobado.
3. **Módulo Jules al final:** completar la separación modular del servicio MCP, el Preview/configuración no sensible, el consentimiento OAuth del propietario y la aceptación de lectura autenticada de las siete herramientas. TASK-003 conserva el trabajo de puente local. La prueba de humo es de lectura; no crea sesiones ni aprueba planes.

El orden es operativo, no introduce prioridad universal, fecha límite ni responsable independiente. No se crean tareas paralelas para cada defecto de Preview, despliegue o consentimiento: esos puntos pertenecen al objeto Jules o a General según el contrato afectado.

## Estado de continuidad · 2026-10-31

- El archivo de exportación `ChatGPT-Khora MCP-20261031-1846.md` está persistido bajo `historial/`; tamaño original **134,984 bytes**, SHA-256 `B087AA56DDF20A0E737DCE9614BD6E406F872B540D9C2964440A93F7A5B94464`; Git blob leído de vuelta `d0ae42a0ed816d120239cae6dd29eadb0a2ddc24`. El hash y tamaño se cotejaron contra la lectura de vuelta obtenida desde el equipo RDC.
- La instrucción de retoma recibida después de aquella exportación se preserva literalmente en `KHORA-MCP-TASK-001/originales/`; no se incorpora retroactivamente al contenido de la exportación anterior.
- El workspace local todavía no se ha clonado/restaurado en el perfil Windows RDC actual. La tarea 001 sigue `en_curso`.
- PR #347 está fusionado; la existencia del merge y las pruebas locales anteriores no demuestran consentimiento OAuth real ni lecturas autenticadas de Jules.

## Regla de mantenimiento

1. Cada tarea conserva su enunciado fiel, referencia de origen recuperable, límites y estado observado.
2. Estados permitidos provisionalmente: `pendiente`, `en_curso`, `completada` y `cancelada`.
3. No añadir prioridad, fecha límite, propietario o dependencias como campos universales por anticipación.
4. La titularidad y autorización se heredan del OCP padre; no se crean controles ni sesiones de tarea.
5. No mover la ruta heredada `docs/frentes/observabilidad-mcp/`, ni crear otro OCP/control/frente para General, Jules o la retoma.
6. El cierre requiere atender el enunciado, recuperar evidencia y leer de vuelta el resultado desde la fuente canónica pertinente.
7. Una compilación, prueba sintética, Preview sin variables requeridas o metadato OAuth disponible no sustituye una lectura autenticada real ni la aceptación E2E.


## Corte RDC · 2026-11-01

Se asumió pérdida total del estado volátil de la sesión local anterior. Dispositivo `PC-14` Online, perfil `C:\Users\PC 13`, SID `S-1-5-21-1094932887-1468116028-2730151477-1002`. El checkout `khora-main` quedó intacto en rama de Custodia. El clon dedicado de Khora MCP está en `C:\Users\PC 13\Desktop\Khora\khora-mcp-main`, rama `main`; HEAD de creación `5318f6e21bcd7eaf1d6e45754786d5d58f67d94d`, limpio. El puente pasa comprobaciones estáticas Node/PowerShell. `npm ci` fue bloqueado por seguridad; las pruebas completas del clon permanecen pendientes. Production y Preview se resumen en el §24 del OCP.
