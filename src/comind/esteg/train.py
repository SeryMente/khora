"""Loop de entrenamiento real (full-batch GD) sobre embeddings congelados."""
import math
from dataclasses import dataclass

from comind.esteg.model import frozen_embedding

DIM = 8


@dataclass
class TrainResult:
    weights: list[float]
    bias: float
    losses: list[float]


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def train(samples: list[tuple[str, int]], epochs: int = 60, lr: float = 1.0) -> TrainResult:
    weights = [0.0] * DIM
    bias = 0.0
    losses: list[float] = []
    feats = [(frozen_embedding(text), label) for text, label in samples]
    n = max(len(feats), 1)
    eps = 1e-9
    for _ in range(epochs):
        grad_w = [0.0] * DIM
        grad_b = 0.0
        total = 0.0
        for x, y in feats:
            z = sum(w * xi for w, xi in zip(weights, x)) + bias
            p = _sigmoid(z)
            error = p - y
            for i in range(DIM):
                grad_w[i] += error * x[i]
            grad_b += error
            total += -(y * math.log(p + eps) + (1 - y) * math.log(1 - p + eps))
        for i in range(DIM):
            weights[i] -= lr * grad_w[i] / n
        bias -= lr * grad_b / n
        losses.append(total / n)
    return TrainResult(weights, bias, losses)
