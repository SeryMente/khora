# Khora Live Caption Bridge

Bridge local para **Khora**, inspirado en la arquitectura de Signal Interpreter pero mantenido íntegramente dentro de este repositorio.

## Función

Lee Chrome Live Caption mediante Windows UI Automation:

`Chrome_WidgetWin_1 → CaptionBubbleLabel → AXVirtualView → Name`

No captura audio y no usa Whisper ni Groq. Su responsabilidad es entregar señal textual reconciliada.

## Transporte

- WebSocket: `ws://127.0.0.1:8788/`
- Health: `http://127.0.0.1:8788/health`
- Protocolo: `khora-live-caption.v1`

## Reconciliación

- sondeo por defecto cada 150 ms;
- ventana de estabilidad de 750 ms;
- eliminación del prefijo ya comprometido;
- solapamiento de hasta 10 palabras;
- `caption.segment` como salida estable;
- `caption.delta` y `caption.revision` para diagnóstico.

## Ejecución

Desde la raíz del repositorio:

`powershell -ExecutionPolicy Bypass -File .\tools\live-caption-bridge\run.ps1`

Requiere .NET 8 SDK en Windows.

## Audio

La captura del audio de la pestaña **no ocurre en este proceso**. Khora la realiza desde su extensión Harmonia mediante `chrome.tabCapture`, manteniendo el audio audible para el usuario y enviando los fragmentos a `/sistema/ingreso`.

