# Preparación de Volcados · Protocolos

> Documento canónico. Define qué debe cumplir un volcado antes de llegar a la
> mesa de revisión, y qué se le muestra al operador cuando algo no se cumple.

## 1. Principio

Un volcado es la palabra dictada del operador. El sistema no puede alterarla,
perderla, aumentarla ni presentarla como algo distinto de lo que fue.

Regla rectora: **la máquina propone, el sujeto ratifica; nada se asienta en
silencio.** De ahí se sigue una consecuencia operativa que este documento hace
obligatoria: cuando un volcado no supera sus protocolos, **no se le presenta al
operador como si estuviera bien**. Se detiene en *En Preparación* y dice
exactamente por qué.

## 2. Ciclo de vida

```
capturando → EN PREPARACIÓN → EN REVISIÓN → LISTO INGESTA → INGERIDO
                   ↑ ↓
              (reintento del operador)
```

Los protocolos se aplican **en vivo durante el dictado**, sin interrumpir la
captura ni la transcripción. Al archivar, el volcado pasa por *En Preparación*
para una verificación final. Si todo se cumple, avanza solo a *En Revisión*.

*En Preparación* no es un estado de reposo ni de castigo: es la sala de espera
de lo que aún no está listo, con la causa a la vista y un reintento disponible.

## 3. Las tres abstracciones

Se agrupan por **consecuencia si fallan**, no por afinidad temática.

| Protocolo | Garantiza | Si falla |
|---|---|---|
| **Custodia** | Existe un original inmutable y su audio | Bloqueante |
| **Fidelidad** | El texto dice exactamente lo dicho | Bloqueante |
| **Legibilidad** | Forma y título de calidad | Degradable |

Custodia y Fidelidad detienen el avance. Legibilidad no: su fallo se señala,
el volcado avanza, y el operador lo resuelve cuando quiera.

---

### 3.1 Custodia · bloqueante

Sin original no hay nada contra qué contrastar. Se ejecuta primero, siempre.

**C1 · Sello del Verbatim.** Al crearse el volcado se congelan el texto y su
SHA-256 como versión 1. Ninguna operación posterior puede modificarlos. La
comparación es de caracteres crudos, sin normalización Unicode.

**C2 · Vínculo del Audio.** El audio original queda almacenado, cifrado,
vinculado a la sesión y reproducible con su tipo MIME real. Un MP3 no se
declara WebM.

**C3 · Barrera de Integridad.** Antes de confirmar cualquier transacción se
verifica que `sha256`, `texto` y `chars` no cambiaron. Si cambiaron, se
revierte.

Causas que se muestran al operador:
- `Sin versión original sellada`
- `Audio no vinculado a la sesión`
- `Audio no reproducible`
- `El texto original fue alterado durante el procesamiento`

---

### 3.2 Fidelidad · bloqueante

El texto debe corresponder a lo dicho. Ni menos, ni más, ni deformado.

**F1 · Cobertura Íntegra.** Ninguna palabra dicha se pierde. Se detecta
cobertura insuficiente comparando la transcripción contra las partes de audio
almacenadas. **No negociable.**

**F2 · Ninguna Palabra Ajena.** El texto no contiene nada que el operador no
haya dicho. Cubre dos fuentes conocidas de contaminación:

- *Fuga de instrucción*: el prompt que Khora envía al motor de transcripción
  emitido como si fuera contenido dictado.
- *Alucinación del motor*: frases que el modelo produce por sesgo de
  entrenamiento y que no existen en el audio.

**F3 · Integridad de Caracteres.** Ninguna palabra queda mutilada. Se verifica
específicamente el truncamiento de secuencias UTF-8 multibyte: cortar por
longitud en bytes en lugar de en caracteres parte las palabras acentuadas en el
punto de la tilde.

Causas que se muestran al operador:
- `Cobertura insuficiente: N segundos de audio sin texto correspondiente`
- `Se detectó texto no dictado: «...»`
- `N palabras truncadas en la primera tilde`
- `Puntuación perdida en N pasajes`

---

### 3.3 Legibilidad · degradable

Mejora la forma. Nunca toca el fondo.

**L1 · Pulido Fiel.** Redacción y organización mediante Groq · **GPT-OSS
120B**. Produce una **versión derivada**, nunca sobrescribe el verbatim. El
resultado se presenta como derivación, no como palabra literal del operador.

**L2 · Titulación Verificada.** Título descriptivo y anclado en el texto.

Contrato del título:
- Formato: `Tema central y afirmación — líneas A, B y C`
- Longitud objetivo 90–180 caracteres, máximo 220 en multihilo
- Conserva nombres propios de personas, obras, tecnologías y lugares
- Prohibidos: `Reflexiones sobre`, `Notas de`, `Resumen`, listas de palabras
  sueltas, comillas
- Las citas de evidencia deben existir literalmente en el texto fuente; si no,
  el resultado se descarta

Escalera de degradación, con el nivel siempre registrado:

| Nivel | Origen | Calidad |
|---|---|---|
| `ia` | GPT-OSS 120B con evidencia validada | Alta |
| `determinista` | Análisis de frecuencia sobre el texto completo | Media |
| `ultimo_recurso` | Recorte de las primeras palabras | Mínima |

Un título que no alcanzó nivel `ia` **se marca visiblemente** y ofrece
regeneración. El operador puede además escribirlo a mano.

Causas que se muestran al operador:
- `Falta título`
- `Título generado sin IA (nivel: determinista)`
- `El modelo de títulos no respondió`
- `Las citas del título no existen en el texto`

## 4. Orden de ejecución

```
C1 Sello del Verbatim
C2 Vínculo del Audio
C3 Barrera de Integridad
F1 Cobertura Íntegra
F2 Ninguna Palabra Ajena
F3 Integridad de Caracteres
L1 Pulido Fiel
L2 Titulación Verificada
```

Custodia antes que Fidelidad: no se puede verificar fidelidad sin original.
Fidelidad antes que Legibilidad: no se pule un texto que no es fiel.

## 5. Qué ve el operador

Cada volcado en *En Preparación* muestra sus tres marcas y el detalle de lo que
falló:

```
Folio 47 · «Dictado del 4 de septiembre»

  Custodia      ✓
  Fidelidad     ✓
  Legibilidad   ⚠  Falta título

  [ Generar título ]   [ Escribir título ]   [ Reintentar preparación ]
```

Requisitos de esta pantalla:

1. **Siempre hay causa.** Ningún volcado se detiene sin explicación legible. La
   frase `error desconocido` está prohibida.
2. **La causa distingue gravedad.** Un fallo de Legibilidad se arregla con un
   botón. Uno de Fidelidad significa que el corpus recibiría ruido: se ven
   distintos.
3. **Siempre hay reintento**, salvo que la causa exija decisión humana.
4. **Nunca hay éxito falso.** Un volcado que no superó Custodia o Fidelidad no
   aparece en *En Revisión* bajo ninguna circunstancia.
5. **Nada se pierde por un fallo.** El texto y el audio se conservan aunque
   fallen los protocolos.

## 6. Trazabilidad

Cada ejecución registra en el Log de eventos:

- protocolo y subprotocolo ejecutados
- resultado y causa en clase segura de error
- proveedor y modelo **efectivamente** usados, tomados de la respuesta real y
  no de la configuración; si el proveedor no permite verificarlo, se registra
  `Modelo efectivo no verificable`
- duración e identificador de correlación
- nivel de degradación alcanzado

## 7. Prohibiciones

- Un fallo de preparación **no puede** devolver el volcado a un estado que
  aparente normalidad. Es descarte silencioso.
- Un fallo de Legibilidad **no puede** bloquear el archivado.
- Ningún protocolo **puede** modificar el verbatim ni su SHA-256.
- Ninguna derivación **puede** presentarse como palabra literal del operador.
- Ninguna llamada a un modelo **puede** ejecutarse en la ruta crítica de la
  respuesta al operador si puede diferirse.

---

*Khora · la máquina propone, el sujeto ratifica; nada se asienta en silencio.*
