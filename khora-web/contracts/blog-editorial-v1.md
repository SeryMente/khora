# Blog editorial v1 · contrato técnico compartido

No es objeto canónico ni fuente de estado vivo. Gobierno único: SeryMente/metodologia/frentes/blog-personal/OBJETO-CANONICO.md. Ampliación del operador y coordinación Ingreso de 2026-10-19. Implementación en rama de desarrollo; no equivale a despliegue.

## Frontera y nombres finales
Ingreso conserva captura, audio, texto, títulos, selector, ofuscada, checkpoints y archivado MANUAL. Tipos `general | conversacion_maya | interpretacion_simultanea | blog_personal`; todo volcado se archiva solo por acción humana, incluidos recuperados. Selector, autosave, checkpoint y marca no consienten publicación. Blog acepta únicamente `blog_personal`; no lee transversalmente otros tipos.

Ofuscada es marca privada de entrada completa, no cifrado/anonimato. Se guarda literalmente, sin resolver alusiones; aclaraciones posteriores son vínculos privados fechados, no reemplazos. No exportar marca o aclaraciones. Exposición del texto ofuscado requiere decisión expresa, ligada al mismo digest.

## Secuencia y respuestas perdidas
1. Acción humana «Archivar registro»: Ingreso persiste **antes de enviar** la intención editorial en su snapshot durable: `publicationIntent: {decision: null | boolean, sourceTextSha256, state: 'awaiting_archive' | 'awaiting_decision' | 'awaiting_editorial_receipt' | 'received'}`. No contiene tokens. El campo decision jamás se obtiene de un selector/default. No almacena consentimiento en un checkpoint como si fuera un volcado.
2. Ingreso archiva mediante su servicio existente; espera recibo **verificado** `{volcado_id, version, sha256}`. La referencia solo existe después del archivado; propietario derivado de sesión en servidor. Respuesta perdida: reconciliar el recibo con identidad estable de captura/archivo; NO crear otro volcado para forzar publicación. Este contrato no modifica el protocolo de ingesta ni su unidad de información.
3. Preparar representación pública y vista previa; el formato de Facebook y su texto exacto deben estar visibles/aprobados (enlace+texto o texto completo). No elegirlo silenciosamente. No hay selector de destinos: siempre ambos.
4. Pregunta única: **¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?** Sí aprueba ambos para digest exacto; No mantiene el archivo en Custodia y lo clasifica archivado sin autorización, nunca pendiente. Si falta todavía el recibo editorial, conservar la decisión/intención durable y reconciliar sin reenviar publicaciones. Si edición cambia digest volver a requerir decisión, no reutilizar Sí.
5. Blog confirmado públicamente → Facebook → confirmación independiente. Fallo parcial conserva archivo y recibos; se reintenta solo lo faltante. No atomicidad entre proveedores.

## Endpoint de sesión
`POST /api/blog/editorial` (Khora, no GitHub Pages), cookie de sesión existente (`auth()`), Origin exacto del issuer configurado; sin identidad suministrada por cliente. No existe doble operación dentro de `POST /api/dictado`: publicación se conecta **después del recibo de archivado**. Prohibido tocar dictado desde Blog.

Toda solicitud incluye `_norm_turn_token`, `_thinking_mode` y `_output_format_version: 'v1.7.7'`, ciclo normativo real abierto y vigente. `NORM_GITHUB_CREDENTIAL_REJECTED` bloquea esa adquisición; no introducir bypass. No solicitar secretos en UI/chat.

### Preparar
JSON `action: 'prepare'`, `expectedRevision: null` al crear (entero previo al editar), `revision`:
- `publicationId`: UUID estable persistido/reutilizado por Ingreso, nunca UUID nuevo por reintento;
- `revision`: entero positivo; `sourceId`: volcado_id; `sourceVersion`: version; `sourceHash`: sha256 privado verificado;
- `kind: 'blog_personal'`, `obfuscated`: boolean privado;
- `entry`: **solo** `{schema:1, slug, title, date, body, source:{kind:'khora',sha256}}`; esta última huella corresponde al texto público seleccionado, no al original privado. Fecha ISO con zona explícita, título máximo160, cuerpo máximo200000; slug estable minúsculas/dígitos/guiones;
- `facebook`: `{format:'link'|'full_text',message:string}`; no campo destino ni `none`.

Respuesta: `{publicationId,revision,digest,preview,facebook,question,destinations:['blog','facebook']}`. El digest SHA256 cubre la revisión completa en JSON canónico de claves ordenadas, incluyendo fuente privada/version, representación pública, ofuscada y formato/texto Facebook. Mostrar ambas representaciones públicas antes de recoger Sí. Proteger borradores en servidor con cifrado existente; nunca originales privados en repo público.

### Decidir
JSON `{action:'decide', publicationId, digest, decision:boolean, obfuscatedExposure:boolean}` más campos normativos. `obfuscatedExposure` solo true si hubo decisión expresa de exponer este texto ofuscado; no equivale a exportar la marca. Sí crea dos trabajos idempotentes por `(publicationId,revision,target)`; No revoca pendientes no enviados y mantiene Custodia. Si ya hubo envío, retirada exige operación revisada distinta; no fingir que No despublica.

### Consultar / recuperar recibo
JSON `{action:'status',publicationId}` más campos normativos. Respuesta incluye `revision,consent:'pending'|'declined'|'approved',obfuscated,deliveries:[{revision,target,state,url,proof_hash,last_code}],filter`.
Filtros editoriales: `archived_without_permission`, `awaiting_decision`, `publication_pending`, `published_both`; ofuscada es filtro independiente. Solo dos confirmaciones para revisión actual permiten published_both. No mezclar recibos de distintas revisiones. El estado consultado permite reconciliar una respuesta de decide perdida sin crear publicación nueva.

## Acceso MCP mínimo
Herramientas proyectadas: `khora_blog_cambios(after,limit)` con scope `blog:read` más ciclo normativo; `khora_blog_estado(publicationId)` con scope `blog:read`; solo snapshots públicos aprobados del propietario, nunca originales/metadatos privados. No concede `volcados:read`. Comprobantes los escribe exclusivamente coordinador autenticado después de comprobación independiente; no se necesita dar a un lector una herramienta de escritura arbitraria. Edición/aprobación solo endpoint de sesión humana, nunca automática por el modelo.

Cursor secuencial, límite1..100, cada elemento con publicationId/revision/digest. Descubrimiento de revocaciones/retiradas requiere feed de tombstones antes de anunciar sincronización completa (pendiente si no implementado). Lecturas no migran ni escriben base readonly.

## Metadatos internos
Extracción por proveedor Groq existente, métodos/versiones conservados como propuestas no ratificadas. Anclas exactas `{sourceId,version,sha256,start,end,quote}` (offsets UTF-16 de JS, rango semiabierto). Solo valores literales dentro de quote única. Tiempo del hecho desconocido permanece null; capture/received independientes. No inferir personas, causas, fechas ni emociones/diagnósticos; no escribir grafo automáticamente. Propuestas y rectificaciones permanecen privadas. Una extracción fallida no borra original.

## Ejecución, políticas y compuertas
Outbox durable en Postgres existente, migración aditiva administrativa, no desde lectura MCP. Tokens solo servidor; se debe verificar rol/base de destino y migración antes de activar rutas. API oficial Meta Graph v26.0: verificar /me/accounts con token User, tasks/permisos y token Page; URL numérica no acredita identidad ni administración. Credenciales Pages y normativas son distintas.

Actualizaciones: edición invalida aprobación; nuevo digest exige nuevo Sí. Primera versión del driver no sobrescribe slug con contenido diferente; actualización/retirada real quedan bloqueadas hasta operación explícita revisada y recibos por destino. Git/cachés/copias externas no desaparecen por retirar una página. Facebook unknown/submitting no se reenvía a ciegas: recuperar ID o conciliación administrativa verificada. Reintentos acotados, confirmaciones independientes, ningún fixture en destinos reales. Prohibido declarar conectado/sincronizado por código/commit/HTTP aislado.

Activación requiere: credencial normativa vigente; revisión/merge y regresiones del servidor; migración real verificada; permisos/tokens oficiales mínimos; coordinador persistente y credenciales servidor configurados; lectura/aprobación de primer texto/formato. No hay publicación real acreditada por este contrato.
