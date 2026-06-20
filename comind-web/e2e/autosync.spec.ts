import { expect, test } from "@playwright/test";
import http, { type IncomingMessage, type ServerResponse } from "node:http";

type Captura = {
	id: string;
	texto: string;
	timestamp: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type": "application/json",
	});
	res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => {
			data += chunk;
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

// Backend de mentira con interruptor `caido`: mientras esta caido, /capturar
// responde 503 (fallo TRANSITORIO, como cuando el puerto de la API quedo Private).
// La red del navegador NO se apaga en ningun momento: reproducimos el caso real
// en que la conexion esta bien pero el backend no responde, asi que NO hay evento
// 'online' que dispare la sync; solo el reintento periodico puede rescatar la nota.
async function startFakeBackend(port: number) {
	const capturas: Captura[] = [];
	const estado = { caido: true };

	const server = http.createServer(async (req, res) => {
		if (req.method === "OPTIONS") {
			sendJson(res, 200, {});
			return;
		}

		if (req.method === "GET" && req.url === "/capturas") {
			sendJson(res, 200, { capturas });
			return;
		}

		if (req.method === "POST" && req.url === "/capturar") {
			if (estado.caido) {
				sendJson(res, 503, { detail: "backend caido (transitorio)" });
				return;
			}
			const raw = await readBody(req);
			const parsed = JSON.parse(raw) as { texto?: string };
			const texto = parsed.texto?.trim();
			if (!texto) {
				sendJson(res, 422, { detail: "texto requerido" });
				return;
			}
			const id = `srv-${capturas.length + 1}`;
			capturas.push({ id, texto, timestamp: new Date().toISOString() });
			sendJson(res, 200, { ok: true, id });
			return;
		}

		sendJson(res, 404, { detail: "Not Found" });
	});

	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => {
			server.off("error", reject);
			resolve();
		});
	});

	return {
		capturas,
		levantar: () => {
			estado.caido = false;
		},
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) reject(err);
					else resolve();
				});
			}),
	};
}

test("una nota que fallo con el backend caido se sincroniza sola al recuperarse, sin tocar Reintentar", async ({
	page,
}) => {
	// El reintento periodico corre cada 15 s; damos margen para un par de ciclos.
	test.setTimeout(90_000);

	const backend = await startFakeBackend(3999);
	const texto = `e2e autosync ${Date.now()}`;

	try {
		await page.goto("/");
		await expect(page.getByPlaceholder("¿Qué quieres capturar?")).toBeVisible();

		// La red sigue ENCENDIDA todo el tiempo: el fallo viene del backend, no de la red.
		await page.getByPlaceholder("¿Qué quieres capturar?").fill(texto);
		await page.getByRole("button", { name: "Guardar" }).click();

		const item = page.getByRole("listitem").filter({ hasText: texto });
		await expect(item).toBeVisible();
		// El primer envio falla (503) -> la nota queda "pendiente", NUNCA en "error".
		await expect(item).toContainText("pendiente");
		await expect(item).not.toContainText("no se pudo sincronizar");

		// El backend se recupera. NO tocamos NADA: ni "Reintentar", ni recargar,
		// ni cambiar de pestana, ni apagar/encender la red.
		backend.levantar();

		// El reintento periodico debe subirla sola dentro de un par de ciclos.
		await expect(item).toContainText("sincronizado", { timeout: 60_000 });
		await expect
			.poll(() => backend.capturas.map((c) => c.texto), { timeout: 60_000 })
			.toContain(texto);
	} finally {
		await backend.close();
	}
});
