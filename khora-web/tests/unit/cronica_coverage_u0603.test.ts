import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCronicaCoverage } from '../../lib/ingreso/cronica-coverage';

describe('U06-03: Fecha y hora coverage behavior', () => {
  it('starts RESOLVED only when automatic timestamp availability is confirmed', () => {
    const result = analyzeCronicaCoverage('', { automaticDateTimeOk: true });
    const datetimeItem = result.items.find(i => i.id === 'datetime');
    assert.ok(datetimeItem);
    assert.equal(datetimeItem.covered, true);
    assert.equal(datetimeItem.evidence, 'Verificado automáticamente');
  });

  it('becomes ACTIVE (covered: false) if automatic verification fails', () => {
    const result = analyzeCronicaCoverage('Hola mundo sin fecha', { automaticDateTimeOk: false });
    const datetimeItem = result.items.find(i => i.id === 'datetime');
    assert.ok(datetimeItem);
    assert.equal(datetimeItem.covered, false);
  });

  it('resolves active datetime criterion if explicit date/time is mentioned in text', () => {
    const result = analyzeCronicaCoverage('Hoy a las 10:00 am estuve trabajando', { automaticDateTimeOk: false });
    const datetimeItem = result.items.find(i => i.id === 'datetime');
    assert.ok(datetimeItem);
    assert.equal(datetimeItem.covered, true);
    assert.ok(datetimeItem.evidence?.includes('Hoy a las 10:00 am'));
  });
});

it('does not silently resolve date/time when automatic verification is absent', () => {
    const result = analyzeCronicaCoverage('');
    const datetimeItem = result.items.find(i => i.id === 'datetime');
    assert.ok(datetimeItem);
    assert.equal(datetimeItem.covered, false);
    assert.equal(datetimeItem.evidence, null);
  });
