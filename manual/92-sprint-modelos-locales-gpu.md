# 92 — Sprint: Modelos Locales en GPU Propia (Khora)

> Documento canónico y dinámico, hermano de `91-sprint-acceso-modelos-ia.md`.
> **Nota de renumeración (2026-09-18)**: este documento nació como "91"
> y su hermano como "90". `manual/90-resolucion.md` ya existe en el
> repo (hilo IAR/grafo, sin relación) — colisión real. Se renumera esta
> pareja a `91` (hermano) y `92` (este documento). Si se commitea a
> `manual/`, usa estos números.
> **Nota de procedencia (heredada, sigue vigente)**: la versión original
> de este documento se perdió en un corte de sesión paralela (Claude vía
> conexión a Notion) y se reconstruyó a partir de un resumen —no es una
> recuperación byte-exacta de las 450 líneas/10 secciones originales.

## 0. Retomar rápido — inicio

- **Dominio de producción, confirmado por el Intérprete 2026-09-18**:
  `https://khora-web.vercel.app`. Ya no es una pregunta abierta — es el
  valor literal a inyectar en `OLLAMA_ORIGINS`. Ver §6 con el comando
  actualizado y §10 con el texto exacto que se le entregó a Jules.
- **Ronda 2 de preguntas de Jules, resuelta**: antes de fijar el plan
  formal, Jules pidió (a) el contenido de §4/§6 porque no encontró un
  archivo físico `91`/`92` en el repo y (b) el origen exacto de
  producción. Ambas resueltas.
- **Ampliación de diseño e implementación de Hallazgos 1-4**: el
  Intérprete pidió explícitamente que esta implementación sea "muy
  robusta y didáctica", con resolución dinámica de modelo y ventana
  de contexto binaria real, diagnóstico proactivo en 4 estados en
  `KpiPanelView`, panel explicativo didáctico, instrucción de secuencia
  en PowerShell y advertencia MXFP4.
- Estado: **Fase A y Hallazgos 1-4 completados y verificados con pruebas unitarias.**

## 1. Objetivo

Añadir un cuarto perfil a Khora — `local` — que permita al Intérprete
descargar y correr modelos de código abierto en su propio hardware con
GPU, con instalación asistida vía un comando de PowerShell generado por
la interfaz (agresivamente concatenado, agnóstico al estado previo del
entorno: detecta qué falta e instala solo eso), sin depender de ningún
proveedor de pago ni de límites de cuota de terceros. La implementación
es robusta ante los estados reales que un usuario no especializado
en ML ops va a encontrar, y didáctica en el punto donde ese usuario
necesita entender qué está pasando — no solo funcionalmente correcta.

## 2. Restricciones arquitectónicas no negociables

Dos hechos de la plataforma fijan todo el diseño; no son preferencias,
son límites físicos:

1. **`khora-web` corre en Vercel — serverless, sin GPU, sin red local.**
   Ningún endpoint del servidor puede ejecutar inferencia local ni
   alcanzar la máquina del Intérprete.
2. **Ninguna página web, por más que sea de Khora, puede ejecutar
   PowerShell en la máquina del usuario.** Es una barrera del navegador,
   no una limitación de diseño evitable. Lo máximo posible: la interfaz
   *genera* el comando exacto con un botón "copiar", el usuario lo pega
   una vez en su propia terminal.
3. **Consecuencia directa de 1+2**: la inferencia contra el modelo local
   tiene que salir **directo del navegador del usuario hacia su propia
   máquina** (`http://localhost:11434`), sin pasar por el proxy
   `/api/chat` que usan los otros tres perfiles (`open_source`,
   `gemini`, `groq`). El perfil `local` rompe el patrón "todo pasa por
   el servidor" a propósito — es la única excepción arquitectónica, y
   está documentada en ADR-016.

## 3. Decisiones de diseño

- **Motor por defecto: Ollama.** Instalador turnkey en Windows/macOS/
  Linux, corre en segundo plano tras instalar, tiene API nativa y capa
  de compatibilidad OpenAI.
- **API nativa (`/api/chat`), no la capa OpenAI-compatible
  (`/v1/chat/completions`), para telemetría.** TPS = `eval_count / (eval_duration_ns / 1e9)`.
- **CORS**: `OLLAMA_ORIGINS` configurado explícitamente a `https://khora-web.vercel.app`.
- **Selección de modelo por VRAM y resolución dinámica**: función `resolverModeloYVentanaLocal`
  evalúa de forma estricta: `modeloOverride` -> cruce de `modelosInstalados` con la tabla `modelosLocales` en orden de catálogo -> fallback explícito a `"qwen3.8:27b"` (`recomendado_no_instalado`).
- **Detección de estado real en 4 niveles**: `GET http://localhost:11434/api/tags` permite clasificar los 4 estados: `listo`, `sin_modelo`, `no_instalado`, `error`.

## 4. Catálogo de modelos por VRAM (verificado, agosto–septiembre 2026)

| Modelo (tag Ollama) | VRAM aprox. | Contexto | Benchmark verificado | Uso recomendado |
|---|---|---|---|---|
| `gpt-oss:20b` | ~14–16 GB | 128K | Nivel o3-mini (razonamiento ajustable) | Equipo con 16GB, generalista |
| `devstral:24b` | 14 GB | — | SWE-bench Verified 46.8% | Mejor agente de código "benchmarkeado" en ese tamaño |
| `qwen3-coder:30b` | 19 GB | 256K | Mejor calidad/GB en GPU de 24–32GB | Codificación, mejor pick de consumo |
| `qwen3.8:27b` | 18 GB (o 24GB a Q4) | 256K | SWE-bench 61.7% | Mejor pick general en hardware de consumidor (publicado agosto 2026) |
| `gpt-oss:120b` | ~80 GB | 128K | — | Solo GPU de clase workstation/servidor |

**Advertencia real, no hipotética**: `gpt-oss` en cuantización MXFP4 a
veces cae a ejecución por CPU si el driver/GPU no tiene aceleración
MXFP4 completa — advertencia visible en `ConsultaView` y `KpiPanelView`.

## 5. Prompt de Fase A y Hallazgos (ejecutados)

FASE 1: Resolución dinámica vía `resolverModeloYVentanaLocal`, parseo binario de contexto real ("128K" -> 131072, "256K" -> 262144, "—" -> null), opcionalidad explícita en `CatalogModelEntry`.
FASE 2: Banner proactivo de 4 estados en `KpiPanelView`.
FASE 3: Panel didáctico explicativo de las 3 particularidades del perfil local e instrucción de secuencia PowerShell.
FASE 4: Advertencia hardware MXFP4 en ambas vistas para modelos `gpt-oss`.
PRUEBAS: Cobertura unitaria en `ollama_local.test.ts` y `kpis.test.ts`.

## 6. Comando de instalación — referencia PowerShell

```powershell
$ErrorActionPreference = "Stop"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id Ollama.Ollama -e --silent `
      --accept-package-agreements --accept-source-agreements
  } else {
    $inst = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $inst
    Start-Process -FilePath $inst `
      -ArgumentList "/SP- /VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait
  }
}
$deadline = (Get-Date).AddSeconds(30)
while (-not (Test-NetConnection 127.0.0.1 -Port 11434 -InformationLevel Quiet `
    -WarningAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 1
}
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "https://khora-web.vercel.app", "User")
$env:OLLAMA_ORIGINS = "https://khora-web.vercel.app"
ollama pull <MODELO_SEGUN_VRAM>
```

> **Secuencia de usuario**: "Pega este comando en PowerShell, espera a que termine, y vuelve aquí para recargar el estado."

## 7. Reglas no negociables (heredadas de `91` §6)

- Una sola tarea de Jules a la vez.
- Un solo commit de cierre, diagnóstico → contrato → pruebas → documentación, nomenclatura en español, cero fallback silencioso.
- La excepción arquitectónica del perfil `local` está documentada en ADR-016.

## 8. Lo que la reconstrucción original NO pudo recuperar

(Conservado por historial de procedencia).

## 9. Estado

| Ítem | Estado |
|---|---|
| Restricciones arquitectónicas (§2) | ✅ Confirmadas, no negociables |
| Motor y decisión API nativa vs. OpenAI-compat (§3) | ✅ Verificado con fuente |
| Catálogo de VRAM (§4) | ✅ Verificado, resolución dinámica activa |
| Comando de instalación (§6) | ✅ Origen de producción `https://khora-web.vercel.app` resuelto |
| Prompt de Fase A y Hallazgos 1-4 | ✅ Ejecutados y verificados en verde |
| ADR de la excepción arquitectónica | ✅ ADR-016 creado y referenciado |
| Forma de tipo de `model_catalog.ts` para "local" | ✅ `modeloDefecto` y `ventanaContextoTokens` opcionales en `CatalogModelEntry` |

## 10. Ronda 2 de preguntas de Jules — resuelta

(Incorporadas las respuestas y la ampliación a la implementación).

## 11. Ronda 1 de preguntas de Jules — resuelta

(Incorporados todos los ajustes a la implementación).

## 12. Reflexión de rumbo

Cuatro perfiles listos en el repositorio. La prueba en vivo con credenciales reales por parte del Intérprete es el paso siguiente en producción.

## 13. Próximas acciones

- **Intérprete**: Probar `/sistema/consulta` y `/sistema/kpis` con la infraestructura local en marcha.
- **Intérprete**: Confirmar alcance del Radar + Benchmarking Didáctico (doc 91 §13).
