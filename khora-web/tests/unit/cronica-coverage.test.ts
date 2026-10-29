import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCronicaCoverage} from '../../lib/ingreso/cronica-coverage';
const flags=(s:string)=>analyzeCronicaCoverage(s,{automaticDateTimeOk:true}).items.map(i=>i.covered);
test('stable contract and optional labels, empty remains pending',()=>{
 const a=analyzeCronicaCoverage('',{automaticDateTimeOk:true});assert.deepEqual(a.items.map(i=>i.id),['datetime','when','where','what']);
 assert.equal(a.items[0].covered,true);assert.equal(a.items[0].evidence,'Fecha/hora disponible automáticamente');
 for(const i of a.items.slice(1)){assert.equal(i.covered,false);assert.equal(i.evidence,null);assert.match(i.label,/opcional/);}
});
for (const text of ['Hoy trabajé en casa.','Ayer caminé en el parque.','El lunes escribí en la biblioteca.','El 19 de octubre de 2026 estudié en Querétaro.','2026-10-19 estuve en la oficina.']) {
 test('explicit narrative: '+text,()=>assert.deepEqual(flags(text),[true,true,true,true]));
}
for(const text of ['Quizá ayer fui al parque.','Tal vez hoy trabajé en casa.','Creo que estuve en Querétaro.','No recuerdo si ayer caminé en casa.','No fui ayer a la biblioteca.','Nunca trabajé en casa.','Mañana iré a la oficina.','Si hoy estuviera en casa, escribiría.','Según Ana, ayer fui a la biblioteca.','Me dijeron que ayer trabajé en casa.','“Hoy trabajé en casa”.','Ella dijo que hoy trabajé en casa.','Ella trabajó ayer en casa.']) {
 test('uncertain/negative/future/attributed remains pending: '+text,()=>assert.deepEqual(flags(text),[true,false,false,false]));
}
test('deletion reopens every item, no sticky state',()=>{
 assert.deepEqual(flags('Hoy trabajé en casa.'),[true,true,true,true]);assert.deepEqual(flags(''),[true,false,false,false]);assert.deepEqual(flags('Trabajé.'),[true,false,false,true]);
});
test('independent clauses do not inherit an earlier denial',()=>assert.deepEqual(flags('No fui al parque. Hoy trabajé en casa.'),[true,true,true,true]));
test('contrast correction uses literal positive clause',()=>{
 const text='No fui ayer al parque, pero hoy trabajé en casa';const a=analyzeCronicaCoverage(text,{automaticDateTimeOk:true});assert.deepEqual(a.items.map(i=>i.covered),[true,true,true,true]);for(const i of a.items.slice(1))assert.equal(i.evidence,'hoy trabajé en casa');
});
test('literal evidence, no normalization/inferred date',()=>{
 const text='  Ayer   trabajé en casa.  ';for(const i of analyzeCronicaCoverage(text).items.slice(1)){assert.equal(i.evidence,'Ayer   trabajé en casa');assert.ok(text.includes(i.evidence!));}
});
test('no obligation to include any one cue',()=>{assert.deepEqual(flags('Hoy.'),[true,true,false,false]);assert.deepEqual(flags('En casa.'),[true,false,true,false]);assert.deepEqual(flags('Escribí.'),[true,false,false,true]);});
test('identity assertion is not activity or proof',()=>assert.deepEqual(flags('Soy Víctor.'),[true,false,false,false]));
test('emotion not guessed into location',()=>assert.deepEqual(flags('Hoy me sentí en paz.'),[true,true,false,true]));
test('platform is not inferred physical location',()=>assert.deepEqual(flags('Hoy escribí en Facebook.'),[true,true,false,true]));
test('month and number are not inferred location',()=>assert.deepEqual(flags('En octubre escribí.'),[true,true,false,true]));
test('unknown lowercase place may remain pending',()=>assert.deepEqual(flags('Hoy caminé en querétaro.'),[true,true,false,true]));
test('quoted cues cannot cover reported content',()=>assert.deepEqual(flags('Dijo: «Hoy caminé en casa».'),[true,false,false,false]));
test('unquoted own activity survives quoted embedded content',()=>assert.deepEqual(flags('Hoy escribí "ayer" en casa.'),[true,true,true,true]));
test('unqualified third person cannot cover own activity',()=>assert.deepEqual(flags('Mi hermana caminó hoy en casa.'),[true,false,false,false]));
test('vague reflection not filled with invented clues',()=>assert.deepEqual(flags('La vida es extraña.'),[true,false,false,false]));
test('arbitrary long free narrative is not truncated or rejected',()=>{
 const text='Reflexión libre. '.repeat(2000)+'Hoy trabajé en casa.';assert.deepEqual(flags(text),[true,true,true,true]);for(const i of analyzeCronicaCoverage(text).items.slice(1))assert.ok(text.includes(i.evidence!));
});
test('repeatability and returned values do not leak state',()=>{
 const text='Hoy trabajé en casa.';const a=analyzeCronicaCoverage(text);a.items[0].covered=false;a.items[1].evidence='inventado';assert.deepEqual(flags(text),[true,true,true,true]);assert.deepEqual(analyzeCronicaCoverage(text),analyzeCronicaCoverage(text));
});

test('past morning is not confused with future tomorrow',()=>assert.deepEqual(flags('Esta mañana trabajé en casa.'),[true,true,true,true]));
test('activity noun alone does not assert first person',()=>assert.deepEqual(flags('Mi trabajo está en casa.'),[true,false,true,false]));
test('contracted locative al is recognized',()=>assert.deepEqual(flags('Ayer fui al parque.'),[true,true,true,true]));

test('unclosed quote in live transcript never becomes own evidence',()=>assert.deepEqual(flags('Ella dijo: «Hoy trabajé en casa'),[true,false,false,false]));
test('past morning phrase is retained without guessing future',()=>assert.deepEqual(flags('Ayer por la mañana trabajé en casa.'),[true,true,true,true]));

test('quoted multi-sentence narrative never becomes operator evidence',()=>assert.deepEqual(flags('Ella dijo: «Ayer descansé. Hoy trabajé en casa». '),[true,false,false,false]));
test('unclosed multi-sentence quote stays masked during live dictation',()=>assert.deepEqual(flags('Dijo: «Ayer descansé. Hoy trabajé en casa'),[true,false,false,false]));
test('own narrative after closed quote remains eligible',()=>assert.deepEqual(flags('«Ayer caminé». Hoy trabajé en casa.'),[true,true,true,true]));

test('date/time is not marked resolved without an automatic verification result',()=>{
 const missing=analyzeCronicaCoverage('');assert.equal(missing.items[0].covered,false);assert.equal(missing.items[0].evidence,null);
 const verified=analyzeCronicaCoverage('',{automaticDateTimeOk:true});assert.equal(verified.items[0].covered,true);assert.equal(verified.items[0].evidence,'Fecha/hora disponible automáticamente');
});
