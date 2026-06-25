"""Constructor de dataset esteg: aumento por bit + split sin fuga."""
from dataclasses import dataclass

from comind.esteg.codec import encode


@dataclass(frozen=True)
class Example:
    sentence: str
    bit: int
    carrier: str


def build_dataset(sentences: list[str], bits: tuple[int, ...] = (0, 1)) -> list[Example]:
    data: list[Example] = []
    for sentence in sentences:
        for bit in bits:
            data.append(Example(sentence, bit, encode(sentence, bit)))
    return data


def split_no_leak(data: list[Example], holdout: int = 1) -> tuple[list[Example], list[Example]]:
    sentences = sorted({ex.sentence for ex in data})
    hold = set(sentences[:holdout])
    train = [ex for ex in data if ex.sentence not in hold]
    test = [ex for ex in data if ex.sentence in hold]
    return train, test
