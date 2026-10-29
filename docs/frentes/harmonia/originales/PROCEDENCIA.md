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
- La salida visible de este ciclo se conserva en `HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029-salida.md`, blob `be72de86d40796314dfb00f41f33ec3dc6d98a4e`, cotejada por lectura de vuelta.
- La crónica correspondiente está en `../cronica/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029.md`, blob `ea524edb9ee8aae03701c6f8b2bc2980821eb213`, cotejada por lectura de vuelta. Conserva el entorno observado, los intentos fallidos, los límites y el siguiente checkpoint.
- La salida y la crónica diferencian hechos observados de código leído, fixtures sintéticas y pruebas no ejecutadas. No contienen secretos, tokens ni razonamiento interno.
