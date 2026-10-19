"""Controlled native Pipe contract; NOT a running Open WebUI/graph/model test."""
import asyncio
from contextlib import nullcontext
from khora_kernel.api import ContextoDeVisibilidad
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import patch
from khora_kernel.integrations.openwebui import Pipe, KernelChatBinding
from khora_kernel.engine.history import Ht, HtEvidence, save_ht


class OpenWebUIPipeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = str(Path(self.tmp.name) / 'history.sqlite')
        self.binding = KernelChatBinding('u1', 'c1', 'server-session', object(), object(), self.db, nullcontext, ContextoDeVisibilidad.TRANSPARENTE)
        self.request = NS(app=NS(state=NS(khora_chat_binding=lambda **kw: self.binding)))
        save_ht(Ht('server-session', 'ts', evidence=[HtEvidence('n1', 'fuente controlada', 1)]), self.db)
        self.kw = dict(__user__={'id': 'u1'}, __request__=self.request, __chat_id__='c1')
        self.body = {'messages': [{'role': 'user', 'content': 'pregunta'}]}
        self.result = NS(verdict='SUFFICIENT', answer='respuesta controlada', citations=['n1'])

    def tearDown(self):
        self.tmp.cleanup()

    def run_pipe(self, **extra):
        return asyncio.run(Pipe().pipe(self.body, **(self.kw | extra)))

    def test_calls_kernel_not_provider_or_client_session(self):
        self.body.update(session_id='attacker', user={'id':'attacker'}, model='override', metadata={'chat_id':'attacker'})
        with patch('khora_kernel.engine.core.ejecutar_ciclo', return_value=self.result) as kernel:
            self.assertEqual(self.run_pipe(), 'respuesta controlada')
            kernel.assert_called_once_with('server-session', 'pregunta', self.binding.puerto_llm, self.binding.memoria, self.db, contexto=ContextoDeVisibilidad.TRANSPARENTE)

    def test_missing_host_binding_is_closed(self):
        self.request.app.state.khora_chat_binding = None
        with patch('khora_kernel.engine.core.ejecutar_ciclo') as kernel:
            with self.assertRaises(PermissionError): self.run_pipe()
            kernel.assert_not_called()

    def test_mismatched_user_or_chat_is_closed(self):
        for extra in [{'__user__': {'id':'other'}}, {'__chat_id__':'other'}]:
            with self.subTest(extra=extra), patch('khora_kernel.engine.core.ejecutar_ciclo') as kernel:
                with self.assertRaises(PermissionError): self.run_pipe(**extra)
                kernel.assert_not_called()

    def test_no_identity_is_closed(self):
        with self.assertRaises(PermissionError): self.run_pipe(__user__=None)

    def test_no_graph_is_closed(self):
        self.binding = KernelChatBinding('u1','c1','s',object(),None,self.db)
        with self.assertRaises(PermissionError): self.run_pipe()

    def test_multimodal_and_tasks_are_not_enabled(self):
        for extra in [{'__files__': ['x']}, {'__task__': 'title_generation'}]:
            with self.subTest(extra=extra), self.assertRaises(ValueError): self.run_pipe(**extra)
        self.body['messages'][0]['content'] = [{'type':'image_url','image_url':'x'}]
        with self.assertRaises(ValueError): self.run_pipe()

    def test_unvalidated_draft_is_not_returned(self):
        self.result.verdict='INSUFFICIENT'; self.result.answer='BORRADOR NO VALIDADO'
        with patch('khora_kernel.engine.core.ejecutar_ciclo', return_value=self.result):
            self.assertNotIn('BORRADOR', self.run_pipe())

    def test_citation_event_uses_persisted_evidence(self):
        events=[]
        async def emit(e): events.append(e)
        with patch('khora_kernel.engine.core.ejecutar_ciclo', return_value=self.result):
            self.run_pipe(__event_emitter__=emit)
        self.assertEqual(events[0]['type'], 'citation')
        self.assertEqual(events[0]['data']['document'], ['fuente controlada'])

    def test_missing_citation_evidence_suppresses_answer(self):
        self.result.citations=['missing']
        with patch('khora_kernel.engine.core.ejecutar_ciclo', return_value=self.result):
            self.assertNotEqual(self.run_pipe(), self.result.answer)

    def test_provider_exception_does_not_expose_details_or_fallback(self):
        with patch('khora_kernel.engine.core.ejecutar_ciclo', side_effect=Exception('SECRET_SENTINEL')):
            with self.assertRaises(RuntimeError) as exc: self.run_pipe()
        self.assertNotIn('SECRET_SENTINEL', str(exc.exception))

    def test_history_failure_does_not_expose_storage_details(self):
        with patch('khora_kernel.engine.core.ejecutar_ciclo', return_value=self.result), patch('khora_kernel.engine.history.load_ht', side_effect=Exception('PRIVATE_PATH_SENTINEL')):
            with self.assertRaises(RuntimeError) as exc: self.run_pipe()
        self.assertNotIn('PRIVATE_PATH_SENTINEL', str(exc.exception))
