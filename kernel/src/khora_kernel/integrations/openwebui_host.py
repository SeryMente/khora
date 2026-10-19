"""Native host binding for Open WebUI 0.12.3; installing it publishes no service.

Only the real upstream owner lookup is accepted in production. Shared/admin
access is intentionally not ownership. Ht uses the existing kernel PostgreSQL
schema; deterministic namespaced IDs need no second memory or mapping table.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from contextlib import contextmanager
from typing import Any
from urllib.parse import urlsplit

from khora_kernel.api import ContextoDeVisibilidad
from khora_kernel.engine.history import _postgres
from khora_kernel.integrations.openwebui import KernelChatBinding


def kernel_session_id(user_id: str, chat_id: str) -> str:
    if not all(isinstance(x, str) and 0 < len(x) <= 256 and x.strip() == x for x in (user_id, chat_id)):
        raise PermissionError("Identidad o conversación no verificable.")
    name = json.dumps(["khora-openwebui-ht-v1", user_id, chat_id], ensure_ascii=True, separators=(",", ":"))
    return str(uuid.uuid5(uuid.NAMESPACE_URL, name))


@contextmanager
def postgres_turn(db_path: str, session_id: str):
    """Transaction-scoped advisory lock: survives pooling and serializes processes.

    All kernel reads/writes and citation snapshot must happen inside this guard.
    No DDL, SQLite fallback or connection secret in exceptions/logs. The existing
    history driver enforces verify-full remotely and bounded lock/connect waits.
    """
    lock_key = int.from_bytes(hashlib.sha256(("khora-ht-turn-v1:" + session_id).encode()).digest()[:8], "big", signed=True)
    with _postgres(db_path) as connection:
        connection.execute("SELECT pg_advisory_xact_lock(%s)", (lock_key,))
        yield


async def upstream_owned_chat(*, user_id: str, chat_id: str):
    from open_webui.models.chats import Chats
    return await Chats.get_chat_by_id_and_user_id(chat_id, user_id)


class OpenWebUIHostBinding:
    def __init__(self, *, puerto_llm: Any, memoria: Any, db_path: str):
        try:
            parsed = urlsplit(db_path)
            valid = parsed.scheme in {"postgresql", "postgres"} and bool(parsed.hostname) and bool(parsed.path.strip("/"))
        except (TypeError, ValueError):
            valid = False
        if not valid or puerto_llm is None or memoria is None:
            raise ValueError("Se requiere runtime PostgreSQL y dependencias del núcleo explícitos.")
        self._db_path = db_path
        self._provider = puerto_llm
        self._memory = memoria

    async def __call__(self, *, user_id: str, chat_id: str) -> KernelChatBinding:
        session_id = kernel_session_id(user_id, chat_id)
        # No local/temporary chats, no automatic owner assignment, no admin bypass.
        if chat_id.startswith(("local:", "temporary:", "shared:")):
            raise PermissionError("Se requiere una conversación durable propia.")
        try:
            owned = await upstream_owned_chat(user_id=user_id, chat_id=chat_id)
        except Exception:
            raise PermissionError("No se pudo verificar el propietario de la conversación.") from None
        if owned is None or getattr(owned, "id", None) != chat_id or getattr(owned, "user_id", None) != user_id:
            raise PermissionError("La conversación no pertenece al usuario autenticado.")
        return KernelChatBinding(
            user_id=user_id, chat_id=chat_id, session_id=session_id,
            puerto_llm=self._provider, memoria=self._memory, db_path=self._db_path,
            turn_guard=lambda: postgres_turn(self._db_path, session_id),
            contexto=ContextoDeVisibilidad.TRANSPARENTE,
        )


def install_host_binding(app, *, puerto_llm, memoria, db_path):
    """Explicit opt-in after host authentication/runtime preflights, never on import."""
    binding = OpenWebUIHostBinding(puerto_llm=puerto_llm, memoria=memoria, db_path=db_path)
    app.state.khora_chat_binding = binding
    return binding
