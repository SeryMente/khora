import json

from scripts.run_personalqa_judges import _case_rows


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
