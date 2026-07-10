const fs = require('fs');
const filePath = 'khora-web/app/bitacora/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldForm = `          <form onSubmit={handleLogin} className="bg-[#18181b] border border-white/[0.06] rounded-2xl p-7 flex flex-col gap-5 shadow-xl">
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
          </form>`;

const newForm = `          {usePinLogin ? (
            <form onSubmit={handlePinLogin} className="bg-[#18181b] border border-white/[0.06] rounded-2xl p-7 flex flex-col gap-5 shadow-xl">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-white">Desbloquear con PIN</h2>
                <p className="text-xs text-gray-500">Ingresa tu PIN de acceso</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-mono">PIN (4 dígitos)</label>
                <div className="flex items-center gap-2.5 bg-[#202024]/60 border border-white/[0.06] rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500/50 transition-colors">
                  <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                  <input type={showPass ? "text" : "password"} value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\\D/g, '').slice(0, 4)); setPinError(""); }} autoFocus placeholder="••••" className="bg-transparent outline-none text-center tracking-[0.5em] text-lg text-white placeholder:text-gray-600 w-full" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0" aria-label="Mostrar u ocultar PIN">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {pinError && (
                  <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: "auto" } } exit={ { opacity: 0, height: 0 } } className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" disabled={pinInput.length !== 4} className="mt-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-600/50 disabled:text-white/50 text-white text-sm font-semibold rounded-xl px-4 py-3 transition-colors shadow-lg shadow-indigo-600/20">
                <LogIn className="w-4 h-4" />
                <span>Desbloquear</span>
              </button>

              <button type="button" onClick={() => setUsePinLogin(false)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors">
                Usar usuario/contraseña en su lugar
              </button>
            </form>
          ) : (
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

              {hasPinConfigured && (
                <button type="button" onClick={() => setUsePinLogin(true)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors">
                  Desbloquear con PIN en su lugar
                </button>
              )}
            </form>
          )}`;

content = content.replace(oldForm, newForm);

fs.writeFileSync(filePath, content);
