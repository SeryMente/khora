# Crónica · paquete local Harmonia v0.3.1 en PC-13 · 2026-11-08

## Identidad y gobierno
- Frente: HARMONIA · repositorio `SeryMente/khora`.
- Ciclo UUIDv7 local: `01a1bd12-f56f-7b57-9d81-2de45da860b1` (identidad local, no folio global ni ID nativo).
- Titular: generación 15, alias `chatgpt-harmonia-01a1b6ca-4543-7578-85d9-7624877c2e80`; titularidad no cambió.
- DUG adquirido: v383 / NX-383m; Metacanon 1.29; GOW 2.18. Canon EP: v1.4.0. MCP normativo DESACTIVADO.
- Control de responsabilidad releído: blob `6199386845aaeed02abcd81baa26712226376977`; commit de autorización task-scoped `d98e9029deec79426a52352cff00925799d50c4e`. PC-13 (UUID RDC `1227e578-55c8-4231-82bb-4dbf9234855a`) autorizado exclusivamente para preparar/verificar esta carpeta local. PC10 queda preservado como dispositivo anterior. No se transfirió titularidad ni generación.

## A · Entradas literales
> Usa rdc local, y deja en carpeta EP de escritorio a Harmonia la carpeta de trabajko lista con extension dentro para cargar en cvhrome,
>
> Observabilidad se descarga primnero a local verdaD?
>
> No esa no pC 13

## Alcance ejecutado
- Terminal observada en vivo: PC-13; Windows `PC-13\\PC 12`; perfil `C:\\Users\\PC 12`; SID contrastado durante preflight. No se usó PC10 ni PC8.
- Carpeta destino existente y vacía en lo pertinente: `Desktop\\EP\\Armonía\\extension`; se reutilizó sin tocar los directorios vecinos de EP.
- Código descargado localmente desde `SeryMente/khora:main`, commit de referencia `d98e9029deec79426a52352cff00925799d50c4e`.
- Extensión MV3 v0.3.1 en `Desktop\\EP\\Armonía\\extension`; colector, validador, consulta, fixtures y documentación en la carpeta de trabajo. Se excluyeron scripts heredados de arranque que apuntaban al perfil `C:\\Users\\fila4`; se añadieron auxiliares locales específicos del perfil activo, sin modificar fuentes del repositorio.
- Inicializador `INICIAR-HARMONIA.cmd` preparado. Al ejecutarse genera `extension/local-auth.js` local y arranca el colector en loopback con almacén `%LOCALAPPDATA%\\Harmonia\\surface-index-v0.3.0\\data`. El secreto no fue generado ni expuesto en este ciclo.
- Chrome no fue cargado ni modificado. Colector no iniciado; puerto 47321 estaba libre en el preflight. La prueba natural en Chrome queda fuera de esta materialización.

## Integridad y pruebas
- Diecisiete archivos de origen comparados byte a byte mediante Git blob SHA: **17/17 MATCH**. El catálogo de cobertura raíz y el de la extensión tienen la misma fuente/blob.
- Manifiesto local `MANIFEST-PROCEDENCIA-LOCAL.json`: SHA-256 `8d58126ff0ff98f8305dd0f0bdc9faf1abcd95a93daf85a014a087188c7c296c`; 13.144 bytes; escritura y read-back exactos.
- Node v24.22.2; sintaxis: 5/5 PASS.
- Pruebas Node sintéticas: observador 11/11, validador/colector 7/7, integración servidor/JSONL 1/1; total 19/19 PASS.
- Parser PowerShell para inicializador y wrapper de consulta: 2/2 PASS.
- Fixture upstream `query-cycles.test.ps1`: **NOT_VERIFIED** en el host. `pwsh` no está instalado; bajo Windows PowerShell 5.1 el fixture de CI no completa por la diferencia de deserialización de matrices JSON. La salida diagnóstica de la consulta mostró los cuatro registros sintéticos esperados, pero no se declara PASS del fixture.

## Entorno EP y límites
- Ruta relativa: `Desktop\\EP\\Armonía`; extensión cargable: `Desktop\\EP\\Armonía\\extension`.
- Clasificación: **EP_VOLATIL / UBICACIÓN FÍSICA Y CIFRADO NO CERTIFICADOS**. La presencia en Desktop/EP no acredita persistencia duradera.
- No se cambiaron archivos de otras carpetas EP, no se ejecutó el inicializador, no se creó almacén de datos, no se generó credencial, no se instaló ni activó extensión en Chrome.
- Backlog de Harmonia y código remoto no se modificaron en este ciclo; solo se registró autorización de dispositivo task-scoped y documentación de la materialización.

## B · Salida visible
Sí. **La observabilidad se descarga primero a local**: Chrome carga la extensión desde una carpeta descomprimida local, no desde GitHub ni desde un ZIP.

**Carpeta de trabajo preparada en PC-13:**

`C:\Users\PC 12\Desktop\EP\Armonía`

**Carpeta exacta para Chrome → Cargar descomprimida:**

`C:\Users\PC 12\Desktop\EP\Armonía\extension`

El paquete contiene la extensión MV3 **v0.3.1**, el colector local, consulta de ciclos, pruebas y auxiliares de arranque. Fuente: `SeryMente/khora:main`, commit `d98e9029deec79426a52352cff00925799d50c4e`.

**Integridad:** 17/17 archivos cotejados contra sus Git blob SHA. Sintaxis JavaScript 5/5 y pruebas Node sintéticas 19/19 aprobadas. El fixture PowerShell original de CI quedó **NO VERIFICADO** en este host: PC-13 tiene Windows PowerShell 5.1 y no tiene `pwsh`; no lo presento como PASS.

**Para cargarla:** ejecuta primero `INICIAR-HARMONIA.cmd`; crea la credencial local y arranca el colector. Después, en `chrome://extensions`, activa Modo desarrollador → **Cargar descomprimida** → selecciona la carpeta `extension` indicada arriba.

No inicié el colector ni cargué/modifiqué Chrome en esta operación. El inicializador queda preparado para hacerlo. El directorio EP de este Escritorio se clasifica como **EP_VOLATIL / NO CERTIFICADO**; no equivale a respaldo duradero.

