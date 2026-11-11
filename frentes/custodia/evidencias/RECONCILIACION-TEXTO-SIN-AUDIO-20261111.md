# Reconciliación de registros textuales sin audio · 2026-11-11

## Objetivo y alcance

Identificar el siguiente registro textual propio que pueda archivarse mediante el flujo canónico de KHORA, sin audio, sin deduplicar solo por semejanza y sin leer plaintexts directamente de Neon.

## Resultado de la conciliación

Consultas SELECT-only sobre Neon Production, usando el predicado de titularidad del backend `COALESCE(custodia_owner, checkpoint_usuario)`, identificaron el universo de 79 sesiones propias sin Volcado vinculado:

- 44 sesiones con audio, 1.039 partes.
- 34 sesiones con checkpoint textual y sin audio.
- 1 sesión sin texto ni audio.

Las 34 sesiones textuales se desglosan por coincidencia SHA-256 con Volcados del mismo propietario:

| Grupo | Sesiones | Revisiones | Tratamiento |
|---|---:|---:|---|
| Alguna revisión o checkpoint coincide con SHA de un Volcado propio | 21 | 3.846 | Reconciliar antes de crear; no duplicar por inferencia |
| Sin coincidencia SHA con Volcado propio | 13 | 1.020 | Candidatas textuales; recuperar por endpoint autenticado y verificar |
| **Total** | **34** | **4.866** | |

Las 13 sesiones sin coincidencia incluyen 12 con 1.020 revisiones y una sesión sin filas en `dictado_checkpoint`, pero con `dictado_session.checkpoint_text` y SHA-256 válido.

Todas las 34 sesiones textuales muestran marcador cifrado `khc1.` en `checkpoint_text` y SHA de checkpoint con formato válido. No se consultó el contenido plaintext ni se intentó descifrarlo directamente en Neon.

## Primer candidato textual

La consulta aisló una sola sesión sin audio, sin revisiones y sin coincidencia SHA con un Volcado propio:

- `session_id`: `48586f80-63d6-4969-9691-27e55cb5d5f5`
- `estado`: `checkpoint`
- Creación/actualización: `2026-10-15T17:55:00.481Z`
- `checkpoint_text`: marcador `khc1.`, 24.853 caracteres cifrados.
- `checkpoint_sha256`: 64 caracteres hexadecimales.
- Revisiones: ninguna.
- Audio asociado: ninguno.
- Coincidencia SHA con Volcado del propietario: ninguna.
- Volcado vinculado: ninguno.

El registro es candidato, no archivo aceptado todavía: se requiere que el runtime canónico autentique al propietario, descifre el checkpoint y coteje el SHA antes de enviarlo a archivo.

## Ruta canónica confirmada por inspección estática

En `main` del repositorio `SeryMente/khora`:

1. `GET /api/dictado/checkpoint?sessionId=<id>` exige sesión NextAuth autenticada. Para una sesión no sellada, recupera el snapshot/checkpoint, descifra el texto y verifica el SHA-256. No exige la cookie de desbloqueo de bóveda; esta ruta permite validar el candidato textual sin audio.
2. `POST /api/dictado` exige sesión autenticada, reclama la sesión para el propietario y llama a `guardarDictado`. Con `fuenteEntrada="texto"` y sin partes de audio, no requiere descarga B2/Blob ni cookie de bóveda.
3. Después del POST, se debe verificar por lectura de vuelta el Volcado creado, SHA de texto, propietario y vínculo con la sesión. La respuesta HTTP 201 aislada no basta como cierre.

No se ejecutó ninguno de estos endpoints en este ciclo porque no se dispuso de una sesión NextAuth del propietario utilizable desde el canal de ejecución. No se intentó obtener, copiar ni inspeccionar cookies o secretos.

## No-acciones

- No se leyeron textos plaintext de Neon.
- No se alteraron filas ni estados de sesiones.
- No se creó ni vinculó ningún Volcado.
- No se modificaron audio, B2, Blob, configuración, variables, credenciales, código o despliegues.
- Las consultas fueron SELECT-only.

## Próximo paso

1. Abrir KHORA Production en el navegador autorizado e iniciar sesión como el propietario.
2. Recuperar esta sesión por `GET /api/dictado/checkpoint?sessionId=...`; confirmar descifrado y SHA.
3. Archivar mediante `POST /api/dictado` con fuente textual y sin audio; leer de vuelta el Volcado y vínculo.
4. Continuar con las otras 12 sesiones textuales sin coincidencia SHA; después retomar los manifiestos B2, empezando por el candidato de 77 partes documentado en §28–29 del OCP.
5. Reconciliar aparte las 21 sesiones con coincidencia SHA. La coincidencia de texto no determina por sí sola que audio/procedencia esté cubierto.

**Conclusión:** se identificó una unidad textual sin audio más simple que el candidato B2. Es la siguiente unidad de archivo; está técnicamente preparada, pero sigue pendiente del contexto autenticado del propietario. CUSTODIA-01 continúa como única tarea activa.
