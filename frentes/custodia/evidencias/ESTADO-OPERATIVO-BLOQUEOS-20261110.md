# Evidencia · repetición del último ciclo de CUSTODIA

Fecha de observación: 2026-11-10  
Repositorio: `SeryMente/khora` · proyecto Vercel `khora-web`  
Alcance: metadatos de variables de entorno y metadatos del almacén; lectura estática de código. No se solicitaron valores descifrados.

## 1. Resultado confirmado en Vercel Production

La enumeración de variables del proyecto se realizó con `decrypt=false`. El servicio informó `hiddenProductionEnvCount=0`. Se registraron estos nombres y destinos:

| Variable | Presencia en Production | Tratamiento del valor |
|---|---|---|
| `X_KHORA_KEY` | Sí | Sensible; no descifrado ni leído |
| `KHORA_API_KEY` | Sí | Sensible; no descifrado ni leído |
| `BLOB_READ_WRITE_TOKEN` | Sí | Encrypted; no descifrado ni leído |
| `KHORA_B2_MASTER_APPLICATION_KEY` | Sí | Sensible; no descifrado ni leído |
| `KHORA_B2_MASTER_APPLICATION_KEY_ID` | Sí | Sensible; no descifrado ni leído |
| `KHORA_B2_APPLICATION_KEY` | Sí | Sensible; no descifrado ni leído |
| `KHORA_B2_KEY_ID` | Sí | Sensible; no descifrado ni leído |
| `KHORA_LEGACY_BLOB_READS_ENABLED` | **No** | No aparece en la enumeración; no hay variables Production ocultas |
| `NOTION_TOKEN` | Sí | Sensible; no descifrado ni leído |
| `NOTION_DB_VOLCADOS` | **No** | No aparece en la enumeración; no hay variables Production ocultas |

**Lectura correcta:** queda verificada la presencia configurada de `X_KHORA_KEY` en Production, no su valor, su igualdad con la llave histórica ni el resultado de un descifrado en ejecución. La variable `KHORA_API_KEY` también existe, pero no se presume que sea equivalente. No se descargaron ni revelaron secretos.

## 2. Compuerta de lectura histórica de Blob

Archivo de código inspeccionado: `khora-web/lib/server/object-storage.ts`  
Blob SHA: `6b923cea659ba86c82e48650411dfb7658924363`.

El código define:

- `legacyBlobReadsEnabled()` como la comparación exacta `process.env.KHORA_LEGACY_BLOB_READS_ENABLED === 'true'`.
- Para una referencia Blob histórica, el lector rechaza la lectura con `storage_legacy_temporarily_unavailable` si la compuerta no está habilitada.
- `describeStoredObject()` representa la disponibilidad como `temporarily_unavailable` cuando la compuerta está apagada.

La enumeración completa de variables Production no incluye `KHORA_LEGACY_BLOB_READS_ENABLED`. Por tanto, **la compuerta de aplicación está ausente en la configuración actual consultada**. No se modificó.

## 3. Estado actual del proveedor Blob

Lectura de metadatos de Vercel Storage para el almacén:

- Nombre: `khora-audio`
- Store ID: `store_VyX9EI8q6DKhp4RV`
- `billingState: suspended`
- `usageQuotaExceeded: true`
- Proyectos conectados: 1

Esto confirma que el bloqueo del proveedor sigue activo en el momento de la consulta. No se efectuó GET de objetos. La suspensión y la compuerta de la aplicación son dos condiciones independientes.

## 4. Qué queda establecido y qué no

**Establecido con lectura de herramienta:**

1. `X_KHORA_KEY` está configurada como variable Production.
2. También existe `KHORA_API_KEY`; no se cotejó igualdad entre ambas.
3. La variable de control de lecturas históricas de Blob no está configurada en Production.
4. El almacén `khora-audio` sigue suspendido por exceso de cuota.
5. Existen variables Production con nombres correspondientes a credenciales B2.
6. `NOTION_DB_VOLCADOS` no figura en la configuración Production; la variable `NOTION_TOKEN` sí figura.
7. El código aplica la compuerta de lectura descrita, con comparación exacta a la cadena `true`.

**No establecido en este ciclo:**

- Que el runtime activo haya descifrado un ciphertext histórico con la `X_KHORA_KEY` actual.
- Que el valor de `X_KHORA_KEY` coincida con el que cifró cada payload histórico.
- Que los 785 objetos B2 referidos por la evidencia anterior sean físicamente descargables hoy.
- Que las 216 partes locales hayan sido extraídas, cotejadas o transferidas.
- Que el inventario de 95/79/16/87 sesiones y 1.311 partes descrito en la última salida del modelo sea correcto.
- Que los cuatro fallos de Notion descritos en esa salida hayan sido comprobados en esta consulta.
- Que exista un GET correcto de Blob; el proveedor está suspendido y no se hizo GET.

## 5. Resolución operativa del bloqueo

1. No buscar otra copia de `X_KHORA_KEY` fuera de las dos bóvedas autorizadas. No rotar ni sustituir la variable. Su presencia en Production elimina la hipótesis de que esté ausente de la configuración, pero no sustituye una prueba de descifrado cuando sea necesaria.
2. Mantener desactivada la lectura histórica mientras el almacén siga suspendido. No activar `KHORA_LEGACY_BLOB_READS_ENABLED` todavía.
3. Reactivar el almacén/proveedor y comprobar una lectura física de un objeto de prueba histórica. Solo tras ese resultado, habilitar la compuerta para Production y realizar el despliegue/activación controlada que corresponda.
4. En paralelo, continuar el inventario y verificación física de B2 y la recuperación local autorizada por el flujo KHORA. No convertir las marcas históricas de Neon en verificación física actual.
5. La ausencia de `NOTION_DB_VOLCADOS` bloquea el espejo a esa base de Notion, no el archivo canónico en Neon. No configurar la variable en este ciclo.

## 6. Trazabilidad y no-acciones

- No se leyó ningún valor secreto ni se solicitó descifrado.
- No se modificó configuración Vercel, código, despliegues, Neon, B2, Blob o bóvedas.
- No se creó ningún Volcado ni se modificaron vínculos de sesiones.
- No se ejecutó GET ni se transfirió ningún objeto.
- Esta evidencia no reemplaza el inventario base ni acepta el archivo de ninguna sesión.
- La última salida visible del modelo se conserva literalmente en `../originales/SALIDA-MODELO-CUSTODIA-BLOQUEOS-ULTIMO-CICLO-20261110.md`. Sus afirmaciones y cifras se preservan como salida histórica, pero no se elevan a evidencia verificada.
