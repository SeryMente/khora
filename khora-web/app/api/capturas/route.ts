import { NextResponse, NextRequest } from 'next/server';
import { NotionPort, NotionMock, NotionReal } from '@/lib/notion-adapter';
import { isNotionConfigured } from '@/lib/notion';

export async function GET(req: NextRequest) {
  try {
    const isSimulated = req.nextUrl.searchParams.get('simularNotion') === 'true';
    const simulateError = req.nextUrl.searchParams.get('simulateError') === 'true';

    let adapter: NotionPort;
    if (isSimulated || !isNotionConfigured()) {
      adapter = new NotionMock(simulateError);
    } else {
      adapter = new NotionReal();
    }

    const resAdapter = await adapter.pullEntries();

    if (!resAdapter.ok) {
      return NextResponse.json({ capturas: [], error: resAdapter.error }, { status: 502 });
    }

    return NextResponse.json({ capturas: resAdapter.entries || [] });
  } catch (e: any) {
    console.error("[capturas route] Error en GET:", e);
    return NextResponse.json({ capturas: [], error: 'Error interno del servidor' }, { status: 500 });
  }
}
