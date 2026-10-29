import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VOCABULARIO_MOMENTO, evaluarSugerenciaMomentoIA } from '../../lib/ingreso/momento-categorias';

describe('U06-06 & U06-07: Momento por categorías y reglas 1 a 4 de IA', () => {
  it('contiene vocabulario organizado por categorías (general, concreta, especializada)', () => {
    const generales = VOCABULARIO_MOMENTO.filter(m => m.categoria === 'general');
    const concretas = VOCABULARIO_MOMENTO.filter(m => m.categoria === 'concreta');
    const especializadas = VOCABULARIO_MOMENTO.filter(m => m.categoria === 'especializada');

    assert.ok(generales.length >= 4);
    assert.ok(concretas.length >= 4);
    assert.ok(especializadas.length >= 2);
  });

  it('rechaza sugerencias que ya existen en el vocabulario prediseñado', () => {
    const res = evaluarSugerenciaMomentoIA('mañana', 'general', 'salí en la mañana');
    assert.equal(res.sugerida, false);
  });

  it('acepta término nuevo pulido según Condiciones 1, 2 y 3', () => {
    const res = evaluarSugerenciaMomentoIA('Hora del té', 'concreta', 'nos reunimos a la hora del té');
    assert.equal(res.sugerida, true);
    assert.equal(res.categoriaNorm, 'concreta');
    assert.equal(res.condicionCumplida, 3);
  });

  it('acepta excepción según Condición 4 cuando coincide con el contexto explícito', () => {
    const res = evaluarSugerenciaMomentoIA('Ocaso', undefined, 'observamos el ocaso en la montaña');
    assert.equal(res.sugerida, true);
    assert.equal(res.categoriaNorm, 'concreta'); // fallback default or C3/C4
  });
});
