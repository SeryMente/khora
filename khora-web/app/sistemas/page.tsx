"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server, Shield, Key, Lock, ChevronLeft, ArrowRight, Eye, Trash2, Mail
} from "lucide-react";
import {
  setupCryptoEnvironment, verifyPIN, encryptSecret,
  decryptSecret, hasCryptoState, getSecretNames, deleteSecret,
  resetPINWithRecoveryCode
} from "../../lib/crypto";

// Sub-navigation states
type ViewState = 'root' | 'seguridad' | 'secretos' | 'fijar_pin' | 'recuperar_pin';

export default function SistemasPage() {
  const [view, setView] = useState<ViewState>('root');
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    setIsSetup(hasCryptoState());
  }, []);

  return (
    <main className="bg-[#0B1F3B] min-h-screen flex flex-col p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#112A4F]/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full flex items-center justify-between z-10 mb-12 mt-4 max-w-4xl mx-auto">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-widest font-mono">
          <ChevronLeft className="w-4 h-4" />
          Core
        </Link>
        <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">Sistemas</h1>
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      {/* Dynamic Content */}
      <div className="z-10 w-full max-w-4xl mx-auto flex-1">
        {view === 'root' && <RootView setView={setView} />}
        {view === 'seguridad' && <SeguridadView setView={setView} isSetup={isSetup} />}
        {view === 'fijar_pin' && <FijarPinView setView={setView} setIsSetup={setIsSetup} />}
        {view === 'secretos' && <SecretosView setView={setView} />}
        {view === 'recuperar_pin' && <RecuperarPinView setView={setView} setIsSetup={setIsSetup} />}
      </div>
    </main>
  );
}

// --- VIEWS ---

function RootView({ setView }: { setView: (v: ViewState) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <button
        onClick={() => setView('seguridad')}
        className="text-left bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 rounded-2xl p-8 flex flex-col items-start gap-4 group h-full"
      >
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all">
          <Shield className="w-6 h-6 text-white group-hover:text-[#3FA7FF]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight mb-1">Seguridad</h2>
          <p className="text-xs text-gray-400 font-mono">Criptografía y Control de Acceso</p>
        </div>
      </button>

      {/* Other system modules could go here in the future */}
      <div className="opacity-50 pointer-events-none text-left bg-[#112A4F]/50 border border-[#1F3C6A]/50 rounded-2xl p-8 flex flex-col items-start gap-4 h-full">
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
          <Server className="w-6 h-6 text-white/50" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white/50 tracking-tight mb-1">Infraestructura</h2>
          <p className="text-xs text-gray-400 font-mono">Offline / Placeholder</p>
        </div>
      </div>
    </div>
  );
}

function SeguridadView({ setView, isSetup }: { setView: (v: ViewState) => void, isSetup: boolean }) {
  return (
    <div>
      <button
        onClick={() => setView('root')}
        className="text-gray-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest font-mono mb-8"
      >
        <ChevronLeft className="w-3 h-3" /> Atrás
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <button
          onClick={() => setView('secretos')}
          className="text-left bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 rounded-2xl p-8 flex flex-col items-start gap-4 group h-full"
        >
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all">
            <Key className="w-6 h-6 text-white group-hover:text-[#3FA7FF]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight mb-1">Secretos</h2>
            <p className="text-xs text-gray-400 font-mono">Llavero Criptográfico Local</p>
          </div>
          {!isSetup && (
            <div className="mt-4 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] rounded uppercase tracking-wider font-mono">
              Requiere PIN
            </div>
          )}
        </button>

        <button
          onClick={() => setView('fijar_pin')}
          className="text-left bg-[#112A4F] border border-[#1F3C6A] hover:border-[#3FA7FF] hover:bg-[#112A4F]/80 transition-all duration-200 rounded-2xl p-8 flex flex-col items-start gap-4 group h-full"
        >
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 group-hover:bg-white/[0.06] group-hover:border-[#3FA7FF]/30 flex items-center justify-center transition-all">
            <Lock className="w-6 h-6 text-white group-hover:text-[#3FA7FF]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight mb-1">Fijar PIN de Seguridad</h2>
            <p className="text-xs text-gray-400 font-mono">{isSetup ? "Restablecer Sistema" : "Inicializar DEK"}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function FijarPinView({ setView, setIsSetup }: { setView: (v: ViewState) => void, setIsSetup: (s: boolean) => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError("El PIN debe ser de 4 dígitos numéricos.");
      return;
    }
    if (pin !== confirm) {
      setError("Los PIN no coinciden.");
      return;
    }

    setLoading(true);
    try {
      // 1. Setup Crypto Environment (generates DEK and Recovery Code)
      const { recoveryCode } = await setupCryptoEnvironment(pin);

      // 2. Call backend to send email
      const email = 'the.willfreeman@gmail.com';
      const res = await fetch('/api/security/setup-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryCode, email })
      });

      if (!res.ok) {
        // Even if email fails, crypto is setup locally. But warn the user.
        console.warn("Could not send recovery email, but local crypto is set.");
      }

      setRecoveryCode(recoveryCode);
      setIsSetup(true);
    } catch (err: any) {
      setError(err.message || "Error al inicializar el entorno criptográfico.");
    } finally {
      setLoading(false);
    }
  };

  if (recoveryCode) {
    return (
      <div className="max-w-md mx-auto bg-[#112A4F] border border-green-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 text-green-400">
          <Shield className="w-6 h-6" />
          <h2 className="text-lg font-bold tracking-tight">Sistema Criptográfico Listo</h2>
        </div>
        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
          Tu Llave Maestra (DEK) ha sido generada y asegurada con tu PIN. Un respaldo de recuperación de alta entropía ha sido enviado a <strong className="text-white">the.willfreeman@gmail.com</strong>.
        </p>
        <div className="bg-black/30 p-4 rounded-xl border border-white/10 mb-8 break-all">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-2">Código de Recuperación Local</p>
          <code className="text-[#3FA7FF] font-mono text-sm">{recoveryCode}</code>
        </div>
        <button
          onClick={() => setView('seguridad')}
          className="w-full py-3 bg-[#3FA7FF] hover:bg-[#3FA7FF]/90 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Continuar <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={() => setView('seguridad')}
        className="text-gray-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest font-mono mb-8"
      >
        <ChevronLeft className="w-3 h-3" /> Cancelar
      </button>

      <form onSubmit={handleSubmit} className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">Definir PIN de Acceso</h2>
        <p className="text-xs text-gray-400 font-mono mb-8">PBKDF2 • HMAC-SHA256 • AES-GCM</p>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-mono">Nuevo PIN (4 dígitos)</label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] text-2xl outline-none focus:border-[#3FA7FF] transition-colors"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-mono">Confirmar PIN</label>
            <input
              type="password"
              maxLength={4}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] text-2xl outline-none focus:border-[#3FA7FF] transition-colors"
              placeholder="••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || pin.length !== 4 || confirm.length !== 4}
          className="w-full mt-8 py-3 bg-[#3FA7FF] hover:bg-[#3FA7FF]/90 text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? "Inicializando..." : "Asegurar Sistema"} <Lock className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

function SecretosView({ setView }: { setView: (v: ViewState) => void }) {
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null);

  if (!unlockedPin) {
    return <UnlockPrompt setView={setView} onUnlock={setUnlockedPin} />;
  }

  return <SecretsDashboard pin={unlockedPin} setView={setView} onLock={() => setUnlockedPin(null)} />;
}

function UnlockPrompt({ setView, onUnlock }: { setView: (v: ViewState) => void, onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setLoading(true);
    setError("");
    try {
      const isValid = await verifyPIN(pin);
      if (isValid) {
        onUnlock(pin);
      } else {
        setError("PIN incorrecto. Descifrado fallido.");
        setPin("");
      }
    } catch (err) {
      setError("Error interno al verificar PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={() => setView('seguridad')}
        className="text-gray-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest font-mono mb-8"
      >
        <ChevronLeft className="w-3 h-3" /> Cancelar
      </button>

      <form onSubmit={handleUnlock} className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Key className="w-8 h-8 text-[#3FA7FF]" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mb-2 text-center">Acceso Requerido</h2>
        <p className="text-xs text-gray-400 font-mono mb-8 text-center">Ingresa el PIN para descifrar la DEK</p>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          className="w-full mb-6 bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] text-2xl outline-none focus:border-[#3FA7FF] transition-colors"
          placeholder="••••"
          autoFocus
        />

        <button
          type="submit"
          disabled={loading || pin.length !== 4}
          className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Descifrando..." : "Desbloquear"}
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setView('recuperar_pin')}
            className="text-xs text-[#3FA7FF] hover:text-white transition-colors underline font-mono"
          >
            ¿Olvidaste tu PIN?
          </button>
        </div>
      </form>
    </div>
  );
}

function SecretsDashboard({ pin, setView, onLock }: { pin: string, setView: (v: ViewState) => void, onLock: () => void }) {
  const [secrets, setSecrets] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<{name: string, value: string} | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSecrets(getSecretNames());
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) return;

    try {
      await encryptSecret(pin, newName.trim(), newValue.trim());
      setNewName("");
      setNewValue("");
      setSecrets(getSecretNames());
    } catch (err: any) {
      setError(err.message || "Error al cifrar el secreto.");
    }
  };

  const handleDelete = (name: string) => {
    deleteSecret(name);
    setSecrets(getSecretNames());
  };

  const handleReveal = async (name: string) => {
    try {
      const plain = await decryptSecret(pin, name);
      setRevealedSecret({ name, value: plain });

      // Strict memory wipe requirement: clear after 5 seconds
      setTimeout(() => {
        setRevealedSecret(null);
      }, 5000);
    } catch (err: any) {
      setError("Error al descifrar el secreto.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => { onLock(); setView('seguridad'); }}
          className="text-gray-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest font-mono"
        >
          <ChevronLeft className="w-3 h-3" /> Atrás y Bloquear
        </button>
        <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] uppercase font-mono rounded tracking-widest">
          DEK Desbloqueada
        </div>
      </div>

      <div className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 mb-8">
        <h3 className="text-white font-bold mb-4">Añadir Secreto</h3>
        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            placeholder="Identificador (ej. API Key)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-2 text-white outline-none focus:border-[#3FA7FF]"
          />
          <input
            type="password"
            placeholder="Valor Secreto"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            className="flex-1 bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-2 text-white outline-none focus:border-[#3FA7FF]"
          />
          <button type="submit" className="px-6 py-2 bg-[#3FA7FF] text-black font-bold rounded-xl hover:bg-[#3FA7FF]/90 transition-colors">
            Cifrar
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest px-2">Bóveda Criptográfica</h3>
        {secrets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#1F3C6A] rounded-2xl text-gray-500">
            No hay secretos almacenados
          </div>
        ) : (
          secrets.map(name => (
            <div key={name} className="flex items-center justify-between p-4 bg-[#112A4F]/50 border border-[#1F3C6A] rounded-xl group hover:border-[#3FA7FF]/50 transition-colors">
              <div className="flex-1">
                <p className="text-white font-medium">{name}</p>
                <div className="font-mono text-xs mt-1">
                  {revealedSecret?.name === name ? (
                    <span className="text-green-400 break-all">{revealedSecret.value}</span>
                  ) : (
                    <span className="text-gray-500">••••••••••••••••</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleReveal(name)}
                  className="p-2 text-gray-400 hover:text-[#3FA7FF] transition-colors"
                  title="Revelar por 5s"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecuperarPinView({ setView, setIsSetup }: { setView: (v: ViewState) => void, setIsSetup: (s: boolean) => void }) {
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || newPin.length !== 4) return;

    setLoading(true);
    setError("");
    try {
      await resetPINWithRecoveryCode(code, newPin);
      setSuccess(true);
    } catch (err) {
      setError("Código inválido o error al re-cifrar la Llave Maestra.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-[#112A4F] border border-green-500/30 rounded-2xl p-8 shadow-2xl text-center">
        <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">PIN Actualizado</h2>
        <p className="text-sm text-gray-300 mb-8">
          La Llave Maestra ha sido descifrada y re-cifrada con éxito usando tu nuevo PIN.
        </p>
        <button
          onClick={() => setView('seguridad')}
          className="w-full py-3 bg-[#3FA7FF] text-black font-bold rounded-xl"
        >
          Volver a Seguridad
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={() => setView('seguridad')}
        className="text-gray-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest font-mono mb-8"
      >
        <ChevronLeft className="w-3 h-3" /> Cancelar
      </button>

      <form onSubmit={handleRecover} className="bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#3FA7FF]" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mb-2 text-center">Recuperación de Acceso</h2>
        <p className="text-xs text-gray-400 font-mono mb-8 text-center leading-relaxed">
          Ingresa el Código de Alta Entropía que recibiste en the.willfreeman@gmail.com
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-mono">Código de Recuperación</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-3 text-white font-mono text-center outline-none focus:border-[#3FA7FF]"
              placeholder="Ej. e7a9b2..."
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-mono">Nuevo PIN (4 dígitos)</label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              className="w-full bg-black/30 border border-[#1F3C6A] rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] text-xl outline-none focus:border-[#3FA7FF]"
              placeholder="••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !code || newPin.length !== 4}
          className="w-full mt-8 py-3 bg-[#3FA7FF] hover:bg-[#3FA7FF]/90 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Re-cifrando DEK..." : "Recuperar y Actualizar"}
        </button>
      </form>
    </div>
  );
}
