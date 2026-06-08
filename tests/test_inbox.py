from comind import inbox

def test_add_then_get_roundtrip(tmp_store):
    c = inbox.add("comprar pan", source="cli")
    traido = inbox.get(c.id)
    assert traido is not None
    assert traido.text == "comprar pan"
    assert traido.id == c.id

def test_hash_estable_id_unico(tmp_store):
    a = inbox.add("misma cosa")
    b = inbox.add("misma cosa")
    assert a.hash == b.hash   # mismo contenido => mismo hash
    assert a.id != b.id       # pero son capturas distintas
