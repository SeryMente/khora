// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2
import test from "node:test";
import assert from "node:assert";

// Import specifically from espejoNotion
import { espejarVolcado } from "./espejoNotion.js";

test("Espejo Notion: Retorna en silencio si faltan las variables de entorno", async () => {
  const originalToken = process.env.NOTION_TOKEN;
  const originalDb = process.env.NOTION_DB_VOLCADOS;

  try {
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_DB_VOLCADOS;

    let fetchCalled = false;
    global.fetch = async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    };

    await espejarVolcado({
      texto: "Prueba de texto",
      volcado_id: "id-123",
      version: 1,
      sha256: "sha-abc",
      caracteres: 15
    });

    assert.strictEqual(fetchCalled, false, "fetch no debería llamarse si faltan variables de entorno");
  } finally {
    process.env.NOTION_TOKEN = originalToken;
    process.env.NOTION_DB_VOLCADOS = originalDb;
  }
});

test("Espejo Notion: LLama a fetch con las propiedades y cabeceras correctas (fecha provista)", async () => {
  const originalToken = process.env.NOTION_TOKEN;
  const originalDb = process.env.NOTION_DB_VOLCADOS;

  try {
    process.env.NOTION_TOKEN = "test-token";
    process.env.NOTION_DB_VOLCADOS = "test-db-id";

    let fetchedUrl = "";
    let fetchedOptions: any = null;

    global.fetch = async (url: any, options: any) => {
      fetchedUrl = String(url);
      fetchedOptions = options;
      return new Response("{}", { status: 200 });
    };

    const textoPrueba = "Hola mundo.\nEste es un párrafo.";
    await espejarVolcado({
      texto: textoPrueba,
      titulo: "Mi super dictado",
      volcado_id: "volcado-123",
      version: 1,
      sha256: "sha256-hash",
      caracteres: textoPrueba.length,
      fecha: "2026-05-27T10:00:00.000Z",
      audio: "https://audio.com/url.webm",
      partesAudio: 3,
      pulidoAplicado: true,
      reconexiones: 2
    });

    assert.strictEqual(fetchedUrl, "https://api.notion.com/v1/pages");
    assert.ok(fetchedOptions);
    assert.strictEqual(fetchedOptions.method, "POST");
    assert.strictEqual(fetchedOptions.headers["Authorization"], "Bearer test-token");
    assert.strictEqual(fetchedOptions.headers["Notion-Version"], "2022-06-28");
    assert.strictEqual(fetchedOptions.headers["Content-Type"], "application/json");

    const body = JSON.parse(fetchedOptions.body);
    assert.deepStrictEqual(body.parent, { database_id: "test-db-id" });

    const props = body.properties;
    assert.strictEqual(props["Título"].title[0].text.content, "Mi super dictado");
    assert.strictEqual(props["volcado_id"].rich_text[0].text.content, "volcado-123");
    assert.strictEqual(props["version"].number, 1);
    assert.strictEqual(props["sha256"].rich_text[0].text.content, "sha256-hash");
    assert.strictEqual(props["Fecha del dictado"].date.start, "2026-05-27T10:00:00.000Z");
    assert.strictEqual(props["Caracteres"].number, textoPrueba.length);
    assert.strictEqual(props["Estado de ingesta"].select.name, "Archivado");
    assert.strictEqual(props["Audio"].url, "https://audio.com/url.webm");
    assert.strictEqual(props["Partes de audio"].number, 3);
    assert.strictEqual(props["Pulido aplicado"].checkbox, true);
    assert.strictEqual(props["Reconexiones"].number, 2);

    // Children blocks are paragraphs
    assert.strictEqual(body.children.length, 2);
    assert.strictEqual(body.children[0].type, "paragraph");
    assert.strictEqual(body.children[0].paragraph.rich_text[0].text.content, "Hola mundo.");
    assert.strictEqual(body.children[1].paragraph.rich_text[0].text.content, "Este es un párrafo.");

  } finally {
    process.env.NOTION_TOKEN = originalToken;
    process.env.NOTION_DB_VOLCADOS = originalDb;
  }
});

test("Espejo Notion: Omite propiedades opcionales si no se proveen", async () => {
  const originalToken = process.env.NOTION_TOKEN;
  const originalDb = process.env.NOTION_DB_VOLCADOS;

  try {
    process.env.NOTION_TOKEN = "test-token";
    process.env.NOTION_DB_VOLCADOS = "test-db-id";

    let fetchedOptions: any = null;

    global.fetch = async (url: any, options: any) => {
      fetchedOptions = options;
      return new Response("{}", { status: 200 });
    };

    await espejarVolcado({
      texto: "Solo texto",
      volcado_id: "id-xyz",
      version: 2,
      sha256: "sha-xyz",
      caracteres: 10
      // sin titulo, sin audio, sin partesAudio, sin pulido, sin reconexiones
    });

    const body = JSON.parse(fetchedOptions.body);
    const props = body.properties;

    // Título autogenerado con fecha aproximada y sufijo "(fecha de archivado)"
    assert.match(props["Título"].title[0].text.content, /^Volcado \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(fecha de archivado\)$/);
    assert.strictEqual(props["Audio"], undefined, "Audio debería ser omitido si no viene");
    assert.strictEqual(props["Partes de audio"], undefined, "Partes de audio debería ser omitido si no viene");
    assert.strictEqual(props["Pulido aplicado"], undefined, "Pulido aplicado debería ser omitido si no viene");
    assert.strictEqual(props["Reconexiones"], undefined, "Reconexiones debería ser omitido si no viene");

  } finally {
    process.env.NOTION_TOKEN = originalToken;
    process.env.NOTION_DB_VOLCADOS = originalDb;
  }
});

test("Espejo Notion: Subdivide párrafos largos (>1900 caracteres) sin cortar palabras", async () => {
  const originalToken = process.env.NOTION_TOKEN;
  const originalDb = process.env.NOTION_DB_VOLCADOS;

  try {
    process.env.NOTION_TOKEN = "test-token";
    process.env.NOTION_DB_VOLCADOS = "test-db-id";

    let fetchedOptions: any = null;
    global.fetch = async (url: any, options: any) => {
      fetchedOptions = options;
      return new Response("{}", { status: 200 });
    };

    // Un párrafo muy largo: 2000 caracteres en total.
    // Compuesto de palabras de 9 caracteres más un espacio (10 caracteres por bloque de palabra)
    let palabra = "abcdefghi "; // 10 caracteres
    let textoLargo = palabra.repeat(200); // 2000 caracteres en total

    await espejarVolcado({
      texto: textoLargo,
      titulo: "Dictado largo",
      volcado_id: "long-id",
      version: 1,
      sha256: "long-sha",
      caracteres: textoLargo.length,
      fecha: "2026-05-27T10:00:00.000Z"
    });

    const body = JSON.parse(fetchedOptions.body);
    // Debe haber dos chunks porque excede 1900 caracteres.
    // Al dividir, debe buscar el último espacio antes del límite (1900).
    // Con bloques de 10 caracteres, 1900 es un límite exacto al final del espacio de la palabra 190 (que termina en la posición 1900).
    // Entonces el primer trozo debe tener 1900 caracteres (o 1899 si quita el espacio final).
    assert.ok(body.children.length > 1);
    const chunk1 = body.children[0].paragraph.rich_text[0].text.content;
    const chunk2 = body.children[1].paragraph.rich_text[0].text.content;

    assert.ok(chunk1.length <= 1900);
    assert.ok(chunk2.length <= 1900);
    assert.strictEqual(chunk1.length + chunk2.length, 2000 - 1); // 2000 menos el espacio intermedio que se quita con trimStart
  } finally {
    process.env.NOTION_TOKEN = originalToken;
    process.env.NOTION_DB_VOLCADOS = originalDb;
  }
});
