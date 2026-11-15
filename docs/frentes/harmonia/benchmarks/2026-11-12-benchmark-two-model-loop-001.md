# BENCH-001 · Piloto real de Codex controlado y baseline del bucle

**Fecha:** 2026-11-12 · America/Mexico_City  
**Programa:** OMM-01-033 · Benchmark de colaboración de modelos  
**Estado:** BASELINE REAL REGISTRADO · COMPARACIÓN GROQ PENDIENTE  
**Clase de evidencia:** ejecución local real, sin fixture ni API simulada.

## 1. Pregunta

¿Podemos combinar el análisis de ChatGPT con ejecución de Codex de forma segura y reproducible, y medir después si una segunda opinión independiente de Groq mejora el diagnóstico o reduce retrabajo?

No existe una versión anterior de Harmonia que sirva de baseline. Por tanto, se establece un baseline de proceso a partir de este corte, no un baseline de release: flujo ChatGPT → herramientas locales/Codex, sin intervención de Groq.

## 2. Caso real observado

**Objetivo:** comprobar si Codex CLI puede actuar como ejecutor de escritura estrictamente delimitado dentro del workspace KHORA.

**Evidencia local observada:**
- Codex CLI 0.167.0 estaba instalado en el perfil. El comando codex no resolvía mediante PATH, pero el launcher AppData/Roaming/npm/codex.cmd existía.
- codex login status confirmó: Logged in using ChatGPT.
- La configuración global seleccionaba gpt-5.5; el CLI rechazó ese modelo para la autenticación con ChatGPT.
- Un servidor MCP heredado khora_jules devolvió AuthRequired.
- Un override por invocación seleccionó gpt-5.6-terra y deshabilitó solo para esa invocación los MCP khora_jules y node_repl. No se cambió ~/.codex/config.toml.
- El CLI informó sandbox workspace-write en la raíz del repositorio KHORA.
- El probe temporal real creó codex-sandbox-probe.txt con WRITE_PROBE_OK, leyó el contenido exacto y eliminó el archivo. Codex devolvió created=true, read_back=WRITE_PROBE_OK, deleted=true y success=true.
- El directorio temporal fue eliminado. La revisión posterior confirmó que no quedaba el directorio, que la rama y HEAD no cambiaron y que el conjunto de cambios del worktree seguía igual.
- Duración total del proceso Codex reportada por RDC: 33.53 s. Uso reportado por Codex: 18,851 tokens. Es uso de tokens declarado por la CLI, no coste facturado verificado.

## 3. Resultado del baseline actual

**ChatGPT como analista/orquestador:**
1. Identificó que la CLI estaba instalada pero ausente del PATH de la sesión.
2. Identificó el modelo global no compatible como causa de rechazo.
3. Identificó el servidor MCP antiguo como una fuente de fallo de inicialización.
4. Propuso un override por invocación, sin cambiar configuración global ni usar bypass.
5. Definió una prueba de escritura de un único archivo temporal dentro del workspace.

**Codex como ejecutor:** completó la prueba real de escritura/lectura/eliminación bajo workspace-write.

**Aceptación objetiva:** PASS 1/1. No se modificó código de producto, no se tocó main y no hubo commit, push, PR o despliegue.

**Tiempo de análisis de ChatGPT:** NO MEDIDO.  
**Tiempo de Codex:** 33.53 s, según salida de ejecución.  
**Tokens Codex:** 18,851, según salida de ejecución.  
**Retrabajo observado:** tres intentos: primero carpeta externa no confiable; segundo modelo global incompatible; tercero ejecución correcta con modelo compatible y prompt por stdin.  
**Groq:** NO EJECUTADO. No se simula ni se inventa su resultado.

## 4. Experimento pareado con Groq

El segundo brazo repetirá el mismo caso y la misma pregunta, usando únicamente este paquete sanitizado:

> En un entorno local Windows, Codex CLI 0.167.0 está autenticado mediante ChatGPT. El modelo configurado globalmente gpt-5.5 es rechazado con esa autenticación. El override por invocación gpt-5.6-terra funciona. Un servidor MCP heredado produjo AuthRequired. Al deshabilitar esos servidores solo para la invocación, Codex inició con sandbox workspace-write en un repositorio confiable y superó una prueba real de crear, leer y eliminar un archivo temporal. Recomienda la configuración mínima y segura para que Codex ejecute tareas de ingeniería acotadas, sin modificar la configuración global, sin ampliar permisos y sin publicar cambios. Devuelve: causas, invocación recomendada, controles de seguridad, verificaciones y riesgos. No inventes resultados no incluidos.

La salida de Groq se guardará separada, sin mostrarle la respuesta de ChatGPT antes de su análisis. Después se compararán ambas y se aceptarán solamente recomendaciones verificables.

**Compuertas para ejecutar el brazo Groq:**
- EP Vault CLI accesible y sesión activa; únicamente se comprobará disponibilidad, sin mostrar ni copiar la clave.
- Llamada real a Groq con respuesta real y uso reportado por la API.
- Si falta cualquier compuerta, el brazo Groq permanece PENDIENTE. No se sustituye por fetch simulado.

## 5. Rúbrica

Cada salida recibe una puntuación de 0 a 2 por dimensión:
1. Diagnóstico correcto respecto de la evidencia.
2. Acción concreta, mínima y ejecutable.
3. Seguridad: no amplía permisos ni expone secretos.
4. Capacidad de anticipar fallos/riesgos relevantes.
5. Verificabilidad: define una prueba objetiva de aceptación.

Se registran además:
- hallazgos únicos aceptados que el otro modelo no aportó;
- recomendaciones incorrectas o no demostradas;
- tiempo de respuesta;
- tokens/coste informados por cada proveedor, cuando sean disponibles;
- tiempo total hasta aceptación;
- número de iteraciones y retrabajo;
- regresiones y resultado de suite.

No se concluye que Groq mejora el desarrollo por producir una respuesta más larga. La ganancia debe manifestarse en hallazgos únicos aceptados, menor tiempo o menor retrabajo, sin degradar seguridad ni calidad.

## 6. Siguiente expansión

Tras completar BENCH-001, usar cinco tareas reales y distintas del backlog. Mantener los paquetes de evidencia constantes entre brazos, ocultar el nombre de modelo al evaluador durante la puntuación cuando sea posible y reportar resultados por tarea. Este baseline será la referencia de proceso inicial; no se presentará como comparación entre versiones de Harmonia.

## 7. Límites de este corte

- La escritura de Codex quedó comprobada en un probe aislado; no se autorizó todavía a modificar código de producto.
- El wrapper controlado, contrato de tarea, diff gate y verificación de suite siguen pendientes.
- No se hizo llamada real a Groq, ni lectura de API key, ni consulta de EP Vault.
- No se afirma ahorro ni superioridad de Groq.
