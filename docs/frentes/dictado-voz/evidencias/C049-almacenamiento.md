# C049 · Almacenamiento audio · diagnóstico y propuesta, no implementación

- Revisión base4fb3b7d5f07efef770eac398646ff9d87f86b505; canon basebac206bc02c206162eb9347ff9a65f6be2c5e17e; producción91d729396398240f0b4745fd5645f15c7c9fd935.
- Respuesta oficial Vercel del ciclo: khora-audio; limits-exceeded-suspended; suspended; usageQuotaExceeded:true; size1010497194; count636; isTokenExpired:false. No dimensión exacta/fecha de desbloqueo demostradas.
- Fuentes oficiales consultadas:
  - https://vercel.com/docs/storage/vercel-blob/usage-and-pricing
  - https://developers.cloudflare.com/r2/pricing/
  - https://www.backblaze.com/cloud-storage/pricing
  - https://www.backblaze.com/docs/cloud-storage-data-caps-and-alerts
  - https://www.backblaze.com/docs/cloud-storage-create-and-manage-caps-and-alerts
  - https://supabase.com/pricing
- R2:10GB-mes Standard,1M ClaseA,10M ClaseB, salida gratis; exceso de almacenamiento/operaciones se cobra. No se verificó límite duro de gasto de una cuenta concreta.
- B2:primeros10GB gratis, salida gratis hasta3x promedio almacenado/mes; excedentes pueden cobrarse. Docs caps permiten límites de gasto por categoría, no cubren ClaseD; cambios pueden tardar10min. No confundir alertas con bloqueo duro universal. Cuenta sin activar facturación y controles efectivos por verificar. No activar funciones ClaseD/Event Notifications.
- Supabase1GB gratuito y pausa por inactividad; no seleccionado.
- Recomendación material pendiente: B2 privado para evaluar ruta sin activar cargos; no cuenta creada, no proveedor aprobado ni SDK introducido. Mantener app en Vercel. Si no permite cero gasto efectivo/uso suficiente no provisionar por inferencia.
- Compatibilidad por resolver: put en carga/importación/MP3; list en reconciliación; allowlist de lectura/importedAudio; acceso servidor autenticado, cifrado existente, longitud/hash/manifiesto, lecturas parciales/autorización, reintentos/idempotencia y medición cuota. Prohibido resolver con URLs arbitrarias o retirar controles.
- Migración: conservar origen y claves/manifiestos; copia sin destrucción solo donde lectura disponible; verificar objeto a objeto; original bloqueado no equivale a perdido ni migrado. Copia local no acredita servidor. No dirigir nueva escritura hasta prueba de integración aprobada.
- Sin pruebas nuevas de runtime ni fullbuild en C049. Sin plan/cargos/secretos/DB/runtime/deploy/main ni publicaciones modificados.
- Coordinación recibida de Universo-datos documentaria; escritor exclusivo de su carpeta y sin construcción delegada. Corpus privado no es proyección pública, cambio de almacén no autoriza publicación.
- Documentación en rama aislada de la rama con runtime; canon es el mismo path. Integración pendiente, no afirmar rama funcional actualizada ni despliegue.
