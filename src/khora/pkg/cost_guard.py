import json
import os
import datetime
from functools import wraps
from typing import Literal, Optional, Dict

class LLMBudgetExceededError(Exception):
    pass

class CostGuard:
    def __init__(self, max_usd: float, mode: Literal["cut", "queue"] = "cut", pricing_config: Optional[Dict[str, float]] = None):
        self.max_usd = max_usd
        self.mode = mode

        if pricing_config is None:
            pricing_json = os.environ.get("PRICING_JSON")
            if pricing_json:
                try:
                    self.pricing_config = json.loads(pricing_json)
                except Exception:
                    self.pricing_config = {"gpt-4": 0.03, "gpt-3.5-turbo": 0.002}
            else:
                self.pricing_config = {"gpt-4": 0.03, "gpt-3.5-turbo": 0.002}
        else:
            self.pricing_config = pricing_config

        self.redis_client = None
        try:
            import redis
            redis_url = os.environ.get("REDIS_URL")
            if redis_url:
                self.redis_client = redis.from_url(redis_url)
        except ImportError:
            pass

        self._memory_store = {}
        self.queue = []

    def _get_daily_key(self) -> str:
        date_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        return f"llm_cost_{date_str}"

    def _get_current_cost(self, key: str) -> float:
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val:
                    return float(val)
            except Exception:
                pass
        return float(self._memory_store.get(key, 0.0))

    def _set_current_cost(self, key: str, value: float) -> None:
        if self.redis_client:
            try:
                self.redis_client.set(key, str(value))
                return
            except Exception:
                pass
        self._memory_store[key] = value

    def check_and_register(self, estimated_tokens: int, model: str) -> bool:
        price_per_token = self.pricing_config.get(model, 0.0)
        estimated_cost = estimated_tokens * price_per_token

        key = self._get_daily_key()
        current_cost = self._get_current_cost(key)

        if current_cost + estimated_cost > self.max_usd:
            if self.mode == "cut":
                raise LLMBudgetExceededError(f"Budget exceeded. Max: {self.max_usd}, would reach: {current_cost + estimated_cost}")
            elif self.mode == "queue":
                self.queue.append({
                    "estimated_tokens": estimated_tokens,
                    "model": model,
                    "estimated_cost": estimated_cost
                })
                return False

        self._set_current_cost(key, current_cost + estimated_cost)
        return True


_default_guard = None

def get_default_guard() -> CostGuard:
    global _default_guard
    if _default_guard is None:
        try:
            max_usd = float(os.environ.get("MAX_LLM_COST_USD", "10.0"))
        except ValueError:
            max_usd = 10.0
        mode_env = os.environ.get("MODE", "cut")
        mode: Literal["cut", "queue"] = "queue" if mode_env == "queue" else "cut"
        _default_guard = CostGuard(max_usd=max_usd, mode=mode)
    return _default_guard

def reset_default_guard():
    global _default_guard
    _default_guard = None

def with_cost_guard(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        model = kwargs.get('model', 'gpt-3.5-turbo')
        estimated_tokens = kwargs.get('estimated_tokens', 1000)

        guard = get_default_guard()

        can_proceed = guard.check_and_register(estimated_tokens, model)
        if not can_proceed and guard.mode == "queue":
            guard.queue.append({
                "func_name": func.__name__,
                "args": args,
                "kwargs": kwargs
            })
            return {"status": "queued"}

        return func(*args, **kwargs)
    return wrapper
