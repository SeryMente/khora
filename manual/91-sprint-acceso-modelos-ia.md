# 91 — Sprint: Acceso a Modelos de IA de Calidad en Khora

> Documento canónico y dinámico. Se actualiza en cada ciclo con Jules.
> Colócalo en `manual/` del repo como `91-sprint-acceso-modelos-ia.md`.
> Documento hermano: `92-sprint-modelos-locales-gpu.md` (iniciativa de
> modelos locales en GPU propia — ver §1 y §8).
>
> **Nota de renumeración (2026-09-18):** este documento nació como "90"
> y su hermano como "91". Jules confirmó que `manual/90-resolucion.md`
> **ya existe** en el repo (borrador de Resolución de Entidades del
> hilo IAR/grafo) — colisión real, no hipotética. Se renumera esta
> pareja a **91** (este documento) y **92** (modelos locales), los
> primeros dos números libres después de `90`. Si en algún momento se
> commitea a `manual/`, hazlo con estos números, no con los viejos.

## 0. Retomar — inicio rápido

Reconciliado 2026-09-18, ronda de confirmación con Jules sobre la
Fase A de modelos locales y refinamiento de resolución dinámica/diagnóstico en 4 estados.

- **Dominio de producción, confirmado por el Intérprete, ya no es
  ambigüedad**: `https://khora-web.vercel.app`. Ese es el que se
  entrega a Jules para `OLLAMA_ORIGINS` en el documento 92.
- **Hallazgo catalogado, fuera de alcance, no bloqueante**: el repo
  tiene otros dos dominios `.vercel.app` en distintos archivos —
  `khora-ten.vercel.app` (tres workflows de smoke-test:
  `post-deploy-smoke.yml`, `README-smoke.md`, `board-orchestrator.yml`)
  y `khora-preview.vercel.app` (un fixture de test, ese sí
  inofensivo). El Intérprete decidió explícitamente no priorizar esto
  ahora — queda anotado para un ciclo futuro de limpieza de
  infraestructura/CI, nadie lo toca hasta entonces.
- **Sprint 90/91 original (backend LLM, chat, KPIs) sigue igual que la
  última reconciliación**: Niveles 1–4 cerrados y verificados
  directamente contra el repo. Ver §3 y §5.
- **Nuevo, en diseño, todavía NO enviado a Jules**: el Intérprete pidió
  dos capacidades nuevas — un "motor de radar" para mantenerse
  informado de modelos gratuitos nuevos, y que el panel de KPIs deje
  de ser solo comparación puntual y enseñe diferencias entre modelos
  con el uso real acumulado. Propuesta completa en §13.
- **Fase A del documento 92 (perfil local) con resolución dinámica de catálogo y diagnóstico proactivo**:
  Implementada resolución dinámica de modelos locales (`resolverModeloYVentanaLocal`), banner proactivo de 4 estados en `KpiPanelView`, panel didáctico explícito y advertencia hardware MXFP4.

## 1. Objetivo general (por qué existe este sprint)

Dar a Khora acceso real, dentro del sistema, a modelos de IA de calidad
—Open Source, Google Gemini y Groq— por petición individual, sin
depender de una única fuente de pago ni de variables de entorno fijas
por despliegue, y sin que el cliente vea nunca una credencial. El
desarrollo es progresivo (ver §5) y la interfaz está orientada
específicamente a este propósito, no a ser un IDE de conversación
general.

Este documento cubre **solo este sprint**. Dos tareas hermanas corrieron
en paralelo en el mismo repo pero pertenecen a otros hilos de trabajo:
movimiento de `EntornoPersistentePanel.tsx` (territorio EP vs UI) y la
migración de `/api/grafo` a lectura directa de Neo4j Aura (hilo
GRAFO-02/GRAFO-03). Ambas ya cerraron (§3); se anotan aquí solo porque
compartieron ciclos de Jules y archivos adyacentes. Una tercera
iniciativa hermana — modelos locales en GPU propia, ejecución
client-side (sin proxy server-side posible desde Vercel) — nació el
2026-09-17 y vive en su propio documento canónico
`92-sprint-modelos-locales-gpu.md`, con su Fase A y refinamientos cerrados.

## 2. Arquitectura de referencia (contrato ya construido)

- **Perfiles de proveedor**: `open_source`, `gemini`, `groq`, resueltos
  server-side desde `scripts/khora/env-vault.ps1`
  (`KHORA_PERFIL_<NOMBRE>_BASE_URL/API_KEY/MODEL`). El cliente nunca
  envía credenciales, solo el nombre del perfil. Un cuarto perfil,
  `local`, está construido (documento 92, ADR-016) y rompe deliberadamente
  este patrón server-side — ver ese documento.
- **Endpoint**: `POST /api/v1/chat` (kernel Python) →
  `khora-web/app/api/chat/route.ts` (proxy Next.js, streaming sin
  buffer).
- **Streaming SSE**, un solo envoltorio JSON con campo `tipo`:
  `chunk`, `usage` (tokens reales cuando el proveedor los entrega vía
  `stream_options: {include_usage: true}`), `error`, `fin`.
- **Errores pre-stream**: 503 `PERFIL_NO_CONFIGURADO`, 429
  `RATE_LIMIT` con `reintentar_en_segundos`. Errores a mitad de stream
  viajan como evento `error` dentro del mismo SSE, nunca como cambio
  de código HTTP.
- **UI Review**: cada pantalla nueva tiene un componente presentacional
  en `app/components/shared/` registrado en `lib/ui-review/registry.ts`
  con escenarios explícitos, verificado en `ui_review_drift.test.ts`.
  Los estados sintéticos de prueba en `lib/ui-review/states.ts` deben
  reflejar los mismos valores por defecto que producción — mostrar un
  nombre de modelo viejo ahí también cuenta como deriva, aunque el
  test de deriva automático no lo capture.
- **Dominio canónico de producción**: `https://khora-web.vercel.app`,
  confirmado por el Intérprete 2026-09-18. Úsalo para cualquier cosa
  que necesite el origen exacto (CORS de Ollama, `KHORA_WEB_ORIGIN`,
  smoke tests nuevos). Los dominios `khora-ten.vercel.app` y
  `khora-preview.vercel.app` que aparecen en otras partes del repo NO
  son este — ver §0.

## 3. Estado verificado por componente

Verificado por clonado/extracción directa del repo.

| Componente | Estado | Evidencia |
|---|---|---|
| Perfiles LLM + `/api/v1/chat` (Prompt 1, ADR-015) | ✅ Cerrado | `llm_generico.py`, `ruff check` limpio en `kernel/` |
| Pantalla de chat `/sistema/consulta` + `ConsultaView.tsx` (Prompt 2) | ✅ Cerrado | Registrado en `ui-review/registry.ts`, con diagnóstico local proactivo y panel didáctico |
| Panel de KPIs `/sistema/kpis` + `KpiPanelView.tsx` (Prompt 3) | ✅ Cerrado | Banner proactivo 4 estados local, resolución dinámica de modelo/ventana, warning MXFP4 |
| `frontier_benchmarks.ts` / `model_catalog.ts` / `states.ts` — datos reales | ✅ Cerrado y verificado | `resolverModeloYVentanaLocal` dinámico, `parsearContextoTokensBinario`, opcionalidad en `CatalogModelEntry` |
| Mover `EntornoPersistentePanel.tsx` a `components/ep/` (GEN-01) | ✅ Cerrado | Ya no existe en `components/os/` |
| `/api/grafo` leyendo Neo4j Aura en vez de Postgres | ✅ Cerrado | `obtenerGrafoNeo4j()` activo en `route.ts`; Postgres queda `@deprecated` sin uso |
| CI "calidad" (ruff) | ✅ Verificado limpio localmente | El aviso de Node 20/24 es ruido de plataforma de GitHub, no del código |
| Verificación en vivo con credenciales reales de producción | ⏳ Pendiente — acción de Intérprete, no de Jules | Repetido en cada ciclo |
| `GROQ_PULIDO_MODEL` con default deprecado (4 archivos) | 🚩 Hallazgo, sin resolver, fuera de este sprint | Ver §8 |
| Dominios `.vercel.app` inconsistentes en workflows de smoke-test | 🚩 Hallazgo nuevo, sin resolver, fuera de este sprint | Ver §0 |
| Modelos locales en GPU propia (perfil `local`, ADR-016) | ✅ Cerrado | Cobertura unitaria en `ollama_local.test.ts` y `kpis.test.ts` |
| Radar de modelos gratuitos + benchmarking didáctico | 🆕 En diseño, no enviado a Jules | Ver §13 |

## 4. Cerrado — fix de TPS real vs. estimado (verificado por Claude)

`KpiPanelView.tsx` consume el evento `usage` del backend
correctamente:
- TPS y Tokens muestran `(real)` cuando llega `completion_tokens`,
  `(estimado)` cuando cae a `charCount/4`.
- El fin de la ventana de generación usa el timestamp del **último
  chunk de contenido** (`lastChunkTime`), no el del evento `usage` —
  evita inflar el tiempo transcurrido por la latencia posterior del
  evento de uso.
- Solo `completion_tokens` alimenta la cifra "real"; nunca
  `total_tokens` como respaldo.

## 4b. Investigación de cifras reales (frontier_benchmarks.ts / model_catalog.ts)

- **Modelos de frontera**: GPT-5.5, Claude Opus 4.8, Gemini 3.1 Pro.
  SWE-bench Verified y GPQA Diamond como métricas discriminantes.
- **GPT-OSS-120B** (modelo real detrás del perfil `groq`): MMLU 90.0%, SWE-bench Verified 62.4%, GPQA Diamond 80.9%.
- **DeepSeek V4 Flash** (`open_source`) y **Gemini 3.8 Flash** (`gemini`): SIN cifras de benchmark propias con fuente sólida — marcadas explícitamente como pendientes.

## 4c. Preguntas de confirmación de Jules — respondidas

Todas las preguntas de confirmación anteriores fueron respondidas y ejecutadas en el repositorio.

## 5. Niveles de madurez de la UI (hoja de ruta progresiva)

| Nivel | Contenido | Estado |
|---|---|---|
| 1 · Esencial | Chat multi-turno, streaming, selector de perfil | ✅ |
| 2 · Básico | Selector de modelo, historial de sesión, cooldown visible | ✅ |
| 3 · Medio | Cambio de perfil a mitad de conversación, TPS/TTFT reales, toggle modo grafo | ✅ |
| 4 · Avanzado (KPIs) | Panel comparativo, fan-out N proveedores, catálogo de modelos | ✅ Completo, con datos reales verificados |
| 5 · Lujo | Ramas de conversación, preview HTML, VCP con conflictos | Fuera de alcance, no iniciado |
| 6 · Modelos locales (rama hermana, doc 92) | Descarga/ejecución de modelos en GPU propia vía Ollama, agnóstico a entorno, resolución dinámica | ✅ Cerrado (ADR-016) |
| 7 · Radar + benchmarking didáctico (nuevo, §13) | Vigilancia de modelos gratuitos nuevos, aprendizaje acumulado de diferencias con uso real | En diseño, sin enviar |

## 6. Reglas de trabajo no negociables con Jules (acumuladas)

- Un solo comando de aplicar+fusionar+desplegar por ciclo.
- Patrón diagnóstico → causa demostrada (ADR si aplica) → contrato → pruebas → documentación.
- Nomenclatura y comentarios en español; cero dependencias nuevas sin justificar; variables de entorno solo vía `env-vault.ps1`.
- Cero fallback silencioso, nunca.
- El ciclo no se cierra solo por merge — cierra cuando lo declarado como pendiente de verificación en vivo se confirma aparte.
- Toda pregunta de aclaración en un único bloque antes de implementar.
- Avance ágil entre ciclos: la verificación pendiente de un ciclo se integra como Fase 0 del diagnóstico del siguiente prompt.
- `components/os/` es territorio exclusivo de la migración de interfaz; otros hilos no escriben ahí.
- Un hallazgo fuera de alcance detectado de pasada se registra y se deja intacto.
- **Una sola tarea/ciclo de Jules a la vez**.

## 7. Decisiones técnicas clave ya tomadas

- TPS: preferir tokens reales de `usage` cuando el proveedor los entrega; `charCount/4` solo como fallback.
- `frontier_benchmarks.ts` / `model_catalog.ts`: esquema por diccionario (`Record<string, ...>`), opcionalidad explícita para `local` que se resuelve vía `resolverModeloYVentanaLocal`.
- Errores de perfil no configurado → 503; rate-limit → 429; ambos solo antes de iniciar el stream.
- Fan-out de KPIs ocurre en el navegador (cliente), no en el kernel.
- Modelos locales (doc 92, ADR-016): ejecución 100% client-side — Vercel no tiene GPU ni alcanza `localhost` del navegador del usuario. Motor por defecto: Ollama.
- Dominio canónico de producción: `https://khora-web.vercel.app`.

## 8. Próximas acciones y de quién son

- **Intérprete**: cargar credenciales reales de al menos el perfil `groq` en el vault de producción y verificar `/sistema/consulta` y `/sistema/kpis` respondiendo en vivo.
- **Jules**: completada Fase A y Hallazgos 1-4 del perfil local.
- **Intérprete**: confirmar alcance de la propuesta de Radar + Benchmarking Didáctico (§13) antes de redactar el siguiente prompt.

## 9. Reflexión de rumbo

Cuatro perfiles de infraestructura construidos y verificados en el repo. La verificación en vivo con credenciales de producción sigue siendo la acción bloqueante del Intérprete.

## 10. Investigación pendiente — hallazgos catalogados sin tocar

- `llama-3.3-70b-versatile` como default de `GROQ_PULIDO_MODEL` en `lib/server/pulido.ts`/`titulos.ts`.
- Dominios `.vercel.app` inconsistentes entre workflows de CI y el código de producción.

## 11. Historial de sesiones (continuidad entre hilos de chat)

Este documento es la fuente de verdad canónica para el sprint de acceso a modelos de IA en Khora.

## 12. Documentos hermanos

- `92-sprint-modelos-locales-gpu.md` — perfil "local" vía Ollama.
- `manual/90-resolucion.md` — hilo IAR/grafo.

## 13. Radar de Modelos Gratuitos + Benchmarking Didáctico — propuesta en diseño

(Ver detalle de niveles R1-R4 y B1-B5 en la propuesta en diseño).
