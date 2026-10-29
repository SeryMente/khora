# Crónica de instanciación 01 · Publicabilidad

- **Fecha local:** 2026-10-28, America/Mexico_City.
- **Evento:** PUBLICABILIDAD-BOOTSTRAP-SES-20261028-PR8V6M2Q.
- **Folio:** SES-20261028-PR8V6M2Q. Es una etiqueta del evento; las herramientas no exponen el identificador nativo de esta conversación.
- **Frente:** Publicabilidad.
- **OCP:** docs/frentes/publicabilidad/OBJETO-CANONICO.md, versión PUBLICABILIDAD-v0.1.
- **Repositorio:** SeryMente/khora.
- **Rama de trabajo:** publicabilidad/inauguracion-20261028, creada desde main observado en 595a1db89daa087315ef9844b0d9fc50aa8fc5a6.
- **Estado de titularidad:** sin titular exclusivo asignado; ver CONTROL-RESPONSABILIDAD.json.
- **Autorización disponible:** solicitud directa para inaugurar el frente y propósito dictado por el operador.
- **Alcance ejecutado:** lectura del canon, lectura de la estructura del repo, lectura del proyecto Vercel conectado, revisión de los workflows publicados y documentación de la primera investigación. No se llamó a ninguna herramienta de creación/promoción de deployment; no se modificaron settings de Vercel ni secretos.

## Instrucción y procedencia

El original íntegro del propósito está en [originales/INSTRUCCION-FUNDACIONAL-2026-10-28.txt](../originales/INSTRUCCION-FUNDACIONAL-2026-10-28.txt). La interpretación operativa queda separada en el OCP. No se derivaron reglas normativas nuevas del propósito; se registraron preguntas y opciones de investigación.

## Fuente metodológica

- DUG v358 · NX-358m.
- Metacanon 1.23 · METACANON-OBJETOS-v1.23.
- GOW 2.7.
- Blob normativo observado: 89a28e4d05f5baab9c4b86abdb9fbfc532690c75.
- Fuente: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html
- Revisión manual de las reglas de creación del OCP, persistencia, responsabilidad y no simulación; MCP-NORMATIVO: DESACTIVADO.
- La referencia metodológica es una captura de este evento; debe refrescarse de nuevo al retomar.

## Evidencia inicial

1. Vercel devolvió el equipo “victorhugotorresmendez-8991's projects” con plan Hobby y proyecto khora-web enlazado a SeryMente/khora.
2. El proyecto reportó framework Next.js, Node 24.x, domain khora-web.vercel.app asociado/validado y SSO enabled con all_except_custom_domains. Acceso anónimo queda pendiente.
3. El último deployment productivo observado es dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, READY, creado 2026-10-24T21:59:10.581Z, desde main SHA b528660e16552633d232a2397cbe42441a03438c.
4. El HEAD usado como base de la rama, 595a1db89daa087315ef9844b0d9fc50aa8fc5a6, estaba 81 commits por delante del SHA productivo en la comparación.
5. .github/workflows/deploy-production.yml ya contiene un deploy a producción ejecutado por GitHub Actions. El workflow incluye una migración de runtime antes del build/deploy. La rama main tiene disparador push y workflow_dispatch; no se ejecutó ni se editó desde esta sesión.
6. .github/workflows/post-deploy-smoke.yml prueba khora-ten.vercel.app, mientras el workflow de producción comprueba khora-web.vercel.app. Se registra discrepancia, no una conclusión de cuál URL es la correcta.
7. GitHub mostró varios workflows con resultado failure en unos pocos segundos. Los pasos de job no fueron devueltos y los logs consultados respondieron BlobNotFound. Motivo del fallo: NO DETERMINADO.
8. Vercel MCP dispone de una ruta nativa de creación/inspección de deployments desde esta sesión. La disponibilidad general en cualquier plan/workspace de ChatGPT requiere verificación separada.

## Decisión de aislamiento

El material se ha preparado en una rama separada de main. La rama principal activa el workflow de producción al recibir un push; ese workflow ejecuta una migración y una publicación. No se integró el frente a main durante la investigación para no disparar de forma inadvertida ese proceso productivo. Esto no implica que la rama de investigación ya sea canónica en main; su integración sigue pendiente y debe considerar los efectos de CI, preview de Vercel y deploy automático.

## Pendientes de cierre

- Leer de vuelta cada archivo del frente y verificar el contenido y los hashes reales del commit.
- Diagnosticar la causa del fallo de los workflows con logs de ejecución accesibles.
- Verificar acceso anónimo al dominio productivo, configuración de la rama productiva y quota/Usage actual.
- Resolver el contrato de Hobby personal/no comercial.
- Decidir la autoridad única de publicación y probar el camino seleccionado inicialmente en preview.
