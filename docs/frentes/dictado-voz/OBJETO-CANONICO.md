# Sprint KHORA · Acceso MCP a observabilidad y diagnóstico del dictado

## 1. Control e identidad

- Identidad conservada: `MCP-OBS-DICTADO`; extensión documental de dictado, benchmark, retroalimentación y propuesta de voz/síntomas.
- Versión: **v0.6.35**; sello **MCP-OBS-DICTADO-v0.6.35**.
- Estado: **U06 IMPLEMENTADO Y VERIFICADO EN CÓDIGO; PR EN BORRADOR**.
- Repositorio propietario: `SeryMente/khora`, privado comprobado con herramienta en este ciclo.
- Carpeta contenedora: `docs/frentes/dictado-voz/`; elemento único de estado: `OBJETO-CANONICO.md`.

## 2. Resumen de Instrucciones Verbatim del Operador (U01–U06)

Para la trazabilidad detallada punto por punto entre cada instrucción verbatim del operador, su elemento de interfaz (`data-ui-id`), archivo de código y prueba correspondiente, ver la matriz canónica en [TRAZABILIDAD-U01-U06.md](TRAZABILIDAD-U01-U06.md).

Las instrucciones verbatim originales completas se custodian sin modificaciones en [INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl](originales/INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl).

### Extractos Verbatim de U06 (21-22 Octubre 2026)

1. **U06-01a:** «Graficamente debe de estar bien diseñado. Y robusto. Pero no en exceso»
2. **U06-01b:** «deben de “deshacerse”, o “desmoronarse” … estimulante, que genere la sensacion de completud»
3. **U06-02:** «conforme el contenido se analize en vivo, con groq»
4. **U06-03:** «empiezan de unmodo resuelto, pero si no se pueden vefificar … se vuelven activos»
5. **U06-04:** «siempr ese debe obtener la IPV4, del lugar»
6. **U06-05:** «la huella digital complet ay exhaustiva, a ungrado super ultra obsesivo … por cualquier canal … no solo para cronica»
7. **U06-06:** «deduce un conjunto, rico, por categorias, … desde lo mas general … hasta unso mas cocnretos»
8. **U06-07:** «1. Si no hay un campo adecuado … 2. … es mejor que los campos prediseñados, 3. … pulido mediante un c riterio de noramlizacion … 4. Por excepcion»
9. **U06-08:** «QUe haces, me parece poco adecuado. Seria mejor que pasa. La cronica persoanl , no esta limitada por un hacer. Es libre.»
10. **U06-09:** «Registra esta y otras insturcciones verbatim mias … en el Objeto Canonico»
11. **U06-10:** «Dame un checklist ordenado, limpio, amigable, no una pared de texto»

## 3. Estado de la Huella Exhaustiva e IPv4

Para cualquier tipo de entrada (no solo crónica personal), se capturan metadatos lícitos y no invasivos del navegador, servidor y sesión:
- **Servidor:** IPv4 extraída exclusivamente de cabeceras de proxy confiables (`x-real-ip`, `x-vercel-forwarded-for`), timestamp UTC y encabezados geográficos opcionales (`x-vercel-ip-*`).
- **Cliente:** Zona horaria, desfase, idiomas, plataforma, userAgent, resoluciones, devicePixelRatio, profundidades de color, núcleos de CPU, memoria de dispositivo, soporte táctil, tipo de conexión red y preferencias de accesibilidad/tema.
- **Sesión:** ID de sesión, modo de entrada y timestamp de adquisición.
- **Límites:** Sin GPS ni cookies de terceros. Sin técnicas de fingerprinting encubierto (canvas, WebGL, enumeración de fuentes).

---
*Para consultar la historia completa de ciclos anteriores (C001–C048) o anexos técnicos históricos, refiérase al historial de versiones de este documento.*
