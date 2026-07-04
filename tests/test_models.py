from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from khora.models import RawCapture, Modality, PIPELINE_VERSION

def test_rawcapture_exige_texto():
    with pytest.raises(ValidationError):
        RawCapture.model_validate(
            {"id": "1", "timestamp": datetime.now(timezone.utc),
             "source": "cli", "hash": "x"}  # falta text -> debe fallar
        )

def test_rawcapture_roundtrip_json():
    c = RawCapture(id="1", timestamp=datetime(2026, 6, 9, tzinfo=timezone.utc),
                   source="cli", text="hola", hash="abc")
    assert RawCapture.model_validate_json(c.model_dump_json()) == c
    assert c.modality is Modality.text
    assert c.pipeline_version == PIPELINE_VERSION
