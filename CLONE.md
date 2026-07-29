# CLONE.md · arranque en maquina nueva

1. git clone https://github.com/SeryMente/khora.git
2. cd khora/khora-web ; cp .env.example .env.local
3. Rellenar .env.local con: pwsh -NoProfile -File ../scripts/khora/env-vault.ps1  (pide la contrasena maestra UNA sola vez)
4. npm ci
5. npm run build

## Variables del kernel Python
- DOCKER_NEO4J
- KHORA_CHUNK_OVERLAP
- KHORA_CHUNK_SIZE
- KHORA_EMB_MODEL
- KHORA_EMBEDDINGS_MODEL
- KHORA_ER_CAND_LIMIT
- KHORA_FSUM_WINDOW
- KHORA_FVAL_MODE
- KHORA_GLEANING_MAX_ROUNDS
- KHORA_LLM_API_KEY
- KHORA_LLM_BASE_URL
- KHORA_LLM_MODEL
- KHORA_LLM_TIMEOUT
- KHORA_MLLM_MODEL
- KHORA_NEO4J_TEST_PASS
- KHORA_NEO4J_TEST_URI
- KHORA_NEO4J_TEST_USER
- NEO4J_PASSWORD
- NEO4J_URI
- NEO4J_USER
- RAZ_MAX_PASOS
- TESTCONTAINERS_RYUK_DISABLED

## Reglas duras
- PowerShell 7. Sin Python local.
- Nunca git add -A ni git add . ; verificar git status --porcelain.
- UTF-8 sin BOM. -LiteralPath en rutas con corchetes.
- Neo4j por REST; el esquema neo4j+s no funciona en este entorno.
- La terna volcado_id/version/sha256 va DENTRO del objeto de procedencia.
- Neo4j es el grafo. Volcados/versiones/correcciones son otra base con otra credencial.

## Unica ruta de ingesta verificada de punta a punta
khora-web/app/sistema/editar/page.tsx#129 -> boton "Ingerir esta version".
NO retirarla hasta que la accion nueva en Archivo pase ING-DIRECT-01 en produccion.
