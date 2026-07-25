# @l0 L0-002 · @req ING-02/REQ-1,REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1,ACR-2.2,ACR-2.3 · @ua UA-07,UA-08,UA-09,UA-41
import os
import json
import urllib.request
import urllib.error

class AudioTranscriptionError(Exception):
    pass

class AdaptadorAudioCora:
    def __init__(self):
        self.url = os.environ.get("AUDIO_TRANSCRIPTION_URL")
        self.key = os.environ.get("AUDIO_TRANSCRIPTION_KEY")

    def transcribir(self, audio_bytes: bytes, filename: str = "audio.mp3") -> str:
        """
        Transcribe audio calling a Whisper-compatible HTTP API.
        """
        if not self.url or not self.key:
            return "[SKIP] Transcripción de audio no configurada. URL o KEY faltantes."

        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

        # Build multipart/form-data body
        body = b""
        body += f"--{boundary}\r\n".encode("utf-8")
        body += f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n".encode("utf-8")
        body += b"Content-Type: application/octet-stream\r\n\r\n"
        body += audio_bytes
        body += b"\r\n"
        body += f"--{boundary}\r\n".encode("utf-8")
        body += b"Content-Disposition: form-data; name=\"model\"\r\n\r\n"
        body += b"whisper-1\r\n"
        body += f"--{boundary}--\r\n".encode("utf-8")

        headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}"
        }

        req = urllib.request.Request(self.url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as response:
                resp_body = response.read()
                data = json.loads(resp_body.decode("utf-8"))
                return data.get("text", "")
        except urllib.error.HTTPError as e:
            raise AudioTranscriptionError(f"HTTP Error {e.code}: {e.reason}")
        except urllib.error.URLError as e:
            raise AudioTranscriptionError(f"URL Error: {e.reason}")
        except json.JSONDecodeError:
            raise AudioTranscriptionError("Invalid JSON response from transcription service.")
