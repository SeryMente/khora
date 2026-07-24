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
