# Dictado · Benchmark, uso real y retroalimentación

> Contrato técnico materializado; el estado único y el cierre posterior están en el objeto canónico. Las rutas de código se interpretan desde `khora-web/`. Las verificaciones históricas se conservan, no acreditan frescura futura.

**Estado:** implementación revisable; ejecución, despliegue y persistencia productiva se acreditan en la crónica del sprint, no por este encabezado. Primera versión del protocolo: `dictado-experience/v1`.
**Continuidad:** [objeto canónico del frente](OBJETO-CANONICO.md). Esta guía describe el contrato de la función; no reemplaza la crónica ni crea otro tablero de estado.

## Propósito

Mejorar el dictado hecho a medida: conservar lo capturado y permitir observar una transcripción agradable, estimulante y no distractora. Una medición técnica satisfactoria no demuestra comodidad. La opinión positiva tiene valor propio; no se evalúa únicamente ausencia de molestia. La primera integración es dictado; los registros identifican la función para evitar mezclar experiencias de capacidades distintas. No se añade una plataforma clínica ni se realizan diagnósticos.

## Acceso y operación

En `/sistema/ingreso?modo=dictado`, después de los controles actuales, **Calidad del dictado** abre la información bajo demanda y **Dar opinión** abre una valoración voluntaria. El panel no cambia el área de captura, no reclama foco ni emite sonido. Captura, edición, archivo y transcripción bloquean el formulario mientras están activas. No hay avisos aleatorios fuera de uso.

La recopilación nueva y las encuestas son **opcionales y desactivadas inicialmente** hasta activar su casilla. Esto no modifica los registros operativos de diagnóstico que ya existían. La preferencia y los topes se conservan en este navegador por perfil autenticado; no son un consentimiento universal para todos los dispositivos. No se promete un tope global entre dispositivos o pestañas concurrentes.

La encuesta permite valoración, motivo opcional y **comentario libre adicional opcional de hasta 1000 caracteres**; también admite comentario sin valoración. Omitir no envía el comentario. Los borradores son solo memoria de la pantalla: no se guardan en localStorage, eventos técnicos ni repositorio. Al cerrar/recargar pueden perderse. Un fallo de entrega conserva el formulario abierto y no presenta éxito; repetir un mismo envío reutiliza su identificador. Editar el contenido prepara otro envío.

## Tres fuentes, sin mezclarlas

1. **Benchmark reproducible:** regresiones y contratos deterministas, artefacto versionado `lib/generated/dictado-benchmark.json`. Estado inicial `not_run`; no se muestran pruebas inventadas. El script registra también fallos, fecha, commit probado y huella de entradas. El commit probado puede ser anterior al que incorpora solo la evidencia; se muestra explícitamente, sin afirmar identidad automática con la versión publicada.
2. **Uso real:** resúmenes de sesiones terminadas y oportunidades de medición. Las sesiones sin final verificable y los periodos sin entrega quedan fuera de la cobertura observada: no se convierten en sesiones satisfactorias.
3. **Experiencia declarada:** respuestas a invitación muestreada separadas de opiniones voluntarias. No calcular una media numérica sobre las etiquetas ordinales ni sumar ambas fuentes como si tuvieran igual selección.

La vista muestra estas limitaciones junto a los resultados. El acceso privado/exportación contiene los registros para auditar el cálculo; un JSON técnicamente vacío no demuestra que todo el uso real haya sido observado.

## Indicadores y definiciones

| Indicador | Qué se implementa | Qué no acredita |
|---|---|---|
| Conservación | Comprobaciones locales del prefijo confirmado después de editar, frente al texto realmente renderizado tras un resultado; contador de comprobaciones y de alteraciones | No verifica cada palabra reconocida, todo el documento ni una pérdida al detener. Cero alteraciones con cero comprobaciones es falta de cobertura. Varias observaciones del mismo fallo no son incidentes independientes |
| Fidelidad | Estado explícito «no medida sin referencia»; motivo de opinión «reconocimiento» | No deducir tasa de error del número de ediciones ni inventar referencia vocal |
| Respuesta | Hasta 100 muestras por sesión de recepción a oportunidad de pintado visible, con mediana y percentil 95; datos de arranque a primer resultado y reanudación listos para inspección/exportación | Dos requestAnimationFrame no son una medición fotométrica. El inicio→primer resultado incluye silencio; nunca llamarlo latencia desde la voz. Pestaña oculta excluida |
| Estabilidad visual | Estado de cobertura incompleta; motivo de opinión de saltos/cambios y guardia del contenido estable | No acredita detección completa de desplazamiento, cursor o parpadeo. La revisión normal del provisional no se etiqueta como defecto |
| Experiencia | Agradable/estimulante, neutra, molesta/distractora; conteos de respuesta e invitaciones, fuente conservada | No es escala psicométrica validada, estado de ánimo clínico ni causalidad demostrada |

Mediana y percentil 95 usan rango más próximo, no interpolación. Se muestran unidades y número de muestras. No se fijan metas arbitrarias de velocidad antes de una línea base. No hay puntuación global opaca.

## Muestreo inicial

Política piloto, ajustable con evidencia; no se presenta como diseño estadísticamente óptimo:

- Sesión terminada de al menos 60 segundos: elección criptográfica con probabilidad base 0,25, solo si no se alcanzó el tope.
- Hasta dos invitaciones por día local y dos horas entre invitaciones **en este perfil/navegador**.
- Mostrar después de terminar operaciones y nunca durante dictado/edición. No enfocar automáticamente. La valoración queda ligada al identificador de la sesión elegida aunque se oculte temporalmente durante otra operación.
- Registrar elegibilidad, selección/no selección, exclusión por tope, presentación y omisión. La respuesta conserva `source=sampled` o `source=voluntary`.
- Los topes y la oportunidad de presentación alteran la selección efectiva. Registrar la probabilidad base no basta para afirmar representatividad. Las sesiones abandonadas/cerradas abruptamente no reciben automáticamente encuesta; explicitar ese sesgo.
- Registrar comentarios sin valoración por separado; la ausencia de respuesta no equivale a neutralidad.

Referencia metodológica de preparación: [Tay y Uy, Capturing and Measuring Experiences in Everyday Life](https://www.purdue.edu/research/mcap/wp-content/uploads/2026/03/Tay-S20.pdf). Se toma el principio de muestreo ligado al evento y carga de participación, no una validación científica de esta frecuencia o pregunta.

## Contrato y privacidad

`lib/contracts/dictado-experience.ts` es la fuente ejecutable para validación y cálculo. Tipos cerrados: `session`, `invitation`, `feedback`. UUID de registro y sesión, función fija `dictado`, versión del protocolo y marcador de release cliente o null. El servidor registra separadamente su release disponible. Un release declarado por el cliente es atribución, no prueba criptográfica.

La medición no transmite texto dictado, audio, pulsaciones, selección textual, credenciales ni diagnósticos. La comparación de contenido permanece en memoria local: solo sale su resultado agregado. El comentario que el usuario **elige enviar** sí es texto privado y viaja exclusivamente por el endpoint propio de experiencia; no por `/api/eventos`, consola o telemetría general.

- Endpoint: `/api/dictado-experience`; GET consulta/exporta, POST guarda, DELETE borra únicamente datos del propietario actual de esta función.
- Autenticación real NextAuth; sin atajo de pruebas en producción. Propietario derivado exclusivamente de identidad de sesión y HMAC con AUTH_SECRET, no de un identificador que el cliente pueda elegir.
- Mutaciones requieren mismo origen y coincidencia de clave opaca del perfil consultado; bloquea enviar un borrador a una cuenta distinta tras cambio de sesión.
- `Cache-Control: private, no-store`, sin respuestas sensibles en logs. React muestra comentarios como texto, no HTML.
- Comentarios cifrados con el mecanismo AES-256-GCM existente `cifrarTexto`, antes de persistir. Sin X_KHORA_KEY válido se rechaza el envío que contenga comentario: nunca fallback en claro. Esto es cifrado de servidor, **no cifrado de extremo a extremo**; la aplicación autorizada puede descifrarlos.
- Nunca mandar opiniones automáticamente a un modelo ni tratarlas como autorización para cambiar producto.

## Persistencia y mantenimiento

Tabla aditiva `khora_function_experience`; inicialización idempotente al primer acceso autenticado, sin alterar `eventos_sistema` ni tablas existentes. Usa el Postgres configurado por DATABASE_URL y la clave de cifrado ya existente. La función no imprime ni modifica secretos. Si el rol no puede crear la tabla, responde indisponible hasta ejecutar el DDL revisado con un rol autorizado; no fingir almacenamiento disponible.

Clave primaria `(owner_key, record_id)` y consultas/borrado filtrados por `owner_key`. El comentario se guarda solo en `comment_encrypted`; payload tiene comentario vacío. MAC de contenido con secreto para distinguir reintento idéntico de conflicto. Límite operativo de 500 registros por propietario en ventana de 24 horas; no es un rate limiter distribuido estricto frente a carreras concurrentes.

Ventana de consulta de **90 días**; purga física de registros caducados del propietario al consultar. No hay trabajo periódico añadido: usuarios que no regresen pueden conservar filas más allá del plazo. Para garantizar borrado físico a plazo fijo se requiere un job aprobado. La interfaz declara esta diferencia. Exportación/borrado disponibles sin borrar capturas ni auditoría. Rotar AUTH_SECRET puede cambiar claves de propietario; planificar migración antes de hacerlo, igual que la gestión vigente de claves de cifrado. No se rota ninguna clave aquí.

Máximo de lectura: 5000 registros, con señal `truncated` si existe uno adicional. No presentar cobertura completa si se alcanza ese tope. Reintentos automáticos de métricas pendientes usan identificador estable; cola limitada a memoria de pantalla en esta versión: cierre/recarga puede perderlos, y esa limitación permanece visible en documentación. No reutilizar `sendBeacon=true` como prueba de persistencia.

## Reproducción del benchmark

Desde `khora-web`, Node y dependencias del lockfile instalados:

```sh
node scripts/benchmark-dictado.mjs
```

El script ejecuta unitarias dirigidas y Playwright de continuidad/encuesta; escribe logs de cada fase y el artefacto incluso si el resultado es rojo. El harness de navegador usa los mecanismos existentes de entorno de pruebas: no trasladarlos al despliegue. Primer arranque requiere Chromium disponible para Playwright. Las entradas de huella incluyen componente, panel, contrato, almacenamiento, ruta y las pruebas. Si cambia una entrada, repetir. No sobrescribir un benchmark antiguo verde con una afirmación manual de que sigue vigente.

Después: typecheck, build, ui-review:check, ui:contract y suite general. Fallos preexistentes se comprueban contra la base actual, no por memoria. Pruebas nuevas: selección/topes, comentario solo, límites, rechazo de campos extra, propietario, cifrado real con clave sintética, duplicado/conflicto y consultas SQL con doble de base. E2E: teclado real automatizado, vacío/omisión, fallo de entrega y estados sin datos, más continuidad previa de dictado.

**Límites:** dobles de reconocimiento, auth/HTTP/SQL de prueba donde se indique. Estas pruebas no certifican proveedor de voz real, criptografía del servicio autenticado, identidad OIDC real o persistencia productiva. Esas verificaciones se registran aparte. No declarar el objetivo completo por pasar compilación o por un HTTP 200.

## Despliegue, comprobación y reversión

Revisar diff y pruebas, fusionar únicamente el alcance autorizado, construir de la revisión exacta y desplegar sin credenciales/modos de pruebas. Mostrar el último benchmark con su commit probado, no solo un semáforo. Comprobar marcador del commit publicado, ruta funcional autenticada, escritura y lectura de una opinión sintética autorizada y resumen de una sesión real. Verificar que otro propietario no la ve. No borrar registros reales para probar.

Reversión de código: redeploy de la revisión anterior conocida. La tabla nueva es aditiva y no altera capturas; conservar filas privadas para diagnóstico. Nunca ejecutar DROP TABLE automáticamente. Ante fallo, desactivar recopilación desde la preferencia y conservar evidencia saneada en el objeto canónico.


## Verificación ejecutada · 2026-10-16

Sobre `185f09bbe6230731b1cf6ad1bf07bfbb812a0c6d`: 402/402 pruebas unitarias; 20 comprobaciones dirigidas incluidas en el benchmark; 14 pruebas de navegador (9 continuidad + 5 encuesta). Compilación Next, typecheck, ui-review:check y ui:contract satisfactorios. La encuesta muestreada espera a que termine el dictado, no toma foco y no manda el comentario dentro de las métricas. Los endpoints externos y reconocimiento están controlados; esto NO prueba voz física ni persistencia productiva. El JSON generado guarda fecha, SHA e identificador de entradas probadas; SHA del benchmark puede preceder al commit que incorpora ese mismo informe.

La descarga local de configuración Vercel no permitió validar la conexión SQL ni la clave de cifrado; no se deduce que falten necesariamente en ejecución remota. Antes de promover dominio, la candidata debe ejecutar `KHORA_EXPERIENCE_VERIFY_STORAGE=1`: prebuild prueba escritura, cifrado en reposo, lectura descifrada y borrado bajo un propietario sintético aleatorio, sin leer filas de usuarios. La compuerta falla cerrada y no imprime secretos. Solo añade la tabla de esta función. No cambia ni rota ninguna clave. Si falla, se conserva el dominio público anterior y se documenta el bloqueo. Sin la bandera, prebuild no accede a almacenamiento.


## Cierre de verificación de candidata · 2026-10-16

Código probado `11fde5a7da7aec46b9873103ddf13213ba1c6c4f`: benchmark aprobado, 15 pruebas de navegador; suite unitaria, tipos, ui-review:check y ui:contract con salida 0. Se añadió regresión de cambio de perfil: se reinician consentimiento, borrador, muestra y sesión de métricas; 401 invalida el informe anterior.

Candidata Vercel `khora-6zly05101-victorhugotorresmendez-8991s-projects.vercel.app`, sin promover dominio: build productivo real correcto y compuerta `EXPERIENCE_STORAGE_PREFLIGHT=passed write+cipher+read+delete (synthetic owner only)`. Verificados SQL real, comentario cifrado en reposo (payload sin texto), lectura descifrada y borrado de filas sintéticas. No hubo sustitución de claves. Esto resuelve el falso negativo de configuración descargada, NO valida todavía sesión humana ni micrófono físico.

El proyecto Vercel usa un Build Command propio que no invoca npm prebuild. Para esta candidata se pasó configuración local temporal que antepone la compuerta y conserva después la secuencia existente de migración runtime + `next build --webpack`. No se modificó la configuración permanente del proyecto ni infraestructura del Entorno Persistente. La publicación final debe exportar main exacto, generar la procedencia y acreditar el alias; no promover esta candidata de rama como si fuese main.

### Controles externos no ejecutados
GitHub Actions, ejecución 38967613218, no inició trabajos: `The job was not started because recent account payments have failed or your spending limit needs to be increased.` Los estados Vercel de integración GitHub también señalan restricción de repositorio privado de organización en plan Hobby. No se modifican facturación, plan, visibilidad, permisos ni protecciones. Las comprobaciones ejecutadas directamente y el build Vercel son evidencia independiente, no equivalencia a Actions verde. La integración solo puede usar merge normal, sin anulación administrativa de controles.
