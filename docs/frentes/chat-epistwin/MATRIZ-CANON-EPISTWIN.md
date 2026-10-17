# Matriz de correspondencia · EpisTwin → UA v1.2 → frente chat

Materialización técnica del único estado vivo en OBJETO-CANONICO.md. No es otra cola ni un certificado. Revisión documental 2026-10-17: artículo https://arxiv.org/html/2603.06290v1, secciones completas recuperadas. Taxonomía fuente https://www.notion.so/55d5d4a3b25083a1a14381ca70281acd actualizada a v1.2; 59 IDs preservados. Fuente congelada citada allí no descargada/rehasheada; no equivalencia binaria declarada.

Clases: F=formalismo/arquitectura del paper; E=perfil experimental o límite reportado, no condición universal; D=control derivado de auditoría/ingeniería; X=extensión propia de Khora; B=frontera interpretativa. Un mismo ID puede combinar clases: no sumar 59 como denominador homogéneo de fidelidad estricta. «Alineada» significa correspondencia documental, NO prueba de cumplimiento del sistema. Cada implementación requiere SHA/código/prueba/traza específicos.

| UA | Clase | Ancla canónica | Regla/resultado del cotejo |
| --- | --- | --- | --- |
| 01 | F | §3 Def.1 | σ, μ bajo Mσ y c opcional; alineada. |
| 02 | F | §3 Def.2/Remark1 | Pertenencia O participación; alineada. |
| 03 | F | §3.1 Def.3 | E/L/B disjuntos, literal no head, u no tail; alineada. |
| 04 | F | §3.1 Def.3 | Todas las colas alcanzables desde u; alineada. |
| 05 | F | §4.1 Ec.1 | Ψ incremental y fusión; no fija algoritmo universal de deduplicación. |
| 06 | F | §4.1.1 Ec.2 | Metadatos deterministas, head nι; alineada. |
| 07 | F | §4.1.2 | Imagen→caption→tripletas, dos etapas; separar responsabilidades, no imponer checkpoints distintos. |
| 08 | F | §3.2 Def.4 | Muestreo LLM + parsing, sensibilidad a fuente; alineada. |
| 09 | B | §4.1.2 | No textual limitado a imágenes; audio/video son extensión. |
| 10 | F | §3.3 | Leiden por conectividad; no inferir significado autobiográfico garantizado. |
| 11 | F | §3.3 Def.5/§4.2 | Modularidad Q; alineada. |
| 12 | F | §4.2 | Comunidades después de cada actualización; alineada. |
| 13 | F | §4.2 Ec.3–5 | CORREGIDA v1.2: (miembro,in_community,nP), no inversa. |
| 14 | F | §4.2 Ec.6–7 | Resumen solo subgrafo estrictamente inducido; alineada. |
| 15 | F | §3.4 | Retriever + generador, responsabilidades distintas; no exige dos modelos neuronales adicionales. |
| 16 | F | §3.4 | Operadores topológicos, comunidades o ego-networks; no recuperación plana decorada. |
| 17 | F | §3.5/§5.1 | Política, estado, acciones; esqueleto de control puede ser determinista sin sustituir política. |
| 18 | F | §3.5/§5.1 | Historia intra-consulta usada entre pasos; no exige publicar razonamiento privado ni retenerlo indefinidamente. |
| 19 | F | §5.1 | Herramientas simbólicas y delegación en espacio de acciones; alineada. |
| 20 | F | §5.1 | Suficiencia global de q/Ht, no verificador claim-by-claim; alineada. |
| 21 | F | §1/§5.2 | Visión ante déficit visual, no cualquier vacío textual; lectura conjunta de §5.1/5.2. |
| 22 | F | §1/§5.1 | Cooperación coroutine y expansión de contexto; no imponer sintaxis async/coroutine de lenguaje. |
| 23 | F | §5.2 | Recuperar payload original y reanalizar con visión; caption no basta. |
| 24 | F | §5.2 | Subconjunto topológicamente pertinente, no álbum completo. |
| 25 | F | §5.2 | a_vis contexto efímero actual, nunca realimentación automática al PKG. |
| 26 | F | §1 | LLM no almacén personal; conocimiento general fuera del modo personal debe distinguirse si se ofrece. |
| 27 | F | §1/§4/§5 | Construcción y razonamiento desacoplados; alineada. |
| 28 | F | §1/§5 | Híbrido también en inferencia, no solo reglas de grafo. |
| 29 | F | §3 | Generación neuronal condicionada en evidencia; alineada. |
| 30 | F+D | §1/§8/Ética | Borrado verificable; inventario/residuos es operacionalización, no prueba jurídica universal. |
| 31 | F | Ética | Modelos congelados, sin fine-tuning personal; verificar términos de proveedor aparte. |
| 32 | F+B | §3.1/Ética | Soberanía arquitectónica; aislamiento físico condicional a modelos locales. |
| 33 | E+B | §6.1 | PersonalQA sintético y autoría de autores; no datos reales de usuario ni validación independiente. |
| 34 | E | §6.1 Tabla1 | 71 IO, 7 fuentes, 100 QA, T_global; literal solo si se selecciona ese perfil. |
| 35 | E+B | §6.1 Tabla1 | 63/32/4/1 preguntas por 1/2/3/4 fuentes; no extrapolar profundidad. |
| 36 | E | §6.3 | CORREGIDA: cuatro jueces en perfil literal; ≥2 es perfil reducido Khora. Explicación evaluativa sin exigir pensamiento privado. |
| 37 | E | §6.3/§7.2 Tabla2 | CORREGIDA: %acuerdo, κ ponderada, AC1, Spearman ρ y Krippendorff α en metodología completa; tabla incluye AC1 0.81 pese al titular >0.84. |
| 38 | E+B | §7.3 | Riesgo de saturación documentos largos; no ocultarlo. |
| 39 | E+B | §7.3 | Dificultad <10B reportada, no teorema de imposibilidad ni umbral garantizado. |
| 40 | E+B | §7.3 | Latencia por coordinación, no recortar semántica para exhibir velocidad. |
| 41 | F | §4–5/§6.2 | Roles distintos, mismo checkpoint puede ejecutar varios; distinguir especificación de estrategia de llamadas. |
| 42 | E+B | §6.2 | Neo4j/modelos concretos como instanciación, no todos obligatorios al formalismo. |
| 43 | D | §3.3/3.4 | Traza causal de topología; consultas específicas de comunidad para demostrar su aporte, no toda consulta ambas vías. |
| 44 | D | §5.1/5.2 | CORREGIDA: caso real visual insuficiente redirige y textual insuficiente no fuerza visión. |
| 45 | D | §3.5/5.1 | Prueba causal de lectura Ht, no mera escritura; usar observaciones/acciones trazables. |
| 46 | D | §3.3/4.2 | Manifiesto de proyección es evidencia de ingeniería, no formato fijado en paper. |
| 47 | D | §3.3/4.2 | Registrar versión/objetivo/parámetros; valores no definidos por autores no se atribuyen al canon. |
| 48 | F+D | §3.3 Def.5/Leiden | Integridad/conectividad; política elegibles/aislados se declara en implementación. |
| 49 | D | §4.2 | Trazabilidad causal actualización→Leiden; identificador de revisión es mecanismo de prueba. |
| 50 | D | §4.2 Ec.3–5 | Vigencia coherente de particiones; atomicidad es decisión operacional, no algoritmo literal. |
| 51 | F+D | §4.2 Ec.3–7 | CORREGIDA dirección miembro→nP; hash/revisión son controles derivados. |
| 52 | D | §4.2/Ética | Regeneración/invalidez de derivados tras corrección/borrado; demostrar ausencia de residuo pertinente. |
| 53 | D | §3.4 | A/B como control elegido, no experimento exigido por el artículo a toda implementación. |
| 54 | B | §3.3/4.2 | Modularidad/conectividad no garantizan tema vital ni etapas biográficas. |
| 55 | X+B | Def.1–3/§4.1 | Procedencia paper; bitemporalidad/cadena forense son alcance adicional de Khora. |
| 56 | X | Sin protocolo literal equivalente | Nulos/multisemilla/resolución validan hipótesis Khora; parámetro inefectivo debe declararse. |
| 57 | X | Incrementalidad como motivación | Linaje/alineación longitudinal es extensión, no teorema exigido por §4.1/4.2. |
| 58 | X+B | Sin SEA/IAR/RES en paper | Facultades independientes, no garantizadas por Leiden. |
| 59 | X | Sin preregistro literal equivalente | Preregistro de emergencia propio de Khora, no fidelidad estricta. |

## Regla para futuras evidencias

Para cada UA aplicada a construcción añadir fuente/sección, lectura precisa, perfil, archivo y SHA, test/caso, entorno y tipo de evidencia, resultado observado y limitación. Lo desconocido queda pendiente; no llenar PASS por inspección estática. Estado/cola exclusivamente en OBJETO-CANONICO.md §8. Esta matriz puede enriquecerse con evidencia sin duplicar veredictos contradictorios.

## Discrepancias priorizadas

1. Taxonomía corregida: dirección Ec.5, panel/suite y fronteras O/P; no atribuir todos los controles a autores.
2. Workspace: VCU mezcla historia y atribuciones RAKG/RUVA; informe julio y auditoría octubre tienen distinto corte. Revisión focal, no inventario completo de todas las páginas.
3. Código focal: core política no serializa observaciones completas; REFINE no se usa explícitamente como siguiente query; fVAL no recibe q explícitamente; perfil jueces mínimo dos es reducido. Riesgos a demostrar/resolver, no bugs productivos certificados.
4. Puente Open WebUI: no inspeccionado/implementado; licencia, privacidad, compatibilidad de modelos y autoridad del núcleo requieren contratos y pruebas propios.

## Revisión documental

Cotejo primario completo de secciones del paper y lectura de 59 unidades; correcciones v1.2 preservan IDs. No se ha hecho auditoría jurídica exhaustiva, reproducción experimental, lectura de todos los archivos ni prueba productiva. El artículo contiene diferencias entre titulares y tabla (AC1); registrar la inconsistencia, no corregir a los autores silenciosamente. No exigir revelación de pensamiento interno para implementar/verificar estado operativo.
