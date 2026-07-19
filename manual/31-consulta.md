# Motor de Consulta (Retriever GraphRAG)

## Qué hace
El Motor de Consulta recibe preguntas y un contexto de visibilidad, retornando fragmentos (o un subgrafo de información) directamente provenientes de la base de conocimiento local de Khora.
Garantiza el blindaje de partición de visibilidad devolviendo información basada estrictamente en su respaldo documental y degrada si no se cuentan con herramientas complejas como embeddings globales o comunidades.

## Cómo se usa
Se expone mediante el contrato `MotorDeConsulta` (en `api.py`). Los componentes invocan a `consultar(pregunta, contexto)` con `ContextoDeVisibilidad.TRANSPARENTE` o `PRIVADO`.
Retorna un `ResultadoDeConsulta` que contiene la lista de fragmentos y un indicador de si la información recabada es `SUFICIENTE` o `INSUFICIENTE`.
En contexto `TRANSPARENTE`, nunca retorna entidades marcadas como `PRIVADAS`.

## Cómo se reemplaza
El componente está desacoplado del Kernel a nivel puerto, si se requiere utilizar un verdadero GraphRAG con un motor indexado se deberá montar un driver que implemente `MotorDeConsulta` pero con integraciones de terceros.

## Costo de reemplazo
El costo de reemplazar la implementación mock local es **M**. Reemplazar este componente exigiría configurar un indexador GraphRAG externo y su respectivo modelo de embeddings para mapear todo el corpus y responder con consultas complejas.
