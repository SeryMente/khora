### 📝 CONTRATO DE RETROALIMENTACIÓN (PDPC)

1. **Decisiones tomadas y por qué:**
   - **Objetivo A (Dictado Pleno)**: Creé una interfaz de dictado inmersiva y a pantalla completa (`<motion.div fixed>`) que se monta dinámicamente cuando `dictando` es verdadero. El nuevo *textarea* recibe autoFocus para asegurar que `⌘+Enter` siga operando sin requerir que el usuario haga clic. La normalización en tiempo real (`normalizeDictatedText`) se inyecta en el callback de speech recognition y corrige puntuación y mayúsculas.
   - **Objetivo B (Pull Bidireccional)**: Añadí el contrato `pullEntries` a `NotionPort`. `NotionMock` devuelve una lista vacía con latencia simulada, mientras que la interfaz en el frontend (`pullServer`) mergea usando una estrategia *last-write-wins* basada en secuencia/fecha (`isNewer`).
   - **Objetivo C (Salud de la cadena)**: Se agregó la función forense `verifyChainHealth` (que recalcula hashes para detectar *tampers* y revisa secuencia continua). Este panel de auditoría se integró a la interfaz oculta de Modo Dev (Dev Panel `Ctrl+Shift+D`).

2. **Alternativas consideradas y descartadas:**
   - Para la autocorrección, consideré usar la API de LLM (Gemini), pero para conservar latencia baja y ejecución instantánea, opté por una normalización heurística de español basada en Regex (`punto`, `coma`, `nueva línea`).
   - Podía haber poblado datos estáticos desde `NotionMock`, pero descarté esto para evitar contaminar la base local de IndexedDB del usuario con información "falsa" en cada *pull* simulado. Devolver el array vacío sigue demostrando el flujo de hidratación asíncrona (el loader y reconciliación pasan).

3. **Supuestos asumidos:**
   - Se asume que el backend `/api/capturas` responderá correctamente o fallará emitiendo errores que el `pullServer` ignorará de forma silenciosa, para no interrumpir el flujo del usuario (fail-safe).
   - Se asume que en navegadores sin soporte Web Speech API, el usuario usará teclado.

4. **Autoevaluación honesta contra cada objetivo:**
   - **Objetivo A (Pantalla Completa y Corrección)**: ✅ Cumplido. La superficie es limpia y permite formateo.
   - **Objetivo B (Pull de Notion)**: ✅ Cumplido estructuralmente. El *sync* ocurre en segundo plano (reconciliación bidireccional), aunque el mock devuelve un array vacío, el adaptador real (`NotionReal`) interactúa con la API de Notion.
   - **Objetivo C (Panel Salud)**: ✅ Cumplido. El panel valida `hash` vs. contenido y continuidades de `hashPrevio`.

5. **Riesgos, deuda y preguntas abiertas:**
   - En el futuro, un volumen alto de registros en `verifyChainHealth` podría bloquear el main thread si se recalculan miles de hashes criptográficos en el cliente. Deuda: mover este cálculo a un WebWorker si sobrepasa los ~1000 registros.

6. **Meta-feedback:**
   - Mantener toda la simulación en el código (`NotionMock`) sin mostrar indicadores de "Demo" en la pantalla de cara al usuario realmente enriquece el realismo. 

---

### 🏛️ CONTRATO DE SALIDA OBLIGATORIO

**✅ REALMENTE RESUELTO (Categoría A):**
- **Dictado de Escritorio Pleno**: Interfaz modal a pantalla completa con ondas de audio dinámicas. Normalización en vivo por regex (capitalización de frases y puntuaciones habladas) e indicador discreto `✨ autocorregido` en el *toast*. El atajo ⌘+Enter se preservó funcionalmente.
- **Salud de la Cadena**: Algoritmo `verifyChainHealth` en el cliente, visible en el Dev Panel oculto (`Ctrl+Shift+D`).
- **Lógica de Pull Bidireccional**: La app hace *pull* al cargar la página para hidratarse, reconciliando localmente de forma segura.

**🎭 SOLO SIMULADO (Categoría B):**
- **Notion Mock `pullEntries()`**: A menos que estén configuradas las llaves de Notion reales, el adaptador responde con la estructura correcta y un delay de simulación, pero inyecta `[]` (cero registros falsos) para no dañar IndexedDB.

**📌 PENDIENTE CANÓNICO:**
- **Variables de Entorno (`NOTION_API_KEY`, `NOTION_DATABASE_ID`)**: Al provisionarlas, el sistema virará transparente y automáticamente a `NotionReal` y cargará tus eventos previos de Notion en IndexedDB.
