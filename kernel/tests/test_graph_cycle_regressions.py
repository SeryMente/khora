"""Controlled regression/integration tests, NOT real-service E2E accreditation."""
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from khora_kernel.api import (
    ContextoDeVisibilidad, EntidadIngresada, NivelSuficiencia, NodoSubgrafo,
    Provenance, ResultadoDeConsulta, SubgrafoRelevante,
)
from khora_kernel.engine import core
from khora_kernel.engine.history import Ht, HtEvidence, load_ht, save_ht
from khora_kernel.epistwin_audit import (
    compare_community_ab, membership_stability, membership_stability_report,
)


class Provider:
    """Explicit deterministic adapter; real policy/refine/generator/fVAL functions run."""
    def __init__(self, actions=("REFINE", "RETRIEVE", "ANSWER"), refined="CONSULTA REFINADA",
                 verdict="Sufficient"):
        self.actions = iter(actions)
        self.refined = refined
        self.verdict = verdict
        self.requests = []

    def generar(self, request):
        self.requests.append(request)
        role = request.metadata["role"]
        if role == "pi_theta":
            value = json.dumps({"accion": next(self.actions, "STOP"), "justificacion": "fixture"})
        elif role == "refine":
            value = self.refined
        elif role == "P_phi_generator":
            value = "La idea conserva su condición [fixture-node]."
        elif role == "fVAL":
            value = json.dumps({"vt": self.verdict, "deficit_type": "TEXTUAL", "reason": "fixture judgment"})
        else:
            raise AssertionError(f"Unexpected role: {role}")
        return SimpleNamespace(texto=value)


class CycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = str(Path(self.temp.name) / "history.db")
        self.captured = []
        captured = self.captured
        class Retriever:
            def __init__(self, memory):
                pass
            def consultar(self, question, context):
                captured.append(question)
                return ResultadoDeConsulta(
                    [EntidadIngresada("fixture-node", "Idea con condición.",
                                      Provenance("fixture", None, "2026-10-18T00:00:00Z"),
                                      ContextoDeVisibilidad.PRIVADO)],
                    SubgrafoRelevante([NodoSubgrafo("fixture-node", "idea")]),
                    NivelSuficiencia.SUFICIENTE, False,
                )
        self.retriever = patch.object(core, "RetrieverGraphRAG", Retriever)
        self.retriever.start()
        self.addCleanup(self.retriever.stop)
        self.env = patch.dict(os.environ, {"RAZ_MAX_PASOS": "6", "KHORA_FVAL_MODE": "mark"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def execute(self, provider, session="fixture"):
        return core.ejecutar_ciclo(session, "PREGUNTA ORIGINAL", provider, object(), self.db)

    def test_real_cycle_refine_retrieve_generate_validate_and_persist(self):
        provider = Provider()
        result = self.execute(provider)
        self.assertEqual(self.captured, ["CONSULTA REFINADA"])
        self.assertEqual(result.verdict, "SUFFICIENT")
        self.assertEqual(result.citations, ["fixture-node"])
        ht = load_ht("fixture", self.db)
        self.assertTrue(ht.evidence)
        self.assertTrue(any(t.get("refined_query") == "CONSULTA REFINADA" for t in ht.trace))
        retrieval = next(t for t in ht.trace if t["action"] == "RETRIEVE")
        self.assertEqual(retrieval["retrieval_query"], "CONSULTA REFINADA")
        roles = [r.metadata["role"] for r in provider.requests]
        self.assertEqual(roles, ["pi_theta", "refine", "pi_theta", "pi_theta", "P_phi_generator", "fVAL"])
        answer_request = next(r for r in provider.requests if r.metadata["role"] == "P_phi_generator")
        self.assertIn("PREGUNTA ORIGINAL", answer_request.prompt)
        self.assertIn("Idea con condición.", answer_request.prompt)
        self.assertEqual(ht.verdicts[-1]["vt"], "Sufficient")

    def test_second_refinement_replaces_retrieval_query(self):
        provider = Provider(actions=("REFINE", "REFINE", "RETRIEVE", "STOP"))
        values = iter(["primera", "segunda"])
        original = provider.generar
        def generate(request):
            if request.metadata["role"] == "refine":
                return SimpleNamespace(texto=next(values))
            return original(request)
        provider.generar = generate
        self.execute(provider)
        self.assertEqual(self.captured, ["segunda"])

    def test_empty_refinement_stops_without_using_original(self):
        result = self.execute(Provider(refined="  "))
        self.assertEqual(result.verdict, "INSUFFICIENT")
        self.assertEqual(self.captured, [])
        self.assertIn("REFINE falló", result.reason)
        self.assertIsNotNone(load_ht("fixture", self.db))

    def test_new_question_does_not_reuse_previous_refined_query(self):
        self.execute(Provider())
        self.execute(Provider(actions=("RETRIEVE", "STOP")))
        self.assertEqual(self.captured, ["CONSULTA REFINADA", "PREGUNTA ORIGINAL"])

    def visual(self, verdict):
        save_ht(Ht("visual", "2026-10-18T00:00:00Z",
                   evidence=[HtEvidence("fallback_vqa", "synthetic image evidence", 1)]), self.db)
        provider = Provider(actions=("RETRIEVE", "ANSWER", "STOP"), verdict=verdict)
        result = self.execute(provider, "visual")
        self.assertTrue(any(r.metadata["role"] == "fVAL" for r in provider.requests))
        return result

    def test_mark_mode_visual_cannot_skip_global_fval(self):
        self.assertEqual(self.visual("Insufficient").verdict, "INSUFFICIENT")

    def test_visual_can_pass_only_after_explicit_global_judgment(self):
        self.assertEqual(self.visual("Sufficient").verdict, "SUFFICIENT")

    def test_invalid_visual_judgment_is_not_success(self):
        self.assertEqual(self.visual("UNKNOWN").verdict, "INSUFFICIENT")

    def test_retrieval_error_cannot_become_success(self):
        with patch.object(core, "RetrieverGraphRAG", side_effect=RuntimeError("controlled outage")):
            result = self.execute(Provider(actions=("RETRIEVE", "ANSWER")))
        self.assertEqual(result.verdict, "INSUFFICIENT")
        self.assertIn("RETRIEVE falló", result.reason)


class PartitionTests(unittest.TestCase):
    def test_label_permutation_has_maximum_stability(self):
        self.assertEqual(membership_stability([
            {"red": ["a", "b"], "blue": ["c"]},
            {"other": ["c"], "renamed": ["b", "a"]},
        ]), 1)

    def test_disjoint_universe_not_comparable(self):
        self.assertIsNone(membership_stability([{"a": ["x", "y"]}, {"b": ["q", "r"]}]))

    def test_partially_changed_universe_not_comparable(self):
        report = membership_stability_report([{"a": ["x", "y"]}, {"a": ["x", "z"]}])
        self.assertFalse(report["comparable"])
        self.assertIsNone(report["value"])

    def test_no_partition_or_single_partition_not_measured(self):
        self.assertIsNone(membership_stability([]))
        self.assertIsNone(membership_stability([{"a": ["x", "y"]}]))

    def test_singleton_universe_has_no_pairs(self):
        self.assertIsNone(membership_stability([{"a": ["x"]}, {"b": ["x"]}]))

    def test_real_regrouping_changes_pair_agreement(self):
        self.assertLess(membership_stability([
            {"a": ["x", "y"], "b": ["z"]}, {"a": ["x"], "b": ["y", "z"]},
        ]), 1)

    def test_label_renaming_is_not_ab_change(self):
        report = compare_community_ab(None, {"a": ["x", "y"], "b": ["z"]},
                                      {"new": ["z"], "other": ["y", "x"]})
        self.assertFalse(report["changed"])
        self.assertEqual(report["changed_nodes"], [])
        self.assertEqual(report["active_signature"], report["disabled_signature"])

    def test_ab_reports_all_changed_neighborhoods(self):
        report = compare_community_ab(None, {"a": ["x", "y"], "b": ["z"]},
                                      {"a": ["x"], "b": ["y", "z"]})
        self.assertTrue(report["changed"])
        self.assertEqual(report["changed_nodes"], ["x", "y", "z"])

    def test_generator_memberships_are_materialized_once(self):
        report = compare_community_ab(None, {"a": iter(["x", "y"])}, {"b": iter(["y", "x"])})
        self.assertFalse(report["changed"])
        self.assertEqual(report["active_signature"], report["disabled_signature"])

    def test_duplicate_membership_is_rejected(self):
        with self.assertRaises(ValueError):
            membership_stability([{"a": ["x"], "b": ["x"]}, {"a": ["x"]}])


if __name__ == "__main__":
    unittest.main()