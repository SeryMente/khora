const fs = require('fs');

const filePath = 'khora-web/app/bitacora/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { useCapturas } from "@/lib/hooks";',
  'import { useCapturas } from "@/lib/hooks";\nimport { checkAuthSession, setAuthSession, clearAuthSession } from "@/lib/auth";\nimport { hasCryptoState, verifyPIN, setupCryptoEnvironment } from "@/lib/crypto";'
);

content = content.replace(
  /const \[loginUser, setLoginUser\] = useState\(""\);\n\s*const \[loginPass, setLoginPass\] = useState\(""\);\n\s*const \[showPass, setShowPass\] = useState\(false\);\n\s*const \[loginError, setLoginError\] = useState\(false\);/,
  `const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);`
);

content = content.replace(
  /useEffect\(\(\) => \{\n\s*if \(typeof window !== "undefined" && localStorage.getItem\("khora_auth"\) === "1"\) \{\n\s*setIsAuth\(true\);\n\s*\}\n\s*setAuthChecked\(true\);\n\s*\}, \[\]\);/,
  `useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAuth(checkAuthSession());
      setIsSetup(!hasCryptoState());
    }
    setAuthChecked(true);
  }, []);`
);

content = content.replace(
  /const handleLogin = \(e: React.FormEvent\) => \{\n\s*e.preventDefault\(\);\n\s*if \(loginUser.trim\(\) === "willfreeman" && loginPass === "A02122310a!"\) \{\n\s*setIsAuth\(true\);\n\s*setLoginError\(false\);\n\s*if \(typeof window !== "undefined"\) localStorage.setItem\("khora_auth", "1"\);\n\s*\} else \{\n\s*setLoginError\(true\);\n\s*\}\n\s*\};/,
  `const handleLogin = async (e: React.FormEvent) => {
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
  };`
);


// Replace the unauthenticated render
const oldUnAuthRender = `<div className="min-h-screen bg-[#0B1F3B] flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3FA7FF]/5 rounded-full blur-[150px]" />
        </div>
        <div className="z-10 w-full max-w-sm bg-[#112A4F] border border-[#1F3C6A] rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#3FA7FF]" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Acceso Restringido</h2>
            <p className="text-[11px] text-gray-400 font-mono tracking-widest uppercase opacity-60 mt-2">Bitácora cifrada</p>
          </div>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Usuario"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full bg-[#0B1F3B] border border-[#1F3C6A] rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#3FA7FF] transition-colors"
                autoComplete="username"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="PIN criptográfico"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full bg-[#0B1F3B] border border-[#1F3C6A] rounded-xl py-3 pl-10 pr-10 text-white text-sm focus:outline-none focus:border-[#3FA7FF] transition-colors font-mono tracking-widest"
                autoComplete="current-password"
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
                Credenciales inválidas
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-[#3FA7FF] text-white py-3 rounded-xl font-medium shadow-[0_0_15px_rgba(63,167,255,0.2)] hover:shadow-[0_0_20px_rgba(63,167,255,0.4)] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Desbloquear Memoria</span>
            </button>
          </form>
        </div>
      </div>`;

const newUnAuthRender = `<div className="min-h-screen bg-[#0B1F3B] flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">
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
      </div>`;

// Escape backticks before searching if it has variables but using normal string
// Actually oldUnAuthRender is exactly in the file but let's check
let splitIndex = content.indexOf('<div className="min-h-screen bg-[#0B1F3B] flex flex-col items-center justify-center p-6 selection:bg-[#3FA7FF]/20 relative overflow-hidden">');
if (splitIndex !== -1) {
  let endIndex = content.indexOf('return (', splitIndex);
  if (endIndex !== -1) {
    content = content.substring(0, splitIndex) + newUnAuthRender + '\n    );\n  }\n\n  ' + content.substring(endIndex);
  }
}

content = content.replace(
  /<p className="text-gray-400 text-sm mt-1.5 font-medium flex items-center gap-2">/,
  `<div className="flex items-center gap-4 mt-1.5">
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
            </div>`
);

fs.writeFileSync(filePath, content);
