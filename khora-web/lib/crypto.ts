/**
 * KHORA SYSTEMS - WEB CRYPTO MODULE
 *
 * Strict NO-SIMULATION policy enforced.
 * Uses native window.crypto.subtle for all operations.
 */

// --- Constants & Config ---
const ITERATIONS = 600000;
const SALT_SIZE = 16;
const IV_SIZE = 12; // 96 bits for AES-GCM
const KEY_USAGE_ENC_DEC: KeyUsage[] = ['encrypt', 'decrypt'];
const PBKDF2_ALGO = { name: 'PBKDF2' };
const AES_GCM_ALGO = { name: 'AES-GCM', length: 256 };

export interface SetupResult {
  recoveryCode: string;
}

/**
 * Derives a Key Encryption Key (KEK) from a PIN using PBKDF2.
 * Includes salt and derivation details.
 */
async function deriveKEKFromPIN(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    PBKDF2_ALGO,
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt, // Web Crypto API accepts Uint8Array directly in modern types
      iterations: ITERATIONS,
      hash: 'SHA-256',
    } as Pbkdf2Params,
    keyMaterial,
    AES_GCM_ALGO,
    false,
    KEY_USAGE_ENC_DEC
  );
}

/**
 * Derives a KEK from the recovery code directly. We hash it with SHA-256 to ensure it fits 256 bits uniformly,
 * though it's already high entropy.
 */
async function deriveKEKFromRecoveryCode(code: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const hash = await window.crypto.subtle.digest('SHA-256', enc.encode(code));
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    AES_GCM_ALGO,
    false,
    KEY_USAGE_ENC_DEC
  );
}

/**
 * Encrypts a raw key (DEK) using a KEK.
 */
async function wrapKey(dek: CryptoKey, kek: CryptoKey): Promise<{ wrappedKey: ArrayBuffer, iv: Uint8Array }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const rawDek = await window.crypto.subtle.exportKey('raw', dek);

  const wrappedKey = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv } as AesGcmParams,
    kek,
    rawDek
  );

  return { wrappedKey, iv };
}

/**
 * Decrypts a raw key (DEK) using a KEK.
 */
async function unwrapKey(wrappedKey: ArrayBuffer | ArrayBufferLike, iv: Uint8Array, kek: CryptoKey): Promise<CryptoKey> {
  const rawDek = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv } as AesGcmParams,
    kek,
    wrappedKey as ArrayBuffer
  );

  return window.crypto.subtle.importKey(
    'raw',
    rawDek,
    AES_GCM_ALGO,
    true, // Extractable so we can re-wrap it later if needed (e.g. changing PIN)
    KEY_USAGE_ENC_DEC
  );
}

/**
 * Generates a high entropy recovery code (256-bit represented as hex).
 */
function generateRecoveryCode(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Utility to encode array buffers to base64 for localStorage storage.
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Utility to decode base64 to array buffer.
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

// --- Public API ---

/**
 * Generates Master Key (DEK), derives KEKs from PIN and Recovery Code,
 * and saves wrapped DEKs to localStorage.
 */
export async function setupCryptoEnvironment(pin: string): Promise<SetupResult> {
  // 1. Generate DEK (Data Encryption Key) - Extractable true to allow exporting/wrapping
  const dek = await window.crypto.subtle.generateKey(
    AES_GCM_ALGO,
    true,
    KEY_USAGE_ENC_DEC
  );

  // 2. Derive KEK 1 from PIN
  const pinSalt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const pinKek = await deriveKEKFromPIN(pin, pinSalt);

  // 3. Wrap DEK with KEK 1
  const { wrappedKey: pinWrappedDek, iv: pinIv } = await wrapKey(dek, pinKek);

  // 4. Generate Recovery Code and KEK 2
  const recoveryCode = generateRecoveryCode();
  const recoveryKek = await deriveKEKFromRecoveryCode(recoveryCode);

  // 5. Wrap DEK with KEK 2
  const { wrappedKey: recoveryWrappedDek, iv: recoveryIv } = await wrapKey(dek, recoveryKek);

  // 6. Save to localStorage
  const cryptoState = {
    pinSalt: bufferToBase64(pinSalt),
    pinIv: bufferToBase64(pinIv),
    pinWrappedDek: bufferToBase64(pinWrappedDek),
    recoveryIv: bufferToBase64(recoveryIv),
    recoveryWrappedDek: bufferToBase64(recoveryWrappedDek)
  };
  localStorage.setItem('khora_crypto_state', JSON.stringify(cryptoState));

  return { recoveryCode };
}

/**
 * Verifies PIN by attempting to unwrap the DEK.
 * If successful, the PIN is correct. We don't store a separate hash.
 */
export async function verifyPIN(pin: string): Promise<boolean> {
  try {
    await getDEKFromPIN(pin);
    return true;
  } catch (e) {
    // Unwrapping failed, usually means MAC verification failed (wrong PIN)
    return false;
  }
}

/**
 * Internal helper to retrieve DEK using PIN.
 */
async function getDEKFromPIN(pin: string): Promise<CryptoKey> {
  const stateStr = localStorage.getItem('khora_crypto_state');
  if (!stateStr) throw new Error("Crypto state not initialized");

  const state = JSON.parse(stateStr);
  const pinSalt = base64ToBuffer(state.pinSalt);
  const pinIv = base64ToBuffer(state.pinIv);
  const pinWrappedDek = base64ToBuffer(state.pinWrappedDek);

  const pinKek = await deriveKEKFromPIN(pin, pinSalt);
  return unwrapKey(pinWrappedDek.buffer, pinIv, pinKek);
}

/**
 * Retrieves DEK using Recovery Code.
 */
export async function getDEKFromRecoveryCode(recoveryCode: string): Promise<CryptoKey> {
  const stateStr = localStorage.getItem('khora_crypto_state');
  if (!stateStr) throw new Error("Crypto state not initialized");

  const state = JSON.parse(stateStr);
  const recoveryIv = base64ToBuffer(state.recoveryIv);
  const recoveryWrappedDek = base64ToBuffer(state.recoveryWrappedDek);

  const recoveryKek = await deriveKEKFromRecoveryCode(recoveryCode);
  return unwrapKey(recoveryWrappedDek.buffer, recoveryIv, recoveryKek);
}

/**
 * Rewraps the DEK with a new PIN. Used during recovery.
 */
export async function resetPINWithRecoveryCode(recoveryCode: string, newPin: string): Promise<void> {
  // 1. Get original DEK
  const dek = await getDEKFromRecoveryCode(recoveryCode);

  const stateStr = localStorage.getItem('khora_crypto_state');
  if (!stateStr) throw new Error("Crypto state not initialized");
  const state = JSON.parse(stateStr);

  // 2. Wrap DEK with new PIN
  const newPinSalt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const newPinKek = await deriveKEKFromPIN(newPin, newPinSalt);
  const { wrappedKey: newPinWrappedDek, iv: newPinIv } = await wrapKey(dek, newPinKek);

  // 3. Update localStorage
  state.pinSalt = bufferToBase64(newPinSalt);
  state.pinIv = bufferToBase64(newPinIv);
  state.pinWrappedDek = bufferToBase64(newPinWrappedDek);

  localStorage.setItem('khora_crypto_state', JSON.stringify(state));
}

/**
 * Encrypts a secret value and stores it in localStorage.
 * Name is used as key (plaintext), value is encrypted.
 * (Note: DEK is not stored in memory between calls to ensure security).
 */
export async function encryptSecret(pin: string, name: string, plainValue: string): Promise<void> {
  const dek = await getDEKFromPIN(pin);
  const enc = new TextEncoder();

  const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const encryptedValue = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv } as AesGcmParams,
    dek,
    enc.encode(plainValue)
  );

  const storedPayload = {
    iv: bufferToBase64(iv),
    data: bufferToBase64(encryptedValue)
  };

  const secretsStr = localStorage.getItem('khora_secrets') || '{}';
  const secrets = JSON.parse(secretsStr);
  secrets[name] = storedPayload;

  localStorage.setItem('khora_secrets', JSON.stringify(secrets));
}

/**
 * Decrypts a secret value.
 * Requires PIN for every decryption.
 * Note: Memory wipe (5s delay) is handled mostly at UI level as requested,
 * but this function ensures local variables die immediately after return.
 */
export async function decryptSecret(pin: string, name: string): Promise<string> {
  const secretsStr = localStorage.getItem('khora_secrets');
  if (!secretsStr) throw new Error("No secrets found");

  const secrets = JSON.parse(secretsStr);
  const storedPayload = secrets[name];
  if (!storedPayload) throw new Error("Secret not found");

  const dek = await getDEKFromPIN(pin);

  const iv = base64ToBuffer(storedPayload.iv);
  const encryptedData = base64ToBuffer(storedPayload.data);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv } as AesGcmParams,
    dek,
    encryptedData as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

export function hasCryptoState(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('khora_crypto_state');
}

export function getSecretNames(): string[] {
  if (typeof window === 'undefined') return [];
  const secretsStr = localStorage.getItem('khora_secrets');
  if (!secretsStr) return [];
  const secrets = JSON.parse(secretsStr);
  return Object.keys(secrets);
}

export function deleteSecret(name: string): void {
  const secretsStr = localStorage.getItem('khora_secrets');
  if (!secretsStr) return;
  const secrets = JSON.parse(secretsStr);
  delete secrets[name];
  localStorage.setItem('khora_secrets', JSON.stringify(secrets));
}
