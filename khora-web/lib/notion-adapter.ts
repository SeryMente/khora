import { ServerCaptura } from "./types";

export interface NotionResponse {
	ok: boolean;
	id?: string;
	error?: string;
}

export interface NotionPullResponse {
	ok: boolean;
	entries?: ServerCaptura[];
	error?: string;
}

export interface NotionPort {
	pushEntry(entry: ServerCaptura): Promise<NotionResponse>;
	pullEntries(): Promise<NotionPullResponse>;
}

import { pushToNotion, isNotionConfigured, pullFromNotion } from './notion';

export class NotionMock implements NotionPort {
	private simulateError: boolean;

	constructor(simulateError = false) {
		this.simulateError = simulateError;
	}

	async pushEntry(entry: ServerCaptura): Promise<NotionResponse> {
		return new Promise((resolve) => {
			setTimeout(() => {
				if (this.simulateError) {
					resolve({ ok: false, error: "Error simulado de conexión a Notion" });
				} else {
					resolve({ ok: true, id: `mock-${Date.now()}` });
				}
			}, 800); // Retraso de red simulado
		});
	}

	async pullEntries(): Promise<NotionPullResponse> {
		return new Promise((resolve) => {
			setTimeout(() => {
				if (this.simulateError) {
					resolve({ ok: false, error: "Error simulado de conexión a Notion al hacer pull" });
				} else {
					// En un mock real podríamos devolver un set estático o lo que haya en memoria del server.
					// Aquí simplemente devolvemos vacío para no corromper la DB local a menos que queramos simular entradas remotas.
					resolve({ ok: true, entries: [] });
				}
			}, 800);
		});
	}
}

export class NotionReal implements NotionPort {
	async pushEntry(entry: ServerCaptura): Promise<NotionResponse> {
		if (!isNotionConfigured()) {
			return { ok: false, error: "Notion no está configurado (faltan variables de entorno)." };
		}
		const res = await pushToNotion(entry);
		if (res.success) {
			return { ok: true, id: res.pageId };
		} else {
			return { ok: false, error: JSON.stringify(res.error) };
		}
	}

	async pullEntries(): Promise<NotionPullResponse> {
		if (!isNotionConfigured()) {
			return { ok: false, error: "Notion no está configurado (faltan variables de entorno)." };
		}
		const res = await pullFromNotion();
		if (res.success) {
			return { ok: true, entries: res.entries };
		} else {
			return { ok: false, error: JSON.stringify(res.error) };
		}
	}
}
