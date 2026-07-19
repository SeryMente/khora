from typing import Any
import sys

def on_node_upserted(node_id: str, memoria: Any) -> None:
    # Evitar ciclos de importación, khora_kernel.embeddings solo lo usamos aquí de forma perezosa
    from khora_kernel.embeddings import on_node_upserted as _do_upsert
    _do_upsert(node_id, memoria)
