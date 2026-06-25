from comind.esteg.codec import encode
from comind.esteg.e2e import run_slice, train_step


def test_train_step_updates_weight():
    assert train_step(0.0, 1.0, 1) != 0.0


def test_e2e_recovers_bit():
    for bit in (0, 1):
        result = run_slice("una frase real de prueba", bit)
        assert result["recovered_bit"] == bit


def test_slice_has_training_and_carrier():
    result = run_slice("frase", 1)
    assert result["weight_before"] != result["weight_after"]
    assert result["carrier"] == encode("frase", 1)
