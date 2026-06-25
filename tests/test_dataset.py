from comind.esteg.codec import decode
from comind.esteg.dataset import build_dataset, split_no_leak


def test_balanced_and_augmented():
    data = build_dataset(["uno", "dos", "tres"])
    assert len(data) == 6
    bits = [ex.bit for ex in data]
    assert bits.count(0) == bits.count(1) == 3


def test_split_has_no_leak():
    data = build_dataset(["uno", "dos", "tres", "cuatro"])
    train, hold = split_no_leak(data, holdout=1)
    train_s = {ex.sentence for ex in train}
    hold_s = {ex.sentence for ex in hold}
    assert train_s.isdisjoint(hold_s)
    assert len(hold_s) == 1


def test_carrier_round_trips():
    for ex in build_dataset(["hola"]):
        assert decode(ex.carrier) == ex.bit
