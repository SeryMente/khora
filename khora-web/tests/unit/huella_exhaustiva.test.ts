import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extraerIPv4, capturarHuellaServidor } from '../../lib/custodia/huella';

describe('U06-04 & U06-05: Huella exhaustiva e IPv4', () => {
  it('extrae IPv4 válida de x-real-ip o x-vercel-forwarded-for', () => {
    const headers = {
      'x-real-ip': '203.0.113.195',
      'x-forwarded-for': '2001:db8::1, 203.0.113.195'
    };
    assert.equal(extraerIPv4(headers), '203.0.113.195');
  });

  it('retorna null para IPv4 si solo existe IPv6 y no inventa direcciones', () => {
    const headers = {
      'x-forwarded-for': '2001:db8::8a2e:370:7334'
    };
    assert.equal(extraerIPv4(headers), null);
  });

  it('captura metadatos de geolocalización de servidor sin datos de GPS explícitos', () => {
    const headers = {
      'x-vercel-ip-country': 'MX',
      'x-vercel-ip-city': 'Mexico City',
      'x-vercel-ip-timezone': 'America/Mexico_City',
      'user-agent': 'TestAgent/1.0'
    };
    const huella = capturarHuellaServidor(headers);
    assert.equal(huella.headers.country, 'MX');
    assert.equal(huella.headers.city, 'Mexico City');
    assert.equal(huella.headers.timezone, 'America/Mexico_City');
  });
});
