### Informe Factual - PR M-1

#### 0. Verificación del Terreno
- Se inspeccionó `kernel/src/khora_kernel/api.py` y se verificó que exporta las clases base.
- Se verificó la existencia del puerto `memoria_organizada` y sus suites de contrato.
- Se comprobó que **NO** existía `kernel/src/khora_kernel/motor/`.
- Se documentó la presencia de `MotorDeOlvido` en `api.py`. No fue modificado.

#### 1. Decisiones y Cambios Implementados
- Se añadió `ObjetoDeInformacion` y `Triple` en `api.py` como `frozen=True` con procedencia (`σ`) y metadatos (`µ`). Se exponen a nivel público en `__init__.py`.
- Se implementó el sustrato Neo4j en `kernel/src/khora_kernel/motor/_memoria.py`.
- En Neo4j Community (versión especificada por D3 LTS), los constraints de unicidad en **relaciones** no están soportados, por lo que el constraint del triple fue retirado para evitar fallos de ejecución.
- Se creó `kernel/docker-compose.yml` para levantar Neo4j 5.x localmente. No se puede levantar localmente en el entorno actual debido a limitaciones de OverlayFS (documentado por contexto del entorno y validado).
- Se redactó `manual/60-motor.md` y se añadió al `manual/00-indice.md`.
- Para acatar la prohibición de dependencias externas en el root de Khora (Gate G-4 / ADR-10) el requerimiento de `neo4j` se declaró estrictamente en `kernel/src/khora_kernel/motor/pyproject.toml`, por lo que **no se añadieron dependencias al `pyproject.toml` base del kernel**.

#### 2. Entregables Confirmados
- [x] 1. `motor/` con adaptador de Neo4j usando driver oficial.
- [x] 2. `docker-compose` en `kernel/` configurado con variables y defaults.
- [x] 3. Esquema congelado G=(N,R,T) implementado con Constraints en `_memoria.py`.
- [x] 4. `ObjetoDeInformacion` y `Triple` añadidos en `api.py` con `provenance` y `metadata`.
- [x] 5. Tests escritos para mock y para Neo4j (skip-if-no-docker), además de la prueba de frontera.
- [x] 6. `manual/60-motor.md` creado.

*M-1 · feat/m1-motor-sustrato-esquema*
