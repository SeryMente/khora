# Salida de interfaz aportada por el operador · Seguridad / Bóveda · 2026-11-10

Se conserva la copia visible proporcionada por el operador. Los dos identificadores de Bearer Token se han sustituido por marcadores de redacción porque son credenciales, aunque los prefijos estaban truncados. No se conservó ningún valor secreto.

## Control MCP & Revocación

- Generación de Seguridad: #1.
- Último Refresh Token OAuth: 20/10/2026, 9:36:21 a.m.
- Bearer Token manual: scopes visibles `runtime:read`, `volcados:read`, `norm:turn`, `jules:read`, `jules:write` en el selector de scopes.
- Dos tokens manuales activos, ambos con scopes efectivos mostrados `runtime:read volcados:read norm:turn`; último uso: Nunca. Los prefijos visibles se redactaron.
- Expiraciones presentadas: 9/1/2027 12:37:35 p.m. y 4/1/2027 2:32:37 p.m.
- Se muestra una acción de revocación por token y otra global. No se pulsó ninguna.

## Bóveda KHORA

- Estado de seguridad: CERRADA.
- Tiempo de sesión configurado: 30 minutos.
- Acciones visibles: Abrir bóveda; Restablecer PIN olvidado.
- Texto: las grabaciones y registros de Custodia están cifrados; el PIN abre la bóveda.
- Secretos de GitHub separados entre Entorno Persistente e Instrucciones MCP. Con la bóveda cerrada, el panel indica que debe abrirse con PIN para gestionar esos secretos.

## Acceso delegado para agente local

- Capacidad de 60 minutos, scope presentado como capacidad para abrir la bóveda canónica; la llave maestra permanece en la PC bajo DPAPI.
- Historial mostrado: emisiones 1; activas 0; expiradas 1; revocadas 0.
- Única emisión mostrada: 03/10/26 11:32 a.m.; expira 03/10/26 12:32 p.m.; estado EXPIRADA.
- No se emitió una capacidad nueva ni se usó una existente.

## Entorno Persistente

- Catálogo de repositorios no cargó.
- Se muestran 2 repositorios seleccionados.
- No se pulsó Preparar Entorno Persistente ni se ejecutó el comando de bootstrap.
- Se muestra una sesión reciente activa de 25/9/2026 y otra superseded de la misma fecha.
- El comando presentado obtiene el token desde el portapapeles, limpia el portapapeles y descarga el bootstrap de KHORA; no fue ejecutado.

## Seguridad / siguiente ruta

La salida permite distinguir el control MCP, la bóveda web KHORA y la bóveda/instanciación EP. No acredita que los Bearer Tokens manuales puedan abrir la bóveda ni que concedan acceso de escritura a dictados. No se revocaron, renovaron ni utilizaron.

