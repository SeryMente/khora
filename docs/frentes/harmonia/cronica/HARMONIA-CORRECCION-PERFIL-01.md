# HARMONIA-CORRECCION-PERFIL-01

Corrección obligatoria tras una colocación errónea.

Evidencia CLI de solo lectura:
- Usuario de consola: `CENTRAL\fila4`.
- `Win32_UserAccount`: SID `S-1-5-21-1529298404-1161420656-882029410-5167`.
- `Win32_UserProfile` por ese SID: `LocalPath=C:\Users\fila4`, perfil cargado y existente.
- `C:\Users\fila4\Desktop`: existe; propietario `CENTRAL\fila4`.

La resolución anterior mediante el contexto del proceso Remote Desktop Commander fue inválida. Regla: `C:\Users\MantenimientoRCI\` queda prohibida para uso operativo, lectura como raíz y toda escritura/movimiento/copia/borrado del frente.

Artefacto conocido en raíz prohibida por la operación anterior: `C:\Users\MantenimientoRCI\Desktop\Harmonia-Observabilidad-v0.1.0`. No fue tocado durante esta corrección.

Reparación propuesta, no ejecutada: comprobar colisión en `C:\Users\fila4\Desktop\Harmonia-Observabilidad-v0.1.0`; reconstruir allí desde Git y aportar un runtime verificado sin leer la copia prohibida; verificar manifiesto/huellas; retirar la copia prohibida únicamente mediante autorización separada.

## Inventario y redirección

Consulta CLI posterior, sin modificar ni leer contenido de archivos:
- `HKLM\ProfileList` confirma `C:\Users\fila4`.
- El valor `Desktop` del hive cargado de fila4 apunta indebidamente a `C:\Users\MantenimientoRCI\Desktop`; veredicto `BLOCKED_WRONG_REDIRECTION`.
- `C:\Users\fila4\Desktop` existe y pertenece a `CENTRAL\fila4`, pero no se escribe mientras persista la discrepancia.
- Artefacto conocido en la raíz prohibida: 3 directorios, 13 archivos, 86,992,768 bytes. Inventario superior: `collector/`, `extension/`, `runtime/`, `CONSULTAR-HARMONIA.cmd`, `INICIAR-HARMONIA.cmd`, `LEEME.txt`, `MANIFEST-HUELLAS.json`. No se alteró.

Reparación sigue propuesta, no ejecutada: corregir/confirmar la redirección del Escritorio de fila4; reconstruir desde Git hacia la ruta autorizada sin usar la copia prohibida; verificar huellas; retirar la copia prohibida solo con autorización separada y sin pérdida.
