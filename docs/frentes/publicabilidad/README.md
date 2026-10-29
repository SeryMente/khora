# Publicabilidad

**Objeto Canónico de Persistencia (OCP):** [OBJETO-CANONICO.md](OBJETO-CANONICO.md)  
**Estado:** OCP v0.10; el fixture E2E del grafo está corregido y preservado en [PR #341](https://github.com/SeryMente/khora/pull/341). Validaciones locales: build, checks estáticos, smoke 4/4 y UI Quality 16/16 PASS. CI hospedada sigue sin ejecutar pasos (steps=[]); test:unit local fue bloqueado antes de iniciar y los jobs Python requieren un entorno compatible. Producción bloqueada. Evidencia: [preflight PC-4](evidencias/CI-LOCAL-PREFLIGHT-PC4-2026-10-29.md).  
**Versión del frente:** PUBLICABILIDAD-v0.10  
**Metodología verificada en la revalidación PC-4:** Documento Único de Gobernanza (DUG) de Ser y Mente · Samantha v360 · NX-360m · Metacanon 1.24 · GOW 2.9 · blob `3cda9d38db1bee76ff0ca752f3ecde8719c70d41`.

## Lectura y evidencia

1. [Objeto canónico y estado vivo](OBJETO-CANONICO.md).
2. [Instrucción fundacional literal](originales/INSTRUCCION-FUNDACIONAL-2026-10-28.txt).
3. [Investigación inicial de opciones y límites](evidencias/INVESTIGACION-INICIAL-2026-10-28.md).
4. [Investigación documental del ciclo 03](evidencias/INVESTIGACION-CICLO-03-2026-10-29.md).
5. [Investigación documental del ciclo 04 — alcance transversal](evidencias/INVESTIGACION-CICLO-04-2026-10-29.md).
6. [Mapa de dependencias y propagación transversal v0.1](MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md).
7. [Matriz de escenarios de propagación transversal G01–G12](evidencias/MATRIZ-ESCENARIOS-PROPAGACION-TRANSVERSAL-v0.1.md).
8. [Diagnóstico de viabilidad ChatGPT Free → Vercel](evidencias/DIAGNOSTICO-VIABILIDAD-CHATGPT-FREE-VERCEL-2026-10-29.md).
9. [Diagnóstico transversal billing/Actions](evidencias/DIAGNOSTICO-BLOQUEO-ACTIONS-BILLING-2026-10-29.md).
10. [Preflight de CI local por RDC en PC-14 (histórico; sin tests ejecutados)](evidencias/CI-LOCAL-PREFLIGHT-RDC-2026-10-29.md).
11. [Revalidación del preflight de CI local en PC-4 (sin checkout íntegro ni tests)](evidencias/CI-LOCAL-PREFLIGHT-PC4-2026-10-29.md).
12. [Crónica del ciclo 04 — alcance transversal](cronica/CICLO-04-ALCANCE-TRANSVERSAL.md).
13. [Crónica del ciclo 05 — prioridad ChatGPT Free → Vercel](cronica/CICLO-05-CHATGPT-FREE-VERCEL.md).
14. [Crónica del ciclo 06 — diagnóstico transversal de Actions](cronica/CICLO-06-DIAGNOSTICO-BILLING-ACTIONS.md).
15. [Crónica del ciclo 06 — intento de CI local sustitutiva por RDC](cronica/CICLO-06-CI-LOCAL-RDC.md).
16. [Crónica de instanciación](cronica/PUBLICABILIDAD-INSTANCIACION-01.md).
17. [Control de responsabilidad](CONTROL-RESPONSABILIDAD.json).
18. [Prompt de asistencia](prompts/ASISTENTE.md) y [prompt de construcción](prompts/CONSTRUCTOR.md).

## Alcance de esta primera entrega

Esta rama separa la inauguración documental de cualquier publicación de producción: el workflow de KHORA que escucha cambios en main ejecuta una migración de runtime y un despliegue. La incorporación de este frente a main deberá realizarse solo después de revisar el efecto automatizado de un merge. Esta rama no cambia el producto ni el proyecto de Vercel.


## Prioridad P0 inmediata

Conseguir un flujo reproducible y seguro para cambiar KHORA desde ChatGPT Free y publicar en Vercel sin terminal local. El conector GitHub de ChatGPT es de lectura en la documentación actual, por lo que se contempla un puente manual por GitHub Web; Preview automático se verifica en Vercel. La producción no se habilitará hasta confirmar y resolver el gate de Actions privado, recuperar CI, elegir una autoridad de publicación, reconciliar las migraciones, proteger el flujo de merge y unificar el smoke. El preflight local no sustituye el check-run de GitHub ni valida todavía los tres jobs.

La investigación y decisión de diseño está en [Diagnóstico ChatGPT Free → Vercel](evidencias/DIAGNOSTICO-VIABILIDAD-CHATGPT-FREE-VERCEL-2026-10-29.md). La existencia de un diseño no equivale a que el circuito de producción esté probado.

## Objetivo de la versión 1.0

Definir un sistema verificable de propagación/publicación: por cada activo canónico, identificar destinos directos y dependencias transitivas; documentar la ruta más eficiente que sea elegible, segura y autorizada; definir precondiciones, gates, parada, recuperación y evidencia de consistencia. El PSP de KHORA/Vercel sigue como un subconjunto especializado; la matriz transversal y el mapa de dependencias amplían la cobertura a los otros repositorios y plataformas.


## Matriz preliminar de escenarios

Consulta [la matriz PSP Khora/Vercel v0.2](evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.2.md), conserva [la matriz v0.1 histórica](evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.1.md), y usa el [mapa transversal v0.1](MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md) y la [matriz de propagación G01–G12](evidencias/MATRIZ-ESCENARIOS-PROPAGACION-TRANSVERSAL-v0.1.md). Revisa también las crónicas [ciclo 02](cronica/CICLO-02-PSP.md), [ciclo 03](cronica/CICLO-03-PSP.md) y [ciclo 04](cronica/CICLO-04-ALCANCE-TRANSVERSAL.md). Estos documentos aportan evidencia y escenarios; no sustituyen al OCP.
