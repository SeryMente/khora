"""Presence-only diagnostics: no environment values, provider calls or corpus."""
import json
from api.main import _embedding_configuration_presence


def test_missing_embedding_configuration_is_explicit():
    state = _embedding_configuration_presence({})
    assert len(state) == 5
    assert all(value is False for value in state.values())


def test_existing_voyage_adapter_is_detected_without_exposing_values():
    secret = "private-canary-never-logged"
    state = _embedding_configuration_presence({
        "KHORA_EMBEDDINGS_BASE_URL": "https://api.voyageai.com/v1",
        "KHORA_EMBEDDINGS_API_KEY": secret,
        "KHORA_EMBEDDINGS_MODEL": "voyage-4-large",
    })
    assert state == dict(base_url_present=True, adapter_key_present=True,
                         model_present=True, voyage_key_alias_present=False,
                         voyage_model_matches_historical=True)
    assert secret not in json.dumps(state)
    assert "api.voyageai.com" not in json.dumps(state)
    assert "voyage-4-large" not in json.dumps(state)


def test_alias_does_not_masquerade_as_configured_adapter():
    state = _embedding_configuration_presence({"VOYAGE_API_KEY": "private-canary", "KHORA_EMBEDDINGS_API_KEY": "   "})
    assert state["voyage_key_alias_present"] is True
    assert state["adapter_key_present"] is False
    assert all(type(value) is bool for value in state.values())
