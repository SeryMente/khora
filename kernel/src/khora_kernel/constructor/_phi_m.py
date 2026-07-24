# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06

from khora_kernel.api import ObjetoDeInformacion, Triple


def phi_m(objeto: ObjetoDeInformacion) -> list[Triple]:
    """
    ΦM: Generación determinista de triples a partir de metadatos.
    """
    triples = []
    mapa_conocido = {
        "fecha": "OCCURRED_AT",
        "date": "OCCURRED_AT",
        "fuente": "FROM_SOURCE",
        "source": "FROM_SOURCE",
        "ubicacion": "LOCATED_AT",
        "location": "LOCATED_AT",
        "autor": "CREATED_BY",
        "author": "CREATED_BY"
    }

    # Ordenar claves para garantizar determinismo
    claves_ordenadas = sorted(objeto.metadata.keys())

    for k in claves_ordenadas:
        v = objeto.metadata[k]
        relacion = mapa_conocido.get(k.lower(), f"HAS_METADATA_{k.upper()}")

        # Generar ID determinista basado en hash para evitar estado y asegurar mismo byte a byte
        import hashlib
        id_hash = hashlib.sha256(f"{objeto.id}-{relacion}-{v}".encode()).hexdigest()[:16]

        triple = Triple(
            id=f"t-{id_hash}",
            origen_id=objeto.id,
            destino_id=str(v),
            relacion=relacion,
            provenance=objeto.provenance,
            metadata={},
            valid_at=objeto.provenance.timestamp,
            invalid_at=None,
            created_at=objeto.provenance.timestamp
        )
        triples.append(triple)

    return triples
