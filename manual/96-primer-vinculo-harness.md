# Runbook: Primer Vínculo Harness (`primer_vinculo.ts`)

Este comando permite al operador ejecutar la ingesta reproducible de un `volcado_id` en estado `listo_ingesta` hacia Neo4j Aura a través del bridge kernel Python (`/api/v1/ingesta`), verificando la presencia de nodos y relaciones de forma independiente.

---

## 🛠 Requisitos Previos

1. Variables de entorno configuradas (`.env` o `.env.local` en `khora-web/` o la raíz):
   - `DATABASE_URL`: Conexión a PostgreSQL.
   - `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Credenciales de Neo4j Aura.
   - `KHORA_API_URL`: URL base del kernel FastAPI (ej. `http://127.0.0.1:8000`).
   - `X_KHORA_KEY` o `KHORA_API_KEY`: Clave de autenticación entre servicios.

---

## 🚀 Uso del Comando

Ejecutar desde el directorio `khora-web/`:

### 1. Verificación previa en seco (Dry-Run)
Valida la procedencia del volcado en PostgreSQL y realiza un healthcheck contra el kernel y Neo4j sin modificar nada. Solo devuelve `ok: true` si ambos están saludables:

```bash
cd khora-web
npx tsx scripts/primer_vinculo.ts --volcado-id <UUID_DEL_VOLCADO> --dry-run
```

### 2. Ingesta Real y Verificación Independiente
Ejecuta la ingesta real del volcado en Neo4j Aura, actualiza la base de datos PostgreSQL (`estado = 'ingerido'`), registra auditoría y devuelve la verificación independiente de nodos y relaciones:

```bash
cd khora-web
npx tsx scripts/primer_vinculo.ts --volcado-id <UUID_DEL_VOLCADO>
```

---

## 📊 Estructura del Reporte JSON

La salida JSON en stdout incluye la información de verificación sin exponer texto ni datos privados:

```json
{
  "ok": true,
  "volcado_id": "11111111-1111-1111-1111-111111111111",
  "version": 1,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "io_id": "<UUIDv5 derivado de khora:volcado:<volcado_id>:v<version>>",
  "metodo_ingesta": "kernel_directo (/api/v1/ingesta)",
  "estado_volcado": "ingerido",
  "idempotent": false,
  "dry_run": false,
  "verificacion_neo4j": {
    "ok": true,
    "node_count": 5,
    "relation_count": 3
  },
  "needs_review_count": 2,
  "ratificacion": "ratificación automática (bypass temporal, ver 5C-FIX)",
  "timestamp": "2026-09-17T16:20:00.000Z"
}
```

---

## 🔄 Idempotencia

Si se ejecuta el comando sobre un volcado que ya fue ingerido previamente:
- El script **no duplica la ingesta**.
- Realiza la verificación directa en Neo4j Aura.
- Retorna `"idempotent": true` y `"ratificacion": null` en el reporte.


## Recuperación y compuertas

- Un volcado en `fallido` puede reintentarse: cada fallo incrementa `intentos`, conserva `ultimo_error` y deja trazabilidad de auditoría.
- El `io_id` se calcula como UUIDv5 canónico, igual que en el bridge Python. Un identificador remoto distinto bloquea la actualización de PostgreSQL.
- `needs_review_count` se obtiene del grafo verificado; nunca se fija a cero por defecto.
- Errores HTTP estructurados conservan la causa devuelta por el kernel.
