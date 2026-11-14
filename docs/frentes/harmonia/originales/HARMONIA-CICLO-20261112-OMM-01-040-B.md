# Harmonia · Ciclo OMM-01-040 · Salida visible B

**Primera persistencia de B:** 2026-11-12T22:59:46.4153024Z  
**Conversación local UUIDv7:** `01a1d0fd-681e-7243-a8ed-ca8e3dff2e71`  
**Ciclo local UUIDv7:** `01a1d1f1-febb-7736-88da-74e3537d2657`  
**Referencias:** UUIDv7 locales; no son IDs nativos ni folios globales. FOL1 permanece PREPARADO / NO ACTIVO.  
**A:** `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D038.md` · SHA-256 `466570A53061B8D01A2D9E29A5F100916B0879C5668F20005E54F3131149D7CA` · 173 bytes · lectura de vuelta exacta.

## 1. Resultado principal

Se creó y persistió `docs/frentes/harmonia/ESPECIFICACION-GENERAL.md`, versión 1.0.0, como documento único de definición técnica integral de Harmonia. El documento contiene propósito, autoridad, alcance y exclusiones, arquitectura, componentes, modelo de conversaciones/ciclos/A/B, contratos de eventos, privacidad, seguridad, gobierno de métricas, pruebas, niveles de aceptación, dependencias, bloqueos y protocolo obligatorio de mantenimiento por ciclo.

El OCP continúa siendo la única fuente de estado vivo, decisiones y backlog del frente. La especificación es la fuente técnica integral y no crea un segundo OCP ni una cola paralela. Cada ciclo sustantivo debe revisar el DUG/GOW vigente, cotejar la implementación real, incorporar los deltas en el mismo ciclo o dejar registro explícito de «revisada / sin delta», conservar historial y realizar SHA/read-back. La falta de actualización o lectura de vuelta impide declarar completo el cierre documental.

## 2. Backlog normalizado

El OCP local quedó actualizado a **v0.80 / HARMONIA-v0.80**. El backlog activo queda definido por exactamente cuatro ejes:

| Eje activo | Responsabilidad |
|---|---|
| OMM-01-035 | Instrucciones verbatim, procedencia y trazabilidad entre dictado, decisión, tarea, resultado y evidencia. |
| OMM-01-036 | Inventario de conversaciones y disponibilidad: fuentes, fechas tipadas, rutas, hashes, cobertura, lagunas y segmentación demostrable. |
| OMM-01-037 | Identidad y correlación local de conversación, ciclos y A/B; asociación a OCP, frente y repositorio; sin folios globales antes de activar FOL1. |
| OMM-01-038 | Especificación general integral, contrato transversal de metadatos, privacidad, observabilidad, arquitectura, pruebas, estado, aceptación y continuidad. |

Se preservaron los IDs **OMM-01-000 a OMM-01-034 y OMM-01-039** como descomposición técnica, historial y evidencia subordinada a esos ejes; no se borraron ni renumeraron. Los tres elementos FUTURO continúan diferidos dentro del eje 038. Se agregó **OMM-01-040** como tarea subordinada a OMM-01-038: mantener la especificación general en cada ciclo sustantivo.

El OCP mantiene las instrucciones D-035, D-036 y D-037 y ahora incorpora D-038 con su literal y referencia a original. El README de la carpeta del frente incorpora el snapshot local vigente y enlaza la especificación, manteniendo el snapshot del 8 de noviembre como historial.

## 3. Gobierno adquirido y compatibilidad

Para este ciclo se adquirió desde `SeryMente/metodologia/main` el DUG **Samantha v393 / NX-393m**, commit `b62d99bb49c35e6cfe280ebeace5ce5dbde9a675`, blob SHA-1 `844fc507a2a9a0bfc8f4e68884cca9f6d2912c96`, GOW 2.21. El metadato documental declara Metacanon 1.31 y el objeto JSON embebido declara 1.30; la discrepancia se conserva abierta, sin decidirla por inferencia.

**Bloqueo normativo identificado:** Metacanon §52 desactiva las mediciones de duración de ciclo, latencia, procesamiento, tiempo activo, esperas y comparativas temporales. El código y pruebas históricas de Harmonia conservan T1/T2 y `duration_ms`, incluso una prueba sintética histórica de 600 ms. Esa salida solo prueba el comportamiento de una fixture; no autoriza ni valida la métrica. El cómputo temporal queda **NO CONFORME / BLOQUEADO**. No se modificó el DUG ni se eliminó código de medición: una enmienda normativa requiere su propio procedimiento y retirar esa funcionalidad es una decisión de diseño que no debe inferirse.

## 4. Estado de implementación

La especificación describe el estado verificable heredado de la candidata MV3 **0.4.9**, build `LOCAL-OMM-01-039-SPA-NAVIGATION-CONTINUITY`, catálogo 0.1.3 y colector 0.4.8.1. La continuidad SPA está implementada localmente mediante puente History genérico y observadores anclados al documento estable. En el corte previo de OMM-01-039 constan 7 archivos de pruebas JS/MJS, 38/38 PASS, `node --check` para los scripts principales, JSON válido, análisis PowerShell 5.1 y hashes/tamaños de 29 archivos de paquete y 8 artefactos de prueba cotejados.

Esas pruebas son evidencia de ingeniería heredada, no aceptación natural. No se realizó en este ciclo una nueva prueba de integración headless ni una sesión natural del navegador. La candidata 0.4.9 no se recargó ni se declara activa en Chrome principal; Chrome principal no fue abierto, enfocado, navegado, inspeccionado ni modificado mediante RDC. La aceptación SPA natural, T1/T2 natural y **BMO-01 permanecen NO ALCANZADOS**. No se afirma CI PASS; GitHub Actions no fue ejecutado.

## 5. Integridad, publicación y límites

- OCP actual: v0.80; SHA-256 `5972A03A5CDD0E365BC876504F51E060017DA43902E679F2FB0057D923018403`, 240,916 bytes; lectura de vuelta verificada.
- OCP previo v0.79 preservado en `archive/OBJETO-CANONICO-v0.79-pre-spec-maintenance-20261112.md`, SHA-256 `26774C8CFFA9A38A019DC07F5D298B2EED7BCF23D906FC22C18ADEC8FD32D198`, 233,168 bytes; cotejo exacto con el OCP de origen.
- Especificación general: v1.0.0; SHA-256 `3C0BE96A010231F5084D1C2A6051C552289174CA9357964D25613D45DFC44D0F`, 24,391 bytes; revisión final «revisada / sin delta técnico» y lectura de vuelta.
- Original A D-038: SHA-256 arriba indicado, contenido exacto; no se corrigieron las grafías.
- Rama: `work/harmonia-front-workspace-20261110`; HEAD base `9fd5c18205e39b6db12c9152b07d8f880f6b256d`. Sin commit ni modificación de `main`.
- No se hizo commit, push, PR, merge, despliegue, carga de extensión, modificación del navegador principal ni transferencia de titularidad.
- FOL1 permanece PREPARADO / PENDIENTE DE ACTIVACIÓN. No se emitieron folios globales CV/CY/A/B.
- MCP normativo permanece DESACTIVADO; el repositorio Metodología no fue modificado.

## 6. Cierre del ciclo

**Completado en este ciclo:** creación, revisión final sin delta técnico y lectura de vuelta de la especificación general v1.0.0; integración de D-038 en originales y OCP; backlog normalizado en cuatro ejes con descomposición trazable; OMM-01-040; README actualizado; índice JSON actualizado con el tercer ciclo local y sus partes A/B; PROCEDENCIA append-only con hashes, bytes y verificaciones finales.

**No completado y no declarable como terminado:** aceptación natural del producto, BMO-01, conflicto de métricas temporales y retroinventario/segmentación histórica completa. Son compuertas externas o trabajos todavía no demostrados, no se ocultan bajo un cierre documental.

---
**Estado de esta salida B:** PERSISTIDA Y VERIFICADA; contenido releído de vuelta y SHA-256 cotejado. La huella final se registra en PROCEDENCIA.md y en el índice de continuidad. No constituye folio global ni publicación.
