"""Habla Cifrada (lazo ESTEG)."""
from comind.blackbox.sealed import SEALED_FIELDS


def public_view(data: dict[str, object]) -> dict[str, object]:
    """Vista publica: nunca expone campos sellados."""
    return {k: v for k, v in data.items() if k not in SEALED_FIELDS}
