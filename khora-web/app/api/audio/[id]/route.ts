import { NextRequest, NextResponse } from "next/server"
import { getDb } from "../../../../lib/server/neon"
import { descifrarBytes } from "../../../../lib/server/cripto"
import { COOKIE_BOVEDA, desbloqueoVigente } from "../../../../lib/server/boveda"

export const runtime = "nodejs"

export async function GET(pedido: NextRequest, contexto: { params: Promise<{ id: string }> }) {
  try {
    if (!desbloqueoVigente(pedido.cookies.get(COOKIE_BOVEDA)?.value)) {
      return NextResponse.json({ error: "boveda cerrada: introduce el pin" }, { status: 423 })
    }
    const { id } = await contexto.params
    const res = await getDb().query("select audio_url from volcado where id = $1", [id])
    const url = res.rows.length ? String(res.rows[0].audio_url ?? "") : ""
    if (!url) return NextResponse.json({ error: "sin grabacion" }, { status: 404 })
    const remoto = await fetch(url, { cache: "no-store" })
    if (!remoto.ok) return NextResponse.json({ error: "blob inaccesible: " + remoto.status }, { status: 502 })
    const claro = descifrarBytes(Buffer.from(await remoto.arrayBuffer()))
    return new NextResponse(new Uint8Array(claro), { status: 200, headers: { "content-type": "audio/webm", "cache-control": "no-store", "content-length": String(claro.length) } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}