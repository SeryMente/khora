# Instrucción · persistencia del último tramo y repetición del ciclo

Fecha: 2026-11-10  
Frente: CUSTODIA · generación 11  
Rama autorizada: `fix/cora-recovery-inventory-20261110`

## Instrucción del operador

«Persiste en el frente de trabajo CUSTODIA el último tramo de la conversación, bien formateado, y repite el último ciclo, conservando la salida del modelo literal».

## Alcance aplicado

1. Incorporar al OCP el último corte conversacional y las decisiones vigentes, manteniendo CUSTODIA-01 como única tarea activa: archivar todos los registros que puedan archivarse y dejar como residuales únicamente los casos con impedimento actual, concreto y documentado.
2. Actualizar la lista provisional subordinada al OCP.
3. Conservar como artefacto separado y sin correcciones la última salida visible del modelo anterior a esta instrucción.
4. Repetir el diagnóstico de forma eficiente con lecturas de solo metadatos de Production y lectura estática del código; no solicitar ni imprimir secretos.
5. Distinguir evidencia verificada, declaración del operador, afirmaciones históricas no revalidadas e hipótesis.
6. No modificar `main`, código de producto, configuración de Production, despliegues, Neon, B2, Vercel Blob ni bóvedas. No hacer GET ni transferencia de objetos en este ciclo documental.

## Límites heredados que siguen vigentes

- La búsqueda de la copia recuperable de `X_KHORA_KEY` continúa limitada a la primera bóveda y la bóveda reconstruida; no ampliar a LastPass ni a otros almacenes.
- No revelar, rotar, sustituir, regenerar ni volver a cifrar la llave. Preservar ciphertext y originales.
- Conservar las autorizaciones previamente registradas para archivar los registros elegibles y para procesar los 216 fragmentos locales; no convertirlas en autorización para cambiar configuración o hacer escrituras directas fuera del flujo canónico.
- Mantener excluidos los registros sin titularidad demostrada y los atribuibles a otros titulares.
- FOL1 sigue sin ACTIVO; no asignar folios ni IDs que no hayan sido emitidos y verificados.
