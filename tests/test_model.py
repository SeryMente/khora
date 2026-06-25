from comind.esteg.model import ModelPort, TinyHead, frozen_embedding, predict


def test_forward_returns_logits():
    logits = TinyHead().forward("hola")
    assert len(logits) == 2
    assert all(isinstance(v, float) for v in logits)


def test_access_through_port():
    model: ModelPort = TinyHead()
    assert len(predict(model, "hola")) == 2


def test_embeddings_are_frozen():
    a = frozen_embedding("hola")
    head = TinyHead()
    head.weights = [1.0] * head.dim
    assert frozen_embedding("hola") == a
