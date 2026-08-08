# @l0 L0-003 · @req GRAFO/TABLAS

# Migración de Base de Datos para el Grafo Relacional en Postgres

Esta migración crea las tablas `nodos` y `aristas` en la base de datos de Postgres (por ejemplo, alojada en Neon) para reemplazar el almacenamiento y consulta del grafo que anteriormente utilizaba Neo4j.

## Instrucciones de Aplicación de la Migración

La migración se puede aplicar de dos formas principalmente:

### Opción A: Aplicación Automática (Auto-Provisioning)

El propio backend de Next.js (`khora-web/lib/server/grafo.ts`) cuenta con un mecanismo de auto-aprovisionamiento. Al invocar la función `obtenerNodos()` u `obtenerAristas()`, que a su vez llama a `asegurarGrafoEsquema()`, se ejecutarán las sentencias de creación de tablas e índices si no existen.

Por tanto, al desplegar la nueva versión del servicio y realizar una petición HTTP a `/api/grafo`, las tablas y sus índices se crearán automáticamente en la base de datos indicada por `DATABASE_URL`.

### Opción B: Aplicación Manual

Si prefieres ejecutar las sentencias de SQL manualmente mediante un cliente de Postgres (como `psql`, pgAdmin, o la consola SQL de Neon), puedes aplicar el contenido del script ubicado en `khora-web/db/migrations/007_grafo_tablas.sql`:

```sql
-- Creación de la tabla de nodos
CREATE TABLE IF NOT EXISTS nodos (
  id UUID PRIMARY KEY,
  summary TEXT NOT NULL DEFAULT 'Sin resumen',
  community INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  centrality NUMERIC NOT NULL DEFAULT 1.0,
  origen TEXT NOT NULL DEFAULT 'Desconocido',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  verificacion TEXT NOT NULL DEFAULT 'Pendiente',
  tipo TEXT,

  -- Procedencia completa
  volcado_id UUID,
  version INTEGER,
  sha256 CHAR(64),
  posicion_inicio INTEGER,
  posicion_fin INTEGER,
  sello_version_pipeline TEXT,
  marca_temporal_hecho TIMESTAMPTZ,
  marca_captura TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nodos_volcado_id_idx ON nodos (volcado_id);
CREATE INDEX IF NOT EXISTS nodos_tipo_idx ON nodos (tipo);

-- Creación de la tabla de aristas
CREATE TABLE IF NOT EXISTS aristas (
  id UUID PRIMARY KEY,
  source UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
  target UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  origen TEXT NOT NULL DEFAULT 'Desconocido',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  verificacion TEXT NOT NULL DEFAULT 'Pendiente',

  -- Procedencia completa
  volcado_id UUID,
  version INTEGER,
  sha256 CHAR(64),
  posicion_inicio INTEGER,
  posicion_fin INTEGER,
  sello_version_pipeline TEXT,
  marca_temporal_hecho TIMESTAMPTZ,
  marca_captura TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aristas_volcado_id_idx ON aristas (volcado_id);
```
