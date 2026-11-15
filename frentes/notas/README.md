# Notas · frente de trabajo de Khora

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva propósito, autoridad, estado vivo, decisiones, pendientes, evidencias y continuidad.

- [Control de responsabilidad](CONTROL-RESPONSABILIDAD.json): asignado, generación 3.
- [Asistente](prompts/ASISTENTE.md): adquisición de gobierno, responsabilidad y continuidad.
- [Constructor](prompts/CONSTRUCTOR.md): régimen de construcción y entrega técnica.
- [Instrucción original](originales/INSTRUCCION-ORIGINAL-20261112.md): propósito verbatim de la apertura histórica.
- [Salida de apertura](originales/SALIDA-MODELO-20261112.md): salida visible de la instancia de apertura.
- [Salida de asunción](originales/SALIDA-MODELO-20261112-ASUNCION.md): salida visible de la asunción anterior.
- [Conversación del 12-11](originales/ChatGPT-NOTAS-20261112-1630.md): registro documental condensado.
- [Exportación completa del 14-11](originales/ChatGPT-NOTAS-20261114-1254.md): conversación recibida desde Downloads mediante RDC.
- [Retoma A/B del 14-11](originales/RETOMA-NOTAS-20261114-AB.md): instrucción actual y última salida final visible del modelo anterior, conservada literalmente.
- [Exportación completa del 15-11](originales/ChatGPT-NOTAS-20261115-1144.md): conversación completa recuperada de Downloads por RDC; SHA-256 cotejado.
- [Retoma A/B del 15-11](originales/RETOMA-NOTAS-20261115-AB.md): instrucción actual y salida final previa, reproducida literalmente.
- [Crónica de retoma del 15-11](cronica/RETOMA-20261115.md): responsabilidad, estado técnico y compuerta de producción.
- [Crónica de apertura](cronica/INICIO-20261112.md): evento y checkpoint original.
- [Crónica de renombrado](cronica/RENOMBRE-20261112.md): cambio de nombre, ruta, URLs y control.
- [Crónica de retoma](cronica/RETOMA-20261114.md): relevo y persistencia del 14 de noviembre.

## Estado vigente

El frente se denomina **Notas** (antes **Notas rápidas**). Su OCP está en **frentes/notas/** dentro del repositorio **SeryMente/khora**. La URL específica del frente es https://github.com/SeryMente/khora/tree/main/frentes/notas.

El registro del 12-11 es condensado. La exportación recibida el 14-11 conserva íntegramente el archivo disponible en Downloads y su procedencia RDC; no se presenta como exportación nativa de ChatGPT. La salida final del ciclo anterior se conserva separadamente en el registro A/B, con su formato Markdown original.

El módulo Notas está implementado en la rama de trabajo `work/notas-quick-capture-20261114` (commit `094ea877`), con validaciones locales registradas. Todavía no está integrado en `main` ni en producción: `034_notes.sql` continúa pendiente de aplicación/verificación en Neon Production. Por la instrucción vigente, no se hará merge ni despliegue antes de superar esa compuerta.