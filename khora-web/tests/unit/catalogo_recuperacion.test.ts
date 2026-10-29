import test from 'node:test';
import assert from 'node:assert/strict';
import { reconciliarCatalogoRecuperacion, type RecoveryCatalogEntry } from '../../lib/custodia/catalogo-recuperacion';

const entry = (sessionId: string, revisionId: string, savedAt: number, local = false): RecoveryCatalogEntry => ({
  sessionId, revisionId, savedAt, local, title: `${local ? 'Local' : 'Servidor'} ${revisionId}`,
});

test('combina la hidratación local/remota en una única tarjeta por sesión', () => {
  const local = [{...entry('s1','r1',100,true), localVersions:[entry('s1','r1',100,true),entry('s1','r0',50,true)]}];
  const remote = [entry('s1','r2',120,false),entry('s2','r3',90,false)];
  const result = reconciliarCatalogoRecuperacion(local, remote);
  assert.equal(result.length, 2);
  assert.equal(result[0].sessionId, 's1');
  assert.equal(result[0].revisionId, 'r2');
  assert.deepEqual(result[0].sourceVersions.map(x=>[x.revisionId,x.local]), [['r2',false],['r1',true],['r0',true]]);
});

test('una página posterior reconcilia una sesión que antes solo aparecía localmente', () => {
  const firstPage = reconciliarCatalogoRecuperacion([{...entry('s1','r-local',200,true), localVersions:[entry('s1','r-local',200,true)]}]);
  const secondPage = reconciliarCatalogoRecuperacion(firstPage, [entry('s1','r-remote',180,false),entry('s2','r2',170,false)]);
  assert.equal(secondPage.filter(x=>x.sessionId==='s1').length, 1);
  assert.deepEqual(secondPage.find(x=>x.sessionId==='s1')?.sourceVersions.map(x=>x.local), [true,false]);
  assert.equal(secondPage.length, 2);
});

test('conserva por separado un punto local y otro remoto con el mismo revisionId', () => {
  const result = reconciliarCatalogoRecuperacion([entry('s1','same',100,true)], [entry('s1','same',100,false)]);
  assert.equal(result.length, 1);
  assert.equal(result[0].sourceVersions.length, 2);
  assert.deepEqual(result[0].sourceVersions.map(x=>x.local).sort(), [false,true]);
});

test('el reingreso del mismo punto en páginas o respuestas distintas no lo duplica', () => {
  const remote = entry('s1','r1',100,false);
  const result = reconciliarCatalogoRecuperacion([remote], [remote], [entry('s1','r2',110,false)]);
  assert.equal(result.length, 1);
  assert.equal(result[0].sourceVersions.length, 2);
});

test('ordena sesiones y puntos por la fecha más reciente', () => {
  const result = reconciliarCatalogoRecuperacion([entry('s-old','r1',50,true), entry('s-new','r2',150,false)]);
  assert.deepEqual(result.map(x=>x.sessionId), ['s-new','s-old']);
});
