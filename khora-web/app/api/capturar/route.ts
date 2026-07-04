import { NextRequest, NextResponse } from 'next/server';
import { inferirTipo } from '@/lib/classifier';
import { NotionPort, NotionMock, NotionReal } from '@/lib/notion-adapter';
import { isNotionConfigured } from '@/lib/notion';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const texto = body.texto;

		if (!texto) {
			return NextResponse.json({ ok: false, error: 'El campo "texto" es obligatorio' }, { status: 400 });
		}
		
		const id = body.id || crypto.randomUUID();
		const timestamp = body.timestamp || new Date().toISOString();
		
		// Inferencia inteligente de tipo en el servidor
		const tipo = await inferirTipo(texto);
		
		const origen = body.origen || "keyboard";
		const visibilidad = body.visibilidad || "public";
		const metadata = body.metadata || {};
		
		const secuencia = body.secuencia;
		const hash = body.hash;
		const hashPrevio = body.hashPrevio;
		const forensics = body.forensics || {};
		
		// Add server-side IP to forensics
		const forwardedFor = req.headers.get('x-forwarded-for');
		const realIp = req.headers.get('x-real-ip');
		const ip = forwardedFor ? forwardedFor.split(',')[0] : (realIp || '127.0.0.1');
		forensics.ip = ip;
		
		const captura = { 
			id, 
			texto, 
			timestamp, 
			tipo, 
			origen, 
			visibilidad, 
			metadata,
			secuencia,
			hash,
			hashPrevio,
			forensics
		};
		
		// Usamos el Adapter según el entorno y la intención de simulación
		const isSimulated = body.simularNotion === true;
		const simulateError = body.simulateError === true;
		
		let adapter: NotionPort;
		
		if (isSimulated || !isNotionConfigured()) {
			adapter = new NotionMock(simulateError);
		} else {
			adapter = new NotionReal();
		}
		
		const resAdapter = await adapter.pushEntry(captura as any);
		
		// Si el adaptador falla, fallamos la API entera para que el cliente lo detecte como error y reintente
		if (!resAdapter.ok) {
			return NextResponse.json({ 
				ok: false, 
				error: resAdapter.error,
				notionConfigured: isNotionConfigured() 
			}, { status: 502 }); // Bad Gateway o 500
		}
		
		return NextResponse.json({ 
			ok: true, 
			id: resAdapter.id || id, 
			tipo, 
			notionStatus: "synced",
			notionConfigured: isNotionConfigured() 
		});
	} catch (e: any) {
		console.error("[capturar route] Error en POST:", e);
		return NextResponse.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
	}
}
