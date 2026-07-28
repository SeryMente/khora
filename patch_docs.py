with open("manual/95-poblacion.md", "r") as f:
    content = f.read()

replacement = "- **D2 (Control de Huérfanos):** Al momento de la escritura, se aplica un anclaje explícito `u -[:OWNS]-> nι -[:MENTIONS]-> e` para todas las entidades tocadas en la ingesta. La guardia de alcanzabilidad se ejecuta dentro de la misma transacción y está **estrictamente acotada** a los nodos de la ingesta en curso, prohibiéndose el rollback silencioso: si se detectan huérfanos se aborta con `HuerfanosDetectadosError`."

match_str = "- **D2 (Control de Huérfanos):** Al momento de la escritura Cypher en `escribir_ingesta()`, se comprueba mediante un `EXISTS { MATCH (:User)-[*]->(n) }` que todo nodo en el grafo esté alcanzable desde un nodo `:User`. De generarse huérfanos, la ingesta hace ROLLBACK completo y se loguea un error, rechazando la escritura."

content = content.replace(match_str, replacement)

with open("manual/95-poblacion.md", "w") as f:
    f.write(content)
