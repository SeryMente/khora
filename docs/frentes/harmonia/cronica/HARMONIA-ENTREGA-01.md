# HARMONIA-ENTREGA-01

## Resultado comprobado

- Dispositivo Remote Desktop Commander conectado: `PC10RCIF4EI4`, usuario `MantenimientoRCI`, Windows 11 Pro. Escritorio resuelto por el sistema: `C:\Users\MantenimientoRCI\Desktop`.
- Semilla v0.1.0 construida y persistida en `apps/harmonia-observability/`.
- Commits: `96efc0f736011d3a7b76f2ebd2151d1ab27e9ab4` (paquete) y `9a1851137e1c01817febe82c87b4f24a2388a917` (runtime local preferido).
- Paquete colocado en `C:\Users\MantenimientoRCI\Desktop\Harmonia-Observabilidad-v0.1.0`.
- Once archivos bajo manifiesto verificados por SHA-256; runtime Node v22.23.3 de 86,973,768 bytes incluido fuera del manifiesto de código.
- Chrome localizado en `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## Cobertura construida

Activación/parada manual sobre una pestaña elegida `chatgpt.com`; protocolo de depuración para instantánea DOM/estilos y consola; observador de mutaciones y texto visible; entradas enviadas; eventos con sesión, tipo, fuente y tiempo. Excluye por diseño borradores no enviados, cookies, credenciales, otras pestañas y otros sitios.

Colector local `127.0.0.1:47321`: originales JSONL e índice fuera de Git en `%LOCALAPPDATA%\Harmonia\data`; tope 1 GiB con parada y sin borrado. Consulta PowerShell incluida.

## Pruebas

- Parseo y sintaxis de manifiesto/JavaScript: aprobados.
- Revisión visual del panel: aprobada, sin desbordes ni solapamientos observados.
- Prueba sintética Windows: colector online; cinco eventos conservados; reinicio y recuperación aprobados; SHA-256 del original coincidente.

## Estados separados y bloqueo restante

- Código construido: SÍ.
- Paquete colocado y listo para “Cargar descomprimida”: SÍ.
- Extensión cargada en Chrome: NO VERIFICADO.
- Captura real de ChatGPT: NO ENSAYADA.
- Texto transitorio: NO ENSAYADO hasta que aparezca durante una generación real.
- Consulta del episodio por otro hilo mediante Remote Desktop Commander: pendiente de un original real.
- Atención continua del modelo: NO DEMOSTRADA y separada de la captura continua.

La carga de una extensión descomprimida exige la acción humana en la interfaz de Chrome y la selección de la carpeta `extension`; no se sustituyó mediante política, registro ni automatización invasiva. Checkpoint: cargar la carpeta y abrir una conversación de prueba sin datos sensibles; después cotejar extremo a extremo.
