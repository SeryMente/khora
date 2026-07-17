import pytest
import datetime
from unittest.mock import patch
from khora.pkg.cost_guard import CostGuard, LLMBudgetExceededError, with_cost_guard, reset_default_guard

def test_cost_guard_cut_mode():
    guard = CostGuard(max_usd=0.05, mode="cut", pricing_config={"test-model": 0.01})

    # 1st call: cost = 0.03 -> Total 0.03
    assert guard.check_and_register(3, "test-model") is True

    # 2nd call: cost = 0.02 -> Total 0.05
    assert guard.check_and_register(2, "test-model") is True

    # 3rd call: cost = 0.01 -> Total 0.06 > 0.05. Should raise
    with pytest.raises(LLMBudgetExceededError):
        guard.check_and_register(1, "test-model")

def test_cost_guard_queue_mode():
    guard = CostGuard(max_usd=0.05, mode="queue", pricing_config={"test-model": 0.01})

    # 1st call: cost = 0.03 -> Total 0.03
    assert guard.check_and_register(3, "test-model") is True

    # 2nd call: cost = 0.03 -> Total 0.06 > 0.05. Should enqueue and return False
    assert guard.check_and_register(3, "test-model") is False
    assert len(guard.queue) == 1
    assert guard.queue[0]["estimated_tokens"] == 3

@patch("khora.pkg.cost_guard.datetime")
def test_cost_guard_daily_reset(mock_datetime):
    # Setup initial date
    mock_date_1 = datetime.datetime(2023, 1, 1, tzinfo=datetime.timezone.utc)
    mock_datetime.datetime.now.return_value = mock_date_1
    mock_datetime.timezone = datetime.timezone

    guard = CostGuard(max_usd=0.05, mode="cut", pricing_config={"test-model": 0.01})

    # Fill budget
    assert guard.check_and_register(5, "test-model") is True

    # Next call on same day should fail
    with pytest.raises(LLMBudgetExceededError):
        guard.check_and_register(1, "test-model")

    # Change date to next day
    mock_date_2 = datetime.datetime(2023, 1, 2, tzinfo=datetime.timezone.utc)
    mock_datetime.datetime.now.return_value = mock_date_2

    # Budget should be reset
    assert guard.check_and_register(1, "test-model") is True

def test_with_cost_guard_decorator(monkeypatch):
    monkeypatch.setenv("MAX_LLM_COST_USD", "0.05")
    monkeypatch.setenv("MODE", "cut")
    monkeypatch.setenv("PRICING_JSON", '{"test-model": 0.01}')
    reset_default_guard()

    @with_cost_guard
    def dummy_llm_call(model="test-model", estimated_tokens=1000):
        return "success"

    # Call 1: 3 tokens -> 0.03
    assert dummy_llm_call(model="test-model", estimated_tokens=3) == "success"

    # Call 2: 2 tokens -> 0.05
    assert dummy_llm_call(model="test-model", estimated_tokens=2) == "success"

    # Call 3: 1 token -> 0.06 -> exceeds 0.05
    with pytest.raises(LLMBudgetExceededError):
        dummy_llm_call(model="test-model", estimated_tokens=1)
