# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md), versión candidata **0.13 / HARMONIA-v0.13** en esta rama. No crear fuentes de estado paralelas.

- [Asistente · reinstanciación](prompts/ASISTENTE.md): estado y próximos pasos, gobierno y compuertas.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): su régimen no habilita RDC.
- [Control de responsabilidad](CONTROL-RESPONSABILIDAD.json): generación 2, folio activo `SES-20261021-K7M4Q9P2`, alias `chatgpt-harmonia-SES-20261021-K7M4Q9P2`; la transferencia está confirmada por lectura de vuelta.
- [Crónica de transferencia](cronica/HARMONIA-TRANSFER-RESPONSABILIDAD-20261021.md).
- [Crónica E2E 02](cronica/HARMONIA-E2E-02-20261021.md): implementaciones candidatas, hashes, fallos CI y límites de evidencia.

## Candidata E2E

- Rama: `feat/harmonia-e2e-20261021`.
- PR [#333](https://github.com/SeryMente/khora/pull/333): abierta como borrador, no fusionada.
- Código candidato v0.4.0: captura automática por tab, texto visible user/assistant con reemplazos/deltas/finalización, estructura/estilos resumidos, consola con redacción heurística, política regional, tab líder tras completitud, popup esencial y dashboard propio.
- La región de conversación solo puede completarse si todas las capacidades del catálogo están observadas, al menos cinco huellas distintas y dos sesiones distintas. Regiones sin catálogo quedan no mapeadas.
- Hay pruebas y workflow definidos. `Último run #3397: failure`; el diagnóstico es insuficiente debido a que el conector no expone steps/logs/artifacts. No declarar PASS ni inventar causa.
- No se fusiona a `main`: el flujo de main puede activar despliegue de Khora y migraciones productivas.

## Bloqueo RDC y entrega física

Discrepancia de ID sin resolver: listado vivo `PC10RCIF4EI4` ID `86580320-19b3-421a-89c7-36dce0123559`; registro global ID `79564800-3d53-4195-8122-5b4b061ef862`. No asumir alias; no conectarse, instalar ni manipular el Escritorio mientras no se reconcilie.

Destino físico acordado: única carpeta `C:\Users\fila4\Desktop\Harmonia`. Cuando se autorice el equipo: preparar staging fuera del Escritorio, validar y sincronizar solo archivos gestionados. No borrar artefactos desconocidos. Nunca usar `C:\Users\MantenimientoRCI\`.

## Privacidad y no-simulación

Se conservan localmente los textos visibles de mensajes porque son parte del objetivo. No se leen borradores del compositor, valores de campos, URLs completas/imágenes ni razonamiento oculto. La redacción de consola es heurística, no anonimización garantizada. Primera prueba real con conversación sin datos sensibles.

La copia literal de los requisitos como archivo GitHub fue bloqueada por la herramienta; no se eludió el control. La instrucción original sigue siendo el mensaje del operador y la laguna se documenta en OCP/crónica.