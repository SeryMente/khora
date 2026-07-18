# API del Kernel

## Cómo se usa
El Kernel es la capa central del sistema y expone los contratos principales.
En el arranque, el assembly del sistema instancia el `HostDeModulos` pasándole el objeto de configuración (que apunta por defecto a `~/.khora/`), los puertos de CH-4 disponibles y el callback de registro para auditoría y trazabilidad del ciclo de vida.
El Host de módulos se encarga de aislar la carga perezosa de los submódulos.
(Para más detalles sobre el arranque y carga de dependencias, ver [37. Host de módulos](37-host.md))
