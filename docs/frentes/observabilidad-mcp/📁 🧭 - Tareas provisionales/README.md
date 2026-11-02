# 📝 Registro de tareas provisionales del frente Khora MCP

**Estado:** materialización operativa provisional; no modifica ni sustituye el OCP único ni crea un sistema general de gestión de tareas.  
**Contenedor:** `docs/frentes/observabilidad-mcp/📁 🧭 - Tareas provisionales/`  
**OCP padre y fuente de estado:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md)  
**Control heredado:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json), generación **9**, titular global `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229`; corresponsable arquitectónico del módulo Jules `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314`; blob leído de vuelta `4fba2187947730abca0cc338429dfacf4810594c`.  
**Evento de creación:** instrucción expresa del operador en esta conversación · 2026-10-31.  
**Fuente normativa vigente:** [DUG Samantha v377 · NX-377m](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html), Metacanon **1.28**, GOW **2.17**; blob HTML leído desde `main`: `54064c8fe00f872023a455f06596061ed69062ae`.

## Checklist maestro de backlog

El seguimiento granular del backlog y la bitácora de ciclos se mantienen en [BACKLOG-CHECKLIST.md](../BACKLOG-CHECKLIST.md); este documento no crea tareas, controles ni folios adicionales.

## Naturaleza y límites

Este contenedor organiza tres objetos provisionales de tarea del frente Khora MCP. No son frentes independientes ni unidades de una taxonomía global de tareas. Cada tarea conserva un identificador local estable, un directorio y un README propio con enunciado, fuente de origen, estado, límites, siguiente actuación y criterio de cierre.

La responsabilidad, titularidad, autorización, generación y sesión se heredan del único OCP/control del frente. Las tareas no crean controles, responsables, sesiones, conversaciones ni folios propios. Los IDs `KHORA-MCP-TASK-###` son locales a este registro; no se declara unicidad global. **FOL1 permanece PREPARADO, NO ACTIVO; no se asignan folios globales ni de sesión.**

El patrón reproduce el índice de frente y un núcleo README por tarea empleado por Gobernanza en [su registro provisional](https://github.com/SeryMente/metodologia/tree/main/frentes/gobernanza/%F0%9F%93%81%20%F0%9F%A7%AD%20-%20Tareas%20provisionales). Se adopta como organización de este frente, sin afirmar que el estándar general de Tareas esté canonizado.

## Registro ejecutivo y orden de ejecución

| Orden | ID local | Estado | Tarea | Núcleo |
|---:|---|---|---|---|
| 1 | KHORA-MCP-TASK-001 | en_curso | Reconstruir workspace y recuperar continuidad documental | [núcleo](./%F0%9F%93%81%20%F0%9F%A7%A9%20-%20KHORA-MCP-TASK-001%20-%20Continuidad%20y%20reconstrucci%C3%B3n%20del%20workspace/README.md) |
| 2 | KHORA-MCP-TASK-002 | en_curso | General — acceso MCP, catálogo, scopes y observabilidad | [núcleo](./%F0%9F%93%81%20%F0%9F%A7%A9%20-%20KHORA-MCP-TASK-002%20-%20General%20-%20acceso%20y%20observabilidad/README.md) |
| 3 | KHORA-MCP-TASK-003 | en_curso | Jules — puente local OAuth/RDC y aceptación E2E | [núcleo](./%F0%9F%93%81%20%F0%9F%A7%A9%20-%20KHORA-MCP-TASK-003%20-%20Jules%20-%20puente%20local%20OAuth%20y%20RDC/README.md) |

## Secuencia y criterio de orden

1. **Continuidad primero:** conservar los originales, reinstanciar el workspace en el equipo Windows RDC realmente conectado y comprobar el checkout. El PC-14 anterior está fuera de línea y no se presupone que su perfil o DPAPI sean transferibles.
2. **General después:** asegurar la base MCP compartida —endpoint, transporte, autenticación, catálogo, scopes, consultas y límites—. Jules depende de esta base y no debe validarse contra un contrato MCP no comprobado.
3. **Jules al final:** continuar desde el puente ya integrado, completar el Preview/configuración no sensible, obtener consentimiento OAuth del propietario en el navegador y verificar las siete herramientas y lecturas reales. La prueba de humo es de lectura; no crea sesiones ni aprueba planes.

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


## Persistencia documental adicional · 2026-11-01

- [Exportación ChatGPT-Khora MCP-20261101-1912.md](../historial/ChatGPT-Khora%20MCP-20261101-1912.md): original recibido por RDC desde `015RENTA01`, `C:\\Users\\PC\\Downloads\\ChatGPT-Khora MCP-20261101-1912.md`; **191,165 bytes**, **3,995 líneas**, SHA-256 `AF046FD336273BC6235050388764F4012C4EC30B1CD48FC233F1CECE46770519`.
- GitHub `main`: commit `60de4a1f68ad9543ef010dc44f51d5fc6434d6f2`; blob de lectura de vuelta `1985f4a421af709b297af6bcac99fd871977cd16`; comparación textual exacta y tamaño/líneas coincidentes.
- Manifiesto: [MANIFIESTO-DOCUMENTAL.json](../documentos/MANIFIESTO-DOCUMENTAL.json). El inventario declara solo los exports conversacionales incluidos, no todo el contenido histórico del OCP.
- El archivo anterior `ChatGPT-Khora MCP-20261031-1846.md` conserva su verificación histórica registrada arriba; no se ha reescrito.
- El control global quedó transferido y verificado en generación **9** mediante `KHORA-MCP-TRANSFER-20261101-278FF01D`; titular vigente `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229`. Jules conserva su corresponsabilidad arquitectónica modular. La transferencia conserva exactamente dos responsables activos y no emite folio.


## Titularidad global verificada · 2026-11-01

- Operación: `TRANSFER_RESPONSIBILITY`, generación 8 → 9; evento `KHORA-MCP-TRANSFER-20261101-278FF01D`.
- Titular vigente: `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229`; alias operativo derivado de UUIDv7 local, sin ID nativo de conversación.
- Titular anterior gen8 archivado; Jules permanece como corresponsable arquitectónico modular.
- Control blob de lectura de vuelta: `4fba2187947730abca0cc338429dfacf4810594c`; commit de verificación de transferencia: `87fbfdd4ab5f76978f7f016cde9381c274668ece`; commit de consolidación final del control: `87a8ed32dbf1a3d8818e06e73e76c6d8766c022b`.
- El control conserva dos responsables activos; `session_folio=null`; FOL1 PREPARADO, NO ACTIVO.
- La persistencia de export, manifiesto, OCP y tareas permanece en sus rutas; el checkout y las pruebas E2E de Jules continúan pendientes.
