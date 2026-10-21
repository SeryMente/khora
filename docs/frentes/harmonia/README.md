# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP v0.12 conserva estado vivo, requisitos, decisiones, límites y siguiente paso; el historial está en las crónicas por ciclo. No crear una segunda fuente de estado.

- [Asistente · retoma v0.11](prompts/ASISTENTE.md): instrucciones de entrada, gobierno, titularidad confirmada y orden de continuación.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar solo bajo el régimen de roles vigente; no utilizar RDC.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): generación 2, folio activo `SES-20261021-K7M4Q9P2`, alias `chatgpt-harmonia-SES-20261021-K7M4Q9P2`; la transferencia fue verificada por lectura de vuelta.
- [Crónica de transferencia](cronica/HARMONIA-TRANSFER-RESPONSABILIDAD-20261021.md).
- [Crónica E2E 02](cronica/HARMONIA-E2E-02-20261021.md): candidato v0.4.0, huellas, pruebas definidas, resultados aún pendientes y bloqueos.

## Código y revisión

El código canónico de producción sigue en `main` y no se modifica desde este branch. La candidata v0.4.0 se trabaja en `feat/harmonia-e2e-20261021` y PR en borrador [#333](https://github.com/SeryMente/khora/pull/333). No está fusionada ni aceptada E2E. CI: los runs #12 y #14 de `Harmonia validation` aparecen como fallidos. El conector no expone steps/logs ni artefactos (`404 BlobNotFound`); la causa raíz no está verificada. El workflow diagnóstico se actualizó en el commit `4629dcba608a59aebf911fab3a6ac96db70c1ae7`, pero el run siguiente sigue sin resultados recuperables. No declarar PASS ni atribuir una causa sin evidencia.

## Estado de aceptación

El candidato contiene captura automática de estructura y texto visible, política regional, popup esencial y dashboard en tab propio, metadatos build-info y pruebas automatizadas. Esto prueba que los archivos existen en la rama, no que Chrome los haya ejecutado. Captura natural, multi-tab real, mediciones CPU/RAM/latencia y carpeta física única de Escritorio siguen pendientes.

## Seguridad del entorno

No realizar operaciones en equipo remoto hasta reconciliar la discrepancia de IDs RDC: listado vivo `PC10RCIF4EI4` con ID `86580320-19b3-421a-89c7-36dce0123559`; el registro global conserva `79564800-3d53-4195-8122-5b4b061ef862`. No asumir que son alias. No tocar el Escritorio mientras ese bloqueo siga abierto.

La única carpeta acordada para una futura publicación física es `C:\Users\fila4\Desktop\Harmonia`. Preparar staging fuera del Escritorio; luego sincronizar únicamente archivos gestionados y nunca borrar artefactos desconocidos. Nunca usar `C:\Users\MantenimientoRCI\`.

La copia literal de los requisitos que se intentó guardar como artefacto GitHub fue bloqueada por la herramienta. Esta limitación está explícita en el OCP y la crónica; no se afirma que la copia se haya persistido canónicamente.