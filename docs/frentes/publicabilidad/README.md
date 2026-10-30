# Publicabilidad · KHORA main → producción Vercel

**Estado del frente:** escenario ordinario documentado en [PROTOCOLO-PUBLICACION-MAIN-CHATGPT-VERCEL-001.md](PROTOCOLO-PUBLICACION-MAIN-CHATGPT-VERCEL-001.md).  
**OCP:** [OBJETO-CANONICO.md](OBJETO-CANONICO.md), v0.11.  
**Alcance actual:** publicar el SHA vigente de SeryMente/khora:main en el proyecto y dominio canónicos de Vercel desde ChatGPT. El operador decide qué se fusiona en main; este frente no reevalúa ni limita el número de commits incorporados.

## Camino cotidiano

ChatGPT lee el SHA exacto de main, valida que no exista ya un deployment equivalente ni otro publicador activo para ese SHA y llama al conector Vercel para crear un deployment desde GitHub con target production. Vercel construye desde el SHA fijado y asigna los alias de producción. ChatGPT espera el estado final y coteja SHA, proyecto, destino, alias y respuesta del dominio canónico.

**No hay Preview, promoción posterior, CLI local, RDC, Work, Deploy Hook ni copia de secretos.** El protocolo contiene los pasos, las condiciones de parada y el fallback seguro.

## Estado comprobado al escribir esta revisión

- Metodología: DUG v362 · NX-362m; Metacanon 1.24; GOW 2.11; blob cbf549d5e36c044d1e908228944f00ae911cdda4.
- main observado: a515d653a6822c1c7aa695617bb38824b3aa4572.
- Vercel team: victorhugotorresmendez-8991s-projects; plan observado: Hobby.
- Proyecto: khora-web; ID prj_hRN86BKITXYKTnNlp0ygVhaMwFfx.
- Dominio de producción asociado y verificado: khora-web.vercel.app.
- Último deployment productivo leído: dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH, READY, SHA b528660e16552633d232a2397cbe42441a03438c.
- El conector Vercel de esta sesión pudo obtener fuente privada de GitHub y construir un deployment Preview para un SHA exacto. **La llamada con target production aún no se ha ejecutado; el primer uso real requiere una instrucción explícita de publicación.**
- GitHub Actions seguía concluyendo sus jobs antes de ejecutar steps. La causa raíz del runner no está demostrada.
- El proyecto conserva un workflow Deploy to Production disparado al hacer push a main; por ello el protocolo inspecciona concurrencia y deployments existentes antes de crear uno desde ChatGPT.

## Archivos del frente

- [Protocolo ordinario](PROTOCOLO-PUBLICACION-MAIN-CHATGPT-VERCEL-001.md)
- [Control de responsabilidad](CONTROL-RESPONSABILIDAD.json)

Los antecedentes completos y escenarios no ordinarios permanecen en la rama histórica [publicabilidad/inauguracion-20261028](https://github.com/SeryMente/khora/tree/publicabilidad/inauguracion-20261028/docs/frentes/publicabilidad). Esa rama está divergida de main y **no debe fusionarse en bloque**; esta rama nueva nació de main para aislar la documentación cotidiana.

## Fuera del alcance de esta primera entrega

Diagnóstico completo de Actions/billing, recuperación local de CI, rollback, timeout ambiguo, build fallido tras migraciones, cuota Hobby, cambio de proveedor, DNS/SSO, y escenarios de publicación desde otras plataformas. Se documentarán aparte después de estabilizar el caso normal.
