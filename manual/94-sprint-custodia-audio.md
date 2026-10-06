# 94 — Sprint: Custodia Íntegra y Exportación del Audio de Khora

> **Paréntesis bloqueante del Sprint 93.**
>
> **Código:** AUD-05  
> **Versión:** v1.0.0  
> **Fecha:** 2026-10-05  
> **Estado:** En curso  
> **Objetivo primario:** que Khora conserve íntegramente el audio de cada dictado y permita recuperarlo/exportarlo en MP3 de forma verificable.  
> **Sprint padre:** [93 — Endurecimiento Forense de la Transcripción](93-sprint-endurecimiento-transcripcion.md)

---

## 0. Por qué este sprint existe

No tiene sentido exigir fidelidad perfecta de la transcripción si el propio sistema que genera la evidencia acústica no puede demostrar que conservó íntegramente el audio original.

Por tanto, este sprint se convierte en **prerrequisito operativo del Sprint 93**.

Mientras AUD-05 no esté cerrado:

- Vocaroo/Bukaroo no se utilizan como parte del nuevo procedimiento; el objetivo es que Khora sea autosuficiente para capturar y custodiar su propio audio;
- no se declara que Khora posee una cadena acústica confiable;
- no se utiliza un audio recuperado sin verificación como evidencia forense;
- la investigación de transcripción permanece en pausa, salvo controles aislados.

---

## 1. Objetivo concreto

### Khora debe garantizar

**Grabar → almacenar → verificar → vincular → recuperar → reproducir → exportar.**

Cada transición debe ser observable y fallar de forma explícita.

El criterio no es «el archivo existe».

El criterio es:

> **el archivo recuperado es demostrablemente el mismo conjunto de bytes que Khora recibió al capturarlo.**

La exportación MP3 es una **derivación**, no la fuente de verdad.

---

## 2. Vocabulario normativo

### Original custodial

El audio capturado por Khora antes de cualquier transformación.

### Custodia verificada

Audio almacenado que fue recuperado inmediatamente después de escribirlo y cuya longitud y SHA-256 coinciden exactamente con el original recibido.

### Audio íntegro

Todas las partes requeridas existen, tienen índices consecutivos, no están vacías y están individualmente verificadas.

### Exportación MP3

Conversión controlada del audio íntegro recuperado. El MP3 nunca sustituye al original custodial.

---

## 3. Contrato de custodia

Una parte solo puede quedar en estado:

`verificado`

después de:

1. recibir bytes;
2. calcular SHA-256;
3. cifrar;
4. escribir en Blob;
5. releer el Blob recién escrito;
6. descifrar;
7. comparar longitud;
8. comparar SHA-256;
9. registrar la parte como verificada.

Si cualquiera falla:

**la parte no se considera guardada.**

---

## 4. Contrato de sesión

Una sesión de audio debe conservar:

- `session_id`;
- número de parte;
- bytes;
- SHA-256;
- fuente;
- timestamps de la parte cuando estén disponibles;
- estado de verificación.

Los índices deben formar la secuencia:

`1, 2, 3, ..., N`

Un hueco, duplicación, parte vacía o parte no verificada hace que la sesión sea **incompleta/no exportable**.

---

## 5. Regla de archivado

Para una sesión de dictado real:

> **texto sin audio íntegramente custodiado no es un archivado válido del dictado.**

La interfaz puede conservar temporalmente el texto para recuperación, pero el botón de archivado debe bloquearse cuando el audio esperado no haya pasado la validación de custodia.

Esto elimina el comportamiento anterior en el que el texto podía terminar archivado aunque la captura de audio hubiera fallado.

---

## 6. Tolerancia a fallos de red

Cada parte debe disponer de reintentos automáticos ante fallos transitorios.

Contrato actual:

- máximo 3 intentos;
- espera incremental entre intentos;
- conservar la parte cruda en memoria mientras exista una sesión activa;
- si los 3 intentos fallan, marcar la custodia como incompleta;
- nunca presentar el fallo como éxito.

Un reintento no sustituye la verificación post-escritura.

---

## 7. Separación de la fuente de verdad

La jerarquía es:

`audio custodial original → recuperación verificada → derivaciones`

No se permite utilizar como fuente primaria:

- la vista previa ASR;
- un texto generado por reconocimiento de voz;
- el MP3 exportado;
- el texto pulido;
- otro formato intermedio.

---

## 8. Exportación MP3

Khora debe ofrecer una acción explícita:

**Exportar audio del volcado como MP3.**

Antes de generar el MP3:

1. consultar el manifiesto;
2. comprobar que `audio_status = disponible`;
3. comprobar que la custodia es válida;
4. comprobar que no faltan partes;
5. recuperar el audio completo;
6. verificar que el payload no está vacío y es audio;
7. decodificarlo;
8. convertirlo a MP3;
9. descargar la derivación.

La exportación queda bloqueada si el manifiesto no es íntegro.

### Bitrate

Predeterminado actual:

`192 kbps`

La calidad de la exportación puede configurarse, pero el original custodial nunca se reemplaza por el MP3.

---

## 9. Qué significa «100% confiable» en este sprint

No se puede prometer disponibilidad física absoluta de una infraestructura distribuida.

El contrato operativo alcanzable y verificable es más preciso:

> **Khora nunca declara como guardado un audio que no haya podido verificar integralmente.**

Por tanto, un fallo debe producir:

**bloqueo + evidencia + posibilidad de reintento**

y no:

**éxito silencioso + pérdida.**

---

## 10. Fuera de alcance

Este sprint no resuelve todavía:

- calidad lingüística de STT;
- WER;
- precisión de Whisper;
- errores de nombres;
- errores semánticos;
- fidelidad palabra por palabra;
- pulido;
- titulación.

Esos puntos regresan al Sprint 93 después del cierre de AUD-05.

---

## 11. Criterios de aceptación

### G1 — Captura

- [ ] cada dictado crea una sesión;
- [ ] cada parte posee índice;
- [ ] ninguna parte vacía llega a estado de éxito;
- [ ] se conserva la parte cruda hasta confirmar escritura.

### G2 — Custodia

- [ ] SHA-256 calculado antes de almacenar;
- [ ] Blob releído después de escribir;
- [ ] Blob descifrado correctamente;
- [ ] bytes coinciden;
- [ ] SHA-256 coincide;
- [ ] parte marcada `verificado`.

### G3 — Integridad de sesión

- [ ] índices consecutivos;
- [ ] total esperado coincide;
- [ ] todas las partes verificadas;
- [ ] suma de bytes coherente;
- [ ] no existen huecos silenciosos.

### G4 — Archivado

- [ ] una sesión de voz no puede archivarse con audio no verificado;
- [ ] un fallo de audio produce bloqueo explícito;
- [ ] el texto temporal puede recuperarse sin presentarlo como custodia acústica completa.

### G5 — Recuperación

- [ ] la API de recuperación verifica cada parte;
- [ ] verifica bytes;
- [ ] verifica SHA-256;
- [ ] rechaza sesiones incompletas;
- [ ] rechaza audio corrupto.

### G6 — Exportación

- [ ] exportación desde audio verificado;
- [ ] manifiesto validado antes de convertir;
- [ ] MP3 generado sin alterar el original;
- [ ] fallo de conversión visible;
- [ ] archivo descargable con extensión `.mp3`.

---

## 12. Definición de terminado

AUD-05 solo pasa a **CERRADO** cuando:

`G1 + G2 + G3 + G4 + G5 + G6 = PASS`

y exista una prueba real que demuestre:

**dictado → captura → almacenamiento → recuperación → reproducción → MP3**

sin pérdida ni estado falso de éxito.

---

## 13. Relación con el Sprint 93

Una vez cerrado AUD-05:

1. Khora deja de depender de Vocaroo como fuente de custodia del audio;
2. el audio de Khora se convierte en la fuente acústica primaria del laboratorio;
3. el expediente FTS puede utilizar esos audios directamente;
4. la estrategia forense de transcripción retoma su ejecución;
5. la comparación Khora/Khora contra terceros pasa a ser una herramienta de contraste, no una necesidad de custodia.

---

## 14. Estado

**ABIERTO — BLOQUEANTE PARA EL RETORNO AL TRABAJO FORENSE DE TRANSCRIPCIÓN.**

---

## 15. Versión vigente

**AUD-05 v1.0.0 — Custodia Íntegra y Exportación del Audio de Khora**
