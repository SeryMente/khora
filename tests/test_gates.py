from comind.blackbox.sealed import SEALED_FIELDS
from comind.esteg import public_view
from comind.esteg.codec import decode, encode
from comind.esteg.dataset import build_dataset
from comind.esteg.eval import cross_validate
from comind.esteg.train import train
from comind.inbox import add


def test_gate_provenance(tmp_path, monkeypatch):
    monkeypatch.setenv("COMIND_DB", str(tmp_path / "gate.db"))
    cap = add("frase real de prueba", source="gate")
    assert cap.source == "gate"
    assert cap.id and cap.hash
    assert cap.text == "frase real de prueba"


def test_gate_idempotencia():
    for bit in (0, 1):
        c1 = encode("mensaje base", bit)
        c2 = encode("mensaje base", bit)
        assert c1 == c2
        assert decode(c1) == bit


def test_gate_aislamiento():
    data: dict[str, object] = {"text": "hola", "sealed_secret": "NO_EXPONER"}
    view = public_view(data)
    for field in SEALED_FIELDS:
        assert field not in view
    assert view["text"] == "hola"


def _marker_label(carrier: str, sentence: str) -> int:
    return 1 if len(carrier) > len(sentence) else 0


def test_gate_perdida_baja():
    frases = ["frase uno aca", "frase dos alla", "tercera linea", "cuarta nota fin"]
    data = build_dataset(frases)
    samples = [(ex.carrier, _marker_label(ex.carrier, ex.sentence)) for ex in data]
    result = train(samples, epochs=40)
    assert result.losses[-1] < result.losses[0]


def _separable() -> list[tuple[str, int]]:
    cortos = ["ab", "cd", "ef", "gh", "ij", "kl"]
    largos = ["abcdefgh", "ijklmnop", "qrstuvwx", "bcdefghi", "jklmnopq", "rstuvwxy"]
    return [(t, 1) for t in cortos] + [(t, 0) for t in largos]


def test_gate_lectura_mayor_azar():
    report = cross_validate(_separable())
    assert report.verdict == "lectura > azar"
    assert report.low > 0.5
