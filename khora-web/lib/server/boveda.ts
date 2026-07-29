import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { getDb } from "./neon"

export const COOKIE_BOVEDA = "khora_boveda"
export const MINUTOS_BOVEDA = 30

const DDL = [
  "create table if not exists boveda_pin (id int primary key, hash text not null, salt text not null, creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now())",
]

export async function asegurarBoveda(): Promise<void> {
  const db = getDb()
  for (const sentencia of DDL) await db.query(sentencia)
}

function derivar(pin: string, sal: string): string {
  return scryptSync(pin, sal, 32).toString("hex")
}

export async function pinConfigurado(): Promise<boolean> {
  await asegurarBoveda()
  const res = await getDb().query("select 1 from boveda_pin where id = 1")
  return res.rows.length > 0
}

export async function definirPin(pin: string): Promise<void> {
  if (!/^[0-9]{4,12}$/.test(pin)) throw new Error("el pin debe tener entre 4 y 12 digitos")
  await asegurarBoveda()
  const sal = randomBytes(16).toString("hex")
  await getDb().query("insert into boveda_pin (id, hash, salt) values (1, $1, $2) on conflict (id) do update set hash = excluded.hash, salt = excluded.salt, actualizado_en = now()", [derivar(pin, sal), sal])
}

export async function verificarPin(pin: string): Promise<boolean> {
  await asegurarBoveda()
  const res = await getDb().query("select hash, salt from boveda_pin where id = 1")
  if (!res.rows.length) return false
  const esperado = Buffer.from(String(res.rows[0].hash), "hex")
  const recibido = Buffer.from(derivar(pin, String(res.rows[0].salt)), "hex")
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
}

function secreto(): string {
  const valor = process.env.AUTH_SECRET || process.env.X_KHORA_KEY || ""
  if (!valor) throw new Error("falta AUTH_SECRET para sellar el desbloqueo")
  return valor
}

export function sellarDesbloqueo(): string {
  const vence = String(Date.now() + MINUTOS_BOVEDA * 60000)
  return vence + "." + createHmac("sha256", secreto()).update(vence).digest("base64url")
}

export function desbloqueoVigente(sello: string | undefined): boolean {
  if (!sello) return false
  const partes = sello.split(".")
  if (partes.length !== 2) return false
  const esperado = createHmac("sha256", secreto()).update(partes[0]).digest("base64url")
  if (esperado.length !== partes[1].length) return false
  if (!timingSafeEqual(Buffer.from(esperado), Buffer.from(partes[1]))) return false
  return Number(partes[0]) > Date.now()
}