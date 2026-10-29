# Crónica · Ciclo 04 · Ampliación transversal de Publicabilidad

**Fecha local:** 2026-10-29, America/Mexico_City.  
**OCP:** PUBLICABILIDAD-v0.4.  
**Fuente normativa adquirida:** DUG de Ser y Mente v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## Objetivo

Convertir la ampliación expresada por el operador en un marco documental verificable: Publicabilidad debe cubrir la propagación de cambios entre todos los repositorios de SeryMente y las superficies que consumen sus activos, no solo el despliegue de KHORA en Vercel.

## Cambios persistidos

- [Mapa preliminar de dependencias y propagación v0.1](../MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md): cataloga nueve repositorios inicialmente encontrados, sus activos declarados, las rutas de propagación conocidas/candidatas y las brechas.
- [Matriz de escenarios transversales G01–G12](../evidencias/MATRIZ-ESCENARIOS-PROPAGACION-TRANSVERSAL-v0.1.md): cubre gobernanza, KHORA, WordPress/Divi, GitHub Pages/PWA, extensiones, GDP, documentación, plataformas de modelos, propagación parcial, migraciones y fallas CI que puedan reproducirse localmente.
- [Investigación ciclo 04](../evidencias/INVESTIGACION-CICLO-04-2026-10-29.md): registra fuentes, repositorios, estado vivo de GitHub/Vercel, excepción de CI y límites de la lectura.
- [OCP v0.4](../OBJETO-CANONICO.md) y [README del frente](../README.md) actualizados para incluir el alcance transversal.

## Hallazgos de mayor impacto

1. La búsqueda `org:SeryMente` recuperó nueve repositorios, pero la lista se declara inicial y no exhaustiva hasta ser contrastada con la fuente completa del propietario.
2. El operador declara una dependencia estratégica: Otro Gran Programa, como proyecto insignia, necesita KHORA/CoMind y Metodología; las interfaces técnicas concretas siguen pendientes. El repo `SeryMente/otrogranprograma` se identifica como instrumento de comunicación y no se equipara al programa completo.
3. Hay destinos de publicación heterogéneos: Vercel; WordPress/Divi; GitHub Pages con recursos PWA; instalación/puente nativo de extensiones; Apps Script junto con Sheets/Drive y un helper local; superficies de trabajo de modelos.
4. La documentación de GDP indica extensión HF33 y backend HF32/versión 12 con aceptación E2E pendiente: la propagación puede afectar varios targets y no debe declararse completa solo porque uno avanzó.
5. La documentación consultada de Metodología aún enumera versiones anteriores frente al DUG HTML v359 leído en `main`. Se registró como delta de espejo/índice; no se editó el repositorio de Metodología.
6. El run de CI `40900763575` sobre el HEAD previo de la rama falló en 1–2 segundos con tres jobs, `runner_id=0`, runner vacío, `steps=[]` y logs `BlobNotFound`. No hay comando local reproducible en la evidencia actual. La causa raíz permanece **NO DETERMINADA**.
7. Vercel sigue devolviendo como último deployment con `target=production` el `dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH` (SHA `b528660e16552633d232a2397cbe42441a03438c`); el estado `latestDeployment` del proyecto con `target=null` no se equipara a producción.

## Restricciones y límites

- Solo lectura remota y cambios documentales en `publicabilidad/inauguracion-20261028`.
- No se modificó `main`, otro repositorio de SeryMente, código del producto, secretos, configuración de Vercel, WordPress, GitHub Pages, Apps Script o datos externos.
- No hubo deployment, preview, migración, modificación de dominios/SSO/plan ni gasto.
- No se usó Desktop Commander Remote. La autorización operativa del operador permite RDC para fallas GitHub/CI que se puedan reproducir localmente, pero la incidencia actual no expone steps/comandos reproducibles. Cualquier otro uso de RDC requiere aviso previo y autorización expresa.
- El mapa/matriz son provisionales. No se ha verificado la ruta efectiva de publicación de WordPress, las opciones/estado de GitHub Pages, cada equipo con Signal Interpreter, los settings de Apps Script, los destinos de plataformas de modelos, la lista completa de repositorios ni el acceso anónimo a KHORA.
- El control de responsabilidad sigue sin titular exclusivo asignado.

## Secuencia prioritaria

1. Completar el inventario con evidencia del propietario e identificar plataformas externas exactas.
2. Continuar el diagnóstico de GitHub Actions con logs legibles/configuración/estado del servicio; usar RDC solo si hay un repro local concreto.
3. Resolver las compuertas de KHORA antes de publicación productiva.
4. Definir registro por activo: fuente canónica, destinos, versión, mecanismo, autorización, checks, prueba de éxito y recuperación.
5. Investigar rutas de Metodología → plataformas de modelos, WordPress/Divi, GitHub Pages, Signal Interpreter y GDP, sin asumir sincronización.
6. En cada ciclo, actualizar el mapa únicamente con evidencia nueva y comprobar lectura de vuelta de los documentos modificados.
