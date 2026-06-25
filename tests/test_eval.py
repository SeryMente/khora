from comind.esteg.dataset import build_dataset
from comind.esteg.eval import _verdict, cross_validate


def _real_samples() -> list[tuple[str, int]]:
    frases = [
        "Hoy avance el ensamble CoMind sin parar.",
        "La rebanada e2e ya corre completa hoy.",
        "El codec por paridad recupera el bit.",
        "El puerto de modelo permite swap futuro.",
        "La frontera sella el payload de caja negra.",
        "GraphRAG consumira el grafo con provenance.",
        "El juez exige ruff pyright y pytest.",
        "El candado del viernes quedo cerrado antes.",
    ]
    data = build_dataset(frases)
    return [(ex.carrier, 1 if ex.carrier.endswith("!") else 0) for ex in data]


def test_verdict_rule():
    assert _verdict(0.6) == "lectura > azar"
    assert _verdict(0.5) == "sin dato concluyente"
    assert _verdict(0.49) == "sin dato concluyente"


def test_report_consistent_and_reproducible():
    a = cross_validate(_real_samples())
    b = cross_validate(_real_samples())
    assert (a.mean, a.std, a.verdict) == (b.mean, b.std, b.verdict)
    assert 0.0 <= a.mean <= 1.0 and a.std >= 0.0
    assert abs(a.low - (a.mean - a.std)) < 1e-9
    assert a.verdict == _verdict(a.low)
