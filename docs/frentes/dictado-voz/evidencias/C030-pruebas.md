# C030 · pruebas reproducibles y límites

- Fuente base: main `3356bfc92965503d81b06e5637c4668afbde3a52`.
- Chromium local, React real, MediaRecorder y Opus reales, dos osciladores sintéticos, Web Locks e IndexedDB/AES-GCM reales. HTTP autenticación/almacenamiento/proveedor sustituidos por fixtures. El adaptador de navegación propaga replaceState como Next App Router; no es el servidor Next real.
- `captura-c030-ui.cjs repo`: captura corta de ambas fuentes, fragmentos finales, navegación reactiva, formato diálogo/plano y recuperación explícita. `KHORA_C030_SOURCE` permite indicar checkout base y argumento baseline para reproducir el fallo anterior.
- `captura-c030-normal.cjs`: Workspace real de dictado, grabadora/local/telemetría reales, adaptadores acotados para vistas auxiliares y reconciliación. Comprueba señal inmediata al detener, rechazo HTTP 503, ausencia de alertas repetidas por parte, reintento explícito, bloqueo del transcriptor incompleto y eventos sin texto. No mide fidelidad ASR ni prueba servidor productivo.
- Dependencias de pruebas fuera del producto: esbuild, playwright, React/ReactDOM instalados y Chromium en PATH. Sin secretos. Ejecución desde raíz del checkout con NODE_PATH de esas dependencias si necesario.
- 15 pruebas unitarias dirigidas de diálogo/captura/transcriptor aprobadas. Compilación estricta del panel y sus dependencias adquiridas aprobada (TypeScript 5.9.3); no sustituye typecheck global.
- PostgreSQL PGlite 0.5.10 local, SQL extraído del registrador real: antes primer insert=1/reintento idéntico=0; después 1/1; huella, bytes o fuente distintos y sesión sellada siguen rechazados. Sin conexión a base productiva.
- Síntomas reales del operador no se atribuyen enteramente a la prueba sintética: logs productivos y sesión humana siguen pendientes.

- Extensión aprobada: recuperación → primer archivo HTTP 503 incierto → edición bloqueada → mismo payload en reintento → recibo válido → dos originales locales retenidos; ninguna ingesta automática. Igual en ambas presentaciones. Ver C030-archive-results.json.
- Preview de 06c36c: dpl_HkHzVpp8ymTiueVnGXYs6vmvtha8 READY. Prebuild encadena cuatro compuertas existentes; logs individuales/check-runs no recuperados, sin conteo global inventado.
