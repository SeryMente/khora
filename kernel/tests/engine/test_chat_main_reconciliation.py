"""Controlled regression: preserve main safeguards, not a production assertion."""
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from khora_kernel.engine import core
from khora_kernel.engine.history import Ht, HtEvidence, save_ht, load_ht
from khora_kernel.engine.fval import FvalResult

class MainReconciliationTests(unittest.TestCase):
    def test_blank_refine_fails_without_persisting_a_fake_query(self):
        provider = SimpleNamespace(generar=lambda request: SimpleNamespace(texto='   '))
        with self.assertRaises(ValueError):
            core._refine(Ht('s', 'now'), 'original', provider)

    def test_refine_keeps_original_question_and_records_actual_query(self):
        provider = SimpleNamespace(generar=lambda request: SimpleNamespace(texto='  concreta  '))
        ht = core._refine(Ht('s', 'now'), 'original', provider)
        self.assertEqual(ht.steps[-1].observation, {'refined_query': 'concreta', 'original_question': 'original'})
        self.assertEqual(ht.trace[-1], {'action': 'REFINE', 'refined_query': 'concreta'})

    def test_visual_evidence_never_skips_global_judge_in_mark_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = str(Path(tmp) / 'ht.sqlite')
            save_ht(Ht('s', 'now', evidence=[HtEvidence('fallback_vqa', 'visual controlled', 1)]), db)
            provider = SimpleNamespace()
            insufficient = FvalResult('Insufficient', 'TEXTUAL', 'El hallazgo no responde')
            with patch.dict('os.environ', {'KHORA_FVAL_MODE':'mark'}), \
                 patch.object(core, '_policy', side_effect=[(core.Lambda.RETRIEVE,''),(core.Lambda.ANSWER,''),(core.Lambda.STOP,'')]), \
                 patch.object(core, '_retrieve', side_effect=lambda ht,*args: ht), \
                 patch.object(core, '_answer', return_value=core.Response('borrador', ['fallback_vqa'], 's')), \
                 patch.object(core, 'fval', return_value=insufficient) as judge:
                result = core.ejecutar_ciclo('s', 'pregunta original', provider, object(), db)
            judge.assert_called_once()
            self.assertEqual(judge.call_args.kwargs['question'], 'pregunta original')
            self.assertEqual(result.verdict, 'INSUFFICIENT')
            self.assertNotIn('fallback visual validado', result.reason)
            self.assertEqual(load_ht('s', db).verdicts[-1]['vt'], 'Insufficient')

if __name__ == '__main__':
    unittest.main(verbosity=2)
