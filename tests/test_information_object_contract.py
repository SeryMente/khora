import os
import hashlib

def test_information_object_contract_frozen():
    """
    Test para garantizar que la interfaz InformationObject no se modifique por error.
    Si cambias la interfaz intencionalmente, actualiza el hash esperado aquí.
    Tarjeta: [URL_TARJETA_J1]
    """
    filepath = "khora-web/lib/information-object.ts"
    assert os.path.exists(filepath), f"El archivo {filepath} no existe."

    with open(filepath, "r", encoding="utf-8", newline="") as f:
        content = f.read()

    # Normalizamos los saltos de línea a LF (\n) para evitar
    # que el hash cambie por culpa de git core.autocrlf en CI.
    content_normalized = content.replace("\r\n", "\n")

    # Calcular hash SHA-256 del contenido
    sha256_hash = hashlib.sha256(content_normalized.encode("utf-8")).hexdigest()

    # Este es el hash esperado para la versión inicial del contrato.
    # Si la prueba falla porque cambiaste el contrato intencionalmente,
    # actualiza este valor.
    expected_hash = "eb91b24323b783dbea5a1113796d7184f6e29fdb4a7f63a0237b7dc91a92af78"

    assert sha256_hash == expected_hash, (
        f"El hash del contrato InformationObject ha cambiado.\n"
        f"Esperado: {expected_hash}\n"
        f"Actual:   {sha256_hash}\n"
        f"Si este cambio fue intencional, actualiza 'expected_hash' en tests/test_information_object_contract.py"
    )
