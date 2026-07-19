# Motor Neo4j — Sustrato C1/C2

El submódulo `drivers/motor/` implementa el sustrato base C1 (base de datos de grafos Neo4j) y C2 (el esquema congelado del Personal Knowledge Graph, PKG) dentro de Khora. Este motor es accesible estrictamente mediante la API del kernel y no se debe importar directamente desde el exterior.

## Esquema G=(N,R,T)

El sistema utiliza un esquema semántico estructurado:
- **N (Nodos)**: Representados por la clase inmutable `ObjetoDeInformacion`.
- **R (Relaciones/Aristas)**: Representados por los arcos entre los objetos (el tipo de la relación).
- **T (Triples)**: Representados por la clase inmutable `Triple`.

Cada elemento de conocimiento que es ingestado (nodos y triples) incluye de forma estricta:
1. Identificadores únicos (`id`) consistentes de tipo UUID.
2. Metadata extraída del contexto (`µ`).
3. Procedencia (`σ`), documentando de dónde vino la información, incluyendo el driver y su `timestamp`.

Todo esto está soportado a nivel de base de datos gracias a los *constraints de unicidad* creados al momento de inicializar el esquema.

## Sustrato Neo4j

El puerto `memoria_organizada` es implementado a través de `Neo4jMemoriaOrganizada`, utilizando únicamente el *driver oficial `neo4j` de Python*. Todo acoplamiento a terceros o frameworks pesados (ORMs, librerías no nativas) ha sido vetado para garantizar cero-vendor lock-in de alto nivel.

Para inicializar o asegurar los esquemas de bases de datos antes de usar el componente, se llama a `inicializar_esquema()`.

## Ejecutando Localmente (Desarrollo)

Se ha provisto un `docker-compose.yml` en la carpeta `kernel/` para levantar una instancia local efímera de Neo4j 5.x LTS. El acceso y las credenciales por defecto están pensados para desarrollo:

```bash
cd kernel/
docker compose up -d
```
Las credenciales por defecto (`NEO4J_USER` y `NEO4J_PASSWORD`) utilizan el usuario `neo4j` y clave `neo4jpassword`.

## Tests

El motor contiene pruebas reales así como suites de mock. Para ejecutar los tests:

1. Levantar el sustrato C1 (ver arriba).
2. Correr las pruebas ubicadas en `kernel/tests/contrato/`:
```bash
PYTHONPATH=$(pwd):$(pwd)/kernel/src DOCKER_NEO4J=1 pytest kernel/tests/contrato/test_memoria_organizada_motor.py
```

En los entornos de CI que no cuenten con Docker nativo se saltarán los tests de Neo4j real si no existe la variable de entorno y en su lugar se usarán los funcionales de mock definidos para testear la invariancia del puerto lógico.

*M-1 · feat/m1-motor-sustrato-esquema*
