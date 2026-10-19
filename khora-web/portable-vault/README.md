# Bóveda portable · candidato funcional, no activado

Este paquete es código de evaluación del único frente Llavero/Harmonia. El estado y las decisiones viven en `docs/frentes/llavero-harmonia/OBJETO-CANONICO.md`, no en otro canon. No es un instalador listo para datos reales ni una promesa de seguridad en equipos ajenos.

## Recorrido que sí ejecuta

1. Alta de una identidad sintética y URI estándar otpauth compatible conceptualmente con Ente; semilla e identidad age cifradas por separado, con propósito y titular vinculados mediante datos asociados.
2. Confirmación por código temporal usando otplib, no un verificador propio.
3. Sesión primaria verificada por Khora más código temporal para emitir autorización de 45 segundos, ligada a cuenta/bóveda y prueba de posesión de esta apertura, consumible una vez. El flujo web anterior conserva además su vínculo de sesión. Su digest, caducidad, consumo e intentos se almacenan en PostgreSQL, no en memoria de una función.
4. Cliente Node recibe la identidad en memoria. Descarga por flujo y cifra en formato age antes de escribir a disco; usa archivos exclusivos y promoción sin sobreescritura. Ante fallo se retira el temporal cifrado.
5. Análisis determinista local de texto UTF-8, original y derivados cifrados. Extrae solo propuestas de fragmentos fechados, con posiciones literales y huella del origen. No ratifica biografía ni genera contraseñas a partir de ella.
6. Cierre del cliente y reapertura con otra autorización; ensayo de restauración del almacenamiento cifrado conservando la llave de custodia por separado y el autenticador original.

## Componentes y límites

- `core.mjs`: servicio de autorización, envolturas AES-256-GCM mediante Node crypto y adaptadores de transacción. Archivos en formato age mediante age-encryption. El administrador custodio puede recuperar las identidades: no es conocimiento cero.
- `http.mjs`: Request/Response, solo POST JSON con origen HTTPS exacto, límite de cuerpo, sesión inyectada por servidor y respuestas no almacenables. No hay identidad confiable por cabecera arbitraria ni por cuerpo.
- `postgres.mjs`: Pool PostgreSQL con certificados TLS verificados y configuración explícita. La inicialización del esquema no ocurre en las peticiones.
- `session.mjs`: convierte una sesión YA VERIFICADA por `auth()` en principal con caducidad y vínculo a la cookie authjs. No autentica una cookie por sí mismo ni implementa OIDC.
- `client.mjs`: cifrado y análisis Node 22+. Antes de escribir/promover un cifrado verifica modo0600 en POSIX o DACL real de Windows: titular actual, SYSTEM y Administradores; rechaza cualquier otro Allow. No cambia ACLs ni políticas globales. Un anfitrión malicioso o una cuenta compartida siguen fuera de protección. `cli.mjs` añade entrada interactiva y enlace privado oculto; `native-open.mjs` abre Khora y recibe una autorización mediante un listener 127.0.0.1 efímero. No copia cookies ni conserva sesión propia. JavaScript no garantiza borrado seguro de memoria.
- `bridge.mjs`: autorización de una apertura, SHA-256 del verificador, estado aleatorio y consumo atómico de 45 segundos; reutiliza las tablas y controles del servicio. El intercambio nativo rechaza Origin/metadatos de navegador y no usa permisos del corpus ni refresh tokens. No es un servidor OAuth general.
- Pantallas `/sistema/seguridad/boveda-portable` y `/abrir`: sesión Khora, alta/confirmación Ente, código por apertura y enlace a ZIP autenticado. La semilla se oculta por defecto y se retira tras confirmación. Una sesión web aún válida puede reutilizarse; no se fuerza contraseña nueva del proveedor en cada apertura.
- `distribution/`: ZIP reproducible codificado y manifiesto de integridad. Incluye lanzador Windows, pero no es instalador firmado ni ejecución Windows verificada. No incluye secretos del servidor.
- `migrate.mjs`: migración explícita, rechazada salvo autorización específica en configuración. No se ejecutó contra servicios del usuario.
- La ruta `app/api/seguridad/boveda-portable/route.ts` usa `auth()` de Khora y permanece cerrada salvo configuración deliberada. Su presencia en una rama no la despliega.

### Reproducción sintética

Desde la raíz comprobada del repositorio, con Node 22+ y npm. No requiere credenciales ni lee `.env` del proyecto:

```sh
npm --prefix khora-web/portable-vault ci --ignore-scripts && npm --prefix khora-web/portable-vault run check && npm --prefix khora-web/portable-vault test
```

Los ensayos generan todo en memoria o en carpetas temporales únicas, cierran procesos/bases y borran sus temporales. Las evidencias sanitizadas contienen nombres y resultados, no semillas, autorizaciones, llaves ni corpus. `npm ci` comprueba las integridades del lock; no sustituye auditoría criptográfica ni verificación de firma del cliente.

### Configuración productiva pendiente, no instrucciones para activarla ahora

`DATABASE_URL`: servicio PostgreSQL autorizado; `PORTABLE_VAULT_CUSTODY_KEY_B64`: 32 bytes independientes de AUTH_SECRET y X_KHORA_KEY, con custodia/rotación/respaldo aprobados; `PORTABLE_VAULT_ALLOWED_SUBJECT`: identidad primaria permitida; `PORTABLE_VAULT_ORIGIN`: origen HTTPS exacto; `PORTABLE_VAULT_ENABLED`: compuerta de activación deliberada. La migración tiene además su propia compuerta `PORTABLE_VAULT_MIGRATION`. No hay valores de ejemplo para copiar ni secretos de desarrollo que habiliten producción.

El valor habilitador del código no significa que una revisión humana haya sucedido. No establecer ninguna compuerta por esta entrega. Falta validar el emisor OIDC y su identidad, la base alojada/TLS/concurrencia entre instancias, el alta Ente en un dispositivo confiable, el recorrido real del puente aprobado y la distribución en el dispositivo confiable, y la recuperación ante pérdida del autenticador. No se ofrece ruta de restablecimiento ni bypass offline no aprobado.

### Descargas y análisis

- Descarga productiva candidata: HTTPS directo, certificados de servidor comprobados por Node, IP pública IPv4 fijada tras resolución, sin cookies, sin credenciales de Google y sin seguir redirecciones. IPv6 y respuestas que exigen autenticación/redirección se rechazan por ahora.
- El enlace privado no se guarda en origen, registros ni evidencias: solo el origen no secreto y la huella del contenido se incorporan al informe cifrado. El cliente no imprime el enlace ni errores crudos de red.
- El ensayo de descarga utiliza HTTP loopback exclusivamente en el driver sintético y entrega el flujo al mismo cifrador. No acredita descargar Takeout real ni incorpora un fallback HTTP a `download()`.
- Límite predeterminado: 64 MiB. Ensayo adicional de 4 MiB; no prueba archivos Takeout grandes. Análisis solo UTF-8, límite de línea y de candidatos; ZIP/PDF/audio no se procesan silenciosamente como texto. Las posiciones son índices de caracteres UTF-16 de JavaScript.
- Una falla de autenticidad final o de huella impide promover el informe. Puede existir contenido parcial en memoria antes del rechazo: no se interpreta como resultado aceptado.
- No borra copias anteriores, no impide capturas del anfitrión, no garantiza ausencia de paginación/volcados de memoria. No abrir datos reales en la computadora de renta.

### Aceptación y pruebas del puente aprobado

El operador aprobó explícitamente sesión Khora más código Ente por apertura. Construcción y pruebas sintéticas realizadas, sin activación productiva. Pruebas básicas: 80 del núcleo y 34 del puente. Arnés `browser-test.mjs`: ocho comprobaciones Chromium local con identidad, reloj y códigos sintéticos; `route-test.cjs`: catorce comprobaciones de rutas compiladas con sustitución explícita de `auth()` y distribución. No prueban inicio de sesión real, aplicación Ente, PostgreSQL alojado, Windows ni corpus. Los dos arneses adicionales requieren dependencias de desarrollo de la raíz Khora (`esbuild` y `playwright`) y del paquete; el de navegador requiere `KHORA_QA_CHROMIUM` apuntando al Chromium instalado. No se incluyen en el ZIP de usuario. Evidencias sanitizadas en `evaluacion/native/bridge/`.

El tipado estricto de módulos nuevos contra los tipos reales instalados de Next/React pasó. No equivale a compilación completa de la nueva revisión de Khora. El despliegue manual previo corresponde a commit 58fd830, no a este puente. No se cambió ninguna cuenta, semilla real, permiso, servicio de datos ni despliegue en esta implementación. La compuerta sigue cerrada por defecto; fusión, activación y recuperación final requieren revisión humana.

La instalación previa del lock raíz reportó ocho alertas altas en dependencias preexistentes. Es un hallazgo de herramienta, no explotación demostrada ni alcance productivo determinado. No se ejecutó `npm audit fix --force`; resolver antes de aceptación productiva.
