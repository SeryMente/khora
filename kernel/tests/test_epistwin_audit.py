# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json

import networkx as nx
import pytest

from khora_kernel.communities import jerarquia_leiden
from khora_kernel.epistwin_audit import (
    align_longitudinal,
    compare_community_ab,
    degree_preserving_null,
    gwet_ac1,
    likert_to_ordinal,
    likert_to_polarity,
    longitudinal_lineage_ids,
    membership_stability,
    modularity_q,
    null_modularity_report,
    partition_membership,
    persist_registry_signal,
    registry_signal,
    resolution_sweep,
)


def test_likert_and_ac1():
    assert likert_to_ordinal(1) == "low"
    assert likert_to_ordinal(3) == "medium"
    assert likert_to_ordinal(5) == "high"
    assert likert_to_polarity(1) == "Negative"
    assert likert_to_polarity(3) == "Neutral"
    assert likert_to_polarity(5) == "Positive"
    assert gwet_ac1(["Positive","Neutral","Positive"], ["Positive","Neutral","Positive"]) == pytest.approx(1.0)


def test_gwet_ac1_en_distribucion_sesgada():
    labels_a = ["high"] * 19 + ["medium"]
    labels_b = ["high"] * 19 + ["low"]
    score = gwet_ac1(labels_a, labels_b)
    assert 0.0 <= score < 1.0
    assert score == pytest.approx(0.9474720945502297)


def test_persist_registry_signal(tmp_path):
    signal = registry_signal(
        "community_signal",
        "delta_q",
        0.2,
        "12m",
        "no change under null",
        "degree-preserving-edge-permutation",
    )
    path = tmp_path / "signals.jsonl"
    record_hash = persist_registry_signal(
        signal,
        str(path),
        source_sha256="a" * 64,
        git_sha="b" * 40,
    )
    row = json.loads(path.read_text(encoding="utf-8").strip())
    assert row["status"] == "prospective"
    assert row["record_sha256"] == record_hash
    assert row["source_sha256"] == "a" * 64
    assert row["git_sha"] == "b" * 40
    assert row["metric"] == "delta_q"
    assert row["null_model"] == "degree-preserving-edge-permutation"
    assert row["recorded_at"]


def test_partition_integrity_and_stability():
    p = {"c1":["a","b"], "c2":["c"]}
    assert partition_membership(p)["a"] == "c1"
    assert membership_stability([p, p]) == 1.0
    with pytest.raises(ValueError):
        partition_membership({"c1":["a"], "c2":["a"]})


def test_leiden_null_and_resolution():
    g = nx.karate_club_graph()
    parts = jerarquia_leiden(g)
    p = {cid: info["miembros"] for cid, info in parts.estructura.items()}
    assert set().union(*map(set, p.values())) == set(g.nodes())
    assert modularity_q(g, p) >= -1.0
    h = degree_preserving_null(g, seed=7, swaps=20)
    assert sorted(dict(g.degree()).values()) == sorted(dict(h.degree()).values())
    report = null_modularity_report(g, p, seeds=(1,), nulls=2)
    assert report["null_samples"] == 2
    sweep = resolution_sweep(g, [0.5, 1.0], seed=7)
    assert len(sweep) == 2
    assert all(row["resolution_effective"] is False for row in sweep)


def test_ab_and_longitudinal_registry():
    active = {"c1":["a","b"], "c2":["c"]}
    disabled = {"c1":["a"], "c2":["b","c"]}
    result = compare_community_ab(None, active, disabled)
    assert result["changed"] is True
    # Every affected neighborhood changes, not just an arbitrary label assignment.
    assert set(result["changed_nodes"]) == {"a", "b", "c"}
    events = align_longitudinal(active, disabled)
    assert events
    signal = registry_signal("community_signal", "delta_q", 0.2, "12m", "no change under null", "degree-preserving-edge-permutation")
    assert signal.threshold == 0.2


def test_ab_gstar_split_merge_and_registry_contract():
    active = {"c1": ["a", "b"], "c2": ["c"]}
    disabled = {"c1": ["a"], "c2": ["b", "c"]}
    result = compare_community_ab(
        None, active, disabled,
        gstar_active=["a", "b"],
        gstar_disabled=["a", "c"],
        gstar_edges_active=[("a", "b")],
        gstar_edges_disabled=[("a", "c")],
    )
    assert result["changed"] is True
    assert result["gstar_changed"] is True

    split = align_longitudinal(
        {"old": ["a", "b", "c"]},
        {"new-1": ["a", "b"], "new-2": ["c"]}, threshold=0.3,
    )
    assert any(e["type"] == "split" for e in split)

    merge = align_longitudinal(
        {"old-1": ["a", "b"], "old-2": ["c", "d"]},
        {"new": ["a", "b", "c", "d"]}, threshold=0.4,
    )
    assert any(e["type"] == "merge" for e in merge)

    signal = registry_signal(
        "community_signal", "delta_q", 0.2, "12m",
        "no change under null", "degree-preserving-edge-permutation",
    )
    assert signal.null_model == "degree-preserving-edge-permutation"


def test_multi_judge_requires_reasoning_and_reports_ac1():
    from khora_kernel.epistwin_audit import run_multi_judge

    def judge_a(q, a_et, a_target):
        return {"reasoning": "comparación explícita", "likert": 5}

    def judge_b(q, a_et, a_target):
        return {"reasoning": "segunda evaluación independiente", "likert": 4}

    result = run_multi_judge(
        [{"id": "q1", "q": "¿?", "a_et": "A", "a_target": "A"}],
        {"judge_a": judge_a, "judge_b": judge_b},
    )
    assert result["judge_count"] == 2
    assert result["ac1_pairwise"]["judge_a:judge_b"] == pytest.approx(1.0)
    assert result["cases"][0]["judges"]["judge_a"]["ordinal"] == "high"
    assert result["cases"][0]["judges"]["judge_a"]["normalized"] == "Positive"


def test_longitudinal_lineage_tracks_stable_persistence_alignment_split_merge_birth_and_extinction():
    persistent = longitudinal_lineage_ids(
        {"c1": ["a", "b"]},
        {"c1": ["a", "b"]},
        threshold=0.5,
    )
    assert persistent["c1"]["event"] == "persistence"
    assert persistent["c1"]["stable_id"] == "c1"

    aligned = longitudinal_lineage_ids(
        {"old": ["a", "b", "c"]},
        {"new": ["a", "b", "c", "d"]},
        threshold=0.5,
    )
    assert aligned["new"]["event"] == "alignment"
    assert aligned["new"]["parents"] == ["old"]
    assert aligned["new"]["stable_id"] != "new"

    split = longitudinal_lineage_ids(
        {"old": ["a", "b", "c"]},
        {"left": ["a", "b"], "right": ["c"]},
        threshold=0.3,
    )
    assert split["left"]["event"] == "split"
    assert split["right"]["event"] == "split"
    assert split["left"]["parents"] == ["old"]
    assert split["right"]["parents"] == ["old"]

    merge = longitudinal_lineage_ids(
        {"old-left": ["a", "b"], "old-right": ["c", "d"]},
        {"new": ["a", "b", "c", "d"]},
        threshold=0.4,
    )
    assert merge["new"]["event"] == "merge"
    assert set(merge["new"]["parents"]) == {"old-left", "old-right"}

    birth = longitudinal_lineage_ids(
        {},
        {"new": ["a", "b"]},
    )
    assert birth["new"]["event"] == "birth"
    assert birth["new"]["parents"] == []

    extinct = align_longitudinal(
        {"old": ["a", "b"]},
        {},
        threshold=0.5,
    )
    assert any(event["type"] == "extinction" for event in extinct)
