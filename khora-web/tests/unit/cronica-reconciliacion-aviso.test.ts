import test from 'node:test';
import assert from 'node:assert/strict';
import {reconciliarSegmentos} from '../../lib/transcripcion/reconciliar';
test('truncated final transcript is refused without asserting actual original loss',()=>{const texto='Una prueba sintética conserva este relato completo sin reemplazar sus palabras. '.repeat(80).trim();const original=[{id:'synthetic',texto,estado:'provisional_asr' as const}];const r=reconciliarSegmentos(original,'Una prueba.');assert.equal(r.textoFinal,texto);assert.equal(r.cambiosAplicados,0);assert.equal(r.perdidaDetectada,true);assert.match(r.motivo,/Se rechazó una transcripción incompleta/);assert.match(r.motivo,/no confirma pérdida del original/);});
