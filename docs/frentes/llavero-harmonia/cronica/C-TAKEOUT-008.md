# C-TAKEOUT-008

### C-TAKEOUT-008 · Google configurado, integración aún pendiente

**Objetivo terminal:** Google Drive → servidor autorizado → originales privados cifrados B2 → candidatos revisables del corpus. Presupuesto adicional cero. No se descarga Takeout al host compartido. NO terminado ni probado extremo a extremo; configuración externa no equivale importador usable.

**Cierre acreditado en este ciclo:** el operador aprobó una entrada privada de contraseña y la inspección posterior confirmó sesión Google Cloud. Se creó un cliente OAuth web SEPARADO «Khora Takeout» en Athanor/athanor-478307, proyecto826302016708. ID público826302016708-6oi9ep142and7lqnqrlr58kecn63u79m.apps.googleusercontent.com. Lectura posterior confirmó nombre, origin https://khora-web.vercel.app y callback exacto https://khora-web.vercel.app/api/takeout/google/callback; cliente Enabled. No se cambió el cliente Khora/OIDC existente ni claves Gemini. Drive y Picker mostraron «manage this API», no se atribuye a este ciclo su habilitación histórica. El permiso efectivo drive.file del usuario sigue SIN acreditar hasta ejecutar la autorización real de la aplicación; no confundir client config con grant.

Se creó «Khora Takeout Picker», recurso f158fb8d-944d-4951-b6c1-0dfaf5946ef6. Lectura posterior de su ficha confirmó Google Picker API como única API, restricción Websites y https://khora-web.vercel.app/* como único sitio. La clave pública del selector no concede Drive por sí sola. No clave Gemini reutilizada; no valores secretos en Git/Notion/chat.

**Custodia externa real:** Vercel API devolvió201 al crear tres variables y201 para la cuarta; consulta independiente de metadatos verificó destino exclusivamente production, sin ramas preview: TAKEOUT_GOOGLE_CLIENT_ID (encrypted), TAKEOUT_GOOGLE_CLIENT_SECRET (sensitive), NEXT_PUBLIC_TAKEOUT_GOOGLE_APP_ID (encrypted), NEXT_PUBLIC_TAKEOUT_GOOGLE_PICKER_KEY (encrypted). Las credenciales nuevas se extrajeron en proceso desde sus diálogos nuevos a temporal privado del agente y se enviaron al proyecto ya autorizado, nunca al equipo RDC. Después se retiraron seis archivos temporales propios con capturas/valores; no se afirma borrado físico seguro. No exportación de secretos existentes, cambios B2/DB/plan/producción ni despliegue. Nueva configuración todavía NO consumida por rutas productivas. Central informado solo del cambio de configuración/alcance, sin valores ni actividad de terminal remota.

**Código guardado y cotejado:** e85c388d439c40736ad7fa6e934eb84df9cc04ce en feat/takeout-import-3fea4187, sobre d8f1ca4 y base productiva histórica4ff. Añade db-config.mjs/.d.mts y10pruebas: TLS verificado sin fallback, hostname Neon estricto, eliminación únicamente de sslmode reconocido para que pg no reemplace el objeto SSL, rechazo de parámetros duplicados/desconocidos y channel_binding=require todavía no implementado. No conexión ni migración, no se tocó el getDb compartido con rejectUnauthorized:false. Una URL real incompatible debe bloquear, nunca debilitar TLS. 98/98 casos sintéticos y wrapper1/1,0fallos/0skip. Hashes Git de módulos/README/evidencia cotejados con archivos locales. NO typecheck/build global, red/SQL siguen simulados; no nuevas rutas HTTP/PickerUI/jobs/parser/consumidor corpus. No vender las pruebas como certificación de seguridad o servicios reales.

**Decisión material pedida y pendiente:** incorporar Vercel Workflows exclusivamente dentro del cupo Hobby para reanudación sin navegador. Propuesta aún NO aceptada/adoptada/instalada; no activar planes, trials convertibles, sobrecostos ni servicios por inferencia. Hobby active se verificó en C007 y la documentación oficial incluye eventos/datos Workflows con límites y pausas; eso NO verifica saldo real ni disponibilidad ilimitada. En historial de ejecución solo IDs opacos y estados públicos mínimos, jamás texto, archive bytes, tokens ni errores privados. B2 existente sigue siendo almacenamiento, no ejecutor. Cuotas B2/transferencias/Neon y consumo actual del proyecto siguen por comprobar. Respuesta del operador pendiente; no afirmar segundo plano activo.

**Pendientes en secuencia:**
1. Decisión anterior y preflight real de cuotas/capacidad sin gasto. Mantener reserva para app compartida y negar inicio si falta evidencia. No pedir aún original/enlace secreto al operador.
2. Integración autenticada Khora: rutas/Picker, nonce KHC1 SQL real/TLS, grants cifrados y renovación serializada CAS, selección por archivo y límites. El enlace de correo Takeout no está soportado universalmente: primer canal Drive+Picker.
3. Jobs duraderos con lease/CAS, recuperación, cancelación/revocación/retención; adaptar finalización que hoy relee el archivo completo a pasos realmente acotados. No exponer finalizador actual como función HTTP normal.
4. Parser maduro y acotado, partes/ZIP64/expansión/duplicados/zip-slip, preservación original y adaptador khora.corpus-autobiografico esquema0.1.0/especificación0.2.0. Candidatos privados/no revisados; no ratificación/publicación ni IA externa.
5. Ensayo sintético contra servicios reales, recuperación y lectura independiente, build/regresión global, revisión autenticada operador y promoción única central. Solo después primer archivo real con capacidad comprobada.

**En prueba / recién fallido:** error MODULE_NOT_FOUND de Playwright registrado y corregido usando agent-browser, sin repetir creación del cliente. Configuración Google y custodia nuevas acreditadas; datos reales/importación/corpus productivo NO. Plan Hobby no acredita B2hardcaps. Tiempo de cierre no estimable antes de decisión/runtime/cuotas y pruebas causales; no nuevo plazo inventado.

La conexión PC14 ya se propagó únicamente como datos de conexión a cinco frentes en C007; no se amplía acceso/rol por esa propagación. No mezclar mensajes de Meta/Signal/Workspaces con autorizaciones Takeout.

### Histórico C-TAKEOUT-007 · supersedido por C008


## Trazabilidad

Herramientas: Google OAuth client created y lectura posterior; nueva clave Picker creada con restricciones y ficha releída; Vercel201/metadata production; Git e85c388d;98+1ensayos; ninguna importación, DB ni producción. Error y corrección en Registro Canónico de Errores de Terminal. La pregunta Workflows se emitió realmente en chat antes de preparar este registro; respuesta pendiente. No se registra esta crónica como respuesta final emitida.
