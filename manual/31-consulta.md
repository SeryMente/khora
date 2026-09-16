# Motor de Consulta (Retriever GraphRAG)

## Qué hace
El Motor de Consulta recibe preguntas y un contexto de visibilidad, retornando fragmentos y un subgrafo de información directamente provenientes de la base de conocimiento local de Khora en Neo4j.
Garantiza el blindaje de partición de visibilidad devolviendo información basada estrictamente en su respaldo documental y degrada declaradamente si faltan componentes o datos.

## Arquitectura Híbrida Real
El Retriever utiliza tres señales para armar la respuesta:
1. **Semilla semántica (knn):** Extrae nodos base iniciales usando embeddings locales.
2. **Expansión Multi-hop:** Extrae un subgrafo local alrededor de la semilla usando consultas puras en Neo4j explorando a ≥2 saltos.
3. **Resúmenes Globales fSUM:** Incorpora los resúmenes calculados de las comunidades de Leiden de los nodos del subgrafo, habilitando una comprensión jerárquica y global del PKG.

## Cómo se usa
Se expone mediante el contrato `MotorDeConsulta` (en `api.py`). Los componentes invocan a `consultar(pregunta, contexto)` con `ContextoDeVisibilidad.TRANSPARENTE` o `PRIVADO`.
Retorna un `ResultadoDeConsulta` que contiene la lista de fragmentos y un indicador de si la información recabada es `SUFICIENTE` o `INSUFICIENTE`.
En contexto `TRANSPARENTE`, nunca retorna entidades marcadas como `PRIVADAS`.
Si faltan datos para recuperar resúmenes de comunidad o nodos knn, el campo `degradacion_declarada` indicará las carencias del modo global.

## Interfaz de Usuario (`/sistema/consulta`)
La pantalla `/sistema/consulta` implementa una consola de conversación multi-turno con transmisión en vivo (streaming SSE):
1. **Chat Multi-turno Streaming:** Consume `POST /api/chat` (proxy autenticado hacia `POST /api/v1/chat` en el kernel Python). Transmite eventos SSE (`chunk`, `error`, `fin`) sin bufferear.
2. **Selector de Perfil de Proveedor:** Permite elegir entre `open_source`, `gemini` y `groq`, con un campo opcional de `modelo_override` para especificar un modelo LLM concreto.
3. **Modo Grafo (RAG) Opcional:** Al activar el toggle "Modo Grafo", las consultas se redirigen al servicio GraphRAG de Neo4j (`POST /api/consulta` -> `POST /api/v1/consulta`), incrustando en el historial la respuesta junto con su subgrafo, fuentes y evidencia de origen.
4. **Atribución de Origen:** Cada mensaje del asistente declara su origen (`llm:{perfil}:{modelo}` o `grafo`).

## Cómo se reemplaza
El componente está desacoplado del Kernel a nivel puerto, si se requiere utilizar un verdadero GraphRAG con un motor indexado se deberá montar un driver que implemente `MotorDeConsulta` pero con integraciones de terceros.

## Costo de reemplazo
El costo de reemplazar la implementación actual de GraphRAG es **Alto**, dado que implementa un pipeline complejo (Embedding -> Multi-Hop -> Leiden/fSUM). Reemplazar este componente exigiría configurar un indexador GraphRAG externo y su respectivo modelo de embeddings para mapear todo el corpus y responder con consultas complejas.
