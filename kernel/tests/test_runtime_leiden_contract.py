# @l0 L0-002-R / @req KA-00/REQ-2 / @acr ACR-2.1 / @ua UA-46,UA-47
import re
from importlib.metadata import version
from pathlib import Path
from types import SimpleNamespace

import networkx as nx

import khora_kernel.communities as communities

def test_projection_revision_is_independent_of_undirected_insertion_order():
    a = nx.Graph()
    a.add_nodes_from(["alice", "bob"])
    a.add_edge("alice", "bob", weight=2.0)
    b = nx.Graph()
    b.add_nodes_from(["bob", "alice"])
    b.add_edge("bob", "alice", weight=2.0)
    assert communities._manifest(a) == communities._manifest(b)

def test_manifest_records_installed_leiden_distribution_version(tmp_path, monkeypatch):
    graph = nx.path_graph(["alice", "bob", "carol"])
    monkeypatch.setattr(communities, "MANIFEST_DIR", tmp_path)
    monkeypatch.setattr(communities, "_semantic_projection", lambda memory: (graph, communities._manifest(graph)))
    memory = SimpleNamespace(get_graph_revision=lambda: "synthetic-revision")
    manifest = communities.recalcular_leiden("synthetic-io", memory, "2026-10-17T00:00:00Z")
    assert manifest["algorithm"]["version"] == version("leidenalg")

def test_render_runtime_declares_community_dependencies():
    root = Path(__file__).resolve().parents[2]
    requirements = (root / "api" / "requirements.txt").read_text(encoding="utf-8")
    names = {re.split(r"[<>=!~\[]", line.strip(), maxsplit=1)[0].lower() for line in requirements.splitlines() if line.strip() and not line.startswith(("#", "-"))}
    assert {"networkx", "igraph", "leidenalg"} <= names
