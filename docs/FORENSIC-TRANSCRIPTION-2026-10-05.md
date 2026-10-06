
# Especificación Forense de Transcripción · Khora

**Especificación:** FTS-001  
**Versión:** 1.0.0  
**Fecha:** 2026-10-05  
**Estado:** normativa para el ciclo forense de ingreso de volcados  
**Repositorio:** SeryMente/khora  
**Referencia arquitectónica:** Entorno Persistente Medio v1.0.1  
**Objetivo:** máxima fidelidad verbal demostrable contra el audio original.  
**Sprint canónico:** [`manual/93-sprint-endurecimiento-transcripcion.md`](../blob/main/manual/93-sprint-endurecimiento-transcripcion.md), TRS-001 v1.0.0.

---

## 1. Propósito

Esta especificación define el protocolo de máxima exigencia para determinar si
una transcripción de un volcado corresponde exactamente a lo pronunciado en su
audio.

El objetivo no es producir un texto plausible, limpio, gramatical o
semánticamente razonable. El objetivo es demostrar, hasta donde la evidencia
acústica permita hacerlo, una correspondencia palabra-por-palabra entre:

~~~
audio original
     ↓
evidencia acústica independiente
     ↓
alineación temporal
     ↓
comparación palabra-por-palabra
     ↓
veredicto
~~~

El protocolo debe detectar:

- omisiones;
- adiciones;
- sustituciones;
- repeticiones y duplicaciones;
- cambios de negación;
- cambios de nombres propios;
- cambios de términos técnicos;
- cambios de número o género;
- truncamientos;
- fragmentos inventados;
- contaminación del prompt;
- errores de segmentación;
- ambigüedades que no puedan resolverse con evidencia suficiente.

La exigencia final es:

> Una transcripción no es perfecta mientras exista una discrepancia roja o una discrepancia amarilla sin resolver.

---

## 2. Alcance

Aplica a:

1. volcados dictados por voz destinados a ingresar en Khora;
2. pruebas de regresión del sistema de transcripción;
3. muestras golden de fidelidad;
4. auditorías de modificaciones al motor de ASR;
5. comparación entre proveedores y modelos;
6. análisis de una transcripción candidata producida por Cora u otro frontend.

No sustituye la ruta productiva. Es una capa independiente de verificación.

---

## 3. Fuentes de verdad

Jerarquía obligatoria:

~~~
1. AUDIO ORIGINAL INMUTABLE
2. EVIDENCIA ASR INDEPENDIENTE CON TIMESTAMPS
3. TRANSCRIPCIÓN CANDIDATA
4. INFERENCIAS SEMÁNTICAS HUMANAS
~~~

El nivel 4 nunca puede utilizarse para convertir una discrepancia en una
coincidencia.

### Regla de no interpretación

Durante el arbitraje está prohibido:

- corregir gramática;
- corregir nombres por conocimiento externo;
- corregir terminología;
- completar frases;
- sustituir sinónimos;
- eliminar repeticiones;
- alterar una frase porque "seguramente quiso decir otra cosa".

La pregunta es qué se pronunció, no qué habría sido mejor decir.

---

## 4. Corpus forense de referencia

### 4.1 Golden sample actual

Identificador:

~~~
GOLDEN-FORENSIC-2026-10-05-001
~~~

Audio:

~~~
data/volcados/2026-10-05-Vocaroo-184Eqk8BMLcF.mp3
~~~

SHA-256:

~~~
C64F949012A4F141F6EDED1B2AA69AD69D3961C02B4B3CA220C541EC456834E3
~~~

Tamaño:

~~~
15,449,472 bytes
~~~

Duración observada por control ASR:

~~~
~1,276.6 s
~~~

La transcripción Cora usada en este ciclo es una fuente candidata de comparación,
no una fuente de verdad.

### 4.2 Inmutabilidad

El audio original no puede ser:

- recomprimido;
- normalizado;
- recortado;
- convertido a otro formato para sustituir la fuente;
- sobrescrito.

Toda evidencia derivada debe conservar el SHA-256 del original.

Si el SHA no coincide:

~~~
FORENSIC RUN = INVALID
~~~

---

## 5. Principio de máxima calidad

Regla:

> Usar el modelo ASR más grande que el hardware disponible pueda ejecutar de forma estable y verificable.

Orden de preferencia:

~~~
large-v3 local + GPU
large-v3 local con precisión compatible
large-v3 en laboratorio remoto
large-v3-turbo
modelos menores sólo como controles
~~~

No se permite bajar de modelo sólo para obtener más velocidad.

### 5.1 Hardware de referencia del ciclo

La máquina de prueba actual reportó:

- NVIDIA GeForce RTX 5060;
- 8,151 MiB de VRAM;
- CUDA operativo para CTranslate2;
- Python 3.12;
- faster-whisper 1.2.1;
- ctranslate2 4.8.2.

La capacidad CUDA fue verificada.

### 5.2 Regla de descenso

El descenso de large-v3 requiere una causa técnica verificable:

- memoria insuficiente;
- incompatibilidad binaria;
- DLL CUDA ausente;
- backend no operativo;
- estabilidad insuficiente;
- imposibilidad práctica de completar el corpus.

No son causas válidas:

- "turbo es más rápido";
- "medium parece suficiente";
- "el resultado se ve correcto".

---

## 6. Batería primaria de decodificación

Una única ejecución de Whisper no constituye evidencia concluyente.

La batería de referencia es:

| Pase | Modelo | Beam | Contexto previo | Finalidad |
|---|---|---:|---|---|
| A | large-v3 | 5 | sí | referencia contextual |
| B | large-v3 | 10 | sí | búsqueda ampliada |
| C | large-v3 | 5 | no | control contra propagación contextual |

Parámetros comunes:

~~~
language = es
task = transcribe
temperature = 0.0
vad_filter = false
word_timestamps = true
~~~

Cada pase debe conservar su configuración efectiva.

### 6.1 Contexto

condition_on_previous_text=true puede favorecer continuidad, pero también puede
propagar errores. Por eso la batería exige un pase sin contexto.

### 6.2 Beam

La elección de beam puede modificar palabras de baja probabilidad. La
comparación entre beam 5 y beam 10 ayuda a identificar lecturas inestables.

---

## 7. Segunda opinión

Los pases large-v3 constituyen la referencia primaria.

Los modelos menores sólo funcionan como controles:

~~~
large-v3 A ─┐
large-v3 B ─┼─→ CONSENSO PRINCIPAL
large-v3 C ─┘
turbo/control ─→ señal auxiliar
medium/small ─→ control de consistencia
~~~

Un modelo menor no puede invalidar automáticamente la convergencia fuerte de
large-v3, pero sí puede elevar un pasaje a revisión amarilla.

---

## 8. Evidencia por palabra

Para cada palabra utilizada en el arbitraje deben preservarse:

- texto;
- timestamp inicial;
- timestamp final;
- probabilidad;
- modelo;
- configuración de decodificación.

Unidad mínima:

~~~
PALABRA = texto + start + end + probability + model + preset
~~~

No basta comparar cadenas completas.

---

## 9. Alineación forense

### Fase A · Segmentación

Separar resultados en segmentos y palabras con timestamps.

### Fase B · Normalización mínima

Sólo puede normalizarse lo estrictamente necesario para alinear:

- mayúsculas/minúsculas;
- espacios de borde;
- puntuación de frontera cuando no represente una palabra.

No puede normalizarse:

- contenido léxico;
- negaciones;
- nombres;
- números;
- terminología.

### Fase C · Alineación

Representar como:

~~~
CORA              EVIDENCIA

palabra_i    ↔    palabra_j
palabra_i+1  ↔    —
—            ↔    palabra_j+1
~~~

### Fase D · Arbitraje

Cada diferencia debe recibir clasificación y evidencia.

---

## 10. Taxonomía de resultados

### VERDE · Confirmada

Cora coincide con la evidencia acústica suficiente y no existe señal contraria
material.

### ROJO · Discrepancia demostrada

La evidencia demuestra que Cora:

- omitió;
- añadió;
- sustituyó;
- duplicó;
- truncó;
- desplazó material verbal de forma material.

### AMARILLO · Indeterminada

La evidencia no basta para concluir:

- ASR en conflicto;
- probabilidad baja;
- ruido;
- solapamiento;
- timestamp insuficiente;
- pronunciación ambigua.

Regla:

> AMARILLO nunca se convierte en VERDE por plausibilidad lingüística.

---

## 11. Desempate de discrepancias

Cada amarillo debe pasar por un análisis focalizado:

1. localizar el timestamp;
2. extraer una ventana acústica alrededor del evento;
3. volver a procesar con large-v3;
4. probar al menos dos configuraciones;
5. comparar contra las hipótesis candidatas de Cora;
6. verificar continuidad temporal;
7. contrastar la salida independiente;
8. emitir VERDE, ROJO o AMARILLO persistente.

Si continúa ambiguo:

~~~
FORENSIC STATUS = NOT PASSED
~~~

No se inventa una resolución.

---

## 12. Casos peligrosos

### 12.1 Negaciones

Dar prioridad a:

~~~
no / nunca / jamás / sí
~~~

Un solo cambio puede invertir el contenido.

### 12.2 Nombres propios y entidades

No corregir por conocimiento externo:

- personas;
- libros;
- lugares;
- tecnologías;
- marcas;
- términos filosóficos;
- vocabulario interno de Khora.

### 12.3 Repeticiones

Las palabras repetidas que realmente fueron pronunciadas cuentan.

Ejemplo:

~~~
"una vez que una vez que..."
~~~

No se deduplican durante la auditoría.

### 12.4 Frases alucinadas

Una frase contextualmente plausible pero inexistente en el audio es ROJO.

### 12.5 Cortes de segmento

Una frontera diferente entre segmentos no es automáticamente una discrepancia.
La comparación debe realizarse sobre el flujo temporal conjunto.

---

## 13. Whisper como instrumento, no árbitro absoluto

Whisper produce evidencia de reconocimiento; no constituye por sí solo una
prueba acústica infalible.

La confianza máxima exige la combinación de:

~~~
convergencia entre decodificaciones
+
timestamps coherentes
+
probabilidades adecuadas
+
alineación
+
ausencia de contradicción acústica
~~~

Incluso cuando varios ASR coinciden, una palabra acústicamente ilegible puede
permanecer amarilla.

---

## 14. Criterio de aceptación

### PASS

Sólo si:

~~~
ROJOS = 0
AMARILLOS = 0
~~~

y además:

- SHA verificado;
- audio completo procesado;
- duración consistente;
- timestamps disponibles;
- configuración reproducible;
- artefactos de evidencia preservados.

### FAIL

Cualquiera de:

- rojo > 0;
- amarillo > 0;
- SHA incorrecto;
- audio incompleto;
- salida parcial;
- modelo o configuración desconocidos;
- ejecución no reproducible.

### Prohibición de "casi perfecto"

No existe una categoría de aceptación basada en:

- 99 %;
- 99.5 %;
- "unas pocas palabras";
- "no cambia el significado";
- "se entiende lo mismo".

Se evalúa fidelidad verbal.

---

## 15. Separación laboratorio / producción

### Laboratorio

Se permite:

- large-v3;
- múltiples pasadas;
- ventanas de desempate;
- modelos alternativos;
- archivos JSON;
- timestamps detallados;
- análisis intensivo.

### Producción

Debe conservar:

- fidelidad;
- custodia;
- trazabilidad;
- separación entre verbatim y derivaciones;
- latencia compatible con la experiencia del usuario.

Ningún experimento entra en producción por haber producido un texto que
"parece mejor".

---

## 16. Artefactos

Convención:

~~~
data/volcados/
  <audio-original>
  <forensic-manifest>
  <large-v3-result-A>
  <large-v3-result-B>
  <large-v3-result-C>
  <forensic-report>
~~~

Cada resultado debe registrar:

- SHA del audio;
- modelo;
- versión de engine;
- backend;
- precisión;
- idioma;
- temperatura;
- beam;
- contexto;
- VAD;
- timestamps;
- duración;
- número de palabras;
- hash del resultado.

Los resultados voluminosos pueden almacenarse como artefactos de CI, pero el
manifiesto debe conservar su identidad y procedencia.

---

## 17. Manifiesto de reproducibilidad

Campos mínimos:

~~~
audio_sha256
model
engine_version
compute_backend
compute_type
language
temperature
beam_size
condition_on_previous_text
vad_filter
word_timestamps
duration_seconds
word_count
output_sha256
run_identifier
timestamp_utc
~~~

La ausencia de un dato crítico invalida la reproducibilidad de esa corrida.

---

## 18. Prioridad local

Cuando exista un entorno local disponible:

1. preferir local;
2. reutilizar modelos ya descargados;
3. reutilizar caché válida;
4. usar GPU antes que CPU;
5. procesar localmente las ventanas de desempate;
6. usar laboratorio remoto como respaldo o segunda opinión.

No ejecutar remoto algo que la máquina pueda resolver localmente de manera
estable.

La ejecución remota no debe ocupar ni bloquear la máquina del usuario.

---

## 19. Conservación de recursos

El análisis forense no debe interferir indefinidamente con el uso ordinario
del equipo.

Reglas:

- toda ejecución experimental debe tener un identificador;
- los procesos ASR deben poder localizarse y terminarse limpiamente;
- al pausar el análisis debe liberarse la GPU;
- procesos de terceros no se terminan sin identificación;
- el estado de GPU debe comprobarse antes y después;
- no se deja una batería experimental ejecutándose sin propósito.

---

## 20. Control del entorno RDC

Cuando el análisis local se ejecute mediante Remote Desktop Commander:

1. verificar la cuenta vinculada;
2. verificar el dispositivo activo;
3. verificar la ruta del repositorio;
4. verificar la presencia del audio;
5. registrar SHA;
6. ejecutar el análisis;
7. liberar procesos experimentales al finalizar o pausar;
8. verificar nuevamente la GPU.

Una desconexión del conector no se interpreta como fallo del software local.

---

## 21. Estado del ciclo 2026-10-05

### Evidencia confirmada

El audio fue incorporado al repositorio en:

~~~
data/volcados/2026-10-05-Vocaroo-184Eqk8BMLcF.mp3
~~~

con SHA:

~~~
C64F949012A4F141F6EDED1B2AA69AD69D3961C02B4B3CA220C541EC456834E3
~~~

La máquina local confirmó:

- RTX 5060;
- CUDA operativo;
- faster-whisper disponible;
- control large-v3-turbo iniciado pero con caché incompleta;
- medium cargado;
- small ejecutado correctamente en GPU;
- evidencia de control de 2,144 palabras;
- duración aproximada de 1,276.6 s.

### Limitaciones registradas

El primer intento large-v3-turbo local quedó detenido por descarga incompleta
del modelo.

El primer intento medium en GPU falló por resolución de cublas64_12.dll. La DLL
existía en la instalación de Python y pudo resolverse en un proceso posterior.

La ejecución local large-v3 no se considerará realizada hasta completar una
corrida efectiva y verificable.

---

## 22. Batería de CI del repositorio

Khora contiene un workflow de laboratorio cuyo propósito es disponer de una
referencia independiente y reproducible.

La batería máxima definida actualmente:

- usa large-v3;
- comprueba el SHA del audio antes de inferir;
- produce tres configuraciones;
- conserva timestamps;
- conserva JSON;
- conserva TXT;
- produce artefactos de 14 días.

El workflow de CI no se considera sustituto de la prueba local GPU.

Su función es:

- puente de laboratorio;
- segunda evidencia;
- regresión reproducible;
- comparación independiente.

---

## 23. Registro de pruebas relevantes

### Commit de audio

~~~
2185a4b
data: registrar volcado Vocaroo 2026-10-05
~~~

### Primer workflow de transcripción

~~~
3d609fa01f66e37d27b3b56c9f44f85a139053df
~~~

Falló por incompatibilidad PyAV.

### Corrección de PyAV

~~~
9c473ade4a66c5a867ec34d41aae74d7fa85424a
~~~

Se fijó av<19.

### Elevación de protocolo a large-v3

~~~
53817f6caef66126cfe79fcb1782c8e0e5c27a53
~~~

Se definieron tres presets large-v3.

### Estabilización final de la batería

~~~
634de4483f3b72f67fc2e56776175ac94c27fe27
~~~

Se consolidó la batería en un único runner para cargar large-v3 una vez y
realizar las tres decodificaciones.

---

## 24. Reglas de regresión de Khora

Toda modificación que pueda afectar transcripción debe pasar:

1. análisis estático aplicable;
2. verificación del audio original;
3. verificación SHA;
4. corrida de la muestra golden;
5. comparación palabra-por-palabra;
6. verificación de timestamps;
7. revisión de rojos;
8. resolución de amarillos;
9. validación de la ruta productiva;
10. registro del modelo efectivo y su configuración.

No basta con:

- compilar;
- devolver HTTP 200;
- producir más texto;
- producir menos texto;
- mejorar legibilidad;
- coincidir con un solo modelo.

---

## 25. Contrato de calidad

La condición de éxito es:

~~~
AUDIO ORIGINAL
AND SHA VERIFIED
AND FULL AUDIO COVERAGE
AND NO FOREIGN WORDS
AND NO UNRESOLVED AMBIGUITIES
AND WORD-LEVEL ALIGNMENT
AND INDEPENDENT MODEL EVIDENCE
AND REPRODUCIBLE CONFIGURATION
=
FORENSIC PASS
~~~

Cualquier otro resultado:

~~~
FORENSIC NOT PASSED
~~~

---

## 26. Prohibiciones absolutas

Está prohibido:

- declarar PASS por intuición;
- declarar PASS por porcentaje;
- corregir Cora para forzar coincidencia;
- usar una transcripción previa como fuente de verdad;
- ocultar discrepancias;
- borrar evidencia de ejecuciones fallidas;
- sustituir el audio original;
- mezclar resultados de SHA distintos;
- presentar un modelo menor como large-v3;
- afirmar que una prueba fue local cuando fue remota;
- afirmar que una corrida GPU terminó cuando no terminó;
- convertir amarillo en verde sin evidencia nueva.

---

## 27. Política de evolución

Cada nuevo corpus forense debe recibir:

~~~
GOLDEN-FORENSIC-YYYY-MM-DD-NNN
~~~

y conservar:

- audio;
- SHA;
- procedencia;
- transcripción candidata;
- resultados de referencia;
- informe;
- estado de aceptación.

Una mejora del motor se considera mejora sólo si no introduce regresiones en el
corpus golden existente.

---

## 28. Relación con PREPARACION-VOLCADOS

FTS-001 desarrolla el requisito de Fidelidad de PREPARACION-VOLCADOS.md.

PREPARACION-VOLCADOS define el protocolo de producto.
FTS-001 define la metodología de laboratorio necesaria para demostrar la
Fidelidad con rigor forense.

La jerarquía es:

~~~
Custodia
   ↓
Fidelidad
   ↓
FTS-001 forensic verification
   ↓
Legibilidad
~~~

La legibilidad jamás autoriza a omitir la verificación forense cuando ésta sea
requerida por la muestra o por una regresión.

---

## 29. Estado de la especificación

FTS-001 v1.0.0 establece el estándar de máxima fidelidad verificable para Khora.

El protocolo es intencionalmente conservador:

> Es preferible declarar una palabra indeterminada que aceptar como fiel una palabra que el audio no demuestra.

**Khora · FTS-001 v1.0.0 · Máxima fidelidad verificable.**
