# Instrucción del operador · límite de recuperación de X_KHORA_KEY · 2026-11-10

## Entrada literal

> Mira es una variable de entorno, que si no esta en las bvedas que te digo que eran la primer boveda, la recosntruida,  probablemente se perdio defintiviamente. Ajusta la operacion a esos parametros, e informarme de las cosnecuencias.

## Interpretación operativa registrada

La búsqueda de recuperación de la copia de `X_KHORA_KEY` queda limitada exclusivamente a las dos bóvedas que el operador identifica como la primera bóveda y la bóveda reconstruida. No se amplía a LastPass, perfiles alternos, almacenes ajenos ni nuevas búsquedas generales de respaldos o ubicaciones.

La comprobación debe distinguir el nombre literal `X_KHORA_KEY` de un eventual alias histórico `KHORA_API_KEY`; solo se tratarán como equivalentes cuando la evidencia de configuración lo justifique. No confundir con la contraseña maestra EP, el PIN de la bóveda web, PAT GitHub ni Bearer tokens MCP.

Si ambas bóvedas se pueden abrir y enumerar de forma válida y ninguna contiene la variable ni un alias acreditado, el resultado será: **NO LOCALIZADA EN LAS DOS BÓVEDAS; PRESUNTA PÉRDIDA DEFINITIVA DE LA COPIA RECUPERABLE DENTRO DEL ALCANCE AUTORIZADO**. Si alguna bóveda permanece sellada o no puede enumerarse, no se declarará ausencia: se registrará como no verificada.

La existencia y operatividad de una copia ya configurada en Vercel Production es una dimensión distinta. Puede seguir funcionando aunque la copia recuperable en las bóvedas se haya perdido. Una prueba de descifrado de una credencial existente puede demostrar que la clave activa del servidor funciona, pero no revela ni recupera su valor.

Se preservan íntegros los ciphertext y respaldos. Quedan excluidos la fuerza bruta, adivinación de contraseña, reinicialización de bóvedas, rotación/sustitución de `X_KHORA_KEY`, re-cifrado y cualquier operación destructiva. El PIN web no recupera esta llave criptográfica.

Este registro no afirma que las dos bóvedas ya hayan sido abiertas y enumeradas en este ciclo; fija el límite y los criterios de decisión para la operación.
