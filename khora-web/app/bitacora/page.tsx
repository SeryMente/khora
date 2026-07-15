"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useCapturas } from "@/lib/hooks";
import { checkAuthSession, setAuthSession, clearAuthSession } from "@/lib/auth";
import { hasCryptoState, verifyPIN, setupCryptoEnvironment } from "@/lib/crypto";
import { verifyChainHealth, type ChainHealthResult } from "@/lib/chain-health";
import { motion, AnimatePresence } from "motion/react";
import { normalizeDictatedText } from "@/lib/text-utils";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Bed,
  MapPin,
  FileText,
  Calendar,
  Lightbulb,
  Search,
  Info,
  Database,
  Keyboard,
  Clock,
  Activity,
  Layers,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn
} from "lucide-react";

// Formateador de estado de persistencia
function estadoNota(captura: any, isSyncing: boolean): { texto: string; clase: string } {
  if (captura.status === "synced") {
    return {
      texto: "Sincronizado ✓",
      clase: "text-[#72BC8F] bg-[#72BC8F]/8 border border-[#72BC8F]/15 font-mono text-[10px] px-2.5 py-0.5 rounded-md font-semibold"
    };
  }
  if (captura.status === "error") {
    return {
      texto: "Error ↻",
      clase: "text-[#E97366] bg-[#E97366]/8 border border-[#E97366]/15 font-mono text-[10px] px-2.5 py-0.5 rounded-md cursor-pointer font-semibold"
    };
  }
  if (isSyncing && captura.status === "pending") {
    return {
      texto: "Sincronizando...",
      clase: "text-amber-500 bg-amber-950/10 border border-amber-950/20 font-mono text-[10px] px-2.5 py-0.5 rounded-md animate-pulse font-semibold"
    };
  }
  return {
    texto: "Pendiente",
    clase: "text-[#DE9255] bg-[#DE9255]/8 border border-[#DE9255]/15 font-mono text-[10px] px-2.5 py-0.5 rounded-md font-semibold"
  };
}

// Formateador de fecha/hora legible
function formatearFecha(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Hoy, ${time}`;
  }

  const dateStr = date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
  return `${dateStr}, ${time}`;
}

// Tiempo relativo sutil
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "ahora mismo";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// Decoraciones de categorías
const TIPO_DECORATIONS = {
  pernocta: { label: "Pernocta", icon: Bed, color: "text-amber-400 border-amber-500/10 bg-amber-500/5", emoji: "🛌" },
  ubicacion: { label: "Ubicación", icon: MapPin, color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5", emoji: "📍" },
  nota: { label: "Nota", icon: FileText, color: "text-gray-400 border-zinc-800 bg-zinc-800/10", emoji: "📝" },
  evento: { label: "Evento", icon: Calendar, color: "text-rose-400 border-rose-500/10 bg-rose-500/5", emoji: "⚡" },
  insight: { label: "Insight", icon: Lightbulb, color: "text-violet-400 border-violet-500/10 bg-violet-500/5", emoji: "💡" },
};


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

export default function BitacoraPage() {


  const { capturas, cargando, sincronizando, reintentar, addCaptura } = useCapturas();

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
  const [lastDictationDuration, setLastDictationDuration] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

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
  }, [dictando, segundosGrabados]);

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
    } catch (e) {
      console.error(e);
      alert("Error al guardar la captura localmente.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Autenticacion local

  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAuth(checkAuthSession());
      setIsSetup(!hasCryptoState());
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSetup) {
      if (loginPass.length < 4) {
        setLoginError(true);
        return;
      }
      const result = await setupCryptoEnvironment(loginPass);
      setRecoveryCode(result.recoveryCode);
      // Wait for user to dismiss recovery code
    } else {
      const valid = await verifyPIN(loginPass);
      if (valid) {
        setAuthSession();
        setIsAuth(true);
        setLoginError(false);
      } else {
        setLoginError(true);
      }
    }
  };

  const handleContinueAfterSetup = () => {
    setAuthSession();
    setIsAuth(true);
    setRecoveryCode(null);
  };

  // DevPanel/Health
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [notionConfigured, setNotionConfigured] = useState<boolean>(false);
  const [chainHealth, setChainHealth] = useState<ChainHealthResult | null>(null);

  const checkHealth = useCallback(async () => {
    const health = await verifyChainHealth();
    setChainHealth(health);
  }, []);

  useEffect(() => {
    if (showDevPanel) {
      void checkHealth();
    }
  }, [showDevPanel, checkHealth]);

  useEffect(() => {
    fetch("/api/status").then(res => res.json()).then(data => setNotionConfigured(data.notionConfigured)).catch(() => setNotionConfigured(false));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDevPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string | null>(null);
  const [showTelemetryId, setShowTelemetryId] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const pendingCount = useMemo(() => capturas.filter((c) => c.status !== "synced").length, [capturas]);
  const stats = useMemo(() => {
    const result: Record<string, number> = {};
    capturas.forEach((c) => {
      const t = c.tipo || "nota";
      result[t] = (result[t] || 0) + 1;
    });
    return result;
  }, [capturas]);

  const filteredCapturas = useMemo(() => {
    return capturas.filter((c) => {
      if (tipoFilter && c.tipo !== tipoFilter && !(tipoFilter === "nota" && !c.tipo)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.texto.toLowerCase().includes(q) || (c.tipo && c.tipo.toLowerCase().includes(q));
      }
      return true;
    });
  }, [capturas, tipoFilter, searchQuery]);

  if (!authChecked) {
    return <div className="min-h-screen bg-[#0B1F3B] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#3FA7FF] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#0B1F3B] flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        </div>

        {recoveryCode ? (
          <div className="z-10 w-full max-w-sm bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#72BC8F]" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white tracking-tight">PIN Configurado</h2>
              <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-60 mt-2">Guarda este código</p>
            </div>

            <div className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-2">Código de recuperación (única vez):</p>
              <p className="text-sm font-mono text-[#72BC8F] break-all">{recoveryCode}</p>
            </div>

            <p className="text-xs text-amber-400/80 text-center">
              Guarda este código en un lugar seguro. Es la única forma de recuperar el acceso si olvidas el PIN.
            </p>

            <button
              onClick={handleContinueAfterSetup}
              className="w-full bg-[#3FA7FF] text-white py-3 rounded-xl font-medium shadow-[0_0_15px_rgba(63,167,255,0.2)] hover:shadow-[0_0_20px_rgba(63,167,255,0.4)] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Entendido, Continuar</span>
            </button>
          </div>
        ) : (
          <div className="z-10 w-full max-w-sm bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#3FA7FF]" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isSetup ? "Configurar PIN" : "Acceso Restringido"}
              </h2>
              <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-60 mt-2">
                {isSetup ? "Nueva bitácora cifrada" : "Bitácora cifrada"}
              </p>
            </div>
            <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={isSetup ? "Crea un PIN criptográfico" : "PIN criptográfico"}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-[#0B1F3B] border border-[#1F3C6A] rounded-xl py-3 pl-10 pr-10 text-white text-sm focus:outline-none focus:border-[#3FA7FF] transition-colors font-mono tracking-widest"
                  autoComplete={isSetup ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {loginError && (
                <p className="text-red-400 text-xs font-mono text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                  {isSetup ? "PIN inválido (mínimo 4 caracteres)" : "PIN incorrecto"}
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-[#3FA7FF] text-white py-3 rounded-xl font-medium shadow-[0_0_15px_rgba(63,167,255,0.2)] hover:shadow-[0_0_20px_rgba(63,167,255,0.4)] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSetup ? (
                  <span>Configurar PIN</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Desbloquear Memoria</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cora-bg text-cora-text p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header y Dev Panel (si está activo) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Bitácora</span>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.05] text-[10px] font-mono tracking-widest text-gray-400 uppercase">
                Memoria Continua
              </span>
            </h1>
            <div className="flex items-center gap-4 mt-1.5">
              <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Capturando la realidad empírica
              </p>
              <button
                onClick={() => {
                  clearAuthSession();
                  setIsAuth(false);
                }}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-md border border-indigo-500/20"
              >
                <Lock className="w-3 h-3" />
                Bloquear
              </button>
            </div>
          </div>
        </header>

        {showDevPanel && (
          <div className="p-4 bg-[#111113] border border-indigo-500/30 rounded-xl space-y-4">
            <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4" />
              Panel de Diagnóstico Khora
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2">
                <p><strong>Configuración Notion:</strong> {notionConfigured ? '✅ Activa' : '❌ Falta Configurar'}</p>
                <p><strong>Total Registros Locales:</strong> {capturas.length}</p>
                <p><strong>Pendientes de Sincronización:</strong> {pendingCount}</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-400 border-b border-white/5 pb-1">Salud de la Cadena (Integridad):</p>
                {!chainHealth ? (
                  <p className="text-gray-500">Verificando...</p>
                ) : (
                  <>
                    <p><strong>Estado:</strong> {chainHealth.ok ? '✅ Íntegro' : '❌ Corrupción detectada'}</p>
                    <p><strong>Verificados:</strong> {capturas.length} registros</p>
                    {!chainHealth.ok && chainHealth.brokenAtSecuencia !== undefined && (
                      <p className="text-red-400"><strong>Rotura detectada en índice:</strong> {chainHealth.brokenAtSecuencia}</p>
                    )}

                  </>
                )}
              </div>
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-12 space-y-6">

            {/* LA CAPTURA: Protagonista Absoluto */}
            <section className="bg-[#18181b] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono">
                    Captura libre
                  </span>
                </div>
                {dictando && (
                  <span className="text-[10px] text-indigo-400 font-mono font-semibold animate-pulse flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                    Grabando voz... ({Math.floor(segundosGrabados / 60)}:{(segundosGrabados % 60).toString().padStart(2, "0")})
                  </span>
                )}
              </div>

              {/* Area de Entrada del Editor */}
              <div className="relative group min-h-[160px] bg-[#202024]/50 border border-white/[0.04] rounded-xl p-5 transition-all duration-300 focus-within:border-white/[0.12] focus-within:bg-[#202024]/70">
                <textarea
                  ref={textareaRef}
                  value={texto + (interimText ? " " + interimText : "")}
                  onChange={(e) => {
                    if (!dictando) setTexto(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void guardar();
                    }
                  }}
                  placeholder={
                    !speechSupported
                    ? "Dictado no soportado en este navegador. Escribe aquí..."
                    : dictando ? "Escuchando voz en tiempo real... Habla libremente..." : "¿Qué acaba de pasar? Registra un evento, pernocta, nota o idea..."}
                  className="w-full bg-transparent text-white placeholder-zinc-600 resize-none focus:outline-none leading-relaxed text-sm md:text-base min-h-[110px] h-auto"
                  disabled={guardando}
                />
              </div>

              {/* Fila de controles de captura */}
              <div className="flex items-center justify-between pt-1">
                {/* Trigger de Dictado */}
                <button
                  onClick={toggleDictado}
                  type="button"
                  disabled={!speechSupported || guardando}
                  className={`px-5 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-xs font-semibold border cursor-pointer ${
                    dictando
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse"
                      : !speechSupported
                      ? "bg-[#202024]/40 border-white/[0.02] text-gray-600 cursor-not-allowed"
                      : "bg-[#202024]/80 border-white/[0.04] hover:border-white/[0.1] text-gray-400 hover:text-white"
                  }`}
                  title={!speechSupported ? "Dictado no soportado en este navegador" : ""}
                >
                  {dictando ? <Mic className="w-4 h-4 text-indigo-400" /> : <MicOff className="w-4 h-4 text-gray-500" />}
                  {dictando ? "Escuchando... / Detener" : "Dictar entrada"}
                </button>

                {/* Meta info discreta */}
                <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                  <span>Dictado inteligente</span>
                  <span>·</span>
                  <span className="bg-black/30 border border-white/[0.03] px-2 py-0.5 rounded text-gray-400">⌘ + Enter</span>
                </div>

                {/* Botón Guardar */}
                <button
                  onClick={() => void guardar()}
                  disabled={(!texto.trim() && !interimText.trim()) || guardando}
                  className="px-6 py-3 rounded-xl bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  {guardando ? (
                    "Sincronizando…"
                  ) : (
                    <>
                      Guardar entrada <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {showSuccessToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-4 right-4 bg-[#72BC8F]/10 border border-[#72BC8F]/20 text-[#72BC8F] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ¡Guardado! {wasNormalized && "(Autocorregido)"}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="space-y-4 relative">


              {/* Barra de Búsqueda y Filtros */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar en la memoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/[0.05] rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-[#1f1f22] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 md:w-auto">
                  <button
                    onClick={reintentar}
                    disabled={sincronizando || pendingCount === 0}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      pendingCount > 0
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-[#18181b] text-gray-500 border-white/[0.05] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>{sincronizando ? "Sincronizando..." : `Sync (${pendingCount})`}</span>
                  </button>
                </div>
              </div>

              {/* Filtros por Categoría */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {(Object.keys(TIPO_DECORATIONS) as Array<keyof typeof TIPO_DECORATIONS>).map((key) => {
                  const item = TIPO_DECORATIONS[key];
                  const isActive = tipoFilter === key;
                  const count = stats[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setTipoFilter(isActive ? null : key)}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all border flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-[#18181b] border-white/[0.03] text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                      <span className="text-[10px] font-mono opacity-50">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Lista de Registros */}
              <div className="space-y-4 min-h-[250px]" aria-live="polite">
                {cargando && capturas.length === 0 ? (
                  <ul className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="h-28 bg-[#18181b]/50 rounded-2xl animate-pulse border border-white/[0.03]" />
                    ))}
                  </ul>
                ) : filteredCapturas.length === 0 ? (
                  <div className="text-center py-20 bg-[#18181b]/20 border border-white/[0.04] rounded-2xl flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
                      <Search className="w-5 h-5 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm font-semibold mt-1 px-6">
                      {searchQuery || tipoFilter
                        ? "No se hallaron coincidencias para la búsqueda actual."
                        : "Tu bitácora está lista para tus memorias"}
                    </p>
                    <p className="text-gray-600 text-xs max-w-sm px-6 leading-relaxed">
                      {searchQuery || tipoFilter
                        ? "Intenta buscar palabras clave alternativas o retira los filtros aplicados arriba."
                        : "Dicta tus reflexiones o escribe notas rápidas sobre tu día para construir un mapa de tu actividad."}
                    </p>
                    {(searchQuery || tipoFilter) && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setTipoFilter(null);
                        }}
                        className="text-indigo-400 hover:text-indigo-350 text-xs font-semibold focus:outline-none mt-2 underline cursor-pointer"
                      >
                        Reestablecer filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-4" role="list">
                    {filteredCapturas.map((captura) => {
                      const e = estadoNota(captura, sincronizando);
                      const tipo = captura.tipo || "nota";
                      const decoration = TIPO_DECORATIONS[tipo as keyof typeof TIPO_DECORATIONS] || TIPO_DECORATIONS.nota;
                      const isTelemetryOpen = showTelemetryId === captura.id;

                      return (
                        <li
                          key={captura.id}
                          className="p-5 bg-[#18181b] border border-white/[0.06] rounded-2xl transition-all duration-300 hover:border-white/[0.15] shadow-xs"
                        >
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-semibold tracking-wider uppercase border ${decoration.color}`}>
                              <span>{decoration.emoji}</span>
                              <span>{decoration.label}</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setShowTelemetryId(isTelemetryOpen ? null : captura.id)}
                                title="Mostrar metadatos de telemetría"
                                className={`p-1.5 rounded-lg border border-transparent transition-all hover:bg-[#202024] cursor-pointer ${
                                  isTelemetryOpen ? "text-indigo-400 bg-indigo-500/5 border-indigo-500/10" : "text-gray-500 hover:text-gray-300"
                                }`}
                              >
                                <Info className="w-4 h-4" />
                              </button>
                              <span
                                className="text-[9px] text-gray-500 flex items-center gap-1.5 bg-[#202024]/60 border border-white/[0.04] px-2.5 py-1 rounded-md font-mono"
                                title={captura.origen === "voice" ? "Entrada dictada con voz" : "Entrada escrita con teclado"}
                              >
                                {captura.origen === "voice" ? (
                                  <><Mic className="w-3 h-3 text-indigo-400" />Voz</>
                                ) : (
                                  <><Keyboard className="w-3 h-3 text-gray-500" />Texto</>
                                )}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#e3e3e6] px-0.5 font-medium">
                            {captura.texto}
                          </p>

                          <AnimatePresence>
                            {isTelemetryOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 bg-[#111113]/95 border border-white/[0.04] rounded-xl p-4 text-[10px] font-mono text-gray-500 space-y-2">
                                  <div className="flex justify-between border-b border-white/[0.02] pb-2 text-gray-400">
                                    <span className="font-semibold tracking-wider uppercase text-[8px]">Métrica</span>
                                    <span className="font-semibold tracking-wider uppercase text-[8px]">Registro exacto</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>ID de registro:</span>
                                    <span className="text-gray-400 select-all">{captura.id}</span>
                                  </div>
                                  {captura.secuencia && (
                                    <div className="flex justify-between">
                                      <span>Secuencia en dispositivo:</span>
                                      <span className="text-gray-400">#{captura.secuencia}</span>
                                    </div>
                                  )}
                                  {captura.hash && (
                                    <div className="flex justify-between">
                                      <span>Integridad (SHA-256):</span>
                                      <span className="text-gray-400 select-all max-w-[200px] truncate" title={captura.hash}>{captura.hash}</span>
                                    </div>
                                  )}
                                  {captura.forensics?.geo && (
                                    <div className="flex justify-between">
                                      <span>Geolocalización:</span>
                                      <span className="text-gray-400">
                                        {captura.forensics.geo.lat.toFixed(4)}, {captura.forensics.geo.long.toFixed(4)}
                                        (±{Math.round(captura.forensics.geo.accuracy)}m)
                                      </span>
                                    </div>
                                  )}
                                  {captura.forensics?.platform && (
                                    <div className="flex justify-between">
                                      <span>Dispositivo / Platform:</span>
                                      <span className="text-gray-400 max-w-[200px] truncate" title={captura.forensics.platform}>{captura.forensics.platform}</span>
                                    </div>
                                  )}
                                  {!captura.forensics?.platform && (
                                    <div className="flex justify-between">
                                      <span>Dispositivo:</span>
                                      <span className="text-gray-400">{captura.metadata?.dispositivo || "Navegador Desconocido"}</span>
                                    </div>
                                  )}
                                  {captura.metadata?.duracionDictado && (
                                    <div className="flex justify-between">
                                      <span>Tiempo de dictado:</span>
                                      <span className="text-indigo-400 font-bold">{(captura.metadata.duracionDictado / 1000).toFixed(2)}s</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span>Tiempo de respuesta:</span>
                                    <span className="text-[#72BC8F] font-bold">{captura.metadata?.latenciaGuardado ? `${captura.metadata.latenciaGuardado}ms` : "1ms"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Estado de sincronización:</span>
                                    <span className={e.clase}>{e.texto}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="mt-4 flex justify-between items-center gap-3 border-t border-white/[0.03] pt-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-gray-500" title={captura.timestamp}>
                                {isMounted ? formatearFecha(captura.timestamp) : "--:--"}
                              </span>
                              <span className="text-gray-700 font-mono text-[9px]">•</span>
                              <span className="text-[10px] text-gray-500 font-medium">
                                {relativeTime(captura.timestamp)}
                              </span>
                            </div>
                            <span className={e.clase}>
                              {e.texto}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
