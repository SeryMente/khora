# Casos de aceptación · Universo y corpus autobiográfico

Contrato de prueba v0.1. Datos descritos son sintéticos; **casos diseñados, NO EJECUTADOS contra producto**. No reemplazan las pruebas del grafo, Dictado o llavero. Cada ejecución futura debe registrar revisión, entorno, autoridad, entrada protegida, esperado preparado independientemente del extractor, observado, artefactos y juicio auténtico. Ningún secreto real debe entrar en fixtures o trazas.

| ID | Escenario | Resultado esperado falsable |
|---|---|---|
| A01 | Autorreporte de un acto con fuente exacta | Unidad recuperable, modalidad autorreporte, no corroboración fingida |
| A02 | Deseo y condicional en primera persona | No aparece como acto cumplido |
| A03 | Ficción, cita y discurso ajeno | No atribuidos al autor de captura |
| A04 | Audio laboral de interpretación entre dictados | No promovido a biografía/grafo/publicación del operador |
| A05 | Teoría filosófica personal | Marco atribuido, no hecho científico ni clasificación humana impuesta |
| A06 | «Hace años» sin ancla | Tiempo desconocido/intervalo incierto, sin fecha inventada |
| A07 | Hecho antiguo importado hoy y corregido mañana | Fechas separadas; consulta histórica y actual no se confunden |
| A08 | Texto normalizado, emojis y UTF-16 | Ancla se verifica sobre representación/huella correcta o se rechaza |
| A09 | Dos personas homónimas / yo ambiguo | No fusión automática; atribución pendiente visible |
| A10 | Dos canales copian el mismo mensaje | Ocurrencias preservadas; no falsa corroboración independiente |
| A11 | Fuentes independientes discordantes | Conflicto y procedencia visibles, sin mayoría inventada |
| A12 | Fuente revisada tras aceptación | Resultado anterior marcado obsoleto; aprobación no heredada silenciosamente |
| A13 | Misma clave/mismo contenido y luego distinto | Duplicado idempotente y conflicto/revisión, respectivamente |
| A14 | Lote parcialmente fallido o corte tras commit | Recibos por etapa y cobertura reconciliados; no éxito integral falso |
| A15 | Replay tras rechazo humano | Rechazo y actor persisten, sin restituir la propuesta como aceptada |
| A16 | Autoingesta autorizada del original de un propietario | No etiqueta humano ficticio ni permite versión/propietario/corpus curado ajenos |
| A17 | Consulta con grafo/índice/resumen de revisiones incompatibles | Bloqueo o alcance degradado explícito, no suficiencia falsa |
| A18 | Otro propietario conoce un identificador | No acceso por fuente, grafo, búsqueda, resumen, caché, exportación o API |
| A19 | Captura permitida, publicación no concedida | Guardado privado; ninguna salida pública automática |
| A20 | GPS/red no disponible o permiso denegado | Ausencia calificada; no dato inventado ni bloqueo injustificado del autorreporte |
| A21 | Windows compartido con usuario no controlado | No identidad deducida; riesgo local declarado; no promesa frente al administrador |
| A22 | Enlace expira/redirige a destino interno/archivo malicioso | Rechazo seguro; sin credenciales en trazas, sin rutas arbitrarias ni ejecución |
| A23 | Archivo contiene instrucciones al modelo | Se tratan como contenido no confiable, no órdenes ni concesión de permisos |
| A24 | Secreto/trauma/tercero íntimo en candidato | Contención y exclusión de autenticación/publicación; no copiado a repositorio |
| A25 | Atacante obtiene todo corpus y proyecciones públicas | No puede desbloquear/recuperar claves solo con esa información; si puede, falla |
| A26 | Retirada durante análisis o publicación pendiente | Trabajos/lecturas afectados detenidos; no entrega de derivado revocado |
| A27 | Borrado y posterior restauración de copia | Dependencias retiradas no reaparecen; residuos/plazos declarados, sin falso borrado total |
| A28 | Exportar y recuperar lote temporal | Fuentes/juicios/permisos/cobertura conservados; vencimiento no crea conservación indefinida |
| A29 | Resumen omite una idea rara o condición esencial | Falla recuperación fiel aunque métricas topológicas sean verdes |
| A30 | Telemetría o fixture sintético contiene un yo | No promoción a biografía real ni evidencia de producción |
| A31 | Audio almacenado en proveedor distinto | Mismo owner/manifest/huella y privacidad; ni publicación ni eliminación inferidas |
| A32 | Corpus parcial y pregunta exhaustiva | Respuesta delimita cobertura, pendientes y abstención; no «toda tu vida» |

## Recibo documental de este ciclo

Se revisó por lectura la correspondencia de estos casos con los requisitos y se comprobaron estructura, enlaces relativos, serialización del manifiesto y límites del paquete de documentación. No se ejecutaron escenarios A01–A32 en servicios, redes, bases de datos o dispositivos. Sus estados funcionales siguen **NO EJECUTADO**; no hay puntuación ni porcentaje de conformidad del producto.
