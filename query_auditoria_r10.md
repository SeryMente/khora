# Consulta de Auditoría (R10)
Para responder a la pregunta "¿qué unificaciones estás aplicando y por qué?", el operador puede ejecutar la siguiente consulta Cypher directamente contra la base de datos (por ejemplo, en Neo4j Browser o a través del CLI `gh` si aplica).

```cypher
MATCH (n1:Entity)-[r:ES_EQUIVALENTE_A]->(n2:Entity)
RETURN
    n1.canonical_key AS Origen,
    n2.canonical_key AS Destino,
    r.confianza AS Confianza,
    r.evidencia AS Justificacion,
    r.created_at AS CreadoEl
ORDER BY CreadoEl DESC;
```
