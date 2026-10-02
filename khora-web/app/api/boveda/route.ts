import { NextRequest, NextResponse } from "next/server"
import {
  COOKIE_BOVEDA,
  LONGITUD_PIN_GENERADO,
  MINUTOS_BOVEDA,
  definirPin,
  desbloqueoVigente,
  generarPinSeguro,
  pinConfigurado,
  sellarDesbloqueo,
  verificarPin,
} from "../../../lib/server/boveda"

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
    const yaHabia = await pinConfigurado()

    if (cuerpo?.generar === true) {
      if (yaHabia) {
        return NextResponse.json(
          { error: "pin_ya_configurado", detail: "La bóveda ya tiene un PIN. Introduce el PIN actual para abrirla." },
          { status: 409 }
        )
      }

      const pinGenerado = generarPinSeguro(LONGITUD_PIN_GENERADO)
      await definirPin(pinGenerado)
      const respuesta = NextResponse.json({
        ok: true,
        abierta: true,
        minutos: MINUTOS_BOVEDA,
        recienCreado: true,
        generado: true,
        pin: pinGenerado,
      })
      respuesta.cookies.set({
        name: COOKIE_BOVEDA,
        value: sellarDesbloqueo(),
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: MINUTOS_BOVEDA * 60,
      })
      return respuesta
    }

    const pin = String(cuerpo?.pin ?? "")
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