import os
import sys

from khora.nous.cobertura.extractor import extraer_cobertura

def main():
    texto = os.environ.get("TEXTO_ENTRADA", "").strip()
    if not texto:
        print("No se proporcionó texto de entrada. Saliendo.")
        sys.exit(0)

    print(f"Evaluando texto: {texto}")
    resultado = extraer_cobertura(texto)

    print("-------------------------")
    print(f"Cobertura inicio: {resultado.inicio}")
    print(f"Cobertura fin: {resultado.fin}")
    print(f"Horas cubiertas: {resultado.horas_cubiertas}")
    print(f"Confianza: {resultado.confianza}")
    print(f"Evidencia: {resultado.evidencia}")
    print(f"Nivel Evidencia: {resultado.nivel_evidencia}")
    print("-------------------------")

if __name__ == "__main__":
    main()
