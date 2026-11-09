# CUSTODIA-B2-005 · Diagnóstico verificable del bloqueo de archivado

> **Estado:** propuesta_pendiente_aprobacion · **Prioridad:** P0 · **Hito:** 1 de 5.
> **Dependencia:** ninguna. **Desbloquea:** CUSTODIA-B2-006.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Alcance:** diagnóstico y pruebas de solo lectura/sintéticas; no cambia producción.

## 1. Objetivo

Determinar con evidencia positiva por qué Cora/Khora no confirma las partes de audio y por qué se bloquea «Archivar registro». Verificar la hipótesis de cuota agotada de Vercel Blob, identificar la falla de autorización de B2 y revisar la cadena completa para no atribuir todo a una sola causa sin pruebas.

## 2. Motivo y evidencia inicial

- El almacén Vercel Blob khora-audio fue documentado como limits-exceeded-suspended por cuota excedida.
- Una sesión reportada dejó 14 partes pendientes de confirmación remota y cero filas vinculadas como partes verificadas; el checkpoint de texto sí estaba presente.
- El despliegue de main que contiene el transporte B2 nativo terminó bloqueado por el preflight con storage_b2_authorization_failed.
- El código de preflight no expone la causa HTTP concreta de b2_authorize_account; debe mejorarse la captura diagnóstica sin revelar secretos.
- La publicación READY anterior no demuestra que el transporte B2 del commit posterior esté operativo.

Fuentes: OBJETO-CANONICO.md, LISTA-TAREAS-PROVISIONAL.md, originales/ChatGPT-CUSTODIA-20261107-1302.txt y logs del despliegue fallido 7be5712a19aa98837e6d34449585ecb40e634af3.

## 3. Alcance

**Incluye**
- Verificar el estado actual y cuota/limitación del store Blob desde la cuenta/proyecto autorizados.
- Diagnosticar b2_authorize_account con estado HTTP y código de error saneados; comprobar identidad de cuenta, tipo/capacidades de llave y bucket privado sin mostrar valores.
- Seguir la cadena: captura → IndexedDB → subida → respuesta → GET/read-back → registro de parte → manifiesto → endpoint/transacción de archivado.
- Revisar build/deployment y errores runtime de los endpoints pertinentes, además de la persistencia de metadatos.
- Usar datos sintéticos en pruebas no productivas; separar evidencia histórica de evidencia actual.

**No incluye**
- Leer, copiar, mostrar o rotar credenciales; modificar bóvedas o variables productivas.
- Cambiar código de producto, hacer merge/deploy, aplicar SQL productivo o alterar bucket/CORS.
- Leer o exportar el texto/audio personal de la sesión real.

## 4. Secuencia mínima

1. Fijar deployment, commit, entorno y configuración no secreta realmente activos.
2. Verificar el estado actual de Vercel Blob y obtener evidencia actual, no solo el incidente histórico.
3. Capturar la respuesta saneada de autenticación B2 y distinguir credencial inválida, versión no compatible, capacidad insuficiente y configuración de bucket.
4. Ejecutar pruebas sintéticas separadas para subida, lectura de vuelta, vínculo de parte y archivado.
5. Entregar una matriz de fallos confirmados, descartados dentro del alcance probado y no verificables.

## 5. Criterios de aceptación

| Criterio | Evidencia exigida | Resultado |
|---|---|---|
| Estado de Blob confirmado en el corte actual | Estado del store y cuota/limitación, con fecha y cuenta/proyecto | PENDIENTE |
| Causa del fallo de autorización B2 identificada | Estado HTTP/código saneado de B2; ninguna clave impresa | PENDIENTE |
| Cadena de archivado inspeccionada de extremo a extremo | Recibo correlacionado de cada transición sintética | PENDIENTE |
| Otros fallos del alcance probado clasificados | Matriz de pruebas PASS/FAIL/NO VERIFICADO | PENDIENTE |
| Informe reproducible y seguro | Documento con versión, entorno, evidencias y límites | PENDIENTE |

«No existe otro fallo» solo podrá afirmarse para el conjunto exacto de rutas, versiones, escenarios y ventana probados; nunca como certeza global sin evidencia exhaustiva.

## 6. Seguridad y salida

- Usar únicamente la bóveda autorizada de Khora y credenciales existentes; no reutilizar bóveda/cache de EP.
- Registrar solo código de error, estado HTTP, request/correlation ID saneado y metadatos técnicos.
- Conservar originales y no hacer escrituras sobre fuentes históricas.
- **Salida que habilita B2-006:** causa concreta de Blob y B2, ruta de fallo exacta, dependencias y prueba mínima de corrección.
