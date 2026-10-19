"""Open WebUI Pipe -> existing Khora kernel, disabled until the host binds access.

Contract inspected in Open WebUI v0.12.3 functions.py (91ea4e3421d1d8069f13d4a463fcb5986d94ea60).
No Open WebUI service, identity scheme, database or provider is provisioned here.
The existing authenticated host MUST supply khora_chat_binding, after reviewing
access, corpus/egress, persistence and concurrency. This module grants no access.
"""
from __future__ import annotations

import asyncio
import inspect
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class KernelChatBinding:
    """Server-resolved access to an existing kernel conversation, never body data."""
    user_id: str
    chat_id: str
    session_id: str
    puerto_llm: Any
    memoria: Any
    db_path: str
    turn_guard: Any = None
    contexto: Any = None


def _question(body: dict) -> str:
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        raise ValueError("Se requiere una pregunta textual.")
    last = messages[-1]
    if not isinstance(last, dict) or last.get("role") != "user":
        raise ValueError("El último mensaje debe ser una pregunta del usuario.")
    content = last.get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Esta entrega admite únicamente texto, sin imágenes ni archivos.")
    if body.get("files") or last.get("files"):
        raise ValueError("Los archivos no están habilitados en esta entrega.")
    return content.strip()


class Pipe:
    """Native Open WebUI extension; no direct-provider fallback and no admin bypass."""

    async def pipe(self, body: dict, __user__: dict | None = None,
                   __request__: Any = None, __chat_id__: str | None = None,
                   __event_emitter__: Any = None, __files__: Any = None,
                   __task__: str | None = None) -> str:
        if __task__ is not None or __files__:
            raise ValueError("Solo consultas textuales explícitas; tareas y archivos deshabilitados.")
        question = _question(body)
        user_id = (__user__ or {}).get("id")
        if not isinstance(user_id, str) or not user_id or not isinstance(__chat_id__, str) or not __chat_id__:
            raise PermissionError("Se requiere identidad y conversación verificadas por el anfitrión.")
        state = getattr(getattr(__request__, "app", None), "state", None)
        resolver = getattr(state, "khora_chat_binding", None)
        if not callable(resolver):
            raise PermissionError("Integración no habilitada por el anfitrión autenticado de Khora.")
        binding = resolver(user_id=user_id, chat_id=__chat_id__)
        if inspect.isawaitable(binding):
            binding = await binding
        if (not isinstance(binding, KernelChatBinding)
                or binding.user_id != user_id or binding.chat_id != __chat_id__
                or not isinstance(binding.session_id, str) or not binding.session_id.strip()
                or not isinstance(binding.db_path, str) or not binding.db_path.strip()
                or binding.memoria is None or binding.puerto_llm is None
                or not callable(binding.turn_guard)
                or binding.contexto is None):
            raise PermissionError("El anfitrión no resolvió una conversación autorizada del núcleo.")

        # The guard, kernel call and evidence snapshot all run in ONE thread.
        # Request cancellation must not release the PostgreSQL lock while its
        # synchronous worker is still writing history in the background.
        def run_turn():
            from khora_kernel.engine.core import ejecutar_ciclo
            from khora_kernel.engine.history import load_ht
            with binding.turn_guard():
                result = ejecutar_ciclo(
                    binding.session_id, question, binding.puerto_llm,
                    binding.memoria, binding.db_path, contexto=binding.contexto,
                )
                evidence = []
                if result.verdict == "SUFFICIENT" and result.citations and result.answer.strip():
                    ht = load_ht(binding.session_id, binding.db_path)
                    citations = set(result.citations)
                    evidence = [item for item in (ht.evidence if ht else []) if item.node_id in citations]
                return result, evidence

        try:
            result, evidence = await asyncio.to_thread(run_turn)
        except Exception:
            raise RuntimeError("El núcleo no pudo completar la consulta o verificar sus fuentes; no se generó una respuesta alternativa.") from None

        if result.verdict != "SUFFICIENT":
            return "No hay evidencia suficiente para responder esta pregunta con confianza. No se presenta como válida una respuesta sin respaldo."
        if not result.citations or not result.answer.strip():
            return "No se pudo verificar una respuesta con fuentes del núcleo."
        citations = set(result.citations)
        if not evidence or not citations.issubset({item.node_id for item in evidence}):
            return "No se pudieron recuperar todas las fuentes de la respuesta; no se presenta como verificada."
        if __event_emitter__ is not None:
            for item in evidence:
                await __event_emitter__({"type": "citation", "data": {
                    "source": {"name": f"Khora · {item.node_id}"},
                    "document": [item.triple],
                    "metadata": [{"source": item.node_id}],
                }})
        return result.answer
