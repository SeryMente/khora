# Continuidad conversacional y retoma · Frente CUSTODIA · 2026-11-12

> **Tipo:** registro histórico de continuidad conversacional, con instrucción operativa vigente al inicio.  
> **Procedencia:** tramo visible aportado por el operador en esta conversación y contexto inmediato de la misma.  
> **Integridad de alcance:** síntesis estructurada; no es exportación nativa exhaustiva de ChatGPT ni evidencia de ejecución productiva.  
> **Destino:** SeryMente/khora · frentes/custodia/originales/.  
> **OCP único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).  
> **Control único:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).

## 1. Instrucción vigente del operador: reinicio controlado

El operador indicó retirar las tareas heredadas del plan activo, conservarlas como histórico y comenzar de nuevo cuidadosamente. La instrucción no autoriza borrar registros, artefactos, evidencia, transcripciones ni fuentes históricas.

### Objetivo único

Recuperar y archivar directamente todos los registros de transcripciones que efectivamente puedan recuperarse.

1. **Transcripción recuperable:** debe aparecer directamente en **Archivo**, no permanecer en **Recuperación** una vez que pueda archivarse.
2. **Audio asociado disponible:** conservarlo y vincularlo al registro archivado.
3. **Sin audio asociado:** archivar la transcripción de todos modos y mostrar una explicación visible —por ejemplo, un tooltip— que indique por qué no tiene audio.
4. **Atasco temporal:** cuando el registro no pueda recuperarse por una condición temporal, mantenerlo en **Recuperación / Pendiente**. No declararlo perdido ni archivarlo fingiendo que se recuperó.
5. **Conservación:** las tareas y los antecedentes anteriores pasan a histórico; no se borran.

El operador fijó **tres ciclos exactos** para hacer realidad este objetivo. No se deben añadir objetivos laterales, rediseños ni infraestructura que no contribuya directamente a la recuperación, al archivado o a la explicación visible de un bloqueo.

### Enfoque de trabajo solicitado

- Trabajar sobre datos, código y contratos del sistema; no es necesario observar la interfaz como una persona.
- No utilizar el monitor, Chrome local, perfiles locales ni RDC, según las exclusiones expresadas durante el trabajo anterior.
- Aprovechar cada ciclo al máximo y continuar con acciones concretas hasta agotar las vías razonables dentro del alcance autorizado.
- Conservar la distinción entre propuesto, autorizado, intentado, ejecutado, verificado y aceptado.
- No afirmar que un registro quedó archivado sin comprobar su estado, contenido, vínculo y evidencia de persistencia.

Esta instrucción es el punto de partida operativo de la nueva etapa. Los estados y contadores anteriores que aparecen más abajo se conservan como antecedentes y no consumen ni redefinen estos tres ciclos recién fijados.

## 2. Identidad documental y punto de continuidad

En la lectura de repositorio realizada para preparar esta persistencia:

| Elemento | Valor leído |
|---|---|
| Repositorio | SeryMente/khora |
| Rama consultada | main |
| OCP único | frentes/custodia/OBJETO-CANONICO.md |
| OCP | CUSTODIA-v0.43 |
| Metacanon que declara el OCP | 1.29 |
| Blob SHA del OCP leído | 68b49fafee960cf36485b66e3e94ca05e423ce1c |
| Control de responsabilidad | generación 11 |
| Blob SHA del control leído | cf7dc1a19ce2738e23b1e620bca49e03429bf28f |
| Lista provisional | versión 0.32 · estado PROVISIONAL |
| Blob SHA de la lista leída | 403bd191b3b8c5f8e6a1ba62cd726c9a11d43318 |

La lectura del control confirma generación 11 en main. Esta persistencia **no transfiere la titularidad**, no crea una identidad operativa nueva, no asigna UUIDv7 local ni folio y no modifica CONTROL-RESPONSABILIDAD.json.

El registro se incorpora bajo originales para conservar la conversación como antecedente. No sustituye al OCP, no crea un segundo estado vivo y no modifica código, Neon, B2, Blob, credenciales, workflows ni despliegues.

## 3. Antecedentes técnicos preservados del tramo anterior

### 3.1 Cambio de enfoque solicitado por el operador

Durante la continuación anterior, el operador objetó que el trabajo se estuviera orientando a observar el sistema mediante una interfaz gráfica. La instrucción fue explícita: no era necesario ver KHORA como un humano; debía avanzarse por las rutas técnicas disponibles.

El trabajo pasó a centrarse en Neon, el repositorio, las rutas de servidor, los contratos de archivado y los proveedores de almacenamiento. Se indicó no usar el monitor, Chrome local ni RDC.

### 3.2 Contrato de archivado y autenticación

El diagnóstico visible anterior registró estas condiciones:

- La recuperación de checkpoints mediante las rutas de dictado exige una sesión NextAuth válida y la identidad del titular.
- El archivo canónico pasa por las funciones existentes reclamarSesion() y guardarDictado(), que gestionan propiedad, idempotencia, creación del Volcado y sus vínculos.
- La lectura de audio requiere los controles de acceso correspondientes y, según el camino, la bóveda desbloqueada.
- La lectura física B2 mediante fetchStoredObject() es una función interna del servidor, no un endpoint público autónomo.
- El descifrado de checkpoints requiere X_KHORA_KEY.
- La API auxiliar de ingesta citada en el tramo anterior no crea el Volcado canónico a partir de un checkpoint; recibe un Volcado ya existente y aprobado.
- Se descartó la escritura SQL directa como sustituto del flujo canónico, porque eludiría los controles de reclamación, propiedad, idempotencia y enlace.

El diagnóstico histórico identificó una frontera de ejecución pendiente: una ruta de servidor con identidad autorizada del titular y acceso al material criptográfico necesario. La interfaz gráfica no era la causa de esa frontera.

### 3.3 Inventarios históricos: cifras que no deben mezclarse

En distintos cortes del trabajo anterior se reportaron cifras diferentes porque se utilizaron criterios de atribución y universos distintos. Se preservan sin normalizarlas retroactivamente:

| Corte o criterio citado | Resultado reportado |
|---|---|
| Primer inventario visible | 84 sesiones atribuibles, 5 ya vinculadas y 79 sin Volcado |
| Reconciliación posterior ampliada | 95 sesiones atribuibles al titular, 16 vinculadas y 79 pendientes |
| Exclusiones en la reconciliación ampliada | 87 sesiones sin titular demostrado y 6 de otros propietarios |
| Distribución histórica de audio al corte citado | 785 partes B2 en 5 sesiones y 254 partes Blob legacy en 39 sesiones |
| Sesiones sin audio registradas en otro corte | 35; 34 con checkpoint textual cifrado y una sin checkpoint ni audio |
| Conteo textual anterior | 34 sesiones sin audio; 4 checkpoints vacíos coincidentes con Volcados de cero caracteres, 1 con salto de línea y 29 con contenido potencialmente significativo |
| Fragmentos locales | 216 piezas asociadas a dos sesiones, mantenidas separadas de los 993 registros de una auditoría histórica de cinco snapshots |
| Parte 317 | intento de carga seguido de estado audio_no_verificable; no se encontró recibo físico suficiente para localizar el objeto |

Los números se reproducen como antecedentes del tramo suministrado. No representan una consulta nueva ni un inventario actualizado al momento de esta escritura. No deben sumarse entre sí ni utilizarse para inferir que los registros fueron recuperados.

### 3.4 Restricciones de almacenamiento y ejecución reportadas

El tramo anterior dejó constancia de lo siguiente:

- B2 pasó comprobaciones de configuración y autenticación de proveedor, pero el preflight no probó la lectura física de cada objeto mediante GET/read-back y recálculo de SHA-256.
- Vercel Blob se reportó suspendido por cuota excedida; sus objetos históricos no se declararon perdidos ni corruptos por ese motivo.
- El sandbox efímero de Vercel no heredó DATABASE_URL, X_KHORA_KEY, las claves maestras B2 ni un token OIDC; fue detenido.
- Los tokens OAuth revisados para la cuenta del titular tenían permisos de lectura, no un permiso de escritura suficiente para el archivo canónico.
- Los perfiles de navegador remoto consultados no mostraban sitios autenticados de KHORA.
- Los controles NextAuth no podían sustituirse por una identidad inventada ni por una clave de servicio interpretada como titular.
- La integración Vercel para el repositorio privado de organización fue rechazada por la limitación del plan Hobby. No se autorizó hacer público el repositorio ni cambiar de plan.
- La vía de GitHub Actions examinada no mostró una ejecución útil del archivador; el workflow de la PR #364 estaba en modo audit y no debía fusionarse ni desplegarse como si ya hubiera archivado registros.
- Las 216 piezas locales permanecieron excluidas de acceso en el canal de trabajo, por instrucción del operador.

### 3.5 Código y artefactos del intento anterior

Se documentó una implementación aislada que pretendía reutilizar reclamarSesion() y guardarDictado(), verificar objetos B2 antes de archivar y comprobar después el Volcado. La PR #364 quedó como borrador, sin merge ni despliegue; su workflow se encontraba en modo audit. Su existencia no equivale a ejecución.

También se reportaron documentos históricos de evidencia y control, entre ellos OCP v0.75, Lista v0.63, contrato CUSTODIA-01 v1.9 y una evidencia de cierre con SHA 9eb88bb1ad2c0556be2b3b6d062139f8e844f586. Esos valores se conservan como referencias comunicadas en el tramo anterior; no se validaron de nuevo en esta operación y no sustituyen a los valores efectivamente leídos en main para esta persistencia.

## 4. Secuencia visible resumida del tramo conservado

1. **Retoma técnica:** se retomó CUSTODIA y se señaló que los perfiles de navegador consultados no tenían una sesión KHORA autenticada. Se preguntó por crear un perfil aislado de navegador en la nube.
2. **Corrección del operador:** se rechazó la necesidad de observar la interfaz y se ordenó avanzar por vías técnicas directas.
3. **Reconciliación de registros:** se pasó de un primer conteo de 84 sesiones a una reconciliación ampliada de 95 sesiones atribuibles, con 79 pendientes y 16 vinculadas. Se separaron titulares no demostrados y otros propietarios.
4. **Análisis del archivado:** se inspeccionaron rutas de checkpoint, archivo y lectura de audio. Se concluyó que el escritor canónico debía conservarse y que las escrituras SQL directas no eran una alternativa aceptable.
5. **Búsqueda de ejecutor:** se evaluaron sandbox, CI, Vercel, variables de entorno, tokens OAuth, logs, configuraciones y rutas existentes. El sandbox no heredó secretos; los tokens revisados no tenían permiso de escritura; no apareció una ruta de CI ya operativa para archivar checkpoints.
6. **Persistencia documental R11:** se reportó una actualización de evidencia, OCP, lista y contrato con lecturas de vuelta de los archivos entonces citados. Se aclaró que persistir documentación no recuperaba los 79 registros.
7. **Estimación de duración:** se explicó que no había plazo defendible para la recuperación masiva antes de una sesión piloto y de superar los bloqueos de identidad y almacenamiento.
8. **Límite anterior de tres ciclos:** una continuación posterior fijó tres ciclos para esa etapa histórica; se reportó el ciclo 1/3 en curso, sin nuevas escrituras productivas.
9. **Reinicio posterior del operador:** el operador indicó retirar las tareas heredadas del plan activo conservándolas como histórico, fijó el objetivo único de llevar al Archivo las transcripciones recuperables y concedió tres ciclos exactos para hacerlo. Esa es la instrucción vigente que prevalece para la siguiente ejecución.

## 5. Última salida visible de ciclo del modelo, conservada literalmente

El operador pidió reproducir la salida del último ciclo del modelo en el mismo formato. Se conserva aquí como salida histórica, sin convertir su contador en el contador del reinicio posterior.

Me quedan 2 ciclos de 3 para esta nueva continuación.

Ciclo 1/3 — EN CURSO.

Ya aproveché este ciclo para:

- Recuperar y cotejar las instrucciones y autorizaciones vigentes.
- Confirmar 95 sesiones atribuibles al titular; 79 siguen sin Volcado.
- Separar 87 sesiones sin titular demostrado y 6 de otros propietarios.
- Comprobar que los tokens OAuth disponibles solo permiten lectura.
- Probar un entorno Vercel aislado. No heredó las credenciales necesarias y ya fue detenido.

Resultado: todavía no hay archivos nuevos creados en Production. No he alterado registros ni originales.

No cierro el ciclo todavía: falta resolver la vía de ejecución segura y comprobar si permite completar el archivado con el escritor canónico.

IPZ: v0.7 · edad NO VERIFICADO  
DUG: Samantha v389 · NX-389m · Metacanon 1.30 · GOW 2.19 · edad NO VERIFICADO  
CONV: PENDIENTE / NO ASIGNADO  
CICLO 1/3: EN CURSO · folio PENDIENTE / NO ASIGNADO  
A: PENDIENTE / NO ASIGNADO  
B: PENDIENTE / NO ASIGNADO  
FOL1: PENDIENTE / NO ASIGNADO

## 6. Estado al momento de esta persistencia

### Objetivo activo

**Archivar directamente todas las transcripciones recuperables.** La ausencia de audio no impide archivar el texto si este puede recuperarse y verificarse; debe quedar explicada de forma visible. Los impedimentos temporales mantienen el registro en Recuperación / Pendiente.

### Control de ciclos

- Límite de la nueva etapa: **3 ciclos exactos**.
- El estado «Ciclo 1/3 — EN CURSO» reproducido en la sección 5 pertenece a la continuación anterior y queda como histórico.
- Esta operación es exclusivamente documental; no declara iniciado ni consumido un ciclo de ejecución del archivado.

### Acciones ejecutadas en esta operación

- Lectura de vuelta del OCP, control de responsabilidad, lista provisional y registros históricos de continuidad en main.
- Preparación de este registro Markdown en la carpeta originales.
- No se consultó ni modificó Neon.
- No se leyó ni modificó audio, checkpoints, B2 o Blob.
- No se modificaron secretos, credenciales, variables de entorno, workflows, despliegues ni estados productivos.
- No se realizó transferencia de titularidad ni se asignaron UUIDv7 o folios.

La finalización de este registro solo acredita persistencia documental del tramo suministrado; no acredita que haya cambiado el estado de ninguna transcripción.