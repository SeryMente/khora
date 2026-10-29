# Harmonia · entrega de carpeta en Escritorio y CI local

- Folio: `SES-20261022-H6Q2V9C4`
- Objeto canónico final de este ciclo: `docs/frentes/harmonia/OBJETO-CANONICO.md`, v0.22, §29.
- Instrucciones verbatim: `docs/frentes/harmonia/originales/HARMONIA-ENTREGA-ESCRITORIO-01.jsonl`, blob `313bf444fc35df49696dfe72e6ed19c9328e3172`.
- Control: `CONTROL-RESPONSABILIDAD.json`, generación 4, folio activo verificado.

## Objetivo y decisión

El operador fijó un plazo máximo de 20 minutos para entregar una sola carpeta genérica en el Escritorio del dispositivo actual, y reiteró que el progreso se debe documentar en cada paso, conservar instrucciones literales, evitar ciclos de pseudo-mejora y preferir pruebas locales si son más rápidas que GitHub Actions. Se eligió preparar la candidata, ejecutar CI local con Node portable, corregir solo el defecto funcional reproducible y publicar la carpeta en el Escritorio. No se modificó `main` con cambios de runtime ni se fusionó el PR.

## Destino e identidad

- RDC: `PC-14`, UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb`, Desktop Commander 0.3.1.
- Identidad Windows verificada por `WindowsIdentity`: `PC-14\PC 13`.
- Perfil `Win32_UserProfile.LocalPath`: `C:\Users\PC 13`.
- Escritorio: `C:\Users\PC 13\Desktop`.
- Destino final: `C:\Users\PC 13\Desktop\Harmonia`.
- Ruta de Chrome → Cargar descomprimida: `C:\Users\PC 13\Desktop\Harmonia\extension`.
- La comprobación antes del movimiento no encontró otra carpeta Harmonia/Observabilidad del proyecto; la comprobación final confirmó exactamente un directorio de ese proyecto, `Harmonia`. No se eliminaron archivos personales ni se operó en el dispositivo histórico discrepante.

## Construcción y corrección encontrada con CI local

La fuente copiada fue `apps/harmonia-observability/` de `feat/harmonia-e2e-20261021`. La candidata es Manifest V3, versión 0.4.0.

1. Se descargó Node.js portable v22.23.4 para Windows x64.
   - SHA-256 del ZIP: `cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20`.
   - SHA-256 de `node.exe`: `dccc52de28d8df2ee22d2062424f8c563070d95d8ad70c54c4bf01d590dec14f`.
2. El parseo JavaScript inicial pasó 9/9; el validador emitió `HARMONIA_SOURCE_CONTRACT_OK`.
3. La primera suite de integración local falló: `POST /events` devolvía HTTP 400 por `ENOENT` al intentar anexar eventos si faltaba `originals\YYYY-MM-DD`. Causa reproducida en `collector/server.js`.
4. Se corrigió creando el directorio padre antes de ambos anexados del colector: `fs.mkdirSync(path.dirname(file),{recursive:true})`.
5. La suite local volvió a ejecutarse y aprobó 5/5 pruebas; 0 fallos. El fix se comprometió a la rama candidata: `7e405a7be004c7df80886a7a38387e539465d426`, blob de `collector/server.js` `b513213543f21ff8f726f49ce93a046c843d4918`.
6. `extension/build-info.json` fija `sourceRevision=7e405a7be004c7df80886a7a38387e539465d426`; commit `d0bc715c7350847e03e53d09274804c4b8ffcce1`, blob `8d1971fd22da3a0a2e3d120a33528caf484af4f7`. La PR #333 sigue draft, abierta y sin fusionar.

## Entrega y verificación

- Se movió staging a `C:\Users\PC 13\Desktop\Harmonia`.
- El colector arrancó en el destino: PID observado `16396`, raíz de datos `C:\Users\PC 13\AppData\Local\Harmonia\surface-index-v0.3.0\data`.
- Salud autenticada OK. Petición sin token rechazada HTTP 401. CORS de origen de extensión aceptado y origen web externo rechazado HTTP 403.
- Catálogo espejo coincide: 44 funciones y 16 fuentes.
- `FINALIZAR-PAQUETE.ps1` pasó seis verificaciones de sintaxis de los scripts relevantes, manifestó `HASH_MANIFEST=VALID` y 22 archivos hash.
- Comprobación posterior independiente de los archivos del manifiesto: 22/22 hash coincidentes.
- SHA-256 de `MANIFEST-HUELLAS.json` final: `17b2d5bb1aefc12587378b4999f1dab06c2d30f1ead0f03f044df9a17b18578c`.
- El campo source del manifiesto dice `SeryMente/khora branch feat/harmonia-e2e-20261021`, revisión `7e405a7be004c7df80886a7a38387e539465d426`; no falsamente `main`.
- Durante el ajuste del script finalizador se introdujo temporalmente un error de sintaxis en la línea de procedencia. Se detectó de inmediato, se corrigió con parser PowerShell, se regeneró el manifiesto y la verificación final independiente pasó.
- La credencial `extension/local-auth.js` permanece local y no se persiste en Git ni en esta crónica.

## Estado final y límites

**PAQUETE ENTREGADO Y VALIDADO LOCALMENTE.** Versión 0.4.0, extensión en `Desktop\Harmonia\extension`.

No declarar E2E aceptado: la extensión no se cargó ni recargó en Chrome y la base comienza con `DATA_BYTES=0`. Siguen pendientes la prueba natural del texto visible parcial/final, el ensayo real en varias pestañas, recuperación tras reinicio y consulta desde el segundo hilo por RDC. El capturador no accede a razonamiento interno oculto; si la interfaz no expone un transitorio dentro de los nodos observados, no puede afirmarse que se registró. La entrega local no demuestra atención autónoma permanente entre conversaciones.

## Instrucciones conservadas

Los mensajes directos U06–U17 quedan preservados sin normalización en el JSONL original y reproducidos en el OCP §29. Se conservan errores tipográficos, espacios, puntuación y la repetición de los límites de 20 minutos. Las instrucciones iniciales U01–U05 permanecen en sus JSONL originales previos. No se presume que el resumen de un asistente sustituya la fuente verbatim.

## Seguimiento siguiente

1. El operador carga `C:\Users\PC 13\Desktop\Harmonia\extension` mediante `chrome://extensions` → Cargar descomprimida.
2. Ejecutar una conversación de prueba sin datos sensibles.
3. Verificar que mensajes y cambios incrementales se almacenen y sobrevivan reinicio.
4. Validar varias pestañas y la consulta desde el hilo consumidor mediante RDC.
5. Cerrar E2E solo con evidencia natural. Optimización sigue diferida y no se reabre por razones estéticas.
