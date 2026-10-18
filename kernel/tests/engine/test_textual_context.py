"""Focal contracts; controlled providers/graph, NOT production certification."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import patch

from khora_kernel.engine import core
from khora_kernel.engine.fval import fval
from khora_kernel.engine.history import Ht, HtStep, HtEvidence, save_ht, load_ht


class Provider:
    def __init__(self):
        self.requests = []
        self.actions = iter(['REFINE', 'RETRIEVE', 'ANSWER'])

    def generar(self, req):
        self.requests.append(req)
        role = req.metadata.get('role')
        if role == 'pi_theta':
            return NS(texto=json.dumps({'accion': next(self.actions), 'justificacion': 'test'}))
        if role == 'refine':
            return NS(texto='consulta refinada')
        if role == 'P_phi_generator':
            return NS(texto='Respuesta respaldada [n1]')
        return NS(texto='{"vt":"Sufficient","deficit_type":null,"reason":"controlado"}')


class Retriever:
    seen = []
    def __init__(self, memory):
        pass
    def consultar(self, question, context):
        self.seen.append(question)
        return NS(subgrafo=NS(nodos=[NS(id='n1')], aristas=[]),
                  fragmentos=[NS(id='n1', texto='evidencia controlada',
                    provenance=NS(origen='test', driver='test', timestamp='2026-10-17'))],
                  resumenes_incluidos=False, suficiencia=NS(value='suficiente'),
                  degradacion_declarada=False)


class TextualContextTests(unittest.TestCase):
    def setUp(self):
        Retriever.seen = []
        self.ht = Ht('isolated-a', '2026-10-17',
                     steps=[HtStep(1, 'RETRIEVE', 'ts', 'recuperado', {'fact': 'observacion unica'})],
                     evidence=[HtEvidence('n1', 'evidencia unica', 1)],
                     verdicts=[{'reason': 'veredicto unico'}], trace=[{'revision': 'traza unica'}])

    def test_policy_observations_and_full_context(self):
        provider = Provider()
        core._policy('pregunta', self.ht, provider)
        prompt = provider.requests[0].prompt
        for value in ('observacion unica', 'evidencia unica', 'veredicto unico', 'traza unica'):
            self.assertIn(value, prompt)

    def test_refine_is_used_by_next_retrieval(self):
        ht = core._add_step(self.ht, 'REFINE', 'refine', {'refined_query': 'mas especifica', 'original_question': 'original'})
        with patch.object(core, 'RetrieverGraphRAG', Retriever):
            core._retrieve(ht, 'original', object())
        self.assertEqual(Retriever.seen, ['mas especifica'])

    def test_latest_nonempty_refine_is_used(self):
        ht = core._add_step(self.ht, 'REFINE', 'r1', {'refined_query': 'primera', 'original_question': 'original'})
        ht = core._add_step(ht, 'REFINE', 'r2', {'refined_query': 'segunda', 'original_question': 'original'})
        with patch.object(core, 'RetrieverGraphRAG', Retriever):
            core._retrieve(ht, 'original', object())
        self.assertEqual(Retriever.seen, ['segunda'])

    def test_empty_refine_does_not_destroy_question(self):
        ht = core._add_step(self.ht, 'REFINE', 'r', {'refined_query': '   ', 'original_question': 'original'})
        with patch.object(core, 'RetrieverGraphRAG', Retriever):
            core._retrieve(ht, 'original', object())
        self.assertEqual(Retriever.seen, ['original'])

    def test_refine_from_another_question_is_not_reused(self):
        ht = core._add_step(self.ht, 'REFINE', 'r', {'refined_query': 'vieja', 'original_question': 'otra pregunta'})
        with patch.object(core, 'RetrieverGraphRAG', Retriever):
            core._retrieve(ht, 'original', object())
        self.assertEqual(Retriever.seen, ['original'])

    def test_fval_receives_original_question_and_relevance_rule(self):
        provider = Provider()
        result = fval('respuesta', self.ht, provider, question='pregunta original unica')
        self.assertEqual(result.vt, 'Sufficient')
        self.assertIn('pregunta original unica', provider.requests[0].prompt)
        self.assertIn('ajena o incompleta no es suficiente', provider.requests[0].prompt)

    def test_fval_three_argument_compatibility(self):
        self.assertEqual(fval('respuesta', self.ht, Provider()).vt, 'Sufficient')

    def test_invalid_fval_remains_insufficient(self):
        provider = NS(generar=lambda req: NS(texto='not JSON'))
        result = fval('respuesta', self.ht, provider)
        self.assertEqual(result.vt, 'Insufficient')

    def test_loop_refines_retrieves_and_validates_original_question(self):
        provider = Provider()
        with tempfile.TemporaryDirectory() as tmp:
            db = str(Path(tmp) / 'sessions.sqlite')
            with patch.object(core, 'RetrieverGraphRAG', Retriever):
                result = core.ejecutar_ciclo('fresh-a', 'pregunta original del turno', provider, object(), db)
            self.assertEqual(result.verdict, 'SUFFICIENT')
            self.assertEqual(Retriever.seen, ['consulta refinada'])
            judge = next(r for r in provider.requests if r.metadata.get('role') == 'fVAL')
            self.assertIn('pregunta original del turno', judge.prompt)
            self.assertIsNotNone(load_ht('fresh-a', db))
            self.assertIsNone(load_ht('fresh-b', db))

    def test_history_observations_roundtrip_and_isolation(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = str(Path(tmp) / 'sessions.sqlite')
            save_ht(self.ht, db)
            self.assertEqual(load_ht('isolated-a', db).steps[0].observation, {'fact': 'observacion unica'})
            self.assertIsNone(load_ht('isolated-b', db))




class CurrentTurnTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = str(Path(self.tmp.name) / 'sessions.sqlite')
        self.old = Ht('same-chat', 'ts', steps=[
            HtStep(1, 'REFINE', 'ts', 'old refinement', {'refined_query': 'refinamiento antiguo', 'original_question': 'misma pregunta'}),
            HtStep(2, 'RETRIEVE', 'ts', 'old G*', {'gstar_nodes': ['old-node']})],
            evidence=[HtEvidence('old-node', 'contexto anterior', 2)])
        save_ht(self.old, self.db)

    def tearDown(self):
        self.tmp.cleanup()

    def test_old_retrieval_cannot_authorize_new_answer(self):
        provider = Provider()
        provider.actions = iter(['ANSWER', 'STOP'])
        result = core.ejecutar_ciclo('same-chat', 'nueva pregunta', provider, object(), self.db)
        self.assertEqual(result.verdict, 'INSUFFICIENT')
        self.assertFalse(any(r.metadata.get('role') == 'P_phi_generator' for r in provider.requests))

    def test_same_question_does_not_reuse_previous_turn_refinement(self):
        Retriever.seen = []
        provider = Provider()
        provider.actions = iter(['RETRIEVE', 'ANSWER'])
        with patch.object(core, 'RetrieverGraphRAG', Retriever):
            result = core.ejecutar_ciclo('same-chat', 'misma pregunta', provider, object(), self.db)
        self.assertEqual(result.verdict, 'SUFFICIENT')
        self.assertEqual(Retriever.seen, ['misma pregunta'])

    def test_followup_preserves_previous_history_for_policy(self):
        provider = Provider()
        provider.actions = iter(['STOP'])
        core.ejecutar_ciclo('same-chat', 'seguimiento', provider, object(), self.db)
        self.assertIn('contexto anterior', provider.requests[0].prompt)
        saved = load_ht('same-chat', self.db)
        self.assertEqual(saved.evidence, self.old.evidence)
        self.assertIsNone(load_ht('different-chat', self.db))


if __name__ == '__main__':
    unittest.main()
