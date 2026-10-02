# @l0 L0-002-R · @req ING-05/REQ-1 · @acr ACR-1.1
"""Shim de compatibilidad: la implementación vive en khora_kernel.summaries.fsum."""
from khora_kernel.summaries.fsum import (
    fsum,
    get_all_communities,
    get_community_edges,
    get_community_info,
    summarize_all,
    summarize_community,
)

__all__ = [
    "fsum", "get_all_communities", "get_community_edges",
    "get_community_info", "summarize_all", "summarize_community",
]
