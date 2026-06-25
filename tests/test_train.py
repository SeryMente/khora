from comind.esteg.dataset import build_dataset
from comind.esteg.train import train


def _real_samples() -> list[tuple[str, int]]:
    frases = [
        "Hoy avance el ensamble CoMind.",
        "La rebanada e2e ya corre completa.",
        "El codec por paridad recupera el bit.",
        "El puerto de modelo permite swap futuro.",
    ]
    data = build_dataset(frases)
    return [(ex.carrier, 1 if ex.carrier.endswith("!") else 0) for ex in data]


def test_loss_decreases_over_epochs():
    result = train(_real_samples(), epochs=60)
    assert len(result.losses) == 60
    assert result.losses[-1] < result.losses[0]


def test_loss_is_monotonic():
    result = train(_real_samples(), epochs=40)
    for a, b in zip(result.losses, result.losses[1:]):
        assert b <= a + 1e-9
