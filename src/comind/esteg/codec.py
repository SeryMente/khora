"""Codificador por regla de 1 bit (carrier por paridad)."""


def encode(text: str, bit: int) -> str:
    if bit not in (0, 1):
        raise ValueError("bit debe ser 0 o 1")
    if sum(ord(c) for c in text) % 2 == bit:
        return text
    return text + "!"


def decode(carrier: str) -> int:
    return sum(ord(c) for c in carrier) % 2
