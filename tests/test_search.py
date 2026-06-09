from comind import inbox, search

def test_find_devuelve_la_captura(tmp_store):
    inbox.add("reunión con el abogado el martes")
    inbox.add("comprar leche")
    hits = search.find("abogado")
    assert len(hits) == 1
    assert "abogado" in hits[0].text

def test_find_sin_distinguir_mayusculas(tmp_store):
    inbox.add("Proyecto CoMind")
    assert len(search.find("comind")) == 1
