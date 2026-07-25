# @l0 L0-002 · @req ING-04/REQ-1,REQ-2 · @acr ACR-1.1,ACR-2.1 · @ua UA-10,UA-11,UA-12,UA-13
from typing import Any


def on_node_upserted(node_id: str, memoria: Any, ts: str) -> None:
    # Evitar ciclos de importación, khora_kernel.embeddings solo lo usamos aquí de forma perezosa
    from khora_kernel.embeddings import on_node_upserted as _do_upsert
    from khora_kernel.communities import recalcular_leiden
    _do_upsert(node_id, memoria)
    recalcular_leiden(node_id, memoria, ts)
