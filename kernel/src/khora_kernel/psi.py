# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1 · @ua UA-12,UA-13,UA-43
import logging
import os
from typing import Any

from khora_kernel.communities import recalcular_leiden
from khora_kernel.embeddings import rebuild_index


def _summary_provider(puerto_llm: Any):
    if puerto_llm is not None:
        return puerto_llm
    from khora_kernel.proveedores.llm_generico import ProveedorLLMGenerico
    return ProveedorLLMGenerico()


def on_node_upserted(node_id: str, memoria: Any, ts: str | None = None, puerto_llm: Any = None) -> dict:
    """Cadena causal posterior a un update aceptado.

    Orden: mismo estado de grafo -> Leiden/reificación -> fSUM -> índice.
    Ninguna etapa recalcula a partir de una instantánea distinta.
    """
    from datetime import datetime, timezone
    ts = ts or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    logging.info(
        "[PIPELINE] recalculo disparado por ingesta=%s ts=%s",
        node_id,
        ts,
    )
    manifest = recalcular_leiden(node_id, memoria, ts)
    summary_status = {"communities_summarized": 0, "summary_error": None}
    try:
        from khora_kernel.summaries import summarize_all
        if os.getenv("KHORA_FSUM_AUTO", "1").lower() not in {"0", "false", "no"}:
            summarize_all(memoria, _summary_provider(puerto_llm), manifest["graph_revision"])
            if hasattr(memoria, "publicar_comunidades"):
                memoria.publicar_comunidades(manifest["graph_revision"], ts)
            summary_status["communities_summarized"] = len(manifest.get("communities", []))
    except Exception as exc:
        summary_status["summary_error"] = str(exc)
        logging.error("[PIPELINE] fSUM falló después de aceptar update %s: %s", node_id, exc)

    index_status = rebuild_index(memoria, manifest["graph_revision"])
    return {
        "accepted_update_id": node_id,
        "graph_revision": manifest["graph_revision"],
        "leiden": manifest,
        "summary": summary_status,
        "embeddings": index_status,
    }
