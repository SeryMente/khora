# Observabilidad del trabajo con IA · propuesta de construcción 01

Estado: propuesta NO APROBADA. Pertenece a Harmonia; alcance conceptual cualquier plataforma, primer destino únicamente ChatGPT en Google Chrome. No implementación ni integración de otras plataformas. Fuente: orden actual del operador y aclaración de Metodología 2, enviada desde session://ecea4187-8241-819b-af83-0003b7c205f7/3ffa4187-8241-80de-84a6-00a98cbd8894. Sus aprobaciones relatadas son antecedentes, no permisos nuevos autenticados aquí.

## Resultado terminal solicitado

No basta entregar código. Activar en Chrome real → registrar entrada, generación parcial/final y transitorios expuestos junto con HTML/CSS/consola → persistir/indexar durante la actividad → recuperar evidencia desde el otro hilo mediante Remote Desktop Commander → cotejar su respuesta a «¿viste lo que pasó?» → reiniciar y recuperar. Medir latencia y huecos con relojes identificados, sin inventar tiempo interno del modelo. Atención permanente requiere además ensayo propio y un mecanismo real; este recorrido bajo demanda no la demuestra.

## Hechos de la revisión

- Control sigue en hilo400a4187-8241-8023-b3dd-00a96d379015, generación1; núcleo7ade5b8df11278aa15926a1af8287150898a823d, fuente1bfc5d88560928d0734803fb5d91b244f94be69a.
- main privado revalidado mediante GitHub. Método1.10, misma huella53db16723ec90d555d207a9a94e4f1dfd58adf07 en c4ba129; sin delta de método observado.
- core/shell.sw.js1b710632cbdd8fbd98777e3c114ddf0cfa34a8df reporta observaciones a pestaña Khora autenticada. No es evidencia de observación de ChatGPT.
- core/telemetry.jsbe6209b5fc16a4eb6566e466082210f7bfd70cb5 limita su buffer a1000 eventos; el constructor de lotes omite claves como texto, contenido, cuerpo y URL, y su secuencia se asigna de nuevo dentro de cada lote. Por inspección no sirve tal cual como archivo íntegro y orden global del diálogo. No se propone retirar su saneamiento ni mandar originales al canal de telemetría anonimizada.
- registry.jsb297117410a8e9c8c610b0daf2f77082bfd77435 activa módulos históricos no destinados a este encargo. No activarlos ni instalar paquete histórico indiscriminadamente.
- app/globals.css3396dbe404ea63d292e4a7ae903f0b05109d6196 define tokens Khora, tipografía de sistema/Geist, fondo#0A0A0B, superficie#17181A, tinta#C7CCD1, acento#8A9BA8 y variantes claras. core/aisthesis.html4d1f2dc593f706aa18872f04462192d92ae0e6e9 usa identidad dorada/serif antigua: no es la referencia visual vigente a reproducir. No se ha construido nueva pantalla.
- Remote Desktop Commander devolvió PC-14 Online, ID09357947-7fe6-4c54-9392-17348f80fe01, última señal mostrada15min; hay otros dispositivos desconectados y registros del mismo nombre. Ningún comando/archivo remoto ejecutado: falta vínculo actual confirmado por el operador y cuenta/vínculo suficiente. No deducir identidad del nombre ni buscarla en archivos.
- Documentación oficial Chrome consultada: debugger soporta DOM/CSS/Runtime/Log, exige permiso debugger, puede fallar por políticas; abrir DevTools puede terminar el enganche. Native Messaging exige permiso/registro de host y origen de extensión permitido, validación de emisor, límites y framing. Referencias: https://developer.chrome.com/docs/extensions/reference/api/debugger y https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging . Son viabilidad de interfaces, no pruebas en el equipo ni autorización.

## Propuesta para decisión material única

1. **Ámbito y acceso:** una pestaña ChatGPT seleccionada explícitamente y sus contextos asociados pertinentes, únicamente después de Iniciar; Detener desengancha. Primer ensayo con conversación sin datos sensibles. Usar permiso debugger para HTML/CSS/consola y observación de cambios visibles. No captura de cookies, credenciales, borradores no enviados, red cruda ni otros sitios. La exclusión significa que no se capturará absolutamente todo Chrome: operador debe aceptar esta diferencia antes de construir. No promesa de filtrado infalible de secretos; DOM/CSS/consola también pueden contener datos sensibles.
2. **Recorrido:** extensión existente, módulo de observabilidad acotado y empaquetado sin activar módulos históricos ajenos → enlace nativo local de Chrome, sin puerto de red abierto → archivo local de originales y un índice SQLite consultable en solo lectura por Remote Desktop Commander. Reutilizar estructura modular cuando sea compatible, no borrar/sustituir mecanismos históricos. Host nativo, runtime, ubicación, permisos del sistema y eventual relación con Entorno Persistente se comprueban en inventario antes de instalación. No arquitectura nueva del Entorno Persistente; adquirir ep-medio-architectura.md y custodias pertinentes si se afecta ese ámbito.
3. **Datos y custodia de la primera prueba:** solo datos de prueba, fuera de Git y sin nube, conservación hasta eliminación expresa. Tope propuesto1GiB con parada explícita al alcanzarse, nunca anillo que borre originales. No cifrado propio implementado ni protección del disco acreditada; no usar conversaciones sensibles. Ruta/propietario/protección reales se verifican y presentan antes de capturar; no elegir carpeta de otro perfil ni escribir fuera del destino autorizado. Originales y SQLite con confirmaciones de persistencia e IDs estables, reinicio/idempotencia e incidentes de pérdida; indexación no sustituye originales.
4. **Interacción:** reutilizar tokens/convenciones Khora; controles mínimos Iniciar/Detener, pestaña elegida, conexión al archivo, eventos confirmados y pérdidas. No diseño concreto aprobado ni maqueta producida; revisión presencial requerida antes de construir la interfaz afectada. Selección de pestaña y captura no se activan por defecto. No automatizar mensajes, consumo, atención del modelo ni modificaciones del Metacanon.

Aprobar estos cuatro puntos autoriza esa dirección de construcción, no aprueba pantallas aún no presentadas, una ruta desconocida, captura sensible ni permisos adicionales descubiertos posteriormente. Si no se aprueban, solo documentación/análisis independientes. Verificación Windows/Chrome/ChatGPT y consumo del otro hilo quedan bloqueados por equipo y permisos; no sustituir con sandbox.

## Trazabilidad de las dieciséis exigencias

Esta tabla es interpretación separada de las citas y no sustituye originales U01–U03 ni el mensaje original de Metodología. Todos los criterios funcionales siguen SIN CONSTRUIR / SIN ENSAYAR.

| # | Intención recuperada | Evidencia terminal necesaria / condición |
|---|---|---|
|1|Empezar implementación mínima real, sin instalación heredada|Paquete exacto + instalación real y prueba; no README como evidencia|
|2|Nombre descriptivo Observabilidad del trabajo con IA; destino inicial ChatGPT|Sin integraciones de otros sitios; nombre no equivale a alta en glosario|
|3|HTML, CSS y consola, los tres canales|Documento/cambios, estilos y consola por niveles/contextos; pérdidas/exclusiones declaradas y resueltas|
|4|Aportar datos mientras ocurren|Tiempos de captura/persistencia/entrega/lectura, relojes y huecos; umbral pendiente, no resumen al final|
|5|Dos hilos de ChatGPT distintos|Identificar observado y Metacanon consumidor; este hilo de desarrollo no los sustituye|
|6|Remote Desktop Commander en recorrido funcional|Consulta del registro real desde el hilo consumidor y vínculo autorizado, no solo herramienta listada|
|7|Transitorios antes de la salida|Texto expuesto conservado aunque desaparezca; si no aparece, SIN ENSAYAR|
|8|Entradas y salidas|Entrada enviada, parciales/final y secuencia de conversación; no solo errores|
|9|No equiparar visible a razonamiento privado|Diferencia explícita con expresión ambigua U03; no inventar acceso interno|
|10|Evitar narración manual, observación permanente|Respuesta a episodio con originales; captura/transporte/atención separados. Atención permanente sin mecanismo ni prueba|
|11|Corrección ágil y cortes periódicos|Incidente→evidencia→cambio aprobado→regresión y corte consolidado; ninguno sustituye al otro|
|12|Registro vasto durable e indexable|Consulta conversación/secuencia/intervalo/incidente, reinicio, recuperación, límites y huecos|
|13|Observaciones empíricas y datos|Observación humana literal vinculada a datos, hipótesis separada, decisión y regresión|
|14|Desarrollo en Harmonia, no Metodología|Objeto único/control conservado; no transferir ni escribir Metacanon|
|15|Armonizar con Khora|Reutilizar fuentes reales y revisión del operador; dirección no aprueba pantallas|
|16|Mensajes legibles por función/avance/prueba|Entregas breves, sin protagonismo de etiquetas de roles, sin omitir bloqueos|

## Plan de aceptación después de las compuertas

- Pruebas causales: aislamiento de pestaña/contextos/origen; emisor inválido rechazado; nada antes de Iniciar/después de Detener; no lectura de borradores/credenciales; desconexión/retorno sin duplicar; tope sin pérdida silenciosa; error de escritura no se marca como persistido; cola saturada/huecos declarados.
- Navegador de laboratorio: mutaciones HTML, estilos, eventos de consola, salida progresiva y nodo transitorio retirado inmediatamente; conservar originales frente a callbacks diferidos, estados anteriores y salida final. Esto es prueba controlada, no prueba de selectores ChatGPT reales.
- Equipo real: verificar runtime, extensión identificada/hash, política de enganche, destino protegido y origen host; instalar solo paquete aprobado, validar controles reales y consentimientos. No usar DevTools como si no pudiera desenganchar debugger.
- ChatGPT real: entrada de prueba + generación y lectura en el otro hilo durante actividad, no solo después. Transitorio ausente no aprueba capacidad. Medir relojes, latencias y pérdidas antes de acordar umbral.
- Reinicio: recuperar originales/índice, idempotencia y evidencia de intervalo/episodio mediante Remote Desktop Commander.
- Atención: probar mecanismo específico autorizado de lectura/atención con pausas/límites ChatGPT. Sin él no hay cumplimiento completo de «todo el tiempo», aunque lo anterior funcione. No bucle de prompts ni servicio autónomo autorizado.
- Primer incidente y primer corte con observación humana: criterio abierto hasta ejecución real y decisión del operador.

No se ha implementado código, instalado extensión, lanzado host ni capturado datos. Tiempo hasta cierre no estimable sin decisiones, vínculo/equipo y ensayo. El siguiente checkpoint es aprobación específica y vínculo, no una promesa de terminar en segundo plano.

## Actualización de conexión y entrega

Consulta posterior list_devices: TODOS OFFLINE, incluido PC-14/09357947-7fe6-4c54-9392-17348f80fe01. El registro nuevo refiere Windows y perfil C:\Users\PC 13, transporte enlazado pero autorización pendiente; sin hora de emisión fiable no se presume vigente el código. Código, enlace codificado y ruta temporal NO se persisten aquí. No equiparar PC-14 con ese equipo. Objetivo explícito añadido: colocar paquete listo para Cargar descomprimida en Escritorio real resuelto por el sistema; una carpeta no equivale a carga ni a captura comprobada. Metodología confirmó expresamente que no consta aprobación de debugger, host, SQLite, tope ni pantalla. Coordinación solicitada a otros frentes, sin exclusión técnica acreditada. Próximo checkpoint: decisión agrupada y autenticación/vínculo; luego revalidar dispositivo y rutas antes de intervenir. Evidencia adicional: evidencias/HARMONIA-OBSERVABILIDAD-01-manifest.json, inspección estática reproducida del manifiesto, no prueba de ejecución.
