"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type FormEvent } from "react";
import { useCapturas } from "@/lib/hooks";
import { verifyChainHealth, type ChainHealthResult } from "@/lib/chain-health";
import { normalizeDictatedText } from "@/lib/text-utils";
import type { Captura } from "@/lib/db";
import { motion, AnimatePresence } from "motion/react";
import {
	Mic,
	MicOff,
	Send,
	Bed,
	MapPin,
	FileText,
	Calendar,
	Lightbulb,
	Search,
	Info,
	Database,
	X,
	Keyboard,
	Sparkles,
	Flame,
	Clock,
	Activity,
	Layers,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	Lock,
	User,
	Eye,
	EyeOff,
	LogIn,
	ChevronLeft
} from "lucide-react";
import Link from "next/link";

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

// Detector de navegador/dispositivo
function getDispositivo(): string {
	if (typeof navigator === "undefined") return "PC";
	const ua = navigator.userAgent;
	if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) return "Móvil";
	if (ua.includes("Macintosh")) return "MacBook";
	if (ua.includes("Windows")) return "Windows PC";
	return "Web App";
}

// Decoraciones de categorías
const TIPO_DECORATIONS = {
	pernocta: { label: "Pernocta", icon: Bed, color: "text-amber-400 border-amber-500/10 bg-amber-500/5", emoji: "🛌" },
	ubicacion: { label: "Ubicación", icon: MapPin, color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5", emoji: "📍" },
	nota: { label: "Nota", icon: FileText, color: "text-gray-400 border-zinc-800 bg-zinc-800/10", emoji: "📝" },
	evento: { label: "Evento", icon: Calendar, color: "text-rose-400 border-rose-500/10 bg-rose-500/5", emoji: "⚡" },
	insight: { label: "Insight", icon: Lightbulb, color: "text-violet-400 border-violet-500/10 bg-violet-500/5", emoji: "💡" },
};

export default function Home() {
	const { capturas, cargando, sincronizando, addCaptura, reintentar } = useCapturas();
	const [texto, setTexto] = useState("");

  // --- Autenticacion local (client-side) ---
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("khora_auth") === "1") {
      setIsAuth(true);
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginUser.trim() === "willfreeman" && loginPass === "A02122310a!") {
      setIsAuth(true);
      setLoginError(false);
      if (typeof window !== "undefined") localStorage.setItem("khora_auth", "1");
    } else {
      setLoginError(true);
    }
  };
	const [interimText, setInterimText] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [dictando, setDictando] = useState(false);
	const [speechSupported, setSpeechSupported] = useState(true);

	// Tiempos de dictado
	const [segundosGrabados, setSegundosGrabados] = useState(0);
	const dictationTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Notion & Gemini configs (detectados desde el servidor)
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

	// Alertas de éxito micro-interacción
	const [showSuccessToast, setShowSuccessToast] = useState(false);
	const [wasNormalized, setWasNormalized] = useState(false);

	// Telemetría de dictado
	const dictationStartTimeRef = useRef<number | null>(null);
	const [lastDictationDuration, setLastDictationDuration] = useState<number | null>(null);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const recognitionRef = useRef<any>(null);

	// Analizador de Audio Real - Web Audio API (Categoría A - Portátil a Producción)
	const [audioAmplitudes, setAudioAmplitudes] = useState<number[]>(Array(15).fill(4));
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const animationRef = useRef<number | null>(null);

	// Efecto para focus inicial
	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	// Cronómetro de dictado
	useEffect(() => {
		if (dictando) {
			setSegundosGrabados(0);
			dictationTimerRef.current = setInterval(() => {
				setSegundosGrabados((prev) => prev + 1);
			}, 1000);
		} else {
			if (dictationTimerRef.current) {
				clearInterval(dictationTimerRef.current);
			}
			setSegundosGrabados(0);
		}
		return () => {
			if (dictationTimerRef.current) clearInterval(dictationTimerRef.current);
		};
	}, [dictando]);

	// Inicializar reconocimiento de voz nativo (Web Speech API)
	useEffect(() => {
		if (typeof window !== "undefined") {
			const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
			if (SpeechRecognition) {
				const recognition = new SpeechRecognition();
				recognition.continuous = true;
				recognition.interimResults = true;
				recognition.lang = "es-MX";

				recognition.onstart = () => {
					setDictando(true);
					dictationStartTimeRef.current = Date.now();
				};

				recognition.onresult = (event: any) => {
					let currentInterim = "";
					let finalToAppend = "";

					for (let i = event.resultIndex; i < event.results.length; ++i) {
						if (event.results[i].isFinal) {
							finalToAppend += event.results[i][0].transcript;
						} else {
							currentInterim += event.results[i][0].transcript;
						}
					}

					if (finalToAppend) {
						setTexto((prev) => {
							const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
							const normalizedChunk = normalizeDictatedText(finalToAppend);
							let newText = prev + sep + normalizedChunk;
							// Ensure capitalization after a period across chunks
							newText = newText.replace(/\.\s+([a-zñáéíóú])/g, (match, letter) => ". " + letter.toUpperCase());
							return newText;
						});
					}
					setInterimText(currentInterim);
				};

				recognition.onerror = (event: any) => {
					console.error("Speech recognition error", event.error);
					setDictando(false);
				};

				recognition.onend = () => {
					setDictando(false);
					if (dictationStartTimeRef.current) {
						const dur = Date.now() - dictationStartTimeRef.current;
						setLastDictationDuration(dur);
						dictationStartTimeRef.current = null;
					}
				};

				recognitionRef.current = recognition;
			} else {
				setSpeechSupported(false);
			}
		}

		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.stop();
			}
		};
	}, []);

	// Control de Analizador de Audio Real (Web Audio API)
	const startAudioAnalysis = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			const audioContext = new AudioContextClass();
			audioContextRef.current = audioContext;

			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 64;
			analyserRef.current = analyser;

			const source = audioContext.createMediaStreamSource(stream);
			sourceRef.current = source;
			source.connect(analyser);

			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);

			const updateWave = () => {
				if (!analyserRef.current) return;
				analyserRef.current.getByteFrequencyData(dataArray);

				// Mapear frecuencia real a nuestras 15 barras visuales
				const newAmplitudes = Array.from({ length: 15 }).map((_, idx) => {
					const val = dataArray[idx % 16] || 0;
					// Escalar de forma elegante: mínima altura 4px, máxima 26px
					const height = 4 + (val / 255) * 22;
					return height;
				});

				setAudioAmplitudes(newAmplitudes);
				animationRef.current = requestAnimationFrame(updateWave);
			};

			updateWave();
		} catch (err) {
			console.warn("No se pudo iniciar analizador de audio Web Audio, degradando con gracia:", err);
			// Degradación con gracia: Oscilación matemática suave por software
			let count = 0;
			const interval = setInterval(() => {
				if (!dictando) {
					clearInterval(interval);
					return;
				}
				const newAmplitudes = Array.from({ length: 15 }).map((_, idx) => {
					const wave = Math.sin(count + idx * 0.4) * 8 + 12;
					return Math.max(4, wave);
				});
				setAudioAmplitudes(newAmplitudes);
				count += 0.25;
			}, 80);
		}
	};

	const stopAudioAnalysis = () => {
		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
			animationRef.current = null;
		}
		if (sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop());
			streamRef.current = null;
		}
		if (audioContextRef.current && audioContextRef.current.state !== "closed") {
			void audioContextRef.current.close();
			audioContextRef.current = null;
		}
		analyserRef.current = null;
		setAudioAmplitudes(Array(15).fill(4));
	};

	// Sincronizar el analizador de audio real con el estado de dictado
	useEffect(() => {
		if (dictando) {
			void startAudioAnalysis();
		} else {
			stopAudioAnalysis();
		}
		return () => {
			stopAudioAnalysis();
		};
	}, [dictando]);

	const toggleDictation = useCallback(() => {
		if (!speechSupported || !recognitionRef.current) {
			alert("Este navegador no cuenta con soporte nativo de dictado por voz.");
			return;
		}
		if (dictando) {
			recognitionRef.current.stop();
		} else {
			setInterimText("");
			setLastDictationDuration(null);
			recognitionRef.current.start();
			textareaRef.current?.focus();
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
			}

			const isVoice = lastDictationDuration !== null || dictando;

			if (isVoice) {
				const preNormalized = finalTexto;
				finalTexto = normalizeDictatedText(finalTexto);
				if (preNormalized !== finalTexto) {
					normalizedFlag = true;
				}
			}

			const inputSource = isVoice ? "voice" : "keyboard";
			const device = getDispositivo();
			const latencia = Date.now() - saveStartTime;

			const metadata = {
				duracionDictado: lastDictationDuration || undefined,
				dispositivo: device,
				latenciaGuardado: Math.max(1, latencia),
			};

			await addCaptura(finalTexto, "nota", inputSource, metadata);

			// Limpiar e iniciar micro-interacción de éxito
			setTexto("");
			setInterimText("");
			setLastDictationDuration(null);
			setWasNormalized(normalizedFlag);
			setShowSuccessToast(true);
			setTimeout(() => {
				setShowSuccessToast(false);
			}, 3000);

			textareaRef.current?.focus();
		} finally {
			setGuardando(false);
		}
	}

	// === DOPAMINA HONESTA: Métricas locales ===
	const [isMounted, setIsMounted] = useState(false);
	const [currentHour, setCurrentHour] = useState(12); // Fallback until mounted
	const [todayStart, setTodayStart] = useState(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	});

	useEffect(() => {
		setIsMounted(true);
		setCurrentHour(new Date().getHours());
		const interval = setInterval(() => {
			setCurrentHour(new Date().getHours());
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			setTodayStart(d);
		}, 30000);
		return () => clearInterval(interval);
	}, []);

	// Horas atendidas de hoy
	const hoursAttended = useMemo(() => {
		return new Set(
			capturas
				.map((c) => new Date(c.timestamp))
				.filter((d) => d.getTime() >= todayStart.getTime())
				.map((d) => d.getHours())
		);
	}, [capturas, todayStart]);

	// Racha de días activos
	const streak = useMemo(() => {
		if (capturas.length === 0) return 0;
		const dates = Array.from(
			new Set(
				capturas.map((c) => {
					const date = new Date(c.timestamp);
					return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
				})
			)
		).sort();

		let currentStreak = 0;
		const today = new Date();
		const getFormatted = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		const todayStr = getFormatted(today);

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = getFormatted(yesterday);

		if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
			return 0;
		}

		let checkDate = dates.includes(todayStr) ? today : yesterday;
		while (true) {
			const checkStr = getFormatted(checkDate);
			if (dates.includes(checkStr)) {
				currentStreak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}
		return currentStreak;
	}, [capturas]);

	// Estadísticas del corpus
	const stats = useMemo(() => {
		const counts = {
			total: capturas.length,
			hoy: capturas.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length,
			voice: capturas.filter(c => c.origen === "voice").length,
			keyboard: capturas.filter(c => c.origen === "keyboard").length,
			pernocta: 0,
			ubicacion: 0,
			nota: 0,
			evento: 0,
			insight: 0,
		};
		for (const c of capturas) {
			const t = c.tipo || "nota";
			if (t in counts) {
				counts[t as keyof typeof counts]++;
			}
		}
		return counts;
	}, [capturas]);

	const voicePercentage = useMemo(() => {
		if (stats.total === 0) return 50;
		return Math.round((stats.voice / stats.total) * 100);
	}, [stats]);

	const coveragePercentage = useMemo(() => {
		return Math.round((hoursAttended.size / 24) * 100);
	}, [hoursAttended]);

	// Interactividad de línea de 24 horas
	const [selectedTimelineHour, setSelectedTimelineHour] = useState<number>(12);

	useEffect(() => {
		setSelectedTimelineHour(new Date().getHours());
	}, []);

	const notesAtSelectedHour = useMemo(() => {
		return capturas.filter((c) => {
			const d = new Date(c.timestamp);
			return (
				d.toDateString() === new Date().toDateString() &&
				d.getHours() === selectedTimelineHour
			);
		});
	}, [capturas, selectedTimelineHour]);

	// Filtrado de la lista histórica
	const filteredCapturas = useMemo(() => {
		return capturas.filter((c) => {
			const matchesSearch = searchQuery
				? c.texto.toLowerCase().includes(searchQuery.toLowerCase())
				: true;
			const matchesTipo = tipoFilter ? (c.tipo || "nota") === tipoFilter : true;
			return matchesSearch && matchesTipo;
		});
	}, [capturas, searchQuery, tipoFilter]);

	const registrarHoraPendiente = (hour: number) => {
		setTexto(`[Bitácora de las ${hour.toString().padStart(2, "0")}:00]: `);
		setSelectedTimelineHour(hour);
		setTimeout(() => {
			textareaRef.current?.focus();
		}, 100);
	};


  if (!authChecked) {
    return null;
  }

  if (!isAuth) {
    return (
      <main className="min-h-screen bg-[#111113] text-[#e3e3e6] antialiased selection:bg-indigo-500/20 flex items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={ { opacity: 0, y: 20, scale: 0.98 } }
          animate={ { opacity: 1, y: 0, scale: 1 } }
          transition={ { duration: 0.5, ease: "easeOut" } }
          className="relative w-full max-w-sm"
        >
          <div className="flex flex-col items-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <span className="text-[10px] tracking-[0.2em] font-semibold text-indigo-400/90 font-mono uppercase block">Autobiografico</span>
              <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Khora</h1>
            </div>
          </div>

          <form onSubmit={handleLogin} className="bg-[#18181b] border border-white/[0.06] rounded-2xl p-7 flex flex-col gap-5 shadow-xl">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-white">Ingresa a tu bitacora</h2>
              <p className="text-xs text-gray-500">Identificate para continuar</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-mono">Usuario</label>
              <div className="flex items-center gap-2.5 bg-[#202024]/60 border border-white/[0.06] rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500/50 transition-colors">
                <User className="w-4 h-4 text-gray-500 shrink-0" />
                <input type="text" value={loginUser} onChange={(e) => { setLoginUser(e.target.value); setLoginError(false); }} autoFocus autoComplete="username" placeholder="willfreeman" className="bg-transparent outline-none text-sm text-white placeholder:text-gray-600 w-full" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-mono">Contrasena</label>
              <div className="flex items-center gap-2.5 bg-[#202024]/60 border border-white/[0.06] rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500/50 transition-colors">
                <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                <input type={showPass ? "text" : "password"} value={loginPass} onChange={(e) => { setLoginPass(e.target.value); setLoginError(false); }} autoComplete="current-password" placeholder="........" className="bg-transparent outline-none text-sm text-white placeholder:text-gray-600 w-full" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0" aria-label="Mostrar u ocultar contrasena">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {loginError && (
                <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: "auto" } } exit={ { opacity: 0, height: 0 } } className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>Usuario o contrasena incorrectos</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="mt-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl px-4 py-3 transition-colors shadow-lg shadow-indigo-600/20">
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-600 font-mono mt-6 tracking-wide">Khora - Registro autobiografico</p>
        </motion.div>
      </main>
    );
  }

	return (
		<main className="min-h-screen bg-[#111113] text-[#e3e3e6] antialiased selection:bg-indigo-500/20 pb-32">
			{/* Header de la App - Visión de producción limpia */}
			<header className="border-b border-white/[0.06] bg-[#111113]/90 sticky top-0 z-40 backdrop-blur-md">
				<div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link href="/herramientas" className="mr-2 p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
							<ChevronLeft className="w-5 h-5" />
						</Link>
						<div className="relative flex items-center justify-center">
							<span className={`absolute w-3.5 h-3.5 rounded-full bg-indigo-500 opacity-20 ${dictando ? 'animate-ping' : ''}`} />
							<span className={`w-2.5 h-2.5 rounded-full ${dictando ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-500'}`} />
						</div>
						<div>
							<span className="text-[10px] tracking-[0.15em] font-semibold text-indigo-400/90 font-mono uppercase block">Autobiográfico</span>
							<h1 className="text-xl font-bold text-white tracking-tight -mt-0.5">
								Khora
							</h1>
						</div>
					</div>

				</div>
			</header>

			{/* Panel Dev Oculto */}
			<AnimatePresence>
				{showDevPanel && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="fixed bottom-4 right-4 z-50 bg-[#18181b]/95 border border-white/[0.1] rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3 min-w-[250px]"
					>
						<div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
							<span className="text-[10px] uppercase tracking-widest font-mono text-gray-400 font-semibold">Modo Dev</span>
							<button onClick={() => setShowDevPanel(false)} className="text-gray-500 hover:text-white">✕</button>
						</div>

						<div className="flex flex-col gap-2">
							<div
								className="text-[11px] text-gray-300 px-3 py-2 flex items-center justify-between gap-2 font-medium bg-white/[0.02] rounded-md border border-white/5"
							>
								<span>Adapter Activo:</span>
								<div className="flex items-center gap-1.5">
									<span className={`w-1.5 h-1.5 rounded-full ${notionConfigured ? 'bg-green-400' : 'bg-red-400'}`} />
									<span>{notionConfigured ? 'NotionReal' : 'Notion no configurado'}</span>
								</div>
							</div>


							<div className="mt-2 border-t border-white/[0.05] pt-3 flex flex-col gap-2">
								<div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
									<span>Salud de Cadena</span>
									<button onClick={() => void checkHealth()} className="hover:text-white underline">Refresh</button>
								</div>
								{chainHealth ? (
									<div className={`text-[10px] p-2 rounded border ${chainHealth.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
										{chainHealth.message}
									</div>
								) : (
									<div className="text-[10px] text-gray-500">Calculando...</div>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Alerta de Éxito de Captura (Micro-interacción de Recompensa) */}
			<AnimatePresence>
				{showSuccessToast && (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-[#18181b] border border-white/[0.06] text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md"
					>
						<CheckCircle2 className="w-4 h-4 text-[#72BC8F]" />
						<div className="flex flex-col">
							<span className="text-xs font-semibold text-white leading-none">
								Entrada guardada
								{wasNormalized && <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono">✨ autocorregido</span>}
							</span>
							<span className="text-[10px] text-gray-400 mt-1 font-medium">Se integró de forma correcta a tu bitácora personal</span>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="max-w-7xl mx-auto px-6 md:px-12 py-12">

				{/* Estructura Desktop Multi-zona (12 Columnas) */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

					{/* COLUMNA IZQUIERDA: Stats de Dopamina Reales (4 cols) */}
					<aside className="lg:col-span-4 flex flex-col gap-8">

						{/* Card de Dopamina Real: Streaks & Cobertura */}
						<section className="bg-[#18181b] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-6 shadow-xs relative overflow-hidden">
							<div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
								<h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono flex items-center gap-2">
									<Activity className="w-4 h-4 text-indigo-400" />
									Métricas de enfoque
								</h2>
								<span className="text-[9px] font-mono font-medium text-gray-500 uppercase">Tiempo real</span>
							</div>

							<div className="grid grid-cols-2 gap-4">
								{/* Bloque Racha */}
								<div className="bg-[#202024]/50 border border-white/[0.04] rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group">
									<div className="absolute top-2 right-2 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity duration-300">
										<Flame className="w-10 h-10 text-orange-400" />
									</div>
									<span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider font-mono">Racha activa</span>
									<div className="flex items-baseline gap-1 mt-1">
										<span className="text-3xl font-extrabold text-white tracking-tight">
											{isMounted ? streak : "-"}
										</span>
										<span className="text-xs text-orange-400 font-semibold">días</span>
									</div>
									<p className="text-[10px] text-gray-500 leading-tight">
										{!isMounted ? "Calculando..." : streak > 0 ? "Fuego de bitácora encendido" : "Suma tu primer día hoy"}
									</p>
								</div>

								{/* Bloque Cobertura */}
								<div className="bg-[#202024]/50 border border-white/[0.04] rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group">
									<div className="absolute top-2 right-2 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity duration-300">
										<Clock className="w-10 h-10 text-indigo-400" />
									</div>
									<span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider font-mono">Cobertura 24h</span>
									<div className="flex items-baseline gap-1 mt-1">
										<span className="text-3xl font-extrabold text-white tracking-tight">
											{isMounted ? coveragePercentage : "--"}%
										</span>
										<span className="text-xs text-indigo-400 font-semibold">cobertura</span>
									</div>
									<p className="text-[10px] text-gray-500 leading-tight">
										{isMounted ? hoursAttended.size : "-"} horas registradas hoy
									</p>
								</div>
							</div>

							{/* Progreso rápido de cobertura en barra */}
							<div className="flex flex-col gap-2 bg-[#202024]/30 p-4 rounded-xl border border-white/[0.03]">
								<div className="flex justify-between text-[11px]">
									<span className="text-gray-400 font-semibold">Progreso diario</span>
									<span className="text-indigo-400 font-semibold font-mono">{isMounted ? hoursAttended.size : "-"} / 24h</span>
								</div>
								<div className="w-full bg-[#111113] rounded-full h-2 overflow-hidden border border-white/[0.05]">
									<div
										className="bg-indigo-500 h-full rounded-full transition-all duration-750 ease-out shadow-[0_0_12px_rgba(99,102,241,0.4)]"
										style={{ width: `${isMounted ? Math.max(4, Math.min(100, coveragePercentage)) : 0}%` }}
									/>
								</div>
							</div>

							{/* Datos Secundarios de Persistencia */}
							<div className="bg-[#202024]/40 border border-white/[0.03] rounded-xl p-4 flex flex-col gap-3">
								<div className="flex justify-between text-[11px] items-center">
									<span className="text-gray-400 font-medium">Historial guardado</span>
									<span className="text-white font-mono font-bold bg-[#111113] px-2.5 py-1 rounded-md border border-white/[0.05]">{stats.total} {stats.total === 1 ? 'entrada' : 'entradas'}</span>
								</div>
								<div className="flex justify-between text-[11px] items-center">
									<span className="text-gray-400 font-medium">Registros de hoy</span>
									<span className="text-white font-mono font-bold bg-[#111113] px-2.5 py-1 rounded-md border border-white/[0.05]">{isMounted ? stats.hoy : "-"} {isMounted && stats.hoy === 1 ? 'entrada' : 'entradas'}</span>
								</div>
								<div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.03]">
									<div className="flex justify-between text-[10px] text-gray-400">
										<span className="font-medium">Proporción de captura</span>
										<span className="font-mono font-bold">{voicePercentage}% Voz</span>
									</div>
									<div className="w-full bg-[#111113] h-1.5 rounded-full overflow-hidden flex border border-white/[0.03]">
										<div className="bg-indigo-400 h-full rounded-l-full" style={{ width: `${voicePercentage}%` }} />
										<div className="bg-zinc-700 h-full rounded-r-full" style={{ width: `${100 - voicePercentage}%` }} />
									</div>
								</div>
							</div>
						</section>
					</aside>

					{/* COLUMNA DERECHA: Captura & Timeline & Corpus (8 cols) */}
					<div className="lg:col-span-8 flex flex-col gap-8">

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
										Grabando voz... ({segundosGrabados}s)
									</span>
								)}
							</div>

							{/* Area de Entrada del Editor */}
							<div className="relative group min-h-[160px] bg-[#202024]/50 border border-white/[0.04] rounded-xl p-5 transition-all duration-300 focus-within:border-white/[0.12] focus-within:bg-[#202024]/70">
								<textarea
									ref={textareaRef}
									value={texto}
									onChange={(e) => setTexto(e.target.value)}
									onKeyDown={(e) => {
										if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
											e.preventDefault();
											void guardar();
										}
									}}
									placeholder={dictando ? "Escuchando voz en tiempo real... Habla libremente..." : "¿Qué acaba de pasar? Registra un evento, pernocta, nota o idea..."}
									className="w-full bg-transparent text-white placeholder-zinc-600 resize-none focus:outline-none leading-relaxed text-sm md:text-base min-h-[110px] h-auto"
								/>

								{/* Texto interino en vivo de Speech API */}
								{interimText && (
									<div className="text-indigo-400/90 italic text-xs mt-3 animate-pulse bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10 font-mono">
										{interimText}
									</div>
								)}

								{/* Ondas Visuales REALES (Web Audio API) */}
								{dictando && (
									<div className="mt-5 flex items-center justify-between border-t border-white/[0.03] pt-4">
										<span className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
											<span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
											Amplitud del micrófono
										</span>
										<div className="flex items-end gap-1.5 h-7">
											{audioAmplitudes.map((amplitude, i) => (
												<div
													key={i}
													className="w-[3px] bg-indigo-500 rounded-full transition-all duration-75"
													style={{
														height: `${amplitude}px`,
														boxShadow: "0 0 8px rgba(99,102,241,0.45)"
													}}
												/>
											))}
										</div>
									</div>
								)}
							</div>

							{/* Fila de controles de captura */}
							<div className="flex items-center justify-between pt-1">
								{/* Trigger de Dictado */}
								<button
									onClick={toggleDictation}
									type="button"
									className={`px-5 py-3 rounded-xl transition-all duration-350 flex items-center gap-2 text-xs font-semibold border cursor-pointer ${
										dictando
											? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
											: "bg-[#202024]/80 border-white/[0.04] hover:border-white/[0.1] text-gray-400 hover:text-white"
									}`}
								>
									{dictando ? <Mic className="w-4 h-4 text-indigo-400 animate-pulse" /> : <MicOff className="w-4 h-4 text-gray-500" />}
									{dictando ? "Escuchando… / Detener" : "Dictar entrada"}
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
									disabled={!(texto.trim() || interimText.trim()) || guardando}
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
						</section>

						{/* BARRA DE COBERTURA 24H: Centro de Deleite */}
						<section className="bg-[#18181b] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
							<div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.03] pb-4 gap-2">
								<div>
									<h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono flex items-center gap-2">
										<Clock className="w-4 h-4 text-indigo-400" />
										Cobertura diaria (24h)
									</h2>
									<p className="text-[11px] text-gray-500 leading-relaxed mt-0.5 font-medium">
										Visualiza horas cubiertas o completa horas vacías seleccionando bloques interactivos.
									</p>
								</div>
								<div className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-xl">
									{isMounted ? hoursAttended.size : "--"} de 24 horas cubiertas
								</div>
							</div>

							{/* Bloques de Cobertura Rediseñados - Altamente Visuales */}
							<div className="flex gap-[4px] h-14 items-center">
								{Array.from({ length: 24 }).map((_, i) => {
									const isAttended = isMounted && hoursAttended.has(i);
									const isPast = isMounted && i < currentHour;
									const isCurrent = isMounted && i === currentHour;
									const isSelected = isMounted && selectedTimelineHour === i;

									let stateStyles = "";
									if (isAttended) {
										// Estado Atendida: Color Verde sólido con borde de acento
										stateStyles = "bg-[#72BC8F] border border-[#72BC8F]/30 hover:bg-[#62aa7e]";
									} else if (isCurrent) {
										// Estado Hora Actual: Borde brillante y fondo animado
										stateStyles = "bg-indigo-500/10 border border-indigo-500/50 hover:bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.35)] animate-pulse";
									} else if (isPast) {
										// Estado Pasada sin Atender: Rojo sutil
										stateStyles = "bg-[#E97366]/4 border border-[#E97366]/10 hover:bg-[#E97366]/8";
									} else {
										// Estado Futura: Vacía gris oscura
										stateStyles = "bg-[#202024]/30 border border-white/[0.02] hover:bg-[#202024]/60";
									}

									// Si está seleccionada, aplicar escala y anillo
									if (isSelected) {
										stateStyles += " ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#18181b] scale-110 z-10";
									}

									return (
										<button
											key={i}
											type="button"
											onClick={() => setSelectedTimelineHour(i)}
											className={`flex-1 h-full rounded-lg transition-all duration-200 cursor-pointer flex flex-col justify-between p-1.5 select-none ${stateStyles}`}
											title={`${i.toString().padStart(2, "0")}:00 - ${!isMounted ? "Cargando..." : isAttended ? "Atendida" : isPast ? "Falta Registro" : "Futuro"}`}
										>
											<span className="text-[8px] font-mono font-bold block opacity-40 text-center w-full">
												{i.toString().padStart(2, "0")}
											</span>
											{isAttended ? (
												<span className="w-1.5 h-1.5 rounded-full bg-white self-center mb-1 shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
											) : isCurrent ? (
												<span className="w-1.5 h-1.5 rounded-full bg-indigo-400 self-center mb-1 animate-ping" />
											) : isPast ? (
												<span className="w-1 h-1 rounded-full bg-[#E97366]/40 self-center mb-1" />
											) : (
												<span className="w-1 h-1 rounded-full bg-transparent self-center mb-1" />
											)}
										</button>
									);
								})}
							</div>

							{/* Panel de detalles de hora seleccionada */}
							<div className="bg-[#202024]/50 border border-white/[0.04] rounded-xl p-5 flex flex-col gap-4 min-h-[85px] transition-all">
								<div className="flex justify-between items-center border-b border-white/[0.03] pb-3">
									<div className="flex items-center gap-2.5">
										<span className="text-xs font-mono font-semibold text-indigo-400">
											Bloque de las {isMounted ? selectedTimelineHour.toString().padStart(2, "0") : "--"}:00
										</span>
										<span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md uppercase border ${
											isMounted && hoursAttended.has(selectedTimelineHour)
												? "bg-[#72BC8F]/8 text-[#72BC8F] border-[#72BC8F]/15"
												: "bg-[#E97366]/8 text-[#E97366]/85 border-[#E97366]/15"
										}`}>
											{isMounted && hoursAttended.has(selectedTimelineHour) ? "Registrada" : "Pendiente"}
										</span>
									</div>

									{!hoursAttended.has(selectedTimelineHour) && (
										<button
											onClick={() => registrarHoraPendiente(selectedTimelineHour)}
											className="text-[10px] text-indigo-400 hover:text-white hover:bg-indigo-500/10 border border-indigo-500/15 px-3 py-1.5 rounded-xl transition-all font-semibold cursor-pointer"
										>
											+ Registrar esta hora
										</button>
									)}
								</div>

								{isMounted && notesAtSelectedHour.length > 0 ? (
									<ul className="space-y-3">
										{notesAtSelectedHour.map((n) => {
											const dec = TIPO_DECORATIONS[n.tipo as keyof typeof TIPO_DECORATIONS] || TIPO_DECORATIONS.nota;
											return (
												<li key={n.id} className="text-xs flex items-start gap-3 bg-black/20 p-3 rounded-xl border border-white/[0.02]">
													<span className="text-base mt-0.5">{dec.emoji}</span>
													<div className="flex-1 min-w-0">
														<p className="text-gray-300 font-medium leading-relaxed">{n.texto}</p>
														<span className="text-[9px] text-gray-500 font-mono uppercase font-bold mt-1.5 block">
															{new Date(n.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
														</span>
													</div>
												</li>
											);
										})}
									</ul>
								) : (
									<p className="text-xs text-gray-500 italic leading-relaxed">
										{selectedTimelineHour <= currentHour
											? "No hay notas guardadas en esta hora todavía. Registra tus actividades pasadas para cubrir la línea de tiempo."
											: "Bloque horario futuro. Completa tu bitácora cuando llegue el momento."}
									</p>
								)}
							</div>
						</section>

						{/* REGISTROS HISTÓRICOS: Corpus Feed Unificado */}
						<section className="flex flex-col gap-5 border-t border-white/[0.06] pt-8">

							{/* Fila de Cabecera y Buscador */}
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-0.5">
								<div>
									<h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono flex items-center gap-2">
										<Database className="w-4 h-4 text-indigo-400" />
										Bitácora histórica
									</h2>
									<p className="text-[11px] text-gray-500 font-mono mt-0.5">
										{stats.total} {stats.total === 1 ? 'entrada registrada' : 'entradas registradas'}
									</p>
								</div>

								{/* Buscador ultra premium */}
								<div className="relative w-full md:w-64">
									<span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
										<Search className="w-3.5 h-3.5 text-gray-500" />
									</span>
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Buscar en el historial..."
										className="w-full bg-[#18181b] border border-white/[0.06] rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.15] transition-colors"
									/>
									{searchQuery && (
										<button
											onClick={() => setSearchQuery("")}
											className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white cursor-pointer"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									)}
								</div>
							</div>

							{/* Filtros rápidos implícitos en Pills (Ligeros y Opcionales) */}
							<div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
								<button
									onClick={() => setTipoFilter(null)}
									className={`px-3.5 py-2 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-all whitespace-nowrap border cursor-pointer ${
										tipoFilter === null
											? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
											: "bg-[#18181b] border-white/[0.03] text-gray-400 hover:text-white"
									}`}
								>
									Todos ({stats.total})
								</button>
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
									/* Estado Vacío Hermoso */
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
													{/* Fila superior de la tarjeta */}
													<div className="flex justify-between items-start gap-4 mb-4">
														<span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-semibold tracking-wider uppercase border ${decoration.color}`}>
															<span>{decoration.emoji}</span>
															<span>{decoration.label}</span>
														</span>

														<div className="flex items-center gap-2">
															{/* Botón de telemetría */}
															<button
																onClick={() => setShowTelemetryId(isTelemetryOpen ? null : captura.id)}
																title="Mostrar metadatos de telemetría"
																className={`p-1.5 rounded-lg border border-transparent transition-all hover:bg-[#202024] cursor-pointer ${
																	isTelemetryOpen ? "text-indigo-400 bg-indigo-500/5 border-indigo-500/10" : "text-gray-500 hover:text-gray-300"
																}`}
															>
																<Info className="w-4 h-4" />
															</button>

															{/* Especie de canal de captura */}
															<span
																className="text-[9px] text-gray-500 flex items-center gap-1.5 bg-[#202024]/60 border border-white/[0.04] px-2.5 py-1 rounded-md font-mono"
																title={captura.origen === "voice" ? "Entrada dictada con voz" : "Entrada escrita con teclado"}
															>
																{captura.origen === "voice" ? (
																	<>
																		<Mic className="w-3 h-3 text-indigo-400" />
																		Voz
																	</>
																) : (
																	<>
																		<Keyboard className="w-3 h-3 text-gray-500" />
																		Texto
																	</>
																)}
															</span>
														</div>
													</div>

													{/* Texto de la captura */}
													<p className="text-sm leading-relaxed whitespace-pre-wrap text-[#e3e3e6] px-0.5 font-medium">
														{captura.texto}
													</p>

													{/* Telemetría Colapsable */}
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

													{/* Pie de Nota */}
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
