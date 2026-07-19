# ADR / Manual: Drivers (Puerto 40)

Este documento describe la arquitectura e integración de los drivers en Khora, siguiendo el estándar de arquitectura hexagonal.

## Transcripción (Adapter: Groq / Whisper)

### Propósito
El driver de transcripción provee el primer adaptador real para la v1.0. Toma audio crudo, lo envía a un proveedor (Groq utilizando Whisper) y devuelve un `ResultadoTranscripcion` fuertemente tipado (texto, timestamps, idioma detectado).

### Fronteras (G-4)
- **Aislamiento**: El cliente del vendor y todas sus dependencias (ej. `groq`) viven exclusivamente dentro del directorio `drivers/transcripcion/`.
- **Efectos nulos**: El cliente se inicializa en el constructor (`__init__`) y no en la importación del módulo, lo cual garantiza que no haya side-effects al arrancar el kernel.
- **Tipado Fuerte**: Las fallas de la API de Groq o de red se capturan y se lanzan como subclases de `TranscripcionError`. Ninguna excepción del vendor cruza el puerto.
- **Default Privado**: Todas las ingestas producidas por dictado a través del pipeline completo tendrán visibilidad `DEFAULT PRIVADO` por defecto para proteger el contenido sensible.

### Ubicación
- `drivers/transcripcion/` (estructura modular celular, `__init__` público, `_internals` privado, y co-localización de tests).

### Uso
El operador puede probar el dictado mediante el harness:
`python drivers/transcripcion/harness_dictado.py <ruta_al_audio.mp3>`
