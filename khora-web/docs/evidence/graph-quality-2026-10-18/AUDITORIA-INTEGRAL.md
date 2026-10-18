# Auditoría integral de Khora: custodia → conocimiento → consulta

Fecha de comprobación: 2026-10-18.
Veredicto: **NO CONFORME como mecanismo integral en el despliegue comprobado**.

## Alcance y límites

Se contrastaron el protocolo de ingesta, las unidades canónicas de EpisTwin, la construcción auditada, el texto primario de arquitectura, el código del despliegue, los originales ya recuperados, las propuestas persistidas, los endpoints autenticados y la respuesta visible de la interfaz. Se ejecutaron 21 pruebas unitarias existentes y cuatro controles negativos semánticos en aislamiento. No se alteraron originales, ratificaciones, código ni despliegues. Las consultas reales pueden generar registros operativos normales.

No se certifica la conformidad formal completa con todas las unidades de EpisTwin. Tampoco se hizo una nueva captura de audio, una extracción completa con proveedores, un borrado/reconstrucción de producción, una reaplicación de juicios humanos no vacíos ni una prueba multimodal o longitudinal.

## Identificación del despliegue

- Código reportado por /api/version: a0975ffaef17830471fff3adcdb804c47490ff0b.
- Fuente del commit reportada: manual-verified-clean-worktree; desplegado_desde_git=false.
- Release guardado en el snapshot: 0a7b5ef100b66cdbdd64d80de647c6d354a9fe7e.
- Revisión del snapshot: 9bfc8bde-d80f-42e6-80ea-59996749c094.

Cambiar el código no demuestra haber recalculado las propuestas históricas. La comprobación actual de vigencia no compara el release ni todos los hashes de instrucciones.

## Matriz de comprobación

| Tramo | Evidencia ejecutada / inspeccionada | Resultado |
|---|---|---|
| Archivo y versiones | Originales recuperados; 214/214 hashes y citas UTF-16 de relaciones coinciden | Integridad literal de esas relaciones comprobada; no prueba fidelidad semántica ni cobertura total |
| Audio → texto | Pipeline actual: 42 registros; 12 clasificados text_without_audio | Trazabilidad universal al audio NO VERIFICABLE; no se atribuye sin evidencia cuándo ni por qué falta |
| Admisión a ingesta canónica | Pipeline: 0 ingerido; código /api/ingesta pasa por aprobación y servicio Python | No hay evidencia de recorrido actual de esos registros por esta ruta completa |
| Extracción de significado | Control basado en «no solamente sería» admite una representación «no sería» | NO CONFORME: cambia el alcance de la negación |
| Validación de relaciones | Un predicado no sustentado pasa con extremos y cita literales | NO CONFORME: ancla literal no equivale a relación verdadera |
| Resolución de identidad | Tanto el validador anterior como el actual aceptan agencia = flujo de llamadas | NO CONFORME: confunde agente y objeto; la corrección de formato de referencias no corrige identidad semántica |
| Construcción y comunidades | Proyección repetida desde propuestas guardadas; misma partición que snapshot; cero nodos de comunidad en esa proyección | Reconstrucción parcial reproducible; no materializa en ese circuito las comunidades con resúmenes de EpisTwin |
| Grafo publicado → recuperación | /api/grafos poblado en PostgreSQL; /api/grafo devuelve nodos y aristas vacíos desde la proyección Neo4j | NO CONFORME como cadena integrada actual |
| Consulta real | Pregunta sobre necesidades personales frente a financiamiento de Otro Gran Programa: HTTP 200, suficiencia insuficiente, fragmentos y subgrafo vacíos, «Sin semilla knn» | Fallo real de recuperación para el caso comprobado |
| Recuperación → respuesta visible | Interfaz muestra «✓ Evidencia suficiente», «Respuesta procesada.» y 0 fuentes | NO CONFORME: falsea la suficiencia por un error de contrato de tipos |
| Generación y validación de respuesta | /api/v1/consulta llama al recuperador y devuelve su objeto; no invoca el motor completo. /api/v1/chat genera sin ese recorrido de grafo | El núcleo existe, pero su existencia no acredita conexión al flujo publicado |
| Reconstrucción integral y juicios | Reconstrucción desde propuestas persistidas repetida; ledger actual vacío | PARCIAL. No prueba original → extracción nueva → reconstrucción completa → reaplicación de juicios no vacíos |
| Pruebas existentes | 21 pruebas unitarias pasan; ciclo-ingesta simula endpoints; visualización admite vacío/error sin comprobar un grafo poblado | Son pruebas de alcance limitado, no una acreditación de extremo a extremo real |

## Causa principal: dos circuitos que no componen una sola cadena

1. **Circuito nuevo visible:** originales autorizados → propuestas → proyección guardada en PostgreSQL → /api/grafos → mapa.
2. **Circuito de consulta:** /api/consulta → servicio Python → recuperación desde Neo4j. Su proyección consultada devuelve un grafo vacío.
3. **Núcleo EpisTwin:** hay constructor, comunidades, recuperación, orquestación y validación en el repositorio. No basta con que estén presentes: el endpoint de consulta inspeccionado no recorre el motor completo, ni consume el grafo nuevo de PostgreSQL.

El propio documento GRAPH-TWINS.md declara que el modelo nuevo es una proyección reconstruible en PostgreSQL, no un reemplazo del núcleo Python/Neo4j ni una afirmación de fidelidad integral a EpisTwin. Otra documentación de migración y el código actual no describen la misma ruta: hay además una inconsistencia documental.

## Fallo de contrato reproducido en pantalla

La respuesta real contiene `suficiencia: "insuficiente"`, `fragmentos: []` y no contiene una respuesta generada.

La interfaz hace `Boolean(data.suficiencia)`. Una cadena no vacía, incluida `"insuficiente"`, se convierte en verdadero. También espera `evidencia`, mientras la respuesta devuelve `fragmentos`. Al no recibir `respuesta`, presenta «Respuesta procesada.».

Se comprobó por envío real desde la consola, no solo por lectura estática del código. Ver ui-query-evidence.txt y la captura. query.json conserva la prueba HTTP directa previa, con una formulación equivalente de la misma pregunta; no es una captura de red del segundo envío desde el formulario.

## Por qué el mapa no es solo un problema estético

Las fuentes literales pueden estar íntegras y el significado estar mal representado. Las falsas identidades y relaciones alteradas hacen defectuoso el material del agrupamiento. Además, los componentes pequeños y una distribución en estantes no producen por sí solos comunidades útiles. Aplicar Leiden no garantiza comunidades autobiográficas inteligibles; se requieren relaciones semánticamente correctas y una evaluación real de utilidad.

La autorización de usar originales sin aprobación de custodia fue explícita: no se clasifica por sí misma como infracción. Tampoco se atribuye el fallo a la calidad del pensamiento del operador. La responsabilidad del mecanismo es representar, conservar incertidumbre, permitir revisión y demostrar utilidad, no exigir que la entrada ya venga organizada.

## Qué debe contar como aceptación antes de llamarlo integral

Sin escoger aquí una arquitectura nueva ni modificar producción:

1. Fijar con el operador cuál es el grafo canónico y conectar a él materialización, recuperación y consulta.
2. Un original controlado debe recorrer custodia/versionado, extracción, identidad, relaciones y comunidades con trazabilidad verificable y sin cambiar su sentido.
3. Una pregunta controlada debe recuperar esas fuentes, producir una respuesta sustentada y declarar insuficiencia cuando corresponda.
4. Los cuatro controles negativos deben rechazarse, aunque las pruebas unitarias existentes sigan pasando.
5. La pantalla debe representar exactamente el contrato de respuesta; insuficiente nunca puede verse como suficiente.
6. Reconstruir derivados desde originales y reaplicar juicios humanos de prueba debe conservar decisiones y trazabilidad.
7. Añadir pruebas reales del recorrido publicado, diferenciadas explícitamente de simulaciones de interfaz.

No se acredita el cierre hasta que esas pruebas pasen. Arreglar únicamente la cuadrícula, aumentar nodos o continuar acumulando propuestas no resolvería la desconexión demostrada.

## Fuentes inspeccionadas

- <mention url="https://app.notion.com/p/3faa41878241831eb86d01d6c19c8c99">Protocolo de Ingesta</mention>.
- <mention url="https://app.notion.com/p/422a41878241829e8cd881da82339cf9">Unidades canónicas de EpisTwin</mention>.
- <mention url="https://app.notion.com/p/e08a4187824182a1b8f381cc0505c039">Protocolo de Construcción Auditada</mention>.
- <mention url="https://app.notion.com/p/019a4187824182b2be1e01a16a9c12aa">Auditoría del núcleo vivo</mention> (antecedente histórico, no prueba del despliegue actual).
- <mention url="https://app.notion.com/p/f1da4187824183fc82fc817903ad5161">Fuente primaria EpisTwin</mention>.
- [Proyección nueva y alcance declarado](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/khora-web/docs/GRAPH-TWINS.md).
- [Persistencia del grafo nuevo](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/khora-web/lib/server/graph-twins-store.ts).
- [Proyección Neo4j](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/khora-web/lib/server/grafo-proyeccion.ts).
- [Consulta Python](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/api/main.py).
- [Contrato de interfaz](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/khora-web/app/sistema/consulta/page.tsx).
- [Validación de extracción y proyección](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/khora-web/lib/graph-twins.ts).
- [Prueba de ciclo de ingesta con simulaciones](https://github.com/SeryMente/khora/blob/a0975ffaef17830471fff3adcdb804c47490ff0b/khora-web/e2e/ciclo-ingesta.spec.ts).

## Contenido del paquete

Informe; evidencia JSON de regresiones; respuesta HTTP directa; transcripción y captura de la pantalla; resultados unitarios. No incluye corpus privado completo, credenciales ni dependencias instaladas. Los controles semánticos son pruebas de rechazo de validadores ejecutadas sin llamadas nuevas al modelo: no se presentan como cuatro nuevas salidas espontáneas del proveedor.
