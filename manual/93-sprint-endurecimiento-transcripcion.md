# 93 — Sprint: Endurecimiento Forense de la Transcripción de Khora

> **Documento canónico del sprint de endurecimiento de la capacidad de transcripción.**
>
> **Código:** TRS-001  
> **Versión:** v1.2.0  
> **Fecha de instauración:** 2026-10-05  
> **Estado:** En curso — laboratorio forense activo  
**Objetivo primario:** que Cora produzca una transcripción fiel a lo pronunciado, palabra por palabra, sin omisiones ni inserciones, y que Khora bloquee cualquier resultado no demostrado.  
> **Dominio:** ingreso de volcados / dictado / STT / reconciliación / fidelidad verbal  
> **Documento forense hermano:** `docs/FORENSIC-TRANSCRIPTION-2026-10-05.md`  
> **Protocolo de volcados:** `PREPARACION-VOLCADOS.md`  
> **Puerto de kernel relacionado:** `kernel/src/khora_kernel/ports/transcripcion.py`
>
> Este sprint no persigue una transcripción «bastante buena». Su objetivo es convertir la transcripción de Khora en una capacidad **verificablemente fiel al audio**, con evidencia auditable, rechazo explícito de resultados ambiguos y cero pérdida silenciosa de palabras.

---

## 0. Objetivo primario y regla de cierre

### Objetivo primario

**Hacer que Cora transcriba el habla real del operador con fidelidad palabra por palabra.**

Todo el sprint queda subordinado a este objetivo. No se optimiza «Whisper», «el pipeline», «la UI» ni «la legibilidad» como fines independientes. Se optimiza la capacidad de Cora para producir un registro textual que corresponda a lo pronunciado.

La pregunta de cierre es única:

> **¿La transcripción entregada por Cora coincide con lo que realmente se escucha en el audio?**

La respuesta debe poder demostrarse.

### Regla de cierre

**Khora no declarará endurecida su capacidad de transcripción mientras exista una discrepancia verbal sin resolver contra el audio de referencia, aunque el modelo haya obtenido una WER baja, una alta confianza o una salida semánticamente plausible.**

La calidad se mide en dos niveles:

1. **Métrica de progreso:** WER/CER y catálogo de errores para localizar regresiones y mejoras.
2. **Criterio de aceptación:** cero errores de palabra no resueltos frente al audio.

WER/CER sirven para comparar versiones; **no pueden autorizar el cierre**.

La unidad de calidad no es:

- «el texto se entiende»;
- «el modelo acertó casi todo»;
- «el modelo grande produjo un resultado convincente»;
- «la cantidad de errores parece baja»;
- «la UI conserva bastante texto».

La unidad de calidad es la correspondencia demostrable entre:

1. **audio soberano**;
2. **propuesta de transcripción**;
3. **alineación temporal y léxica**;
4. **tratamiento de discrepancias**;
5. **decisión de aceptación o bloqueo**.

### Criterio binario de aceptación

Un caso de prueba forense solo es **PASS** si:

- no contiene discrepancias clasificadas como **RED**;
- no contiene discrepancias clasificadas como **YELLOW** pendientes;
- no pierde palabras ni fragmentos;
- no introduce palabras ajenas al audio;
- conserva negaciones, repeticiones, nombres y términos técnicos;
- el artefacto de audio está identificado por SHA-256;
- duración y metadatos relevantes son reproducibles;
- el procedimiento y los parámetros del modelo quedan registrados;
- los artefactos resultantes están custodiados;
- un tercero puede repetir la prueba a partir del mismo audio y del manifiesto.

**No existe la categoría de «casi perfecto» para el cierre de este sprint.**

---

## 1. Problema que origina el sprint

La ruta de ingreso de volcados ya dispone de mecanismos de captura, almacenamiento, transcripción autoritativa, ensamblaje, reconciliación y protección frente a pérdidas. Sin embargo, la existencia de estos mecanismos no demuestra por sí sola que la salida textual sea acústicamente fiel.

El riesgo que motiva este sprint es de una clase más profunda:

> **un STT puede responder con éxito, producir texto gramatical y aun así atribuir al operador palabras que no pronunció, omitir palabras que sí pronunció, deformar nombres o cambiar el sentido mediante una sola palabra.**

Por tanto, el sprint endurece la frontera entre **captura**, **transcripción**, **reconciliación** y **pulido**.

La prioridad es evitar que una mejora de legibilidad termine alterando el registro de lo efectivamente dicho.

---

## 2. Principio epistemológico: el audio es soberano

Para este sprint:

**El audio es la fuente de verdad primaria.**

No son fuente primaria:

- la salida de Cora;
- la salida de Whisper;
- la confianza del modelo;
- la plausibilidad semántica;
- un glosario;
- una corrección del operador;
- una respuesta generada por otro modelo.

Las otras fuentes son instrumentos de contraste.

### Consecuencia

La comparación siempre debe responder:

> «¿Qué se escucha en ese intervalo del audio?»

y no:

> «¿Qué texto parece más razonable?»

Cuando exista conflicto entre una hipótesis lingüísticamente plausible y una evidencia acústica incierta, el resultado debe quedar **bloqueado como YELLOW** hasta resolverlo.

---

## 3. Alcance exacto

### 3.1 Incluido

- fidelidad palabra por palabra;
- omisiones de palabras o tramos;
- inserciones o alucinaciones;
- sustituciones fonéticas;
- nombres propios;
- vocabulario técnico;
- siglas y nombres de productos;
- negaciones;
- cuantificadores;
- repeticiones deliberadas;
- tartamudeos o autocorrecciones que formen parte del dictado;
- cortes de segmentos;
- solapamiento temporal entre chunks;
- pérdida de contenido por truncamiento;
- diferencia entre preview ASR y transcripción autoritativa;
- trazabilidad de modelo, preset y timestamps;
- evidencia reproducible;
- regresión de casos forenses conocidos.

### 3.2 Fuera de alcance del cierre forense

- mejora estilística;
- corrección gramatical;
- reescritura;
- resumen;
- interpretación semántica;
- titulación;
- pulido editorial no demostrado contra audio.

Estas operaciones pueden existir aguas abajo, pero nunca deben utilizarse para ocultar una discrepancia de fidelidad.

---

## 4. Relación con el protocolo de volcados

El protocolo `PREPARACION-VOLCADOS.md` establece la regla superior de que:

> **la máquina propone, el sujeto ratifica; nada se asienta en silencio.**

Este sprint convierte esa regla en controles operativos para STT.

### Orden canónico

`C1 → C2 → C3 → F1 → F2 → F3 → L1 → L2`

Este sprint endurece especialmente:

- **F1 — Cobertura Íntegra:** no perder palabras;
- **F2 — Ninguna Palabra Ajena:** no inventar ni introducir contenido;
- **F3 — Integridad de Caracteres:** no deformar la representación textual de términos relevantes.

La documentación forense detallada que materializa estos principios es:

`docs/FORENSIC-TRANSCRIPTION-2026-10-05.md`

---

## 5. Muestra de oro del sprint

### Golden Sample

**ID:** `GOLDEN-FORENSIC-2026-10-05-001`

**Audio:**
`data/volcados/2026-10-05-Vocaroo-184Eqk8BMLcF.mp3`

**SHA-256:**
`C64F949012A4F141F6EDED1B2AA69AD69D3961C02B4B3CA220C541EC456834E3`

**Duración observada:** ~1276.6 s

Este audio constituye el **caso de regresión principal** del sprint y la primera muestra de validación de Cora. No debe sustituirse por otra grabación simplemente para obtener un resultado más favorable.

La muestra debe conservarse incluso después del cierre del sprint.

---

## 6. Estrategia principal: endurecer Cora, no solo el modelo

La estrategia se ejecuta como un circuito cerrado de **medición → diagnóstico → modificación → regrabación/retranscripción → comparación acústica → regresión**.

### 6.1 Roles de las fuentes

| Fuente | Rol | Autoridad |
|---|---|---|
| Audio Vocaroo/Bukaroo | Registro acústico del habla | **Soberano** |
| Cora | Sistema bajo prueba / candidato de producción | No autoritativo |
| `large-v3` local | Instrumento de máxima calidad para contraste | No autoritativo |
| `large-v3` remoto | Opinión independiente de laboratorio | No autoritativo |
| Revisión humana contra audio | Adjudicación acústica | **Oráculo de validación** |

Bukaroo/Vocaroo sirve como control de captura independiente; no se convierte en «verdad» solo porque produzca un texto.

### 6.2 Ciclo operativo canónico

**Fase A — Captura pareada.** Dictar el mismo contenido simultáneamente en Cora y en Bukaroo/Vocaroo. Conservar el audio completo y su hash.

**Fase B — Línea base de Cora.** Guardar la transcripción producida por Cora sin corregirla, junto con versión, configuración, timestamps y estado de la sesión.

**Fase C — Texto de referencia acústica.** Escuchar el audio y construir/adjudicar el texto de referencia palabra por palabra. La referencia no se deriva de Cora ni de otro ASR.

**Fase D — Alineación.** Alinear referencia y Cora por intervalos temporales y palabras. Cada diferencia se clasifica como GREEN, RED o YELLOW.

**Fase E — Diagnóstico de causa.** Para cada RED/YELLOW determinar si la causa dominante es captura, segmentación/chunking, contexto, decodificación, modelo, prompt, glosario, postproceso o reconciliación.

**Fase F — Contraste independiente.** Ejecutar `large-v3` local/GPU sobre todo el audio y, en las zonas críticas, con presets alternativos. Usar el resultado para localizar evidencia, no para sustituir la referencia acústica.

**Fase G — Corrección de Cora.** Modificar únicamente la etapa responsable y conservar un antes/después reproducible. No aplicar «correcciones» lingüísticas que no estén justificadas por el audio.

**Fase H — Reprueba.** Volver a ejecutar Cora sobre la misma muestra de oro y comprobar que se redujeron los errores sin introducir nuevos.

**Fase I — Regresión.** Repetir la batería sobre todas las muestras de oro existentes. Una mejora en un caso que degrade otro no se acepta.

### 6.3 Orden de optimización

La investigación debe atacar la causa de mayor impacto en este orden:

1. integridad del audio y continuidad de captura;
2. pérdida por chunks, overlap o truncamiento;
3. configuración de segmentación y timestamps;
4. modelo y decodificación;
5. contaminación por contexto/prompt;
6. glosario y normalización;
7. reconciliación y ensamblaje;
8. presentación y pulido.

**Nunca empezar por L1/pulido para resolver un error F1/F2/F3.**

### 6.4 Regla de intervención mínima

Cada iteración debe modificar **una sola causa dominante o una sola variable experimental** siempre que sea posible. Esto permite atribuir la mejora o regresión.

Quedan prohibidas las modificaciones simultáneas que impidan saber qué produjo el cambio, salvo una corrección integral obligada por una causa técnica única.

### 6.5 La transcripción candidata de Cora debe permanecer intacta

Para medir mejora real:

- conservar la salida cruda de Cora antes de cualquier corrección;
- no editarla manualmente antes de calcular las métricas;
- no pasarle a Cora una transcripción esperada como prompt;
- no usar la referencia acústica para «enseñar» el caso durante la misma prueba;
- no aplicar glosarios o reglas de postproceso para ocultar errores durante la medición.

La primera medición debe representar lo que Cora realmente hace.

### 6.6 Prohibición de sobreajuste a la muestra de oro

La muestra `GOLDEN-FORENSIC-2026-10-05-001` es obligatoria, pero **no es suficiente para demostrar robustez**.

El corpus objetivo de este sprint debe evolucionar a:

- **1 muestra larga de oro**: el caso actual;
- **≥4 muestras dirigidas cortas** que cubran específicamente nombres propios, términos técnicos, negaciones, repeticiones/autocorrecciones y posibles alucinaciones;
- **1 muestra holdout ciega** que no se utilice para ajustar la estrategia.

La muestra holdout solo se evalúa después de congelar una candidata de producción. Una mejora que funciona en la muestra de oro pero falla en la holdout no puede declararse robusta.

### 6.4 Modelo de máxima calidad

La calidad máxima verificable tiene prioridad sobre la comodidad operativa.

Orden canónico:

1. `large-v3` local + GPU;
2. `large-v3` local con precisión compatible si fuese técnicamente necesaria;
3. `large-v3` remoto como laboratorio independiente;
4. `large-v3-turbo` como control/alternativa de ingeniería;
5. modelos inferiores **solo como controles**, nunca como fundamento para declarar fidelidad máxima.

### 6.5 Prohibición de downshift silencioso

No se permite pasar de `large-v3` a un modelo inferior únicamente porque:

- tarde más;
- consuma más recursos;
- sea más cómodo;
- produzca una salida más agradable;
- parezca «suficientemente buena».

Un downshift solo es legítimo con:

1. causa técnica demostrada;
2. registro de la causa;
3. identificación del modelo alternativo;
4. conservación del resultado;
5. separación inequívoca entre **control** y **resultado autoritativo**.

---

## 7. Batería forense mínima y prueba de Cora

La batería tiene que medir a **Cora contra una referencia acústica**, no únicamente comparar modelos.

Para cada muestra de oro se ejecuta como mínimo:

1. Cora en su configuración candidata de producción.
2. `large-v3` beam 5 + contexto.
3. `large-v3` beam 10 + contexto.
4. `large-v3` beam 5 sin contexto.

La salida de Cora se registra siempre con identidad de versión/configuración. Las tres corridas de Whisper sirven para localizar fragilidad y proponer hipótesis.

### 7.1 Métricas obligatorias

La métrica primaria de esta iniciativa es el **error de palabra de Cora contra la referencia acústica**.

Por muestra:

- WER;
- CER;
- palabras omitidas;
- palabras insertadas;
- sustituciones;
- errores en nombres;
- errores en términos técnicos;
- errores en negaciones;
- errores de repetición;
- tramos truncados;
- intervalos YELLOW.

### 7.2 Métrica de decisión

La métrica de progreso puede mejorar de una iteración a otra aunque siga existiendo un error.

La métrica de aceptación no:

> **PASS = 0 omisiones + 0 inserciones + 0 sustituciones + 0 YELLOW sin resolver.**

Un único error de palabra mantiene la muestra en FAIL.



| Preset | Modelo | Beam | Contexto previo |
|---|---|---:|---|
| A | `large-v3` | 5 | ✅ |
| B | `large-v3` | 10 | ✅ |
| C | `large-v3` | 5 | ❌ |

Parámetros comunes:

- `language=es`
- `task=transcribe`
- `temperature=0.0`
- `vad_filter=false`
- `word_timestamps=true`

La batería no es una votación simple entre tres textos.

Su objetivo es identificar:

- zonas estables;
- zonas sensibles al contexto;
- zonas de divergencia;
- segmentos que requieren reanálisis acústico.

---

## 8. Evidencia mínima por palabra

Cada palabra candidata deberá poder rastrearse, cuando el motor lo permita, mediante una estructura equivalente a:

`text`, `start`, `end`, `probability`, `model`, `preset`

Estos metadatos no convierten automáticamente al modelo en árbitro absoluto. Solo permiten construir evidencia auditable.

### La probabilidad del modelo no es prueba suficiente

Una palabra con probabilidad alta puede ser acústicamente incorrecta.

Una palabra con probabilidad baja puede ser correcta.

Por ello:

> **probabilidad ≠ verdad acústica**

---

## 9. Taxonomía obligatoria de discrepancias

### GREEN — Confirmada

La evidencia acústica y textual coincide de forma suficiente.

Acción:

- aceptar;
- conservar timestamps;
- permitir continuar el pipeline.

### RED — Discrepancia demostrada

Existe evidencia suficiente de que la salida no representa lo dicho.

Ejemplos:

- palabra omitida;
- palabra inventada;
- sustitución inequívoca;
- negación alterada;
- nombre propio incorrecto;
- término técnico sustituido;
- repetición eliminada que sí fue pronunciada;
- fragmento completo ausente.

Acción:

- bloquear aceptación;
- registrar el intervalo;
- generar evidencia;
- corregir mediante proceso controlado.

### YELLOW — Indeterminación

No existe evidencia suficiente para decidir.

Ejemplos:

- palabra fonéticamente ambigua;
- nombre propio poco claro;
- ruido;
- solapamiento;
- segmento partido;
- audio demasiado degradado;
- dos hipótesis plausibles.

Acción:

- **no cerrar**;
- reexaminar el intervalo;
- repetir inferencia con configuración alternativa;
- comparar fuentes independientes;
- resolver o mantener bloqueado.

---

## 10. Protocolo obligatorio para YELLOW

Una discrepancia amarilla no se resuelve por intuición.

### Paso 1 — Localizar

Identificar:

- timestamp inicial;
- timestamp final;
- segmento;
- palabra o palabras afectadas.

### Paso 2 — Aislar

Extraer una ventana acústica suficiente alrededor del intervalo, incluyendo contexto inmediato.

### Paso 3 — Reinferir

Ejecutar `large-v3` con al menos dos configuraciones compatibles con el laboratorio.

### Paso 4 — Contrastar

Comparar:

- salida original;
- nueva salida;
- hipótesis lingüística;
- continuidad temporal;
- otra fuente independiente cuando exista.

### Paso 5 — Decidir

Clasificar como:

- GREEN si la evidencia es suficiente;
- RED si se demuestra discrepancia;
- YELLOW si continúa la indeterminación.

**Un YELLOW persistente bloquea el cierre.**

---

## 11. Casos que merecen tratamiento reforzado

### 11.1 Negaciones

Las palabras equivalentes a:

- no;
- nunca;
- jamás;
- sin;
- ni;

son de máxima sensibilidad semántica.

Una sola omisión puede invertir el sentido de una frase.

### 11.2 Nombres propios

Los nombres deben verificarse acústicamente.

No deben «corregirse» únicamente porque una forma alternativa sea más frecuente.

### 11.3 Términos técnicos

Productos, librerías, modelos, APIs, nombres de archivos, siglas y vocabulario interno deben tratarse como entidades críticas.

Un glosario puede mejorar legibilidad, pero **no sustituye la comprobación contra audio**.

### 11.4 Repeticiones

Una repetición pronunciada no debe eliminarse por considerarse ruido estilístico antes de completar la fase de fidelidad.

### 11.5 Frases extrañas

Una frase rara, incompleta o aparentemente absurda sigue siendo válida como candidata si eso es lo que realmente se escucha.

El proceso de endurecimiento no puede convertir la edición semántica en falsa transcripción.

### 11.6 Cortes de segmento

Un resultado de Whisper que termina «con éxito» pero omite una cláusula completa es un **fallo**, no un éxito parcial.

---

## 12. Puerta de fidelidad antes de persistir

La transcripción no debe pasar directamente de «generada» a «asentada».

Estados conceptuales obligatorios:

`capturada → transcripción_candidata → validación → aceptada | bloqueada`

La reconciliación existente es una defensa contra la pérdida, pero **no es por sí sola un verificador de fidelidad acústica**.

Por tanto:

- una transcripción con déficit detectado se bloquea;
- una transcripción con sustituciones se bloquea;
- una transcripción con inserciones se bloquea;
- una transcripción con ambigüedad se bloquea;
- una transcripción no comparada contra el audio de prueba no puede marcarse como forensemente validada.

### 12.1 Gap técnico explícito

El sprint debe cerrar una diferencia crítica entre el control actual y el objetivo:

> una reconciliación por cobertura/LCS puede detectar déficit sin demostrar que cada palabra nueva sea la palabra correcta.

En consecuencia, el siguiente endurecimiento de código debe introducir una **validación simétrica de equivalencia** que compruebe omisión, inserción y sustitución, no únicamente déficit.

Mientras esa garantía no exista, la reconciliación debe considerarse una capa de preservación, no la prueba final de fidelidad.

## 13. Preservación contra pérdida silenciosa

Los mecanismos actuales de reconciliación ya contemplan la detección de déficits, la prevención de sobreescritura y la conservación de texto previo ante resultados incompletos.

Este sprint impone una regla superior:

> **La conservación preventiva no equivale a haber transcrito correctamente el audio.**

Por tanto deben distinguirse:

1. **captura preservada**;
2. **preview ASR disponible**;
3. **transcripción autoritativa disponible**;
4. **transcripción forensemente validada**.

No deben presentarse como estados equivalentes.

---

## 14. Separación entre laboratorio y producción

### Laboratorio forense

Puede utilizar:

- modelos locales;
- GPU propia;
- GitHub Actions;
- múltiples presets;
- artefactos temporales;
- análisis exhaustivo;
- reruns focalizados.

### Producción

Debe utilizar únicamente una configuración que:

- haya sido validada;
- tenga contrato definido;
- esté observada;
- tenga fallback explícito;
- no degrade silenciosamente la fidelidad.

**No se puede convertir una configuración experimental en producción solo porque «ganó» una prueba aislada.**

---

## 15. Reproducibilidad obligatoria

Cada ejecución forense deberá conservar como mínimo:

- ID de muestra;
- ruta del audio;
- SHA-256;
- duración;
- modelo;
- versión del motor;
- versión de runtime;
- dispositivo;
- tipo de cómputo;
- parámetros de decodificación;
- idioma;
- timestamp de ejecución;
- artefactos generados;
- resultado final;
- discrepancias encontradas;
- resolución de cada RED/YELLOW.

Cuando una prueba dependa de GPU, registrar también el dispositivo lógico utilizado cuando sea determinante para reproducibilidad.

---

## 16. Integridad de los artefactos

Los nombres de artefacto deben permitir distinguir:

- muestra;
- modelo;
- preset;
- formato;
- propósito.

Ejemplo:

`GOLDEN-FORENSIC-2026-10-05-001__large-v3__beam5-ctx__words.json`

y su texto derivado:

`GOLDEN-FORENSIC-2026-10-05-001__large-v3__beam5-ctx__transcript.txt`

Los artefactos no deben sobrescribirse entre presets.

---

## 17. Regla de independencia entre modelos

Una segunda salida de ASR es **evidencia independiente**, no autoridad.

Por tanto:

- dos modelos coincidiendo no demuestra por sí solo que ambos sean correctos;
- dos modelos discrepando no demuestra cuál es correcto;
- el audio continúa siendo la referencia soberana.

La independencia tiene valor para localizar zonas donde la inferencia automática es frágil.

---

## 18. Criterios de aceptación del sprint

El sprint queda en estado **ACEPTADO** solamente cuando se superan tres puertas consecutivas: muestra, corpus y holdout/producción.

### Puerta G1 — Muestra

La muestra de oro pasa con:

- 0 omisiones;
- 0 inserciones;
- 0 sustituciones;
- 0 YELLOW sin resolver.

### Puerta G2 — Corpus

Todas las muestras de regresión pasan el mismo criterio. No se acepta una mejora que introduzca una regresión en cualquier otra muestra.

### Puerta G3 — Holdout / producción

Una muestra nueva, ciega al proceso de ajuste, pasa el mismo criterio mediante el flujo real de Cora.

Solo después de G1 + G2 + G3 se puede afirmar que la capacidad está endurecida con evidencia de generalización.



### A. Calidad verbal

- [ ] cero RED sin resolver;
- [ ] cero YELLOW sin resolver;
- [ ] cero pérdidas de palabras;
- [ ] cero inserciones no pronunciadas;
- [ ] negaciones verificadas;
- [ ] nombres críticos verificados;
- [ ] términos técnicos críticos verificados;
- [ ] repeticiones relevantes verificadas;
- [ ] ningún tramo truncado aceptado silenciosamente.

### B. Reproducibilidad

- [ ] SHA de audio registrado;
- [ ] duración registrada;
- [ ] modelo y versión registrados;
- [ ] parámetros completos registrados;
- [ ] artefactos identificables;
- [ ] procedimiento repetible.

### C. Integración Khora

- [ ] reconciliación no permite pérdida silenciosa;
- [ ] preview y autoritativo permanecen diferenciados;
- [ ] fallos de STT son observables;
- [ ] los estados de error no se presentan como éxito;
- [ ] tests de regresión cubren los casos críticos.

### D. Documentación

- [ ] Sprint 93 actualizado;
- [ ] expediente forense actualizado;
- [ ] `PREPARACION-VOLCADOS.md` sigue enlazando F1 con el protocolo forense;
- [ ] cualquier ADR nuevo está enlazado;
- [ ] el índice del manual apunta a este sprint.

---

## 19. Criterios explícitos de NO aceptación

El sprint debe permanecer abierto si ocurre cualquiera de estos casos:

- «Whisper acertó prácticamente todo»;
- «el texto se entiende»;
- «la mayoría de palabras coinciden»;
- «el operador puede corregirlo después»;
- «el glosario lo arregla»;
- «otro modelo dijo lo mismo»;
- «la probabilidad es alta»;
- «la diferencia es irrelevante semánticamente»;
- «solo es una palabra»;
- «solo es una repetición»;
- «el audio es largo y es razonable perder algo».

Estas justificaciones no satisfacen el contrato de fidelidad.

---

## 20. Controles de regresión

Cada cambio posterior en:

- `lib/server/transcribir.ts`;
- `lib/server/transcribirSesion.ts`;
- `lib/transcripcion/reconciliar.ts`;
- `lib/transcripcion/ensamblar.ts`;
- rutas API de transcripción;
- controlador de sesiones;
- drivers STT;
- parámetros de proveedor;
- lógica de chunking;
- lógica de overlap;
- guardas de cobertura;

debe considerarse potencialmente capaz de afectar la fidelidad.

Por ello debe preservarse una batería mínima de regresión que cubra:

1. texto idéntico;
2. Whisper truncado;
3. palabra omitida;
4. palabra inventada;
5. overlap duplicado;
6. segmentación incorrecta;
7. edición manual protegida;
8. sesión multipartes;
9. pérdida de una parte;
10. timestamps de palabras.

La cobertura funcional existente no se considera suficiente para declarar perfección acústica.

---

## 21. Estado actual del laboratorio — 2026-10-05

### Estado metodológico

La metodología ya quedó reorientada a Cora como sistema bajo prueba:

- audio soberano;
- referencia acústica adjudicada;
- Cora como candidato real;
- Whisper como instrumento de contraste;
- corrección basada en causa;
- repetición sobre el mismo caso;
- regresión sobre corpus;
- validación final ciega.

### Evidencia local

Se verificó una ejecución de `faster-whisper` pequeña como control:

- modelo: `faster-whisper/small`;
- dispositivo: CUDA;
- `compute_type=float16`;
- idioma: español;
- timestamps por palabra: activos;
- ~2144 palabras producidas sobre la muestra;
- duración ~1276.6 s.

Esta ejecución **no es candidata de cierre**.

Su función es servir como control para detectar diferencias frente a modelos de mayor capacidad.

### Infraestructura local observada

Entorno utilizado para el laboratorio:

- Python 3.12;
- `faster-whisper 1.2.1`;
- `ctranslate2 4.8.2`;
- GPU NVIDIA RTX 5060 (~8 GB VRAM);
- carga local de CUDA funcional después de resolver las rutas de DLL.

El laboratorio prioriza ejecución local siempre que el hardware lo permita.

### Ejecución remota

Existe además una batería remota de `large-v3` en GitHub Actions, diseñada como laboratorio independiente.

Su propósito es proporcionar evidencia adicional y no consumir la GPU local del Intérprete.

---

## 22. Política de recursos

La investigación de calidad no debe dejar el equipo local bloqueado innecesariamente.

Reglas:

- liberar GPU cuando una ejecución termine;
- no matar procesos de terceros sin identificar;
- separar runners de STT de procesos de trabajo del operador;
- usar laboratorio remoto cuando el experimento no necesite recursos locales;
- preferir GPU local cuando reduzca sustancialmente el tiempo de iteración;
- conservar artefactos antes de terminar un proceso.

La preservación de recursos nunca debe convertirse en excusa para rebajar el nivel de calidad.

---

## 23. Política de cambios del sprint

Todo cambio sustantivo al contrato de fidelidad debe:

1. modificar este documento;
2. reflejarse en el documento forense si afecta el procedimiento;
3. actualizar los tests afectados;
4. conservar la muestra de oro;
5. explicar la razón;
6. registrar la nueva versión del documento.

No deben crearse reglas paralelas en conversaciones o notas privadas que contradigan este sprint.

---

## 24. Documentos normativos relacionados

- **Protocolo de volcados:** `PREPARACION-VOLCADOS.md`
- **Expediente forense:** `docs/FORENSIC-TRANSCRIPTION-2026-10-05.md`
- **Arquitectura persistente:** `EP-ARCHITECTURE.md` → `ep-medio-architectura.md`
- **Puerto de transcripción:** `kernel/src/khora_kernel/ports/transcripcion.py`
- **Reconciliación:** `khora-web/lib/transcripcion/reconciliar.ts`
- **Motor servidor:** `khora-web/lib/server/transcribir.ts`
- **Transcripción de sesión:** `khora-web/lib/server/transcribirSesion.ts`
- **Workflow forense:** `.github/workflows/forensic-transcribe.yml`

---

## 25. Regla de evolución

Este sprint se considera una capacidad de infraestructura crítica, no una mejora cosmética.

La evolución posterior debe aumentar, o como mínimo preservar:

- cobertura;
- trazabilidad;
- reproducibilidad;
- capacidad de detección;
- capacidad de bloqueo;
- fidelidad verbal.

Nunca debe aceptar una regresión en nombre de:

- velocidad;
- coste;
- simplicidad;
- comodidad;
- apariencia de calidad.

Cuando exista tensión entre velocidad y fidelidad, **fidelidad gana** en el expediente forense.

Cuando exista tensión entre una salida plausible y una salida demostrable, **demostrabilidad gana**.

Cuando no pueda demostrarse la corrección, **el estado correcto es bloqueado**, no aprobado.

---

## 26. Estado de cierre

**Estado actual: ABIERTO.**

Motivo:

La ingeniería de captura, reconciliación y protección contra pérdida está instrumentada, pero el endurecimiento forense de la calidad acústica todavía requiere completar la batería de máxima calidad y resolver todas las discrepancias contra el audio de la muestra de oro.

**La existencia de una transcripción técnicamente exitosa no constituye cierre del sprint.**

---

## 27. Versión vigente

**TRS-001 v1.2.0 — Endurecimiento Forense de la Transcripción de Khora orientado a Cora**

Esta versión establece el contrato base del sprint. Cualquier revisión futura deberá incrementar el número de versión.
