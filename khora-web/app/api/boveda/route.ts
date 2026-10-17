import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../auth"
import { COOKIE_BOVEDA, MINUTOS_BOVEDA, definirPin, desbloqueoVigente, pinConfigurado, sellarDesbloqueo, verificarPin } from "../../../lib/server/boveda"

export const runtime = "nodejs"

function authorizedEmail(email: string | null | undefined): boolean {
  const allowed = String(process.env.VAULT_AGENT_ALLOWED_EMAIL || process.env.EP_ALLOWED_EMAIL || "").trim().toLowerCase()
  return Boolean(allowed) && Boolean(email) && email!.toLowerCase() === allowed
}

async function requireVaultUser() {
  const session = await auth()
  const email = session?.user?.email ? String(session.user.email) : ""
  return authorizedEmail(email) ? email : null
}

export async function GET(pedido: NextRequest) {
  try {
    if (!(await requireVaultUser())) {
      return NextResponse.json({ error: "not_authorized" }, { status: 401 })
    }
    const configurado = await pinConfigurado()
    const abierta = desbloqueoVigente(pedido.cookies.get(COOKIE_BOVEDA)?.value)
    return NextResponse.json({ configurado, abierta, minutos: MINUTOS_BOVEDA })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(pedido: NextRequest) {
  try {
    if (!(await requireVaultUser())) {
      return NextResponse.json({ error: "not_authorized" }, { status: 401 })
    }

    const cuerpo = await pedido.json()
    const pin = String(cuerpo?.pin ?? "")
    const reset = cuerpo?.reset === true
    const yaHabia = await pinConfigurado()
    if (cuerpo?.unlockOnly === true && (!yaHabia || reset)) {
      return NextResponse.json({ error: "pin_no_configurado" }, { status: 409 })
    }

    if (reset) {
      if (!yaHabia) {
        return NextResponse.json({ error: "pin_no_configurado" }, { status: 409 })
      }
      await definirPin(pin)
    } else if (!yaHabia) {
      await definirPin(pin)
    } else if (!(await verificarPin(pin))) {
      return NextResponse.json({ error: "pin_incorrecto" }, { status: 401 })
    }

    const respuesta = NextResponse.json({
      ok: true,
      abierta: true,
      minutos: MINUTOS_BOVEDA,
      recienCreado: !yaHabia,
      restablecido: reset && yaHabia,
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
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
