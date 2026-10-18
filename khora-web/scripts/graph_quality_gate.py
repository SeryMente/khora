#!/usr/bin/env python3
"""Read-only, fail-closed evidence gate. Not a semantic or human authority.

This is an audit EXPORT contract, not a new product ontology or graph engine.
Only standard-library dependencies. Never calls services or modifies a graph.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys

REVISION_FIELDS = ("code", "corpus", "knowledge", "owner", "plane", "policy")
KINDS = {"entity", "literal", "blank", "information_object", "unit", "community"}
MAX_FILE_BYTES = 20 * 1024 * 1024
PROFILE_PATH = Path(__file__).resolve().parents[1] / "docs/graph-quality-profile.json"
PROFILE_SHA256 = "22c38d65c4c3abfe477b87e498a7622e90632496df6e42b3771704072f540fe6"


class Invalid(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Invalid(message)


def unique_object(pairs):
    obj = {}
    for key, value in pairs:
        require(key not in obj, f"Duplicate JSON key: {key}")
        obj[key] = value
    return obj


def load_json(path):
    require(path.is_file(), f"Missing file: {path.name}")
    require(path.stat().st_size <= MAX_FILE_BYTES, "Evidence file exceeds size limit")
    raw = path.read_bytes()
    obj = json.loads(
        raw.decode("utf-8"),
        object_pairs_hook=unique_object,
        parse_constant=lambda value: (_ for _ in ()).throw(Invalid(f"Non-finite JSON: {value}")),
    )
    require(isinstance(obj, dict), "Top-level evidence must be an object")
    return obj, raw


def objects_by_id(items, label, nonempty=True):
    require(isinstance(items, list) and (items or not nonempty), f"{label}: empty/not a list")
    indexed = {}
    for item in items:
        require(isinstance(item, dict), f"{label}: item is not an object")
        key = item.get("id")
        require(isinstance(key, str) and key.strip(), f"{label}: missing ID")
        require(key not in indexed, f"{label}: duplicate ID {key}")
        indexed[key] = item
    return indexed


def string_set(items, label, nonempty=False):
    require(isinstance(items, list), f"{label}: not a list")
    require(all(isinstance(x, str) and x.strip() for x in items), f"{label}: invalid member")
    require(len(items) == len(set(items)), f"{label}: duplicate member")
    require(bool(items) or not nonempty, f"{label}: empty")
    return set(items)


def text(value, label):
    require(isinstance(value, str) and value.strip(), f"{label}: empty/non-text")
    return value


def passed(value, label):
    require(value == "pass" and isinstance(value, str), f"{label}: not an explicit pass")


def same_value(left, right):
    return json.dumps(left, sort_keys=True, allow_nan=False) == json.dumps(right, sort_keys=True, allow_nan=False)


def revision_valid(revision):
    require(isinstance(revision, dict), "Missing revision")
    for key in REVISION_FIELDS:
        text(revision.get(key), f"revision.{key}")
    require(re.fullmatch(r"[0-9a-f]{40}", revision["code"]), "Invalid Git commit")
    for key in ("corpus", "knowledge"):
        require(re.fullmatch(r"[0-9a-f]{64}", revision[key]), f"Invalid {key} digest")
    require(revision["plane"] in {"candidate", "curated"}, "Unknown epistemic plane")


def check_sources(doc):
    sources = objects_by_id(doc.get("items"), "sources")
    for source in sources.values():
        raw = text(source.get("text"), "source text").encode("utf-8")
        require(hashlib.sha256(raw).hexdigest() == source.get("sha256"), "Source hash mismatch")
        require(type(source.get("version")) is int and source["version"] > 0, "Invalid source version")
        require(source.get("authorized") is True, "Unauthorized source")
    selected = string_set(doc.get("selected_source_ids"), "selected sources", True)
    require(set(sources) == selected, "Selected source inventory does not reconcile")
    units = objects_by_id(doc.get("units"), "reference units")
    for unit in units.values():
        require(unit.get("source_id") in sources, "Unit references unknown source")
        require(unit.get("disposition") == "represented", "Unresolved/excluded unit in claimed scope")
        text(unit.get("annotation_ref"), "unit annotation reference")
    return sources, units


def check_anchors(anchors, sources):
    require(isinstance(anchors, list) and anchors, "Unanchored content")
    for anchor in anchors:
        require(isinstance(anchor, dict), "Invalid anchor")
        source = sources.get(anchor.get("source_id"))
        require(source is not None, "Anchor references unknown source")
        require(type(anchor.get("version")) is int and anchor["version"] == source["version"],
                "Anchor source version mismatch")
        start, end = anchor.get("start"), anchor.get("end")
        require(type(start) is int and type(end) is int, "Anchor offsets must be integers")
        raw = source["text"].encode("utf-16-le")
        require(0 <= start < end <= len(raw) // 2, "Anchor out of bounds")
        try:
            quote = raw[start * 2:end * 2].decode("utf-16-le")
        except UnicodeDecodeError as exc:
            raise Invalid("Anchor splits a UTF-16 surrogate pair") from exc
        require(quote == anchor.get("quote"), "Anchor quote mismatch")


def check_graph(doc, sources, units):
    nodes = objects_by_id(doc.get("nodes"), "nodes")
    edges = objects_by_id(doc.get("edges"), "edges", nonempty=False)
    for node in nodes.values():
        require(node.get("kind") in KINDS, "Unknown node kind")
        text(node.get("label"), "node label")
        if node["kind"] == "unit":
            text(node.get("content"), "meaning unit content")
            check_anchors(node.get("anchors"), sources)
    for edge in edges.values():
        require(edge.get("from") in nodes and edge.get("to") in nodes, "Dangling edge")
        require(nodes[edge["from"]]["kind"] != "literal", "Literal used as semantic head")
        require(edge.get("state") in {"candidate", "curated"}, "Unknown edge state")
        text(edge.get("predicate"), "edge predicate")
        for field in ("polarity", "modality", "attribution", "time_scope"):
            text(edge.get(field), f"edge {field}")
        require(edge["polarity"] in {"positive", "negative", "uncertain"}, "Unknown polarity")
        check_anchors(edge.get("anchors"), sources)
        if edge["state"] == "curated":
            judgment = edge.get("judgment", {})
            require(judgment.get("decision") == "accept", "Curated edge lacks acceptance")
            require(judgment.get("origin") == "human_authenticated", "Synthetic human judgment")
            text(judgment.get("actor"), "human actor")
            text(judgment.get("receipt"), "human receipt")
        if doc["revision"]["plane"] == "curated":
            require(edge["state"] == "curated", "Candidate edge leaked into curated export")
    mappings = doc.get("unit_coverage")
    require(isinstance(mappings, dict) and set(mappings) == set(units), "Unit coverage mismatch")
    for unit_id, mapping in mappings.items():
        ids = string_set(mapping.get("edge_ids"), "unit edges")
        node_ids = string_set(mapping.get("node_ids"), "unit nodes")
        require(ids or node_ids, "Unrepresented meaning unit")
        require(ids <= set(edges) and node_ids <= set(nodes), "Coverage references missing representation")
        require(all(nodes[nid]["kind"] == "unit" for nid in node_ids), "Labels do not replace meaning units")
        anchors = [a for eid in ids for a in edges[eid]["anchors"]]
        anchors += [a for nid in node_ids for a in nodes[nid]["anchors"]]
        require(any(a["source_id"] == units[unit_id]["source_id"] for a in anchors),
                "Unit coverage points to another source")
    return nodes, edges


def check_partition(doc, nodes, edges, sources):
    communities = objects_by_id(doc.get("communities"), "communities")
    domain = {key for key, node in nodes.items() if node["kind"] in {"entity", "blank", "unit"}}
    require(domain, "Empty community domain")
    seen = set()
    for community in communities.values():
        members = string_set(community.get("members"), "community members", True)
        require(members <= domain and not members & seen, "Invalid/overlapping partition")
        seen |= members
        text(community.get("label"), "community label")
        text(community.get("summary"), "community summary")
        supporting = string_set(community.get("supporting_edges"), "summary support")
        supporting_units = string_set(community.get("supporting_units", []), "summary units")
        require(supporting or supporting_units, "Summary has no evidence")
        require(supporting <= set(edges), "Summary cites missing edges")
        require(supporting_units <= members and
                all(nodes[nid]["kind"] == "unit" for nid in supporting_units), "Summary unit outside scope")
        for edge_id in supporting:
            edge = edges[edge_id]
            allowed = members | {key for key, node in nodes.items() if node["kind"] == "literal"}
            require(edge["from"] in members and edge["to"] in allowed,
                    "Summary support is outside the declared induced scope")
        scope = string_set(community.get("source_ids"), "summary source scope", True)
        actual = {a["source_id"] for eid in supporting for a in edges[eid]["anchors"]}
        actual |= {a["source_id"] for nid in supporting_units for a in nodes[nid]["anchors"]}
        require(scope == actual and scope <= set(sources), "Summary scope does not match evidence")
        # Connectivity is a structural necessary condition, not proof of semantic coherence.
        adjacency = {member: set() for member in members}
        for edge in edges.values():
            a, b = edge["from"], edge["to"]
            if a in members and b in members:
                adjacency[a].add(b)
                adjacency[b].add(a)
        reached, stack = set(), [next(iter(members))]
        while stack:
            member = stack.pop()
            if member not in reached:
                reached.add(member)
                stack.extend(adjacency[member] - reached)
        require(reached == members, "Disconnected community")
    require(seen == domain, "Community partition omits nodes")


def check_index(doc, nodes):
    for field in ("model", "provider", "normalization", "metric", "build_receipt"):
        text(doc.get(field), f"index {field}")
    require(doc.get("fallback_used") is False, "Unexplained/fallback index space")
    require(doc["normalization"] in {"unit_l2", "none"}, "Unknown normalization")
    require(doc["metric"] in {"cosine", "dot", "euclidean"}, "Unknown distance metric")
    dim = doc.get("dimensions")
    require(type(dim) is int and dim > 0, "Invalid index dimension")
    rows = objects_by_id(doc.get("rows"), "index rows")
    indexed = string_set(doc.get("expected_node_ids"), "index domain", True)
    require(set(rows) == indexed and indexed <= set(nodes), "Index domain mismatch")
    for row in rows.values():
        vector = row.get("vector")
        require(isinstance(vector, list) and len(vector) == dim, "Index vector dimension mismatch")
        require(all(type(v) in {int, float} and math.isfinite(v) for v in vector), "Invalid vector")
        require(any(vector), "Zero vector")
        if doc["normalization"] == "unit_l2":
            require(abs(sum(v * v for v in vector) - 1) <= 1e-6, "Non-unit vector")


def check_trace(doc, profile, revision):
    traces = objects_by_id(doc.get("runs"), "traces")
    for run in traces.values():
        stages = run.get("stages")
        require(isinstance(stages, list), "Missing stages")
        require([s.get("name") for s in stages] == profile["trace_stages"], "Broken E2E stage chain")
        correlation = text(run.get("correlation_id"), "correlation")
        for stage in stages:
            require(stage.get("revision") == revision, "Mixed service revision/owner/plane")
            require(stage.get("correlation_id") == correlation, "Broken trace correlation")
            passed(stage.get("status"), "trace stage")
            text(stage.get("receipt"), "persisted stage receipt")
        require(run.get("retrieval_status") in {"sufficient", "insufficient"}, "Unknown retrieval state")
        require(run.get("response_status") in {"sufficient", "insufficient"}, "Unknown response state")
        require(run.get("ui_status") == run["response_status"], "Visible sufficiency differs")
        if run["response_status"] == "sufficient":
            require(run["retrieval_status"] == "sufficient", "Response upgrades insufficiency")
            string_set(run.get("source_ids"), "response sources", True)
    return traces


def check_tasks(doc, profile, traces, units, sources):
    tasks = objects_by_id(doc.get("cases"), "tasks")
    require(set(tasks) == set(profile["required_tasks"]), "Missing/unregistered mandatory task")
    for task in tasks.values():
        passed(task.get("result"), "task")
        require(task.get("trace_id") in traces, "Task lacks actual trace")
        expected = string_set(task.get("expected_units"), "task expected")
        returned = string_set(task.get("returned_units"), "task returned")
        forbidden = string_set(task.get("forbidden_units"), "task forbidden")
        require(expected <= set(units) and returned <= set(units), "Unknown reference unit")
        require(expected <= returned and not forbidden & returned, "Omitted or forbidden meaning unit")
        require(task.get("reference_complete") is True, "Task reference not complete for claimed scope")
        text(task.get("adjudication_ref"), "task adjudication")
        text(task.get("question"), "task question")
        require(type(task.get("answerable")) is bool, "Unknown answerability")
        run = traces[task["trace_id"]]
        require(set(run.get("source_ids", [])) <= set(sources), "Trace cites unknown source")
        expected_status = "sufficient" if task["answerable"] else "insufficient"
        require(run["response_status"] == expected_status, "Wrong abstention/false abstention")
        if task["answerable"]:
            require(expected, "Vacuous answerable task")
        if task["id"] == "ANSWER_ABSTAIN":
            require(task["answerable"] is False, "Abstention case must be unanswerable")
    return tasks


def check_cases(doc, expected, label, traces=None):
    cases = objects_by_id(doc.get("cases"), label)
    require(set(cases) == set(expected), f"{label}: missing/extra cases")
    for case in cases.values():
        passed(case.get("result"), label)
        require(case.get("skipped") is False, f"{label}: skipped/xfail")
        text(case.get("oracle_ref"), f"{label}: oracle")
        require(same_value(case.get("expected"), case.get("observed"))
                and case.get("expected") not in (None, "", [], {}),
                f"{label}: expected/observed mismatch")
        if traces is not None:
            require(case.get("trace_id") in traces, f"{label}: missing trace")
            observed = case["observed"]
            require(isinstance(observed, dict), "Operation needs structured observations")
            required = {
                "nonempty_ledger_replay": {"accepted_preserved": True, "rejected_preserved": True,
                                           "revoked_preserved": True, "orphan_conflicts": 0},
                "post_commit_recovery": {"generation_complete": True, "duplicate_writes": 0},
                "concurrent_publish": {"active_pointers": 1, "mixed_revision": False},
                "source_change_invalidation": {"stale_outputs_served": 0, "revision_changed": True},
                "identity_revocation": {"stale_outputs_served": 0, "split_preserved": True},
                "owner_isolation": {"cross_owner_disclosures": 0, "unauthorized_writes": 0},
                "delete_retention_scope": {"unauthorized_residue": 0, "policy_checked": True},
            }[case["id"]]
            for key, value in required.items():
                require(key in observed and same_value(observed[key], value), f"Operation invariant: {key}")
            if case["id"] == "nonempty_ledger_replay":
                for key in ("accepted_count", "rejected_count", "revoked_count"):
                    require(type(observed.get(key)) is int and observed[key] > 0, "Empty ledger replay class")


def check_review(doc, tasks, origin):
    text(doc.get("reviewer"), "independent reviewer")
    text(doc.get("constructor"), "constructor")
    require(doc["reviewer"] != doc["constructor"], "Constructor cannot be sole adjudicator")
    require(doc.get("independent") is True, "No independent semantic review")
    require(doc.get("semantic_decision") == "accept", "Semantic review pending/rejected")
    require(doc.get("operator_decision") == "accept", "Operator recognition/use review pending")
    text(doc.get("operator_receipt"), "operator review receipt")
    require(doc.get("reviewed_task_ids") == sorted(tasks), "Not all tasks reviewed")
    require(doc.get("scope") == "finite_pilot_only", "No general production accreditation")
    require(doc.get("origin") == origin, "Mixed review provenance")
    text(doc.get("limitations"), "review limitations")


def evaluate(bundle_path, expected):
    results = []
    artifacts, profile, bundle = {}, {}, {}

    def run(gate, fn):
        try:
            value = fn()
            results.append({"id": gate, "status": "PASS", "detail": "checks satisfied in supplied evidence"})
            return value
        except (Invalid, KeyError, TypeError, ValueError, OSError, OverflowError, AttributeError, IndexError) as exc:
            results.append({"id": gate, "status": "BLOCK", "detail": str(exc)})
            return None

    def integrity():
        nonlocal bundle, profile
        profile, raw_profile = load_json(PROFILE_PATH)
        require(hashlib.sha256(raw_profile).hexdigest() == PROFILE_SHA256, "Gate profile was changed")
        bundle, _ = load_json(Path(bundle_path))
        require(bundle.get("schema") == "khora.graph-evidence/1", "Unknown evidence schema")
        revision = bundle.get("revision")
        revision_valid(revision)
        require(set(expected) == set(REVISION_FIELDS), "Caller must pin all six context fields")
        require(revision == expected, "Evidence does not match independently supplied target")
        require(bundle.get("origin") in {"real_services", "synthetic"}, "Unknown evidence origin")
        references = bundle.get("artifacts")
        require(isinstance(references, dict) and set(references) == set(profile["required_artifacts"]),
                "Missing/extra required artifacts")
        root = Path(bundle_path).resolve().parent
        for name, ref in references.items():
            relative = Path(text(ref.get("path"), "artifact path"))
            require(not relative.is_absolute(), "Absolute evidence path prohibited")
            path = (root / relative).resolve()
            require(path.is_relative_to(root), "Evidence path escapes package")
            obj, raw = load_json(path)
            require(hashlib.sha256(raw).hexdigest() == ref.get("sha256"), f"Artifact hash mismatch: {name}")
            require(obj.get("revision") == revision, f"Artifact revision mismatch: {name}")
            require(obj.get("origin") == bundle["origin"], f"Mixed synthetic/real evidence: {name}")
            artifacts[name] = obj
        return revision

    revision = run("P01", integrity)
    if revision is not None:
        source_result = run("P02", lambda: check_sources(artifacts["sources"]))
        graph_result = run("P03", lambda: check_graph(artifacts["graph"], *source_result)
                           if source_result else require(False, "P02 blocked"))
        run("P04", lambda: check_partition(artifacts["partition"], *graph_result, source_result[0])
            if graph_result else require(False, "P03 blocked"))
        run("P05", lambda: check_index(artifacts["index"], graph_result[0])
            if graph_result else require(False, "P03 blocked"))
        traces = run("P06", lambda: check_trace(artifacts["trace"], profile, revision))
        tasks = run("P07", lambda: check_tasks(artifacts["tasks"], profile, traces, source_result[1], source_result[0])
                    if traces and source_result else require(False, "P02/P06 blocked"))
        run("P08", lambda: check_cases(artifacts["regressions"], profile["required_regressions"], "regressions"))
        run("P09", lambda: check_cases(artifacts["operations"], profile["required_operations"], "operations", traces)
            if traces else require(False, "P06 blocked"))
        run("P10", lambda: check_review(artifacts["review"], tasks, bundle["origin"])
            if tasks else require(False, "P07 blocked"))
        run("P11", lambda: require(
            bundle.get("open_critical_findings") == [] and bundle.get("open_major_findings") == [],
            "Unresolved critical/major findings or missing finding inventory"))
    blocked = any(result["status"] == "BLOCK" for result in results)
    verdict = ("BLOCKED" if blocked else "SYNTHETIC_ONLY" if bundle["origin"] == "synthetic"
               else "EVIDENCE_CHECKS_PASSED_REQUIRES_AUTHORITY_VERIFICATION")
    return {
        "schema": "khora.graph-gate-result/1", "profile": "1.2", "verdict": verdict,
        "product_certified": False, "production_authorized": False,
        "checks": results,
        "limits": [
            "Checks supplied artifacts, not live services or the whole source corpus.",
            "Exact anchors and matched unit IDs do not prove semantic fidelity or complete reference annotation.",
            "Receipt strings are not authenticated by this offline tool; verify them at their authoritative systems.",
            "Passing this gate never ratifies the operator, approves architecture/UI, or proves future error absence.",
            "No runtime adapter, CI enforcement, deployment gate or production repair is installed by this script.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", required=True, type=Path)
    for field in REVISION_FIELDS:
        parser.add_argument("--" + field, required=True)
    args = parser.parse_args()
    report = evaluate(args.evidence, {field: getattr(args, field) for field in REVISION_FIELDS})
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["verdict"] == "EVIDENCE_CHECKS_PASSED_REQUIRES_AUTHORITY_VERIFICATION" else 2


if __name__ == "__main__":
    sys.exit(main())