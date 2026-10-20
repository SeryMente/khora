"""Probe orchestration only; deployment supplies real owner lookup."""
import ast
from pathlib import Path

def test_owner_probe_is_read_only_and_does_not_create_accounts():
    source=Path('api/probe_chat_ownership.py').read_text()
    ast.parse(source)
    assert 'get_chat_by_id(chat_id)' in source
    assert 'await binding(user_id=chat.user_id,chat_id=chat_id)' in source
    assert 'except PermissionError' in source
    assert 'load_ht' in source
    for forbidden in ['insert_new_user','insert_new_chat','escribir_ingesta','save_ht','print(chat','print(history']:
        assert forbidden not in source
