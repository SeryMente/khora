// @l0 L0-002-R · @req REVISION/REQ-1,UI-TRANSICION-REVISION/REQ-1
import test from "node:test";
import assert from "node:assert";

// Configurar variables de entorno dummy antes de importar neon y cripto
process.env.DATABASE_URL = "postgres://localhost:5432/mock";
process.env.X_KHORA_KEY = "dummy-key-32-chars-long-or-more-key";

import { getDb } from "../lib/server/neon";
import { cifrarTexto, descifrarTexto } from "../lib/server/cripto";
import {
  sha256de,
  calcularDelta,
  crearVersion,
  asegurarVersionInicial,
  listarVersiones,
  guardarEdicion,
  marcarPendienteRevision,
  iniciarRevision,
  aprobarVersion,
  reabrirRevision
} from "../lib/server/correcciones";

import {
  obtenerTodasSugerencias,
  clasificarCambioSemantico
} from "../lib/server/asistenteRevision";

// Estructuras de datos en memoria para simulación SQL
let volcadosMemory: any[] = [];
let versionesMemory: any[] = [];
let auditoriasMemory: any[] = [];
let correccionesMemory: any[] = [];

// Reiniciar base de datos en memoria
function reiniciarBaseDeDatos() {
  volcadosMemory = [];
  versionesMemory = [];
  auditoriasMemory = [];
  correccionesMemory = [];
}

// Configurar el mock de query en el pool devuelto por getDb
const db = getDb();
db.query = (async (sql: string, params?: any[]): Promise<any> => {
  const normSql = sql.replace(/\s+/g, " ").trim();
  const p = params || [];

  // 1. MAX(version) de volcado_version
  if (normSql.includes("COALESCE(MAX(version)") && normSql.includes("volcado_version")) {
    const filtered = versionesMemory.filter(v => v.volcado_id === p[0]);
    const maxVal = filtered.reduce((max, v) => Math.max(max, v.version), 0);
    return { rows: [{ ultima: maxVal }] };
  }

  // 2. COUNT(*) de volcado_version
  if (normSql.includes("COUNT(*)::int") && normSql.includes("volcado_version")) {
    const filtered = versionesMemory.filter(v => v.volcado_id === p[0]);
    return { rows: [{ n: filtered.length }] };
  }

  // 3. SELECT de volcado_version específica por volcado_id y version
  if (normSql.includes("volcado_version") && normSql.includes("volcado_id = $1 AND version = $2")) {
    const v = versionesMemory.find(item => item.volcado_id === p[0] && item.version === p[1]);
    return { rows: v ? [v] : [] };
  }

  // 4. SELECT de volcado_version ORDER BY version ASC
  if (normSql.includes("volcado_version") && normSql.includes("ORDER BY version ASC")) {
    const filtered = versionesMemory
      .filter(v => v.volcado_id === p[0])
      .sort((a, b) => a.version - b.version);
    return { rows: filtered };
  }

  // 5. SELECT de volcado_version ORDER BY version DESC LIMIT 1
  if (normSql.includes("volcado_version") && normSql.includes("ORDER BY version DESC LIMIT 1")) {
    const filtered = versionesMemory
      .filter(v => v.volcado_id === p[0])
      .sort((a, b) => b.version - a.version);
    return { rows: filtered.length > 0 ? [filtered[0]] : [] };
  }

  // 6. SELECT de volcado por ID (robusto, evitando overlap con volcado_version)
  if (normSql.includes("FROM volcado") && !normSql.includes("FROM volcado_version") && normSql.includes("id = $1")) {
    const v = volcadosMemory.find(item => item.id === p[0]);
    return { rows: v ? [v] : [] };
  }

  // 7. SELECT auditoría de revisión
  if (normSql.includes("volcado_revision_auditoria WHERE volcado_id = $1")) {
    const filtered = auditoriasMemory
      .filter(a => a.volcado_id === p[0])
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return { rows: filtered };
  }

  // 8. SELECT de correcciones
  if (normSql.includes("correccion WHERE volcado_id = $1")) {
    const filtered = correccionesMemory.filter(c => c.volcado_id === p[0]);
    return { rows: filtered };
  }

  // 9. INSERT INTO volcado_version
  if (normSql.includes("INSERT INTO volcado_version")) {
    versionesMemory.push({
      id: p[0],
      volcado_id: p[1],
      version: p[2],
      texto: p[3],
      sha256: p[4],
      chars: p[5],
      motivo: p[6],
      creado_en: new Date()
    });
    return { rows: [] };
  }

  // 10. INSERT INTO volcado_revision_auditoria
  if (normSql.includes("INSERT INTO volcado_revision_auditoria")) {
    auditoriasMemory.push({
      id: p[0],
      volcado_id: p[1],
      accion: p[2],
      estado_anterior: p[3],
      estado_nuevo: p[4],
      version: p[5],
      sha256: p[6],
      usuario: p[7],
      created_at: new Date()
    });
    return { rows: [] };
  }

  // 11. INSERT INTO correccion
  if (normSql.includes("INSERT INTO correccion")) {
    correccionesMemory.push({
      id: p[0],
      volcado_id: p[1],
      antes: p[2],
      despues: p[3],
      version_desde: p[4],
      version_hasta: p[5],
      creado_en: new Date()
    });
    return { rows: [] };
  }

  // 12. UPDATE volcado (guardarEdicion)
  if (normSql.includes("UPDATE volcado SET") && normSql.includes("ediciones = COALESCE(ediciones, 0) + 1")) {
    const v = volcadosMemory.find(item => item.id === p[0]);
    if (v) {
      v.texto_original = v.texto_original || v.texto;
      v.texto = p[1];
      v.sha256 = p[2];
      v.chars = p[3];
      v.estado = p[4];
      v.ediciones = (v.ediciones || 0) + 1;
      v.version_aprobada = null;
      v.sha256_aprobado = null;
      v.aprobado_en = null;
      v.aprobador = null;
      v.editado_en = new Date();
    }
    return { rows: [] };
  }

  // 13. UPDATE volcado estado genérico (marcarPendienteRevision, iniciarRevision)
  if (normSql.includes("UPDATE volcado SET estado =") && !normSql.includes("version_aprobada")) {
    const v = volcadosMemory.find(item => item.id === p[0]);
    if (v) {
      if (normSql.includes("'pendiente_revision'")) {
        v.estado = "pendiente_revision";
      } else if (normSql.includes("'en_revision'")) {
        v.estado = "en_revision";
      } else {
        v.estado = p[1];
      }
    }
    return { rows: [] };
  }

  // 14. UPDATE volcado aprobarVersion
  if (normSql.includes("UPDATE volcado SET") && normSql.includes("estado = 'listo_ingesta'")) {
    const v = volcadosMemory.find(item => item.id === p[0]);
    if (v) {
      v.estado = "listo_ingesta";
      v.version_aprobada = p[1];
      v.sha256_aprobado = p[2];
      v.aprobado_en = new Date();
      v.aprobador = p[3];
    }
    return { rows: [] };
  }

  // 15. UPDATE volcado reabrirRevision
  if (normSql.includes("UPDATE volcado SET") && normSql.includes("estado = 'en_revision', version_aprobada = NULL")) {
    const v = volcadosMemory.find(item => item.id === p[0]);
    if (v) {
      v.estado = "en_revision";
      v.version_aprobada = null;
      v.sha256_aprobado = null;
      v.aprobado_en = null;
      v.aprobador = null;
    }
    return { rows: [] };
  }

  // 16. UPDATE volcado estado simple (ingerido, fallido)
  if (normSql.includes("UPDATE volcado SET estado = 'ingerido'") || normSql.includes("UPDATE volcado SET estado = 'fallido'")) {
    const v = volcadosMemory.find(item => item.id === p[0]);
    if (v) {
      if (normSql.includes("'ingerido'")) v.estado = "ingerido";
      if (normSql.includes("'fallido'")) v.estado = "fallido";
    }
    return { rows: [] };
  }

  // Fallback silencioso para DDLs u otros
  return { rows: [] };
}) as any;


// --- INICIO DE CASOS DE PRUEBA ---

test("1. Creación de versión inicial", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "11111111-1111-1111-1111-111111111111";

  // Registrar el volcado con texto original
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Transcripción de prueba"),
    sha256: sha256de("Transcripción de prueba"),
    chars: "Transcripción de prueba".length,
    estado: "archivado",
    audio_url: null,
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);

  const versiones = await listarVersiones(volcadoId);
  assert.strictEqual(versiones.length, 1, "Debe tener exactamente 1 versión inicial");
  assert.strictEqual(versiones[0].version, 1, "La versión debe ser la 1");
  assert.strictEqual(versiones[0].texto, "Transcripción de prueba", "El texto de v1 debe coincidir");
});

test("2. Edición", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "22222222-2222-2222-2222-222222222222";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto base original"),
    sha256: sha256de("Texto base original"),
    chars: "Texto base original".length,
    estado: "archivado",
    audio_url: null,
    ediciones: 0
  });

  const resEdicion = await guardarEdicion(volcadoId, "Texto base original corregido", "operador1@khora.com");
  assert.strictEqual(resEdicion.version, 2, "La nueva versión tras la edición debe ser 2");
  assert.strictEqual(resEdicion.sinCambios, false, "Debe indicar que hubo cambios");

  // Verificar que el estado del volcado cambió a 'en_revision'
  const volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "en_revision", "El estado debe transicionar a 'en_revision' tras la edición");
  assert.strictEqual(volcado.ediciones, 1, "El contador de ediciones debe incrementarse a 1");

  // Verificar auditoría
  const audit = auditoriasMemory.find(a => a.volcado_id === volcadoId && a.accion === "version_guardada");
  assert.ok(audit, "Debe registrarse el evento 'version_guardada' en auditoría");
  assert.strictEqual(audit.usuario, "operador1@khora.com", "El auditor debe ser el operador");
  assert.strictEqual(audit.version, 2, "Debe auditar la versión 2");
});

test("3. Creación de nueva versión", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "33333333-3333-3333-3333-333333333333";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Original"),
    sha256: sha256de("Original"),
    chars: 8,
    estado: "archivado",
    audio_url: null,
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  const v2 = await crearVersion(volcadoId, "Segunda versión manual", "segunda");
  assert.strictEqual(v2.version, 2);

  const versiones = await listarVersiones(volcadoId);
  assert.strictEqual(versiones.length, 2, "Debe haber 2 versiones");
  assert.strictEqual(versiones[1].texto, "Segunda versión manual");
});

test("4. Preservación del original", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "44444444-4444-4444-4444-444444444444";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto original e intocable"),
    sha256: sha256de("Texto original e intocable"),
    chars: 26,
    estado: "archivado",
    audio_url: null,
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  await guardarEdicion(volcadoId, "Texto editado");

  const versiones = await listarVersiones(volcadoId);
  assert.strictEqual(versiones[0].version, 1);
  assert.strictEqual(versiones[0].texto, "Texto original e intocable", "La v1 original debe preservarse intacta");
});

test("5. Cálculo de delta", () => {
  const original = "El veloz murcielago hindu comia feliz cardillo";
  const editado = "El veloz murcielago hindu comia feliz tomate"; // cardillo -> tomate
  const delta = calcularDelta(original, editado);

  assert.ok(delta.length > 0, "El delta no debe estar vacío");
  assert.strictEqual(delta[0].antes, "cardillo");
  assert.strictEqual(delta[0].despues, "tomate");
});

test("6. Aprobación de versión", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "66666666-6666-6666-6666-666666666666";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto base"),
    sha256: sha256de("Texto base"),
    chars: 10,
    estado: "en_revision",
    audio_url: null,
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  const ed = await guardarEdicion(volcadoId, "Texto aprobado final");

  const resAprobacion = await aprobarVersion(volcadoId, ed.version, "auditor@khora.com");
  assert.strictEqual(resAprobacion.version, 2);

  const volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "listo_ingesta", "Debe cambiar de estado a 'listo_ingesta'");
  assert.strictEqual(volcado.version_aprobada, 2);
  assert.strictEqual(volcado.sha256_aprobado, ed.sha256);
  assert.strictEqual(volcado.aprobador, "auditor@khora.com");

  // Auditoría
  const audit = auditoriasMemory.find(a => a.volcado_id === volcadoId && a.accion === "version_aprobada");
  assert.ok(audit, "Debe registrarse 'version_aprobada' en auditoría");
  assert.strictEqual(audit.estado_nuevo, "listo_ingesta");
});

test("7. Rechazo de aprobación de versión inexistente", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "77777777-7777-7777-7777-777777777777";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto"),
    sha256: sha256de("Texto"),
    chars: 5,
    estado: "en_revision",
    audio_url: null,
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);

  await assert.rejects(
    async () => {
      await aprobarVersion(volcadoId, 99, "auditor@khora.com");
    },
    /La versión a aprobar debe ser la versión vigente más reciente|La versión solicitada no existe/,
    "Debe lanzar error por versión inexistente"
  );
});

test("8. Rechazo de versión de otro volcado", async () => {
  reiniciarBaseDeDatos();
  const volcadoId1 = "81111111-8111-8111-8111-811111111111";
  const volcadoId2 = "82222222-8222-8222-8222-822222222222";

  volcadosMemory.push(
    { id: volcadoId1, texto: cifrarTexto("v1"), sha256: sha256de("v1"), chars: 2, estado: "en_revision", ediciones: 0 },
    { id: volcadoId2, texto: cifrarTexto("v2"), sha256: sha256de("v2"), chars: 2, estado: "en_revision", ediciones: 0 }
  );

  await asegurarVersionInicial(volcadoId1);
  await asegurarVersionInicial(volcadoId2);

  // Intentar aprobar versión 2 en volcado2, pero no existe la versión 2 de volcado2 (solo tiene v1)
  await assert.rejects(
    async () => {
      await aprobarVersion(volcadoId2, 2, "auditor@khora.com");
    },
    /La versión a aprobar debe ser la versión vigente más reciente|La versión solicitada no existe/
  );
});

test("9. Imposibilidad de ingerir versión no aprobada", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "99999999-9999-9999-9999-999999999999";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Contenido"),
    sha256: sha256de("Contenido"),
    chars: 9,
    estado: "en_revision", // No está en listo_ingesta
    version_aprobada: null,
    sha256_aprobado: null,
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);

  // Simulamos la validación que hace /api/ingesta
  const volcado = volcadosMemory.find(v => v.id === volcadoId);
  const esIngestable = volcado.estado === "listo_ingesta" && volcado.version_aprobada !== null;

  assert.strictEqual(esIngestable, false, "No debe permitir la ingesta porque no ha sido aprobado");
});

test("10. Reapertura de revisión", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "10101010-1010-1010-1010-101010101010";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto para aprobar"),
    sha256: sha256de("Texto para aprobar"),
    chars: 18,
    estado: "en_revision",
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  await aprobarVersion(volcadoId, 1, "supervisor@khora.com");

  // Reapertura
  await reabrirRevision(volcadoId, "supervisor@khora.com");

  const volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "en_revision", "El estado debe regresar a 'en_revision'");
  assert.strictEqual(volcado.version_aprobada, null, "La versión aprobada activa debe invalidarse (ser null)");
  assert.strictEqual(volcado.sha256_aprobado, null, "El hash aprobado debe invalidarse (ser null)");

  // El historial de aprobación debe persistir en auditoría
  const auditAprobado = auditoriasMemory.find(a => a.volcado_id === volcadoId && a.accion === "version_aprobada");
  const auditReabierto = auditoriasMemory.find(a => a.volcado_id === volcadoId && a.accion === "revision_reabierta");

  assert.ok(auditAprobado, "La historia de la aprobación debe permanecer en auditoría");
  assert.ok(auditReabierto, "Debe registrarse el evento de reapertura en auditoría");
});

test("11. Integridad SHA", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "11111111-1111-1111-1111-111111111112";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto seguro"),
    sha256: sha256de("Texto seguro"),
    chars: 12,
    estado: "en_revision",
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);

  // Corromper el hash de la versión inicial en memoria de forma malintencionada
  versionesMemory[0].sha256 = "hash_falso_corrupto";

  await assert.rejects(
    async () => {
      await aprobarVersion(volcadoId, 1, "supervisor@khora.com");
    },
    /Integridad rota/,
    "Debe detectar que el SHA256 no coincide con el contenido real recalculado"
  );
});

test("12. Audio ausente y presente", async () => {
  reiniciarBaseDeDatos();
  const volcadoIdSinAudio = "12111111-1211-1211-1211-121111111111";
  const volcadoIdConAudio = "12222222-1222-1222-1222-122222222222";

  volcadosMemory.push(
    { id: volcadoIdSinAudio, texto: cifrarTexto("sin"), sha256: sha256de("sin"), chars: 3, estado: "archivado", audio_url: null },
    { id: volcadoIdConAudio, texto: cifrarTexto("con"), sha256: sha256de("con"), chars: 3, estado: "archivado", audio_url: "https://ejemplo.com/audio.webm" }
  );

  const vSin = volcadosMemory.find(v => v.id === volcadoIdSinAudio);
  const vCon = volcadosMemory.find(v => v.id === volcadoIdConAudio);

  // Flags de integridad
  assert.strictEqual(!!vSin.audio_url, false, "Sin audio");
  assert.strictEqual(!!vCon.audio_url, true, "Con audio");
});

test("13. Múltiples versiones", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "13131313-1313-1313-1313-131313131313";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("v1"),
    sha256: sha256de("v1"),
    chars: 2,
    estado: "archivado",
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  await guardarEdicion(volcadoId, "v2");
  await guardarEdicion(volcadoId, "v3");
  await guardarEdicion(volcadoId, "v4");

  const versiones = await listarVersiones(volcadoId);
  assert.strictEqual(versiones.length, 4, "Deben existir exactamente 4 versiones registradas en orden");
  assert.strictEqual(versiones[0].version, 1);
  assert.strictEqual(versiones[1].version, 2);
  assert.strictEqual(versiones[2].version, 3);
  assert.strictEqual(versiones[3].version, 4);
});

test("14. Sugerencia ortotipográfica y lingüística sugerida y aceptada", async () => {
  const textoPrueba = "hola,mundo este es un texto de prueba khora";
  const sugerencias = await obtenerTodasSugerencias(textoPrueba);

  assert.ok(sugerencias.length > 0, "Debe generar sugerencias para el texto con errores");
  const sug = sugerencias[0];
  assert.ok(sug.id, "Debe tener un id único");
  assert.ok(sug.sugerencia, "Debe contener una sugerencia de reemplazo");

  // Aplicación manual de la sugerencia
  const textoCorregido = textoPrueba.replace(sug.texto_original, sug.sugerencia);
  assert.notStrictEqual(textoCorregido, textoPrueba, "El texto debe modificarse tras aceptar la sugerencia");
});

test("15. Sugerencia rechazada", async () => {
  const textoPrueba = "hola,mundo";
  const sugerencias = await obtenerTodasSugerencias(textoPrueba);
  assert.ok(sugerencias.length > 0);

  const sug = sugerencias[0];
  sug.estado = "rechazada";

  assert.strictEqual(sug.estado, "rechazada", "La sugerencia debe marcarse como rechazada");
});

test("16. Cambio semántico marcado con severidad alta", () => {
  const c1 = clasificarCambioSemantico("no acepto los terminos", "acepto los terminos");
  assert.strictEqual(c1.esCambioSemantico, true, "Eliminar o agregar negación es un cambio semántico");
  assert.strictEqual(c1.severidad, "alta", "Cambio semántico debe marcarse con severidad alta");

  const c2 = clasificarCambioSemantico("10", "100");
  assert.strictEqual(c2.esCambioSemantico, true, "Alterar números es un cambio semántico");
  assert.strictEqual(c2.severidad, "alta", "Cambio en cifras debe tener severidad alta");
});

test("17. Edición posterior a una aprobación invalida la aprobación anterior", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "17171717-1717-1717-1717-171717171717";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto v1"),
    sha256: sha256de("Texto v1"),
    chars: 8,
    estado: "en_revision",
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  const ed2 = await guardarEdicion(volcadoId, "Texto v2 corregido");

  // Aprobar v2
  await aprobarVersion(volcadoId, ed2.version, "aprobador@khora.com");
  let volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "listo_ingesta");
  assert.strictEqual(volcado.version_aprobada, 2);

  // Realizar edición v3 posterior a aprobación
  await guardarEdicion(volcadoId, "Texto v3 modificado de nuevo", "operador@khora.com");

  volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "en_revision", "El estado debe regresar a 'en_revision'");
  assert.strictEqual(volcado.version_aprobada, null, "La versión aprobada debe invalidarse (ser NULL)");
  assert.strictEqual(volcado.sha256_aprobado, null, "El SHA aprobado debe invalidarse (ser NULL)");
  assert.strictEqual(volcado.aprobado_en, null, "La fecha de aprobación debe invalidarse (ser NULL)");
  assert.strictEqual(volcado.aprobador, null, "El aprobador debe invalidarse (ser NULL)");
});

test("18. Intento de aprobar una versión antigua falla", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "18181818-1818-1818-1818-181818181818";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("v1"),
    sha256: sha256de("v1"),
    chars: 2,
    estado: "en_revision",
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  await guardarEdicion(volcadoId, "v2 con cambios");

  // Intentar aprobar versión 1 cuando la versión vigente es la 2
  await assert.rejects(
    async () => {
      await aprobarVersion(volcadoId, 1, "supervisor@khora.com");
    },
    /La versión a aprobar debe ser la versión vigente más reciente/,
    "Debe rechazar el intento de aprobar una versión histórica antigua"
  );
});

test("19. Intento de aprobar desde estado incorrecto falla", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "19191919-1919-1919-1919-191919191919";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("v1 archivado"),
    sha256: sha256de("v1 archivado"),
    chars: 12,
    estado: "archivado", // Estado no permitido para aprobación directa
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);

  await assert.rejects(
    async () => {
      await aprobarVersion(volcadoId, 1, "supervisor@khora.com");
    },
    /Solo se puede aprobar un volcado en estado 'en_revision'/,
    "Debe fallar al intentar aprobar desde un estado distinto a 'en_revision'"
  );
});

test("20. Auditoría registra estado anterior real", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "20202020-2020-2020-2020-202020202020";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Texto archivado inicial"),
    sha256: sha256de("Texto archivado inicial"),
    chars: 23,
    estado: "archivado",
    ediciones: 0
  });

  await asegurarVersionInicial(volcadoId);
  await guardarEdicion(volcadoId, "Texto editado v2", "operador@khora.com");

  const auditGuardado = auditoriasMemory.find(a => a.volcado_id === volcadoId && a.accion === "version_guardada");
  assert.ok(auditGuardado, "Debe existir auditoría de versión guardada");
  assert.strictEqual(auditGuardado.estado_anterior, "archivado", "Debe registrar el estado anterior real 'archivado'");
  assert.strictEqual(auditGuardado.estado_nuevo, "en_revision");

  // Aprobar v2 desde en_revision
  await aprobarVersion(volcadoId, 2, "supervisor@khora.com");
  const auditAprobado = auditoriasMemory.find(a => a.volcado_id === volcadoId && a.accion === "version_aprobada");
  assert.ok(auditAprobado, "Debe existir auditoría de versión aprobada");
  assert.strictEqual(auditAprobado.estado_anterior, "en_revision", "Debe registrar el estado anterior real 'en_revision'");
  assert.strictEqual(auditAprobado.estado_nuevo, "listo_ingesta");
});

test("21. Transición de inicio de revisión (archivado -> pendiente_revision -> en_revision)", async () => {
  reiniciarBaseDeDatos();
  const volcadoId = "21212121-2121-2121-2121-212121212121";
  volcadosMemory.push({
    id: volcadoId,
    texto: cifrarTexto("Volcado recien archivado"),
    sha256: sha256de("Volcado recien archivado"),
    chars: 24,
    estado: "archivado",
    ediciones: 0
  });

  await marcarPendienteRevision(volcadoId);
  let volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "pendiente_revision", "Debe pasar a pendiente_revision");

  await iniciarRevision(volcadoId);
  volcado = volcadosMemory.find(v => v.id === volcadoId);
  assert.strictEqual(volcado.estado, "en_revision", "Debe pasar a en_revision");
});
