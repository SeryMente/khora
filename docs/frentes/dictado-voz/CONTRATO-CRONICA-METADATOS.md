# U06 · Checklist de crónica personal y adquisición de metadatos

Estado: implementación inicial en rama aislada; pendiente de CI, prueba visual y aceptación funcional.

## Contrato de experiencia
- Checklist corto, accesible y progresivo. Los criterios resueltos reducen su prominencia y usan una transición breve de cierre; la escritura no se bloquea.
- Análisis con Groq tras una pausa de 900 ms, con cancelación de peticiones obsoletas y fallback si falta la clave, falla la red o el modelo devuelve contenido inválido.
- Criterios: Fecha y hora, Lugar, Momento y Qué pasa. Fecha/hora queda activa si el texto no contiene evidencia explícita; la hora de recepción del servidor se distingue del momento narrado.
- Lugar solo se resuelve semánticamente si el relato aporta evidencia. La IP y los encabezados de geolocalización son contexto aproximado, no prueba de dónde ocurrió el suceso.
- Momento requiere evidencia y normalización a general/concreto/especializado. Un término nuevo requiere que sea mejor que los valores usuales y una justificación explícita.
- «Qué pasa» permite hechos, observaciones, sentimientos, ideas y acontecimientos; no presupone una acción.

## Metadatos y límites de privacidad
- Esta implementación intenta leer IPv4 desde encabezados expuestos por el alojamiento (x-real-ip o x-vercel-forwarded-for) y registra hora de recepción.
- Lee, cuando se exponen, ciudad/región/país/zona horaria aproximados (x-vercel-ip-*). La disponibilidad depende del proveedor; no se promete geolocalización exacta.
- No recopila GPS, cookies, credenciales, identificadores de hardware ni huella persistente. No se maximiza la identificación del dispositivo por defecto.
- Cuando GROQ_API_KEY está configurada, el texto de la crónica se envía a Groq para análisis. Esta ruta no persiste el texto ni los metadatos; el tratamiento/retención del proveedor externo depende de sus políticas y configuración. La UI debe informar de este envío.
- El endpoint no persiste metadatos ni crónicas. La adquisición transversal a todos los canales es un frente arquitectónico pendiente; añadir el checklist a Ingreso no equivale a completarlo.

## Verificación pendiente
- Ejecutar npm run typecheck, npm run ui:contract, npm run test:unit y npm run build en runner autorizado.
- Probar Groq con clave y fallback sin clave, texto vacío, respuesta malformada, cancelación y encabezados de IP ausentes.
- Revisar contraste, lector de pantalla, movimiento reducido y móvil.
- No desplegar a producción ni declarar U06 aceptado hasta revisar resultados.


## Controles adicionales de la reconstrucción C033
- El endpoint exige una sesión autenticada antes de procesar el cuerpo o llamar a Groq, reduciendo el riesgo de abuso de la clave del proveedor.
- Las instrucciones del modelo y el texto de la crónica se envían como mensajes separados; el texto se trata como dato no confiable.
- La ruta descarta estado `resolved` si no incluye una evidencia literal presente en el texto. Para fecha/hora exige además señales explícitas de fecha y hora. Es una validación conservadora, no un parser exhaustivo de fechas en lenguaje natural.
- La interfaz respeta `prefers-reduced-motion` mediante clases de movimiento reducido; la transición es deliberadamente discreta.
- Tests unitarios actuales verifican la barrera de autenticación; todavía no están ejecutados. Los casos de integración autenticada y respuesta real/mock de Groq siguen pendientes.
