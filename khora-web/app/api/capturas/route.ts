import { NextResponse, NextRequest } from 'next/server';
import { NotionReal } from '@/lib/notion-adapter';

export async function GET(_req: NextRequest) {
  try {
    const adapter = new NotionReal();
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
