# Matriz diagnóstica de las 59 unidades de EpisTwin

Fuente normativa: Unidades Auditoría Fidelidad v1.1 en Notion. Esta tabla distingue realización parcial, defecto demostrado, prueba faltante y límite de interpretación. No es una certificación formal del Protocolo de Construcción Auditada; ALCANCE no significa implementación probada.

| Unidad | Obligación / límite | Dictamen de esta revisión | Trazabilidad y brecha |
|---|---|---|---|
| UA-01 | IO tipado σ/μ/c | PARCIAL | api.py, _normalizar, phi_m; falta paridad integral H08 |
| UA-02 | Pertenencia y participación | PARCIAL | _memoria anclaje/MENTIONS; cadena visible separada H01 |
| UA-03 | Entity/Literal/Blank; usuario sin cola | PARCIAL | restricciones reales en _memoria; H07/H08 impiden conformidad integral |
| UA-04 | Alcance desde usuario | PARCIAL | check_huerfanos real; no prueba global del frente |
| UA-05 | Actualización incremental Ψ/⊕ | PARCIAL | asentar/psi existen; H09/H12 |
| UA-06 | ΦM determinista | PARCIAL | _phi_m ordena claves y emite literales; H08 frontera incompatible |
| UA-07 | Normalización antes de fKGC | PARCIAL | transducir compone normalizar+extraer; ruta visible distinta |
| UA-08 | fKGC probabilística y heterogénea | PARCIAL | _fkgc_temperature>0; sin integración multimodal acreditada |
| UA-09 | Imágenes primarias; audio extensión | ALCANCE | No atribuir audio al artículo; frontera de fuente requiere prueba propia |
| UA-10 | Leiden conectado | PARCIAL | validación conectividad en dos implementaciones; no integración |
| UA-11 | Objetivo modularidad | PARCIAL | ModularityVertexPartition real; no verdad autobiográfica |
| UA-12 | Tras update aceptado | NO CONFORME | H02/H09: aceptación fabricada y recuperación posterior incompleta |
| UA-13 | Comunidades como nodos | NO CONFORME INTEGRAL | Núcleo reifica; proyección visible solo atributos H01/H12 |
| UA-14 | fSUM de subgrafo inducido | NO CONFORME | H13: filtros de tipo/vigencia insuficientes |
| UA-15 | Recuperador/generador separados | PARCIAL | Núcleo separa; endpoint publicado no compone H14 |
| UA-16 | Recuperación topológica | PARCIAL | retriever expande; circuito visible no lo alimenta H01 |
| UA-17 | Estado/política/operadores reales | NO CONFORME | H15: REFINE no gobierna RETRIEVE |
| UA-18 | Historial persistido | PARCIAL | history.py SQLite real; aislamiento y retención pendientes H18/H22 |
| UA-19 | Herramientas y delegación ejecutables | PARCIAL | Operadores existen; eficacia causal y conexión no acreditadas |
| UA-20 | fVAL global | NO CONFORME CONDICIONAL | H16: existe global pero mark permite bypass; endpoint no lo usa |
| UA-21 | Fallback solo déficit visual | PARCIAL | orchestrator/deficit_type; modo mark y compatibilidad requieren cierre |
| UA-22 | Fallback corutina | PARCIAL | async fallback/tvis reales; falta recorrido real |
| UA-23 | Payload visual y reanálisis | PARCIAL | raw via PuertoVision y tvis; no prueba real nueva |
| UA-24 | Selección visual topológica | PARCIAL | fallback usa gstar_nodes; no prueba causal real nueva |
| UA-25 | Respuesta visual no vuelve al grafo | PARCIAL | fallback guarda H_t no PKG; prueba global pendiente |
| UA-26 | LLM no memoria personal; no bypass | NO CONFORME INTEGRAL | H14: chat directo existe fuera de la cadena; no presentarlo como prótesis |
| UA-27 | Construcción vs razonamiento | PARCIAL | módulos separados, composición publicada faltante |
| UA-28 | Inferencia híbrida | NO VERIFICABLE | No traza real completa publicada con grafo poblado |
| UA-29 | Respuesta no solo simbólica | NO CONFORME INTEGRAL | endpoint devuelve recuperación sin generación H14 |
| UA-30 | Borrado sin residuos | PARCIAL | barrera de índice real; H22 alcance incompleto |
| UA-31 | Modelos congelados sin personal finetune | NO VERIFICABLE | No evidencia de entrenamiento personalizado; no audita proveedor/retención externa |
| UA-32 | Soberanía arquitectónica | NO VERIFICABLE | H18/H22; proveedores externos y perímetro sin acreditar |
| UA-33 | Benchmark sintético no independiente | ALCANCE | No se usa como prueba de facultad autobiográfica |
| UA-34 | 71 IO/7 fuentes/100 preguntas para paridad | NO VERIFICABLE | No se ejecutó paridad literal en esta revisión |
| UA-35 | Límites evidencia multihop | ALCANCE | No generalizar benchmarks cortos a ideación longitudinal |
| UA-36 | Jueces multi-arquitectura y orden de evaluación | NO VERIFICABLE | Instrumentación existe; no evaluación reproducida aquí |
| UA-37 | Fiabilidad κ y estadístico alternativo | NO VERIFICABLE | Funciones existen; no panel evaluado aquí |
| UA-38 | Límites contexto | PARCIAL | fsum trunca entradas por presupuesto; cobertura/omisiones deben declararse |
| UA-39 | Riesgo adherencia modelos pequeños | ALCANCE | Sin acreditación de modelo por tamaño o nombre |
| UA-40 | Calidad sobre latencia | PARCIAL | Declaración no sustituye control de calidad real |
| UA-41 | Roles funcionales separados | PARCIAL | constructor/policy/retriever/generator/fVAL/fSUM presentes; conexión faltante |
| UA-42 | Arquitectura abstracta, no stack obligatorio | ALCANCE | Recomendación conserva núcleo por reutilización, no obligación del paper |
| UA-43 | Comunidad causa recuperación | NO VERIFICABLE | retriever usa pertenencia; A/B real no ejecutada H17 |
| UA-44 | fVAL redirige realmente | NO CONFORME CONDICIONAL | H16: autoaprobación visual por configuración |
| UA-45 | Historial gobierna política | PARCIAL | _policy lee historial; refinamiento no efectivo H15 |
| UA-46 | Proyección exacta y manifiesto | PARCIAL | manifiesto explícito; lecturas no fijadas y circuitos separados H10/H12 |
| UA-47 | Algoritmo/versión/seed/parámetros | PARCIAL | metadata real, gamma no efectivo declarado; no sensibilidad acreditada |
| UA-48 | Partición íntegra/conectada/única | PARCIAL | _validate_partition y validación JavaScript; no evidencia integral de publicación |
| UA-49 | Update causa Leiden | PARCIAL | hook real; H09 puede evitar reanudación |
| UA-50 | Reemplazo atómico de partición | PARCIAL | staging y publicar en transacción; no corte datos+índice H12 |
| UA-51 | Reificación/resumen/revisión/fingerprint | PARCIAL | núcleo sí; H13 y ruta visible distintas |
| UA-52 | Delete regenera comunidades | PARCIAL | olvidar recalcula; prueba global pendiente H22 |
| UA-53 | A/B con efecto real en G* | NO VERIFICABLE | compare_community_ab tiene defecto etiquetas R11; falta ablación real |
| UA-54 | No teorema autobiográfico | ALCANCE | Estándar exige prueba de uso, no inferencia por Leiden |
| UA-55 | Forense/procedencia temporal upstream | PARCIAL | H05/H10/H19: fuentes y campos no bastan para sentido/versionado íntegro |
| UA-56 | Nulo/multiseed/resolución | NO CONFORME INSTRUMENTAL | H17: resolución inefectiva declarada y métrica/nulo requieren validación |
| UA-57 | Seguimiento longitudinal split/merge | NO CONFORME INSTRUMENTAL | R11: etiquetas alteran estabilidad, disjunción da 1 |
| UA-58 | Facultad no nace de Leiden | ALCANCE | H21: falta tarea real y juicio de capacidad |
| UA-59 | Hipótesis prospectiva, umbral/horizonte/refutación | NO VERIFICABLE | Perfil de acreditación general pendiente; no inventar umbral |
