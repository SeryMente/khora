# Archivo de Arquitectura - Extension v2 (Harmonia)
https://app.notion.com/p/37a05ba4eb3a41a8879797d33691aaac

## Auditoría de Módulos (Solo Lectura)

La extensión `Harmonia` (originalmente referenciada como `Aisthesis`) opera bajo una arquitectura de "sombrilla" (shell) donde cada integración es un módulo independiente que se "enchufa" en el Service Worker raíz (`shell.sw.js`).

### Core (`khora-web/extension/harmonia/core/`)
- El núcleo (`shell.sw.js`) importa `registry.js`, el cual es la fuente de verdad de todos los módulos.
- Se encarga de cargar asíncronamente los scripts de *background* de los módulos habilitados usando `importScripts`.
- Mantiene un estado compartido en memoria (`self.AISTHESIS_CFG`) que se sincroniza con `chrome.storage.local`, aislando los secretos para que no se hardcodeen en el código.

### Módulo: Globo (`khora-web/extension/harmonia/modules/globo/`)
- Módulo motor REAL y actualmente activo (v3.34).
- Se encarga de capturar llamadas de `Globo` hacia `Notion`.
- Usa inyección de código mediante content scripts configurados tanto en el contexto aislado de la extensión (`modules/globo/content.js`) como en el contexto de la página principal (MAIN world: `modules/globo/mainworld.js` y `booster.js`).
- Requiere de permisos de host para `globohq.com` y `api.notion.com`.

### Módulo: Caza (Cazagangas) (`khora-web/extension/harmonia/modules/caza/`)
- Módulo inactivo a la espera de fuente real.
- Contiene un puerto fiel de un sistema más amplio de "cazagangas" con un conjunto extensivo de scripts (27 archivos, por ejemplo, scripts de cosecha auto, telemetría, celular).
- Su manifiesto `module.json` indica que su foco está en Facebook Marketplace y `api.notion.com`, usando cookies y un "cerebro" (`runtime.html`) que se expone a la sombrilla.

### Integridad (`integrity.json`)
- Mantiene los hashes SHA-256 de todos los archivos estáticos bajo el control de la extensión, garantizando una defensa contra modificaciones de la extensión en disco.

---

## Contrato de Integración Unificado (Propuesta)

Para repensar la arquitectura y generalizar `module.json`, proponemos el siguiente contrato (inspirado en el `MODULE-CONTRACT.md` actual):

```typescript
// Un contrato formal para que el núcleo valide las integraciones
export interface IModuleManifest {
  id: string; // Ej. "todoist"
  name: string; // Ej. "Integración con Todoist"
  version: string;
  enabled: boolean;

  // Script de background a inyectar (relativo a la raíz de la extensión)
  background?: string;

  // Archivos de UI (Ajustes de la integración)
  panel?: string;

  // Secretos o configuraciones que el shell debe proveer (ej. "TODOIST_API_TOKEN")
  settings: string[];

  // Configuración para Content Scripts
  content?: {
    matches: string[];
    js: string[];
    run_at?: "document_idle" | "document_start" | "document_end";
    world?: "ISOLATED" | "MAIN";
  }[];

  // Permisos y permisos de host requeridos (Delegados al manifest.json raíz)
  hostPermissions?: string[];
  permissions?: string[];
}
```

### Ejemplo: Hipotético módulo Todoist
Un módulo para capturar tareas del panel de Todoist y sincronizarlas:

```json
{
  "id": "todoist_sync",
  "name": "Sincronizador Todoist",
  "version": "1.0.0",
  "enabled": true,
  "background": "modules/todoist/background.js",
  "content": [
    {
      "matches": ["https://todoist.com/app/*"],
      "js": ["modules/todoist/content.js"],
      "run_at": "document_idle"
    }
  ],
  "hostPermissions": ["https://todoist.com/*", "https://api.todoist.com/*"],
  "settings": ["TODOIST_API_TOKEN"],
  "panel": "modules/todoist/options.html"
}
```

---

## Decisiones que requieren al operador

a) **Destino auditable telemetría:** ¿Qué plataforma se usará para registrar y auditar los eventos de telemetría emitidos por los módulos bajo la interfaz canónica? ¿Logos, Elasticsearch, Vercel Axiom?
b) **Coordinación de módulo Todoist con el mirror externo:** ¿Cómo manejará el módulo los conflictos de concurrencia cuando la fuente de datos modifique el mirror al mismo tiempo que la extensión actúa sobre la web?
c) **Alcance real de Prisma:** ¿Debe el backend Prisma validar los esquemas que envíe la extensión, o la extensión hablará directamente a servicios de terceros sin pasar por un servidor intermediario de CoMind?