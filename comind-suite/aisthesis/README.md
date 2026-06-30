# Aisthesis (Halcon)

Extension Chrome MV3 de la suite **CoMind / Kosmos**. Capa de *percepcion*
(Aisthesis): captura minutos y llamadas de Globo y los reporta a Notion en vivo.

## Procedencia (real, sin simulacion)
- Motor: **Globo Scraper v3.32** (fuente real), reubicado en `engine/`.
- Identidad nueva: se elimino el `key` del manifest -> Chrome asigna un ID
  fresco, por lo que Aisthesis se instala **al lado** de la extension Globo
  viva sin reemplazarla ("no apagar lo que paga la renta").
- `modules/caza`: placeholder documentado; pendiente de su fuente real.

## Instalar (load unpacked)
1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador** (arriba a la derecha).
3. **Cargar descomprimida** -> selecciona esta carpeta `aisthesis/`.
4. Abre Opciones para configurar token de Notion y DB de llamadas.

## Native messaging (AHK)
Los hotkeys (Alt+Shift+V/A/R) usan el host nativo en `native/`. Registra el
host segun tu SO si necesitas las acciones de llamada.

Version: 0.1.0
