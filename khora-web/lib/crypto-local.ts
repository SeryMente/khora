export interface CipherEnvelope {
  iv: string;
  ciphertext: string;
  aad?: string;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generateSalt16(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveVaultKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 310000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptLocal(
  plaintext: string,
  key: CryptoKey,
  aad?: string
): Promise<CipherEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv
  };

  let aadBuffer: Uint8Array | undefined;
  if (aad) {
    aadBuffer = enc.encode(aad);
    algorithm.additionalData = aadBuffer as any;
  }

  const ciphertextBuffer = await crypto.subtle.encrypt(algorithm, key, data);

  const envelope: CipherEnvelope = {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer)
  };

  if (aadBuffer) {
    envelope.aad = bufferToBase64(aadBuffer);
  }

  return envelope;
}

export async function decryptLocal(
  envelope: CipherEnvelope,
  key: CryptoKey
): Promise<string> {
  const ivBuffer = base64ToBuffer(envelope.iv);
  const ciphertextBuffer = base64ToBuffer(envelope.ciphertext);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: new Uint8Array(ivBuffer)
  };

  if (envelope.aad) {
    algorithm.additionalData = new Uint8Array(base64ToBuffer(envelope.aad));
  }

  const decryptedBuffer = await crypto.subtle.decrypt(
    algorithm,
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
