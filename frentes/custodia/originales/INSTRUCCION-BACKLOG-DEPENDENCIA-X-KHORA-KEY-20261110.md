# Instrucción del operador · dependencia de X_KHORA_KEY en Recuperar capturas · 2026-11-10

## Entrada literal

> Mira, adicional a vercel blob limit, l perdida de x khora key, dejalo como unposible razonpara no poder recuperar elementos que deberian seguir en el panel de registros recuperables, es correcto?
>
> Documentalo como backlog, pero eso significa que los registros posteriores requeriran el x khora key, si savbmos pra que es esa llave cone xactitud?

## Interpretación operativa

Registrar la indisponibilidad o pérdida de `X_KHORA_KEY` como causa técnica adicional, independiente de la suspensión de Vercel Blob, que puede impedir cargar el catálogo y recuperar registros ya persistidos. Precisar los límites probatorios: la dependencia está confirmada por inspección estática del código, pero la configuración actual de Production y la causa concreta de cada registro ausente no se han probado con una lectura autenticada.

Mantener un backlog dentro del expediente CUSTODIA-01 para:
1. verificar, sin revelar secretos, si Production conserva la misma clave que cifra los payloads existentes;
2. distinguir fallos de catálogo/descifrado, ausencia de revisión, titularidad, lectura de Blob y lectura/descifrado de B2;
3. confirmar la visibilidad por página y la recuperación por registro una vez validada la llave;
4. proponer por separado cualquier cambio de código para que un fallo de descifrado individual no convierta toda la página del catálogo en 503.

La inspección no autoriza cambios de código, rotación o sustitución de llave, re-cifrado, modificación de datos, migración de proveedor ni lectura de contenido personal fuera del flujo autenticado y autorizado. No imprimir ni transferir el valor de la variable.
