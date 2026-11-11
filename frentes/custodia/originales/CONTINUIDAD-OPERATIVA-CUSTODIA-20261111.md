# Registro de continuidad conversacional · CUSTODIA · 2026-11-11

> **Naturaleza:** síntesis de continuidad materializada a partir del tramo visible que el operador suministró en esta conversación. No es una exportación nativa de ChatGPT ni una transcripción literal exhaustiva. No se inventan ID nativo, UUID local, folio ni hora de captura. Las afirmaciones históricas se preservan como antecedentes comunicados; no se consideran verificaciones nuevas por el hecho de archivarlas.

## 1. Instrucciones literales del operador preservadas

> «Por que necesitas ver el sistema en la interfaz como un humano, no se trata de eso.»

> «Para resolver no quiero que veas la interfaz, avanza.»

> «Resuelve de extremo a extremo, no te detengas.»

> «Cada ciclo muestrame las tareas y el objetivo del ciclo avanza.»

> «Persiste en frente CUSTODIA la conversación. Sin tardarte mucho. Evita burocracia innecesaria.»

Alcance operativo derivado: trabajar por repositorio, Neon y evidencia server-side; no usar monitor, navegador local, IndexedDB ni Remote Desktop Commander. Cada ciclo debe exponer objetivo y tareas. La persistencia documental no amplía las autorizaciones para operaciones productivas ni elimina las compuertas de identidad, integridad o proveedor.

## 2. Secuencia de continuidad recibida

1. La retoma inició con un reporte de autenticación ausente en perfiles de navegador en la nube. El operador corrigió expresamente el enfoque: la solución no debía depender de observar o manipular una interfaz como humano.
2. Los reportes posteriores comunicaron un inventario de 95 sesiones atribuibles, 16 ya vinculadas a Volcado y 79 pendientes; 1.039 partes de audio por metadata (785 B2 y 254 Vercel Blob); 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales pendientes. Estos conteos son la línea base reportada en los ciclos previos y no una lectura nueva realizada por este documento.
3. Se comunicó que la ruta primaria de archivo es POST /api/dictado, respaldada por NextAuth, reclamarSesion() y guardarDictado(). La ruta genérica /api/volcado y la ingesta secundaria no sustituyen ese contrato porque no preservan por sí solas sessionId, revisión de checkpoint, procedencia e idempotencia exigidas para CUSTODIA.
4. Se descartó scripts/custodia-worker.ts como archivador de checkpoints huérfanos: procesa derivados MP3 y trabajos secundarios sobre Volcados existentes. No se ejecutó.
5. La inspección reportada de Production encontró entradas nominales de variables sensibles, pero no permitió obtener sus valores descifrados ni demostrar una identidad NextAuth del titular desde este canal. Los logs y metadatos consultados no acreditaron un worker CUSTODIA activo.
6. La revisión reportada de OAuth/MCP no encontró scopes ni herramientas activas de escritura CUSTODIA. MCP normativo permanece DESACTIVADO. Se identificó khora_leer_audio como lector read-only capaz, por diseño, de leer una sesión sin Volcado y cotejar GET/KHC1/longitud/SHA, pero permanece detrás de la compuerta normativa y del bearer del titular; no se invocó.
7. R8 individualizó las 79 sesiones. R9 examinó localizadores B2/Blob y derivados MP3. R10 documentó las rutas de lectura y sus compuertas. Los detalles y hashes de esos entregables permanecen en sus evidencias específicas.
8. El ciclo R11 investigó staging, importación, eventos y la discrepancia de cifras de fuentes locales, sin GET/list de objetos, sin escrituras de negocio y sin acceso local. Su dictamen se registra por separado en FUENTES-STAGING-Y-TRAZAS-DE-CARGA-20261111-R11.md.

## 3. Estado transmitido al retomar

- CUSTODIA-01 sigue siendo el único expediente activo y continúa EN CURSO.
- El inventario de 79 sesiones sin Volcado no se reduce por documentar hallazgos.
- Las 1.039 partes de audio siguen siendo referencias/metadatos hasta que cada objeto pase read-back físico y cotejo.
- La parte 317 conserva una incidencia de manifiesto; no debe sintetizarse una parte sustituta ni declararse perdida sin prueba física.
- Los 216 fragmentos locales se mantienen preservados y no se accede al equipo, monitor, Chrome local, RDC o IndexedDB.
- La auditoría histórica de 993 registros en cinco snapshots/sesiones y la cifra de 216 fragmentos en dos sesiones pertenecen a alcances y momentos distintos. No están conciliadas.
- No se deben crear Volcados por SQL directo, convertir una API auxiliar en identidad del titular, habilitar MCP por inferencia, extraer secretos ni ejecutar reconciliación global de riesgo.

## 4. Estado probatorio de esta materialización

Este archivo conserva la continuidad visible y las instrucciones, no certifica por sí mismo que cada acción descrita en el diálogo histórico haya sido ejecutada o aceptada. Los resultados técnicos verificables deben citar sus respectivas evidencias R4–R11 y sus lecturas de vuelta. No es un reemplazo de originales nativos que el operador pueda aportar posteriormente.

**Control de preservación:** se mantiene sin cambios CONTROL-RESPONSABILIDAD.json (generación 11) y la instrucción de archivo original vigente. Esta operación no transfiere titularidad, no asigna folio y no modifica Production.