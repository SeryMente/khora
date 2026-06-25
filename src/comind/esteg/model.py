"""Puerto de modelo (D2): embedder congelado + cabeza -> logits."""
from typing import Protocol


class ModelPort(Protocol):
    def forward(self, text: str) -> list[float]:
        """Devuelve logits para el texto dado."""
        ...


def frozen_embedding(text: str, dim: int = 8) -> list[float]:
    vec = [0.0] * dim
    for i, ch in enumerate(text):
        vec[i % dim] += float(ord(ch) % 7)
    norm = sum(v * v for v in vec) ** 0.5
    if norm == 0.0:
        return vec
    return [v / norm for v in vec]


class TinyHead:
    def __init__(self, dim: int = 8) -> None:
        self.dim = dim
        self.weights = [0.0] * dim
        self.bias = 0.0

    def forward(self, text: str) -> list[float]:
        x = frozen_embedding(text, self.dim)
        score = sum(w * xi for w, xi in zip(self.weights, x)) + self.bias
        return [-score, score]


def predict(model: ModelPort, text: str) -> list[float]:
    return model.forward(text)
