# Salida del modelo · conciliación de sesiones y manifiestos B2

Fecha: 2026-11-10
Frente: CUSTODIA

Se consultó en solo lectura el branch `main` de Neon y se aplicó el mismo predicado de titularidad que usa el código KHORA: `COALESCE(custodia_owner, checkpoint_usuario) = propietario autenticado`.

- 84 sesiones de titularidad: 5 ya vinculadas a un Volcado y 79 sin vínculo.
- 83 sesiones contienen `checkpoint_text` no vacío; 46 tienen al menos una revisión; 49 tienen partes de audio y 47 tienen fila MP3.
- Las 79 no vinculadas contienen 1.039 partes: 785 localizadas en B2 y 254 en Vercel Blob.
- 29 de las 79 tienen alguna revisión cuyo SHA coincide con un Volcado del mismo propietario. Esta coincidencia no basta para deduplicar: al comparar las firmas de audio, 21 no tienen audio, 4 tienen 708 partes B2 con manifiesto distinto y 4 tienen 48 partes Blob con manifiesto idéntico. Estas últimas cuatro son candidatas a duplicado exacto, pendientes de cotejo y decisión.
- Las 50 sesiones sin coincidencia de SHA se desglosan en 35 sesiones Blob (206 partes), 1 sesión B2 con 77 partes, 12 sesiones de solo texto con 1.020 revisiones, 1 sesión de solo texto sin revisiones y 1 sesión sin texto ni audio.
- En las 5 sesiones B2 sin vínculo, las 785 filas tienen estado de verificación `verificado`, SHA-256 con formato válido y bytes positivos. Cuatro manifiestos son contiguos (464 partes); el quinto contiene 321 filas, pero falta el índice 317. El validador de KHORA exige índices consecutivos y rechazará ese manifiesto.

El dato «verificado» en Neon representa el control registrado al subir; no demuestra que los objetos sigan disponibles físicamente. No se ejecutó GET B2, no se recalculó SHA con bytes descargados, no se descifró texto, no se creó Volcado ni se modificó Neon.

El preflight B2 de Production sigue aprobado. El almacén `khora-audio` de Vercel Blob sigue suspendido (`limits-exceeded-suspended`). La vía de archivo sigue necesitando el flujo autenticado de KHORA; no se utilizará SQL directo ni se habilitará la compuerta Blob antes de un GET satisfactorio.

Se mantiene CUSTODIA-01 como única tarea activa.