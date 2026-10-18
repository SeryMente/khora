"""Controlled fixtures; real settlement function, Core trajectory and SQLite.
Not a production/semantic/Neo4j integration certificate.
"""
from dataclasses import replace
from types import SimpleNamespace
import json
import pytest
from khora_kernel.contracts.proposal import (
    SourceTriplet, Anchor, ProposalItem, ProposalTriple, ProposalEnvelope,
    Judgment, validate_settlement_dependencies,
)
from khora_kernel.poblacion._ingestar import asentar, ratificar_propuesta
from khora_kernel.engine import core
from khora_kernel.engine.history import Ht, HtEvidence, load_ht, save_ht
from khora_kernel.engine.fval import fval


def proposal(tail_kind="entity", metadata=None):
    items=[ProposalItem("a","entity","Ana",Anchor("Ana"),[]),
           ProposalItem("b",tail_kind,"México",Anchor("México"),[]),
           ProposalItem("r","relation","vive en",Anchor("Ana vive en México"),[],
                        ProposalTriple("a","b","vive en"),metadata)]
    judgments=[Judgment("j"+i.id,i.id,"accept","real-test-user","2026-10-18T00:00:00Z") for i in items]
    return ProposalEnvelope("1.0.0",SourceTriplet("io:source",1,"a"*64),"test","b"*64,
                            "2026-10-18T00:00:00Z","2026-10-18T00:00:00Z",items,judgments,
                            source_provenance={"io_id":"source"})


class Memory:
    def __init__(self): self.writes=[]
    def asentar_transaccional(self,**kwargs): self.writes.append(kwargs); return len(kwargs["relaciones"])


def test_accepted_dependency_closure_writes_once_and_preserves_decision_provenance():
    p=proposal(); memory=Memory()
    result=asentar(p,memory,None,None)
    assert result.triples_escritos==1 and len(memory.writes)==1
    proof=memory.writes[0]["source_triplet"]["metadata"]["_khora_settlement"]
    assert proof["human_ratification_authenticated"] is False
    assert proof["judgments"][0]["actor"]=="real-test-user"


@pytest.mark.parametrize("case",["rejected_head","unreviewed_tail","missing_tail","literal_head","kind_mismatch","no_triple","duplicate_id","wrong_source","invalid_head_kind","reserved_metadata"])
def test_invalid_relation_never_recreates_unaccepted_endpoints(case):
    p=proposal()
    if case=="rejected_head": p=replace(p,judgments=[replace(j,decision="reject") if j.item_id=="a" else j for j in p.judgments])
    if case=="unreviewed_tail": p=replace(p,judgments=[j for j in p.judgments if j.item_id!="b"])
    if case=="missing_tail": p=replace(p,items=[i for i in p.items if i.id!="b"])
    if case=="literal_head": p=replace(p,items=[replace(i,kind="literal") if i.id=="a" else i for i in p.items])
    if case=="kind_mismatch": p=proposal("literal")
    if case=="no_triple": p=replace(p,items=[replace(i,triple=None) if i.id=="r" else i for i in p.items])
    if case=="duplicate_id": p=replace(p,items=p.items+[p.items[0]])
    if case=="wrong_source": p=proposal(metadata={"origen_kind":"information_object","origen_canonical":"wrong"})
    if case=="invalid_head_kind": p=proposal(metadata={"origen_kind":"literal"})
    if case=="reserved_metadata": p=replace(p,source_provenance={"io_id":"source","metadata":{"_khora_settlement":"original-value"}})
    memory=Memory()
    with pytest.raises(ValueError,match="settlement_"): asentar(p,memory,None,None)
    assert memory.writes==[]


def test_literal_tail_and_source_metadata_origin_remain_legal():
    validate_settlement_dependencies(proposal("literal",{"destino_kind":"literal"}))
    p=proposal("literal",{"destino_kind":"literal","origen_kind":"information_object","origen_canonical":"source"})
    p=replace(p,items=[i for i in p.items if i.id!="a"],judgments=[j for j in p.judgments if j.item_id!="a"])
    validate_settlement_dependencies(p)
    memory=Memory();asentar(p,memory,None,None)
    assert memory.writes[0]["relaciones"][0]["origen_id"]=="source"
    assert memory.writes[0]["relaciones"][0]["object_kind"]=="literal"


def test_automatic_acceptance_is_never_attributed_to_operator():
    p=ratificar_propuesta(replace(proposal(),judgments=[]))
    assert {j.actor for j in p.judgments}=={"system:automatic-ingestion"}


class Provider:
    def __init__(self,deficit="TEXTUAL"): self.roles=[];self.prompts=[];self.actions=iter(["RETRIEVE","ANSWER","STOP"]);self.deficit=deficit
    def generar(self,request):
        role=request.metadata["role"];self.roles.append(role);self.prompts.append(request.prompt)
        if role=="pi_theta": text=json.dumps({"accion":next(self.actions),"justificacion":"synthetic controlled policy"})
        elif role=="P_phi_generator": text="Synthetic answer, not a product result."
        else: text=json.dumps({"vt":"Insufficient","deficit_type":self.deficit,"reason":"test deficit"})
        return SimpleNamespace(texto=text)


@pytest.mark.parametrize("deficit,visual",[("TEXTUAL",False),("VISUAL",True)])
def test_only_actual_global_visual_deficit_enables_fallback(tmp_path,monkeypatch,deficit,visual):
    monkeypatch.setenv("KHORA_FVAL_MODE","mark")
    def retrieve(ht,question,memory):
        ht=core._set_last_step_observation(ht,{"gstar_nodes":["n"],"retrieval_query":question})
        return core._add_evidence(ht,[HtEvidence("n","test evidence",ht.steps[-1].n)])
    monkeypatch.setattr(core,"_retrieve",retrieve)
    provider=Provider(deficit)
    result=core.ejecutar_ciclo("s","¿Qué dice la foto sobre el compromiso?",provider,object(),str(tmp_path/"state.db"))
    assert result.delta_fb is visual
    assert provider.roles[:3]==["pi_theta","pi_theta","P_phi_generator"]
    assert "fVAL" in provider.roles
    judge_prompt=provider.prompts[provider.roles.index("fVAL")]
    assert "QUESTION:" in judge_prompt and "compromiso" in judge_prompt
    assert load_ht("s",str(tmp_path/"state.db")).verdicts[-1]["deficit_type"]==deficit
    policy_after_retrieval=provider.prompts[1]
    assert "test evidence" in policy_after_retrieval and "retrieval_query" in policy_after_retrieval
