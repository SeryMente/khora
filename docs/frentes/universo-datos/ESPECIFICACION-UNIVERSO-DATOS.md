<!-- CORPUS_SPEC_VERSION=0.2.0; CORPUS_SCHEMA_VERSION=0.1.0 -->
# Universo de datos de Khora · Especificación de dominio

Versión 0.2.0 · KHORA-UNIVERSO-DATOS-v0.2.0 · estatuto y estado en [objeto único](OBJETO-CANONICO.md). Especificación lógica propuesta; no nueva arquitectura aprobada. Procedencia por sección: U1–U3 sintetizan intención y fuentes; U4–U12 son contratos derivados para revisión; U13 inventaría evidencia y brechas. [Manifiesto de fuentes](FUENTES-Y-COBERTURA.json).

## U1. Identidad, norte y límites

El universo de datos de Khora es el conjunto gobernado de objetos de información que el sistema custodia, referencia, transforma o produce para sostener memoria, recuperación, deliberación y acción del operador, junto con las relaciones de procedencia, autoridad y uso que impiden confundirlos. No es todo lo accesible desde sus cuentas, todo Internet, todo lo que un modelo cree saber ni toda su vida. Cada revisión declara su frontera efectiva: lo custodiado, lo solamente referenciado, lo pendiente, lo inaccesible y lo excluido. Existir en el universo lógico no equivale a autorización de ingestión, análisis, publicación o retención.

El norte del [Plan Maestro](https://app.notion.com/p/9e2a4187824182f4aff201e5fdb702a8) es la prótesis de función ejecutiva y el lazo captura→recuperación→uso. No se introduce un tercer motor de datos ni se condiciona el primer valor útil a una reconstrucción completa del sistema.

## U2. Mapa de dominios: conjuntos superpuestos, no cajones excluyentes

| Dominio | Ejemplos | Frontera necesaria |
|---|---|---|
| Fuentes y evidencias | Dictado, audio, texto, foto, archivo, Takeout, exportación autorizada | Original/versiones y localizadores; no asumir veracidad por custodia |
| Autobiográfico | Experiencias, decisiones, recuerdos, actuaciones y contexto atribuibles al sujeto | Subconjunto regulado por la especificación propia; no todo dato personal es autobiografía útil |
| Ideación y conocimiento | Ideas, diseños, citas, teoría, referencias, anotaciones | Una idea expresada por mí no convierte el contenido de la idea en hecho de mi vida |
| Ejecutivo y proyecto | Objetivos, compromisos, tareas, decisiones, estados, recordatorios | Diferenciar plan, deseo, acción cumplida e inferencia sobre valores |
| Normativo y metacontextual | Cánones, permisos, políticas, contexto versionado | Fuente de autoridad acotada; no instrucciones ejecutables por el solo hecho de estar en un documento |
| Juicios humanos | Ratificaciones, correcciones, rechazo, decisiones sobre identidad o relación | Registro auténtico, independiente y durable; no falsificar actos humanos |
| Derivados semánticos | Unidades, afirmaciones, referentes, aristas, índices vectoriales, comunidades y resúmenes | Reproducibles o regenerables con dependencias; no verdad primaria |
| Interacción y resultados | Consultas, respuestas, síntesis, borradores, crónica, exportaciones | La salida no se convierte automáticamente en fuente independiente que se confirme a sí misma |
| Operación y observabilidad | Fallos, intentos, sesiones, auditoría técnica, experiencia de uso | No promoción autobiográfica ni exposición de contenido por defecto |
| Control y secretos | Autorizaciones, credenciales, claves y medios de recuperación | Plano restringido; valores secretos fuera de corpus, grafo, documentación y telemetría ordinaria |
| Evaluación | Fixtures y datos sintéticos, referencias anotadas y recibos de pruebas | Nunca mezclarlos con biografía real ni usarlos como evidencia productiva |

Un mismo segmento puede pertenecer a ideación y autobiografía con etiquetas distintas. Son dimensiones ortogonales: soporte físico, contenido semántico, sujeto, titular/custodio, origen, finalidad, sensibilidad, estado epistémico y ciclo de vida. No se mezclan en una sola jerarquía de «confianza».

## U3. Relación con las capacidades y los consumidores

- **Síntesis Existencial Accionable (SEA):** usa elecciones/conflictos registrados para proponer interpretaciones rechazables; no decide identidad ni diagnostica desde un corpus.
- **Ideación Asíncrona Recuperable (IAR):** puede recuperar ideación no autobiográfica. Reducir todo Khora al corpus autobiográfico perdería esa capacidad.
- **Redacción Enraizada en Sentido (RES):** consume fuentes autorizadas y contexto de sentido; no licencia divulgarlas ni inventar la voz del operador.
- **Línea Indexada de Narrativa Autobiográfica (LINA):** denominación empleada explícitamente por el operador en este hilo; proyección cronológica/narrativa sobre evidencia seleccionada. No se afirma una etimología histórica del nombre previamente indeterminada.
- **Crónica personal / microblog:** proyección editorial consentida, distinta del archivo y del corpus privado. Un límite de caracteres condiciona el formato, no la conservación íntegra de la fuente.
- **Aplicación de autenticación autobiográfica:** consumidor restringido, no objetivo universal ni fuente suficiente de secreto criptográfico. Conserva el contrato específico del llavero.

Las definiciones de los [tres objetivos](https://app.notion.com/p/453a4187824183efafac81daa6b48206) y el estándar de calidad del grafo gobiernan sus acreditaciones. Ninguna es declarada conseguida por esta especificación.

## U4. Plano lógico común y correspondencia con lo existente

| Objeto lógico | Identidad y contenido mínimo | Correspondencia observada / límite |
|---|---|---|
| Fuente | `source_id`, canal, custodio, sujeto(s), autoridad, medio | En volcados hay id/origen/driver/usuario; no cubren todo el modelo propuesto |
| Versión de fuente | `source_id`, `revision`, algoritmo/huella del contenido, tipo/codificación, ubicación protegida | Volcado: id+version+sha256; audio y adjuntos tienen versiones/huellas propias |
| Unidad / ocurrencia | Identificador estable, fuente exacta, segmento y sistema de coordenadas, cita o referencia de medio | Fragmento anclado existente; hay riesgo documentado de normalización frente a huella original |
| Afirmación | Proposición/modalidad, sujeto resuelto o no, tiempo/contexto, ocurrencias que la sustentan | No debe reducirse a etiqueta de entidad o triple sin evidencia |
| Referente | Identificador, candidatos de identidad, ámbitos/alias, decisiones reversibles | Coincidencia léxica no prueba identidad |
| Relación | Extremos, tipo, evidencia, alcance/temporalidad, estado de juicio | No reconstruir extremos rechazados al regenerar |
| Juicio | Actor humano o sistema real, objeto estable, decisión, razón opcional, momento y autoridad | Un estado automático no se etiqueta como ratificación humana |
| Generación derivada | Manifiesto de entradas, código, políticas, modelos, prompts/configuración y salidas | Grafo/índice/resumen deben compartir revisión compatible, no solo topología |
| Autorización | Principal, recurso/revisión, acción, propósito, alcance, vigencia y revocación | No se presume desde «ingerido», «listo» o login |
| Artefacto de salida | Dependencias, finalidad, destinatarios, redacciones, revisión y vigencia | Respuesta, cronología, publicación y exportación separadas |
| Operación | Intento, resultado real, correlación, revisión y comprobante sin contenido sensible | Eventos técnicos no equivalen a acontecimientos de la vida |

Esta tabla es contrato de interoperabilidad, no orden de crear tablas o sustituir identificadores existentes. Adaptadores deben mapear sin pérdida; cualquier campo no disponible se declara, no se inventa. No hay autorización para migrar PostgreSQL o Neo4j por esta entrega.

### U4.1 Reglas de identidad y localización

El identificador lógico no debe depender de una propuesta efímera ni confundirse con una huella. La huella valida igualdad/integridad de bytes bajo algoritmo y representación declarados; no autentica autor, hora, contexto ni verdad. No registrar hashes públicos de respuestas o secretos de baja entropía. Igual contenido en otro origen conserva ocurrencias diferentes; una derivación del mismo original no es corroboración independiente.

Offsets de texto declaran si son bytes, puntos Unicode o unidades UTF-16, inicio inclusivo/fin exclusivo y representación exacta. Texto normalizado exige su propia huella y mapa al original. Audio/video usan intervalos, pista y unidades; imagen, página/región. Nunca citar ancla «exacta» sobre una versión distinta. Fallo de verificación bloquea la promoción afectada, no borra la captura válida.

## U5. Zonas y transformaciones

1. **Recepción/cuarentena protegida:** material recibido, con estado y permisos; contenido externo se trata como datos, nunca como órdenes al sistema.
2. **Originales custodiados:** bytes y versiones recuperables; captura continua no se subordina a finalizar el análisis. Audio original se exige donde aplica Dictado, no se inventa para una importación textual.
3. **Derivados regenerables:** transcripción, extracción, estructura, grafo, índices y resúmenes con manifiesto. Una mejora genera revisión, no reescribe retrospectivamente lo dicho.
4. **Juicios independientes:** decisiones sobre contenido, identidad, permisos y correcciones con actor auténtico; sobreviven al replay de propuestas.
5. **Proyecciones de uso:** vistas privadas, síntesis, crónica, consumidores y exportaciones. Cada acceso vuelve a comprobar alcance vigente y no hereda permisos de otra proyección.

Flujo conceptual: entrada autorizada→custodia verificable→extracción candidata→revisión según política aplicable→proyección autorizada→uso y corrección. La [autorización específica del grafo original](../../../khora-web/docs/GRAPH-ORIGINALS-AUTHORIZATION.md) permite una vía acotada para versión original y propietario determinados, no una promoción general al corpus curado. Cerrar, archivar, transcribir, seleccionar e ingerir son actos diferentes de aprobar contenido o publicar.

## U6. Máquina de estados multidimensional

| Eje | Estados lógicos de ejemplo | Prohibición |
|---|---|---|
| Integridad | pendiente / verificada / fallida | «verificada» no significa verdadero |
| Elegibilidad semántica | no evaluada / candidata / pertinente / excluida / disputada | «pertinente» no autoriza uso |
| Atribución | explícita / sustentada / ambigua / rechazada | Login o voz parecida no resuelven sujeto |
| Revisión | no revisada / propuesta / aceptada / rechazada / sustituida | Sistema no simula aceptación humana |
| Epistémico | autorreporte / recuerdo incierto / observación / cita / hipótesis / corroborado con alcance / contradicho | No imponer una escala única que borre matices |
| Autorización | no concedida / válida con alcance / revocada / vencida | Consentimiento de captura no implica publicación |
| Difusión | privada / borrador / autorizada para destino / publicada / retirada | Publicación anterior no vuelve público todo el original |
| Retención | temporal con vencimiento / conservada bajo política / en borrado / retirada con residuos declarados | «Append-only» no anula una retirada legítima |

Los nombres de ejemplo son diseño lógico, no nuevos enums desplegados. Persistir los ejes y su historial relevante sin inferir unos de otros. Cambiar una fuente invalida dependencias y aprobaciones que no cubran la revisión nueva.

## U7. Tiempo y contexto

Separar tiempo del hecho (instante, intervalo, recurrencia o desconocido), tiempo de expresión, de captura, de importación y de procesamiento, más vigencia del juicio. Conservar zona horaria/offset y precisión/origen cuando existan; no convertir «el año pasado» a una fecha exacta sin ancla fiable. Registrar orden conocido incluso si no hay fechas. Cada revisión conserva qué se sabía entonces y qué se corrigió después; una corrección tardía no cambia la fecha del hecho ni falsifica el historial.

## U8. Acceso, privacidad y seguridad como condiciones, no implementación

- Acción y finalidad por recurso: capturar, conservar, analizar, revisar, consultar, exportar, publicar y usar en autenticación no son intercambiables. Denegar por defecto cuando no hay autoridad verificable. La revocación invalida resultados accesibles y trabajos pendientes dentro de su alcance.
- Separar principal autenticado, operador, sujeto, tercero mencionado, custodio y dispositivo. Filtrar antes de recuperar/generar y volver a controlar al entregar; no filtrar solo la interfaz. Índices, cachés, comunidades, copias y mensajes a proveedores también son superficies de divulgación.
- El material derivado conserva restricciones de sus dependencias. Desidentificación y vectores no prueban anonimato. El acceso público a un dato no equivale a consentimiento de agregación/autenticación.
- Claves, tokens y enlaces de descarga sensibles fuera de repositorios, trazas y prompts reutilizables. No se examinan valores secretos para diseñar el corpus. Cifrado, gestión de claves, proveedores y cuentas definitivos requieren revisión específica; no se promete protección frente al administrador de un equipo ajeno.
- El importador deberá validar procedencia y destino del enlace, redirecciones y vencimiento; aislar peticiones contra destinos internos y no reutilizar cookies/credenciales fuera de alcance; proteger y limitar archivos, tamaños, rutas, expansión y tipos. Malware y prompt injection en archivos no se obedecen. Especificado, no implementado aquí.
- No crear fingerprint persistente, captura de ubicación o seguimiento de redes por ser técnicamente posible. Consentimiento informado, necesidad, granularidad y disponibilidad primero.

## U9. Retención, corrección, borrado y recuperación

Cada clase de datos lleva finalidad, responsable, duración/criterio de vencimiento, destino al cerrar y propagación de retirada. No hay retención universal indefinida ni se aplica la retención de experiencia de Dictado al corpus por analogía. Versionado no implica conservar contenido retirado accesible.

Al borrar: resolver dependencias en fuentes, juicios sensibles, grafo, índices, cachés, resúmenes, exportaciones administradas, temporales y trabajos; bloquear restauraciones que los reintroduzcan. Declarar plazo de copias de seguridad, retenciones legalmente obligatorias y residuos no controlables en terceros. El recibo mínimo de borrado no debe reproducir lo eliminado. «Solicitado», «bloqueado», «completado dentro de perímetro» y «residuo externo» son distintos. No prometer borrado seguro físico de una computadora compartida ni de publicaciones replicadas fuera de control.

Recuperación exige prueba con material autorizado: fuente íntegra, mismas decisiones vigentes, permisos y cohorte de derivados compatibles. Reejecución generativa no garantiza igualdad textual bit a bit; se registra salida efectiva y evaluación semántica. No restaurar una interpretación rechazada por reconstruir el grafo.

## U10. Contratos entre componentes

Todo adaptador declara versión de contrato, canal y límites, identidad/autoridad, huellas, modalidades, cobertura de extracción, errores y efectos idempotentes. Todo consumidor declara propósito, entradas elegibles, política de revisión, salida/destino y revocación. Un consumidor pide una vista autorizada, nunca la exportación completa «por conveniencia».

Idempotencia: misma clave y mismo contenido = recibo previo o duplicado explícito; misma clave y contenido distinto = conflicto o revisión, nunca éxito falso. Un lote puede quedar parcial: archivo individual, etapa, reintentos y estado final reconciliados. «Guardado» requiere comprobante y relectura; una excepción después del commit no se reporta como ingestión completa. La compatibilidad debe verificarse en las dos direcciones de cada lenguaje/servicio.

Las consultas registran alcance/revisión, fuentes esperadas y recuperadas, pendientes/exclusiones y abstención cuando corresponde. Una respuesta no puede decir «toda tu vida» si solo leyó una importación. La interpretación propuesta y la evidencia se muestran separadas, con contraejemplos pertinentes.

## U11. Etapas: mínimo viable a ideal regulativo

| Etapa | Valor y alcance | Salida que la acredita |
|---|---|---|
| Mínimo viable urgente | Una importación autorizada o captura existente, inventario protegido, selección autobiográfica candidata y resultados privados revisables en ubicación temporal | Recuperar fuente y ancla, aceptar/rechazar/corregir, exportación controlada, caducidad y recuperación comprobadas |
| Reutilización multicanal | Contratos comunes de Dictado/Takeout/texto/medios autorizados; deicticos, identidad, conflicto y corrección | Misma evidencia autorizada recuperable por distintos consumidores sin confundir versiones o permisos |
| Continuidad longitudinal | Corpus curado, cronología/LINA privada y evolución de juicios, decisiones y evidencias | Reconstrucción de un hilo y corrección con revisión consistente |
| Proyecciones especializadas | Crónica publicable y aplicaciones restringidas con aprobación independiente | Publicación minimizada y revocable en su perímetro; autenticación probada contra biografía conocida por atacante |
| Ideal potencialmente perfecto | Máxima fidelidad, cobertura y portabilidad de lo autorizado, atribuible y verificable, bajo control del sujeto | Detectar huecos/error, explicar cada derivación y corregir/retirar sin usurpar al operador |

«Perfecto» es horizonte regulativo: no omnisciencia, vigilancia total, evidencia infalible, identidad final ni memoria completa. El sistema permanece útil con datos incompletos si los límites son visibles. Las etapas no son compromiso de fechas ni permiso automático para pasar a la siguiente.

## U12. Calidad, evaluación y decisiones pendientes

Compuertas: autoridad e integridad; fidelidad localizable; atribución/contexto; revisión auténtica; cohorte compatible; aislamiento y retirada; tarea real completa y revisión del operador. Sin puntuación compensatoria. El [estándar del grafo](../../../khora-web/docs/GRAPH-QUALITY-DRAFT.md) conserva sus propias tareas y compuertas; aprobar el dominio no las reemplaza.

Medidas a definir con prueba real: cobertura respecto de inventario declarado (no vida completa); atribuciones correctas sobre muestra adjudicada; anclas válidas sobre referencias esperadas; contradicciones conservadas; recuperabilidad tras caída; filtraciones y falsos permisos; demora/costo/volumen por lote. Toda tasa exige denominador, alcance y método. Umbrales, presupuesto, límites de archivo, plazos de retención y pruebas de carga están PENDIENTES de fijación contextual; no se inventan capacidades o porcentajes.

Pendientes materiales previos a construcción: modelo de amenaza en equipo ajeno; procesamiento local/remoto y proveedores autorizados; retención temporal; política de terceros; recuperación independiente de secretos; mapa de integración con los dos circuitos de grafo; superficie de revisión y consentimientos. Se pueden revisar con este contrato sin suspender la custodia ya autorizada ni exigir toda la plataforma ideal.

## U13. Evidencia observada, conflictos y límites de cobertura

Se revisaron fuentes normativas y muestras de código de captura, volcados, fragmentos, observabilidad y experiencia; contratos del grafo, auditoría arquitectónica, objetos de Dictado y llavero y objetivos del proyecto. No se inspeccionó cada módulo, base de datos, repositorio relacionado o servicio en producción. No se importó Takeout, no se leyó autobiografía real ni se probó autenticación.

Lo existente incluye modelos de volcados/fragmentos y documentación de custodia. La auditoría fijada en el manifiesto describe dos circuitos de grafo y riesgos de juicio automático mal rotulado, identidad, anclas, replay, índices, propietario y borrado. Se trasladan como condiciones que bloquean acreditar consumidores afectados, no como incidentes nuevos comprobados ni reparaciones realizadas.

El criterio antiguo «solo aprobado» se conserva para el ámbito curado y se confronta con la excepción posterior, específica, del original. No se generaliza la excepción. La antigua visión de repositorio provisional/publicable no habilita guardar corpus privado real. El reporte actual del hilo Dictado indica almacén de audio suspendido; este frente no lo verificó por CLI y no selecciona reemplazo. Cambiar almacén no cambia titularidad, permisos o carácter privado del contenido.

## Contrato de código, versión y alcance implementado

Registro único: [`contracts/corpus-autobiografico/current.json`](../../../contracts/corpus-autobiografico/current.json). Especificación 0.2.0 y formato de intercambio 0.1.0 son versiones separadas. [Arquitectura y adopción](ARQUITECTURA-Y-CONTRATO.md); [cambios](CHANGELOG.md). Existe esquema cerrado y validador de referencia ejecutable para unidades; las reglas semánticas, permisos efectivos, verificación de fuentes, integración de productores/consumidores y pruebas reales siguen pendientes. El código implementa un perfil mínimo de intercambio, no todas las capacidades de este documento.
