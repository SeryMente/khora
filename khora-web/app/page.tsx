"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Splash } from "./components/Splash";
import { Wrench, Server, Lock, KeyRound, AlertTriangle, User } from "lucide-react";
import { checkAuthSession, setAuthSession } from "../lib/auth";
import { hasCryptoState, setupCryptoEnvironment, verifyPIN } from "../lib/crypto";
import { verifyLegacyCredentials } from "../lib/auth-actions";

export default function RootMenu() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cryptoExists, setCryptoExists] = useState(false);
  const [isSettingUpPIN, setIsSettingUpPIN] = useState(false);
  const [useFallbackAuth, setUseFallbackAuth] = useState(false);

  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  useEffect(() => {
    if (!showSplash) {
      if (checkAuthSession()) {
        setIsAuthenticated(true);
      } else {
        const hasCrypto = hasCryptoState();
        setCryptoExists(hasCrypto);
        if (!hasCrypto) {
          // If no PIN exists, default to fallback auth (user/pass)
          setUseFallbackAuth(true);
        }
      }
    }
  }, [showSplash]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSettingUpPIN) {
      if (pin.length < 6) {
        setError("El PIN debe tener al menos 6 dígitos.");
        return;
      }
      setLoading(true);
      try {
        const result = await setupCryptoEnvironment(pin);
        setRecoveryCode(result.recoveryCode);
      } catch (err) {
        console.error(err);
        setError("Error al configurar el entorno criptográfico.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!pin) {
        setError("Introduce tu PIN.");
        return;
      }
      setLoading(true);
      try {
        const isValid = await verifyPIN(pin);
        if (isValid) {
          setAuthSession();
          setIsAuthenticated(true);
        } else {
          setError("PIN incorrecto.");
          setPin("");
        }
      } catch (err) {
        console.error(err);
        setError("Error al verificar el PIN.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLegacyAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Introduce usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyLegacyCredentials(username, password);
      if (isValid) {
        if (!cryptoExists) {
          // Si no tienen PIN configurado, enviarlos a configurarlo
          setUseFallbackAuth(false);
          setIsSettingUpPIN(true);
        } else {
          // Fallback exitoso y ya tienen PIN
          setAuthSession();
          setIsAuthenticated(true);
        }
      } else {
        setError("Credenciales incorrectas.");
      }
    } catch (err) {
      console.error(err);
      setError("Error en la autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryAcknowledge = () => {
    setAuthSession();
    setIsAuthenticated(true);
  };

  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  if (!isAuthenticated) {
    return (
      <main className="bg-[#0B1F3B] min-h-screen flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
        </div>

        <header className="absolute top-0 left-0 w-full p-8 flex justify-center z-10">
          <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">ATHANOR</h1>
        </header>

        <div className="z-10 w-full max-w-md">
          {recoveryCode ? (
            <div className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-[#3FA7FF]/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[#3FA7FF]" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white tracking-tight mb-2">Código de Recuperación</h2>
                <p className="text-sm text-gray-400 mb-6">Guarda este código en un lugar seguro. Es la única forma de recuperar tu acceso si olvidas tu PIN.</p>
                <div className="bg-[#0B1F3B] p-4 rounded-xl border border-[#1F3C6A] mb-6">
                  <code className="text-[#3FA7FF] font-mono break-all text-sm">{recoveryCode}</code>
                </div>
                <button
                  onClick={handleRecoveryAcknowledge}
                  className="w-full bg-[#3FA7FF] hover:bg-[#3FA7FF]/90 text-[#0B1F3B] font-bold py-3 px-4 rounded-xl transition-colors duration-200"
                >
                  Entendido / Continuar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                {useFallbackAuth ? <User className="w-8 h-8 text-white" /> : (isSettingUpPIN ? <KeyRound className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />)}
              </div>

              <div className="text-center w-full">
                <h2 className="text-xl font-bold text-white tracking-tight mb-2">
                  {useFallbackAuth ? "Autenticación del Sistema" : (isSettingUpPIN ? "Configurar PIN" : "Desbloquear Sistema")}
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  {useFallbackAuth ? "Introduce tus credenciales de acceso" : (isSettingUpPIN ? "Crea un PIN de al menos 6 dígitos para proteger tu sesión" : "Introduce tu PIN para acceder")}
                </p>

                {useFallbackAuth ? (
                  <form onSubmit={handleLegacyAuthSubmit} className="flex flex-col gap-4">
                    <div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Usuario"
                        className="w-full bg-[#0B1F3B] border border-[#1F3C6A] text-white p-4 rounded-xl focus:outline-none focus:border-[#3FA7FF] transition-colors"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full bg-[#0B1F3B] border border-[#1F3C6A] text-white p-4 rounded-xl focus:outline-none focus:border-[#3FA7FF] transition-colors"
                        disabled={loading}
                      />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#3FA7FF] hover:bg-[#3FA7FF]/90 text-[#0B1F3B] font-bold py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50"
                    >
                      {loading ? "Verificando..." : "Acceder"}
                    </button>
                    {cryptoExists && (
                      <button
                        type="button"
                        onClick={() => { setUseFallbackAuth(false); setError(""); }}
                        className="mt-2 text-sm text-[#3FA7FF] hover:text-white transition-colors"
                      >
                        Usar PIN criptográfico
                      </button>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
                    <div>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-[#0B1F3B] border border-[#1F3C6A] text-white text-center text-2xl tracking-[0.5em] p-4 rounded-xl focus:outline-none focus:border-[#3FA7FF] transition-colors"
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#3FA7FF] hover:bg-[#3FA7FF]/90 text-[#0B1F3B] font-bold py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50"
                    >
                      {loading ? "Procesando..." : (isSettingUpPIN ? "Crear PIN" : "Desbloquear")}
                    </button>
                    {cryptoExists && !isSettingUpPIN && (
                      <button
                        type="button"
                        onClick={() => { setUseFallbackAuth(true); setError(""); }}
                        className="mt-2 text-sm text-[#3FA7FF] hover:text-white transition-colors"
                      >
                        Usar usuario y contraseña
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="absolute bottom-8 left-0 w-full flex justify-center z-10 opacity-40">
          <span className="text-[9px] text-white font-mono uppercase tracking-[0.3em]">Sistema Operativo Khora</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-center z-10">
        <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">ATHANOR</h1>
      </header>

      {/* Center Link Cards */}
      <div className="z-10 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/herramientas" className="block outline-none focus:outline-none">
          <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl cursor-pointer group h-full">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
              <Wrench className="w-8 h-8 text-white group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Herramientas</h2>
              <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-60 text-center">Utilidades</p>
            </div>
          </div>
        </Link>

        <Link href="/sistemas" className="block outline-none focus:outline-none">
          <div className="bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 ease-in-out rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl cursor-pointer group h-full">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all duration-200 ease-in-out">
              <Server className="w-8 h-8 text-white group-hover:text-[#3FA7FF] transition-colors duration-200 ease-in-out" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Sistemas</h2>
              <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-60 text-center">Núcleo y Seguridad</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Footer text */}
      <footer className="absolute bottom-8 left-0 w-full flex justify-center z-10 opacity-40">
        <span className="text-[9px] text-white font-mono uppercase tracking-[0.3em]">Sistema Operativo Khora</span>
      </footer>
    </main>
  );
}
