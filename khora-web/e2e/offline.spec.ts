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

async function startFakeBackend(port: number) {
	const capturas: Captura[] = [];

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
			const raw = await readBody(req);
			const parsed = JSON.parse(raw) as { texto?: string };
			const texto = parsed.texto?.trim();

			if (!texto) {
				sendJson(res, 422, { detail: "texto requerido" });
				return;
			}

			const id = `srv-${capturas.length + 1}`;
			capturas.push({
				id,
				texto,
				timestamp: new Date().toISOString(),
			});

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
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) reject(err);
					else resolve();
				});
			}),
	};
}

test("captura offline, persiste al recargar y sincroniza al volver la red", async ({
	page,
	context,
}) => {
	const backend = await startFakeBackend(3999);
	const texto = `e2e offline ${Date.now()}`;

	try {
		await page.goto("/");
		await expect(page.getByPlaceholder("¿Qué quieres capturar?")).toBeVisible();

		await page.evaluate(async () => {
			if ("serviceWorker" in navigator) {
				await navigator.serviceWorker.ready;
			}
		});

		await context.setOffline(true);

		await page.getByPlaceholder("¿Qué quieres capturar?").fill(texto);
		await page.getByRole("button", { name: "Guardar" }).click();

		const item = page.getByRole("listitem").filter({ hasText: texto });
		await expect(item).toBeVisible();
		await expect(item).toContainText(/sin conexión|pendiente/);

		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.getByRole("listitem").filter({ hasText: texto })).toBeVisible();

		await context.setOffline(false);

		const syncedItem = page.getByRole("listitem").filter({ hasText: texto });
		await expect(syncedItem).toContainText("sincronizado");
		await expect
			.poll(() => backend.capturas.map((captura) => captura.texto))
			.toContain(texto);
	} finally {
		await context.setOffline(false);
		await backend.close();
	}
});
