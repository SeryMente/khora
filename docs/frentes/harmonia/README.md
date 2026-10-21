# Harmonia · carpeta canónica del frente

Fuente única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md), candidato **0.14 / HARMONIA-v0.14** en esta rama. No crear fuentes de estado paralelas.

- [Asistente · reinstanciación](prompts/ASISTENTE.md): estado vigente, gobierno y siguientes pasos.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): el constructor no utiliza RDC.
- [Control de responsabilidad](CONTROL-RESPONSABILIDAD.json): generación 2, folio `SES-20261021-K7M4Q9P2`, alias `chatgpt-harmonia-SES-20261021-K7M4Q9P2`; la transferencia se verificó mediante lectura de vuelta.
- [Crónica de transferencia](cronica/HARMONIA-TRANSFER-RESPONSABILIDAD-20261021.md).
- [Crónica E2E 02](cronica/HARMONIA-E2E-02-20261021.md): módulos, hashes, CI y bloqueos.

## Candidata E2E v0.4.0

Rama `feat/harmonia-e2e-20261021`, PR [#333](https://github.com/SeryMente/khora/pull/333) abierta en borrador, no fusionada. Código candidato: captura automática por tab; mensajes visibles user/assistant con replace/append/complete y chunks; estructura/estilos resumidos; consola con redacción heurística; política regional y líder único al completar el catálogo; popup esencial y dashboard en su propia pestaña; build-info y pruebas automatizadas definidas.

La región de conversación solo se considera completa con todas las capacidades del catálogo, cinco huellas estructurales distintas y dos sesiones diferentes. Las demás regiones quedan no mapeadas hasta que tengan catálogo.

## CI y estado real

El último run consultado para HEAD `f37d636caa1be9006a522d1d3d4fa56852a958c7` es #3402 (ID `39695776229`), `CI`, estado `completed`, conclusión `failure`. Los runs #12/#14/#23 inspeccionados fallaron. Steps/logs/artifacts no son accesibles en el conector (`steps=null`, `logs_url=null`, `404 BlobNotFound`); causa raíz NO VERIFICADA. No declarar PASS.

## Bloqueo RDC

El dispositivo live `PC10RCIF4EI4` tiene ID `86580320-19b3-421a-89c7-36dce0123559`; el registro global contiene `79564800-3d53-4195-8122-5b4b061ef862`. No son alias probados. No conectar, instalar, abrir Chrome ni manipular Desktop mientras siga la discrepancia.

Carpeta física objetivo: una sola `C:\Users\fila4\Desktop\Harmonia`. Staging fuera del Escritorio, validar antes y sincronizar solo archivos gestionados. No borrar artefactos desconocidos. Nunca usar `C:\Users\MantenimientoRCI\`.

## Privacidad/no simulación

Los textos visibles se guardan localmente porque son el objetivo del producto. No se leen borradores, valores de campos, URLs completas/URLs de imágenes ni razonamiento oculto. La redacción de consola es heurística, no anonimización garantizada. Primera prueba real con conversación sin datos sensibles.

La herramienta bloqueó la escritura de una copia verbatim como archivo GitHub. No se intentó eludirlo; el mensaje original del operador sigue siendo la fuente y el límite permanece documentado.