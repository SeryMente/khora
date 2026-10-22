# Harmonia · UX, métricas y protocolo de rendimiento candidato

**Estado:** PROPUESTA DE FASE NO ESENCIAL · NO IMPLEMENTADA · NO ES UNA POLÍTICA VIGENTE  
**Frente:** Harmonia · Folio de sesión: `SES-20261021-F8R3M6Q2`  
**Precondición:** primera entrega E2E esencial aceptada antes de medir/optimizar rendimiento

## 1. Objetivo y secuencia

Esta propuesta organiza mejoras no esenciales de UX y observabilidad avanzada, y especifica cómo evaluar rendimiento más adelante. No autoriza cambiar el contrato de captura, la privacidad, la retención, los permisos ni la arquitectura actual.

Secuencia:
1. Aceptar primero la funcionalidad E2E esencial.
2. Incorporar ajustes de UX que no modifiquen la captura ni la semántica de los datos.
3. Obtener una línea base de uso medida en un entorno repetible.
4. Proponer y ejecutar optimizaciones individualmente, conservando una referencia de cobertura y pudiendo revertir el cambio.
5. Aceptar una optimización solo si el rendimiento mejora y la integridad de captura no empeora.

## 2. Refinamientos UX candidatos

- Distinguir visualmente `catalogado/documentado`, `observado naturalmente`, `explorando`, `completo`, `sin catálogo`, `colector desconectado`, `error de sincronización` y `versión desactualizada`. No condensarlos en un único porcentaje ambiguo.
- Aclarar que el índice combinado mide mapeo (documentación + observación), **no precisión de captura**, porcentaje de conversaciones cubiertas ni garantía de exhaustividad.
- Mostrar la razón de cada región sin catálogo o incompleta, las capacidades faltantes y la versión/fecha del catálogo utilizado.
- Mostrar de manera explícita qué dato viene de un evento real, de documentación revisada o de un estado sintético de prueba.
- Accesibilidad: navegación por teclado, foco visible, controles con nombres accesibles, estados anunciados sin repeticiones excesivas y diseño legible con zoom.
- En el estado de sincronización, separar revisión local, revisión remota consultada, catálogo, fecha del último éxito y error actual. No presentar el commit de `main` como código instalado.
- El panel puede ampliar los diagnósticos operativos sin exponer texto de conversación, credenciales, rutas sensibles ni valores de campos.

Estas mejoras no deben cambiar el significado de los contadores ni encubrir estados de error.

## 3. Contrato candidato para métricas avanzadas

### 3.1 Captura e integridad

- Eventos recibidos/confirmados, reintentos, fallos de envío y duplicados idempotentes.
- Deltas visibles recibidos, fragmentos por mensaje, mensajes completados y límites/truncamientos explícitos.
- Avistamientos estructurales, huellas únicas, reusos, colas pendientes y barridos descartados por política.
- Sesiones por pestaña, cambios de región y cambios de líder estructural.
- Integridad del índice: eventos JSONL aceptados, último hash, recuperación tras reinicio y consistencia entre índices y archivos.

### 3.2 Latencia

Medir por etapa, con relojes y límites explícitos:
- mutación observada → detección;
- detección → emisión de evento;
- emisión → acuse del colector;
- persistencia → índice consultable;
- actualización del estado del dashboard.

Informar percentiles p50/p95/p99, conteo de muestras y distribución; no inferir latencia de extremo a extremo a partir de una sola etapa.

### 3.3 Recursos

- CPU del proceso de Chrome/extension y proceso del colector, distinguiendo fuentes y método de medida.
- RAM y tendencia durante una ventana fija.
- Bytes escritos/leídos, frecuencia de persistencia e incremento del almacén.
- Número de pestañas, regiones activas, eventos por minuto y volumen de texto visible capturado.

No recolectar más datos de contenido solo para generar métricas. Preferir contadores agregados y no enviar telemetría a un servicio externo.

## 4. Protocolo de línea base y optimización — solo después de la aceptación E2E

### 4.1 Preparar una referencia

- Elegir un entorno de prueba autorizado y documentar sistema, versiones, catálogo, colector, perfil de Chrome y número de pestañas.
- Usar un corpus controlado con eventos esperados explícitos: texto del usuario, reemplazo inicial, varios deltas, respuesta final, nueva respuesta, errores, scans, superficies repetidas y navegación/cierre.
- Repetir cada caso bajo el mismo perfil; registrar el estado inicial del almacén y los hashes del código.
- Medir por separado una pestaña, varias pestañas y un caso prolongado. No comparar corridas con diferente cobertura o corpus sin normalizar.

### 4.2 Métricas de calidad que actúan como compuertas

- Cero pérdida de eventos esperados del corpus.
- Cero duplicados de contenido causados por reintentos; los reintentos deben ser idempotentes y los avistamientos conservados.
- Orden íntegro de fragmentos y hash final coherente por mensaje.
- Separación entre conversaciones/pestañas, incluso cuando compartan la misma región.
- Igualdad de las capacidades observadas y de los estados regionales entre referencia y candidato, salvo diferencias documentadas y aprobadas.
- Sin captura de borradores, valores de campos ni razonamiento oculto.
- Persistencia y recuperación tras reinicio correctas.

Una optimización que incumpla cualquiera de estas compuertas no se acepta aunque reduzca CPU o RAM.

### 4.3 Probar una optimización por vez

1. Describir hipótesis medible, operación alterada y riesgo de cobertura.
2. Capturar resultados de referencia.
3. Cambiar un único mecanismo.
4. Repetir el mismo corpus y carga.
5. Comparar recursos, latencia, pérdida/deduplicación, orden de deltas y cobertura.
6. Aceptar solo con evidencia reproducible; conservar rollback y métricas antes/después.

No realizar una campaña de optimizaciones simultáneas porque impediría atribuir el resultado y regresiones.

## 5. Políticas de retención y costes — decisión pendiente

Antes de proponer retención, cuotas o compactación por antigüedad se requiere:
- inventario del dato que se conserva;
- propósito y necesidad de cada clase;
- consecuencias de borrar originales y posibilidad de reconstruir índices;
- capacidad máxima verificada, comportamiento al alcanzar la cuota y recuperación;
- reglas aprobadas para exportar, borrar o preservar datos.
 
Esta propuesta no fija un periodo de retención ni autoriza eliminación automática. El comportamiento actual de parada ante cuota se mantiene hasta que exista una decisión explícita y pruebas de recuperación.

## 6. Dependencias externas

Los fallos de Vercel/Netlify de preview para repositorio privado/plan Hobby se documentan aparte. No son métricas del capturador, no determinan su cobertura y no justifican hacer público el repositorio, cambiar facturación o activar producción sin una decisión independiente.

## 7. Criterios de salida de esta fase futura

- UX revisada con evidencia de accesibilidad y claridad semántica.
- Definiciones/versiones de métricas, fuentes, muestras y límites documentados.
- Línea base repetible después del E2E aceptado.
- Cada optimización acompañada de comparación antes/después, pruebas de integridad y rollback.
- Ninguna regresión de cobertura, privacidad, orden de eventos, persistencia ni coordinación multi-pestaña.

**Estado actual:** solo se crea la propuesta documental en la rama revisable. No se implementaron estos cambios ni se ejecutaron mediciones de rendimiento. La optimización continúa diferida hasta que la primera entrega E2E sea aceptada.

## 8. Primer refinamiento UX implementado en la candidata

En la rama revisable se añadió al dashboard una guía accesible y desplegable que explica la semántica de:
- índice combinado/documentación versus precisión de captura;
- superficies únicas versus cantidad de barridos;
- completitud regional versus región sin catálogo;
- revisión remota consultada versus código realmente instalado.

La guía usa `<details>/<summary>` nativos, sin JavaScript adicional para expandir/contraer, y un estilo de foco visible por teclado. El validador estático ahora exige que la guía y el texto que evita confundir mapeo con precisión permanezcan en el HTML.

Huellas verificadas por lectura de vuelta:
- `extension/dashboard.html`: `ea8cdd453b98780bbc8928b1fc0ecf42148b7bcd`.
- `extension/dashboard.css`: `19c50217f6f8b3f5a36ba00bf4164412433006d9`.
- `scripts/validate-source.js`: `4b8101cb57751738d84aa43e0acc86fa8ec40c6b`.

Esta es una mejora UX documental y de presentación de bajo riesgo; no altera el contrato de captura, no añade telemetría, no cambia permisos ni implementa la política de métricas propuesta. El renderizado y la accesibilidad deben verificarse en Chrome al desbloquear E2E. El resto de la propuesta continúa pendiente; no se han tomado mediciones de rendimiento ni se han ejecutado optimizaciones.
