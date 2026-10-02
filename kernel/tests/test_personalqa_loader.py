# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import pytest

from khora_kernel.personalqa_loader import PersonalQALoader, PersonalQAValidationError


def test_loader_validates_dataset():
    # Since the generated dataset is placed in the expected path,
    # the loader should find it and validate it without throwing errors.
    loader = PersonalQALoader()
    data = loader.load_and_validate()

    assert data["t_global"] == "2025-09-01 13:00"
    assert len(data["information_objects"]) == 71
    assert len(data["qa_pairs"]) == 100

def test_loader_validation_errors(tmp_path):
    # Test invalid t_global
    invalid_data_path = tmp_path / "invalid_personalqa.json"
    with open(invalid_data_path, "w") as f:
        f.write('{"t_global": "2024-01-01 00:00"}')

    loader = PersonalQALoader(dataset_path=str(invalid_data_path))
    with pytest.raises(PersonalQAValidationError, match="t_global must be exactly '2025-09-01 13:00'"):
        loader.load_and_validate()


def test_loader_rejects_object_after_t_global(tmp_path):
    import json

    objects = [
        {"id": f"obj_{i}", "source": "Events", "timestamp": "2025-08-01T00:00:00", "content": "x", "metadata": {}}
        for i in range(71)
    ]
    objects[-1]["timestamp"] = "2025-09-02T00:00:00"
    payload = {
        "t_global": "2025-09-01 13:00",
        "information_objects": objects,
        "qa_pairs": [{}] * 100,
    }
    path = tmp_path / "future.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(PersonalQAValidationError, match="occurs after t_global"):
        PersonalQALoader(str(path)).load_and_validate()
