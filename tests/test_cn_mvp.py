"""Prueba real CN-MVP: ingesta sellada, verificable y legible por el bucle."""
from pathlib import Path

from comind.blackbox.store import list_public
from comind.cn import ingest_datum, to_training_examples


def test_ingesta_sella_y_no_filtra(tmp_path: Path) -> None:
    entrada = "mi-recuerdo-real-2026"
    record = ingest_datum(entrada, 1, tmp_path)
    assert record.text == entrada
    assert record.bit == 1
    pub = list_public(tmp_path)
    assert len(pub) == 1
    assert "sealed_secret" not in pub[0]
    assert entrada not in pub[0].values()
    raw = (tmp_path / "blackbox.jsonl").read_text(encoding="utf-8")
    assert entrada not in raw


def test_persistencia_verificable_por_hash(tmp_path: Path) -> None:
    record = ingest_datum("dato-verificable", 0, tmp_path)
    pub = list_public(tmp_path)
    assert pub[0]["seal_hash"] == record.derived_from


def test_legible_por_el_bucle(tmp_path: Path) -> None:
    record = ingest_datum("frase-para-entrenar", 1, tmp_path)
    examples = to_training_examples(record)
    assert len(examples) == 1
    assert examples[0].bit == 1
    assert examples[0].sentence == "frase-para-entrenar"
    assert isinstance(examples[0].carrier, str)
    assert examples[0].carrier
