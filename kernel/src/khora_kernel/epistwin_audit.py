# @l0 L0-002-R · @req QA-EPISTWIN/REQ-1 · @acr ACR-EPISTWIN-1 · @ua UA-36,UA-37,UA-46,UA-47,UA-48,UA-53,UA-56,UA-57,UA-59
"""Instrumentos cuantitativos para auditoría reproducible de fidelidad EpisTwin."""
from __future__ import annotations

import hashlib
import json
import math
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import networkx as nx


def likert_to_ordinal(score: int) -> str:
    if score not in range(1, 6):
        raise ValueError('Likert debe estar entre 1 y 5')
    return 'low' if score <= 2 else 'medium' if score == 3 else 'high'


def likert_to_polarity(score: int) -> str:
    """Normalización EpisTwin: 1-2 Negative, 3 Neutral, 4-5 Positive."""
    if score not in range(1, 6):
        raise ValueError('Likert debe estar entre 1 y 5')
    return 'Negative' if score <= 2 else 'Neutral' if score == 3 else 'Positive'


def gwet_ac1(labels_a: Iterable[str], labels_b: Iterable[str]) -> float:
    a, b = list(labels_a), list(labels_b)
    if len(a) != len(b) or not a:
        raise ValueError('Los dos jueces deben tener igual número de etiquetas no vacío')
    po = sum(x == y for x, y in zip(a, b)) / len(a)
    cats = sorted(set(a) | set(b))
    if len(cats) == 1:
        return 1.0
    pbar = {c: (a.count(c) + b.count(c)) / (2 * len(a)) for c in cats}
    k = len(cats)
    pe = sum(p * (1 - p) for p in pbar.values()) / (k - 1)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0


def partition_membership(parts: dict[str, Iterable[str]]) -> dict[str, str]:
    result: dict[str, str] = {}
    for cid, members in parts.items():
        for member in members:
            if member in result:
                raise ValueError(f'Nodo duplicado entre comunidades: {member}')
            result[member] = cid
    return result


def membership_stability(partitions: list[dict[str, Iterable[str]]]) -> float:
    if len(partitions) < 2:
        return 1.0
    memberships = [partition_membership(p) for p in partitions]
    pairs: list[float] = []
    for left, right in zip(memberships, memberships[1:]):
        shared = sorted(set(left) & set(right))
        if not shared:
            pairs.append(1.0)
            continue
        same = sum(left[n] == right[n] for n in shared)
        pairs.append(same / len(shared))
    return sum(pairs) / len(pairs)


def degree_preserving_null(G: nx.Graph, seed: int = 42, swaps: int | None = None) -> nx.Graph:
    H = G.copy()
    if H.number_of_edges() < 2:
        return H
    target = swaps if swaps is not None else max(1, 10 * H.number_of_edges())
    nx.double_edge_swap(H, target, max_tries=max(target * 20, 100), seed=seed)
    return H


def modularity_q(G: nx.Graph, partition: dict[str, Iterable[str]]) -> float:
    communities = [set(members) for members in partition.values() if members]
    return nx.algorithms.community.modularity(G, communities, weight='weight') if communities else 0.0


def resolution_sweep(
    G: nx.Graph, resolutions: Iterable[float], seed: int = 42
) -> list[dict[str, Any]]:
    """Explora parámetros sin atribuir efecto a una resolución que no sea efectiva."""
    from khora_kernel.communities import jerarquia_leiden
    rows = []
    for resolution in resolutions:
        result = jerarquia_leiden(G, gamma=float(resolution), seed=seed)
        partition = {cid: info["miembros"] for cid, info in result.estructura.items()}
        rows.append({
            "resolution": float(resolution),
            "resolution_effective": False,
            "community_count": len(partition),
            "partition": partition,
            "modularity_q": modularity_q(G, partition),
        })
    return rows


def null_modularity_report(G: nx.Graph, partition: dict[str, Iterable[str]], seeds=(42, 43, 44), nulls=10) -> dict[str, Any]:
    observed = modularity_q(G, partition)
    null_values: list[float] = []
    for seed in seeds:
        for offset in range(nulls):
            H = degree_preserving_null(G, seed=seed + offset)
            null_values.append(modularity_q(H, partition))
    mean = sum(null_values) / len(null_values) if null_values else 0.0
    variance = sum((x - mean) ** 2 for x in null_values) / len(null_values) if null_values else 0.0
    std = math.sqrt(variance)
    return {
        'observed_modularity': observed,
        'null_mean': mean,
        'null_std': std,
        'z_score': (observed - mean) / std if std else None,
        'null_samples': len(null_values),
    }


def compare_community_ab(
    G: nx.Graph | None,
    active: dict[str, Iterable[str]],
    disabled: dict[str, Iterable[str]],
    gstar_active: Iterable[str] | None = None,
    gstar_disabled: Iterable[str] | None = None,
    gstar_edges_active: Iterable[tuple[str, str]] | None = None,
    gstar_edges_disabled: Iterable[tuple[str, str]] | None = None,
) -> dict[str, Any]:
    def sig(partition: dict[str, Iterable[str]]) -> str:
        payload = sorted(sorted(map(str, members)) for members in partition.values())
        return hashlib.sha256(json.dumps(payload, separators=(',', ':')).encode()).hexdigest()

    active_members = partition_membership(active)
    disabled_members = partition_membership(disabled)
    changed_nodes = sorted(
        n for n in set(active_members) | set(disabled_members)
        if active_members.get(n) != disabled_members.get(n)
    )

    result: dict[str, Any] = {
        'changed': bool(changed_nodes),
        'changed_nodes': changed_nodes,
        'active_signature': sig(active),
        'disabled_signature': sig(disabled),
    }

    if gstar_active is not None or gstar_disabled is not None:
        active_set = set(map(str, gstar_active or []))
        disabled_set = set(map(str, gstar_disabled or []))
        active_edges = {tuple(sorted(map(str, e))) for e in (gstar_edges_active or [])}
        disabled_edges = {tuple(sorted(map(str, e))) for e in (gstar_edges_disabled or [])}
        result.update({
            'gstar_changed': active_set != disabled_set or active_edges != disabled_edges,
            'gstar_active_nodes': sorted(active_set),
            'gstar_disabled_nodes': sorted(disabled_set),
            'gstar_active_edges': sorted(active_edges),
            'gstar_disabled_edges': sorted(disabled_edges),
        })
    return result


def align_longitudinal(
    previous: dict[str, Iterable[str]],
    current: dict[str, Iterable[str]],
    threshold: float = 0.5,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    old = {cid: set(v) for cid, v in previous.items()}
    new = {cid: set(v) for cid, v in current.items()}

    overlaps_old: dict[str, list[tuple[str, float]]] = {cid: [] for cid in old}
    overlaps_new: dict[str, list[tuple[str, float]]] = {cid: [] for cid in new}

    for old_id, old_members in old.items():
        for new_id, new_members in new.items():
            union = old_members | new_members
            jaccard = len(old_members & new_members) / len(union) if union else 1.0
            if jaccard >= threshold:
                overlaps_old[old_id].append((new_id, jaccard))
                overlaps_new[new_id].append((old_id, jaccard))

    for old_id, matches in sorted(overlaps_old.items()):
        if len(matches) > 1:
            events.append({
                'type': 'split',
                'from': old_id,
                'to': [new_id for new_id, _ in sorted(matches)],
                'overlaps': {new_id: score for new_id, score in matches},
            })

    for new_id, matches in sorted(overlaps_new.items()):
        if len(matches) > 1:
            events.append({
                'type': 'merge',
                'from': [old_id for old_id, _ in sorted(matches)],
                'to': new_id,
                'overlaps': {old_id: score for old_id, score in matches},
            })

    matched_old: set[str] = set()
    matched_new: set[str] = set()
    for old_id, matches in overlaps_old.items():
        for new_id, jaccard in matches:
            if len(matches) == 1 and len(overlaps_new[new_id]) == 1:
                event_type = 'persistence' if old_id == new_id else 'alignment'
                events.append({'type': event_type, 'from': old_id, 'to': new_id, 'jaccard': jaccard})
                matched_old.add(old_id)
                matched_new.add(new_id)

    for cid in sorted(set(old) - matched_old):
        if not any(event.get('type') == 'split' and event.get('from') == cid for event in events):
            events.append({'type': 'extinction', 'from': cid, 'to': None})
    for cid in sorted(set(new) - matched_new):
        if not any(event.get('type') == 'merge' and event.get('to') == cid for event in events):
            events.append({'type': 'birth', 'from': None, 'to': cid})
    return events


@dataclass(frozen=True)
class ProspectiveSignal:
    name: str
    metric: str
    threshold: float
    horizon: str
    falsification: str
    null_model: str


def registry_signal(
    name: str,
    metric: str,
    threshold: float,
    horizon: str,
    falsification: str,
    null_model: str,
) -> ProspectiveSignal:
    if not name or not metric or not null_model or not falsification:
        raise ValueError('Un registro prospectivo requiere señal, métrica, modelo nulo y falsación')
    return ProspectiveSignal(name, metric, threshold, horizon, falsification, null_model)


def persist_registry_signal(
    signal: ProspectiveSignal,
    path: str = "data/epistwin/prospective-signals.jsonl",
    *,
    source_sha256: str | None = None,
    git_sha: str | None = None,
) -> str:
    """Persiste una señal prospectiva como registro append-only verificable."""
    if not isinstance(signal, ProspectiveSignal):
        raise TypeError("signal debe ser ProspectiveSignal")
    record = asdict(signal)
    record.update(
        {
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "source_sha256": source_sha256,
            "git_sha": git_sha,
            "status": "prospective",
        }
    )
    canonical = json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    record["record_sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n")
    return record["record_sha256"]


def run_multi_judge(cases: Iterable[dict[str, str]], judges: dict[str, Any]) -> dict[str, Any]:
    """Ejecuta un panel reproducible: cada juez debe razonar y después puntuar 1..5."""
    if len(judges) < 2:
        raise ValueError("UA-36 requiere al menos dos arquitecturas de juez")
    rows: list[dict[str, Any]] = []
    labels: dict[str, list[str]] = {name: [] for name in judges}
    for case in cases:
        required = {"q", "a_et", "a_target"}
        if not required.issubset(case):
            raise ValueError("Cada caso requiere q, a_et y a_target")
        row = {"id": case.get("id"), "judges": {}}
        for name, judge in judges.items():
            result = judge(case["q"], case["a_et"], case["a_target"])
            if not isinstance(result, dict) or not result.get("reasoning"):
                raise ValueError(f"Juez {name} debe devolver reasoning antes del score")
            score = int(result.get("likert", 0))
            ordinal = likert_to_ordinal(score)
            polarity = likert_to_polarity(score)
            labels[name].append(polarity)
            row["judges"][name] = {
                "reasoning": result["reasoning"],
                "likert": score,
                "ordinal": ordinal,
                "normalized": polarity,
            }
        rows.append(row)

    agreement: dict[str, float] = {}
    names = list(judges)
    for i, left in enumerate(names):
        for right in names[i + 1:]:
            agreement[f"{left}:{right}"] = gwet_ac1(labels[left], labels[right])
    return {"cases": rows, "judge_count": len(judges), "ac1_pairwise": agreement}


@dataclass(frozen=True)
class FacultySpec:
    name: str
    criteria: tuple[str, ...]


def validate_faculties(specs: Iterable[FacultySpec]) -> dict[str, Any]:
    required = {"SEA", "IAR", "RES"}
    normalized = list(specs)
    names = [spec.name for spec in normalized]
    missing = sorted(required - set(names))
    duplicates = sorted({name for name in names if names.count(name) > 1})
    empty = sorted(spec.name for spec in normalized if not spec.criteria)
    criteria_signatures = {
        name: tuple(sorted(criteria))
        for name, criteria in ((s.name, s.criteria) for s in normalized)
    }
    shared_criteria = len(set(criteria_signatures.values())) < len(criteria_signatures)
    return {
        "complete": not missing and not duplicates and not empty and not shared_criteria,
        "required": sorted(required),
        "present": sorted(set(names)),
        "missing": missing,
        "duplicates": duplicates,
        "empty_criteria": empty,
        "criteria_separated": not shared_criteria,
    }


@dataclass(frozen=True)
class InterpretationBoundary:
    algorithmic_guarantee: str
    autobiographical_meaning: str
    relation: str = "non-equivalent"


def interpretation_boundary(
    algorithmic_guarantee: str,
    autobiographical_meaning: str,
) -> InterpretationBoundary:
    if not algorithmic_guarantee or not autobiographical_meaning:
        raise ValueError("La frontera interpretativa requiere ambos planos")
    return InterpretationBoundary(
        algorithmic_guarantee=algorithmic_guarantee,
        autobiographical_meaning=autobiographical_meaning,
    )


def longitudinal_lineage_ids(
    previous: dict[str, Iterable[str]],
    current: dict[str, Iterable[str]],
    threshold: float = 0.5,
) -> dict[str, dict[str, Any]]:
    old = {cid: set(v) for cid, v in previous.items()}
    new = {cid: set(v) for cid, v in current.items()}
    overlaps: dict[str, list[tuple[str, float]]] = {cid: [] for cid in new}

    for new_id, new_members in new.items():
        for old_id, old_members in old.items():
            union = old_members | new_members
            score = len(old_members & new_members) / len(union) if union else 1.0
            if score >= threshold:
                overlaps[new_id].append((old_id, score))

    lineage: dict[str, dict[str, Any]] = {}
    for new_id, matches in sorted(overlaps.items()):
        if not matches:
            lineage[new_id] = {
                "stable_id": new_id,
                "event": "birth",
                "parents": [],
            }
            continue
        if len(matches) == 1:
            old_id, score = matches[0]
            reciprocal = [
                nid for nid, pairs in overlaps.items()
                if any(oid == old_id for oid, _ in pairs)
            ]
            if len(reciprocal) == 1:
                event = "persistence" if old_id == new_id else "alignment"
                stable_id = old_id
            else:
                event = "merge"
                stable_id = hashlib.sha256(
                    ("merge|" + "|".join(sorted([oid for oid, _ in matches])) + "|" + new_id).encode()
                ).hexdigest()[:20]
            lineage[new_id] = {
                "stable_id": stable_id,
                "event": event,
                "parents": [old_id],
                "overlap": score,
            }
            continue

        parent_ids = sorted(old_id for old_id, _ in matches)
        event = "merge"
        stable_id = hashlib.sha256(
            ("merge|" + "|".join(parent_ids) + "|" + new_id).encode()
        ).hexdigest()[:20]
        lineage[new_id] = {
            "stable_id": stable_id,
            "event": event,
            "parents": parent_ids,
            "overlap": max(score for _, score in matches),
        }

    for old_id, old_members in sorted(old.items()):
        children = []
        for new_id, new_members in new.items():
            union = old_members | new_members
            score = len(old_members & new_members) / len(union) if union else 1.0
            if score >= threshold:
                children.append(new_id)
        if len(children) > 1:
            for child in children:
                if child in lineage:
                    lineage[child] = {
                        **lineage[child],
                        "event": "split",
                        "parents": [old_id],
                        "stable_id": hashlib.sha256(
                            ("split|" + old_id + "|" + child).encode()
                        ).hexdigest()[:20],
                    }

    return lineage
