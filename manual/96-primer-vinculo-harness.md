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
Valida la procedencia del volcado en PostgreSQL y realiza un healthcheck contra el kernel y Neo4j sin modificar nada:

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
  "io_id": "io-11111111-1111-1111-1111-111111111111",
  "metodo_ingesta": "kernel_directo (/api/v1/ingesta)",
  "estado_volcado": "ingerido",
  "idempotent": false,
  "dry_run": false,
  "verificacion_neo4j": {
    "ok": true,
    "node_count": 5,
    "relation_count": 3
  },
  "needs_review_count": 0,
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
