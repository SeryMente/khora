# DICTADO

**User:** Anonymous  
**Created:** 11/14/2026 17:03:20  
**Updated:** 11/15/2026 10:21:50  
**Exported:** 11/15/2026 10:28:16  
**Link:** [https://chatgpt.com/c/6af8e8b4-2048-83e8-88e1-612afd9f8b6b](https://chatgpt.com/c/6af8e8b4-2048-83e8-88e1-612afd9f8b6b)  

## Response:
14/11/2026, 4:42:05 p.m. · gpt-6-t-mini-mini

# Reporte de comparación: Dictado - PR pendientes, `main` y producción Vercel

Corte de revisión: 14 de noviembre de 2026 · Repositorio: SeryMente/khora · Producción: khora-web.vercel.app

## 1\. Resultado ejecutivo

**No hay características propias de Dictado pendientes de integrar desde los PR actualmente abiertos.**

La revisión encontró ocho PR abiertos sin fusionar. Ninguno incorpora una mejora funcional de captura, reconocimiento de voz, transcripción, edición del texto, retranscripción o interfaz de Dictado que todavía falte en la versión publicada.

Hay una diferencia entre la versión de producción y el último `main`, pero corresponde exclusivamente a dos cambios documentales. El código de la aplicación relacionado con Dictado coincide con el de `main`\.

Por tanto\:

- **Integración funcional pendiente desde PR\:** ninguna identificada.
- **Código de Dictado en producción\:** coincide con `main`\.
- **Diferencia de producción respecto al último `main`\:** dos commits documentales, sin impacto funcional identificado.
- **Validación pendiente\:** comprobar el funcionamiento real de la experiencia completa de dictado, no integrar cambios de PR.

## 2\. ¿Vercel publica el `main` más reciente?

No publica exactamente el último commit de `main`, pero sí publica el mismo código funcional de la aplicación.

| Referencia | Commit |
|--------|--------|
| `main` más reciente | `0f1e1faa9b24f68e2e3f761dc4d3a993db2f9687` |
| Producción Vercel | `ed7a48eab8b3145d0d48272f1cd1f7d8e8d0318d` |
| Diferencia | `main` tiene 2 commits adicionales |
| Comparación | `main` está 2 commits adelante y 0 atrás |

El deployment de producción está en estado `READY`, asociado a la rama `main`, y el alias `khora-web.vercel.app` apunta a ese deployment.

Los dos commits posteriores al SHA desplegado modifican únicamente\:

- `docs/frentes/dictado-voz/OBJETO-CANONICO.md`
- `docs/frentes/dictado-voz/MANIFIESTO-CUSTODIA.json`

No modifican código de la aplicación. Además, los archivos de implementación de Dictado revisados en producción tienen el mismo contenido que en `main`\.

**Conclusión\:** no hace falta un redeploy para incorporar funcionalidad de Dictado. La diferencia documental no representa una versión funcional atrasada.

## 3\. Inventario completo de PR abiertos sin fusionar

Se identificaron **8 PR abiertos**, todos sin fusionar. Siete están en estado Draft; el PR \#366 está abierto y no es Draft.

| PR | Estado | Título / contenido | Relación con Dictado |
|--------|--------|--------|--------|
| [github.com](https://github.com/SeryMente/khora/pull/349?utm_source=chatgpt.com) | Draft · No mergeable | Crear Jules como módulo funcional de servidor KHORA MCP | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/350?utm_source=chatgpt.com) | Draft · Mergeable | EP: MOD-SCRIPTPWS · KHORA 7.5.5 / EP 1.0.3 | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/354?utm_source=chatgpt.com) | Draft · No mergeable | Reintentar custodia de audio antes de archivar | Excluido: archivado de registros |
| [github.com](https://github.com/SeryMente/khora/pull/359?utm_source=chatgpt.com) | Draft · Mergeable | Inaugurar frente y tareas provisionales de Chat | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/360?utm_source=chatgpt.com) | Draft · Mergeable | Sustituir Consulta con Open WebUI integrado | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/362?utm_source=chatgpt.com) | Draft · No mergeable | Sanitizar errores de autorización de Backblaze B2 | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/364?utm_source=chatgpt.com) | Draft · Mergeable | CUSTODIA-01: ejecutor efímero de recuperación con auditoría | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/366?utm_source=chatgpt.com) | Abierto · No Draft · Mergeable | Harmonia: structural activity 0.6.0 | Ninguna |

### Clasificación del PR \#354

El PR \#354 requiere una precisión especial: aunque su título lo presenta como una corrección de Dictado, su comportamiento efectivo corresponde al proceso de **archivado de registros**\.

Sus cambios se concentran en\:

- Reintentar cargas de audio antes de archivar.
- Esperar a que terminen las transferencias pendientes.
- Verificar el manifiesto de audio antes del archivado.
- Evitar operaciones de archivado duplicadas.
- Modificar el control de la acción de reintento y archivado.
- Incorporar pruebas E2E de los escenarios de archivado.

No modifica el motor de reconocimiento de voz, la transcripción, la edición del texto, la captura inicial ni la reanudación del dictado.

**Clasificación: no es una mejora pendiente de Dictado. No debe contabilizarse como deuda de integración de este frente.**

El PR \#365, que sí fue fusionado, también corresponde a funciones de Archivo y queda fuera de esta comparación funcional de Dictado.

## 4\. Características de Dictado presentes en `main` y en producción

La revisión del código de `IngresoWorkspace.tsx` y `IngresoView.tsx`, junto con la inspección de la interfaz publicada mediante TinyFish, permitió identificar lo siguiente\:

| Característica | Evidencia en código / interfaz | Estado |
|--------|--------|--------|
| Captura mediante micrófono | `getUserMedia({audio:true})` y `MediaRecorder` | Presente |
| Reconocimiento de voz | Web Speech API: `SpeechRecognition` o `webkitSpeechRecognition` | Presente |
| Reconocimiento en español | Configuración `es-MX` | Presente |
| Reconocimiento continuo | `continuous = true` | Presente |
| Resultados parciales | `interimResults = true` | Presente |
| Incorporación progresiva de texto | Procesamiento de resultados parciales y finales | Presente |
| Edición manual del texto | Campo editable de texto de la captura | Presente |
| Edición del título | Campo de título de la captura | Presente |
| Reanudación tras edición durante el dictado | Lógica `reanudarTrasEdicionInSitu()` | Presente |
| Retranscripción desde audio almacenado | `ejecutarTranscripcionAutoritativa()` | Presente |
| Entrada de audio de Chrome | Control «Escuchar a Chrome» | Presente en interfaz |
| Adjuntar audio | Control «Adjuntar audio» | Presente en interfaz |
| Título asistido por IA | Opción «Título con IA» | Presente en interfaz |

La interfaz publicada muestra, además, el control **«Iniciar dictado»**, el estado **«Micrófono en espera»**, el área **«Texto de la captura»**, el campo **«Título de la captura»** y el menú **«Más opciones de captura»**, que incluye la acción **«Re-transcribir audio»**\.

### Un detalle de UX detectado

No se observó un control independiente y explícito de **Pausar / Reanudar**\.

Sí existe lógica para reanudar automáticamente la captura después de una edición en el texto. No es lo mismo que ofrecer al usuario un control manual de pausa y continuación.

Este punto puede considerarse una decisión de evolución de la interfaz, pero **no aparece como una característica implementada por alguno de los PR abiertos**\.

## 5\. Alcance de la inspección con TinyFish

La inspección se realizó sobre la interfaz de producción\:

[khora-web.vercel.app](https://khora-web.vercel.app/sistema/ingreso?utm_source=chatgpt.com)

Se comprobó la presencia de los controles y estados visibles de Dictado. También se revisaron las opciones de captura y los controles para proporcionar audio.

La inspección no inició una grabación real, no adjuntó archivos, ni ejecutó una transcripción. Por tanto, permite confirmar la **presencia de elementos de interfaz**, pero no demostrar por sí sola el funcionamiento real del micrófono o la precisión de la transcripción en ejecución.

## 6\. ¿Qué falta integrar de los PR en producción?

(0 pendientes de integración de Dictado)

El comparativo arroja este resultado\:

| Área de Dictado | ¿Hay un PR abierto con una mejora aún ausente en producción? |
|--------|--------|
| Captura por micrófono | No identificado |
| Reconocimiento de voz | No identificado |
| Transcripción progresiva | No identificado |
| Edición del texto | No identificado |
| Reanudación después de editar | No identificado |
| Retranscripción desde audio | No identificado |
| Interfaz y controles de Dictado | No identificado |

Los demás PR abiertos corresponden a otros frentes, infraestructura, Chat, EP, MCP o Harmonia. El PR \#354 se excluye porque su funcionalidad es de archivado.

## 7\. Trabajo que sí queda por validar

Que no existan mejoras pendientes de integración no significa que toda la experiencia esté funcionalmente validada. La revisión deja pendiente una comprobación de extremo a extremo centrada exclusivamente en Dictado\:

1. Iniciar y detener la captura real desde el micrófono.
2. Comprobar reconocimiento en español, tanto resultados parciales como finales.
3. Verificar que el texto se construya correctamente durante una sesión prolongada.
4. Editar el texto mientras se dicta y comprobar que la captura se reanude correctamente.
5. Ejecutar una retranscripción a partir del audio y comparar el resultado con el texto obtenido durante el dictado.
6. Validar la entrada de audio de Chrome y la función de adjuntar audio.

Estas son pruebas de funcionamiento y calidad. No constituyen trabajo de integración de los PR abiertos.

---

## Dictamen

**La versión de Dictado publicada en Vercel ya contiene el código funcional que está en `main`\. Ninguno de los ocho PR abiertos aporta una característica de Dictado que falte en producción.**

La única diferencia de Vercel respecto al último `main` son dos commits documentales. El PR \#354 no debe incorporarse al inventario de deuda de Dictado porque sus cambios corresponden al archivado de registros.

En consecuencia, el siguiente paso técnico pertinente no es fusionar PR ni redeplegar: es ejecutar las pruebas funcionales de Dictado indicadas y decidir, con evidencia de uso, si hace falta mejorar la experiencia con un control manual de pausa y reanudación.

## Prompt:
14/11/2026, 5:03:38 p.m.

ChatGPT-DICTADO-20261114-1702.md

Frente DICTADO

Persiste conversacion, esta en  downloads, por RDC.  No tardes mucho, con cuestiones burocráticas innecesarias.

Mantén la burocracia relacionada al marco de trabajo, limitada a estrictamente lo esencial. Es absurdo el tiempo que nos estamos tardando en resolver los ciclos de retoma de responsabilidad, etcétera.&#x20;

Adquiere cuidadosamente el contexto tomando el lugar del modelo en la conversación, adoptando su postura, su tono, su Lugar De manera que la transición sea sin costuras entre una conversación y otra.  Te pido que durante la conversación seas amigable, conciso, sobrio, poco extenso en lo que tiene que ver con la forma en la que utilizas el lenguaje en tus salidas    Finalmente, repite la salida del último ciclo en la conversación que te pido que adjuntes al frente de trabajo de manera literal y textual en el mismo formato visual que lo tenía el modelo en la conversación original.

####

## Response:
14/11/2026, 5:03:53 p.m. · gpt-6-t-mini-mini

Voy a localizar el archivo en **Downloads** mediante RDC, leer el tramo final y recuperar literalmente la salida del último ciclo. Después te la presentaré con el mismo formato, sin añadir trámites.

Encontré el archivo exacto en `C:\Users\PC 13\Downloads\ChatGPT-DICTADO-20261114-1702.md` y confirmé que es una exportación de 1.916 líneas. Estoy leyendo el cierre completo para reproducir la última salida sin reconstruirla de memoria.

La última salida completa está localizada: es el informe de comparación de PR, `main` y Vercel, cerrado con el dictamen de **cero funcionalidades propias de Dictado pendientes de integración**\. También voy a conservar la exportación original en el directorio del frente, sin tocar archivos de otros frentes.

> **Identificaste dispositivos, configuraciones y archivos descargados leyendo sus contenidos**
>
> 
>
> **Leí el último ciclo de conversación**
>
> 
>
> **Inspeccioné directorios, archivos y estado de Git en KHORA**
>
> 
>
> **Confirmando el archivo final**
>
> Estoy verificando que la copia archivada conserve exactamente la conversación completa y termine con el reporte solicitado. La coincidencia de hash ya confirma que los bytes son idénticos; ahora solo falta validar el cierre del archivo.
>
> **Confirmado el archivo final**
>
> 
>
> **Verificaste copia exacta, hashes SHA-256 y persistencia local en Git**
>
> 
>
> **Validando la persistencia local**
>
> Estoy comprobando que el archivo conserve íntegramente la conversación y el reporte final. El hash coincide, así que la copia es idéntica; también estoy evitando modificar el historial del repositorio para no afectar otros archivos.
>
> **Guardando la copia exacta**
>
> Estoy conservando la conversación completa en el espacio de trabajo, con el reporte final incluido. La verificación confirma que la copia coincide byte por byte; no estoy alterando el historial porque aún no hay una base segura para registrar cambios.
>
> **Cerrando la verificación**
>
> La conversación completa quedó copiada localmente con el reporte final incluido y verificado byte por byte. El archivo aún no está publicado en un repositorio remoto, porque el espacio de trabajo no tiene una base segura para registrar cambios sin mezclar archivos ajenos.
>
> **Validaste la persistencia local y guardaste la copia exacta**
>
> 
>
> **Verificó el estado, las ramas y el registro de Git**
>
> 
>
> **Verificó la rama principal y la existencia del archivo destino**
>
> 
>
> **Confirmando el archivo final**
>
> Estoy comprobando que la copia archivada conserve exactamente la conversación completa y termine con el reporte solicitado. La coincidencia de hash ya confirma que los bytes son idénticos; ahora solo falta validar el cierre del archivo.
>
> **Confirmado el archivo final**
>
> 
>
> **Archivada conversación exportada en GitHub sin TextEncoder**
>
> 
>
> **Leí los archivos autorizados y el archivo solicitado**
>
> 
>
> **Creaste y consultaste el archivo original de Dictado**
>
> 
>
> Procesó durante 1m 57s

La conversación completa quedó archivada en el frente Dictado, en `main`\.

- Archivo: [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/originales/ChatGPT-DICTADO-20261114-1702.md?utm_source=chatgpt.com)
- Commit: `e2de68749c4d0fa00cf7372a0efc1105eb709848`
- Lectura de vuelta: contenido idéntico.
- Copia local en `originales`\: SHA-256 coincidente con el archivo de Downloads.

A continuación, la última salida de la conversación, reproducida en su formato\:

---

# Reporte de comparación: Dictado - PR pendientes, `main` y producción Vercel

Corte de revisión: 14 de noviembre de 2026 · Repositorio: SeryMente/khora · Producción: khora-web.vercel.app

## 1\. Resultado ejecutivo

**No hay características propias de Dictado pendientes de integrar desde los PR actualmente abiertos.**

La revisión encontró ocho PR abiertos sin fusionar. Ninguno incorpora una mejora funcional de captura, reconocimiento de voz, transcripción, edición del texto, retranscripción o interfaz de Dictado que todavía falte en la versión publicada.

Hay una diferencia entre la versión de producción y el último `main`, pero corresponde exclusivamente a dos cambios documentales. El código de la aplicación relacionado con Dictado coincide con el de `main`\.

Por tanto\:

- **Integración funcional pendiente desde PR\:** ninguna identificada.
- **Código de Dictado en producción\:** coincide con `main`\.
- **Diferencia de producción respecto al último `main`\:** dos commits documentales, sin impacto funcional identificado.
- **Validación pendiente\:** comprobar el funcionamiento real de la experiencia completa de dictado, no integrar cambios de PR.

## 2\. ¿Vercel publica el `main` más reciente?

No publica exactamente el último commit de `main`, pero sí publica el mismo código funcional de la aplicación.

| Referencia | Commit |
|--------|--------|
| `main` más reciente | `0f1e1faa9b24f68e2e3f761dc4d3a993db2f9687` |
| Producción Vercel | `ed7a48eab8b3145d0d48272f1cd1f7d8e8d0318d` |
| Diferencia | `main` tiene 2 commits adicionales |
| Comparación | `main` está 2 commits adelante y 0 atrás |

El deployment de producción está en estado `READY`, asociado a la rama `main`, y el alias `khora-web.vercel.app` apunta a ese deployment.

Los dos commits posteriores al SHA desplegado modifican únicamente\:

- `docs/frentes/dictado-voz/OBJETO-CANONICO.md`
- `docs/frentes/dictado-voz/MANIFIESTO-CUSTODIA.json`

No modifican código de la aplicación. Además, los archivos de implementación de Dictado revisados en producción tienen el mismo contenido que en `main`\.

**Conclusión\:** no hace falta un redeploy para incorporar funcionalidad de Dictado. La diferencia documental no representa una versión funcional atrasada.

## 3\. Inventario completo de PR abiertos sin fusionar

Se identificaron **8 PR abiertos**, todos sin fusionar. Siete están en estado Draft; el PR \#366 está abierto y no es Draft.

| PR | Estado | Título / contenido | Relación con Dictado |
|--------|--------|--------|--------|
| [github.com](https://github.com/SeryMente/khora/pull/349?utm_source=chatgpt.com) | Draft · No mergeable | Crear Jules como módulo funcional de servidor KHORA MCP | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/350?utm_source=chatgpt.com) | Draft · Mergeable | EP: MOD-SCRIPTPWS · KHORA 7.5.5 / EP 1.0.3 | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/354?utm_source=chatgpt.com) | Draft · No mergeable | Reintentar custodia de audio antes de archivar | Excluido: archivado de registros |
| [github.com](https://github.com/SeryMente/khora/pull/359?utm_source=chatgpt.com) | Draft · Mergeable | Inaugurar frente y tareas provisionales de Chat | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/360?utm_source=chatgpt.com) | Draft · Mergeable | Sustituir Consulta con Open WebUI integrado | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/362?utm_source=chatgpt.com) | Draft · No mergeable | Sanitizar errores de autorización de Backblaze B2 | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/364?utm_source=chatgpt.com) | Draft · Mergeable | CUSTODIA-01: ejecutor efímero de recuperación con auditoría | Ninguna |
| [github.com](https://github.com/SeryMente/khora/pull/366?utm_source=chatgpt.com) | Abierto · No Draft · Mergeable | Harmonia: structural activity 0.6.0 | Ninguna |

### Clasificación del PR \#354

El PR \#354 requiere una precisión especial: aunque su título lo presenta como una corrección de Dictado, su comportamiento efectivo corresponde al proceso de **archivado de registros**\.

Sus cambios se concentran en\:

- Reintentar cargas de audio antes de archivar.
- Esperar a que terminen las transferencias pendientes.
- Verificar el manifiesto de audio antes del archivado.
- Evitar operaciones de archivado duplicadas.
- Modificar el control de la acción de reintento y archivado.
- Incorporar pruebas E2E de los escenarios de archivado.

No modifica el motor de reconocimiento de voz, la transcripción, la edición del texto, la captura inicial ni la reanudación del dictado.

**Clasificación: no es una mejora pendiente de Dictado. No debe contabilizarse como deuda de integración de este frente.**

El PR \#365, que sí fue fusionado, también corresponde a funciones de Archivo y queda fuera de esta comparación funcional de Dictado.

## 4\. Características de Dictado presentes en `main` y en producción

La revisión del código de `IngresoWorkspace.tsx` y `IngresoView.tsx`, junto con la inspección de la interfaz publicada mediante TinyFish, permitió identificar lo siguiente\:

| Característica | Evidencia en código / interfaz | Estado |
|--------|--------|--------|
| Captura mediante micrófono | `getUserMedia({audio:true})` y `MediaRecorder` | Presente |
| Reconocimiento de voz | Web Speech API: `SpeechRecognition` o `webkitSpeechRecognition` | Presente |
| Reconocimiento en español | Configuración `es-MX` | Presente |
| Reconocimiento continuo | `continuous = true` | Presente |
| Resultados parciales | `interimResults = true` | Presente |
| Incorporación progresiva de texto | Procesamiento de resultados parciales y finales | Presente |
| Edición manual del texto | Campo editable de texto de la captura | Presente |
| Edición del título | Campo de título de la captura | Presente |
| Reanudación tras edición durante el dictado | Lógica `reanudarTrasEdicionInSitu()` | Presente |
| Retranscripción desde audio almacenado | `ejecutarTranscripcionAutoritativa()` | Presente |
| Entrada de audio de Chrome | Control «Escuchar a Chrome» | Presente en interfaz |
| Adjuntar audio | Control «Adjuntar audio» | Presente en interfaz |
| Título asistido por IA | Opción «Título con IA» | Presente en interfaz |

La interfaz publicada muestra, además, el control **«Iniciar dictado»**, el estado **«Micrófono en espera»**, el área **«Texto de la captura»**, el campo **«Título de la captura»** y el menú **«Más opciones de captura»**, que incluye la acción **«Re-transcribir audio»**\.

### Un detalle de UX detectado

No se observó un control independiente y explícito de **Pausar / Reanudar**\.

Sí existe lógica para reanudar automáticamente la captura después de una edición en el texto. No es lo mismo que ofrecer al usuario un control manual de pausa y continuación.

Este punto puede considerarse una decisión de evolución de la interfaz, pero **no aparece como una característica implementada por alguno de los PR abiertos**\.

## 5\. Alcance de la inspección con TinyFish

La inspección se realizó sobre la interfaz de producción\:

[khora-web.vercel.app](https://khora-web.vercel.app/sistema/ingreso?utm_source=chatgpt.com)

Se comprobó la presencia de los controles y estados visibles de Dictado. También se revisaron las opciones de captura y los controles para proporcionar audio.

La inspección no inició una grabación real, no adjuntó archivos, ni ejecutó una transcripción. Por tanto, permite confirmar la **presencia de elementos de interfaz**, pero no demostrar por sí sola el funcionamiento real del micrófono o la precisión de la transcripción en ejecución.

## 6\. ¿Qué falta integrar de los PR en producción?

\(0 pendientes de integración de Dictado)

El comparativo arroja este resultado\:

| Área de Dictado | ¿Hay un PR abierto con una mejora aún ausente en producción? |
|--------|--------|
| Captura por micrófono | No identificado |
| Reconocimiento de voz | No identificado |
| Transcripción progresiva | No identificado |
| Edición del texto | No identificado |
| Reanudación después de editar | No identificado |
| Retranscripción desde audio | No identificado |
| Interfaz y controles de Dictado | No identificado |

Los demás PR abiertos corresponden a otros frentes, infraestructura, Chat, EP, MCP o Harmonia. El PR \#354 se excluye porque su funcionalidad es de archivado.

## 7\. Trabajo que sí queda por validar

Que no existan mejoras pendientes de integración no significa que toda la experiencia esté funcionalmente validada. La revisión deja pendiente una comprobación de extremo a extremo centrada exclusivamente en Dictado\:

1. Iniciar y detener la captura real desde el micrófono.
2. Comprobar reconocimiento en español, tanto resultados parciales como finales.
3. Verificar que el texto se construya correctamente durante una sesión prolongada.
4. Editar el texto mientras se dicta y comprobar que la captura se reanude correctamente.
5. Ejecutar una retranscripción a partir del audio y comparar el resultado con el texto obtenido durante el dictado.
6. Validar la entrada de audio de Chrome y la función de adjuntar audio.

Estas son pruebas de funcionamiento y calidad. No constituyen trabajo de integración de los PR abiertos.

---

## Dictamen

**La versión de Dictado publicada en Vercel ya contiene el código funcional que está en `main`\. Ninguno de los ocho PR abiertos aporta una característica de Dictado que falte en producción.**

La única diferencia de Vercel respecto al último `main` son dos commits documentales. El PR \#354 no debe incorporarse al inventario de deuda de Dictado porque sus cambios corresponden al archivado de registros.

En consecuencia, el siguiente paso técnico pertinente no es fusionar PR ni redeplegar: es ejecutar las pruebas funcionales de Dictado indicadas y decidir, con evidencia de uso, si hace falta mejorar la experiencia con un control manual de pausa y reanudación.

---

## Prompt:
14/11/2026, 5:08:30 p.m.

Habia trabajo que tenia que ver con extensiones de dICTADO, para incluir converaciones con maya de sesame. luego cronica personal o algo asi

## Response:
14/11/2026, 5:08:35 p.m. · gpt-6-t-mini-mini

Voy a rastrear esos términos en la conversación exportada y en el OCP de Dictado para recuperar el trabajo original y distinguirlo de ideas que solo se mencionaron.

Sí: el OCP conserva ambos antecedentes y los clasifica como paquetes separados del Dictado actual. El modo Diálogo con Maya llegó a tener una implementación y un PR fusionado; la prueba real con Maya, sin embargo, no fue aceptada. La crónica personal pertenece a un paquete más amplio de Ingreso, no al alcance actual de Dictado. Estoy comprobando el estado de su PR histórico para precisar qué quedó integrado y qué no.

> **Buscó contenido, referencias y extensiones en repositorios locales y remotos**
>
> 
>
> **Revisando el alcance histórico**
>
> Estoy contrastando las referencias a extensiones de Dictado, conversaciones con Maya en Sesame y “crónica personal”. Parece que eran paquetes históricos pendientes de evaluación, separados del alcance vigente de OCP.
>
> **Revisé el alcance histórico**
>
> 
>
> **Separando iniciativas históricas**
>
> Estoy distinguiendo dos líneas: el modo Diálogo para transcribir conversaciones del navegador y micrófono, incluso con Maya, y la posterior Crónica personal, vinculada a Ingreso y metadatos. Ambas quedaron fuera del alcance vigente.
>
> **Separaste iniciativas históricas**
>
> 
>
> **Aclarando el estado**
>
> Estoy separando la cronología: el trabajo de Diálogo sí se implementó, pero la Crónica personal pertenecía a otra línea. El PR 335 quedó cerrado sin fusionarse; ambas áreas no forman parte del alcance actual.
>
> **Aclaró el estado**
>
> 
>
> **Investigaste Maya, Sesame, Dictado y crónica personal en OCP**
>
> 
>
> **Reconstruyendo la cronología**
>
> Tienes razón: mi reporte anterior reflejaba únicamente el alcance actual. Históricamente también existieron Diálogo multipista, pensado para conversaciones con Maya, y una línea separada de Ingreso autobiográfico o Crónica personal, aún no integrada.
>
> **Reconstruí la cronología**
>
> 
>
> **Precisando el alcance**
>
> También existían requisitos de Crónica personal: texto libre, clasificación contextual y metadatos como fecha, lugar y momento. Ese paquete quedó separado del Dictado actual y su integración no fue aprobada.
>
> **Evaluaste y reconstruiste el estado histórico de Dictado y la crónica personal**
>
> 
>
> Procesó durante 1m 1s

Sí. Tienes razón: había dos líneas importantes de trabajo que mi reporte anterior no recuperó. El reporte describía correctamente el alcance estricto actual de Dictado, pero no reconstruía sus iniciativas históricas.

## 1\. Modo Diálogo: conversaciones con Maya de Sesame

(Implementación histórica fusionada)

Está documentado desde el **ciclo C022, 18 de octubre de 2026**\.

La idea era que Khora pudiera capturar simultáneamente\:

- El audio de salida de una pestaña de Chrome, donde estaría conversando con Maya de Sesame.
- Tu voz mediante el micrófono.
- Ambas fuentes por separado, con marcas temporales.
- Una transcripción organizada como diálogo, alternando los segmentos de cada fuente.

No se trataba de integrar la API de Sesame, clonar la voz de Maya ni desarrollar otro modelo de conversación. Se trataba de utilizar la captura de Chrome y el transcriptor que ya tenía Khora.

**La evolución de la solicitud fue importante\:**

- **C022\:** se aprobó construir el modo Diálogo con audio de Chrome y micrófono simultáneos.
- **PR \#321\:** la implementación se fusionó en `main`\. Se documentaron 537 pruebas unitarias globales y 24 específicas de Diálogo, además de compilación y empaquetado exitosos.
- **C027\:** probaste una conversación real con Maya y reportaste que no aparecía la transcripción. También pediste eliminar la ventana independiente y colocar Diálogo dentro de Ingreso, como subfunción de «Escuchar a Chrome», con posibilidad de exportar el resultado como volcado.
- **C029-C030\:** hubo correcciones y publicación técnica, pero las pruebas automatizadas utilizaron audio sintético. No acreditaron una conversación real con Maya funcionando correctamente.

Referencias\:

- [github.com](https://github.com/SeryMente/khora/pull/321?utm_source=chatgpt.com)
- [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/originales/DIALOGO-C022.md?utm_source=chatgpt.com)
- [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/originales/DIALOGO-INTEGRADO-C027.md?utm_source=chatgpt.com)

**Estado real\:** hay implementación histórica integrada y publicada, pero no aceptación funcional demostrada con una conversación real de Maya. Actualmente el OCP de Dictado clasifica Diálogo como paquete separado, pendiente de adjudicación.

## 2\. Crónica personal e Ingreso autobiográfico

(Paquete histórico pendiente de adjudicación)

Esto aparece en las instrucciones U01-U06 de los días **20 y 21 de octubre de 2026**\.

La propuesta era mucho más amplia que un campo de transcripción. Incluía\:

| Elemento | Comportamiento solicitado |
|--------|--------|
| Crónica personal | Entrada libre, no limitada a describir acciones o tareas |
| Checklist inteligente | Sus elementos se resuelven visualmente conforme la IA detecta contenido suficiente |
| Fecha y hora | Resolverlas automáticamente cuando exista evidencia fiable |
| Lugar | Obtener información contextual del lugar |
| Momento | Categorías temporales e inferencia contextual mediante IA |
| Metadatos | Asociar contexto de captura a diferentes tipos de ingreso |
| Microblog | Presentar el momento de manera comprensible, aunque el campo interno no se muestre explícitamente |

Hay un detalle especialmente importante de tu instrucción original: **la crónica personal debía ser libre**\. No debía obligarte a redactar sobre lo que hiciste. También querías que el campo Momento pudiera ser inferido y normalizado inteligentemente, sin introducir categorías arbitrarias.

La propuesta también incluía obtener una huella extensa del dispositivo y de la sesión de captura. Esa parte requiere una delimitación específica de privacidad y minimización antes de cualquier implementación.

### ¿Qué pasó con ese trabajo?

El PR [github.com](https://github.com/SeryMente/khora/pull/335?utm_source=chatgpt.com) llegó a abrirse, pero fue **cerrado el 30 de octubre sin fusionarse**\. No está entre los ocho PR abiertos del inventario anterior.

La rama de aquella propuesta está muy divergida respecto del `main` actual: 27 commits adelante y 407 detrás en la comparación consultada. No es una integración que pueda retomarse directamente.

Fuente de las instrucciones originales: [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/originales/INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl?utm_source=chatgpt.com)\.

## 3\. Qué significa esto para el frente actual

El OCP vigente, **Dictado v0.6.21**, separa expresamente estos paquetes\:

| Iniciativa histórica | Situación en el OCP actual |
|--------|--------|
| Dictado normal: captura, transcripción, edición y continuidad | Dentro del alcance |
| Modo Diálogo: Chrome + micrófono | Fuera del alcance actual; pendiente de adjudicación |
| Crónica personal / Ingreso autobiográfico | Fuera del alcance actual; pendiente de adjudicación |
| Benchmark, evaluación y retroalimentación | Paquete independiente pendiente |
| Fecha, hora, lugar, Momento y metadatos | Paquete separado pendiente |

La referencia principal es el apartado 4 del [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/OBJETO-CANONICO.md?utm_source=chatgpt.com)\.

**Conclusión\:** sí había más trabajo que el que recogió el último reporte. Los dos nombres que estabas recordando son **Modo Diálogo** y **Crónica personal / Ingreso autobiográfico**\. No deben desaparecer de la memoria histórica, pero tampoco deben mezclarse automáticamente con el alcance estricto que hoy gobierna Dictado.

IPZ v0.7 · DUG registrada: Samantha v396 / NX-396m (vigencia no revalidada en este turno) · Nuevos folios: ninguno asignado.

## Prompt:
14/11/2026, 5:36:19 p.m.

Necesito un relevamiento técnico exhaustivo del repositorio SeryMente/khora (estado actual de main, docs/, PRs abiertos/cerrados recientes y ramas activas) sobre dos temas:
1. "Conversación con Maya"
2. "Crónica"

No resumas de forma genérica; necesito evidencia verificable con rutas de archivo, símbolos y PRs/commits exactos para planear su implementación sin regresiones sobre main actual.

Responde exactamente con estas 5 secciones:

1. INVENTARIO FUNCIONAL (QUÉ FEATURES SON)
Para "Conversación con Maya" y para "Crónica" por separado:
- Qué existe hoy implementado en main (y qué está activo en producción).
- Qué features están definidas, pendientes o a medio implementar (en docs/, frentes, PRs abiertos como #359, #360, #366 u otros, o en ramas). Lista cada feature concreta con su comportamiento esperado de extremo a extremo.
- Si existe ambigüedad o más de una versión/propuesta en el repo, indícalo con las rutas exactas.

2. MAPA TÉCNICO DE ARCHIVOS Y CONTRATOS
Lista rutas exactas, funciones/componentes principales, endpoints API, modelos/tipos de datos, almacenamiento/persistencia y variables de entorno que tocan o requieren:
- Maya (conversación, contexto/memoria, proveedor LLM/MCP/Open WebUI, UI).
- Crónica (generación, fuentes de datos, formato, persistencia, UI).

3. PUNTOS DE ACOPLE Y RIESGO DE REGRESIÓN
- Qué archivos o flujos compartidos (Dictado, IngresoWorkspace, IngresoView, Archivo, Chat, Consulta, Auth/B2/DB, navegación) tocan directa o indirectamente Maya y Crónica.
- Qué PRs abiertos o cambios recientes podrían chocar o quedar incompatibles si trabajamos directo sobre main.

4. BLOQUEANTES Y DEPENDENCIAS EXTERNAS
- Variables de entorno, secretos, servicios externos, migraciones de base de datos, contratos MCP o permisos faltantes que impedirían probar o desplegar ambas features de extremo a extremo.

5. PRUEBAS Y VALIDACIÓN EXISTENTE
- Qué scripts de test, typecheck, lint, build y E2E existen hoy en package.json / CI, y cuáles cubren Dictado, Chat/Maya, Crónica y Archivo.

## Response:
14/11/2026, 5:36:24 p.m. · gpt-6-t-mini-mini

Voy a levantar el estado directamente desde GitHub: primero `main` y el árbol `docs/`, después el inventario de PR y ramas, y finalmente seguiré las referencias hasta código, contratos y pruebas. Separaré explícitamente lo que está implementado, lo que solo está documentado y lo que está desplegado o probado.

Hay dos hallazgos estructurales ya confirmados: el modo Diálogo tuvo PR propio fusionado (\#321), mientras que Crónica se desarrolló como parte de un paquete amplio de Ingreso U01–U06 cuyo PR \#335 se cerró sin merge. Ahora estoy verificando el código actual y si quedan ramas o PR recientes que contengan una evolución posterior de esos dos paquetes.

La comparación preliminar descubre una divergencia que cambia el diagnóstico de Crónica: la rama U06 conserva una implementación considerable —componentes, rutas y pruebas— que no está en `main`, y su PR principal se cerró sin fusionarse. En cambio, el código de Diálogo sí está en `main`; la conversación con Maya no equivale a una integración del modelo Sesame. Estoy separando ahora esas dos capas y localizando los contratos exactos de Chat/Open WebUI y de Crónica.

## Prompt:
14/11/2026, 7:42:35 p.m.

Continua.

## Response:
14/11/2026, 7:42:41 p.m. · gpt-6-t-mini-mini

Estoy afinando la parte de persistencia y dependencias porque aquí hay un riesgo concreto: el PR \#360 reutiliza `KHORA_API_URL` para un proxy Open WebUI, mientras que `main` usa esa misma variable para el backend FastAPI de `/api/v1/chat` y `/api/v1/consulta`\. No asumiré que ambos contratos apuntan al mismo servicio; lo marcaré como una incompatibilidad por resolver antes de activar el chat.

> **Verificando el estado actual**
>
> Estoy comprobando fechas exactas y diferencias entre la rama principal y los cambios recientes. También estoy ubicando la arquitectura de conversación, memoria, proveedores, MCP y la interfaz para evaluar qué falta realmente.
>
> **Rastreando la implementación**
>
> Estoy comparando la rama principal con los cambios de conversación recientes y ubicando los componentes de proveedores, memoria, MCP e interfaz. También estoy verificando fechas para separar código ya integrado de trabajo pendiente.
>
> **Verificado el estado actual y rastreada la implementación**
>
> 
>
> **Investigaste ramas, PRs y archivos clave del chat de Khora**
>
> 
>
> **Rastreando la implementación**
>
> Estoy comparando la rama principal con los cambios recientes de conversación y ubicando proveedores, memoria, MCP e interfaz. También estoy verificando fechas para distinguir código integrado de trabajo pendiente, incluyendo posibles actualizaciones de la rama de desarrollo.
>
> **Trazando el estado**
>
> Estoy contrastando la rama principal con los cambios recientes y localizando proveedores, memoria, MCP e interfaz. También estoy verificando fechas para distinguir funcionalidades integradas de trabajo pendiente y evitar presentar avances experimentales como terminados.
>
> **Rastreó la implementación y trazó el estado**
>
> 
>
> **Se buscó en 1 sitio web**
>
> 
>
> **Comparando implementaciones**
>
> Estoy separando lo desplegado de lo que solo existe en ramas. La rama de Chat está muy atrasada respecto a `main`, mientras Crónica aparece en un despliegue anterior; por eso no conviene fusionar cambios completos sin rebasarlos y revisar conflictos.
>
> **Comparaste implementaciones**
>
> 
>
> **Inspeccioné ramas, pull requests, backend, proveedores, migraciones y flujos E2E de Khora**
>
> 
>
> **Comparando implementaciones**
>
> Estoy separando lo desplegado de lo que solo existe en ramas. La rama de Chat está muy atrasada respecto a `main`, mientras Crónica aparece en un despliegue anterior; por eso no conviene fusionar cambios completos sin rebasarlos y revisar conflictos.
>
> **Comparaste implementaciones**
>
> 
>
> **Revisando el estado técnico**
>
> Estoy comparando la rama principal con cambios recientes y ubicando proveedores, memoria, MCP e interfaz. También verifico fechas para separar funcionalidades integradas, ramas atrasadas y despliegues anteriores antes de evaluar qué puede implementarse con seguridad.
>
> **Comparando implementaciones**
>
> Sigo separando lo integrado de lo experimental: la rama de Chat está muy atrasada respecto a `main`, mientras Crónica aparece en un despliegue anterior. No conviene fusionar cambios completos sin rebasar y revisar conflictos.
> 
> **1. Inventario funcional**
> 
> En `main`, el dictado/audio sí existe: captura desde `IngresoWorkspace` y `DialogoPanel`, transcripción con Groq, almacenamiento temporal/local y rutas de checkpoint. No encuentro un proveedor Sesame ni una “Maya” conversacional completa.
> 
> La conversación web actual usa `/sistema/consulta`, `/api/v1/chat` y `/api/v1/consulta`, pero el historial visual es principalmente efímero. Hay memoria SQLite y componentes RAG en `kernel`, además de Neo4j, aunque no están claramente conectados al endpoint conversacional moderno.
> 
> El servidor MCP existe por separado, con autenticación, herramientas y configuración propia. No veo un puente que permita a la conversación usar MCP directamente.
> 
> La propuesta Chat/OCP está documentada en el PR #359, con tareas para Open WebUI, núcleo conversacional, memoria tipada, contexto, recuperación, privacidad, modelos locales, evaluación y canales. El PR #360 implementa una interfaz/proxy Open WebUI, pero su rama está muy desactualizada: 35 commits adelante y 194 detrás de `main`.
> 
> Crónica aparece en ramas como `fix/cronica-checkpoint-c051-83abb5e4`, `feat/u06-cronica-personal` y el PR #335. Hay checklist, análisis, editorial y publicación, pero no en la rama principal actual. La clasificación `conversacion_maya` aparece como categoría de datos, no como integración real con Maya.
> 
> **2. Mapeando componentes**
> 
> Para dictado reviso `khora-web/app/components/ingreso/`, `IngresoWorkspace.tsx`, `IngresoView.tsx`, `DialogoPanel.tsx`, `khora-web/app/api/dictado/`, `/audio/` y `/transcribir/dialogo/`. El flujo cubre captura, transcripción, clasificación y archivado, con dependencias de Custodia, Archivo, B2 y autenticación.
> 
> Para chat, los puntos centrales son `app/sistema/consulta/page.tsx`, `components/shared/ConsultaView.tsx`, `app/api/chat/route.ts`, `app/api/consulta/route.ts`, `api/main.py` y `kernel/src/khora_kernel/engine/`. La interfaz de Consulta no equivale todavía a una Maya con memoria persistente y herramientas.
> 
> Para proveedores, el backend usa perfiles configurables de LLM, Groq para transcripción y algunas funciones editoriales, y variables Neo4j para RAG. La configuración lista `KHORA_API_URL`, `KHORA_API_KEY`, perfiles de modelo, credenciales Groq, Neo4j, B2, autenticación, MCP y publicación. No aparece una variable ni cliente Sesame.
> 
> Para Crónica, las piezas se distribuyen entre `CronicaPersonalChecklist`, `CronicaCoverage`, `cronica-editorial`, `momento-categorias`, rutas `/api/cronica/*`, `BlogRepository` y `/api/blog/editorial`. Las migraciones crean estructuras como `blog_editorial`, historial, entregas, exportación pública y rechazos. El contenido se basa en `volcado` y `volcado_version`, con cifrado, hashes y control de propietario.
> 
> La publicación externa depende de GitHub, Meta, Groq y secretos de despacho. El flujo propuesto genera borrador, exige aprobación y publica por destino; la checklist por sí sola no constituye persistencia editorial.
> 
> **3. Detectando acoplamientos**
> 
> El mayor riesgo está en compartir `IngresoWorkspace`, `IngresoView`, `DialogoPanel`, `/api/dictado`, checkpoints, almacenamiento B2, tablas de Archivo/Custodia y navegación. Crónica debe consumir contratos estables, no modificar silenciosamente el flujo de dictado.
> 
> El PR #360 toca interfaz, navegación, middleware, autenticación y proxy; además presupone un servicio Open WebUI detrás de `KHORA_API_URL`. Actualmente no hay evidencia de que ese destino exponga todos los contratos esperados, así que podría producir rutas inexistentes o sustituir Consulta antes de conectar memoria y RAG.
> 
> El MCP separado introduce otro límite: sus permisos, OAuth, sesiones y herramientas no están definidos como parte del turno conversacional. Conectar Maya a MCP requiere un contrato explícito de identidad, alcance, auditoría y aislamiento por usuario.
> 
> Los PR recientes de Custodia, Archivo, B2 y diagnóstico de autenticación pueden cambiar almacenamiento compartido. Conviene revisar esos cambios antes de tocar archivado o recuperación de audio. El PR #366 parece acotado a Harmonia y no debería mezclarse con Crónica.
> 
> **4. Priorizando bloqueadores**
> 
> Primero necesito decidir qué significa “Maya”: dictado de voz, conversación web o personaje/proveedor externo. El repositorio contiene piezas relacionadas, pero no una implementación única con ese nombre.
> 
> Para una conversación real faltan integración comprobada entre `/api/v1/chat`, el núcleo LLM, memoria persistente, recuperación contextual, identidad y herramientas MCP. La memoria de `kernel` no demuestra persistencia operativa del chat actual.
> 
> Para Crónica faltan migraciones y contratos de datos aterrizados en `main`, además de una decisión sobre categorías: hay variantes de vocabulario plano, jerarquías antiguas y checklist local. También falta confirmar que el despliegue C051 corresponda al código actualmente productivo.
> 
> El branch de Chat no debe fusionarse directamente por su divergencia. La ruta segura es rebasarlo sobre `main`, extraer únicamente contratos útiles y validar cada endpoint.
> 
> **5. Validando entregables**
> 
> Antes de aceptar Crónica, probaría: captura y transcripción intactas; clasificación sin pérdida; lectura autorizada de `volcado`; generación determinista con contenido cifrado; aprobación explícita; rechazo auditable; exportación pública sin borradores; entrega GitHub/Meta con reintentos e idempotencia.
> 
> Para Maya/Chat probaría autenticación, aislamiento entre cuentas, continuidad de contexto, memoria guardada y eliminada, recuperación relevante, respuestas sin herramientas no autorizadas, errores de proveedor, modelo local, MCP y compatibilidad con la interfaz.
> 
> Los checks deben ejecutarse desde `main` actualizado, no desde ramas atrasadas. También compararía despliegue, migraciones presentes, variables configuradas y rutas reales; una documentación de “LIVE” no basta para afirmar que Crónica permanece activa en producción.
>
> **Actualizando prioridades**
>
> Estoy incorporando el estado de ramas, dependencias, variables y pruebas. Los cambios de Chat y Crónica siguen siendo experimentales; ahora estoy delimitando qué requiere rebase, configuración externa, migraciones y validación integral antes de considerarlo listo.
>
> **Ampliando el inventario**
>
> El Chat conserva 19 tareas OCP, desde OpenWebUI y el núcleo cognitivo hasta memoria, aislamiento, evaluación y canales; casi ninguna está integrada en `main`. “Maya” aparece como categoría de entrada, no como proveedor Sesame ni personaje runtime.
> 
> **Mapeando archivos**
> 
> Dialogo/Maya usa `DialogoPanel.tsx`, `IngresoWorkspace.tsx`, `IngresoView.tsx`, `/api/transcribir/dialogo`, `/api/dictado`, `audio-dialogo.ts` y `custodia-local.ts`. La transcripción depende de `GROQ_API_KEY`; el audio se guarda mediante Backblaze B2. No hay API Sesame.
> 
> El Chat actual vive en `app/sistema/consulta/page.tsx`, `ConsultaView.tsx`, `/api/chat`, `/api/consulta` y `api/main.py`. El núcleo Python incluye historial SQLite, RAG Neo4j y proveedores configurables, pero `/api/v1/chat` no los conecta de forma comprobable. El historial visible permanece principalmente en memoria del cliente.
> 
> El servidor MCP está separado en `/api/mcp/route.ts`, con configuración OAuth y permisos propios. No existe un puente demostrado entre MCP, OpenWebUI, Maya y la memoria cognitiva.
> 
> Crónica no está en `main`. Sus implementaciones aparecen en ramas con `CronicaPersonalChecklist`, `CronicaCoverage`, `cronica-editorial`, `/api/cronica/analizar`, `/api/cronica/checklist`, `BlogRepository`, `blog/editorial` y migraciones para clasificación, historial, exportación y entregas.
> 
> El flujo editorial usa `volcado` y `volcado_version`; la rama añade `tipo_entrada` y `ofuscada`. Las tablas editoriales guardan propuestas cifradas, historial, exportaciones aprobadas, rechazos y estados de entrega. Blog puede publicar mediante GitHub y Meta, pero esos proveedores no están configurados en `.env.example`.
> 
> **Revisando acoplamientos**
> 
> La rama `feat/cora-openwebui-menu-20261108`, asociada a PR #360, está muy divergida: 35 commits adelante y 194 atrás respecto a `main`. No conviene fusionarla completa; requiere reconstrucción sobre `e2de...`.
> 
> Además, su proxy reutiliza `KHORA_API_URL`, aunque el backend actual expone `/api/v1/chat` y `/api/v1/consulta`, no el contrato completo de OpenWebUI. Falta una URL separada para el servicio OpenWebUI.
> 
> PR #359 es documentación, no implementación. PR #349 afecta MCP. PR #354 toca componentes de ingreso y audio. PR #362, #364 y #365 afectan almacenamiento, archivo o B2. PR #366 parece separado del alcance, pero reporta infraestructura CI bloqueada.
> 
> Las ramas Crónica/U06 (`feat/u06...`, `feat/dictado-u06...`, `feat/ingreso-autobiografico...`, `fix/cronica-checkpoint...`) permanecen como referencias remotas sin PR abierto. PR #334, #335, #329 y #330 están cerradas sin incorporación a `main`.
> 
> La documentación de `docs/frentes/.../cronica` combina notas históricas, contratos y propuestas; no debe confundirse con capacidad productiva desplegada. El despliegue actual de Vercel está listo sobre `ed7a...`; el runtime Crónica documentado sobre `4ff...` es histórico, no evidencia de que siga en producción.
> 
> **Listando bloqueadores**
> 
> Para Chat faltan contratos operativos entre OpenWebUI, Next, FastAPI, proveedores LLM, Neo4j, memoria y MCP. También faltan credenciales o documentación completa para perfiles Groq/local, embeddings, `MCP_*` y claves de servicio.
> 
> Para Crónica faltan migraciones aprobadas, variables Groq, secretos de despacho, GitHub, Meta y rutas de publicación. Las migraciones `034_ingreso_clasificacion.sql` y `20261019_blog_editorial.sql` existen en ramas, no en `main`.
> 
> Para Maya hace falta una prueba humana real con pestaña de Chrome, audio compartido, micrófono y consentimiento; Sesame sólo sería una fuente externa capturada por navegador. No hay integración API directa ni automatización del servicio.
> 
> Neo4j Aura y B2 requieren verificación actual. Existen correcciones posteriores para B2 y el despliegue reciente aparece listo, pero no hay prueba E2E real que confirme audio, permisos, retención y recuperación.
> 
> GitHub Actions sigue siendo un bloqueador operativo reportado por PR #366; por ello no asumiría que una rama está validada sólo porque compile localmente.
> 
> **Preparando validación**
> 
> En `main`, ejecutaría primero `npm run lint`, `npm run test:unit`, `npm run test:e2e` y `npm run build`, además de las pruebas Python bajo `api/tests`.
> 
> Para Dictado/Maya ya existen pruebas como `dialogo-archivo.test.ts`, contratos de ingreso, observabilidad de checkpoints y pruebas de dictado. No hay E2E público que cubra una pestaña real, micrófono, audio de Chrome, Groq y B2 juntos.
> 
> Las ramas Crónica incluyen pruebas específicas para checklist, cobertura, análisis, editorial, texto de blog y despacho, pero no están incorporadas a CI de `main`. El reporte C051 de 127 pruebas unitarias y 42 Chromium valida una rama histórica, no el deployment actual.
> 
> Mi recomendación: tratar Dialogo/Maya, Chat/OpenWebUI y Crónica como tres entregables separados; integrar primero contratos, persistencia y pruebas de extremo a extremo, y sólo después conectar proveedores externos y publicación.
>
> **Evaluaste arquitectura, despliegues, integraciones y pendientes E2E de Chat, Maya y Crónica**
>
> 
>
> Procesó durante 3m 8s

## 1\. INVENTARIO FUNCIONAL (QUÉ FEATURES SON)

**Corte de referencia\:** `main` apunta a `e2de68749c4d0fa00cf7372a0efc1105eb709848` $`docs(dictado): archivar conversación exportada 2026-11-14`$. El código de producto más reciente en `main` antes de los dos commits documentales de Dictado es `ed7a48eab8b3145d0d48272f1cd1f7d8e8d0318d`\.

La producción de Vercel `khora-web.vercel.app` está en `READY`, pero publica `ed7a48e...`, no el `HEAD` actual documental `e2de687...`\. Por tanto, el runtime desplegado coincide con el código de `main` en ese corte, aunque no incorpora los dos últimos cambios documentales. No tomaré la presencia de una ruta o componente como prueba de que una interacción externa fue aceptada por el usuario.

### A. Conversación con Maya

Hay que separar dos funcionalidades distintas que el historial tiende a agrupar bajo “conversación”\:

**A1. Modo Diálogo: escuchar una conversación externa con Maya y al operador.**

(Implementado en main) (Prueba humana con Maya no acreditada)

Existe una implementación que captura simultáneamente el audio de una pestaña de Chrome -donde se escucha la salida de Maya- y el micrófono del operador. Conserva los dos canales por separado, los ordena en una línea temporal común, los transcribe al detener la captura y presenta el resultado como diálogo atribuido por fuente. No es una integración con la API de Sesame ni una clonación de Maya.

Evidencia de implementación en `main`\:

- `khora-web/app/components/ingreso/DialogoPanel.tsx`\: controla la sesión, recuperación, guardado, transcripción, edición y archivo del volcado.
- `khora-web/lib/dialogo/capturar.ts`\: `capturarDialogo()` solicita `getDisplayMedia({video:true,audio:true})` y `getUserMedia({audio:...})`, crea dos `MediaRecorder`, y emite partes temporizadas con `fuente: "chrome_tab" | "microphone"`\.
- `khora-web/lib/dialogo/contrato.ts`\: `FuenteDialogo`, `TurnoDialogo`, `ManifiestoDialogo`, `ordenarTurnos()`, `formatearDialogo()` y `formatearCaptura()`\. Marca solapamientos entre fuentes y puede mostrar turnos separados por etiqueta y tiempo.
- `khora-web/app/api/transcribir/dialogo/route.ts`\: `POST` transcribe las dos pistas con `transcribirAudioConGroq()`; `GET` permite exportar la pista original de una fuente.
- `khora-web/lib/server/audio-dialogo.ts`\: `cargarAudioDialogo()` comprueba propietario, checkpoint, manifiesto, secuencia, estado verificado, tamaño y lectura íntegra de partes.

Los PR que llevaron esta función a `main` son\:

| PR | Resultado | Cambio |
|--------|--------|--------|
| [github.com](https://github.com/SeryMente/khora/pull/321?utm_source=chatgpt.com) | Fusionado; merge `81e571deaa46ad9abd0a6b91c5035abe871a8b55` | Captura simultánea Chrome + micrófono y contrato C022. |
| [github.com](https://github.com/SeryMente/khora/pull/323?utm_source=chatgpt.com) | Fusionado; merge `77d8ee012d4cbc2a719af0684a1e47434e00d56d` | Diálogo como subfunción de “Escuchar a Chrome” en Ingreso; opción “Incluir micrófono” y organización como diálogo. |
| [github.com](https://github.com/SeryMente/khora/pull/324?utm_source=chatgpt.com) | Fusionado; merge `43abf5521354df10c31ef5ce1b40cbda158b5aae` | Recibo de publicación C029. |
| [github.com](https://github.com/SeryMente/khora/pull/326?utm_source=chatgpt.com) | Fusionado; merge `f0dfbdcb2d79eb6289dacba272ddcc7ba2023063` | Correcciones de captura dual, parada y custodia C030. |

Documentación original: `docs/frentes/dictado-voz/originales/DIALOGO-C022.md` y `DIALOGO-INTEGRADO-C027.md`; evidencias: `docs/frentes/dictado-voz/evidencias/DIALOGO-C022.json`, `dialogo-browser.cjs`, `dialogo-server.cjs`, `dialogo-transcriptor.cjs`, `dialogo-ui.cjs` y `dialogo.test.ts`\.

**Límites reales de esta versión\:** la transcripción ocurre después de detener, no en vivo; las pistas se separan por fuente, no identifican automáticamente a varias personas dentro de una misma pista; la función no recupera la conversación interna, memoria ni estado de Sesame. Los originales se guardan y se someten a custodia de Khora antes del archivo. El cierre humano de una conversación real con Maya no está acreditado por pasar pruebas unitarias o mostrar la interfaz.

**A2. Chat de Khora: conversación propia con agente, contexto y memoria.**

(Evolución propuesta, no incorporada íntegramente a main)

No encontré evidencia de que “Maya” sea un proveedor LLM o una personalidad de Sesame integrada en el código actual. El repositorio contiene, por separado, una arquitectura de Chat Khora/EpisTwin: interfaz Open WebUI, agente conectado al núcleo y al grafo, recuperación de información, memoria tipada y continuidad trazable. Esta es una segunda funcionalidad; no es el Modo Diálogo.

- PR [github.com](https://github.com/SeryMente/khora/pull/359?utm_source=chatgpt.com), rama `docs/chat-front-inauguration-20261108`, introduce el OCP y 19 tareas provisionales del frente Chat. Sigue abierto y en borrador. Su OCP declara expresamente que ENT01 no está entregada ni aceptada y que Open WebUI sería interfaz, no sustituto del núcleo/grafo.
- PR [github.com](https://github.com/SeryMente/khora/pull/360?utm_source=chatgpt.com), rama `feat/cora-openwebui-menu-20261108`, propone integrar Open WebUI y reemplazar la pantalla Consulta. Sigue abierto y en borrador; el código de ese PR no está en `main`\.
- Los PR históricos \#307, \#317 y \#331, relacionados con Chat/EpisTwin/Consulta, terminaron cerrados sin merge.

La tarea `CHAT-005` del OCP \#359 pide componer la ruta con policy, estado Ht, acciones/observaciones, retrieval, generación y fVAL; `CHAT-006` pide preservar unidades, ocurrencias y anclas al original, con separación entre extracción probabilística y normalización determinista. Su criterio no es “el chat responde”: exige una traza E2E del ciclo del núcleo y que el refinamiento cambie efectivamente la consulta siguiente.

En consecuencia, para planear “conversar con Maya” hay que decidir cuál de estos objetivos se pretende recuperar: **capturar y transcribir una sesión real de Maya** $ya hay una base funcional en `main`$ o **hacer que Khora mantenga una conversación propia con un agente y memoria trazable** $arquitectura y trabajo parcial fuera de `main`$. Fusionarlos como si fueran una sola feature produciría una especificación ambigua.

### B. Crónica

(Paquete histórico extenso; no está completo en main)

“Crónica” también aparece como más de una cosa. Identifiqué al menos tres capas\:

**B1. Crónica personal dentro de Ingreso: checklist contextual y progresivo.**

La propuesta U01-U06 quería que la persona pudiera narrar libremente -no como un formulario de tareas- mientras Khora mostraba pistas sobre cuatro dimensiones: **Fecha y hora, Lugar, Momento y Qué pasa**\. Las pistas se resuelven visualmente al aparecer evidencia suficiente, pero no bloquean la captura ni la posibilidad de archivar un relato incompleto.

Existe una implementación documentada y desarrollada fuera de `main`\:

- PR [github.com](https://github.com/SeryMente/khora/pull/334?utm_source=chatgpt.com), rama `feat/dictado-u06-reconstruccion-20261022`\: añade `CronicaPersonalChecklist.tsx`, `/api/cronica/checklist`, `cronica-momento.ts`, contrato `docs/frentes/dictado-voz/CONTRATO-CRONICA-METADATOS.md` y pruebas. PR cerrado sin merge.
- PR [github.com](https://github.com/SeryMente/khora/pull/335?utm_source=chatgpt.com), rama `feat/u06-sobre-ingreso-work-1990819938695134734`\: paquete U01-U06 ampliado; incluye `CronicaCoverage.tsx`, `cronica-coverage.ts`, `cronica-editorial.ts`, `momento-categorias.ts`, `/api/cronica/analizar`, Blog texto-only, contratos y migraciones. Cerrado el 30-Oct-2026 sin merge.
- PR [github.com](https://github.com/SeryMente/khora/pull/330?utm_source=chatgpt.com), sobre la rama `feat/ingreso-autobiografico-20261019`\: propuesta “Ingreso y Blog texto-only”; también cerrado sin merge.

**Comportamientos propuestos que deben conservarse al reconstruir la feature\:**

1. Narración libre que se actualiza mientras se escribe o dicta; no obliga a rellenar campos estructurados antes de guardar.
2. Pistas para fecha/hora, momento, lugar y actividad/hecho, recalculadas a partir del texto, y que se retiran visualmente cuando se consideran cubiertas.
3. Separar la hora de recepción/captura del momento en que ocurrió el hecho; no sustituir un dato desconocido por la hora del servidor.
4. No usar IP ni encabezados de geolocalización como prueba del lugar del acontecimiento. Como máximo describen información aproximada de la conexión.
5. Distinguir actividad propia de relatos sobre terceras personas, citas, negaciones, hipótesis y planes futuros; una mención textual accidental no debería resolver un requisito.
6. Mantener texto y originales; una transcripción incompleta no debe sustituir una versión previa válida.
7. Dejar la Crónica abierta a ideas, emociones, sensaciones, observaciones o hechos: no restringirla a una lista de acciones.
8. No confundir checklist resuelto con verdad factual, ratificación humana, incorporación al corpus autobiográfico o consentimiento de publicación.

**B2. Generación editorial de una Crónica a partir del relato.**

En la rama de \#335 también se define una propuesta editorial de cobertura completa: `cronicaUnits()` divide el original en unidades; `validateCronica()` verifica que la respuesta cubra todas las unidades, asocia el resultado con el hash de origen y devuelve `requiresReview: true`\. La instrucción editorial pide corregir redacción, puntuación y muletillas sin aportar hechos, fechas, lugares, motivaciones, conclusiones ni moralejas. La respuesta es una propuesta para revisión, no una publicación autorizada.

Piezas: `khora-web/lib/ingreso/cronica-editorial.ts`, `khora-web/lib/server/cronica-editorial.ts`, `khora-web/app/api/cronica/analizar/route.ts`, `khora-web/tests/unit/cronica-editorial.test.ts` y `cronica_analizar_route.test.ts`\.

**B3. Blog / publicación de la Crónica.**

Un tercer bloque prepara un flujo editorial para convertir una narración revisada en contenido de Blog y, a partir de ahí, en publicación externa. Esto no equivale al checklist ni a la generación editorial. El repositorio histórico tiene `BlogTextWorkspace.tsx`, API `/api/blog/editorial` y `/api/blog/dispatch`, contrato `khora-web/contracts/blog-editorial-v1.md`, migración `20261019_blog_editorial.sql`, servicios en `lib/server/blog/` y workflows de GitHub Actions. Hay además ramas separadas para `feat/blog-text-workflow-20261019`, `feat/blog-editorial-sync-20261019` y `feat/blog-intent-recovery-20261020`\.

La crónica C051 -archivo `docs/frentes/dictado-voz/evidencias/C051-cronica-b2.md` en la línea de trabajo `fix/cronica-checkpoint-c051-83abb5e4`- registra una versión posterior de la experiencia de checklist, conservación y publicación técnica, así como una prueba real del recorrido de captura. Pero **ese recibo corresponde a una candidata y despliegue de otra revisión**, no demuestra que el código de Crónica de esa rama haya entrado a `main` actual.

**Ambigüedad importante\:** `CONTRATO-CRONICA-METADATOS.md` en el trabajo U06 pasó de una taxonomía jerárquica de Momento -general/concreto/especializado- a un vocabulario plano y cotidiano. En cambio, `momento-categorias.ts` de la rama \#335 todavía codifica las tres categorías y términos especializados. La revisión más tardía del contrato dice que esa jerarquía fue retirada. No se debe reimplementar el catálogo antiguo sin resolver primero esta contradicción.

**Ampliación del inventario de Chat/Maya: las 19 tareas documentales de \#359**

El backlog de `frentes/chat/` no es solamente “poner Open WebUI”. Define una arquitectura de conversación mucho más amplia. Sus tareas provisionales son\:

| Tarea | Feature concreta y criterio esperado |
|--------|--------|
| `CHAT-004-OPENWEBUI` | Interfaz Open WebUI real dentro de Khora, autenticada, integrada con su navegación y sin hosting adicional. |
| `CHAT-005-AGENTE-NUCLEO` | Conectar el chat al ciclo del núcleo: política → acción → observación → retrieval → generación → fVAL. El refinamiento debe modificar la siguiente consulta. |
| `CHAT-006-MEMORIA-TIPADA` | Conversar con el archivo personal preservando unidades, ocurrencias, anclas al original y tipos `Entity/Literal/Blank`; la extracción no debe autoaceptarse. |
| `CHAT-007-IDENTIDAD-LEDGER` | Resolver homónimos, alias y pronombres; separar aceptación/rechazo de contenido y autorización de procesamiento; conservar juicios y revocaciones en un ledger durable. |
| `CHAT-008-REVISION-INDICE` | Versionar fuentes, modelos, prompts, juicios y políticas; invalidar derivados afectados y evitar mezclar índices de generaciones distintas. |
| `CHAT-009-LEIDEN-FSUM` | Crear comunidades reproducibles y resúmenes sobre subgrafos inducidos, respetando membresías y visibilidad. |
| `CHAT-010-RETRIEVAL` | Recuperación topológica con fuentes exactas, anclas, expansión por comunidades y respuesta condicionada a evidencia; ausencia de soporte debe producir insuficiencia. |
| `CHAT-011-HT-REFINE-FVAL` | Hacer causal el estado Ht, conectar REFINE con la consulta posterior y ejecutar fVAL global en todas las rutas de respuesta. |
| `CHAT-012-AISLAMIENTO` | Propietario y ámbito propagados por API, grafo, índices, resúmenes, cachés e historial; pruebas multiusuario, reinicio y revocación. |
| `CHAT-013-CORPUS-EGRESS` | Identificar origen y lote del corpus personal, minimizar información y aprobar por separado cada proveedor/destino externo. |
| `CHAT-014-BORRADO` | Propagar el olvido a índices, resúmenes, proyecciones y respuestas futuras sin reescribir silenciosamente el historial. |
| `CHAT-015-VISION-EFIMERA` | Activar visión solo ante déficit visual; emplear el payload original y evitar guardar las inferencias como hechos del grafo. |
| `CHAT-016-MODELO-LOCAL` | Añadir modelo local mediante los mismos contratos de núcleo, política y memoria, sin fallback silencioso ni mezcla de índices. |
| `CHAT-017-EVALUACION` | Evaluación reproducible con corpus, parámetros, hashes, jueces, ablaciones y límites explícitos. |
| `CHAT-018-CHANNELS` | Comunicación durable entre frentes, threads, permisos, correlación, idempotencia, acuses y recuperación. |
| `CHAT-019-ACEPTACION-ENT01` | Prueba humana positiva, negativa y de repregunta; persistencia, aislamiento, rollback y conformidad antes de abrir ENT02. |

Las tareas `CHAT-005` a `CHAT-012` aparecen principalmente como trabajo en curso; `CHAT-013`, `CHAT-016`, `CHAT-018` y `CHAT-019` aparecen como pendientes. El documento rector es [github.com](https://github.com/SeryMente/khora/blob/5b67a9a5a8a753b1a6c4be76c27e57dc36264b75/frentes/chat/OBJETO-CANONICO.md?utm_source=chatgpt.com)\. No existe aún en `main`\.

---

## 2\. MAPA TÉCNICO DE ARCHIVOS Y CONTRATOS

### A. Maya: captura de conversación externa

**Flujo de interfaz y captura en `main`**

| Ruta | Símbolos/función | Responsabilidad |
|--------|--------|--------|
| `khora-web/app/components/ingreso/IngresoWorkspace.tsx` | `IngresoWorkspace`, `IngresoSeleccionado`, `IngresoContenido` | Selecciona el modo normal o Diálogo mediante `modo=dialogo`; instancia `DialogoPanel`\. |
| `khora-web/app/components/ingreso/DialogoPanel.tsx` | `DialogoPanel`, `start`, `finish`, `transcribe`, `archive`, `retry`, `exportAudio` | Ciclo completo de captura, recuperación, checkpoint, transcripción, edición y archivo. |
| `khora-web/app/components/shared/IngresoView.tsx` | `IngresoView`, `IngresoViewState`, `IngresoViewActions` | UI compartida; incorpora “Escuchar a Chrome”, “Incluir micrófono” y “Organizar como diálogo”. |
| `khora-web/app/components/ingreso/AudioActivity.tsx` | `AudioActivity` | Muestra actividad de las fuentes de audio. |
| `khora-web/lib/dialogo/capturar.ts` | `capturarDialogo`, `ParteDialogo`, `CapturaDialogo` | Captura simultánea y segmentación de las fuentes. |
| `khora-web/lib/dialogo/contrato.ts` | `FuenteDialogo`, `TurnoDialogo`, `ManifiestoDialogo`, `ordenarTurnos`, `formatearDialogo` | Modelo de diálogo, cronología y formato de turnos. |
| `khora-web/lib/dialogo/transcribir.ts` | `transcribirPistasDialogo` | Procesa cada fuente por separado y combina sus segmentos temporales. |
| `khora-web/lib/server/audio-dialogo.ts` | `cargarAudioDialogo` | Recupera pistas verificadas y manifiesto de una sesión del propietario autenticado. |

El contrato de diálogo es\:

```ts
type FuenteDialogo = "microphone" | "chrome_tab";

type TurnoDialogo = {
  fuente: FuenteDialogo;
  start_ms: number;
  end_ms: number;
  texto: string;
  solapado?: boolean;
};
```

El manifiesto `version: 1` conserva las etiquetas de cada fuente, el estado, el número esperado de partes, los turnos y la opción `organizarComoDialogo`\. El orden se calcula con los tiempos de inicio y final; el código marca solapamientos entre las dos pistas.

**Endpoints**

| Endpoint | Operación | Contrato |
|--------|--------|--------|
| `/api/dictado/checkpoint` | `GET` y `POST` | Bootstrap de propietario, snapshots, recuperación y revisiones. Acepta `fuenteEntrada: "dialogo"` y un manifiesto de diálogo. |
| `/api/audio` | `POST` | Recibe cada parte de audio, cifra, almacena y verifica la lectura de vuelta. |
| `/api/transcribir/dialogo` | `POST` | Recibe `sessionId`, carga las dos pistas y devuelve turnos, fuentes fallidas y estado de transcripción. |
| `/api/transcribir/dialogo` | `GET` | Descarga una pista original concreta: `microphone` o `chrome_tab`\. |
| `/api/dictado` | `POST` | Archiva el resultado como volcado de origen `dialogo`, junto con las referencias a las partes originales. |

El endpoint de transcripción invoca\:

`transcribirAudioConGroq(..., { verboseJson: true, language: null, preserveVerbatim: true, allowEmpty: true })`

Por tanto, utiliza Groq Whisper como transcriptor, no un modelo de Sesame. El resultado conserva segmentos y tiempos del proveedor, y Khora los ordena y etiqueta.

**Almacenamiento y persistencia**

- `khora-web/lib/client/custodia-local.ts`\: IndexedDB `khora-custodia-v1`, almacenes `keys` y `records`; guarda snapshots y blobs locales cifrados con AES-GCM y una clave no exportable por propietario.
- `khora-web/lib/server/dictado.ts`\: crea o asegura la estructura de sesiones/partes y ejecuta `guardarDictado()`\.
- `khora-web/db/migrations/010_dictado_sessions_and_parts.sql`\: `dictado_session` y `dictado_audio_parte`\.
- `khora-web/db/migrations/030_custodia_continua.sql`\: añade propiedad y checkpoints; crea `dictado_checkpoint`\.
- `khora-web/db/migrations/031_custodia_reconciliacion.sql`\: historial y trabajos de reconciliación.
- `khora-web/lib/server/object-storage.ts`\: transporte de objetos Backblaze B2.
- `khora-web/lib/server/cripto.ts`\: cifrado de texto y bytes; los objetos de audio usan el sobre `KHC1`\.

No hay una tabla separada `maya_conversation`\. El modo Diálogo usa la infraestructura de sesiones, checkpoints, audio y volcados que comparte con Ingreso.

### B. Maya: Chat de Khora, contexto, memoria, LLM y MCP

Esta es otra arquitectura, con una diferencia esencial: **el endpoint de chat que existe en `main` no ejecuta el ciclo completo del núcleo EpisTwin**\.

**UI y API actuales de `main`**

| Ruta | Símbolos | Responsabilidad |
|--------|--------|--------|
| `khora-web/app/sistema/consulta/page.tsx` | `ConsultaPage`, `handleSubmit` | Mantiene `mensajes`, `perfil`, `modeloOverride` y modo grafo en estado React; llama a `/api/chat` o `/api/consulta`\. |
| `khora-web/app/components/shared/ConsultaView.tsx` | `ConsultaView`, `ConsultaViewState` | Interfaz de chat multi-turno, perfil, selección de modelo y resultados. |
| `khora-web/app/api/chat/route.ts` | `POST` | Valida sesión, envía mensajes al backend FastAPI y devuelve SSE. |
| `khora-web/app/api/consulta/route.ts` | `POST` | Llama al endpoint de consulta GraphRAG y devuelve fragmentos/subgrafo/fuentes. |
| `api/main.py` | `endpoint_chat`, `endpoint_consulta` | Endpoints FastAPI `/api/v1/chat` y `/api/v1/consulta`\. |
| `kernel/src/khora_kernel/proveedores/llm_generico.py` | `ProveedorLLMGenerico`, `crear_proveedor_por_perfil` | Cliente LLM OpenAI-compatible, streaming, embeddings y selección explícita de proveedor. |

**Contrato de chat actual**

En Python\:

```python
class MensajeChat(BaseModel):
    rol: str
    contenido: str

class ChatRequest(BaseModel):
    mensajes: List[MensajeChat]
    perfil: str
    modelo_override: Optional[str] = None
```

`endpoint_chat()` crea un proveedor según el perfil, transforma los mensajes y devuelve un stream SSE con eventos `chunk`, `usage`, `fin` o `error`\.

El historial de esa conversación vive en el estado React de `ConsultaPage` mientras permanece montada la pantalla. No hay en ese flujo una tabla de chats o mensajes persistentes.

**Consulta GraphRAG actual**

`endpoint_consulta()` es un circuito separado\:

- Construye `Neo4jMemoriaOrganizada`\.
- Crea `ProveedorOpenAICompatible` para embeddings.
- Instancia `RetrieverGraphRAG`\.
- Ejecuta `retriever.consultar()`\.
- Devuelve `fragmentos`, `subgrafo`, `suficiencia`, `resumenes_incluidos` y `degradacion_declarada`\.

No es un paso invocado desde `endpoint_chat()`\.

**Núcleo y memoria existentes, pero no conectados al endpoint de chat**

| Ruta | Símbolos | Función |
|--------|--------|--------|
| `kernel/src/khora_kernel/engine/core.py` | `ejecutar_ciclo`, `_policy`, `_retrieve`, `_refine`, `_answer` | Orquesta el ciclo cognitivo. |
| `kernel/src/khora_kernel/engine/history.py` | `Ht`, `HtStep`, `HtEvidence`, `save_ht`, `load_ht` | Estado Ht e historial en SQLite. |
| `kernel/src/khora_kernel/engine/orchestrator.py` | `ask_with_fallback` | Orquestación con fallback. |
| `kernel/src/khora_kernel/engine/fval.py` | `fval`, `get_verdict` | Evaluación de suficiencia y validación. |
| `kernel/src/khora_kernel/consulta/retriever.py` | `RetrieverGraphRAG` | Recuperación del grafo. |

`core.py` y `history.py` demuestran que hay componentes del núcleo y memoria. No demuestran que el chat actual los ejecute. De hecho, el backlog `CHAT-005`, `CHAT-006`, `CHAT-010` y `CHAT-011` existe precisamente para conectar y validar ese recorrido.

**MCP actual**

- `khora-web/app/api/mcp/route.ts`\: servidor MCP con `McpServer`, transporte Streamable HTTP, autenticación y herramientas.
- `khora-web/lib/server/mcp-config.ts`\: `getMcpConfig()`, validación de configuración OAuth y metadatos del recurso protegido.
- `khora-web/lib/server/mcp-tool-contract.ts`\: `MCP_TOOL_SCOPES`, `describeMcpTool`\.
- `khora-web/lib/server/mcp-normative.ts`\: compuertas de ciclo normativo.

MCP es un servidor independiente. No encontré en `main` un puente que lo convierta en proveedor de herramientas del Chat actual, ni evidencia de que Open WebUI esté conectado a él.

**Propuesta Open WebUI de PR \#360**

Esta es la implementación candidata, no desplegada\:

- `khora-web/app/chat/page.tsx`\: pantalla que contiene el iframe.
- `khora-web/app/chat/frame/page.tsx`\: fallback de la interfaz.
- `khora-web/app/api/khora-chat/proxy/route.ts`\: proxy HTTP autenticado.
- `khora-web/lib/server/chat-proxy.ts`\: `proxyOpenWebUI()`, `chatSubject()`, `chatSignature()`\.
- `khora-web/lib/config/llm-profile.ts`\: tipo `PerfilProveedor`\.
- `khora-web/app/navigation/registry.ts`\: sustitución del acceso Consulta por Chat.
- `khora-web/middleware.ts`\: integración con rutas y autenticación.

El proxy calcula una identidad a partir de `auth()` y firma HMAC los requests servidor-servidor. Contiene allowlist y restricciones sobre operaciones administrativas; no expone la API key en el navegador ni reenvía cookies upstream.

### C. Crónica: checklist, metadatos, generación editorial y publicación

**Estado\:** ninguna de estas piezas está actualmente incorporada como feature de producto en `main`\. El código existe en ramas y PR históricos.

| Ruta en rama histórica | Símbolos/funciones | Función |
|--------|--------|--------|
| `khora-web/app/components/ingreso/CronicaPersonalChecklist.tsx` | `CronicaPersonalChecklist` | Checklist semántico con actualización durante la escritura. |
| `khora-web/app/api/cronica/checklist/route.ts` | `POST` | Análisis autenticado con Groq; devuelve criterios y metadatos de la petición. |
| `khora-web/lib/contracts/cronica-momento.ts` | `MOMENTOS_HABITUALES`, `normalizarMomento`, `esMomentoPredefinido` | Vocabulario plano y normalización de Momento. |
| `khora-web/app/components/ingreso/CronicaCoverage.tsx` | `CronicaCoverage` | Checklist local que se resuelve a partir de evidencia textual; animación reversible de elementos cubiertos. |
| `khora-web/lib/ingreso/cronica-coverage.ts` | `analyzeCronicaCoverage` | Detección lexical contextual de fecha/hora, momento, lugar y actividad. |
| `khora-web/lib/ingreso/momento-categorias.ts` | `VOCABULARIO_MOMENTO`, `evaluarSugerenciaMomentoIA` | Taxonomía histórica jerárquica de momentos y evaluación de nuevos términos. |
| `khora-web/lib/ingreso/cronica-editorial.ts` | `cronicaUnits`, `validateCronica`, `CRONICA_INSTRUCTION` | Divide la fuente y valida cobertura de una propuesta editorial. |
| `khora-web/lib/server/cronica-editorial.ts` | `elaborarCronica` | Genera la propuesta editorial con Groq. |
| `khora-web/app/api/cronica/analizar/route.ts` | `POST` | Endpoint histórico de análisis de cobertura con Groq. |
| `khora-web/app/components/ingreso/TipoEntradaControl.tsx` | `TipoEntradaControl` | Clasifica la entrada; incluye `blog_personal`\. |

El tipo de propuesta editorial incluye\:

```ts
type CronicaProposal = {
  method: "cronica-sobria-v1";
  sourceHash: string;
  body: string;
  requiresReview: true;
  coverage: {
    unit: "utf16";
    start: number;
    end: number;
    quote: string;
    text: string;
  }[];
};
```

La cobertura acredita qué fragmentos de origen se procesaron, no equivalencia semántica ni verdad factual.

**Blog y publicación**

| Ruta en rama histórica | Elemento | Función |
|--------|--------|--------|
| `khora-web/app/components/blog/BlogTextWorkspace.tsx` | `BlogTextWorkspace` | Editor/revisión de publicación de texto. |
| `khora-web/app/api/blog/editorial/route.ts` | `POST` | Recupera una fuente propia, elabora propuesta, gestiona metadatos y consentimiento editorial. |
| `khora-web/app/api/blog/dispatch/route.ts` | `POST` | Ejecuta un destino de publicación por llamada. |
| `khora-web/lib/server/blog/repository.ts` | `BlogRepository` | Valida dueño, fuente, revisión, hash, aprobación y rechazo. |
| `khora-web/lib/server/blog/providers.ts` | `GitHubBlog`, `MetaPage` | Publicación y comprobación en GitHub Pages y Facebook. |
| `khora-web/lib/server/blog/outbox.ts` | `PostgresDelivery` | Outbox, leases, reintentos y estados de entrega. |
| `khora-web/lib/server/blog/delivery.ts` | `deliver` | Secuencia de publicación y verificación de recibos. |
| `khora-web/contracts/blog-editorial-v1.md` | Contrato `blog-editorial-v1` | Versionado, aprobación, representación pública, consentimiento y límites. |

**Persistencia propuesta en el paquete U06/Blog**

- `khora-web/db/migrations/034_ingreso_clasificacion.sql`\: añade `volcado.tipo_entrada` y `volcado.ofuscada`\.
- `khora-web/db/migrations/20261019_blog_editorial.sql`\: crea `blog_editorial`, `blog_editorial_history`, `blog_delivery`, `blog_public_export`, `blog_publication_refusal` y `blog_refusal_events`\.
- La fuente sigue siendo `volcado`/`volcado_version`; `BlogRepository.source()` valida propietario, clasificación, versión y SHA antes de descifrar el texto.
- Las propuestas/editoriales se guardan cifradas; la aprobación genera un snapshot y digest vinculados a una revisión.
- `blog_delivery` mantiene el estado por destino (`blog`, `facebook`\), recibos, intentos y leases.
- La vista `blog_public_export` solo expone proyecciones aprobadas o tombstones, no borradores ni cifrados.

**Documentación que no es implementación activa**

- `docs/frentes/dictado-voz/originales/INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl`\: instrucciones U01-U06 originales.
- `docs/frentes/dictado-voz/CONTRATO-CRONICA-METADATOS.md`\: contrato histórico del checklist y Momento.
- `docs/frentes/dictado-voz/evidencias/C051-cronica-b2.md`\: crónica/evidencia de una candidata posterior, no fuente de runtime en `main`\.
- `docs/frentes/harmonia/cronica/` y `frentes/notas/cronica/`\: crónicas de continuidad de otros frentes; no son la feature Crónica personal.
- `docs/frentes/dictado-voz/OBJETO-CANONICO.md`, §4: clasifica explícitamente Diálogo multipista e Ingreso general/Crónica/metadatos como paquetes separados, fuera del alcance estricto actual de Dictado.

---

## 3\. PUNTOS DE ACOPLE Y RIESGO DE REGRESIÓN

### A. Acoplamientos directos

**Diálogo / Maya**

El camino directo es\:

`IngresoWorkspace` → `DialogoPanel` → `IngresoView` → `capturarDialogo` → `custodia-local` / `/api/audio` / `/api/dictado/checkpoint` → `/api/transcribir/dialogo` → `cargarAudioDialogo` → `transcribirAudioConGroq` → `/api/dictado`\.

Las zonas sensibles son\:

- `IngresoWorkspace.tsx` y `IngresoView.tsx`\: UI compartida entre dictado, captura Chrome, diálogo y recuperación.
- `lib/server/dictado.ts`\: archivo común de volcados y partes.
- `/api/audio`, `/api/dictado/checkpoint` y `/api/dictado`\: propiedad, almacenamiento, hashes, checkpoints y cierre de sesión.
- `object-storage.ts` y `cripto.ts`\: transporte B2 y cifrado de audio.
- Archivo/Custodia: el archivo del Diálogo genera un volcado, no una conversación independiente de Maya; cualquier cambio a su archivado o revisión puede repercutir en el flujo.

**Chat/Maya**

`ConsultaPage` → `ConsultaView` → `/api/chat` → FastAPI `/api/v1/chat` → proveedor LLM.

La consulta al grafo va por otra ruta\:

`ConsultaPage` → `/api/consulta` → FastAPI `/api/v1/consulta` → `RetrieverGraphRAG` → Neo4j.

Es una bifurcación de arquitectura: una nueva conversación con memoria no debería limitarse a sustituir el componente UI. Debe decidir qué endpoint controla el ciclo del núcleo y cómo se unen el historial, la recuperación y la evidencia.

**Crónica**

La integración histórica coloca Crónica dentro de `IngresoWorkspace`/`IngresoView`; por tanto, toca controles y estado que también usa Dictado/Diálogo. Para publicación, además, comparte\:

- `volcado` y `volcado_version`\.
- `DATABASE_URL`, cifrado y autenticación.
- La cadena de autorización/consentimiento.
- El archivo original y su revisión.
- Almacenamiento/recuperación de audio, aunque la representación pública histórica se definió como texto-only en determinados cortes.

No debe confundirse ese acoplamiento técnico con dependencia organizativa: el OCP actual de Dictado excluye explícitamente Crónica y Diálogo multipista.

### B. PR abiertos y cerrados que pueden chocar con `main`

| PR / rama | Estado | Evaluación de compatibilidad |
|--------|--------|--------|
| [github.com](https://github.com/SeryMente/khora/pull/360?utm_source=chatgpt.com) `feat/cora-openwebui-menu-20261108` | Abierto, draft | Riesgo alto para Chat/Consulta/navegación. Cambia 27 archivos y su comparación con `main` actual está divergida: 35 commits por delante y 194 por detrás. No fusionar directamente. |
| [github.com](https://github.com/SeryMente/khora/pull/359?utm_source=chatgpt.com) `docs/chat-front-inauguration-20261108` | Abierto, draft | Solo documentación: 24 archivos del nuevo frente `frentes/chat/`\. Tiene 1 commit por delante y 194 por detrás de `main`\. Canonizarlo requiere revisión, pero no cambia runtime. |
| [github.com](https://github.com/SeryMente/khora/pull/335?utm_source=chatgpt.com) `feat/u06-sobre-ingreso-work-1990819938695134734` | Cerrado sin merge | Riesgo muy alto. Paquete de 281 archivos, 27 commits por delante y 407 por detrás. Toca `IngresoWorkspace`, `IngresoView`, `DialogoPanel`, Blog, MCP, migraciones, almacenamiento y pruebas. No es una base segura de integración directa. |
| [github.com](https://github.com/SeryMente/khora/pull/330?utm_source=chatgpt.com) `feat/ingreso-autobiografico-20261019` | Cerrado sin merge | Rama con 272 archivos de diferencia; 31 commits por delante y 748 por detrás. Contiene el otro bloque amplio de Ingreso/Blog. |
| [github.com](https://github.com/SeryMente/khora/pull/334?utm_source=chatgpt.com) `feat/dictado-u06-reconstruccion-20261022` | Cerrado sin merge | Variante compacta de checklist: 8 archivos, 40 commits por delante y 549 por detrás. No integrar sin resolver la versión de Momento y contrastar con U06. |
| [github.com](https://github.com/SeryMente/khora/pull/329?utm_source=chatgpt.com) `feat/blog-editorial-sync-20261019` | Cerrado sin merge | Contrato y sincronización Blog; 25 archivos. No aporta una publicación activa en `main`\. |
| [github.com](https://github.com/SeryMente/khora/pull/349?utm_source=chatgpt.com) `feat/khora-mcp-module-jules-20261101` | Abierto, draft | Modifica `/api/mcp/route.ts`, `mcp-tool-contract.ts` y el registro/contexto de módulos. Es relevante si el futuro Chat/Maya invoca herramientas MCP. |
| [github.com](https://github.com/SeryMente/khora/pull/354?utm_source=chatgpt.com) | Abierto, draft | Aunque su título menciona Dictado, está clasificado en Custodia. Modifica `IngresoWorkspace.tsx`, `IngresoView.tsx` y pruebas de audio; riesgo directo de conflicto con cualquier cambio en el espacio de captura. |
| [github.com](https://github.com/SeryMente/khora/pull/362?utm_source=chatgpt.com) | Abierto, draft | Modifica `lib/server/object-storage.ts` y el preflight B2; acoplamiento directo con captura y conservación de originales. |
| [github.com](https://github.com/SeryMente/khora/pull/364?utm_source=chatgpt.com) | Abierto, draft | Ejecutor operativo de recuperación de Archivo/Custodia; no agrega la feature Crónica, pero toca la frontera de recuperación. |
| [github.com](https://github.com/SeryMente/khora/pull/365?utm_source=chatgpt.com) | Fusionado | Introduce en producción la explicación de transcripciones sin audio y la ruta de Archivo/Custodia. Está en el commit desplegado `ed7a48e...`\. |
| [github.com](https://github.com/SeryMente/khora/pull/366?utm_source=chatgpt.com) | Abierto, no draft | Trabajo de Harmonia; sus archivos están bajo `Harmonia/` y documentación de Harmonia, sin solapamiento directo relevante con Maya/Crónica. |

**Ramas remotas que aún conservan trabajo relevante**

| Rama | HEAD | Estado y lectura |
|--------|--------|--------|
| `docs/chat-front-inauguration-20261108` | `5b67a9a5a8a753b1a6c4be76c27e57dc36264b75` | Backlog Chat, PR \#359 abierto. |
| `feat/cora-openwebui-menu-20261108` | `443e69ab640c90bc42c3e561aba9f5c25c1c59c9` | Open WebUI, PR \#360 abierto. |
| `fix/cronica-checkpoint-c051-83abb5e4` | `1dda351906a8a6e1998952248861b44ad260125d` | Candidato de continuidad Crónica; no hay PR abierto asociado. |
| `feat/u06-sobre-ingreso-work-1990819938695134734` | `0e352fbfe03a902011c6c7e0bb63e4148ce8d58e` | U01-U06; \#335 cerrado sin merge. |
| `feat/ingreso-autobiografico-20261019` | `4fb3b7d5f07efef770eac398646ff9d87f86b505` | Ingreso/Blog; \#330 cerrado sin merge. |
| `feat/dictado-u06-reconstruccion-20261022` | `a95f669d7f836a3e26a83d31242f4d288bfe6fe2` | Checklist alternativo; \#334 cerrado sin merge. |
| `feat/blog-intent-recovery-20261020` | `34ac81c222397ab0e1e91c77cec8b9db21f6a903` | Recuperación de decisión/consentimiento Blog; rama sin PR abierto identificado. |
| `feat/blog-text-workflow-20261019` | `01a4482fec3c9e53a8513f661c05627a682775f1` | Flujo de Blog texto-only; rama histórica. |
| `feat/blog-editorial-sync-20261019` | `fea4b676e6784bc5041207673ca6eb6d6155299b` | Sincronización editorial; \#329 cerrado sin merge. |
| `docs/chat-epistwin-20261017` | `75e689da6c2871c7bfaac02d42791efe37670e3c` | Antecedentes históricos de Chat; \#307 cerrado sin merge. |

No interpreto la existencia de una rama como actividad reciente ni como autorización de integración. Varias ramas de Crónica tienen metadatos de commit de octubre y están muy divergidas de `main`\.

### C. Riesgos de integración concretos

1. **No sustituir el Chat actual sin decidir el contrato backend.** \#360 retira la UI Consulta y sus rutas visuales; el código de `main` usa `/api/v1/chat` y `/api/v1/consulta` contra FastAPI. El proxy del PR \#360 intenta usar rutas nativas de Open WebUI. Son contratos distintos.
2. **No cherry-pick de `IngresoWorkspace`/`IngresoView` de \#335 o \#354 sin comparación de tres vías.** Ambos paquetes cambian las mismas superficies compartidas que usa Diálogo.
3. **No reintroducir automáticamente la taxonomía antigua de Momento.** Hay versiones incompatibles documentadas en ramas distintas.
4. **No integrar Blog como una extensión del archivado de Dictado.** El paquete histórico exige clasificación de entrada, fuente versionada, consentimiento de publicación, outbox y recibos externos.
5. **No mezclar Chat y captura de Maya.** El primero requiere contexto, memoria y ciclo del agente; el segundo captura bytes de una sesión externa. El hecho de que ambos puedan producir contenido textual no los convierte en el mismo producto.

---

## 4\. BLOQUEANTES Y DEPENDENCIAS EXTERNAS

### A. Conversación con Maya por captura de Chrome

Para probar el modo Diálogo de extremo a extremo se necesitan\:

- Sesión autenticada de Khora.
- Navegador con `getDisplayMedia` y selección explícita de una pestaña de Chrome que permita compartir audio.
- Permiso de micrófono mediante `getUserMedia`\.
- Audio de salida de Chrome y audio de micrófono disponibles simultáneamente.
- Groq STT con `GROQ_API_KEY`; el transcriptor acepta además `GROQ_WHISPER_MODEL` o `GROQ_STT_MODEL` y usa `whisper-large-v3` como valor predeterminado.
- PostgreSQL (`DATABASE_URL`\) para sesión/checkpoint/volcado.
- B2 configurado para escrituras nuevas y lectura verificada de los objetos.

**Sesame no es una dependencia de software demostrada en esta implementación.** No encontré un cliente de Sesame, endpoint Sesame ni variables `SESAME_*` en el contrato de entorno examinado. La conexión con Maya es indirecta: Chrome reproduce su audio y Khora captura esa pista.

El bloqueo humano específico sigue siendo probar una conversación real con Maya, escuchar ambas señales y confirmar que la transcripción sale completa y se puede recuperar. Los tests con osciladores o dobles de navegador no sustituyen esa validación.

### B. Chat de Khora/Open WebUI

**Variables del frontend y backend actual**

`khora-web/.env.example` incluye\:

- `AUTH_SECRET`
- `DATABASE_URL`
- `KHORA_API_URL`
- `KHORA_API_KEY`
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `GEMINI_API_KEY`, `GROQ_API_KEY`
- `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL`

Pero el proveedor backend de `kernel/src/khora_kernel/proveedores/llm_generico.py` requiere, según el perfil, nombres de este tipo\:

- `KHORA_PERFIL_GROQ_BASE_URL`, `KHORA_PERFIL_GROQ_API_KEY`, `KHORA_PERFIL_GROQ_MODEL`
- `KHORA_PERFIL_GEMINI_BASE_URL`, `KHORA_PERFIL_GEMINI_API_KEY`, `KHORA_PERFIL_GEMINI_MODEL`
- `KHORA_PERFIL_OPEN_SOURCE_BASE_URL`, `KHORA_PERFIL_OPEN_SOURCE_API_KEY`, `KHORA_PERFIL_OPEN_SOURCE_MODEL`
- Para el perfil default: `KHORA_LLM_BASE_URL`, `KHORA_LLM_API_KEY`, `KHORA_LLM_MODEL`
- Para embeddings: `KHORA_EMBEDDINGS_BASE_URL`, `KHORA_EMBEDDINGS_API_KEY`, `KHORA_EMBEDDINGS_MODEL`

Esos nombres de configuración de proveedor no aparecen en el `.env.example` de `khora-web`; deben verificarse en el servicio FastAPI que realmente los consume.

**Dependencias del núcleo y retrieval**

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` y disponibilidad de Aura/Neo4j.
- Proveedor de embeddings configurado.
- `DATABASE_URL` si se va a conectar la parte de sesiones, memoria y persistencia que el producto necesita.
- Pruebas de aislamiento por propietario y acceso después de reiniciar el servicio.

El PR \#360 registró el 8-Nov que AuraDB Free estaba pausada y el host no resolvía, y que el último despliegue de producción había fallado por autorización B2. Son bloqueos históricos reportados en ese PR; no los presento como estado vigente de los servicios porque esa condición requiere lectura actual de los proveedores.

**Dependencias de Open WebUI en \#360**

- `KHORA_CHAT_ENABLED=1`\.
- API key servidor `KHORA_API_KEY`, y `KHORA_API_URL`\.
- Open WebUI real y sus endpoints compatibles.
- NextAuth y sesión del usuario.
- Proxy HMAC y allowlist.

Hay una incompatibilidad que debe resolverse antes de reactivar el PR: en `main`, `KHORA_API_URL` apunta al backend FastAPI, donde `/api/v1/chat` y `/api/v1/consulta` existen. En \#360, el proxy usa esa misma variable para solicitar rutas de Open WebUI como `/api/v1/auths`, `/api/v1/chats`, `/api/v1/folders` y `/api/v1/models`\. En los archivos revisados no aparece un `OPEN_WEBUI_BASE_URL` separado. Sin un gateway externo que enrute esas rutas, el proxy no tiene un upstream coherente.

**MCP**

La configuración que `getMcpConfig()` espera incluye\:

- `MCP_OAUTH_CLIENT_ID`
- `MCP_OAUTH_CLIENT_SECRET`
- `MCP_OAUTH_REDIRECT_URIS`
- `MCP_JWT_SECRET`
- `MCP_ALLOWED_EMAIL`
- `MCP_CANONICAL_URL`
- Opcionalmente `KHORA_READONLY_DATABASE_URL`

Estos nombres no figuran en el `.env.example` leído. Para conectar herramientas al futuro Chat/Maya se requieren configuración OAuth, scopes y permisos explícitos. Que exista `/api/mcp` no significa que Open WebUI o `endpoint_chat` estén conectados a él.

### C. Crónica personal y Blog

**Para checklist y análisis de crónica\:**

- `GROQ_API_KEY`\.
- `GROQ_PULIDO_MODEL` -el contrato usa `llama-3.3-70b-versatile` como valor por defecto-.
- Sesión autenticada.
- Disponibilidad y límites del endpoint de Groq.

La propuesta de checklist con análisis Groq envía texto del relato al proveedor. El contrato histórico declara que el endpoint de checklist no persiste ese texto ni los metadatos. La UI tenía que informar del envío y de los límites de retención del proveedor.

El requisito U06 de huella de contexto de sesión/dispositivo no quedó resuelto como una huella persistente del hardware. La versión revisada distingue tiempo de recepción del servidor y metadatos aproximados de conexión; no los presenta como prueba del momento o lugar del acontecimiento.

**Para persistencia editorial\:**

- `DATABASE_URL`\.
- Migración `034_ingreso_clasificacion.sql`\.
- Migración `20261019_blog_editorial.sql`\.
- Cifrado de servidor y auth por sesión.
- Validación de propietario y de `volcado_version` por SHA.

Ambas migraciones están en ramas históricas, no en el directorio de migraciones de `main`\. Una implementación sobre `main` necesitaría una migración revisada y aplicada antes de confiar en el repositorio editorial.

**Para publicar Blog y Facebook\:**

- `BLOG_DISPATCH_SECRET`
- `BLOG_SYNC_ENABLED`
- `BLOG_GITHUB_TOKEN`
- `BLOG_META_PAGE_TOKEN`
- `BLOG_META_PAGE_ID`
- `BLOG_META_ADMIN_VERIFIED`
- `GROQ_API_KEY` para propuestas de crónica y metadatos.
- Permisos de escritura sobre `SeryMente/otrogranprograma`\.
- Permiso Meta `CREATE_CONTENT` para la Página.

El código histórico usa GitHub API para crear/verificar entradas de Blog y Facebook Graph API para publicar/verificar el enlace y el texto. La propia publicación requiere aprobación sobre un digest/revisión exactos; no se hereda consentimiento de otra revisión.

El recibo C051 de `docs/frentes/dictado-voz/evidencias/C051-cronica-b2.md` declaró que no estaban configurados los nombres `BLOG_*` en Vercel ni `BLOG_DISPATCH_SECRET` en GitHub para ese corte, y que la activación del cron seguía deshabilitada por compuerta. Es evidencia histórica, no lectura actual de variables. **No se debe habilitar publicación automática ni inferir permisos de GitHub/Meta por la existencia de las rutas.**

**Almacenamiento de audio**

`main` usa B2 para escrituras nuevas con estas variables\:

- `KHORA_B2_MASTER_APPLICATION_KEY_ID`
- `KHORA_B2_MASTER_APPLICATION_KEY`
- `KHORA_B2_BUCKET_NAME`
- `KHORA_B2_BUCKET_ID`
- `KHORA_B2_REGION`
- `KHORA_OBJECT_STORAGE`
- `KHORA_B2_PREFLIGHT`

El transporte admite compatibilidad con `KHORA_B2_KEY_ID` y `KHORA_B2_APPLICATION_KEY`, pero su contrato actual exige validar la Master Key. El último deployment de Vercel consultado está `READY`; esto no sustituye una prueba de subida/lectura/huella para la sesión concreta que se vaya a probar.

### D. Corpus autobiográfico: dependencia separada

La evidencia C051 menciona un contrato de corpus autobiográfico `khora.corpus-autobiografico` schema `0.1.0`, spec `0.2.0`, con consumidores todavía `pending_integration`\. El checklist de Crónica no construye por sí mismo esos objetos ni ratifica su contenido. Si la intención es que Crónica alimente la memoria conversacional de Khora, esa integración necesita contrato de fuente, propietario, revisión, hash, anclas, tiempo del hecho separado del tiempo de captura y revisión humana. No se debe confundir publicación de Blog con ingestión al corpus.

---

## 5\. PRUEBAS Y VALIDACIÓN EXISTENTE

### A. Herramientas del paquete `khora-web` en `main`

`khora-web/package.json` declara\:

| Comando | Ejecución |
|--------|--------|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run test:unit` | `node scripts/run_unit_tests.mjs` |
| `npm run e2e` | `playwright test` |
| `npm run build` | `next build --webpack` |
| `npm run ui-review:check` | `tsx scripts/check_ui_review.ts` |
| `npm run ui:contract` | `tsx scripts/check_navigation_contract.ts` |

`npm run build` ejecuta `prebuild`, que añade typecheck, revisión UI, contrato de navegación, pruebas unitarias, preflight de experiencia, construcción de extensión y preflight de object storage.

`tests/unit/run_unit_tests.mjs` enumera automáticamente los archivos `tests/unit/*.test.ts` y los ejecuta con `tsx --test`\.

### B. CI y E2E en `main`

**Workflows relevantes**

- `.github/workflows/ci.yml`\: Ruff/Pyright/pytest del kernel, `api/tests`, y gate de Web con typecheck, UI Review, contrato de navegación y unit tests.
- `.github/workflows/ui-quality.yml`\: typecheck, UI Review, navegación y unit tests; instala Chromium y ejecuta `shell-v2.spec.ts`, `ui-quality.spec.ts` y `contracts/dictado-observability-checkpoints.spec.ts`\.
- `.github/workflows/post-deploy-smoke.yml`\: smoke HTTP de una URL histórica `khora-ten.vercel.app`; no constituye prueba de los recorridos autenticados de Maya o Crónica.

**Cobertura de Maya/Chat actual**

| Área | Pruebas en `main` | Qué prueban |
|--------|--------|--------|
| Chat API | `api/tests/test_chat.py` | Rechazo sin key, perfil no configurado, normalización de 429 y test Groq en vivo condicionado a disponer de clave válida. |
| Proxy de Web | `khora-web/tests/unit/chat_route.test.ts` | Contrato de la ruta `/api/chat`\. |
| OAuth de Chat | `khora-web/tests/unit/chatgpt_oauth.test.ts` | Contratos de OAuth asociados. |
| Motor/perfiles | `kernel/tests/test_proveedores_perfiles.py`, `kernel/tests/engine/test_raz_01.py`, `test_raz_02.py`, `kernel/tests/test_jc11_core.py`, `test_jc12_fval.py` | Proveedores y partes del núcleo/fVAL. |
| GraphRAG | `kernel/tests/consulta/test_retriever.py`, `kernel/tests/test_jc7_embeddings.py` | Retrieval y embeddings. |
| Diálogo | `khora-web/tests/unit/dialogo-archivo.test.ts` | Contratos de archivo del diálogo. |
| Captura/continuidad compartida | `e2e/contracts/ingreso.spec.ts`, `e2e/contracts/dictado.spec.ts`, `e2e/dictado-edicion-continuidad.spec.ts`, `e2e/custodia-local-recovery.spec.ts` | Ingreso, continuidad y recuperación compartidas. |

No existe en `main` un E2E dedicado que demuestre una sesión auténtica con Maya/Sesame, ambas fuentes reales de audio, transcripción Groq, recuperación y aceptación humana. Los casos sintéticos de diálogo que existen como scripts/evidencias en `docs/frentes/dictado-voz/evidencias/` no son una prueba de voz real ni forman parte por sí solos del runner unitario.

**Cobertura de Crónica en `main`**

No encontré archivos de tests `cronica-*`, endpoints `/api/cronica/*`, rutas `/api/blog/*` ni pruebas Blog en el árbol actual de `main`\. En consecuencia, **Crónica no dispone hoy de cobertura ejecutable en el CI de `main`**\.

### C. Pruebas de Crónica en ramas históricas

Están documentadas, pero no se ejecutan automáticamente desde `main`\:

| Rama/PR | Pruebas disponibles |
|--------|--------|
| \#334 | `tests/unit/cronica-checklist.test.ts` |
| \#335 | `tests/unit/cronica-coverage.test.ts`, `cronica-editorial.test.ts`, `cronica_analizar_route.test.ts`, `cronica_coverage_u0603.test.ts`, `ingreso-editorial.test.ts` |
| Paquete Blog de \#335 y ramas relacionadas | `blog-editorial.test.ts`, `blog-postgres.test.ts`, `blog-provider-readback.test.ts`, `blog-text-workflow.test.ts`, `blog-transcript-preparation.test.ts`, `blog-intent-recovery.test.ts` |
| Browser local | `tests/browser/blog-text-workflow.local.test.mjs`, `cronica-feedback.local.test.mjs`, `blog-intent-recovery.local.test.mjs` |

El paquete C051 de Crónica registra 127/127 pruebas unitarias focales y 42 comprobaciones Chromium de componentes React en un corte histórico. La nota aclara que esas pruebas usaban servicios/estados sintéticos y no demostraban grabación de voz, recuperación productiva de la sesión real ni publicación real en GitHub/Meta. También registra un despliegue técnico de otra revisión (`4ff209f...`\), distinto del runtime que Vercel tiene actualmente publicado.

### D. Calidad CI y límites de la evidencia

- El CI ejecutable está definido, pero el PR \#366 documenta jobs que no llegaron a arrancar por restricciones de facturación/límite de gasto en GitHub Actions. Un check sin runner ni pasos no es una prueba aprobada.
- \#360 informa un preview anterior que compiló Next y TypeScript, pero indica que el cambio posterior que retiró `ConsultaView` necesitaba repetir el preview.
- Las cifras históricas de C022/C027/C030 y C051 no deben mezclarse con el estado de `main` ni presentarse como una ejecución nueva.
- El estado `READY` del deployment no acredita funcionamiento real de conversación, memoria, proveedor LLM, permisos MCP ni publicación Blog.
- No existe una validación integral de Crónica en el `main` actual.

**Diagnóstico técnico para planear la implementación\:** el camino más seguro es mantener tres entregables independientes: (1) validar y cerrar el recorrido real del Modo Diálogo existente, (2) definir el contrato del nuevo Chat Khora/Open WebUI y conectar expresamente núcleo, memoria y retrieval, y (3) reconstruir Crónica por capas -captura/checklist local, propuesta editorial, persistencia, consentimiento y publicación- usando los artefactos históricos como material de referencia, no como ramas listas para fusionar.

## Prompt:
14/11/2026, 8:44:46 p.m.

Tienes acceso a todos mis repositorios (incluido SeryMente/khora y Signal Interpreter). Necesito un análisis técnico comparativo y el listado exacto de URLs de GitHub de los archivos clave para diseñar dos modalidades dentro del frente Dictado en Khora sin regresiones.

REQUISITOS ESTRICTOS DE PRODUCTO Y ALCANCE:
1. Fronteras y ubicación en UI:
   - Chat / Open WebUI queda completamente fuera de alcance.
   - "Ingreso" tendrá un submenú de métodos de entrada (Dictado, Notas rápidas, etc.). Tanto "Escuchar a Chrome (Diálogo)" como "Crónica" son MODALIDADES DENTRO DE DICTADO (no submenús de Ingreso).
   - El alcance de Dictado termina al pulsar "Archivar registro". La publicación externa (Blog GitHub, Facebook, X, TikTok) corresponde al frente Integración, pero el flujo de Crónica enlaza con ella mediante un checkmark activo por defecto (desactivable).

2. Modalidad "Escuchar a Chrome / Organizar como diálogo" (genérico, SIN Maya):
   - Eliminar cualquier referencia o acople a "Maya" o "sesame.com".
   - Controles en pantalla de Dictado: botón "Iniciar dictado" (micrófono implícito por defecto; eliminar control redundante "Incluir micrófono"), opción "Escuchar a Chrome", y check "Organizar como diálogo" marcado y deshabilitado (checked + greyed out) por defecto.
   - Audio y custodia: capturar la salida de audio de Google Chrome + micrófono como una conversación de 2 participantes (usuario y audio de Chrome), con un audio descargable y protegido EXACTAMENTE por el mismo sistema robusto de custodia y recuperación anti-pérdida ya implementado en Dictado (custodia-local, checkpoints, partes, B2), sin sobrescribirlo ni crear rutas menos seguras.
   - Transcripción EN VIVO: la transcripción organizada como diálogo de 2 actores debe generarse EN TIEMPO REAL durante la conversación (enviando segmentos a Groq Whisper en vivo, estándar limitless.ai), NO al detener la grabación.

3. Modalidad "Crónica":
   - Dictado guiado mediante checklist en vivo (fecha/hora, lugar, momento, qué pasa) sin bloquear archivado.
   - Checkmark activo por defecto (desactivable) que al archivar dispare/prepare el enlace hacia microblog (~280 caracteres) y redes vía Integración.

INSTRUCCIONES DE ANÁLISIS (RESPONDE CON ESTAS 5 SECCIONES):

1. COMPARATIVA TÉCNICA: SIGNAL INTERPRETER VS. KHORA (DIÁLOGO EN VIVO)
- Explica exactamente cómo resuelve Signal Interpreter:
  * Captura de audio (Chrome/sistema + micrófono; si usa extensión Chrome tabCapture/offscreen, getDisplayMedia, WebAudio mixing, AudioWorklet/MediaRecorder).
  * Segmentación/chunking en vivo, VAD/silencios, envío a Groq Whisper (modelo, duración de ventana, solapamiento, prompts/contexto), atribución de actores (3 actores allá vs. 2 acá) y manejo de latencia/errores/rate-limits.
  * Sus indicadores de desempeño/UX para transcripción en vivo estilo limitless.ai.
- Contrasta eso contra lo que hoy tiene Khora en main (`IngresoWorkspace.tsx`, `IngresoView.tsx`, `DialogoPanel.tsx`, `lib/dialogo/*`, `/api/transcribir/dialogo`, `custodia-local.ts`, y la extensión de Chrome de Khora si existe en el repo).
- Señala con claridad límites técnicos reales del navegador vs. extensión de Chrome para capturar "toda la salida de audio de Google Chrome" y entregar "un solo audio descargable" + chunks en vivo sin perder la custodia de Dictado.

2. ARQUITECTURA RECOMENDADA PARA ADAPTAR KHORA SIN REGRESIONES
- Cómo reutilizar el pipeline/patrón de Signal Interpreter dentro de Khora para lograr diálogo en vivo de 2 participantes respetando intacta la custodia continua de Dictado y el botón "Iniciar dictado".
- Qué parte del código actual de `DialogoPanel` / `lib/dialogo/*` se recicla, qué debe reemplazarse (paso de post-stop a streaming por segmentos) y cómo proteger la edición in situ mientras llegan segmentos en vivo.

3. RELEVAMIENTO DE CRÓNICA Y CONTRATO CON INTEGRACIÓN
- Comparando `fix/cronica-checkpoint-c051-83abb5e4`, `C051-cronica-b2.md`, `#335`, `#334` y `feat/blog-*` contra el `main` actual (`OBJETO-CANONICO.md` §4, `frentes/notas/` y PR #354):
  * Qué piezas exactas del checklist y de generación/síntesis (~280 chars microblog vs. crónica sobria) conviene reconstruir dentro de Dictado.
  * Dónde y cómo va el checkmark activo por defecto y qué contrato exacto (campos/payload/estado en BD) guarda Dictado al pulsar "Archivar registro" para entregar el relevo limpio al frente Integración.

4. BLOQUEANTES, RIESGOS DE REGRESIÓN Y PLAN POR FASES
- Riesgos reales de romper Dictado normal, Custodia o Notas rápidas, y el orden más seguro de implementación y pruebas (`typecheck`, `ui:contract`, `test:unit`, `e2e`).

5. URLS DIRECTAS DE GITHUB PARA REVISIÓN DE CÓDIGO
Devuelve una lista limpia de URLs completas (`https://github.com/SeryMente/.../blob/...`) de los 12-15 archivos más importantes (tanto de Khora como de Signal Interpreter):
- En Khora: UI de Dictado/Ingreso/Diálogo, captura y transcripción de diálogo, custodia local/checkpoints, extensión de Chrome (si hay), y los archivos clave de Crónica/Blog en la rama más reciente (`fix/cronica-checkpoint-c051-83abb5e4` / `#335`).
- En Signal Interpreter: archivos de captura de audio, mezcla/segmentación en vivo, cliente Groq Whisper, atribución de diálogo y UI en vivo.
(Nota: indica también si el repo Signal Interpreter es público o privado).

## Response:
14/11/2026, 8:44:49 p.m. · gpt-6-t-mini-mini

Voy a verificar primero el acceso real a ambos repositorios y fijar las referencias de rama/commit; después compararé los flujos de captura, streaming y custodia, y cerraré con arquitectura, riesgos y URLs directas. Trataré `main` como estado vigente de KHORA y separaré explícitamente lo que solo existe en ramas o PR históricos.

Confirmado: tengo acceso de lectura a ambos repositorios y `SeryMente/signal-interpreter` es **público**, no privado. KHORA también es público. Ahora estoy comprobando el contenido real de `main` y de las ramas históricas citadas; no voy a atribuir al repositorio técnicas como `tabCapture`, VAD o mezcla WebAudio sin localizar su implementación.

## 1\. Comparativa técnica: Signal Interpreter vs. KHORA

**Hallazgo que cambia la comparación\:** el `main` actual de Signal Interpreter no implementa el flujo que describes como “captura continua de audio + Groq Whisper en vivo”. Su documentación vigente declara una arquitectura de **subtítulos nativos de Chrome/Windows**, sin captura ni transmisión del audio de conversación, sin micrófono y sin Groq en el runtime activo. El repositorio conserva un cliente Groq y código de diagnóstico de `tabCapture`, pero eso no equivale a un pipeline productivo de transcripción de audio en vivo.

La extensión sí existe y es pública: [github.com](https://github.com/SeryMente/signal-interpreter?utm_source=chatgpt.com)\. Su `manifest.json` declara Manifest V3, `tabCapture` y `offscreen`; sin embargo, su README precisa que el runtime vigente es texto nativo y que `groq-transcriber.js` permanece como módulo histórico no cargado. Esta distinción evita diseñar KHORA sobre una capacidad que el código actual no acredita.

## Response:
14/11/2026, 8:45:30 p.m. · gpt-6-t-mini-mini

La precisión importante es esta: **Signal Interpreter sí tiene una implementación dual-Groq más ambiciosa, pero está en la PR \#84, abierta y Draft, no en `main`**\. Esa PR especifica dos fuentes concurrentes, WAV de 6.5 s con 500 ms de solapamiento y `whisper-large-v3`; a la vez declara que no se ha hecho captura real ni llamada real a Groq, y que falta aceptación acústica. La analizaré como prototipo de referencia, no como capacidad ya liberada.

> **Inspeccionó arquitectura, señales, transcripción, subtítulos y cambios de repositorios**
>
> 
>
> **Obtuvo código de ramas y revisó integración de Groq y manejadores**
>
> 
>
> **Verificando requisitos y repositorios**
>
> Estoy contrastando la especificación con el estado técnico descrito: rutas, ramas, permisos, documentación y flujos de integración. También estoy separando hechos confirmados de contradicciones, especialmente sobre visibilidad y autorización antes de proponer cambios.
>
> **Precisando la comparación técnica**
>
> Estoy verificando cómo encajan las ramas y propuestas con el flujo actual de Ingreso, Dictado, custodia y documentación. La principal tensión está en que el diseño solicitado rebasa el alcance canónico vigente y requiere actualizarlo primero.
>
> **Verificaste requisitos y precisaste la comparación técnica**
>
> 
>
> **Inspeccionaste ramas, archivos, PRs y documentación de Crónica y Khora**
>
> 
>
> Procesó durante 12m 19s

## Prompt:
15/11/2026, 10:13:08 a.m.

Corrección importante sobre SeryMente/signal-interpreter:
No te quedes solo con `main`. El sistema se dividió en dos modos (cloud-only vía Whisper Groq vs. live captions), postergando live captions y dejando como vía principal el modo cloud-only.

1. Revisa TODAS las ramas, PRs (abiertos y cerrados), commits recientes y archivos de `SeryMente/signal-interpreter` (incluyendo `groq-transcriber.js`, `offscreen`, `tabCapture` y cualquier rama/carpeta de modo cloud-only). Lista qué ramas existen y dónde está exactamente la implementación cloud-only / Groq (o si esa división aún está solo en local y no subida a GitHub, indícalo con exactitud).
2. Con base en ese hallazgo real más `groq-transcriber.js` / `tabCapture` de `signal-interpreter` y el código actual de `SeryMente/khora`, completa las 5 secciones que quedaron pendientes del prompt anterior:
   - Sección 1: Comparativa técnica completa (Signal Interpreter cloud-only/Groq vs. Khora main + extensión de Chrome de Khora), límites reales del navegador para capturar Chrome + micrófono como un flujo y transcribir en vivo.
   - Sección 2: Arquitectura recomendada en Khora para diálogo en vivo sin Maya y conservando intacta la custodia anti-pérdida.
   - Sección 3: Relevamiento de Crónica (C051, #335, #334, feat/blog-*) y contrato exacto al pulsar "Archivar registro" hacia Integración (con el checkmark activo por defecto para microblog ~280 chars / redes).
   - Sección 4: Bloqueantes, riesgos de regresión y plan por fases.
   - Sección 5: URLs directas de GitHub (`https://github.com/SeryMente/.../blob/...`) de los 12-15 archivos más importantes de `khora` y `signal-interpreter`.

## Response:
15/11/2026, 10:13:12 a.m. · gpt-6-t-mini-mini

Voy a rehacer el inventario de Signal Interpreter desde sus referencias remotas, no desde `main`\: ramas, PR abiertas/cerradas, commits y rutas de código, diferenciando con precisión lo publicado en GitHub de lo que solo esté mencionado como trabajo local. Luego integraré ese hallazgo con KHORA `main`, las ramas de Crónica y el límite de archivo/Integración que acabas de fijar.

## Estado del relevamiento remoto

(Repositorios públicos y accesibles)

- `SeryMente/signal-interpreter`\: público. El inventario remoto devuelve **116 ramas y 94 PRs**\. La rama `main` está en `8f27a973ba29158d8b63905028c00db261241fa3` $15 de noviembre de 2026).
- `SeryMente/khora`\: `main` está en `55bfcfc76f49a033061e706e6c4dbb1e3538b2b1` \(15 de noviembre de 2026).

**Dónde está la implementación dual Groq\:**

| Referencia | Estado remoto | Qué representa |
|--------|--------|--------|
| `candidate/whisper-interpreter-live-20261110` · PR [github.com](https://github.com/SeryMente/signal-interpreter/pull/83?utm_source=chatgpt.com) | Cerrada, sin merge | Primera candidata; explícitamente supersedida por \#84 |
| `feat/groq-dual-main-20261111` · PR [github.com](https://github.com/SeryMente/signal-interpreter/pull/84?utm_source=chatgpt.com) | Abierta, Draft | Implementación dual Groq y banco de calidad inicial |
| `feat/groq-dual-quality-20261112` · PR [github.com](https://github.com/SeryMente/signal-interpreter/pull/94?utm_source=chatgpt.com) | Abierta, Draft | Candidata más reciente: aislamiento de reproducción, validación del procesamiento del micrófono y cierre más estricto |

Por tanto, **el código cloud/Groq sí está subido a GitHub; no está integrado en `main`**\. No he encontrado una carpeta remota llamada `cloud-only`\: esa separación está representada por dos rutas de ejecución/configuración dentro de la extensión, no por un subdirectorio o release cloud-only independiente.

La versión `main` sigue declarando como runtime activo los subtítulos nativos de Chrome/Windows. Su `groq-transcriber.js` es un módulo histórico no cargado por ese runtime. La candidata \#94 agrega el pipeline dual de audio como código de rama; su PR declara que sigue pendiente la prueba acústica real y la aceptación del operador.

## 1\. Comparativa técnica: Signal Interpreter cloud/Groq vs. KHORA

### Signal Interpreter: qué código está disponible y qué ejecuta

La candidata más reciente es la rama `feat/groq-dual-quality-20261112`, PR [github.com](https://github.com/SeryMente/signal-interpreter/pull/94?utm_source=chatgpt.com), no fusionada. Su implementación de audio Groq es real en el código de esa rama y tiene cuatro piezas centrales\:

| Componente | Función técnica |
|--------|--------|
| `groq-dialogue-capture.js` | Captura pestaña y micrófono en dos fuentes independientes; mantiene dos colas de envío y estados por fuente |
| `whisper-window-processor.js` | Convierte cada fuente a ventanas WAV autónomas |
| `groq-transcriber.js` | Envía los archivos WAV a la API de transcripción de Groq |
| `background.js` | Valida la sesión activa, procesa cada ventana, coordina las colas y entrega segmentos al overlay |

La ruta cloud de \#94 **no usa `chrome.tabCapture` ni `offscreen.js` para capturar el diálogo**\. Se ejecuta desde un content script autorizado de la llamada en Cloud Interpreter\:

1. `getDisplayMedia()` solicita compartir una superficie del navegador y exige que la pista de video informe `displaySurface === "browser"`\. Comprueba que exista una pista de audio.
2. Solicita aparte `getUserMedia()` para el micrófono. Esta versión desactiva AEC, supresión de ruido y ganancia automática, y falla cerrada si el navegador no confirma esos ajustes.
3. Crea un `AudioContext` a 16 kHz y dos `AudioWorkletNode`, uno por fuente.
4. Produce ventanas WAV mono PCM16 de **6,5 segundos**, con **500 ms de solapamiento** y avance de 6 segundos.
5. Envía cada ventana como archivo completo a `POST /audio/transcriptions` de Groq, modelo `whisper-large-v3`, `verbose_json` y marcas de tiempo por segmento. No es streaming incremental de tokens ni WebSocket: es reconocimiento casi en vivo mediante solicitudes sucesivas de archivos cortos.
6. Reconcilia segmentos por fuente, secuencia e intervalo temporal; elimina duplicados entre ventanas solapadas y conserva los solapamientos entre micrófono y pestaña.

El procesamiento se hace con dos colas independientes y un máximo de dos ventanas pendientes por fuente. La candidata rechaza una fuente perdida, una carga no válida o un retraso que exceda la capacidad de la cola; para `429` consulta `Retry-After` y solo contempla un reintento acotado. Esto evita fingir continuidad cuando Groq ya no está procesando al ritmo de captura. No encontré un VAD que suprima silencios: la segmentación es por ventanas fijas y Whisper devuelve los segmentos reconocidos dentro de cada una.

**Atribución de actores\:** \#94 reconoce dos procedencias, no tres identidades: `INTÉRPRETE` para el micrófono y `AUDIO REMOTO · HABLANTE NO VERIFICADO` para la pestaña. No puede distinguir varias personas que hablen dentro de una misma pista remota. Las etiquetas `CLIENTE`, `LEP` e `INTERVENCIÓN` de la ruta histórica de subtítulos nativos clasifican fragmentos por idioma; no demuestran diarización de tres hablantes.

**UX y métricas\:** muestra estado y cantidad de segmentos por fuente y calcula p50, p95 y máximo de latencia desde que la ventana queda lista hasta que el texto se hace visible. Omite la medición cuando no puede acreditar un reloj común o el overlay no está visible. El PR propone objetivos de latencia y un benchmark WER/CER, pero su propio estado dice que no se ha hecho una prueba acústica real con voz ni una llamada real a Groq. Los resultados de pruebas sintéticas no validan esos objetivos.

Referencias de código de \#94: [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/groq-dialogue-capture.js?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/whisper-window-processor.js?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/groq-transcriber.js?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/background.js?utm_source=chatgpt.com)

### La división cloud-only / Live Captions: qué queda demostrado en GitHub

Hay dos caminos de producto en el repositorio, pero **no he encontrado aún una selección publicada que los convierta en modos mutuamente excluyentes y deje cloud-only como predeterminado**\:

- `main` conserva el runtime nativo: Chrome Live Caption → Windows UI Automation → Native Messaging → overlay. No captura el audio de la conversación, no pide el micrófono para transcribir y no invoca Groq. Su `offscreen.js` gestiona tonos y responde `native-text-only`; no es el capturador cloud.
- \#94 incorpora el pipeline Groq dual, pero mantiene los scripts y superficies de Live Captions. Sus ajustes `groqDialogueEnabled` y `groqZeroDataRetentionConfirmed` están desactivados por defecto; el control nativo sigue existiendo. Por tanto, \#94 es una candidata con ambos subsistemas, no una release “cloud-only” demostrada.
- No hay una rama remota llamada `cloud-only`, ni una carpeta de código con ese nombre. El código Groq sí está subido en \#84 y \#94, aunque solo en ramas Draft. Una separación funcional más reciente que no haya sido publicada en GitHub no es verificable desde el repositorio remoto.

### KHORA: dos implementaciones distintas de captura de Chrome

KHORA `main` tiene tanto el diálogo web como una extensión Chrome Aisthesis (Harmonia). Conviene no confundirlas\:

**Diálogo web actual (`DialogoPanel` \+ `capturar.ts`$\:** `getDisplayMedia({video:true,audio:true})` recoge el audio de la pestaña compartida y `getUserMedia()` recoge el micrófono. Utiliza un `MediaRecorder` por fuente y entrega partes de 5 segundos al circuito de custodia. Guarda copia local cifrada, checkpoint y cargas remotas con SHA; sin embargo, la transcripción se ejecuta **al detener**\. El endpoint `/api/transcribir/dialogo` carga los originales ya verificados y transcribe secuencialmente primero el micrófono y después Chrome. Los turnos conservan la fuente y el tiempo, pero eso no constituye diarización de personas dentro de cada pista. El archivo descargable actual se ofrece por fuente, no como un único audio combinado.

**Extensión Aisthesis (`modules/live-caption`\)\:** sí dispone de `chrome.tabCapture` y un documento offscreen. El background obtiene `getMediaStreamId()` para una pestaña seleccionada; el offscreen consume ese stream con `getUserMedia()` y `chromeMediaSource: "tab"`, mantiene la reproducción mediante `AudioContext` conectado a `destination` y graba con `MediaRecorder`\. Sube partes `chrome_tab` a `/api/audio`, pero no incorpora el micrófono ni llama directamente a Groq Whisper. El puente WebSocket local es un tercer componente, distinto de la transcripción de Dictado.

Esto da a KHORA una base útil para capturar audio de Chrome con extensión, pero **no resuelve todavía el diálogo de dos fuentes en vivo**\. La extensión actual es monofuente y su carga de partes no equivale al checkpoint, a la recuperación local ni al manifiesto completo de la sesión de Dictado.

### Límites reales del navegador y la extensión

- `getDisplayMedia()` requiere una acción del usuario y presenta el selector de superficie; pedir `audio:true` no garantiza una pista de audio: depende de la superficie elegida y de lo que el navegador exponga. `displaySurface === "browser"` clasifica la superficie, pero no certifica por sí solo que se eligió la pestaña concreta esperada. \[[MediaDevices: getDisplayMedia() method - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia?utm_source=chatgpt.com); [Using the Screen Capture API - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture?utm_source=chatgpt.com)\]
- `chrome.tabCapture` permite capturar el audio/video de una pestaña objetivo y requiere una activación de la extensión. Al capturarla, el audio deja de oírse salvo que se conecte la pista a `AudioContext.destination`, como ya hace Aisthesis. No captura todo el audio de Chrome ni el audio de otras aplicaciones del sistema. \[[browser.tabCapture  \|  API  \|  Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/tabCapture?authuser=11&utm_source=chatgpt.com); [Audio recording and screen capture  \|  Chrome Extensions  \|  Chrome for Developers](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture?hl=en&utm_source=chatgpt.com)\]
- Ninguno de esos mecanismos incorpora automáticamente el micrófono. Se debe solicitar como otra pista con `getUserMedia()`\.
- Para mantener atribución fiable, las dos fuentes deben conservarse separadas durante captura, custodia y reconocimiento. Un único audio descargable debe ser un **master derivado sincronizado**, no una concatenación de partes WebM de grabadoras distintas.

### Signal Interpreter: inventario de ramas y PR

El barrido de GitHub devuelve **116 ramas y 94 PRs**\: 10 abiertas y 84 cerradas; 66 de las cerradas aparecen fusionadas. La lista completa de ramas está en el inventario siguiente; las más relevantes para esta comparación son\:

| Rama | Referencia o PR | Hallazgo |
|--------|--------|--------|
| `main` | `8f27a973…` | Runtime de subtítulos nativos; no Groq de conversación |
| `candidate/whisper-interpreter-live-20261110` | [github.com](https://github.com/SeryMente/signal-interpreter/pull/83?utm_source=chatgpt.com) | Cerrada sin merge; candidata anterior |
| `feat/groq-dual-main-20261111` | [github.com](https://github.com/SeryMente/signal-interpreter/pull/84?utm_source=chatgpt.com) | Dual Groq, abierta y Draft |
| `feat/groq-dual-quality-20261112` | [github.com](https://github.com/SeryMente/signal-interpreter/pull/94?utm_source=chatgpt.com) | Candidata dual más reciente; abierta y Draft |
| `feat/full-dialog-tab-20261022` | Sin PR abierta vigente identificada | Línea histórica de diálogo en pestaña; no sustituye la candidata \#94 |
| `feat/0.11.0-bilingual-live-transcript` | Rama remota | Línea histórica de subtítulos/transcripción; no acredita la separación cloud-only como release |

Las otras PR abiertas se distribuyen en trabajo de Auto-Answer, presencia y rendimiento: \#82, \#81, \#80, \#76, \#75, \#74, \#73, \#72 y \#70, además de \#84 y \#94. Entre los cierres relevantes, \#95 integró aislamiento del audio de llamada respecto a los tonos de la extensión; no integra la candidata Groq. El resto de las PR cerradas está mayoritariamente en líneas de interfaz, Auto-Answer, instalación, observabilidad y mantenimiento.

**Las 116 ramas remotas, agrupadas por prefijo\:**

- `candidate/`\: `candidate/autoanswer-fastpath-ready-20261110`, `candidate/whisper-interpreter-live-20261110`\.
- `docs/`\: `docs/expand-live-caption-overlay-spec-20261008`, `docs/expand-live-caption-quality-criteria-20261008`, `docs/live-caption-overlay-verbatim-20261008`, `docs/observability-contract-2026-10-22`\.
- `extension-package-0.10.36`\.
- `feat/`\: `feat/benchmark-live-transcription-20261022`, `feat/bilingual-transcription-0.10.22`, `feat/cloud-interpreter-login-bootstrap-0.10.15`, `feat/development-observability`, `feat/full-dialog-tab-20261022`, `feat/groq-dual-main-20261111`, `feat/groq-dual-quality-20261112`, `feat/groq-key-single-entry`, `feat/harden-auto-answer-0913`, `feat/hotload-during-active-call-0.10.17`, `feat/live-caption-overlay-20261008`, `feat/live-caption-sprint-0.10.22`, `feat/observability-browser-github-only-2026-10-07`, `feat/operational-metrics-v0914`, `feat/overlay-call-lifecycle-0912`, `feat/platform-official-sync`, `feat/si-ep-local-first-adapter-20261101`, `feat/ui-compact-0912b`, `feat/ui-compact-0912`, `feat/ui-mute-hardening-20261008`, `feat/0.10.24-overlay-ux-and-encoding`, `feat/0.10.25-bilingual-caption-lookup`, `feat/0.10.28-call-end-observability-report`, `feat/0.10.29-self-healing-overlay`, `feat/0.10.34-native-captions-only`, `feat/0.10.35-portable-root-lab-polish`, `feat/0.10.36-bundled-bilingual-lab-sample`, `feat/0.10.36-installer-lab-essential-first`, `feat/0.11.0-bilingual-live-transcript`, `feat/0.11.0-longitudinal-requirements-20261031-reconciled`, `feat/0.11.0-longitudinal-requirements-20261031`\.
- `fix/`\: `fix/autoanswer-lease-lifecycle-20261107`, `fix/autoanswer-missed-call-guard-20261108`, `fix/autoanswer-mv3-presence-continuity-20261107-g11`, `fix/autoanswer-platform-availability-overlay-20261108`, `fix/background-official-sync-0912`, `fix/backlog-p0-switch-mic-late-track-20261110`, `fix/backlog-performance-audio-caption-20261108`, `fix/bridge-hotload-overlays-0.10.38-20261028`, `fix/bridge-hotload-overlays-20261028`, `fix/call-audio-isolation-20261113`, `fix/call-earnings-baseline-sync-0.10.21`, `fix/call-earnings-live-sync`, `fix/call-only-overlay-0912`, `fix/call-safe-sync-hardening`, `fix/call-safe-ui-guard`, `fix/call-timing-hourly-sync`, `fix/critical-call-beep-0912`, `fix/global-mic-toggle-precall-20261112-main-sync`, `fix/global-mic-toggle-precall-20261112`, `fix/global-overlay-toggle-installer-20261028`, `fix/hotload-state-scope-0.10.20`, `fix/incoming-call-e2e-observability-20261030`, `fix/incoming-call-observability-autoreply-20261030`, `fix/incoming-call-observability-e2e-20261030`, `fix/installer-overlays-0.10.37-clean`, `fix/live-caption-overlay-ux-0.10.23`, `fix/login-default-and-microphone-hotkey-0.10.18-refresh`, `fix/login-default-and-microphone-hotkey-0.10.18`, `fix/machine-bootstrap-and-host-retry`, `fix/mic-preflight-0.10.48-current-main`, `fix/mic-toggle-any-screen-20261112`, `fix/mic-toggle-current-main`, `fix/mic-toggle-main-sync`, `fix/mic-unmute-recovery-and-tone-polarity-0.10.19`, `fix/microphone-preflight-0.10.48`, `fix/microphone-toggle-recovery`, `fix/mute-hotkey-gesture-sounds-0.10.16`, `fix/native-caption-evidence-gate-20261011`, `fix/native-host-bootstrap-20261028`, `fix/no-navigation-official-0912`, `fix/no-new-stats-tab-0912`, `fix/official-earnings-sync-0912`, `fix/official-sync-and-observability-sha-0912`, `fix/official-sync-no-new-tab`, `fix/official-sync-silent-page-only`, `fix/overlay-call-start-reconciliation-v0.10.21`, `fix/overlay-master-hotkey-native-bootstrap-0.10.38`, `fix/parallel-presence-authorization-20261109-main`, `fix/parallel-presence-authorization-20261109`, `fix/performance-backlog-01042-20261108`, `fix/performance-overlays-autoanswer-01043-20261108`, `fix/pipeline-e2e-20261029`, `fix/popup-official-refresh`, `fix/presence-safety-20261020`, `fix/restore-blue-toolbar-context-20261109`, `fix/signal-interpreter-delivery-20261028`, `fix/signal-interpreter-installer-overlays-20261028`, `fix/silent-official-sync-0912`, `fix/version-identity-0913`, `fix/0.10.24-overlay-session-context`, `fix/0.10.26-source-grounded-caption-roles`, `fix/0.10.27-caption-shortcuts-clipboard`, `fix/0.10.30-call-caption-runtime`, `fix/0.10.32-tab-only`, `fix/0.10.33-active-call-hotload`, `fix/0.10.34-native-captions-only`\.
- `main`, `observability`\.
- `perf/autoanswer-fast-dispatch-20261110`\.
- `release/`\: `release/mic-preflight-0.10.48`, `release/0.9.14`, `release/0.9.23`\.
- `signal-interpreter-extension-0.10.38-dist`\.
- `sprint/`\: `sprint/observability-autoobservacion-2026-10-07`, `sprint/observability-autoobservacion-implementation-2026-10-07`\.
- `work/`\: `work/g11-presence-continuity`, `work/g12-autoanswer-revalidation`, `work/main-reconcile-no-regression-0.10.47-20261109`\.

**Conclusión remota sobre tu corrección\:** el código dual Groq no está solo en un checkout local; está publicado en \#94. Lo que GitHub todavía no demuestra es que la separación “cloud-only principal / Live Captions postergado” esté terminada como selector exclusivo, activado por defecto y liberado. En \#94 el ajuste Groq sigue apagado por defecto, mientras coexisten los módulos nativos. Esa política de producto, tal como la describes, sigue necesitando reflejo verificable en una rama/PR posterior o en el código local aún no subido.

## 2\. Arquitectura recomendada para KHORA sin regresiones

No trasladaría Signal Interpreter completo ni sustituiría la custodia de Dictado. Trasladaría su **patrón de ventanas de ASR y reconciliación**, manteniendo como autoridad de los originales el flujo que ya tiene KHORA.

**A. Captura dual**

Un `sessionId`; dos fuentes separadas: `microphone` y `chrome_tab`; un reloj monotónico común.

**B. Custodia continua de Dictado**

Partes originales → `custodia-local` → checkpoint → `/api/audio` → SHA/bytes verificados → B2. Este camino no depende de Groq.

**C. ASR paralelo por ventanas**

Copia derivada de cada fuente → ventanas WAV autónomas → Groq Whisper → segmentos con fuente, secuencia y tiempo.

**D. Diálogo editable**

Fusión cronológica por fuente; los segmentos originales son inmutables y la edición humana queda protegida.

**E. Archivar registro**

Validar todas las partes, recibos y hashes; sellar un volcado; no iniciar publicación ni sustituir el audio original.

**Qué reciclaría**

- De `DialogoPanel.tsx`\: inicialización y bloqueo de sesión (`navigator.locks`\), `sessionId`, owner autenticado, checkpoints, recuperación, cola de subidas, validación de las dos fuentes y cierre idempotente.
- De `lib/dialogo/contrato.ts`\: `FuenteDialogo`, `TurnoDialogo`, ordenamiento temporal y detección de solapamiento; sustituir los rótulos por `USUARIO` y `CHROME`\.
- De `lib/dialogo/archivar.ts`\: validación estricta de manifiesto y partes antes de enviar `/api/dictado`\.
- De Signal \#94: ventanas WAV autónomas, secuencias independientes por fuente, colas limitadas, reconciliación de solapamientos y medición de latencia hasta visibilidad.

**Qué reemplazaría o añadiría**

`capturar.ts` actual debe conservar la grabación cruda por fuente para Custodia, pero necesita un segundo carril de procesamiento en vivo. No usaría los fragmentos `MediaRecorder` de 5 segundos como si cada uno fuera un WAV independiente: la pista grabada es el original custodiado; AudioWorklet crea una copia PCM autónoma y ventanas de ASR. El endpoint actual `/api/transcribir/dialogo` puede permanecer como mecanismo de reintento o reconstrucción posterior, pero deja de ser el camino principal.

La API nueva de segmentos debe autenticar el propietario de `sessionId`, validar fuente/secuencia/duración/tamaño y llamar a Groq desde el servidor usando la credencial de KHORA. **No** copiaría a KHORA la clave Groq en el content script o en `chrome.storage` como hace el prototipo independiente de Signal.

**Edición mientras llegan segmentos**

El diálogo que se muestra no debe ser el único almacén de verdad. Mantendría\:

- `rawSegments`\: eventos de transcripción inmutables, con `segmentId`, `source`, `sequence`, `startMs`, `endMs`, `text` y estado.
- `displayText`\: representación que puede editar la persona.
- `textRevision` / `lastAppliedSegmentId`\: revisión editorial y último segmento incorporado.

Una actualización tardía solo puede modificar su segmento no editado. Si el operador corrige o reescribe un segmento, se marca como intervenido y el ASR no vuelve a sobrescribirlo. La fusión de ventanas identifica duplicados con fuente, secuencia y tiempo; no debe eliminar repeticiones legítimas ni unir voces distintas.

**Un solo audio descargable**

Conservaría en Custodia las dos pistas originales, por separado, con sus partes, hashes y procedencia. Después generaría un único master de descarga -preferiblemente WAV estéreo sincronizado, canal izquierdo `USUARIO`, derecho `CHROME`- como activo derivado, con hash, tamaño, MIME y referencia a los originales. No concatenaría los dos WebM ni destruiría las pistas independientes para obtener el archivo único.

## 3\. Crónica: qué reconstruir y qué debe recibir Integración

### Diferencias entre las propuestas históricas

| Referencia | Lo que aporta | Lo que no debe heredarse como estado actual |
|--------|--------|--------|
| C051 en `fix/cronica-checkpoint-c051-83abb5e4` | Checklist local de tres pistas: Momento, Lugar y Qué haces; reversible, no bloqueante, no certifica verdad ni consentimiento | El despliegue, los tests y el estado B2 allí documentados son de un corte histórico, no prueban que esa implementación esté en `main` |
| PR \#334 | Checklist progresivo de cuatro criterios: Fecha/hora, Lugar, Momento, Qué pasa; análisis semántico opcional con Groq, autenticación, fallback y límites estrictos de carga | Cerrada sin merge; su despliegue directo histórico no la convierte en código actual |
| PR \#335 | `CronicaCoverage` con pistas locales, `cronica-sobria-v1`, repositorio editorial, preview, consentimiento exacto y outbox | Cerrada sin merge; es una reconstrucción grande de Ingreso U01-U06, no un módulo que se pueda copiar íntegro a `main` |
| PR \#329 / `feat/blog-editorial-sync-20261019` | Backend Blog con control por revisión, digest, consentimiento y entrega secuenciada Blog→Facebook | Cerrada sin merge; no hay evidencia de que esté activo en el `main` actual |
| `feat/blog-intent-recovery-20261020` | Intención editorial recuperable, propuesta privada guardada y conciliación tras respuestas perdidas | Rama remota de trabajo; no fusionada |
| `feat/blog-text-workflow-20261019` | Preparación literal del texto, párrafos y offsets que apuntan al texto de origen | No crea un microblog resumido ni aprueba publicación |
| PR \#354 | Reintentos single-flight de subidas pendientes antes de archivar, con validación posterior | Abierta y Draft; pruebas de cliente simuladas, no prueba de B2/Neon real |

**Recomendación para el checklist\:** reconstruir los cuatro elementos solicitados como pistas orientativas durante la transcripción: `Fecha y hora`, `Lugar`, `Momento` y `Qué pasa`\. La detección inicial debería ser local y conservadora, para no introducir latencia ni enviar cada cambio de texto a un proveedor. El significado debe seguir la línea de \#334: fecha y hora del suceso solo se marcan explícitas si hay evidencia de ambas; el momento puede ser una expresión cotidiana; lugar requiere mención textual; “Qué pasa” incluye hechos, sensaciones, observaciones e ideas, no solamente una acción.

Hay que separar siempre `eventTime` \(lo que el relato dice que ocurrió) de `capturedAt` \(momento de grabación). No rellenar el primero con el segundo, ni inferir lugar por IP, ubicación del navegador o cabeceras del alojamiento. Una pista pendiente **no bloquea** ni seguir dictando ni “Archivar registro”.

**Conflicto de vocabulario que sí requiere resolución\:** \#335 mantiene `general | concreta | especializada`, incluyendo categorías como “hora dorada” y “hora azul”; \#334 elimina esa taxonomía y usa términos cotidianos. C051 pide mantener “Momento” amigable y no imponer precisión. Recomiendo el vocabulario plano de \#334/C051, sin categorías jerárquicas ni clasificación obligatoria.

**Dos salidas editoriales, no una sola\:**

1. `cronica_sobria`\: texto largo en primera persona, conservador, cotejable por unidades contra el original, con `sourceHash` y `requiresReview:true`\. Es el propósito de `cronica-sobria-v1` en \#335.
2. `microblog_280`\: pieza independiente de hasta 280 caracteres para el flujo de Integración. Debe generarse como resumen derivado, con su propio hash y revisión humana. `prepareLiteralTranscript()` de `feat/blog-text-workflow` usa 280 como objetivo para cortar párrafos en una preparación literal; **no** genera un microblog de 280 caracteres.

La crónica larga no debe recortarse para convertirse en microblog, ni el microblog reemplazar la transcripción o la crónica completa. Ambas salidas deben apuntar a la misma versión/hash del volcado y distinguirse como derivados.

## 4\. Bloqueantes, riesgos de regresión y plan por fases

### Bloqueantes reales

| Bloqueante | Estado y consecuencia |
|--------|--------|
| Gobierno del frente | El OCP actual de Dictado, §4, aún declara Diálogo, Crónica, Ingreso general y publicación fuera de alcance. La nueva especificación cambia esa frontera; hay que actualizar el contrato canónico antes de modificar código. |
| Streaming de voz | KHORA tiene captura dual y custodia, pero no transcripción en vivo. La API actual espera al cierre de la grabación. |
| Extensión Aisthesis | Captura solo `chrome_tab`; el micrófono no está integrado en ese módulo. Depende además de un WebSocket local `ws://127.0.0.1:8788/`\. |
| Custodia durante streaming | Las ventanas enviadas a Groq no pueden convertirse en la fuente de verdad. La captura original debe continuar pasando por el almacenamiento local, checkpoints, `/api/audio` y verificación existente. |
| Archivo e Integración | `publicationIntent` existe en ramas históricas como dato local cifrado y parte del checkpoint; no he encontrado un outbox de Integración ya fusionado en `main` que lo haga persistente en servidor al archivar. |
| Redes externas | El código candidato de Blog contempla GitHub Pages y Facebook. No encontré proveedores X ni TikTok. |
| Prueba de audio real | \#94 está Draft y sin aceptación acústica real; \#354 está Draft y sus respuestas de backend se simularon. No equivalen a pruebas reales de Chrome + Groq + B2. |

El `main` actual de KHORA tiene SHA `55bfcfc76f49a033061e706e6c4dbb1e3538b2b1`\. El OCP que hay que reconciliar es [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/OBJETO-CANONICO.md?utm_source=chatgpt.com)\. Por separado, `frentes/notas/cronica/RETOMA-20261114.md` es un registro documental del frente Notas, no una implementación de Crónica; allí se afirma que Notas sigue no desarrollado.

### El checkmark y el contrato exacto al archivar

El antecedente técnico útil está en `feat/u06-sobre-ingreso-work-1990819938695134734` y `feat/blog-intent-recovery-20261020`\. Su contrato local `PublicationIntent` es\:

```ts
type PublicationIntent = {
  publicationId: string;
  decision: null | boolean;
  sourceTextSha256: string;
  state:
    | "awaiting_archive"
    | "awaiting_decision"
    | "awaiting_editorial_receipt"
    | "received";
};
```

`iniciarIntencion()` genera un identificador y un SHA-256 del texto; si el contenido cambia, crea una intención nueva. La intención se escribe en el registro local cifrado y en el `CapturaSnapshot` del checkpoint. Después de archivar, la rama conserva localmente un recibo `{ volcado_id, version, sha256 }` y pasa a `awaiting_decision`\.

Eso es una buena base de idempotencia y recuperación, pero **no es todavía un relevo durable de servidor**\: el contrato está en IndexedDB/checkpoint y no encontré en `main` una tabla/outbox transaccional que vincule ese consentimiento pendiente con el volcado archivado.

**Contrato que recomiendo implementar para esta especificación** -propuesta nueva, no un esquema ya desplegado\:

El checkmark se llamaría **“Preparar en Integración”**, estaría marcado por defecto y sería desactivable. Su valor representa una solicitud de preparación, nunca consentimiento para publicar.

Al pulsar `Archivar registro`, el payload de Dictado incluiría este bloque\:

```ts
type IntegrationHandoffIntentV1 = {
  schema: "khora.integration-handoff.v1";
  intentId: string;               // UUID idempotente
  requested: boolean;             // true por defecto; false si se desmarca
  mode: "cronica";
  sourceTextSha256: string;       // SHA-256 del texto original
  representations: {
    cronicaSobria: true;
    microblog: {
      requested: true;
      maxCharacters: 280;
    };
  };
  destinations: [
    "github_blog",
    "facebook",
    "x",
    "tiktok"
  ];
  publicationDecision: null;      // jamás inferida del checkmark
  state: "awaiting_archive" | "queued" | "disabled";
};
```

El propietario no lo proporciona el cliente: el servidor lo deriva de la sesión autenticada. Una vez que el archivo se confirma, la misma transacción que vincula el `sessionId` al volcado debe crear una fila de handoff en el almacén de Integración\:

| Campo persistido | Propósito |
|--------|--------|
| `intent_id` | Idempotencia de la solicitud |
| `owner` | Propietario derivado de autenticación |
| `session_id` | Identidad de la captura original |
| `volcado_id` | Identificador devuelto por el archivado |
| `source_version` | Versión exacta del volcado |
| `source_sha256` | Huella exacta del texto original |
| `mode` | `cronica` |
| `requested` | Valor real del checkmark |
| `representations` | Crónica sobria y microblog de hasta 280 caracteres |
| `destinations` | Destinos solicitados |
| `state` | `queued` o `disabled` al confirmar el archivo |
| `created_at`, `updated_at` | Trazabilidad temporal del relevo |

La clave única debe impedir más de un handoff por la misma intención/volcado/versión/huella. Así, si la respuesta del archivado se pierde, el reintento con el mismo `sessionId` recupera el mismo volcado y la misma intención; no crea una segunda publicación.

**Estados separados, dos responsabilidades\:**

- Dictado: `awaiting_archive` → `queued` cuando el volcado queda confirmado; `disabled` si se desmarca el checkmark.
- Integración: `queued` → `draft_ready` → `awaiting_approval` → `approved` → `delivering` → `published`, o `blocked`/`cancelled`\.
- Entrega por proveedor: conservar estados como `pending`, `submitting`, `unknown`, `confirmed`, `blocked` y `cancelled`, con intentos, digest, URL y comprobante por destino.

La publicación real solo puede iniciarse después de que Integración haya generado las propuestas y mostrado la vista previa exacta. La aprobación explícita debe estar ligada a la huella de esa versión y representación concreta. Editar el texto invalida esa aprobación y exige revisión de nuevo.

Este diseño conserva la separación que ya intentaba el código editorial histórico: el archivo de Dictado es manual y termina en el recibo; Blog/Redes gestionan propuestas, consentimiento y publicaciones en el frente Integración.

### Riesgos de regresión

1. **Dictado normal\:** compartir código de captura entre micrófono simple y modo dual puede alterar sus permisos, estados, tiempos de finalización o subidas. Las dos rutas necesitan adaptadores de captura distintos y una interfaz común, no una reescritura del flujo normal.
2. **Notas rápidas\:** el selector de métodos de Ingreso debe seguir separado del selector de modalidad de Dictado. Diálogo y Crónica no deben introducirse como opciones hermanas de Notas rápidas.
3. **Custodia\:** no se puede archivar con una parte pendiente, un hash no verificado, un índice duplicado o un checkpoint que no contenga el manifiesto íntegro. La transcripción visible no acredita que el audio esté conservado.
4. **Edición en vivo\:** una respuesta tardía de Whisper no puede sobrescribir una corrección humana ni volver a una revisión anterior del texto.
5. **Extensión\:** la ruta de Aisthesis tiene un almacén/puente y ciclo de captura propios. Conectarla directamente a Dictado sin un contrato único de sesión podría crear dos fuentes de estado y dos vías de archivo.
6. **Historial Maya\:** \#335 y sus migraciones contienen `conversacion_maya`\. La nueva experiencia debe eliminar esa opción y toda referencia activa a Maya/Sesame, pero preservar los registros históricos para no romper lectura, recuperación o integridad de volcados antiguos.

### Orden seguro de implementación y pruebas

| Fase | Trabajo | Compuertas |
|--------|--------|--------|
| 0\. Contrato | Actualizar OCP, rutas de UI, fronteras Dictado/Integración y esquema del handoff | Revisión de alcance; no tocar Chat/Open WebUI |
| 1\. Crónica | Checklist de cuatro pistas, checkmark activo por defecto, persistencia del valor en checkpoint; sin bloquear archivo | `typecheck` → `ui:contract` → `test:unit` → E2E de UI |
| 2\. Diálogo en vivo | Dos fuentes, ventanas WAV, dos colas Groq, segmentos incrementales, reconciliación y edición protegida | Pruebas unitarias de chunking, solapamiento, secuencia, errores y edición |
| 3\. Custodia y audio único | Mantener partes originales, checkpoint y B2; crear master estéreo derivado y descargable | Reintentos 503/502, sesión interrumpida, hash/bytes, read-back físico y recuperación |
| 4\. Archivo y handoff | Transacción idempotente de volcado + intención persistente | Doble clic, respuesta perdida, checkmark desactivado, fallo entre archivo y outbox |
| 5\. Integración | Generación de crónica y microblog; proveedores GitHub, Facebook, X y TikTok | Preview exacta, digest, consentimiento, comprobante por destino y reintento sin duplicación |

La batería de KHORA ya ofrece los scripts `typecheck`, `ui:contract`, `test:unit` y `e2e`\. El orden debe ser el indicado; luego debe ejecutarse `npm run build`, cuyo `prebuild` incorpora typecheck, controles de UI, pruebas unitarias y preflight de experiencia/extensión/almacenamiento. Añadir pruebas específicas para\:

- Dictado normal, adjuntar audio y Notas rápidas sin cambio de comportamiento.
- Permiso de micrófono denegado, pestaña sin audio, pista terminada, navegación, desconexión y recarga durante diálogo.
- Groq 429, 5xx, timeout, segmentos fuera de orden, ventanas duplicadas y saturación de colas.
- Edición humana mientras llegan turnos de ambas fuentes.
- Audio original íntegro y master descargable sincronizado, con reproducción comprobada.
- Archivo doble, checkpoint atrasado, parte pendiente y respuesta perdida.
- Handoff opt-out, idempotencia, exactitud del hash y ausencia de publicación sin aprobación.

**PR \#354 merece atención antes de integrar cambios\:** contiene una corrección útil de drenaje single-flight de partes pendientes y revalidación justo antes de archivar. Está abierta y Draft; reporta pruebas locales de tipo, 572 unitarias y 3 E2E, pero los endpoints de audio/checkpoint/archivo fueron simulados. No prueba el ciclo real B2/Neon, ni su CI remoto ejecutó los pasos que permitirían atribuir fallos a pruebas de producto. Debe compararse con el `main` actual antes de portar sus cambios, nunca mezclarse a ciegas con la nueva captura.

---

## 5\. URLs directas de GitHub para revisión de código

**KHORA - `main` y ramas históricas claramente identificadas**

1. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/app/components/ingreso/IngresoWorkspace.tsx?utm_source=chatgpt.com)
2. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/app/components/ingreso/DialogoPanel.tsx?utm_source=chatgpt.com)
3. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/lib/dialogo/capturar.ts?utm_source=chatgpt.com)
4. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/app/api/transcribir/dialogo/route.ts?utm_source=chatgpt.com)
5. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/lib/client/custodia-local.ts?utm_source=chatgpt.com)
6. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/app/api/dictado/checkpoint/route.ts?utm_source=chatgpt.com)
7. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/extension/harmonia/modules/live-caption/background.js?utm_source=chatgpt.com)
8. [github.com](https://github.com/SeryMente/khora/blob/main/khora-web/extension/harmonia/modules/live-caption/offscreen.js?utm_source=chatgpt.com)
9. [github.com](https://github.com/SeryMente/khora/blob/feat/u06-sobre-ingreso-work-1990819938695134734/khora-web/app/components/ingreso/CronicaCoverage.tsx?utm_source=chatgpt.com)
10. [github.com](https://github.com/SeryMente/khora/blob/feat/u06-sobre-ingreso-work-1990819938695134734/khora-web/lib/ingreso/cronica-editorial.ts?utm_source=chatgpt.com)
11. [github.com](https://github.com/SeryMente/khora/blob/feat/u06-sobre-ingreso-work-1990819938695134734/khora-web/lib/server/blog/repository.ts?utm_source=chatgpt.com)

**Signal Interpreter - candidata cloud/Groq más reciente, PR \#94**

12. [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/groq-dialogue-capture.js?utm_source=chatgpt.com)
13. [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/whisper-window-processor.js?utm_source=chatgpt.com)
14. [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/groq-transcriber.js?utm_source=chatgpt.com)
15. [github.com](https://github.com/SeryMente/signal-interpreter/blob/feat/groq-dual-quality-20261112/extension/background.js?utm_source=chatgpt.com)

### Documentos y PRs de referencia

- [github.com](https://github.com/SeryMente/khora/blob/fix/cronica-checkpoint-c051-83abb5e4/docs/frentes/dictado-voz/evidencias/C051-cronica-b2.md?utm_source=chatgpt.com)
- [github.com](https://github.com/SeryMente/khora/blob/main/docs/frentes/dictado-voz/OBJETO-CANONICO.md?utm_source=chatgpt.com)
- [github.com](https://github.com/SeryMente/khora/pull/334?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/khora/pull/335?utm_source=chatgpt.com)
- [github.com](https://github.com/SeryMente/khora/pull/329?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/khora/pull/330?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/khora/pull/354?utm_source=chatgpt.com)
- [github.com](https://github.com/SeryMente/signal-interpreter/pull/84?utm_source=chatgpt.com) · [github.com](https://github.com/SeryMente/signal-interpreter/pull/94?utm_source=chatgpt.com)

**Dictamen\:** la ruta técnica de menor regresión es conservar el pipeline de custodia y archivo de Dictado, sumar la transcripción por ventanas como un carril paralelo no autoritativo y crear un handoff transaccional a Integración. Crónica queda como modalidad guiada, con archivo siempre libre; el checkmark solicita preparación, no publicación. Signal Interpreter \#94 es una referencia valiosa para chunking, colas y latencia, pero no debe importarse como si ya fuera una release cloud-only validada.

Recuento preciso de Signal Interpreter: 94 PRs en GitHub - 11 abiertas, 83 cerradas y 66 fusionadas. El repositorio `SeryMente/signal-interpreter` es público. La inspección fue remota y de solo lectura; no se modificaron ramas, PRs, archivos ni despliegues.

**Continuidad del marco solicitado\:** IPZ v0.7 · antigüedad NO VERIFICADA; DUG · versión/firma NO VERIFICADAS; CONV/CICLO/A/B · PENDIENTE / NO ASIGNADO (sin folio FOL1 activo).



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)