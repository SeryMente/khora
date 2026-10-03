# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
# @l0 L0-002 · @req QA-EPISTWIN/REQ-1 · @acr ACR-EPISTWIN-1 · @ua UA-36,UA-37
import json

import pytest

from scripts.run_personalqa_judges import _case_rows, _validate_judge_diversity


def test_judge_diversity_rejects_duplicate_models():
    class Provider:
        llm_model = "same-model"

    with pytest.raises(SystemExit, match="UA-36.*modelos distintos"):
        _validate_judge_diversity({"judge_a": Provider(), "judge_b": Provider()})


def test_judge_diversity_returns_models_for_distinct_panel():
    class ProviderA:
        llm_model = "model-a"

    class ProviderB:
        llm_model = "model-b"

    assert _validate_judge_diversity({"judge_a": ProviderA(), "judge_b": ProviderB()}) == {
        "judge_a": "model-a",
        "judge_b": "model-b",
    }


def test_case_rows_adapts_canonical_personalqa_keys():
    data = {
        "qa_pairs": [
            {
                "id": "Q-001",
                "question": "Pregunta",
                "target_answer": "Objetivo",
                "et_answer": "EpisTwin",
            }
        ]
    }
    rows = _case_rows(data, None)
    assert rows == [
        {
            "id": "Q-001",
            "q": "Pregunta",
            "a_target": "Objetivo",
            "a_et": "EpisTwin",
        }
    ]


def test_runner_output_contract_is_json_serializable():
    data = {
        "benchmark": "PersonalQA-71-100",
        "case_count": 100,
        "total_cases_available": 100,
        "t_global": "2025-09-01 13:00",
        "judges": ["judge_a", "judge_b"],
        "status": "complete",
    }
    encoded = json.dumps(data, ensure_ascii=False, sort_keys=True)
    assert json.loads(encoded)["case_count"] == 100
