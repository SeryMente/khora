import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCronicaCoverage} from '../../lib/ingreso/cronica-coverage';
const flags=(s:string)=>analyzeCronicaCoverage(s).items.map(i=>i.covered);
test('stable contract and mandatory sufficient labels, empty remains pending',()=>{
 const a=analyzeCronicaCoverage('');assert.deepEqual(a.items.map(i=>i.id),['when','where','what']);
 for(const i of a.items){assert.equal(i.covered,false);assert.equal(i.evidence,null);assert.match(i.label,/mínimo suficiente/);}
});
for (const text of ['Hoy trabajé en casa.','Ayer caminé en el parque.','El lunes escribí en la biblioteca.','El 19 de octubre de 2026 estudié en Querétaro.','2026-10-19 estuve en la oficina.']) {
 test('explicit narrative: '+text,()=>assert.deepEqual(flags(text),[true,true,true]));
}
for(const text of ['Quizá ayer fui al parque.','Tal vez hoy trabajé en casa.','Creo que estuve en Querétaro.','No recuerdo si ayer caminé en casa.','No fui ayer a la biblioteca.','Nunca trabajé en casa.','Mañana iré a la oficina.','Si hoy estuviera en casa, escribiría.','Según Ana, ayer fui a la biblioteca.','Me dijeron que ayer trabajé en casa.','“Hoy trabajé en casa”.','Ella dijo que hoy trabajé en casa.','Ella trabajó ayer en casa.']) {
 test('uncertain/negative/future/attributed remains pending: '+text,()=>assert.deepEqual(flags(text),[false,false,false]));
}
test('deletion reopens every item, no sticky state',()=>{
 assert.deepEqual(flags('Hoy trabajé en casa.'),[true,true,true]);assert.deepEqual(flags(''),[false,false,false]);assert.deepEqual(flags('Trabajé.'),[false,false,true]);
});
test('independent clauses do not inherit an earlier denial',()=>assert.deepEqual(flags('No fui al parque. Hoy trabajé en casa.'),[true,true,true]));
test('contrast correction uses literal positive clause',()=>{
 const text='No fui ayer al parque, pero hoy trabajé en casa';const a=analyzeCronicaCoverage(text);assert.deepEqual(a.items.map(i=>i.covered),[true,true,true]);for(const i of a.items)assert.equal(i.evidence,'hoy trabajé en casa');
});
test('literal evidence, no normalization/inferred date',()=>{
 const text='  Ayer   trabajé en casa.  ';for(const i of analyzeCronicaCoverage(text).items){assert.equal(i.evidence,'Ayer   trabajé en casa');assert.ok(text.includes(i.evidence!));}
});
test('each cue is analyzed independently, not a conservation gate',()=>{assert.deepEqual(flags('Hoy.'),[true,false,false]);assert.deepEqual(flags('En casa.'),[false,true,false]);assert.deepEqual(flags('Escribí.'),[false,false,true]);});
test('identity assertion is not activity or proof',()=>assert.deepEqual(flags('Soy Víctor.'),[false,false,false]));
test('emotion not guessed into location',()=>assert.deepEqual(flags('Hoy me sentí en paz.'),[true,false,true]));
test('platform is not inferred physical location',()=>assert.deepEqual(flags('Hoy escribí en Facebook.'),[true,false,true]));
test('month and number are not inferred location',()=>assert.deepEqual(flags('En octubre escribí.'),[false,false,true]));
test('unknown lowercase place may remain pending',()=>assert.deepEqual(flags('Hoy caminé en querétaro.'),[true,false,true]));
test('quoted cues cannot cover reported content',()=>assert.deepEqual(flags('Dijo: «Hoy caminé en casa».'),[false,false,false]));
test('unquoted own activity survives quoted embedded content',()=>assert.deepEqual(flags('Hoy escribí "ayer" en casa.'),[true,true,true]));
test('unqualified third person cannot cover own activity',()=>assert.deepEqual(flags('Mi hermana caminó hoy en casa.'),[false,false,false]));
test('vague reflection not filled with invented clues',()=>assert.deepEqual(flags('La vida es extraña.'),[false,false,false]));
test('arbitrary long free narrative is not truncated or rejected',()=>{
 const text='Reflexión libre. '.repeat(2000)+'Hoy trabajé en casa.';assert.deepEqual(flags(text),[true,true,true]);for(const i of analyzeCronicaCoverage(text).items)assert.ok(text.includes(i.evidence!));
});
test('repeatability and returned values do not leak state',()=>{
 const text='Hoy trabajé en casa.';const a=analyzeCronicaCoverage(text);a.items[0].covered=false;a.items[1].evidence='inventado';assert.deepEqual(flags(text),[true,true,true]);assert.deepEqual(analyzeCronicaCoverage(text),analyzeCronicaCoverage(text));
});

test('past morning is not confused with future tomorrow',()=>assert.deepEqual(flags('Esta mañana trabajé en casa.'),[true,true,true]));
test('activity noun alone does not assert first person',()=>assert.deepEqual(flags('Mi trabajo está en casa.'),[false,true,false]));
test('contracted locative al is recognized',()=>assert.deepEqual(flags('Ayer fui al parque.'),[true,true,true]));

test('unclosed quote in live transcript never becomes own evidence',()=>assert.deepEqual(flags('Ella dijo: «Hoy trabajé en casa'),[false,false,false]));
test('past morning phrase is retained without guessing future',()=>assert.deepEqual(flags('Ayer por la mañana trabajé en casa.'),[true,true,true]));

test('quoted multi-sentence narrative never becomes operator evidence',()=>assert.deepEqual(flags('Ella dijo: «Ayer descansé. Hoy trabajé en casa». '),[false,false,false]));
test('unclosed multi-sentence quote stays masked during live dictation',()=>assert.deepEqual(flags('Dijo: «Ayer descansé. Hoy trabajé en casa'),[false,false,false]));
test('own narrative after closed quote remains eligible',()=>assert.deepEqual(flags('«Ayer caminé». Hoy trabajé en casa.'),[true,true,true]));

for(const text of ['Estoy en el cibercafé Louis Pasteur.','Estoy en el cybernet de la calle Luis Pasteur.']) {
 test('reported own general location: '+text,()=>{
  const a=analyzeCronicaCoverage(text);assert.equal(a.items[1].covered,true);assert.equal(a.items[2].covered,false);assert.ok(text.includes(a.items[1].evidence!));
 });
}
test('explicit street correction keeps latest literal anchor',()=>{
 const text='Estoy en el cibercafé Louis Pasteur. Digo cybernet de la calle Luis Pasteur.';
 const a=analyzeCronicaCoverage(text);assert.equal(a.items[1].covered,true);assert.equal(a.items[1].evidence,'Digo cybernet de la calle Luis Pasteur');
});
test('date assertion with del and following weekday',()=>{
 const text='es 19 de Octubre del 2026 el lunes';const a=analyzeCronicaCoverage(text);assert.equal(a.items[0].covered,true);assert.equal(a.items[0].evidence,text);
});
for(const text of ['Estoy cansado.','Estoy aquí.','Estoy en casa.','Estoy seguro.'])test('bare estoy is not an activity: '+text,()=>assert.equal(analyzeCronicaCoverage(text).items[2].covered,false));
test('present first-person dictation is activity',()=>assert.equal(analyzeCronicaCoverage('Estoy dictando en el cibercafé.').items[2].covered,true));
for(const suffix of [' y no recuerdo si mañana iré al parque',' y supongamos que ella fue ayer a casa',' no recuerdo si fui ayer al parque',' entonces quizá mañana vaya a casa'])test('remote qualifier cannot revoke earlier own assertion: '+suffix,()=>{
 const text='Hoy trabajé en el cibercafé Louis Pasteur'+suffix;const a=analyzeCronicaCoverage(text);assert.deepEqual(a.items.map(i=>i.covered),[true,true,true]);for(const i of a.items)assert.ok(text.includes(i.evidence!));
});
for(const text of ['Si digo estoy en el cibercafé Louis Pasteur.','Por ejemplo si digo estoy en el cibercafé Louis Pasteur.','Ella está en el cibercafé Louis Pasteur.','No estoy en el cibercafé Louis Pasteur.','Quizá estoy en el cibercafé Louis Pasteur.','Según Ana estoy en el cibercafé Louis Pasteur.','«Estoy en el cibercafé Louis Pasteur».','Si es 19 de octubre del 2026.','No es 19 de octubre del 2026.','Creo que es 19 de octubre del 2026.'])test('local qualification and examples remain pending: '+text,()=>assert.deepEqual(flags(text),[false,false,false]));
test('live deletion and replacement reopens, no previously saved coverage',()=>{
 assert.deepEqual(flags('Hoy trabajé en el cibercafé Louis Pasteur.'),[true,true,true]);assert.deepEqual(flags('No estoy en el cibercafé Louis Pasteur.'),[false,false,false]);assert.deepEqual(flags(''),[false,false,false]);
});
test('earlier remote denial does not swallow new explicit date predicate',()=>{
 const text='ahora veo que no desapareció entonces hay fallas nada más que no se ha quitado nada es 19 de Octubre del 2026 el lunes';assert.equal(analyzeCronicaCoverage(text).items[0].covered,true);
});

for(const text of ['No sé si hoy es 19 de octubre del 2026.','Quizá hoy es 19 de octubre del 2026.','Según Ana hoy es 19 de octubre del 2026.','Supongamos que hoy es 19 de octubre del 2026.'])test('qualified date not split into certainty: '+text,()=>assert.equal(analyzeCronicaCoverage(text).items[0].covered,false));
test('explicit self-retraction clears prior cues without deleting source',()=>assert.deepEqual(flags('Hoy trabajé en casa. Me equivoqué.'),[false,false,false]));
test('uncertain correction reopens rather than retaining the old assertion',()=>assert.deepEqual(flags('Hoy trabajé en casa. Corrijo quizá fue en la biblioteca.'),[false,false,false]));

for(const text of ['Si ahora trabajo en casa.','Creo que ahora trabajo en casa.','Según Ana entonces hoy trabajé en casa.','Supongamos que trabajo en casa y yo escribo en la biblioteca.'])test('discourse boundary cannot release conditional or reported scope: '+text,()=>assert.deepEqual(flags(text),[false,false,false]));

// Literal non-private UI feedback excerpt from central event1416; HTML source representation.
test("actual unpunctuated date/checklist feedback preserves explicit date",()=>{
 const text="Digo cybernet de la calle Luis Pasteur ya le debería de haber dado cobertura al punto lugar ahora veo que no desapareció y eso es lo que tienes que corregir es decir el modo crónica personal me tiene que dar unas indicadores visuales de que no me tiene que decir cómo hacer las cosas pero en la medida que yo haga las cosas que tengo que hacer para que sí sea una crónica personal entonces debe de ir marcando el checklist en este momento no funcionó hay que hacerlo bien qué hago bueno pues ya se entiende qué es lo que estoy haciendo eso puede ser esa parte debe ser a lo mejor es un poquito más difícil porque porque no se sabe cuándo acabo no puede que ya hasta que termine la entrada se calcule esa esa ese requerimiento se va a calcular ya cuando termine porque qué tal si al final resulta que estaba haciendo otra cosa el momento no sé por qué dijiste momento quizás sería mejor ponerle hora y fecha por qué pusiste momento me llama la atención porque elegiste ese término me siento curioso ya como que se quitó qué haces y luego volvió a aparecer entonces si hay un mecanismo que está tratando de hacer lo que te dije que quería que hiciese nada más que no se ha quitado nada es 19 de Octubre del 2026 el lunes y ya se quitó el lo del momento pero volvió a aparecer entonces hay fallas ";const a=analyzeCronicaCoverage(text);assert.equal(a.items[0].covered,true);assert.ok(text.includes(a.items[0].evidence!));
});

test('explicit same-statement retraction cannot leave a positive cue',()=>assert.deepEqual(flags('Hoy trabajé en casa no es cierto'),[false,false,false]));
