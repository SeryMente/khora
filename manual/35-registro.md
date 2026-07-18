# Registro Jerárquico de Componentes

## Qué hace
El Registro Jerárquico de Componentes es la memoria estructural del sistema.
Mantiene un registro declarativo y versionado (en JSON) de las piezas que existen dentro de la arquitectura de Khora.
Implementa la regla `@req` de Athanor generalizada, vinculando la definición declarativa en los JSONs con el código vivo a través de marcas bidireccionales.
Garantizando que todo lo que existe esté documentado, justificado y tenga un reemplazo nombrado si su ciclo de vida lo amerita.

## Cómo se usa
El registro es la única fuente de verdad y se almacena en el repositorio dentro de `kernel/src/khora_kernel/registro/fichas/`.
Para consultar el estado actual de los componentes registrados, sus versiones, costos de reemplazo y más, se puede usar el comando de terminal `khora registro`.
Al modificar el código o crear nuevos componentes que deban ser rastreados, se debe agregar el comentario `# @req: <id_del_componente>` dentro del archivo pertinente.
Y posteriormente se debe crear su archivo JSON respectivo en el directorio correspondiente.

## Cómo se reemplaza
La propia naturaleza de este componente se diseñó para ser intrínsecamente dependiente del diseño del kernel actual.
Por lo que su reemplazo consistiría en cambiar cómo se analizan y gestionan los rastros en el código.
Es decir, modificando o desechando las fichas estáticas de JSON en favor de un sistema que lea abstracciones o un formato diferente (como bases de datos remotas en caso de que las reglas estrictas de kernel se relajen).
Requeriría modificar el comando CLI, las pruebas bidireccionales y las estructuras JSON.

## Costo de reemplazo
El costo estimado de reemplazo de esta estructura central es de talla **M**.
Ya que, aunque la mecánica de las fichas y pruebas de CI son relativamente directas de reescribir, el acoplamiento bidireccional exige auditar y modificar docenas de archivos en todo el sistema.
Reemplazarlo significaría tocar cada componente marcado en la arquitectura para adaptarse al nuevo paradigma de seguimiento.