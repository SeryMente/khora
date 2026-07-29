import { NextRequest, NextResponse } from "next/server"
import { COOKIE_BOVEDA, MINUTOS_BOVEDA, definirPin, desbloqueoVigente, pinConfigurado, sellarDesbloqueo, verificarPin } from "../../../lib/server/boveda"

export const runtime = "nodejs"

export async function GET(pedido: NextRequest) {
  try {
    const configurado = await pinConfigurado()
    const abierta = desbloqueoVigente(pedido.cookies.get(COOKIE_BOVEDA)?.value)
    return NextResponse.json({ configurado, abierta, minutos: MINUTOS_BOVEDA })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(pedido: NextRequest) {
  try {
    const cuerpo = await pedido.json()
    const pin = String(cuerpo?.pin ?? "")
    const yaHabia = await pinConfigurado()
    if (!yaHabia) {
      await definirPin(pin)
    } else if (!(await verificarPin(pin))) {
      return NextResponse.json({ error: "pin incorrecto" }, { status: 401 })
    }
    const respuesta = NextResponse.json({ ok: true, abierta: true, minutos: MINUTOS_BOVEDA, recienCreado: !yaHabia })
    respuesta.cookies.set({ name: COOKIE_BOVEDA, value: sellarDesbloqueo(), httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: MINUTOS_BOVEDA * 60 })
    return respuesta
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}