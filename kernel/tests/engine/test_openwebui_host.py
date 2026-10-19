"""Controlled ownership/lock contracts; no production graph/model or OWUI runtime."""
import asyncio
import unittest
from contextlib import contextmanager
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch

from khora_kernel.api import ContextoDeVisibilidad
from khora_kernel.integrations.openwebui_host import (
    OpenWebUIHostBinding, install_host_binding, kernel_session_id, postgres_turn,
)


class HostTests(unittest.TestCase):
    def setUp(self):
        self.host = OpenWebUIHostBinding(puerto_llm=object(), memoria=object(), db_path="postgresql://test@127.0.0.1/history")

    def test_server_deterministic_mapping_and_public_only(self):
        with patch('khora_kernel.integrations.openwebui_host.upstream_owned_chat', AsyncMock(return_value=NS(id='c1', user_id='u1'))) as lookup:
            binding = asyncio.run(self.host(user_id='u1', chat_id='c1'))
        lookup.assert_awaited_once_with(user_id='u1', chat_id='c1')
        self.assertEqual(binding.session_id, kernel_session_id('u1', 'c1'))
        self.assertEqual(binding.contexto, ContextoDeVisibilidad.TRANSPARENTE)
        self.assertTrue(callable(binding.turn_guard))

    def test_namespaced_unambiguous_and_user_isolated(self):
        keys = [('u1', 'c1'), ('u2', 'c1'), ('u1', 'c2'), ('a:b', 'c'), ('a', 'b:c')]
        self.assertEqual(len(set(kernel_session_id(*key) for key in keys)), len(keys))

    def test_invalid_identity_rejected_before_lookup(self):
        for user, chat in [('', 'c'), ('u', ''), (' u', 'c'), ('u', None), ('u', 'x'*257)]:
            with self.subTest(user=user, chat=chat), patch('khora_kernel.integrations.openwebui_host.upstream_owned_chat', AsyncMock()) as lookup:
                with self.assertRaises(PermissionError): asyncio.run(self.host(user_id=user, chat_id=chat))
                lookup.assert_not_called()

    def test_missing_foreign_or_malformed_owner_closed(self):
        for owned in [None, NS(id='c1',user_id='other'), NS(id='other', user_id='u1'), NS(id='c1')]:
            with self.subTest(owned=owned), patch('khora_kernel.integrations.openwebui_host.upstream_owned_chat', AsyncMock(return_value=owned)):
                with self.assertRaises(PermissionError): asyncio.run(self.host(user_id='u1',chat_id='c1'))

    def test_lookup_failure_redacted(self):
        with patch('khora_kernel.integrations.openwebui_host.upstream_owned_chat', AsyncMock(side_effect=Exception('PRIVATE_DATABASE_SENTINEL'))):
            with self.assertRaises(PermissionError) as error: asyncio.run(self.host(user_id='u1',chat_id='c1'))
        self.assertNotIn('PRIVATE_DATABASE_SENTINEL', str(error.exception))

    def test_ephemeral_chat_closed(self):
        for chat in ['local:abc', 'temporary:abc', 'shared:abc']:
            with self.assertRaises(PermissionError): asyncio.run(self.host(user_id='u1',chat_id=chat))

    def test_invalid_or_ephemeral_runtime_not_installed(self):
        for path in ['data/history.sqlite','sqlite:///temp','https://example.test/db','postgresql:///missing-host']:
            app=NS(state=NS())
            with self.subTest(path=path), self.assertRaises(ValueError):
                install_host_binding(app, puerto_llm=object(),memoria=object(),db_path=path)
            self.assertFalse(hasattr(app.state,'khora_chat_binding'))

    def test_postgres_transaction_lock_is_parameterized_and_covers_worker(self):
        order=[]
        conn=NS(execute=lambda query,args: order.append((query,args)))
        @contextmanager
        def database(path):
            order.append('begin');yield conn;order.append('commit')
        with patch('khora_kernel.integrations.openwebui_host._postgres',database):
            with postgres_turn('postgresql://test@localhost/history','session'):
                order.append('kernel-and-citation-snapshot')
        self.assertEqual(order[0],'begin')
        self.assertEqual(order[1][0],'SELECT pg_advisory_xact_lock(%s)')
        self.assertIsInstance(order[1][1][0],int)
        self.assertEqual(order[2:],[ 'kernel-and-citation-snapshot','commit'])

class PublicContextPropagationTests(unittest.TestCase):
    def test_explicit_public_context_reaches_retriever_without_relaxing_judge(self):
        import tempfile
        from pathlib import Path
        from khora_kernel.engine import core
        from khora_kernel.engine.fval import FvalResult
        from khora_kernel.engine.history import HtEvidence
        with tempfile.TemporaryDirectory() as tmp:
            def retrieve(ht,question,memory,contexto=None):
                self.assertEqual(contexto,ContextoDeVisibilidad.TRANSPARENTE)
                return core._replace_ht(ht,evidence=[HtEvidence('public','artificial source',1)])
            with patch.object(core,'_policy',side_effect=[(core.Lambda.RETRIEVE,''),(core.Lambda.ANSWER,'')]), patch.object(core,'_retrieve',side_effect=retrieve) as retrieval, patch.object(core,'_answer',return_value=core.Response('answer',['public'],'session')), patch.object(core,'fval',return_value=FvalResult('Sufficient',None,'controlled')) as judge:
                result=core.ejecutar_ciclo('session','question',object(),object(),str(Path(tmp)/'test.sqlite'),contexto=ContextoDeVisibilidad.TRANSPARENTE)
                self.assertEqual(result.verdict,'SUFFICIENT'); retrieval.assert_called_once();judge.assert_called_once()
