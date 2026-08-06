// @l0 L0-002-R · @req UI-02/RESKIN
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCapturas } from "@/lib/hooks";
import { normalizeDictatedText } from "@/lib/text-utils";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Send,
  X,
  Keyboard,
  CheckCircle2,
} from "lucide-react";

// Detector de navegador/dispositivo
function getDispositivo(): string {
  if (typeof navigator === "undefined") return "PC";
  const ua = navigator.userAgent;
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone"))
    return "Móvil";
  if (ua.includes("Macintosh")) return "MacBook";
  if (ua.includes("Windows")) return "Windows PC";
  return "Web App";
}

export function CapturarModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { addCaptura } = useCapturas();
  const [texto, setTexto] = useState("");
  const [interimText, setInterimText] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [dictando, setDictando] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Tiempos de dictado
  const [segundosGrabados, setSegundosGrabados] = useState(0);
  const dictationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [wasNormalized, setWasNormalized] = useState(false);
  const [lastDictationDuration, setLastDictationDuration] = useState<
    number | null
  >(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard Escape closing and Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const getFocusableElements = () => {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    };

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    // Auto-focus first focusable element (usually the close button or textarea)
    setTimeout(() => {
      const focusables = getFocusableElements();
      // Prefer textarea to start typing immediately
      const txt = focusables.find((el) => el.tagName.toLowerCase() === "textarea");
      if (txt) {
        txt.focus();
      } else if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleTab);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleTab);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "es-MX";

        recognitionRef.current.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (final) {
            finalTranscriptRef.current += " " + final;
            setTexto((prev) => (prev + " " + final).trim());
          }
          setInterimText(interim);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setDictando(false);
        };

        recognitionRef.current.onend = () => {
          setDictando(false);
        };
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Timer del dictado
  useEffect(() => {
    if (dictando) {
      setSegundosGrabados(0);
      dictationTimerRef.current = setInterval(() => {
        setSegundosGrabados((s) => s + 1);
      }, 1000);
    } else {
      if (dictationTimerRef.current) {
        clearInterval(dictationTimerRef.current);
        if (segundosGrabados > 0) {
          setLastDictationDuration(segundosGrabados * 1000);
        }
      }
    }
    return () => {
      if (dictationTimerRef.current) clearInterval(dictationTimerRef.current);
    };
  }, [dictando]);

  const toggleDictado = useCallback(() => {
    if (!speechSupported || !recognitionRef.current) return;
    if (dictando) {
      recognitionRef.current.stop();
    } else {
      setInterimText("");
      setLastDictationDuration(null);
      recognitionRef.current.start();
      textareaRef.current?.focus();
      setDictando(true);
    }
  }, [dictando, speechSupported]);

  async function guardar() {
    let finalTexto = (texto + " " + interimText).trim();
    if (!finalTexto || guardando) return;

    const saveStartTime = Date.now();
    setGuardando(true);
    let normalizedFlag = false;

    try {
      if (dictando && recognitionRef.current) {
        recognitionRef.current.stop();
        setDictando(false);
      }

      const duracionFinal =
        lastDictationDuration ||
        (segundosGrabados > 0 ? segundosGrabados * 1000 : undefined);

      if (duracionFinal !== undefined && duracionFinal > 0) {
        const normalized = await normalizeDictatedText(finalTexto);
        if (normalized && normalized !== finalTexto) {
          finalTexto = normalized;
          normalizedFlag = true;
        }
      }

      const latenciaGuardado = Date.now() - saveStartTime;

      await addCaptura(
        finalTexto,
        "nota",
        duracionFinal !== undefined ? "voice" : "keyboard",
        {
          dispositivo: getDispositivo(),
          latenciaGuardado,
          ...(duracionFinal !== undefined
            ? { duracionDictado: duracionFinal }
            : {}),
        }
      );

      setTexto("");
      setInterimText("");
      finalTranscriptRef.current = "";
      setSegundosGrabados(0);
      setLastDictationDuration(null);

      setWasNormalized(normalizedFlag);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      onClose(); // Cerrar modal al guardar
    } catch (e) {
      console.error(e);
      alert("Error al guardar la captura localmente.");
    } finally {
      setGuardando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-none"
      >
        {/* Backdrop overlay attenuated using --khora-absolute */}
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{
            backgroundColor: "var(--khora-absolute)",
            opacity: 0.6,
          }}
          onClick={onClose}
        />

        {/* Modal Surface */}
        <motion.div
          ref={modalRef}
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          exit={{ y: 20 }}
          className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-none"
          style={{
            backgroundColor: "var(--khora-surface)",
            border: "1px solid var(--khora-accent)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: "var(--khora-accent)" }}
          >
            <h2
              className="font-semibold flex items-center gap-2"
              style={{ color: "var(--khora-ink)" }}
            >
              Capturar en Bitácora
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg cursor-pointer hover:opacity-85 focus-visible:outline focus-visible:outline-2"
              style={{
                color: "var(--khora-accent)",
                outlineColor: "var(--khora-accent)",
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 flex flex-col gap-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={texto + (interimText ? " " + interimText : "")}
                onChange={(e) => {
                  if (!dictando) setTexto(e.target.value);
                }}
                placeholder="Escribe o dicta tu entrada aquí..."
                className="w-full h-40 rounded-xl p-4 focus-visible:outline focus-visible:outline-2 resize-none"
                style={{
                  backgroundColor: "var(--khora-bg)",
                  color: "var(--khora-ink)",
                  border: "1px solid var(--khora-accent)",
                  outlineColor: "var(--khora-accent)",
                }}
                disabled={guardando}
              />

              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDictado}
                  disabled={!speechSupported || guardando}
                  className="p-3 rounded-xl cursor-pointer hover:opacity-85 focus-visible:outline focus-visible:outline-2"
                  style={{
                    backgroundColor: dictando ? "var(--khora-bg)" : "var(--khora-surface)",
                    color: "var(--khora-accent)",
                    border: "1px solid var(--khora-accent)",
                    outlineColor: "var(--khora-accent)"
                  }}
                  title={
                    !speechSupported
                      ? "Dictado no soportado en este navegador"
                      : dictando
                      ? "Detener dictado"
                      : "Iniciar dictado"
                  }
                >
                  {dictando ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  disabled={
                    (!texto.trim() && !interimText.trim()) || guardando
                  }
                  className="px-4 py-3 rounded-xl flex items-center gap-2 font-medium cursor-pointer hover:opacity-85 focus-visible:outline focus-visible:outline-2 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--khora-accent)",
                    color: "var(--khora-surface)",
                    border: "1px solid var(--khora-accent)",
                    outlineColor: "var(--khora-accent)"
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>{guardando ? "Guardando..." : "Guardar"}</span>
                </button>
              </div>
            </div>

            {/* Status Dictado */}
            <AnimatePresence>
              {dictando && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 rounded-xl px-4 py-2 animate-none"
                  style={{
                    backgroundColor: "var(--khora-bg)",
                    border: "1px solid var(--khora-accent)"
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--khora-accent)" }}
                  />
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--khora-ink)" }}
                  >
                    Escuchando...{" "}
                    {Math.floor(segundosGrabados / 60)}:
                    {(segundosGrabados % 60).toString().padStart(2, "0")}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
