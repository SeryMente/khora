import json,tempfile,os
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace as NS
from khora_kernel.api import Triple,Provenance
from khora_kernel.resolucion._resolver import resolver
from khora_kernel.contracts.proposal import *
from khora_kernel.poblacion import _ingestar as ing
from khora_kernel.engine import core
from khora_kernel.engine.history import Ht,HtEvidence,save_ht
from khora_kernel.engine.fval import FvalResult
from khora_kernel import embeddings
results=[]
def add(i,expected,observed,failed):results.append(dict(id=i,expected=expected,observed=observed,verdict='FAIL' if failed else 'PASS'))
prov=Provenance('fixture',None,'2026-10-18T00:00:00Z')
class Memory:
 def buscar_entidades_candidatas(self,k):return [dict(canonical_key='ana',embedding=[],provenance=[])] if k=='ana' else []
r=resolver([Triple('t','Ana','médica','es',prov,{},prov.timestamp,None,prov.timestamp)],Memory(),None,None)
add('R04','Coincidencia lexical propone candidato, no identidad',dict(canonical=r.entidades['Ana'].canonical_key,decision=r.entidades['Ana'].decision,needs_review=r.entidades['Ana'].needs_review),r.entidades['Ana'].decision=='MERGE' and not r.entidades['Ana'].needs_review)
t=SourceTriplet('00000000-0000-0000-0000-000000000001',1,'a'*64);it=ProposalItem(compute_item_id(t,'e'),'entity','ana',Anchor('Ana'),[])
env=ProposalEnvelope('1.0.0',t,'fixture',compute_payload_hash([it]),prov.timestamp,prov.timestamp,[it],[],None,{'io_id':'io-fixture'})
class Capture:
 def asentar_transaccional(self,**kw):self.kw=kw;return 1
mem=Capture()
with patch.object(ing,'proponer',return_value=env):
 act=ing.ingestar(NS(),mem,None,None)
add('R05','No asentar contenido sin juicio humano explícito',dict(write_called=hasattr(mem,'kw'),synthetic_actor=ing.ratificar_propuesta(env).judgments[0].actor,synthetic_decision=ing.ratificar_propuesta(env).judgments[0].decision),hasattr(mem,'kw'))
it2=ProposalItem(compute_item_id(t,'e2'),'entity','médica',Anchor('médica'),[])
rel=ProposalItem(compute_item_id(t,'r'),'relation','es',Anchor('Ana es médica'),[],ProposalTriple(it.id,it2.id,'es'))
items=[it,it2,rel];js=[Judgment('j1',it.id,'reject','human',prov.timestamp),Judgment('j2',it2.id,'reject','human',prov.timestamp),Judgment('j3',rel.id,'accept','human',prov.timestamp)]
env2=ProposalEnvelope('1.0.0',t,'fixture',compute_payload_hash(items),prov.timestamp,prov.timestamp,items,js,None,{'io_id':'io-fixture'})
mem=Capture(); ing.asentar(env2,mem,None,None)
add('R06','Detectar conflicto de relación aceptada con extremos rechazados',dict(entities=mem.kw['entidades'],relations=mem.kw['relaciones']),bool(mem.kw['relaciones']) and not mem.kw['entidades'])
with tempfile.TemporaryDirectory() as td:
 db=td+'/history.db';captured=[]
 class Provider:
  def generar(self,req):return NS(texto='CONSULTA REFINADA',modelo='fixture')
 class Retriever:
  def __init__(self,*a,**kw):pass
  def consultar(self,q,ctx):
   from khora_kernel.api import ResultadoDeConsulta,SubgrafoRelevante,NivelSuficiencia
   captured.append(q);return ResultadoDeConsulta([],SubgrafoRelevante(),NivelSuficiencia.INSUFICIENTE)
 with patch.object(core,'_policy',side_effect=[(core.Lambda.REFINE,''),(core.Lambda.RETRIEVE,''),(core.Lambda.STOP,'')]),patch.object(core,'RetrieverGraphRAG',Retriever):core.ejecutar_ciclo('refine','PREGUNTA ORIGINAL',Provider(),object(),db)
 add('R07','REFINE cambia la consulta del siguiente RETRIEVE',dict(refined='CONSULTA REFINADA',retrieved=captured),captured==['PREGUNTA ORIGINAL'])
 save_ht(Ht('visual',prov.timestamp,evidence=[HtEvidence('fallback_vqa','payload fixture',1)]),db)
 with patch.dict(os.environ,{'KHORA_FVAL_MODE':'mark'}),patch.object(core,'_policy',return_value=(core.Lambda.ANSWER,'')),patch.object(core,'_answer',return_value=core.Response('afirmación sin validar',[],'visual')),patch.object(core,'fval') as judge:
  # memoria=None is accepted only by this lower-level function, not by public ask.
  out=core.ejecutar_ciclo('visual','pregunta',Provider(),None,db)
 add('R08','Evidencia visual no debe autoaprobar sin fVAL',dict(verdict=out.verdict,judge_calls=judge.call_count,configuration='KHORA_FVAL_MODE=mark; controlled lower-level execution'),out.verdict=='SUFFICIENT' and judge.call_count==0)
 for name,file in [('INDEX_FILE','index.npz'),('MAP_FILE','ids.json'),('META_FILE','meta.json'),('TEXT_FILE','texts.json')]:setattr(embeddings,name,Path(td)/file)
 with patch.dict(os.environ,{'KHORA_EMB_OFFLINE':'1'}):
  embeddings.rebuild_index(NS(get_all_nodes=lambda:[dict(id='old-node',text='Ana médica')]),'old-revision')
  matches=embeddings.knn('Ana médica',1);meta=json.loads(embeddings.META_FILE.read_text())
 add('R09','Índice identifica espacio/modelo y exige revisión del consumidor',dict(meta=meta,returned=matches,consumer_revision_parameter=False),bool(matches) and set(meta)=={'graph_revision','invalidated'})
report=dict(scope='isolated real Python functions; fixtures/mocks are explicit; no production/providers; R09 contract evidence, not a live stale-index incident',results=results)
Path('./python-regressions.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)); print(json.dumps(results,ensure_ascii=False))
