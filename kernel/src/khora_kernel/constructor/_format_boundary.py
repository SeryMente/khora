# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
# @l0 L0-002 · @req ING-02/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-2.2,ACR-2.3 · @ua UA-07,UA-08,UA-09,UA-41
import io
import zipfile


class FormatoNoSoportado(Exception):
    pass

def verificar_frontera(contenido: bytes) -> str:
    """
    Verifica el formato del archivo por su contenido (magic numbers),
    retorna el tipo o levanta FormatoNoSoportado.
    """
    if contenido.startswith(b"%PDF-"):
        return "pdf"
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if contenido.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if contenido.startswith(b"RIFF") and len(contenido) >= 12 and contenido[8:12] == b"WEBP":
        return "webp"

    # Audio
    if contenido.startswith(b"ID3") or contenido.startswith(b"\xff\xfb") or contenido.startswith(b"\xff\xfa") or contenido.startswith(b"\xff\xf2") or contenido.startswith(b"\xff\xf3"):
        return "mp3"

    if len(contenido) >= 8 and contenido[4:8] == b"ftyp":
        return "m4a"

    if contenido.startswith(b"RIFF") and len(contenido) >= 12 and contenido[8:12] == b"WAVE":
        return "wav"

    # ZIP-based (DOCX, XLSX, PPTX)
    if contenido.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(contenido)) as zf:
                nombres = zf.namelist()
                if any(n.startswith("xl/") for n in nombres):
                    raise FormatoNoSoportado("Contenedor binario rechazado: XLSX")
                if any(n.startswith("ppt/") for n in nombres):
                    raise FormatoNoSoportado("Contenedor binario rechazado: PPTX")
                if any(n.startswith("word/") for n in nombres):
                    return "docx"
        except zipfile.BadZipFile:
            pass
        # Si es un zip pero no tiene word, xl, o ppt, dejamos que intente UTF-8 (aunque fallará).

    # Fallback texto puro UTF-8
    try:
        texto = contenido.decode('utf-8')
        # Check for unexpected control characters (allow tab, newline, carriage return)
        for char in texto:
            if ord(char) < 32 and char not in ('\t', '\n', '\r'):
                raise FormatoNoSoportado("Contenedor binario desconocido o caracteres de control no permitidos.")
        return "texto"
    except UnicodeDecodeError:
        raise FormatoNoSoportado("Contenedor binario desconocido o codificación inválida.")
