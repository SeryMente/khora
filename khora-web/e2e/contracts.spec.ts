import { test, expect } from '@playwright/test';
import { InformationObject } from '../lib/contracts/InformationObject';

test.describe('InformationObject Contract', () => {
  test('should validate a valid InformationObject mock instance at runtime', () => {
    const validMock: InformationObject<{ text: string }> = {
      id: 'obj-12345',
      timestamp: Date.now(),
      source: 'bitacora',
      content: { text: 'Hello, World!' }
    };

    expect(validMock).toHaveProperty('id');
    expect(typeof validMock.id).toBe('string');

    expect(validMock).toHaveProperty('timestamp');
    expect(typeof validMock.timestamp).toBe('number');

    expect(validMock).toHaveProperty('source');
    expect(['bitacora', 'cabina_opi_vri', 'harmonia']).toContain(validMock.source);

    expect(validMock).toHaveProperty('content');
  });

  test('should validate multiple sources', () => {
    const mock1: InformationObject = { id: '1', timestamp: 1, source: 'bitacora', content: {} };
    const mock2: InformationObject = { id: '2', timestamp: 2, source: 'cabina_opi_vri', content: {} };
    const mock3: InformationObject = { id: '3', timestamp: 3, source: 'harmonia', content: {} };

    expect(['bitacora', 'cabina_opi_vri', 'harmonia']).toContain(mock1.source);
    expect(['bitacora', 'cabina_opi_vri', 'harmonia']).toContain(mock2.source);
    expect(['bitacora', 'cabina_opi_vri', 'harmonia']).toContain(mock3.source);
  });
});
