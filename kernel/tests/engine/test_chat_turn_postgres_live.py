"""Real disposable PostgreSQL: same-session serialization, cross-process and abort.
No production/model/graph evidence; opt-in URL must be disposable loopback only.
"""
import asyncio
import os
import subprocess
import sys
import threading
import time
import unittest
from dataclasses import replace
from types import SimpleNamespace as NS
from unittest.mock import patch
from urllib.parse import urlsplit
from uuid import uuid4

from khora_kernel.api import ContextoDeVisibilidad
from khora_kernel.engine.history import Ht, HtStep, HistoryStorageError, load_ht, save_ht
from khora_kernel.integrations.openwebui import KernelChatBinding, Pipe
from khora_kernel.integrations.openwebui_host import postgres_turn

URL=os.getenv('KHORA_TEST_HISTORY_POSTGRES','')

@unittest.skipUnless(URL,'No disposable PostgreSQL configured; not live evidence')
class TurnPostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import psycopg
        parsed=urlsplit(URL)
        if parsed.hostname not in {'127.0.0.1','localhost','::1'} or parsed.path!='/khora_history_test':
            raise RuntimeError('Refusing non-disposable target')
        cls.driver=psycopg
        with psycopg.connect(URL) as conn:
            conn.execute('CREATE SCHEMA IF NOT EXISTS khora_chat_kernel')
            conn.execute('CREATE TABLE IF NOT EXISTS khora_chat_kernel.sessions (session_id TEXT PRIMARY KEY,ht_json JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL)')

    def setUp(self):self.key='turn-live:'+uuid4().hex
    def tearDown(self):
        with self.driver.connect(URL) as conn:
            conn.execute('DELETE FROM khora_chat_kernel.sessions WHERE session_id=%s',(self.key,))

    def test_same_conversation_six_processes_do_not_lose_history(self):
        script='''import sys,time
from dataclasses import replace
from khora_kernel.engine.history import Ht,HtStep,load_ht,save_ht
from khora_kernel.integrations.openwebui_host import postgres_turn
url,key=sys.argv[1:]
with postgres_turn(url,key):
 ht=load_ht(key,url) or Ht(key,'test')
 time.sleep(.06)
 save_ht(replace(ht,steps=ht.steps+[HtStep(len(ht.steps)+1,'TURN','test','controlled')]),url)
'''
        processes=[subprocess.Popen([sys.executable,'-c',script,URL,self.key],stdout=subprocess.PIPE,stderr=subprocess.PIPE) for _ in range(6)]
        for process in processes:
            out,err=process.communicate(timeout=20)
            self.assertEqual(process.returncode,0,err.decode())
        self.assertEqual([step.n for step in load_ht(self.key,URL).steps],list(range(1,7)))

    def test_exception_releases_lock_for_another_connection(self):
        with self.assertRaises(HistoryStorageError):
            with postgres_turn(URL,self.key):raise ValueError('controlled rollback')
        with postgres_turn(URL,self.key):save_ht(Ht(self.key,'after-abort'),URL)
        self.assertEqual(load_ht(self.key,URL).created_at,'after-abort')

    def test_cancelled_async_request_does_not_release_running_worker_lock(self):
        started=threading.Event();finish=threading.Event()
        binding=KernelChatBinding('u','c',self.key,object(),object(),URL,lambda:postgres_turn(URL,self.key),ContextoDeVisibilidad.TRANSPARENTE)
        request=NS(app=NS(state=NS(khora_chat_binding=lambda **kw:binding)))
        def kernel(*args,**kwargs):
            started.set();time.sleep(.7)
            save_ht(Ht(self.key,'cancelled-worker-finished'),URL)
            finish.set();return NS(verdict='INSUFFICIENT',answer='',citations=[])
        async def run():
            with patch('khora_kernel.engine.core.ejecutar_ciclo',side_effect=kernel):
                task=asyncio.create_task(Pipe().pipe({'messages':[{'role':'user','content':'controlled'}]},__user__={'id':'u'},__chat_id__='c',__request__=request))
                for _ in range(100):
                    if started.is_set():break
                    await asyncio.sleep(.01)
                self.assertTrue(started.is_set());task.cancel()
                with self.assertRaises(asyncio.CancelledError):await task
                # A second turn blocks until the cancelled request's worker exits.
                def second():
                    with postgres_turn(URL,self.key):return finish.is_set()
                self.assertTrue(await asyncio.to_thread(second))
        asyncio.run(run())
        self.assertEqual(load_ht(self.key,URL).created_at,'cancelled-worker-finished')
