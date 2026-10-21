# C053 · Identidad API de Tercer Ámbito y bloqueo legítimo de credenciales

## Objetivo y alcance
Cerrar Crónica personal en Khora → transcripción/archivo privado → revisión de texto exacto para ambos destinos → GitHub Pages → Página Tercer Ámbito. No usar otra captura, no publicar audio, no convertir autorización general en consentimiento del texto concreto. Central conserva promoción única; constructor Chat mantiene su E79 aislado y Takeout su integración propia. Presupuesto adicional cero.

## Evidencia real de identidad, sin secretos
- Lecturas autenticadas Graph v26 (eventos4037/4046): /me/accounts devuelve Tercer Ámbito, id API1354217727781437, tareas CREATE_CONTENT y MANAGE; token de Página /me devuelve200/id/nombre/link coincidentes.
- Link oficial devuelto https://www.facebook.com/1354217727781437 abierto en navegador, redirigió a https://www.facebook.com/profile.php?id=61595788700651# (evento4051). No afirmar IDs iguales ni cambiar destino por parecido de nombre. Metadatos públicos distintos de credenciales.
- Permisos concedidos: pages_show_list, pages_read_engagement, pages_manage_posts. Consentimiento OAuth limitado únicamente Tercer Ámbito, no otras Páginas/futuras. Esto NO es aprobación de una entrada pública ni prueba de entrega.
- Primera credencial transitoria apareció accidentalmente en una salida técnica. Se revocó inmediatamente DELETE /me/permissions con success=true (3991); luego nueva autorización sin imprimir secretos. No instalar la credencial revocada ni copiar su valor al expediente.
- Reinicios del navegador eliminaron pestañas y estado efímero; no afirmar persistencia de tokens. Tras login y código privados4358/4400, Facebook mostró aviso de posible intrusión y cambio de contraseña (4412); no prueba de hackeo confirmado. Operador indicó nuevo login; Inicio autenticado sin aviso4458 y panel Meta4467 verificados.
- Reautenticación específica del secreto de app se abrió realmente4497; formularios privados enviaron valores4521/4548. Meta respondió contraseña incorrecta4534 y4566. Dos rechazos; no repetir el mismo valor, no extraer contraseñas, no evadir seguridad ni cambiar credenciales por iniciativa propia. Clave de app no revelada/instalada; credencial duradera y duración efectivas NO verificadas.

## Corrección causal independiente
El dispatch previo exigía BLOG_META_PAGE_ID público61595788700651; Graph lo rechaza100 mientras devuelve el API1354217727781437. Cambiar SOLO la compuerta de configuración a módulo provider-config: API ID exacto y attestation administrativa explícita, ambos tokens no vacíos; ID público se conserva separado como referencia. No fallback entre IDs, no confianza dinámica en nombres/redirecciones, no env automático ni secreto en retornos.
Preservar auth timingSafeEqual, opt-in BLOG_SYNC_ENABLED, dependencia normativa, consent='approved', blog confirmado antes Facebook, un destino por llamada, verifyIdentity real antes envío y outbox sin reenvío ciego. MetaPage existente es genérico y no se modifica. Test editorial previo sigue comprobando attestation en el módulo real, no por un comentario simulado.

## Pruebas ejecutadas y límites
-19/19 nuevas pruebas,0fallos/0omitidas, ejecutadas con tsx4.19.2 y Node24. TypeScript5.9.3 estricto ES2017/moduleESNext/bundler sobre módulo y prueba nuevos: exit0. No relajar types ni cambiar package/lock del proyecto.
-Cotejo antes/después: baseline route con nueva prueba de uso del gate falla; corregido pasa. Este contraste es del cableado del gate, NO prueba de publicación externa.
-Se probaron identidad API exacta, rechazo del ID público/otros/ausente/espacios, tokens/attestation ausentes, attestation true textual rechazada, retorno boolean sin secretos, invariantes del dispatch.
-No fullbuild Next, regresión editorial íntegra, migraciones, DB, normativa real por envío, token duradero, env, planificador, producción ni publicación real acreditados en C053.805PASS C052 es histórico, no resultado del nuevo parche.

## Bloqueos y checkpoint
1. Meta rechaza la reautenticación para clave de aplicación: intervención humana mínima resolver ese control en Meta, sin pegar secretos al chat. No contraseña/code nuevos pedidos si campo no está listo.
2. Acceso CLI de despliegue central no disponible: listado propio4613 devuelve todos los RDC offline, incluido09357947. Log posterior aporta dispositivo aún Waiting for authorization, sin identity/deviceId final nuevo; código efímero no se persiste. No asumir acceso operativo ni ejecutar en otro equipo.
3. GitHub token dedicado/env/scheduler y primera versión exacta autorizada a ambos destinos siguen sin acreditarse. No activar scheduler a ciegas ni despachar backlog sin consentimiento verificado.
Siguiente: resolver acceso privado/operativo → configurar credenciales de menor alcance solo producción con metadatos no secretos → fullgate candidata con identidad corregida y delta Chat si entregado → promoción única → checks reales autenticados → entrada exacta aprobada → prueba Blog confirmado → Facebook confirmado/permalink. No recrear B2/Takeout ni ampliar permisos/costos.

## Incidencias y prevención
-Node sandbox no contenía playwright pese a frontmatter de entorno: require falló MODULE_NOT_FOUND. No se lanzó navegador nuevo ni se mutó app; se continuó con agent-browser. No afirmar Playwright disponible sin resolver módulo.
-RDC start_process timeout, ejecución desconocida; list_sessions quedó pending. No reintentar operación con efecto ni afirmar transferencia creada/instalada.
-Handles Bash mostraron running tras interrupciones aunque archivos de pruebas ya habían terminado. Se verificaron artefactos y ausencia de proceso, sin reejecutar mutaciones por estado obsoleto.
-Private-input interrumpido por mensaje de otro hilo4507 no fue envío del operador; campos reinspeccionados4513 antes nuevo prompt. No confundir confirmación conversacional con entrada de credencial.

## Instrucciones pertinentes conservadas literalmente
- «Si necesitas que ingrese contraseña en el navegador comaprtiedo, me la puedes pedir.»
- «no he eintroducido nada» y «no me ha saldio ningun prompt para meter algo».
- «Intenta de nuevo ya me loguie aqui».
- «Maldita sea por que no terminas?».
- Directiva recibida vía coordinación: cerrar frentes activos E2E salvo bloqueante, agotar lo independiente/seguro, preservar seguridad/revisiones y entregar checkpoint si bloqueo real. No contiene autorización para saltar controles de Meta o publicar un texto no aprobado.
No se copia narración autobiográfica del operador, contraseñas, códigos, tokens ni querystrings de autenticación.
