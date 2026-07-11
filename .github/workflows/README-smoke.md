# Post-Deploy Smoke Test

Este workflow se encarga de verificar que la aplicación web (Khora) está respondiendo correctamente de forma pública en `https://khora-ten.vercel.app/` después de un despliegue exitoso (o de forma manual).

## Qué verifica
1. Que la URL pública devuelva un código HTTP **200 OK**.
2. Que el HTML en la respuesta contenga el marcador de versión (`VER-1`) o bien la cadena básica `Khora`.

## Cómo leer un fallo
Si el pipeline falla (job en ROJO), verás el fallo en los logs de GitHub Actions. Para diagnosticar el problema:
- Busca la línea `Received HTTP status:`. Si el código no es `200` (por ejemplo, `500`, `404`, `502`), el servidor o Vercel tuvo un error en la capa de red/servidor.
- Si el código es `200` pero el error dice `Error: Marker (VER-1 or Khora) not found in response body.`, significa que se cargó la web, pero el contenido HTML es incorrecto (puede ser una pantalla de error blanca, configuración incorrecta o regresión visual del pie de página).
- Revisa la sección `=== Response body ===` al final del log para ver exactamente qué devolvió el servidor en la última petición y así ayudar en el análisis root-cause.
