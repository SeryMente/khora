# S1 · Ciclo 0 — Preflight de ingesta y grafo

**Fecha:** 2026-09-22  
**Rama:** `s1/c0-preflight-ingesta-grafo`  
**Base:** `main` @ `0a2bcc0e6feb58e436411feaf22530b08443bf24`  
**Alcance:** inventario y compuertas; ningún código productivo modificado.

## Objetivo

Confirmar capacidad real de escritura, fijar la línea base remota y enumerar los jueces que gobernarán S1 antes de modificar la ingesta, Leiden, fSUM o `/grafo`.

## Archivos críticos verificados en la línea base

| Archivo | SHA GitHub |
|---|---|
| `khora-web/package.json` | `41cb9ce2afd781668d48f1269a7f22a99833e28b` |
| `.github/workflows/ci.yml` | `c5189e35b97245919a7fc12091d677593be53749` |
| `api/requirements.txt` | `bda9d4f7271acf2c28ca027589bbd7865c6799b7` |
| `kernel/pyproject.toml` | `ca26cb9be878ee7694e59e3c3e64c9e0d37aedd8` |
| `khora-web/scripts/primer_vinculo.ts` | `5b747800a047ed0f8191408a90144053dc2d74fc` |
| `khora-web/lib/server/grafo.ts` | `46ea08a1c66db5219605618aed2ef63a64207fe5` |

## Jueces disponibles

### Kernel Python

La Integración Continua instala `kernel/[dev]` y ejecuta:

1. `ruff check .`
2. `pyright`
3. Neo4j mediante `docker compose up -d`
4. `python kernel/scripts/setup_neo4j.py`
5. `pytest`

### API FastAPI

1. `pip install -r api/requirements.txt`
2. `pytest api/tests/`

### Aplicación web

1. `npm ci`
2. `npm run typecheck`
3. `npm run ui-review:check`
4. `npm run test:unit`

Pruebas de extremo a extremo existen en `package.json` como `npm run e2e`, pero el flujo `ci.yml` vigente no las ejecuta.

## Hallazgos de preflight

1. La rama se creó desde el SHA exacto de `main`; la escritura queda acreditada por este commit documental.
2. `primer_vinculo.ts` conserva las brechas catalogadas: dry-run puede devolver `ok: true` con kernel/Neo4j no sanos, fabrica un identificador degradado en ciertos caminos y fija `needs_review_count` en cero.
3. `grafo.ts` conserva límites independientes, defaults comunitarios y ausencia de truncamiento declarado.
4. `api/requirements.txt` no instala `networkx`, `igraph` ni `leidenalg`; `kernel/pyproject.toml` los limita al extra `dev`.
5. El gate actual permite probar Neo4j real en el job del kernel, pero las futuras pruebas web que dependan de Neo4j necesitarán un arnés explícito o permanecer en el kernel/API.

## Secuencia ratificada

El siguiente ciclo es S1-C1: sanear Primer Vínculo antes de modificar Leiden. La lectura del grafo se corrige en S1-C2. La arquitectura Leiden permanece detrás del candado de decisión de S1-C3.

## Criterio de cierre del Ciclo 0

- [x] Rama creada desde `main` exacto.
- [x] Escritura remota ejercida sin tocar producto.
- [x] Jueces inventariados.
- [x] Archivos críticos y SHA fijados.
- [x] Brechas de arranque contrastadas contra el remoto actual.
- [x] Siguiente ciclo identificado.
