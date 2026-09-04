// @l0 L0-002-R · @req TITULOS-LLM/REQ-1 · @req TITULOS-LLM/REQ-2
import assert from "assert";
import test from "node:test";
import {
  segmentarTextoEnChunks,
  generarTituloFallback,
  generarTituloEstructurado,
  generarTituloDeUltimoRecurso,
  generarTituloConGarantia,
  buscarOffsetLiteral,
  esTituloGenericoOInvalido,
} from "../../lib/server/titulos";

test("Titulos Suite - PROMPT TIT-1A Engine Tests & Golden Cases", async (t) => {
  await t.test("1. segmentarTextoEnChunks aplica solapamiento real (overlapChars) sin cortar contexto", () => {
    const p1 = "Párrafo 1 con discusión técnica sobre arquitectura. ".repeat(15);
    const p2 = "Párrafo 2 con detalles de implementación en la base de datos. ".repeat(15);
    const p3 = "Párrafo 3 con la decisión final estratégica aprobada. ".repeat(15);

    const textoLargo = `${p1}\n\n${p2}\n\n${p3}`;
    const maxChars = 1000;
    const overlapChars = 200;

    const chunks = segmentarTextoEnChunks(textoLargo, maxChars, overlapChars);
    assert.ok(chunks.length >= 2, "Debe generar múltiples chunks");

    // Verificar que entre chunks consecutivos hay solapamiento de texto
    if (chunks.length > 1) {
      const c1End = chunks[0].slice(-100);
      const c2Start = chunks[1].slice(0, 100);
      // Al menos algunas palabras del final de c1 aparecen al inicio de c2 debido al overlap
      const palabrasComunes = c1End.split(/\s+/).filter((p) => p.length > 4 && c2Start.includes(p));
      assert.ok(palabrasComunes.length > 0, "Debe existir solapamiento de palabras entre chunks adyacentes");
    }
  });

  await t.test("2. Idea central ubicada al final en un documento multi-chunk (12+ chunks)", async () => {
    delete process.env.GROQ_API_KEY; // Usar engine de fallback determinista distribuido

    // Crear un texto largo de 12+ chunks con charla preliminar al inicio y la decisión clave al final
    const preliminar = "Charla introductoria sobre temas menores del día a día. ".repeat(300); // varios chunks
    const conclusionFinal = "Finalmente, tras una larga discusión, se decidió migrar la infraestructura principal a PostgreSQL en Alta Disponibilidad antes del cierre del trimestre.";
    const textoCompleto = `${preliminar}\n\n${conclusionFinal}`;

    const chunks = segmentarTextoEnChunks(textoCompleto, 1200, 200);
    assert.ok(chunks.length >= 12, `Debe generar al menos 12 chunks (obtenido: ${chunks.length})`);

    const resultado = await generarTituloConGarantia(textoCompleto);
    assert.strictEqual(resultado.fallback_used, true);
    assert.ok(resultado.title.length >= 20, "El título debe tener contenido sustancial");
    assert.ok(!resultado.title.includes('"'), "No debe incluir comillas");

    // Verificar que la idea final fue capturada y no ignorada por truncación
    const normTitle = resultado.title.toLowerCase();
    assert.ok(
      normTitle.includes("postgresql") || normTitle.includes("migrar") || normTitle.includes("infraestructura") || normTitle.includes("disponibilidad"),
      `El título debe reflejar la idea central del final (título: "${resultado.title}")`
    );
  });

  await t.test("3. Un solo hilo ideacional claro", () => {
    const texto = "En la sesión de auditoría contable del primer trimestre se verificaron todos los comprobantes fiscales y no se encontraron inconsistencias en los libros.";
    const resultado = generarTituloFallback(texto);

    assert.ok(resultado.title.length >= 20, "Título sustancial");
    assert.ok(resultado.title.length <= 220, "Respetar límite de longitud");
    assert.ok(resultado.evidence.length > 0, "Debe incluir evidencia con offsets");
    assert.ok(resultado.coverage_score > 0, "Cobertura mayor a 0");
  });

  await t.test("4. Cinco hilos temáticos sintetizados sin rebasar límite de longitud", () => {
    const texto = `
      Primero, revisamos la migración de base de datos a PostgreSQL.
      Segundo, evaluamos la integración con la API de Groq para síntesis de texto.
      Tercero, discutimos la seguridad con tokens OAuth2 y autenticación PKCE.
      Cuarto, revisamos el control de calidad de la transcrpición Whisper.
      Quinto, acordamos la publicación del manifiesto de integridad SHA256 para el entorno persistente.
    `;
    const resultado = generarTituloFallback(texto);

    assert.ok(resultado.title.length <= 220, `El título multihilo no debe superar 220 caracteres (longitud: ${resultado.title.length})`);
    assert.ok(!esTituloGenericoOInvalido(resultado.title), "No debe ser un título genérico");
  });

  await t.test("5. Dictado repetitivo con deduplicación de ideas", () => {
    const texto = "Se aprobó el presupuesto. Se aprobó el presupuesto para la nueva sede. Repito, el presupuesto de la nueva sede quedó formalmente aprobado hoy.";
    const resultado = generarTituloFallback(texto);

    assert.ok(!esTituloGenericoOInvalido(resultado.title));
    assert.ok(resultado.title.length <= 180);
    // Verificar que no repita la misma frase múltiples veces de forma idéntica
    const recs = resultado.title.match(/presupuesto/gi) || [];
    assert.ok(recs.length <= 3, "Debe deduplicar frases en el título");
  });

  await t.test("6. Preservación de nombres propios ratificados (Dąbrowski, Groq, Juan Pérez)", () => {
    const texto = "El doctor Dąbrowski y Juan Pérez evaluaron el desempeño del modelo Groq en el laboratorio central de innovación.";
    const resultado = generarTituloFallback(texto);

    const norm = resultado.title.toLowerCase();
    assert.ok(
      norm.includes("dabrowski") || norm.includes("juan") || norm.includes("groq") || norm.includes("perez"),
      "Debe preservar los nombres propios sustanciales"
    );
  });

  await t.test("7. Manejo correcto de negaciones explícitas", () => {
    const texto = "Tras la revisión técnica, la junta directiva determinó que NO se autoriza la venta del activo inmobiliario en la sede norte.";
    const resultado = generarTituloFallback(texto);

    assert.ok(resultado.title.length >= 20);
    assert.ok(!esTituloGenericoOInvalido(resultado.title));
  });

  await t.test("8. Transcripción centrada en una pregunta o interrogante clave", () => {
    const texto = "¿Es viable migrar toda la infraestructura a contenedores serverless antes del cierre del año fiscal sin interrumpir el servicio?";
    const resultado = generarTituloFallback(texto);

    assert.ok(resultado.title.length >= 15);
    assert.ok(!resultado.title.includes("Reflexiones sobre"));
  });

  await t.test("9. Tomar decisiones o acuerdos formales como eje del título", () => {
    const texto = "Por unanimidad del consejo directivo, se acordó ratificar el plan de expansión regional y asignar los fondos necesarios de inmediato.";
    const resultado = generarTituloFallback(texto);

    assert.ok(resultado.title.length >= 30);
    assert.ok(resultado.title.includes("—") || resultado.title.includes("acordó") || resultado.title.includes("ratificar") || resultado.title.includes("expansión"), `El título debe reflejar el acuerdo (título: "${resultado.title}")`);
  });

  await t.test("10. Material heterogéneo y multidisciplinario", () => {
    const texto = `
      Se presentó el balance financiero anual con un crecimiento del 12%.
      Posteriormente, el equipo de ingeniería mostró la arquitectura de microservicios.
      Para finalizar, el departamento legal confirmó el cumplimiento normativo GDPR.
    `;
    const resultado = generarTituloFallback(texto);

    assert.ok(!esTituloGenericoOInvalido(resultado.title));
    assert.ok(resultado.ideas.length >= 1);
  });

  await t.test("11. Fallback sin API key distribuye el análisis por todo el documento y calcula offsets válidos", () => {
    delete process.env.GROQ_API_KEY;
    const texto = "En la reunión inicial se planteó la meta. A mitad de la sesión se revisó el presupuesto. Al cierre se aprobó la ejecución inmediata del proyecto Alfa.";
    const res = generarTituloFallback(texto);

    assert.strictEqual(res.fallback_used, true);
    assert.strictEqual(res.model, "fallback_determinista");
    assert.strictEqual(res.prompt_version, "tit-1a-v1");
    assert.ok(res.evidence.length > 0, "Debe incluir evidencias con offsets");

    // Comprobar que los offsets generados coinciden exactamente con posiciones reales o null declarados
    for (const ev of res.evidence) {
      if (ev.start !== null && ev.end !== null) {
        assert.strictEqual(texto.slice(ev.start, ev.end), ev.text, "Offset debe coincidir exactamente con la cita literal");
      }
    }
  });

  await t.test("12. Detección y rechazo de títulos genéricos o prohibidos", () => {
    assert.strictEqual(esTituloGenericoOInvalido("Reflexiones sobre el tema"), true);
    assert.strictEqual(esTituloGenericoOInvalido("Notas de la reunión"), true);
    assert.strictEqual(esTituloGenericoOInvalido("Resumen del contenido"), true);
    assert.strictEqual(esTituloGenericoOInvalido("Dictado sin contenido"), true);
    assert.strictEqual(esTituloGenericoOInvalido("Sin título"), true);
    assert.strictEqual(esTituloGenericoOInvalido("Aprobación del plan estratégico de migración a la nube"), false);
  });

  await t.test("13. Offset matching de evidencia literal (buscarOffsetLiteral)", () => {
    const fuente = "El servidor principal fue reiniciado a las 04:00 AM para aplicar parches de seguridad.";
    const cita = "reiniciado a las 04:00 AM";
    const resOffset = buscarOffsetLiteral(fuente, cita);

    assert.strictEqual(resOffset.text, cita);
    assert.strictEqual(resOffset.start, 26);
    assert.strictEqual(resOffset.end, 51);
    assert.strictEqual(fuente.slice(resOffset.start!, resOffset.end!), cita);

    // Cita inexistente devuelve null sin inventar offsets
    const citaInexistente = "concepto no existente en el texto";
    const resInexistente = buscarOffsetLiteral(fuente, citaInexistente);
    assert.strictEqual(resInexistente.start, null);
    assert.strictEqual(resInexistente.end, null);
  });

  await t.test("14. generarTituloDeUltimoRecurso garantiza siempre un título no vacío sin fallar", () => {
    assert.ok(generarTituloDeUltimoRecurso("", 12).includes("Volcado #12"));
    assert.ok(generarTituloDeUltimoRecurso("", null).includes("Volcado sin transcripción"));
    assert.strictEqual(generarTituloDeUltimoRecurso("hola mundo", 5), "hola mundo");

    const textoLargo = "Esta es una transcripción normal de un dictado para probar la truncación de último recurso";
    const res = generarTituloDeUltimoRecurso(textoLargo, 10);
    assert.ok(res.length >= 5 && res.length <= 80);
  });

  await t.test("15. generarTituloConGarantia devuelve un TituloConGarantiaResult completo y nunca falla", async () => {
    delete process.env.GROQ_API_KEY;

    const resVacio = await generarTituloConGarantia("", 42);
    assert.ok(resVacio.title.includes("Volcado #42"));
    assert.strictEqual(resVacio.nivel, "ultimo_recurso");
    assert.strictEqual(resVacio.fallback_used, true);

    const texto = "En la conferencia de tecnología se presentó el nuevo chip cuántico de alta eficiencia energética.";
    const resTexto = await generarTituloConGarantia(texto, 101);
    assert.ok(resTexto.title.length >= 10);
    assert.strictEqual(resTexto.fallback_used, true);
    assert.ok(resTexto.coverage_score >= 0);
    assert.ok(resTexto.confidence >= 0);
    assert.strictEqual(resTexto.prompt_version, "tit-1a-v1");
  });

  await t.test("A. IDEA-CENTRAL-AL-FINAL: texto con >=14 chunks donde la afirmación central aparece SOLO en el último chunk", async () => {
    delete process.env.GROQ_API_KEY;
    const chunksTexto: string[] = [];
    for (let i = 1; i <= 13; i++) {
      chunksTexto.push(`Chunk ${i} con discusión sobre aspectos operativos secundarios del proyecto sin tomar decisiones definitivas. `.repeat(15));
    }
    const chunkFinal = "En el chunk catorce se aprobó la resolución crucial: implementar la arquitectura QuantumDąbrowski en la nube.";
    chunksTexto.push(chunkFinal);
    const textoCompleto = chunksTexto.join("\n\n");

    const res = await generarTituloConGarantia(textoCompleto);
    const titleNorm = res.title.toLowerCase();
    assert.ok(
      titleNorm.includes("quantum") || titleNorm.includes("dabrowski") || titleNorm.includes("catorce"),
      `El título debe capturar la idea central del último chunk 14 (título obtenido: "${res.title}")`
    );
  });

  await t.test("B. IDEA-EN-CHUNK-12: término distintivo inyectado únicamente en el chunk 12", async () => {
    delete process.env.GROQ_API_KEY;
    const chunksTexto: string[] = [];
    for (let i = 1; i <= 14; i++) {
      if (i === 12) {
        chunksTexto.push("En esta doceava sección se introduce la especificación MóduloXylophone para el motor de cómputo. ".repeat(10));
      } else {
        chunksTexto.push(`Sección ${i} con notas operativas de rutina sin mayor trascendencia. `.repeat(15));
      }
    }
    const textoCompleto = chunksTexto.join("\n\n");

    const res = await generarTituloConGarantia(textoCompleto);
    const fullTextResult = (res.title + " " + res.ideas.map((i) => i.label).join(" ")).toLowerCase();
    assert.ok(
      fullTextResult.includes("xylophone") || fullTextResult.includes("modulo"),
      `El título o las ideas deben reflejar el término del chunk 12 (obtenido: "${res.title}")`
    );
  });

  await t.test("C. TRES-HILOS: texto multihilo con 3 líneas ideacionales claras debe exponer las 3", () => {
    delete process.env.GROQ_API_KEY;
    const texto = `
      Primera línea: Se concretó la migración completa a PostgreSQL.
      Segunda línea: Se desplegó la integración de modelos con Groq.
      Tercera línea: Se configuró la seguridad OAuth2 con PKCE.
    `;
    const res = generarTituloFallback(texto);
    assert.ok(res.ideas.length >= 3, `Debe exponer al menos 3 ideas (obtenido: ${res.ideas.length})`);
    assert.ok(res.ideas.length <= 3, `Máximo 3 ideas (obtenido: ${res.ideas.length})`);
  });

  await t.test("D. ORACIÓN-CLAVE-TARDÍA: oración decisiva es la 4ª dentro de un bloque", () => {
    delete process.env.GROQ_API_KEY;
    const chunkInicial = "Sección inicial introductoria con discusiones generales. ".repeat(20);
    const chunkDecisivo = "Discusión preliminar. Contexto secundario. Notas de soporte. Oración cuatro decisiva: se aprobó la ratificación del acuerdo estratégico QuantumDąbrowski para la compañía.";
    const texto = `${chunkInicial}\n\n${chunkDecisivo}`;
    const res = generarTituloFallback(texto);
    const combo = (res.title + " " + JSON.stringify(res.ideas) + " " + res.evidence.map((e) => e.text).join(" ")).toLowerCase();
    assert.ok(
      combo.includes("quantum") || combo.includes("dabrowski") || combo.includes("acuerdo") || combo.includes("ratificación"),
      `La 4ª oración decisiva debe ser capturada (obtenido título: "${res.title}")`
    );
  });

  await t.test("E. OVERLAP-FRONTERA: bigrama en el límite de chunk aparece íntegro con overlapChars > 0", () => {
    const pad1 = "Palabra ".repeat(120); // ~960 chars
    const bigrama = "FronteraAlfa FronteraBeta";
    const pad2 = " Continuación ".repeat(120);
    const texto = `${pad1}${bigrama}${pad2}`;

    const maxChars = 1000;
    const overlapChars = 200;
    const chunks = segmentarTextoEnChunks(texto, maxChars, overlapChars);

    const contieneBigramaIntegro = chunks.some((c) => c.includes("FronteraAlfa FronteraBeta"));
    assert.ok(contieneBigramaIntegro, "El bigrama en la frontera debe aparecer íntegro en algún chunk gracias al overlap real");
  });

  await t.test("F. FALLBACK-DISTRIBUIDO: sin API key sobre texto con inicio genérico y señal al centro/final", () => {
    delete process.env.GROQ_API_KEY;
    const inicioGenerico = "Buenas tardes a todos los presentes en la reunión cotidiana de seguimiento. ".repeat(10);
    const senalCentroFinal = "Se aprobó el presupuesto para el Lanzamiento Satelital Khora. ".repeat(5);
    const texto = `${inicioGenerico}\n\n${senalCentroFinal}`;

    const res = generarTituloFallback(texto);
    const titleNorm = res.title.toLowerCase();

    assert.ok(!titleNorm.startsWith("buenas tardes"), `El título NO debe salir de las primeras palabras genéricas (obtenido: "${res.title}")`);
    assert.ok(
      titleNorm.includes("lanzamiento") || titleNorm.includes("satelital") || titleNorm.includes("khora") || titleNorm.includes("presupuesto"),
      `El título debe reflejar la señal del centro/final (obtenido: "${res.title}")`
    );
  });

  await t.test("NO-REGRESIÓN: comprobación explícita de no truncamiento sobre chunks 11/12", async () => {
    delete process.env.GROQ_API_KEY;
    const chunksTexto: string[] = [];
    for (let i = 1; i <= 12; i++) {
      if (i === 11) {
        chunksTexto.push("En el bloque once se aprobó la resolución MarcadorUnicoChunk11 para la plataforma. ".repeat(15));
      } else {
        chunksTexto.push(`Texto repetitivo genérico del bloque ${i} con notas de rutina sin mayor trascendencia. `.repeat(15));
      }
    }
    const texto = chunksTexto.join("\n\n");
    const res = await generarTituloConGarantia(texto);
    const combo = (res.title + " " + JSON.stringify(res.ideas) + " " + res.evidence.map((e) => e.text).join(" ")).toLowerCase();

    assert.ok(
      combo.includes("marcadorunicochunk11"),
      `El pipeline debe procesar los chunks pasados del 10º (obtenido título: "${res.title}")`
    );
  });
});
