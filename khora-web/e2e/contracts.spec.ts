import { test, expect } from '@playwright/test';
import { ObjetoDeInformacion } from '../lib/contracts/InformationObject';

test.describe('ObjetoDeInformacion Contract', () => {
  test('should validate a valid ObjetoDeInformacion mock instance at runtime', () => {
    const validMock: ObjetoDeInformacion = {
      id: 'obj-12345',
      texto: 'Hello, World!',
      provenance: {
        origen: 'chat',
        driver: null,
        timestamp: new Date().toISOString()
      },
      metadata: { key: 'value' }
    };

    expect(validMock).toHaveProperty('id');
    expect(typeof validMock.id).toBe('string');

    expect(validMock).toHaveProperty('texto');
    expect(typeof validMock.texto).toBe('string');

    expect(validMock).toHaveProperty('provenance');
    expect(validMock.provenance).toHaveProperty('origen');
    expect(validMock.provenance).toHaveProperty('driver');
    expect(validMock.provenance).toHaveProperty('timestamp');

    expect(validMock).toHaveProperty('metadata');
  });
});
