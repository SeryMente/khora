# Procedencia de los originales

Tres mensajes directos del operador presentes en el contexto activo de la sesión3ffa4187-8241-80de-84a6-00a98cbd8894 de Notion. Secuencia relativa U01→U02→U03 comprobada; no se inventan IDs de evento ni horas de envío. Corte documental: 2026-10-21T01:19:07.393776+00:00.

U01 especifica la semilla y su uso; U02 exige legibilidad; U03 amplía captura y ordena instanciar este frente por separado. Son segmentos pertinentes, no la conversación completa. UTF-8, JSONL con LF por registro; json.loads recupera el contenido literal de los mensajes. En U03 se conservan las etiquetas br y la grafía; no se corrige «cinco múltiples». No se copian razonamientos internos ni secretos. Normalización/criterios en OBJETO-CANONICO.md, no en originales.

SHA-256 del archivo JSONL: 8a5f2ea2ed6c2ddf76d5d4bbe3758dd6dde638df68fef026df346aa46ce92612. No captura mensajes futuros ni acredita el registro de conversaciones ChatGPT todavía inexistente.

## Transferencia de responsabilidad · U19 · SES-20261022-6E3A91F7

- El mensaje del operador se preserva literalmente en `HARMONIA-TRANSFER-SES-20261022-6E3A91F7.jsonl`, registro U19: `Si`.
- Blob del original leído de vuelta: `2f8e8b4c1aca2e80df01fcb8513d27f2f0f2936c`; el contenido se cotejó exactamente, incluido el caso de la grafía y el salto final de línea del JSONL.
- La respuesta autorizó la transferencia concreta de Harmonia desde generación 6 / `SES-20261022-Q7M4K9V2` a generación 7 / `SES-20261022-6E3A91F7`. La pregunta, alcance, CAS, hash pre/post y comprobación se documentan en `../cronica/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.md`.
- La herramienta no expuso ID nativo de conversación; no se añade uno inferido. Se conserva únicamente el alias operativo claramente tipado en el control.

## Transferencia de responsabilidad · U20 · SES-20261028-P9K4R7M2

- El mensaje del operador se preserva literalmente en `HARMONIA-TRANSFER-SES-20261028-P9K4R7M2.jsonl`, registro U20: `Si`.
- Blob del original leído de vuelta: `bfe29b24091e039f901592b66887336a9b8b0235`; el JSONL completo se cotejó con el contenido esperado, incluido el salto final de línea.
- La respuesta autoriza la transferencia concreta de Harmonia desde generación 7 / `SES-20261022-6E3A91F7` a generación 8 / `SES-20261028-P9K4R7M2`. Alcance, CAS, huellas y lectura de vuelta: `../cronica/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2.md`.
- La plataforma no expuso ID nativo de conversación; se conserva únicamente el alias operativo tipado en el control.

## Revisión técnica y E2E · U21 · HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029

- Mensaje original del operador conservado literalmente en `HARMONIA-REVISION-E2E-SES-20261028-P9K4R7M2-20261029.jsonl`, registro U21: `Revisa nueva sesion de trabajo, y resuelve de extremo a extremo lo faltante.`
- Blob leído de vuelta: `fa55c374b504b29c2565b310b343cf081c4e7c71`; el contenido UTF-8 del JSONL coincide exactamente con el esperado, incluida la terminación LF.
- La salida visible de este ciclo se conserva en `HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029-salida.md`, blob `57ee1413b1c916b260daeb8e6c6c88bf16ceb581`, cotejada por lectura de vuelta.
- La crónica correspondiente está en `../cronica/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029.md`, blob `c130054921f6892250cb6713d2a373bfbc8532ba`, cotejada por lectura de vuelta. Conserva el entorno observado, los intentos fallidos, los límites y el siguiente checkpoint.
- La salida y la crónica diferencian hechos observados de código leído, fixtures sintéticas y pruebas no ejecutadas. No contienen secretos, tokens ni razonamiento interno.


## Exportación de conversación · ChatGPT-HARMONIA-20261030-1915.txt

- Original recuperado por RDC del dispositivo PC-14, UUID `f28d6a64-9e51-4ef2-8071-9145a43f7680`, ruta local `C:\\Users\\PC 13\\Downloads\\ChatGPT-HARMONIA-20261030-1915.txt`. El inventario RDC identificó esta instancia por UUID; el archivo informó perfil de proceso `C:\\Users\\PC 13` y usuario Windows `PC 13`. No se infirió SID ni se modificó el perfil.
- Metadatos del encabezado del exportador: conversación HARMONIA; creada `2026-10-30 11:31:55`, actualizada `2026-10-30 19:14:28`, exportada `2026-10-30 19:15:45`; enlace de origen `https://chatgpt.com/c/6ae4d48b-5a6c-83e8-8dc6-bfd364a71a5f`. Estos son metadatos declarados por el archivo exportado, no una verificación independiente de acceso al hilo.
- Archivo local observado: 196,509 bytes; 3,928 líneas; SHA-256 `076D8B11BBCA127D537FD4B79011878D9BBECBE58DEC835AA211CCBEC558F27B`.
- Se incorporó sin editar el contenido textual leído por RDC. GitHub creó el archivo en `docs/frentes/harmonia/originales/ChatGPT-HARMONIA-20261030-1915.txt` en la rama `feat/harmonia-cora-provisional-persistence-20261030`; commit `1f2309ad1bb248f72b46e2f8359591fd1ac5c2aa`; blob Git SHA-1 `70663c69e8431e95b3550573f2cf7f968c673d98`. Lectura de vuelta: 3,928 líneas, 188,883 caracteres y coincidencia exacta (`content === content`) con el texto recibido por RDC.
- El SHA-256 local corresponde a los bytes del archivo en Windows; el blob Git corresponde al texto UTF-8 recibido y releído. No se declara igualdad byte a byte entre ambos formatos de almacenamiento porque el transporte de lectura del RDC expone texto decodificado, no un flujo binario.
- Naturaleza: original documental de conversación para continuidad del frente; no es telemetría de Harmonia, no es fuente normativa y no sustituye el OCP. El contenido se conserva como evidencia histórica, incluidas las peticiones y salidas visibles que forman parte del export. Las afirmaciones históricas del modelo siguen requiriendo su propia evidencia canónica antes de tratarse como estado actual.
