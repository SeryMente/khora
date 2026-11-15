import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const MARCA_TEXTO = "khc1."
const MARCA_BIN = Buffer.from("KHC1")
const MARCA_STREAM = Buffer.from("KHC2")

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
  if (datos.length >= 32 && datos.subarray(0, 4).equals(MARCA_BIN)) {
    const descifrador = createDecipheriv("aes-256-gcm", llave(), datos.subarray(4, 16))
    descifrador.setAuthTag(datos.subarray(16, 32))
    return Buffer.concat([descifrador.update(datos.subarray(32)), descifrador.final()])
  }
  if (datos.length >= 32 && datos.subarray(0, 4).equals(MARCA_STREAM)) {
    const descifrador = createDecipheriv("aes-256-gcm", llave(), datos.subarray(4, 16))
    descifrador.setAuthTag(datos.subarray(datos.length - 16))
    return Buffer.concat([descifrador.update(datos.subarray(16, datos.length - 16)), descifrador.final()])
  }
  return datos
}

/**
 * KHC2 streaming envelope: magic(4) + IV(12) + ciphertext + GCM tag(16).
 * The tag is emitted last so multi-gigabyte payloads never need to be materialized.
 */
export async function* cifrarStream(datos: AsyncIterable<Uint8Array>): AsyncGenerator<Buffer> {
  const iv = randomBytes(12)
  const cifrador = createCipheriv("aes-256-gcm", llave(), iv)
  yield Buffer.concat([MARCA_STREAM, iv])
  for await (const chunk of datos) {
    if (!chunk.byteLength) continue
    const encrypted = cifrador.update(Buffer.from(chunk))
    if (encrypted.length) yield encrypted
  }
  const final = cifrador.final()
  if (final.length) yield final
  yield cifrador.getAuthTag()
}

/** Streaming KHC2 decoder for future restore tooling; it buffers only the final GCM tag. */
export async function* descifrarStream(datos: AsyncIterable<Uint8Array>): AsyncGenerator<Buffer> {
  const iterator = datos[Symbol.asyncIterator]()
  let prefix = Buffer.alloc(0)
  while (prefix.length < 16) {
    const next = await iterator.next()
    if (next.done) throw new Error("khc2_stream_truncated_header")
    prefix = Buffer.concat([prefix, Buffer.from(next.value)])
  }
  if (!prefix.subarray(0, 4).equals(MARCA_STREAM)) throw new Error("khc2_stream_invalid_header")
  const decipher = createDecipheriv("aes-256-gcm", llave(), prefix.subarray(4, 16))
  let pending = prefix.subarray(16)
  while (true) {
    const next = await iterator.next()
    if (next.done) break
    const chunk = Buffer.from(next.value)
    if (!chunk.length) continue
    const combined = pending.length ? Buffer.concat([pending, chunk]) : chunk
    if (combined.length <= 16) {
      pending = combined
      continue
    }
    const ciphertext = combined.subarray(0, combined.length - 16)
    pending = combined.subarray(combined.length - 16)
    const clear = decipher.update(ciphertext)
    if (clear.length) yield clear
  }
  if (pending.length !== 16) throw new Error("khc2_stream_truncated_tag")
  decipher.setAuthTag(pending)
  const final = decipher.final()
  if (final.length) yield final
}
