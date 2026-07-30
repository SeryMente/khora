import { test, expect } from '@playwright/test';
import { generateSalt16, deriveVaultKey, encryptLocal, decryptLocal } from '../../lib/crypto-local';

test.describe('crypto-local contracts', () => {
  test('generateSalt16 should return exactly 16 bytes', () => {
    const salt = generateSalt16();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  test('deriveVaultKey should generate a non-exportable CryptoKey with AES-GCM 256', async () => {
    const salt = generateSalt16();
    const key = await deriveVaultKey('mySecurePassword', salt);

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.extractable).toBe(false);
    expect(key.algorithm.name).toBe('AES-GCM');

    // Check key length is 256 bits by inspecting algorithm details (in Web Crypto it should have length: 256)
    const alg = key.algorithm as any;
    expect(alg.length).toBe(256);
  });

  test('round-trip encryption and decryption without AAD', async () => {
    const salt = generateSalt16();
    const key = await deriveVaultKey('mySecurePassword', salt);
    const plaintext = 'Secret Message Without AAD';

    const envelope = await encryptLocal(plaintext, key);
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ciphertext');
    expect(envelope.aad).toBeUndefined();

    const decrypted = await decryptLocal(envelope, key);
    expect(decrypted).toBe(plaintext);
  });

  test('round-trip encryption and decryption with AAD', async () => {
    const salt = generateSalt16();
    const key = await deriveVaultKey('mySecurePassword', salt);
    const plaintext = 'Secret Message With AAD';
    const aad = 'Additional Auth Data';

    const envelope = await encryptLocal(plaintext, key, aad);
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ciphertext');
    expect(envelope.aad).toBeDefined();

    const decrypted = await decryptLocal(envelope, key);
    expect(decrypted).toBe(plaintext);
  });

  test('decryption should fail with incorrect password', async () => {
    const salt = generateSalt16();
    const key1 = await deriveVaultKey('correctPassword', salt);
    const key2 = await deriveVaultKey('wrongPassword', salt);
    const plaintext = 'This should not be readable';

    const envelope = await encryptLocal(plaintext, key1);

    await expect(decryptLocal(envelope, key2)).rejects.toThrow();
  });
});
