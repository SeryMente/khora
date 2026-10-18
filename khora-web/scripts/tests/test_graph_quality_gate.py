"""Synthetic tests of the OFFLINE GATE, never tests accrediting Khora."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "graph_quality_gate.py"
spec = importlib.util.spec_from_file_location("graph_quality_gate", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
PROFILE = json.loads(gate.PROFILE_PATH.read_text())
REV = {"code": "a" * 40, "corpus": "b" * 64, "knowledge": "c" * 64,
       "owner": "synthetic-owner", "plane": "candidate", "policy": "synthetic-policy"}


def fixture():
    source_text = "Ana conserva una idea rara. 🙂 Otra Ana discrepa."
    source = {"id": "s1", "text": source_text, "version": 1, "authorized": True,
              "sha256": hashlib.sha256(source_text.encode()).hexdigest()}
    nodes = [{"id": "a", "kind": "entity", "label": "Ana"},
             {"id": "b", "kind": "entity", "label": "idea rara"}]
    edge = {"id": "e1", "from": "a", "to": "b", "predicate": "conserva",
            "polarity": "positive", "modality": "asserted", "attribution": "speaker",
            "time_scope": "unspecified", "state": "candidate",
            "anchors": [{"source_id": "s1", "version": 1, "start": 0, "end": 27,
                         "quote": "Ana conserva una idea rara."}]}
    stages = [{"name": name, "status": "pass", "revision": copy.deepcopy(REV),
               "correlation_id": "synthetic-correlation", "receipt": "SYNTHETIC-NOT-A-REAL-RECEIPT"}
              for name in PROFILE["trace_stages"]]
    positive = {"id": "t1", "correlation_id": "synthetic-correlation", "stages": stages,
                "retrieval_status": "sufficient", "response_status": "sufficient",
                "ui_status": "sufficient", "source_ids": ["s1"]}
    negative = copy.deepcopy(positive)
    negative.update(id="t2", retrieval_status="insufficient", response_status="insufficient",
                    ui_status="insufficient", source_ids=[])
    tasks = [{"id": key, "result": "pass", "trace_id": "t2" if key == "ANSWER_ABSTAIN" else "t1",
              "question": "Synthetic question, not a real cognitive benchmark",
              "expected_units": [] if key == "ANSWER_ABSTAIN" else ["u1"],
              "returned_units": [] if key == "ANSWER_ABSTAIN" else ["u1"],
              "forbidden_units": [], "reference_complete": True,
              "answerable": key != "ANSWER_ABSTAIN", "adjudication_ref": "SYNTHETIC"}
             for key in PROFILE["required_tasks"]]
    observations = {
        "nonempty_ledger_replay": {"accepted_preserved": True, "rejected_preserved": True,
                                  "revoked_preserved": True, "orphan_conflicts": 0,
                                  "accepted_count": 1, "rejected_count": 1, "revoked_count": 1},
        "post_commit_recovery": {"generation_complete": True, "duplicate_writes": 0},
        "concurrent_publish": {"active_pointers": 1, "mixed_revision": False},
        "source_change_invalidation": {"stale_outputs_served": 0, "revision_changed": True},
        "identity_revocation": {"stale_outputs_served": 0, "split_preserved": True},
        "owner_isolation": {"cross_owner_disclosures": 0, "unauthorized_writes": 0},
        "delete_retention_scope": {"unauthorized_residue": 0, "policy_checked": True},
    }
    artifacts = {
        "sources": {"items": [source], "selected_source_ids": ["s1"],
                    "units": [{"id": "u1", "source_id": "s1", "disposition": "represented",
                               "annotation_ref": "SYNTHETIC"}]},
        "graph": {"nodes": nodes, "edges": [edge],
                  "unit_coverage": {"u1": {"edge_ids": ["e1"], "node_ids": []}}},
        "partition": {"communities": [{"id": "c1", "members": ["a", "b"], "label": "idea",
                                      "summary": "Ana conserva una idea.", "supporting_edges": ["e1"],
                                      "source_ids": ["s1"]}]},
        "index": {"model": "synthetic-model", "provider": "synthetic", "normalization": "unit_l2",
                  "metric": "cosine", "build_receipt": "SYNTHETIC", "fallback_used": False,
                  "dimensions": 2, "expected_node_ids": ["a"],
                  "rows": [{"id": "a", "vector": [1, 0]}]},
        "trace": {"runs": [positive, negative]},
        "tasks": {"cases": tasks},
        "regressions": {"cases": [{"id": key, "result": "pass", "skipped": False,
                                   "expected": {"contained": True}, "observed": {"contained": True},
                                   "oracle_ref": "SYNTHETIC"} for key in PROFILE["required_regressions"]]},
        "operations": {"cases": [{"id": key, "result": "pass", "skipped": False,
                                  "expected": copy.deepcopy(observations[key]),
                                  "observed": copy.deepcopy(observations[key]),
                                  "oracle_ref": "SYNTHETIC", "trace_id": "t1"}
                                 for key in PROFILE["required_operations"]]},
        "review": {"reviewer": "synthetic-reviewer", "constructor": "synthetic-constructor",
                   "independent": True, "semantic_decision": "accept", "operator_decision": "accept",
                   "operator_receipt": "SYNTHETIC", "reviewed_task_ids": sorted(t["id"] for t in tasks),
                   "scope": "finite_pilot_only", "limitations": "Synthetic tooling test only"},
    }
    for obj in artifacts.values():
        obj.update(revision=copy.deepcopy(REV), origin="synthetic")
    bundle = {"schema": "khora.graph-evidence/1", "origin": "synthetic",
              "revision": copy.deepcopy(REV), "open_critical_findings": [], "open_major_findings": []}
    return bundle, artifacts


class GateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bundle, self.artifacts = fixture()

    def write(self):
        refs = {}
        for name, obj in self.artifacts.items():
            raw = json.dumps(obj, ensure_ascii=False).encode()
            path = self.root / (name + ".json")
            path.write_bytes(raw)
            refs[name] = {"path": path.name, "sha256": hashlib.sha256(raw).hexdigest()}
        self.bundle["artifacts"] = refs
        self.path = self.root / "bundle.json"
        self.save_bundle()
        return self.path

    def save_bundle(self):
        self.path.write_text(json.dumps(self.bundle))

    def evaluate(self):
        return gate.evaluate(self.write(), REV)

    def blocked(self, gate_id):
        result = self.evaluate()
        self.assertEqual(result["verdict"], "BLOCKED")
        self.assertEqual(next(x["status"] for x in result["checks"] if x["id"] == gate_id), "BLOCK")
        self.assertFalse(result["product_certified"])

    def test_synthetic_complete_never_certifies_product(self):
        report = self.evaluate()
        self.assertEqual(report["verdict"], "SYNTHETIC_ONLY")
        self.assertTrue(all(c["status"] == "PASS" for c in report["checks"]), report)
        self.assertFalse(report["product_certified"])
        self.assertFalse(report["production_authorized"])

    def test_absent_bundle_blocks(self):
        self.assertEqual(gate.evaluate(self.root / "absent.json", REV)["verdict"], "BLOCKED")

    def test_revision_mismatch(self):
        self.bundle["revision"]["knowledge"] = "d" * 64
        self.blocked("P01")

    def test_artifact_revision_mismatch(self):
        self.artifacts["index"]["revision"]["knowledge"] = "d" * 64
        self.blocked("P01")

    def test_mixed_synthetic_real(self):
        self.artifacts["trace"]["origin"] = "real_services"
        self.blocked("P01")

    def test_removed_artifact(self):
        del self.artifacts["review"]
        self.blocked("P01")

    def test_hash_tampering(self):
        self.write()
        (self.root / "graph.json").write_text("{}")
        self.assertEqual(gate.evaluate(self.path, REV)["checks"][0]["status"], "BLOCK")

    def test_path_escape(self):
        self.write()
        self.bundle["artifacts"]["graph"]["path"] = "../private.json"
        self.save_bundle()
        self.assertEqual(gate.evaluate(self.path, REV)["checks"][0]["status"], "BLOCK")

    def test_duplicate_json_key(self):
        self.path = self.root / "bundle.json"
        self.path.write_text('{"schema":1,"schema":2}')
        self.assertEqual(gate.evaluate(self.path, REV)["verdict"], "BLOCKED")

    def test_nonfinite_json(self):
        self.path = self.root / "bundle.json"
        self.path.write_text('{"number":NaN}')
        self.assertEqual(gate.evaluate(self.path, REV)["verdict"], "BLOCKED")

    def test_changed_profile(self):
        previous = gate.PROFILE_SHA256
        try:
            gate.PROFILE_SHA256 = "0" * 64
            self.blocked("P01")
        finally:
            gate.PROFILE_SHA256 = previous

    def test_empty_sources(self):
        self.artifacts["sources"]["items"] = []
        self.blocked("P02")

    def test_source_hash(self):
        self.artifacts["sources"]["items"][0]["text"] += " altered"
        self.blocked("P02")

    def test_unauthorized_source(self):
        self.artifacts["sources"]["items"][0]["authorized"] = False
        self.blocked("P02")

    def test_missing_source_from_selection(self):
        self.artifacts["sources"]["selected_source_ids"].append("missing")
        self.blocked("P02")

    def test_quarantine_not_coverage(self):
        self.artifacts["sources"]["units"][0]["disposition"] = "pending"
        self.blocked("P02")

    def test_duplicate_node(self):
        self.artifacts["graph"]["nodes"].append(copy.deepcopy(self.artifacts["graph"]["nodes"][0]))
        self.blocked("P03")

    def test_dangling_edge(self):
        self.artifacts["graph"]["edges"][0]["to"] = "missing"
        self.blocked("P03")

    def test_literal_head(self):
        self.artifacts["graph"]["nodes"][0]["kind"] = "literal"
        self.blocked("P03")

    def test_anchor_quote(self):
        self.artifacts["graph"]["edges"][0]["anchors"][0]["quote"] = "invented"
        self.blocked("P03")

    def test_anchor_boolean_offset(self):
        self.artifacts["graph"]["edges"][0]["anchors"][0]["start"] = False
        self.blocked("P03")

    def test_anchor_surrogate_split(self):
        self.artifacts["graph"]["edges"][0]["anchors"][0].update(start=28, end=29, quote="🙂")
        self.blocked("P03")

    def test_utf16_whole_surrogate_is_valid(self):
        self.artifacts["graph"]["edges"][0]["anchors"][0].update(start=28, end=30, quote="🙂")
        self.assertEqual(self.evaluate()["verdict"], "SYNTHETIC_ONLY")

    def test_source_version_drift(self):
        self.artifacts["graph"]["edges"][0]["anchors"][0]["version"] = 2
        self.blocked("P03")

    def test_fabricated_judgment(self):
        self.artifacts["graph"]["edges"][0].update(
            state="curated", judgment={"decision": "accept", "origin": "compatibility", "actor": "operador"})
        self.blocked("P03")

    def test_candidate_in_curated_plane(self):
        for obj in [self.bundle, *self.artifacts.values()]:
            obj["revision"]["plane"] = "curated"
        original = REV["plane"]
        try:
            REV["plane"] = "curated"
            for trace in self.artifacts["trace"]["runs"]:
                for stage in trace["stages"]:
                    stage["revision"]["plane"] = "curated"
            self.blocked("P03")
        finally:
            REV["plane"] = original

    def test_empty_coverage(self):
        self.artifacts["graph"]["unit_coverage"]["u1"] = {"edge_ids": [], "node_ids": []}
        self.blocked("P03")

    def test_rare_idea_without_triples_is_preserved(self):
        graph = self.artifacts["graph"]
        anchor = copy.deepcopy(graph["edges"][0]["anchors"])
        graph["nodes"] = [{"id": "idea", "kind": "unit", "label": "idea rara",
                           "content": "Ana conserva una idea rara.", "anchors": anchor}]
        graph["edges"] = []
        graph["unit_coverage"] = {"u1": {"edge_ids": [], "node_ids": ["idea"]}}
        self.artifacts["partition"]["communities"] = [
            {"id": "c1", "members": ["idea"], "label": "idea rara", "summary": "Idea conservada.",
             "supporting_edges": [], "supporting_units": ["idea"], "source_ids": ["s1"]}]
        self.artifacts["index"]["expected_node_ids"] = ["idea"]
        self.artifacts["index"]["rows"] = [{"id": "idea", "vector": [1, 0]}]
        self.assertEqual(self.evaluate()["verdict"], "SYNTHETIC_ONLY")

    def test_entity_label_does_not_replace_idea_content(self):
        self.artifacts["graph"]["unit_coverage"]["u1"] = {"edge_ids": [], "node_ids": ["a"]}
        self.blocked("P03")

    def test_anchor_version_boolean_is_not_version_one(self):
        self.artifacts["graph"]["edges"][0]["anchors"][0]["version"] = True
        self.blocked("P03")

    def test_partition_omission(self):
        self.artifacts["partition"]["communities"][0]["members"] = ["a"]
        self.blocked("P04")

    def test_partition_overlap(self):
        self.artifacts["partition"]["communities"].append(
            {**self.artifacts["partition"]["communities"][0], "id": "c2"})
        self.blocked("P04")

    def test_disconnected_community(self):
        self.artifacts["graph"]["nodes"].append({"id": "z", "kind": "entity", "label": "isolated"})
        self.artifacts["partition"]["communities"][0]["members"].append("z")
        self.blocked("P04")

    def test_summary_missing_evidence(self):
        self.artifacts["partition"]["communities"][0]["supporting_edges"] = []
        self.blocked("P04")

    def test_summary_cross_scope(self):
        self.artifacts["partition"]["communities"][0]["source_ids"].append("secret-source")
        self.blocked("P04")

    def test_index_dimension(self):
        self.artifacts["index"]["dimensions"] = 3
        self.blocked("P05")

    def test_index_fallback(self):
        self.artifacts["index"]["fallback_used"] = True
        self.blocked("P05")

    def test_index_boolean_vector(self):
        self.artifacts["index"]["rows"][0]["vector"] = [True, 0]
        self.blocked("P05")

    def test_index_domain(self):
        self.artifacts["index"]["expected_node_ids"].append("b")
        self.blocked("P05")

    def test_ui_false_success(self):
        self.artifacts["trace"]["runs"][1]["ui_status"] = "sufficient"
        self.blocked("P06")

    def test_boolean_sufficiency(self):
        self.artifacts["trace"]["runs"][0]["response_status"] = True
        self.blocked("P06")

    def test_stage_skip(self):
        self.artifacts["trace"]["runs"][0]["stages"].pop(4)
        self.blocked("P06")

    def test_stage_wrong_revision(self):
        self.artifacts["trace"]["runs"][0]["stages"][3]["revision"]["code"] = "d" * 40
        self.blocked("P06")

    def test_stage_bad_shape(self):
        self.artifacts["trace"]["runs"][0]["stages"][3] = "pass"
        self.blocked("P06")

    def test_missing_task(self):
        self.artifacts["tasks"]["cases"].pop()
        self.blocked("P07")

    def test_all_abstain_is_not_useful(self):
        for trace in self.artifacts["trace"]["runs"]:
            trace.update(retrieval_status="insufficient", response_status="insufficient", ui_status="insufficient")
        self.blocked("P07")

    def test_meaning_omission(self):
        self.artifacts["tasks"]["cases"][0]["returned_units"] = []
        self.blocked("P07")

    def test_forbidden_unit(self):
        self.artifacts["tasks"]["cases"][0]["forbidden_units"] = ["u1"]
        self.blocked("P07")

    def test_incomplete_reference(self):
        self.artifacts["tasks"]["cases"][0]["reference_complete"] = False
        self.blocked("P07")

    def test_unknown_trace_source(self):
        self.artifacts["trace"]["runs"][0]["source_ids"] = ["unknown"]
        self.blocked("P07")

    def test_missing_regression(self):
        self.artifacts["regressions"]["cases"].pop()
        self.blocked("P08")

    def test_skipped_regression(self):
        self.artifacts["regressions"]["cases"][0]["skipped"] = True
        self.blocked("P08")

    def test_boolean_green(self):
        self.artifacts["regressions"]["cases"][0]["result"] = True
        self.blocked("P08")

    def test_observation_type_confusion(self):
        self.artifacts["regressions"]["cases"][0].update(expected={"x": True}, observed={"x": 1})
        self.blocked("P08")

    def test_empty_replay(self):
        case = self.artifacts["operations"]["cases"][0]
        for key in ("observed", "expected"):
            case[key]["accepted_count"] = 0
        self.blocked("P09")

    def test_recovery_duplicate(self):
        case = self.artifacts["operations"]["cases"][1]
        for key in ("observed", "expected"):
            case[key]["duplicate_writes"] = 1
        self.blocked("P09")

    def test_missing_independent_review(self):
        self.artifacts["review"]["reviewer"] = self.artifacts["review"]["constructor"]
        self.blocked("P10")

    def test_pending_operator(self):
        self.artifacts["review"]["operator_decision"] = "pending"
        self.blocked("P10")

    def test_unreviewed_task(self):
        self.artifacts["review"]["reviewed_task_ids"].pop()
        self.blocked("P10")

    def test_generalization_forbidden(self):
        self.artifacts["review"]["scope"] = "general_production"
        self.blocked("P10")

    def test_known_critical_finding(self):
        self.bundle["open_critical_findings"] = ["H03"]
        self.blocked("P11")

    def test_known_major_finding(self):
        self.bundle["open_major_findings"] = ["H12"]
        self.blocked("P11")

    def test_missing_findings_inventory(self):
        del self.bundle["open_major_findings"]
        self.blocked("P11")

    def test_cli_synthetic_exit_nonzero(self):
        path = self.write()
        command = [sys.executable, str(SCRIPT), "--evidence", str(path)]
        for key, value in REV.items():
            command.extend(["--" + key, value])
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(json.loads(result.stdout)["verdict"], "SYNTHETIC_ONLY")

    def test_mechanical_anchor_does_not_claim_semantic_truth(self):
        self.artifacts["graph"]["edges"][0]["predicate"] = "invented semantic predicate"
        result = self.evaluate()
        self.assertEqual(next(c["status"] for c in result["checks"] if c["id"] == "P03"), "PASS")
        self.assertFalse(result["product_certified"])
        self.assertEqual(result["verdict"], "SYNTHETIC_ONLY")

    def test_origin_labels_and_receipts_are_not_authenticated_here(self):
        # Deliberately forged declarations: even a structurally consistent dossier
        # MUST NOT yield product certification. External authority is indispensable.
        self.bundle["origin"] = "real_services"
        for artifact in self.artifacts.values():
            artifact["origin"] = "real_services"
        result = self.evaluate()
        self.assertEqual(result["verdict"], "EVIDENCE_CHECKS_PASSED_REQUIRES_AUTHORITY_VERIFICATION")
        self.assertFalse(result["product_certified"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()