"""Controlled probe contracts; no live graph/provider or acceptance claim."""
import json
from unittest.mock import MagicMock, patch

from api.probe_chat_public_readiness import inspect_public_metadata, main


def test_metadata_is_read_only_aggregate_and_parameterized():
    driver = MagicMock()
    session = driver.session.return_value.__enter__.return_value
    session.run.return_value.single.return_value = {
        "active_semantic_nodes": 3, "explicitly_public_nodes": 2,
        "public_technical_id_matches": 1,
    }
    assert inspect_public_metadata(driver, ["technical-id"])["explicitly_public_nodes"] == 2
    driver.session.assert_called_once_with(default_access_mode="READ")
    query = session.run.call_args.args[0]
    assert session.run.call_args.kwargs == {"ids": ["technical-id"]}
    for prohibited in ("n.label_original", "n.summary", "n.provenance", "CREATE ", "SET ", "DELETE ", "MERGE "):
        assert prohibited not in query


def test_probe_redacts_failures_and_never_rebuilds(capsys):
    with patch("api.probe_chat_public_readiness.GraphDatabase.driver", side_effect=RuntimeError("SECRET_SENTINEL")), \
         patch("api.probe_chat_public_readiness.em.embed_text", side_effect=RuntimeError("SECRET_SENTINEL")), \
         patch("api.probe_chat_public_readiness.em.rebuild_index") as rebuild:
        main()
    output = capsys.readouterr().out
    assert "SECRET_SENTINEL" not in output
    report = json.loads(output.split(" ", 1)[1])
    assert report["notes_read"] is False and report["graph_writes"] is False
    assert report["provider"]["verified"] is False
    rebuild.assert_not_called()