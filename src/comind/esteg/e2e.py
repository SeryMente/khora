"""Rebanada vertical e2e: frase -> encode -> 1 paso -> decode."""
from comind.esteg.codec import decode, encode


def feature(carrier: str) -> float:
    return float(len(carrier) % 2)


def train_step(w: float, x: float, y: int, lr: float = 0.1) -> float:
    pred = w * x
    error = pred - y
    return w - lr * error * x


def run_slice(text: str, bit: int) -> dict[str, object]:
    carrier = encode(text, bit)
    before = 0.0
    after = train_step(before, feature(carrier), bit)
    return {
        "carrier": carrier,
        "weight_before": before,
        "weight_after": after,
        "recovered_bit": decode(carrier),
    }
