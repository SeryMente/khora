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
