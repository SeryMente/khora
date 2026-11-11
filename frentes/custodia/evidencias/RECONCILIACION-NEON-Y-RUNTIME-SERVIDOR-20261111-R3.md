# Reconciliación Neon y prueba de ejecución de servidor · CUSTODIA-01 · 2026-11-11 · R3

## 1. Criterio de titularidad y corrección del universo

La conciliación R3 aplica el criterio completo de propietario del sistema: `COALESCE(dictado_session.custodia_owner, dictado_session.checkpoint_usuario, volcado.usuario)`, con el Volcado enlazado cuando existe.

Resultado en Neon Production:

| Medida | Resultado |
|---|---:|
| Sesiones atribuibles por el criterio completo | 95 |
| Con propietario directo en la sesión/checkpoint | 84 |
| Sesiones históricas adicionales atribuibles por `volcado.usuario` | 11 |
| Sesiones ya enlazadas a Volcado | 16 |
| De las enlazadas, estado `archivado` | 13 |
| De las enlazadas, estado `en_revision` | 3 |
| Sesiones sin Volcado enlazado | 79 |
| Partes de audio en las 79 sesiones sin Volcado | 1.039 |

La cifra 84 de R2 era el subconjunto con propietario directo en la sesión/checkpoint; no representaba el universo completo de titularidad. Las 11 adicionales ya tienen Volcado vinculado y no se vuelven a procesar. Las 79 sesiones pendientes no cambian.

## 2. Componentes de audio no archivados

| Almacén según localizador de Neon | Sesiones | Partes | Bytes declarados |
|---|---:|---:|---:|
| Backblaze B2 | 5 | 785 | 64.166.900 |
| Vercel Blob legacy | 39 | 254 | 339.392.008 |
| **Total** | **44** | **1.039** | **403.558.908** |

Las 1.039 filas conservan el estado de base de datos `verificado`; es metadata histórica. No prueba que un GET físico actual sea posible ni sustituye longitud/SHA calculados sobre los bytes descargados.

Manifiestos B2:
- `754c8c26-bf25-4504-babe-59045af90d6c`: 384 partes, índices 1–384, contiguo.
- `36eeb04c-bbe7-4b72-bb6a-5e0d23cffce9`: 321 partes en el rango 1–322; falta índice 317.
- `31328e01-2af9-4cd8-8ade-c45a61ce746d`: 2 partes, índices 1–2, contiguo.
- `45f0cf5e-d1af-46c3-95af-e9428b8b0f90`: 77 partes, índices 1–77, contiguo.
- `b8362bce-55c2-48ed-ba06-327150ea3a61`: 1 parte, índice 1, contiguo.

Cuatro manifiestos B2 suman 464 partes contiguas. El manifiesto de 321 partes sigue incompleto por el índice 317. No se fabricó una parte ni se cerró el manifiesto.

## 3. Texto y deduplicación

La partición de las 79 sesiones sigue siendo: 44 con audio, 34 textuales sin audio y una sin checkpoint/texto ni audio localizado. Dentro de las 34 textuales, cuatro checkpoints representan texto vacío, uno contiene solo un salto de línea y 29 checkpoints vigentes son potencialmente significativos.

Entre esas 29: 27 SHA vigentes distintos; tres sesiones comparten una misma huella vigente. Las 17 coincidencias de SHA en revisiones antiguas siguen sin autorizar descartar el checkpoint actual. La sesión `48586f80-63d6-4969-9691-27e55cb5d5f5` permanece como candidata con checkpoint cifrado y sin revisiones. No se recuperó plaintext, no se creó Volcado y no se deduplicó por mera metadata.

## 4. Intento de ejecución por servidor, sin interfaz local

Se creó un sandbox Vercel temporal no persistente, `custodia-archive-20261111`, sesión `sbx_yhFmt9uCAZucoj7X9c7r7bwTH697`, y se detuvo al terminar la prueba.

Se transfirieron al sandbox los módulos de KHORA de la versión de Production, commit `f0224c1368fb15a3452335a44305c6efa85eef79`. Los SHA de los módulos principales de archivo, checkpoint, cifrado, Neon, B2 y custodia coincidieron con los observados en `main` (`c708901caa2500eb48d6723b709cee7db0d9904b`). La importación TypeScript de `guardarDictado()`, `fetchStoredObject()`, `descifrarTexto()`, `descifrarBytes()` y `reclamarSesion()` terminó correctamente.

El intento de instalar el binario opcional de FFmpeg falló porque el dominio de descarga no estaba permitido en la política de red del sandbox. La instalación de dependencias con scripts desactivados y la prueba de importación sí terminaron correctamente. Esto no constituye ejecución de archivado.

La consulta de variables de entorno de Production con solicitud de descifrado no devolvió los valores sensibles; las respuestas de `X_KHORA_KEY`, Master Application Key/ID de B2 y nombre/ID del bucket conservaron `decrypted=false` y valor oculto. No se extrajeron, imprimieron ni trasladaron secretos. El sandbox tampoco recibió esas variables.

La conexión temporal obtenida desde Neon se usó únicamente en una sentencia SELECT para verificar las 36 columnas necesarias y el inventario. No se mantuvo como variable de proyecto ni se ejecutó escritura. El runtime no recibió una identidad NextAuth del titular. No se invocó `guardarDictado()`, no se llamó a `reclamarSesion()`, no se hizo GET de B2/Blob y no se alteró la base.

## 5. Estado de ejecución y compuertas restantes

| Unidad | Resultado R3 |
|---|---|
| 16 sesiones ya enlazadas | Excluidas de nuevo archivado; 13 archivadas y 3 en revisión |
| 29 checkpoints textuales significativos | Localizados; descifrado y archivo canónico pendientes |
| 785 partes B2 | Localizadores y metadata reconciliados; GET físico/read-back pendientes |
| 254 partes Vercel Blob | Localizadores y metadata reconciliados; GET legacy pendiente |
| Hueco B2 317 | Pendiente localizar o documentar imposibilidad actual con evidencia específica |
| 216 fragmentos locales de dos sesiones | Preservados; no inspeccionados porque el operador excluyó monitor, Chrome local y RDC |
| Volcados nuevos creados en R3 | 0 |
| Escrituras en Neon, B2 o Blob en R3 | 0 |

**Dictamen R3:** se corrigió el universo de titularidad y se comprobó que los módulos canónicos pueden cargarse en un runtime aislado. El archivado no se ejecutó: el conector no expone las claves sensibles necesarias para descifrado/lectura B2 y el sandbox no dispone de la identidad NextAuth del titular. No se sustituye esa identidad con el rol de base de datos ni se omiten las validaciones de KHORA. Vercel Blob sigue sin GET físico; los fragmentos locales siguen fuera de los canales permitidos.

No hubo cambios de código, variables de Production, credenciales, bucket, deployment, merge ni control de responsabilidad. No se usó interfaz, monitor, Chrome local ni RDC.
