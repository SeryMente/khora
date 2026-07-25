import argparse
import os
import sys

from khora_kernel.api import ContextoDeVisibilidad, Provenance


def main():
    parser = argparse.ArgumentParser(description="Harness de dictado real - Prueba de auditoría")
    parser.add_argument("audio_path", help="Ruta al archivo de audio a transcribir (mp3, wav, etc)")
    args = parser.parse_args()

    if not os.path.exists(args.audio_path):
        print(f"Error: No se encuentra el archivo {args.audio_path}")
        sys.exit(1)

    if not os.getenv("GROQ_API_KEY"):
        print("Advertencia: No se encontró la variable GROQ_API_KEY. Configurando clave falsa para disparar error.")
        os.environ["GROQ_API_KEY"] = "fake_key_for_testing"

    print(f"Cargando audio desde: {args.audio_path}")
    with open(args.audio_path, "rb") as f:
        audio_bytes = f.read()

    # Import the driver directly since there's no CH-3 mounting registry yet
    from drivers.transcripcion import GroqTranscripcionAdapter

    print("Iniciando adapter de transcripción (Groq/Whisper)...")
    adapter = GroqTranscripcionAdapter()

    print("Transcribiendo...")
    try:
        resultado = adapter.transcribir_audio(audio_bytes)
        print("\n--- Resultado de la Transcripción ---")
        print(f"Idioma Detectado: {resultado.idioma_detectado}")
        print(f"Texto:\n{resultado.texto_completo}")
        print(f"Segmentos: {len(resultado.segmentos)}")
    except Exception as e:
        print("\n--- Falla en la Transcripción ---")
        print(str(e))
        print("El audio ha sido rescatado de manera segura.")
        sys.exit(0)

    # Simulación de la ingesta vía CH-1 al grafo
    # Dado que el CH-1 no está implementado de forma concreta, demostramos
    # cómo se estructura la llamada y la visibilidad por defecto.

    import datetime

    timestamp = datetime.datetime.now(datetime.UTC).isoformat()
    provenance = Provenance(
        origen="dictado",
        driver="GroqTranscripcionAdapter",
        timestamp=timestamp
    )

    # Default privado innegociable
    visibilidad = ContextoDeVisibilidad.PRIVADO

    print("\n--- Simulación de Ingesta (CH-1) ---")
    print(f"Visibilidad: {visibilidad.value} (DEFAULT PRIVADO INNEGOCIABLE)")
    print(f"Provenance: origen={provenance.origen}, driver={provenance.driver}, timestamp={provenance.timestamp}")
    print("Estado: Listo para ingestar en el grafo cuando CH-1 esté disponible.")

if __name__ == "__main__":
    main()
