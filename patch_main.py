import re

with open("api/main.py", "r") as f:
    content = f.read()

replacement = """
        return {
            "io_id": objeto.id,
            "counters": {
                "create": acta.ideas_novedosas,
                "update": acta.matices,
                "ignore": acta.ideas_repetidas
            },
            "triples_escritos": acta.triples_escritos,
            "ts": acta.timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        if type(e).__name__ in ("HuerfanosDetectadosError", "IngestaFallidaError"):
            detail_payload = {"error": "ingesta revertida", "causa": str(e)}
            if hasattr(e, "huerfanos"):
                detail_payload["huerfanos"] = e.huerfanos
            raise HTTPException(status_code=409, detail=detail_payload)

        logging.error(f"Ingest error: {traceback.format_exc()}")
        if isinstance(e, ImportError):
            raise HTTPException(status_code=503, detail={"error": "motor no disponible", "causa": str(e)})
        raise HTTPException(status_code=500, detail=str(e))
"""

match_str = '''
        return {
            "io_id": objeto.id,
            "counters": {
                "create": acta.ideas_novedosas,
                "update": acta.matices,
                "ignore": acta.ideas_repetidas
            },
            "ts": acta.timestamp
        }
    except Exception as e:
        logging.error(f"Ingest error: {traceback.format_exc()}")
        if isinstance(e, ImportError):
            raise HTTPException(status_code=503, detail={"error": "motor no disponible", "causa": str(e)})
        raise HTTPException(status_code=500, detail=str(e))
'''

content = content.replace(match_str.strip("\n"), replacement.strip("\n"))

with open("api/main.py", "w") as f:
    f.write(content)
