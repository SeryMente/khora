### Salidas visibles del modelo durante este ciclo

**1.**

En el equipo autorizado, el perfil Chrome `Profile` contiene el almacenamiento IndexedDB de `khora-web`; eso confirma que hay material local que merece conservarse, pero no demuestra todavía que los 216 fragmentos estén completos ni descifrables. El clon local de KHORA está en una rama de Harmonia con modificaciones sin publicar y no tiene `.env.local` ni dependencias instaladas; no lo voy a reutilizar ni limpiar porque podría destruir trabajo ajeno a CUSTODIA. Buscaré una ruta canónica de verificación B2 desde Production.

**2.**

Encontré un avance importante que cambia la prioridad: el build de Production más reciente ya ejecutó el preflight B2 y devolvió `native_auth=PASS`, `master_key=PASS`, `bucket_identity=PASS`, `bucket_private=PASS` y `sse_b2_default=PASS`. B2 sí está autenticando y el bucket privado está reconocido; esto no equivale todavía a descargar y cotejar cada audio histórico. Puedo seguir avanzando en esa vía sin esperar a Blob.

**3.**

La petición de tu parte, por ahora, es concreta: necesitamos que Vercel reactive `khora-audio` o confirme una vía de lectura temporal. La documentación oficial de Vercel indica que un Blob puede quedar pausado por superar el límite del plan o por decisión del equipo; recomienda revisar el panel del almacén y acudir a soporte si la pausa parece incorrecta. No borres ni recrees el almacén: los objetos históricos deben conservar sus localizadores. Mientras tanto registro el preflight B2 y la evidencia local en CUSTODIA. [Documentación de bloqueo de Blob](https://vercel.com/docs/vercel-blob/blocked-store).