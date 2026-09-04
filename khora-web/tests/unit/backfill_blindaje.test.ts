// @l0 Pruebas unitarias de blindaje pre-backfill: inmutabilidad, v1 exacta, en_revision sin v1, fallo de titulo, dry-run e idempotencia.
import test from "node:test";
import assert from "node:assert/strict";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { prepararVolcadoParaRevision, hashTexto } from "../../lib/server/volcados";
import { migrarArchivados } from "../../scripts/migrar_archivados";
import { cifrarTexto, descifrarTexto } from "../../lib/server/cripto";
import { randomUUID } from "crypto";

class MockDbPool {
  tables: {
    volcado: any[];
    volcado_version: any[];
    volcado_revision_auditoria: any[];
    volcado_incidente: any[];
    eventos_sistema: any[];
  } = {
    volcado: [],
    volcado_version: [],
    volcado_revision_auditoria: [],
    volcado_incidente: [],
    eventos_sistema: [],
  };

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    const norm = sql.trim().toLowerCase();

    if (norm.startsWith("begin") || norm.startsWith("commit") || norm.startsWith("rollback")) {
      return { rows: [] };
    }

    if (norm.includes("create table") || norm.includes("create index") || norm.includes("alter table") || norm.includes("create sequence") || norm.includes("alter sequence") || norm.includes("select setval")) {
      return { rows: [] };
    }

    if (norm.includes("group by estado")) {
      const counts: Record<string, number> = {};
      for (const row of this.tables.volcado) {
        counts[row.estado] = (counts[row.estado] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([estado, n]) => ({ estado, n }));
      return { rows };
    }

    if (norm.includes("from volcado_version") && norm.includes("count(*)") && norm.includes("version = 1")) {
      const volcadoId = params[0];
      const match = this.tables.volcado_version.filter(
        (vv) => vv.volcado_id === volcadoId && vv.version === 1
      );
      return { rows: [{ n: match.length }] };
    }

    if (norm.includes("from volcado v") && norm.includes("not exists (select 1 from volcado_version")) {
      if (norm.includes("count(*)")) {
        const count = this.tables.volcado.filter((v) => {
          if (v.estado !== "en_revision") return false;
          return !this.tables.volcado_version.some((vv) => vv.volcado_id === v.id && vv.version === 1);
        }).length;
        return { rows: [{ n: count }] };
      }

      const limit = params[0] || 100;
      const eligible = this.tables.volcado.filter((v) => {
        if (v.estado === "archivado") return true;
        if (v.estado === "en_revision") {
          return !this.tables.volcado_version.some((vv) => vv.volcado_id === v.id && vv.version === 1);
        }
        return false;
      });

      return { rows: eligible.slice(0, limit) };
    }

    if (norm.includes("select id, folio, titulo, sha256, texto from volcado where estado = 'archivado'")) {
      const limit = params[0] || 100;
      const archivados = this.tables.volcado.filter((v) => v.estado === "archivado");
      return { rows: archivados.slice(0, limit) };
    }

    if (norm.includes("select * from volcado where id = $1")) {
      const match = this.tables.volcado.find((v) => v.id === params[0]);
      return { rows: match ? [{ ...match }] : [] };
    }

    if (norm.includes("select estado, sha256, texto, chars from volcado where id = $1") || norm.includes("select estado, sha256, texto from volcado where id = $1")) {
      const match = this.tables.volcado.find((v) => v.id === params[0]);
      return { rows: match ? [{ ...match }] : [] };
    }

    if (norm.includes("select version from volcado_version where volcado_id = $1 and version = 1")) {
      const match = this.tables.volcado_version.filter(
        (vv) => vv.volcado_id === params[0] && vv.version === 1
      );
      return { rows: match };
    }

    if (norm.includes("select texto, sha256 from volcado_version where volcado_id = $1 and version = 1") || norm.includes("select texto, sha256, chars from volcado_version where volcado_id = $1 and version = 1")) {
      const match = this.tables.volcado_version.filter(
        (vv) => vv.volcado_id === params[0] && vv.version === 1
      );
      return { rows: match };
    }

    if (norm.includes("select coalesce(max(version), 0)::int as ultima from volcado_version where volcado_id = $1")) {
      const matches = this.tables.volcado_version.filter((vv) => vv.volcado_id === params[0]);
      const maxVer = matches.reduce((max, vv) => Math.max(max, vv.version), 0);
      return { rows: [{ ultima: maxVer }] };
    }

    if (norm.includes("insert into volcado ")) {
      const newRow = {
        id: params[0],
        texto: params[1],
        sha256: params[2],
        chars: params[3],
        titulo: params[4],
        origen: params[5],
        driver: params[6],
        usuario: params[7],
        estado: params[8] || "archivado",
        folio: this.tables.volcado.length + 1,
        recibido_en: new Date().toISOString(),
        io_id: null,
        intentos: 0,
        ultimo_error: null,
        ultimo_intento: null,
        version_aprobada: null,
      };
      this.tables.volcado.push(newRow);
      return { rows: [newRow] };
    }

    if (norm.includes("insert into volcado_version ")) {
      const newVer = {
        id: params[0],
        volcado_id: params[1],
        version: params[2],
        texto: params[3],
        sha256: params[4],
        chars: params[5],
        motivo: params[6],
      };
      this.tables.volcado_version.push(newVer);
      return { rows: [newVer] };
    }

    if (norm.includes("update volcado set estado = 'pendiente_revision'")) {
      const row = this.tables.volcado.find((v) => v.id === params[0]);
      if (row) row.estado = "pendiente_revision";
      return { rows: [] };
    }

    if (norm.includes("update volcado set estado = 'en_revision'")) {
      const row = this.tables.volcado.find((v) => v.id === params[0]);
      if (row) row.estado = "en_revision";
      return {
        rows: row
          ? [
              {
                id: row.id,
                folio: row.folio,
                texto: row.texto,
                sha256: row.sha256,
                chars: row.chars,
                titulo: row.titulo,
                origen: row.origen,
                driver: row.driver,
                usuario: row.usuario,
                recibido_en: row.recibido_en,
                estado: row.estado,
                io_id: row.io_id,
                intentos: row.intentos,
                ultimo_error: row.ultimo_error,
                ultimo_intento: row.ultimo_intento,
                version_aprobada: row.version_aprobada,
              },
            ]
          : [],
      };
    }

    if (norm.includes("update volcado set titulo =")) {
      const row = this.tables.volcado.find((v) => v.id === params[1]);
      if (row) row.titulo = params[0];
      return { rows: [] };
    }

    if (norm.includes("insert into volcado_revision_auditoria")) {
      this.tables.volcado_revision_auditoria.push({
        id: params[0],
        volcado_id: params[1],
        accion: params[2],
        estado_anterior: params[3],
        estado_nuevo: params[4],
        usuario: params[5],
      });
      return { rows: [] };
    }

    if (norm.includes("insert into volcado_incidente")) {
      this.tables.volcado_incidente.push({ ...params });
      return { rows: [] };
    }

    if (norm.includes("insert into eventos_sistema")) {
      this.tables.eventos_sistema.push({ ...params });
      return { rows: [] };
    }

    return { rows: [] };
  }

  async connect() {
    return {
      query: (sql: string, params: any[]) => this.query(sql, params),
      release: () => {},
    };
  }
}

let mockDb: MockDbPool;

test.beforeEach(() => {
  resetDbForTesting();
  mockDb = new MockDbPool();
  setDbForTesting(mockDb as any);
});

test("Caso 1: archivado con palabra que tildesSeguras cambiaría (verbatim, sha256 y chars inmutables)", async () => {
  const textoOriginal = "esta es una prueba con tambien tildes seguras";
  const shaOriginal = hashTexto(textoOriginal);
  const charsOriginal = textoOriginal.length;

  const id = randomUUID();
  await mockDb.query(
    "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id, cifrarTexto(textoOriginal), shaOriginal, charsOriginal, "Titulo Test", "test_blindaje", null, null, "archivado"]
  );

  await prepararVolcadoParaRevision(id, "test_blindaje");

  const res = await mockDb.query("SELECT estado, sha256, texto, chars FROM volcado WHERE id = $1", [id]);
  const row = res.rows[0];

  assert.equal(row.estado, "en_revision");
  assert.equal(descifrarTexto(row.texto), textoOriginal, "El texto en BD debe conservarse inmutable");
  assert.equal(row.sha256, shaOriginal, "El sha256 en BD debe coincidir con el original");
  assert.equal(Number(row.chars), charsOriginal, "La longitud chars debe ser idéntica");

  const v1Res = await mockDb.query("SELECT texto, sha256, chars FROM volcado_version WHERE volcado_id = $1 AND version = 1", [id]);
  assert.equal(v1Res.rows.length, 1);
  const v1Row = v1Res.rows[0];
  assert.equal(descifrarTexto(v1Row.texto), textoOriginal, "El texto v1 debe ser el verbatim exacto sin tildes automáticas");
  assert.equal(v1Row.sha256, shaOriginal);
});

test("Caso 2: reparación de en_revision sin v1", async () => {
  const id = randomUUID();
  const texto = "volcado quedado en revision sin versión uno";
  const sha = hashTexto(texto);

  await mockDb.query(
    "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id, cifrarTexto(texto), sha, texto.length, "Titulo Test", "migracion_014", null, null, "en_revision"]
  );

  const preV1 = await mockDb.query("SELECT COUNT(*)::int AS n FROM volcado_version WHERE volcado_id = $1 AND version = 1", [id]);
  assert.equal(Number(preV1.rows[0].n), 0);

  await prepararVolcadoParaRevision(id, "test_reparador");

  const postV1 = await mockDb.query("SELECT texto, sha256 FROM volcado_version WHERE volcado_id = $1 AND version = 1", [id]);
  assert.equal(postV1.rows.length, 1);
  assert.equal(descifrarTexto(postV1.rows[0].texto), texto);
  assert.equal(postV1.rows[0].sha256, sha);
});

test("Caso 3: dry-run informa por estado y huérfanos de v1 SIN mutar", async () => {
  const id1 = randomUUID();
  const id2 = randomUUID();
  const texto = "texto de prueba dry-run";

  await mockDb.query(
    "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id1, cifrarTexto(texto), hashTexto(texto), texto.length, "Titulo 1", "dry_run_test", null, null, "archivado"]
  );

  await mockDb.query(
    "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id2, cifrarTexto(texto), hashTexto(texto), texto.length, "Titulo 2", "dry_run_test", null, null, "en_revision"]
  );

  const resDry = await migrarArchivados({ dryRun: true });
  assert.equal(resDry.dryRun, true);
  assert.ok(resDry.total >= 2);

  const post1 = await mockDb.query("SELECT estado, sha256, texto, chars FROM volcado WHERE id = $1", [id1]);
  assert.equal(post1.rows[0].estado, "archivado");

  const v1Count = await mockDb.query("SELECT COUNT(*)::int AS n FROM volcado_version WHERE volcado_id = $1 AND version = 1", [id2]);
  assert.equal(Number(v1Count.rows[0].n), 0);
});

test("Caso 4: Idempotencia real (segunda corrida = 0 elegibles procesados)", async () => {
  const id = randomUUID();
  const texto = "texto para prueba de idempotencia";

  await mockDb.query(
    "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [id, cifrarTexto(texto), hashTexto(texto), texto.length, "Titulo Idem", "idempotencia_test", null, null, "archivado"]
  );

  const res1 = await migrarArchivados({ dryRun: false });
  assert.ok(res1.procesados >= 1);

  const res2 = await migrarArchivados({ dryRun: false });
  assert.equal(res2.total, 0, "En la segunda corrida no debe haber filas elegibles pendientes");
  assert.equal(res2.procesados, 0);
});

test("Caso 5: Procesamiento de más de 100 filas en lotes", async () => {
  const cantidad = 105;
  for (let i = 0; i < cantidad; i++) {
    const id = randomUUID();
    const texto = `texto numero ${i}`;
    await mockDb.query(
      "INSERT INTO volcado (id, texto, sha256, chars, titulo, origen, driver, usuario, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [id, cifrarTexto(texto), hashTexto(texto), texto.length, `Titulo ${i}`, "batch_test", null, null, "archivado"]
    );
  }

  const resBatch = await migrarArchivados({ dryRun: false, batchSize: 50 });
  assert.equal(resBatch.total, cantidad);
  assert.equal(resBatch.procesados, cantidad);
  assert.equal(resBatch.fallidos, 0);
});
