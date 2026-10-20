"""Opt-in, read-only proof against an existing operator-created test chat.

No new account, session, graph write or test provider. Native owner lookup is
real PostgreSQL. Only bounded status codes are reported; no identity/token/text.
"""
import asyncio
import json
import os
import uuid

async def probe(chat_id,history):
    from open_webui.models.chats import Chats
    from khora_kernel.integrations.openwebui_host import OpenWebUIHostBinding
    from khora_kernel.engine.history import load_ht
    chat=await Chats.get_chat_by_id(chat_id)
    if chat is None: raise RuntimeError('E72_TEST_CHAT_NOT_PRESENT')
    # Dependencies intentionally inert: this test calls only the real ownership
    # resolver and PostgreSQL history, never LLM/retrieval or fake completions.
    binding=OpenWebUIHostBinding(puerto_llm=object(),memoria=object(),db_path=history)
    owned=await binding(user_id=chat.user_id,chat_id=chat_id)
    denied=False
    try:
        await binding(user_id='e72-not-an-account-'+str(uuid.uuid5(uuid.NAMESPACE_URL,chat_id)),chat_id=chat_id)
    except PermissionError:
        denied=True
    if not denied: raise RuntimeError('E72_FOREIGN_OWNER_NOT_DENIED')
    ht=await asyncio.to_thread(load_ht,owned.session_id,history)
    if ht is None or not ht.evidence: raise RuntimeError('E72_HISTORY_NOT_DURABLE')
    return {'owner_resolved':True,'non_owner_denied':True,'existing_chat_only':True,
            'new_accounts':0,'graph_writes':False,'history_present':True,
            'evidence_count':len(ht.evidence),'steps_count':len(ht.steps)}

def main():
    chat_id=os.environ.get('KHORA_CHAT_E72_VERIFY_CHAT','')
    try:
        if str(uuid.UUID(chat_id))!=chat_id: raise ValueError()
        from api.chat_runtime import configure_native_environment
        _,history=configure_native_environment()
        print('KHORA_E72_OWNERSHIP '+json.dumps(asyncio.run(probe(chat_id,history)),sort_keys=True))
    except Exception:
        print('KHORA_E72_OWNERSHIP {"verified":false,"error":"READ_ONLY_OWNER_PROOF_FAILED"}')
        raise SystemExit(1) from None

if __name__=='__main__': main()
