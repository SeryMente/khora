<!-- CORPUS_SPEC_VERSION=0.2.0; CORPUS_SCHEMA_VERSION=0.1.0 -->
# Corpus de datos autobiográficos · Corpus autobiográfico

Versión 0.2.0 · términos canónicos intercambiables ratificados por el operador. Contrato propuesto para revisión, subordinado al [universo](ESPECIFICACION-UNIVERSO-DATOS.md) y al [objeto único](OBJETO-CANONICO.md). No se crea una nueva base física por nombrar este subconjunto.

## C1. Qué es y qué no es

El corpus autobiográfico es la colección gobernada, multicanal y versionada de unidades de información atribuibles a la experiencia, actividad, decisiones, recuerdos y contexto vital de un sujeto, enlazadas a fuentes localizables y acompañadas por sus límites de atribución, tiempo, evidencia, revisión y uso. Permite recuperar y contrastar lo que se registró sobre su vida sin confundirlo con una definición de quién es, con una historia automáticamente verdadera ni con una publicación.

Es un subconjunto lógico del universo de datos de Khora, no todos sus archivos ni todos sus datos personales. Sus fronteras se aplican por unidad: una fuente mixta puede aportar una experiencia y contener, además, citas, ficción, teoría, datos de terceros o secretos que no deben promoverse. «Poseer», «haber dicho», «haber vivido», «ser cierto» y «permitir que se publique» son relaciones diferentes.

No es: identidad ontológica del operador; diagnóstico psicológico; expediente oficial de verdad; grafo completo de Khora; diario público; depósito de claves; registro de cualquier dato de terceros; ni colección irrestricta de metadatos. La justificación filosófica aportada en el dictado se conserva como marco del operador, no como evidencia científica de dos clases de personas o de consecuencias necesarias de una teoría psicológica. No se clasifica a usuarios en estratos por esta especificación.

## C2. Criterio de pertenencia

Una unidad puede ser **candidata autobiográfica** si satisface conjuntamente:

1. Hay fuente/version localizable con integridad evaluable; la falta de corroboración externa no impide conservar un autorreporte como tal.
2. Su contenido expresa o documenta experiencia, acto, recuerdo, decisión, circunstancia o vivencia interior de un sujeto, o contexto necesario para interpretarlos.
3. La atribución al sujeto es explícita o sustentada y revisable; si es ambigua, queda candidata no confirmada, fuera de vistas que exijan atribución firme.
4. Conserva modalidad y contexto: vivido, recordado con duda, dicho por otro, deseado, hipotético, negado o corregido no se convierten entre sí.
5. Existe base autorizada para custodia y evaluación dentro de ese alcance; secretos o terceros requieren separación/contención, no apropiación automática.

Formalmente, para una revisión y propósito dados: `vista_autobiografica = unidades_pertinentes ∩ atribucion_admisible ∩ integridad_requerida ∩ permiso_vigente ∩ politica_del_consumidor`. La fórmula no vuelve equivalentes esos ejes. El conjunto de candidatos puede incluir dudas para revisión; **corpus curado** nombra la vista que además satisface su política de juicios, no una segunda copia fuente.

Una inferencia del sistema sobre el sujeto permanece derivado propuesto con soporte/contraevidencia; no ingresa como hecho confesado por el operador. Un rechazo de interpretación no se convierte en rasgo suyo. El sujeto puede corregir un autorreporte sin que el sistema pretenda arbitrar su esencia.

## C3. Ejemplos de inclusión, exclusión y calificación

| Entrada sintética | Tratamiento |
|---|---|
| «Hoy acompañé a mi padre al hospital» | Experiencia autorreportada; proteger tercero y tiempo contextual |
| «Creo que fue en 2018» | Recuerdo con incertidumbre, no fecha exacta certificada |
| «Me sentí aliviado» | Autorreporte de vivencia interior; no diagnóstico ni prueba fisiológica |
| «Quiero mudarme» | Deseo expresado; no mudanza realizada |
| «Si me mudara…» | Hipótesis; no acontecimiento |
| «Mi personaje dice: yo nací en…» | Ficción/cita; no biografía del autor |
| Un documento ajeno o llamada interpretada | No atribuir al operador; separar contexto profesional/terceros |
| Artículo sobre identidad | Conocimiento externo; solo el acto o postura de lectura puede ser autobiográfico si está documentado |
| Dos copias del mismo mensaje | Dos ocurrencias de un origen; no dos corroboraciones independientes |
| Geolocalización disponible | Indicio técnico de sesión/dispositivo con precisión/origen, no prueba concluyente de persona presente |
| Texto con contraseña | Contención y separación; nunca candidato a pregunta/respuesta autobiográfica |
| Error técnico de subida | Observabilidad; no acontecimiento vital por defecto |

Los ejemplos no representan hechos del usuario. Los tipos son extensibles; no obligan a estructurar un dictado libre en un vocabulario cerrado antes de capturarlo.

## C4. Unidad autobiográfica: contrato lógico mínimo

| Grupo | Campos / significado |
|---|---|
| Identificación | `unit_id`, versión de contrato, revisión de unidad; enlace al sujeto explícito o candidato sin resolver |
| Evidencia | `source_id`, revisión, algoritmo/huella, ocurrencia y ancla exacta, representación/coordenadas; referencia protegida a original y medios |
| Contenido | Proposición o unidad de sentido fiel; literal conservado en fuente; etiquetas de evento/decisión/recuerdo/deseo/hipótesis/cita según corresponda |
| Contexto | Hilo, interlocutores/roles necesarios, negación, condiciones, correcciones y relaciones a otras unidades |
| Tiempo | Tiempo del hecho/intervalo/orden/desconocido, precisión y zona si consta; expresión, captura e importación independientes |
| Epistémico | Autor de afirmación, modalidad, incertidumbre, corroboración y dependencia entre fuentes, contradicciones abiertas |
| Juicios | Actor y autoridad auténticos, decisión y revisión juzgada, fecha, propuesta/aceptación/rechazo/sustitución |
| Gobierno | Custodio, sujetos/terceros, sensibilidad, finalidades/acciones permitidas, retención, revocación y estado de retirada |
| Derivación | Extractor/modelo/política/versiones, entradas y salida efectiva; no registrar secretos en prompts o manifiestos |
| Uso | Proyecciones consumidoras, revisiones compatibles, estado de actualización/invalidez y destino autorizado |

No todos los metadatos son obligatorios como valores: lo mínimo obligatorio es declarar su condición. Distinguir `desconocido`, `no capturado`, `no disponible`, `permiso denegado` y `no aplicable`; no sustituirlos por cero, una ubicación aproximada inventada o una identidad deducida del usuario Windows.

## C5. Captura multicanal y contrato con Dictado

Cada canal ofrece el mismo contrato lógico de fuente/autoridad/evidencia sin fingir el mismo soporte. Dictado conserva audio y transcripción asociados según custodia; transcripción corregida y audio no se sustituyen. Un Takeout conserva manifiesto, miembros y huellas protegidas; correos, conversaciones, adjuntos y metadatos mantienen sus contextos y terceros. Texto externo no exige audio inexistente. Una foto puede documentar contexto, pero por sí sola no establece quién estaba allí.

En Dictado, una interrupción de interpretación laboral no es autobiografía del operador ni contenido publicable. El tipo interpretación conserva su exclusión vigente del grafo; este contrato no abre una ruta alternativa para saltarla. Borrador, checkpoint, archivar y revisar tienen efectos distintos. La publicación se negocia con el consumidor Blog; no se añade como efecto de guardar.

El hilo Dictado confirmó la separación privado/publicación y preservación de audio, manifest, huella y propietario incluso si cambia de almacén. Reportó suspensión del almacén de audio y diagnóstico en su propio hilo; aquí se registra atribuido, no se certifica causa ni se decide proveedor. El corpus no depende de Vercel Blob ni de otro proveedor específico.

## C6. Resultados temporales del importador urgente

**Posición funcional acordada:** área privada de resultados autobiográficos revisables, temporal y anterior a la integración longitudinal definitiva. «Área» es una función/espacio de trabajo lógico: no impone crear un almacén, cuenta o servicio nuevo sin revisión. Debe poder entregar valor sin esperar LINA completa, bóveda de contraseñas, redes sociales ni reconstrucción del grafo.

Contrato de la entrega temporal:

1. Inventario por lote: fuentes recibidas, omitidas, fallidas, en cuarentena, procesadas y pendientes; cobertura honesta.
2. Candidatos con cita/ancla y apertura al original autorizado, tiempo e incertidumbre, nunca preguntas de autenticación reales en Git.
3. Aceptar, rechazar y corregir con actor/revisión; exportar solo una selección autorizada en formato documentado y portable.
4. Vencimiento o criterio explícito, responsable, recuperación y eliminación verificables; no dejar enlaces de descarga, archivos descomprimidos o respuestas en perfiles de navegador compartidos.
5. Recibos separados de recepción, custodia, análisis y revisión. Reintento no duplica ni pierde decisiones.
6. Ningún candidato ni aprobación selecciona automáticamente un secreto, desbloquea contraseñas o genera una publicación.

**Riesgo no eliminable por redacción:** si una computadora ajena o su administrador puede observar contenido o memoria mientras se procesa, no hay garantía de confidencialidad contra él. Un enlace autenticado y cifrado en reposo no resuelve ese riesgo. El mínimo viable debe minimizar exposición local y evaluar procesamiento en entorno controlado; si no se acepta el riesgo o falta un canal confiable, se bloquea el procesamiento sensible, no se promete «descarga segura». No se exige controlar o cambiar el usuario Windows para definir la solución.

El importador no está construido, probado ni conectado a un servicio de análisis por esta entrega documental. Su ubicación técnica, retención y medios de acceso son decisiones materiales pendientes.

## C7. Metadatos para una huella autobiográfica verificable

| Metadato deseado | Utilidad y límite | Condición |
|---|---|---|
| Fecha/hora de captura y servidor | Orden y diagnóstico; reloj puede ser incorrecto | Fuente del reloj, zona y precisión; separar hecho/captura |
| GPS | Contexto espacial con margen de error | Permiso específico y minimización; puede no estar disponible |
| Dirección pública IPv4/IPv6 | Contexto de red, compartido por NAT/VPN/proxy | No identifica de forma unívoca persona ni posición |
| Punto de acceso/red | Contexto técnico potencial | Navegador puede no exponerlo; no inventar SSID/MAC |
| Torre celular | Posible dato del proveedor/dispositivo | No asumir disponibilidad web ni acceso legítimo; fuera del mínimo viable |
| Dispositivo/sesión | Procedencia técnica y continuidad | Identificador mínimo con propósito, no fingerprint invasivo automático |
| Huellas y transformaciones | Integridad y cadena de derivación | No prueban autoría humana o veracidad externa por sí mismas |

«Tantos como sea éticamente posible» significa necesarios y proporcionados para finalidades consentidas, no máxima recolección técnicamente viable. Permiso negado no impide conservar un autorreporte lícito sin ubicación. Metadata sensible se separa y redacta antes de publicación. No se usa la etiqueta «forense» como certificación pericial/legal inexistente; se documentan método, huecos y cadena verificable.

## C8. Consumidores: contratos distintos sobre un mismo corpus

### LINA y continuidad personal

Construyen una proyección indexada de relato/tiempo con enlaces a fuentes, alternativas de orden, correcciones y vacíos. No eliminan contradicciones para conseguir una identidad coherente. La cronología puede registrar incertidumbre y varias versiones del recuerdo. No sustituyen corpus ni grafo y no son una versión pública por definición.

### Crónica y microblog

Generan borradores derivados, con selección, contexto y redacción; el original permanece privado bajo su política. Preparar texto de 140 caracteres no aprueba publicación ni elimina matices del archivo fuente. Una publicación requiere destino, contenido y permiso vigentes; distribución automatizada futura exige revisión propia. GitHub Pages y redes sociales no son destinos autorizados por este documento; propiedad/control de cuentas y capacidad de retirada no se equiparan.

### Aplicación de autenticación autobiográfica

La elegibilidad autobiográfica es mucho más amplia que la elegibilidad para ese consumidor. Preservar el contrato del [llavero](https://github.com/SeryMente/khora/blob/a91b5f2cde3fe9f1a24dc8ebb948d586be43b543/docs/frentes/llavero-harmonia/OBJETO-CANONICO.md): candidato discreto, estable, recordable, inequívoco, revisable y aceptado; no trauma, secretos de terceros, hechos públicos, preguntas de seguridad comunes ni inferencias completadas por el modelo. No materializar candidatos reales aquí.

**Modelo adversario: asumir conocido todo el corpus.** Raridad, intimidad y cantidad de episodios no equivalen a entropía criptográfica. Biografía no debe bastar para derivar, liberar o recuperar una clave; requiere un secreto/factor independiente y recuperación diseñada aparte. Si el flujo inverso revela, registra o filtra respuestas, también se considera comprometido. Especificar factores no autoriza sustituir el diseño del llavero, implementar un protocolo criptográfico propio ni desplegarlo.

### Capacidades cognitivas

Síntesis Existencial Accionable propone interpretaciones basadas en elecciones sin definir al sujeto; Ideación Asíncrona Recuperable no queda limitada a biografía; Redacción Enraizada en Sentido usa fuentes y sentido verificables, no imita una autobiografía inventada. Todas heredan permisos y límites de evidencia, no una concesión universal.

## C9. Correcciones, contradicciones y revisiones

Diferenciar corrección de transcripción, cambio de recuerdo, evidencia nueva, retractación, cambio de interpretación y retirada de permiso. Conservar el vínculo y alcance de lo sustituido mientras la política lo permita, no difundir la versión invalidada ni conservar contenido retirado como excusa histórica. Un conflicto no se resuelve por mayoría de duplicados o por preferir el resumen más reciente. El modelo puede proponer comparación; el juicio auténtico permanece independiente.

Una modificación de fuente o permiso marca dependencias afectadas e impide usar resultados obsoletos como vigentes. La promoción a una vista curada requiere fuente/revisión exacta y política aplicable; aprobación de texto, de interpretación y de publicación son actos distintos. Nada etiqueta al operador de contradictorio o deshonesto porque haya versiones distintas.

## C10. Evolución desde mínimo viable a ideal

**Mínimo viable:** lote finito, privado, protegido, inventariado; candidatos fieles con fuente, sujeto/ambigüedad, tiempo/ausencia, modalidad, revisión, permisos y caducidad. Recuperación y rechazo reales; ningún componente de publicación o autenticación necesario para aprobarlo.

**Intermedio:** varios canales, enlaces entre ocurrencias, juicios estables, búsqueda con fuente, correcciones, exportación y retirada propagadas. LINA privada con límites visibles. Usuarios/sujetos aislados y sin promoción desde telemetría.

**Avanzado:** integración con las capacidades de Khora y consumidores especializados, solo tras acreditar sus tareas. Metadata adicional optativa y demostrablemente disponible; publicación minimizada y usos de autenticación auditados aparte.

**Ideal potencialmente perfecto:** todo lo autorizado y pertinente puede ser recuperado fielmente, en su evolución y contexto, con incertidumbre, contraevidencia, portabilidad y control efectivo. Nunca promete totalidad de vida, certeza ontológica, vigilancia universal ni eliminar toda ambigüedad. El sujeto no tiene que llenar su vida de datos para que el sistema le resulte útil.

## C11. Condiciones de acreditación y no conformidad

La especificación se considera cubierta documentalmente al vincular estas reglas a [casos falsables](pruebas/CASOS-ACEPTACION.md). El corpus mínimo solo se acredita con un lote autorizado real y revisión del operador: recuperar fuente; distinguir hecho narrado/deseo/cita/hipótesis; atribución correcta o abstención; no terceros/secreto indebidos; aceptación/rechazo durable; permisos y retirada efectivos; recuperación tras fallo; salida temporal utilizable.

Un conjunto de fichas bien formadas no acredita autenticidad, utilidad o seguridad. Una prueba sintética no acredita producción. No hay corpus real importado, LINA implementada o autenticación acreditada por este documento. Las pruebas permanecen NO EJECUTADAS en producto hasta tener evidencia propia.

## Contrato de código, versión y alcance implementado

Registro único: [`contracts/corpus-autobiografico/current.json`](../../../contracts/corpus-autobiografico/current.json). Especificación 0.2.0 y formato de intercambio 0.1.0 son versiones separadas. [Arquitectura y adopción](ARQUITECTURA-Y-CONTRATO.md); [cambios](CHANGELOG.md). Existe esquema cerrado y validador de referencia ejecutable para unidades; las reglas semánticas, permisos efectivos, verificación de fuentes, integración de productores/consumidores y pruebas reales siguen pendientes. El código implementa un perfil mínimo de intercambio, no todas las capacidades de este documento.
