import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const MARCA_TEXTO = "khc1."
const MARCA_BIN = Buffer.from("KHC1")

function llave(): Buffer {
  const cruda = process.env.X_KHORA_KEY || ""
  if (cruda.length < 16) throw new Error("X_KHORA_KEY ausente: no se puede cifrar")
  if (cruda.length === 64 && /^[0-9a-fA-F]+$/.test(cruda)) return Buffer.from(cruda, "hex")
  return scryptSync(cruda, "khora-boveda-v09", 32)
}

export function esTextoCifrado(valor: unknown): boolean {
  return typeof valor === "string" && valor.startsWith(MARCA_TEXTO)
}

export function cifrarTexto(texto: string): string {
  const iv = randomBytes(12)
  const cifrador = createCipheriv("aes-256-gcm", llave(), iv)
  const cuerpo = Buffer.concat([cifrador.update(Buffer.from(texto, "utf8")), cifrador.final()])
  return MARCA_TEXTO + iv.toString("base64url") + "." + cifrador.getAuthTag().toString("base64url") + "." + cuerpo.toString("base64url")
}

export function descifrarTexto(valor: string): string {
  if (!esTextoCifrado(valor)) return valor
  const partes = valor.slice(MARCA_TEXTO.length).split(".")
  if (partes.length !== 3) throw new Error("formato cifrado invalido")
  const descifrador = createDecipheriv("aes-256-gcm", llave(), Buffer.from(partes[0], "base64url"))
  descifrador.setAuthTag(Buffer.from(partes[1], "base64url"))
  return Buffer.concat([descifrador.update(Buffer.from(partes[2], "base64url")), descifrador.final()]).toString("utf8")
}

export function cifrarBytes(datos: Buffer): Buffer {
  const iv = randomBytes(12)
  const cifrador = createCipheriv("aes-256-gcm", llave(), iv)
  const cuerpo = Buffer.concat([cifrador.update(datos), cifrador.final()])
  return Buffer.concat([MARCA_BIN, iv, cifrador.getAuthTag(), cuerpo])
}

export function descifrarBytes(datos: Buffer): Buffer {
  if (datos.length < 32 || !datos.subarray(0, 4).equals(MARCA_BIN)) return datos
  const descifrador = createDecipheriv("aes-256-gcm", llave(), datos.subarray(4, 16))
  descifrador.setAuthTag(datos.subarray(16, 32))
  return Buffer.concat([descifrador.update(datos.subarray(32)), descifrador.final()])
}