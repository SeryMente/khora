export interface KhoraAuthSession {
  authenticated: boolean;
  timestamp: number;
}

const AUTH_TIMEOUT = 900000; // 15 minutes in ms
const SESSION_KEY = "khora_auth_session";

export function setAuthSession() {
  if (typeof window === "undefined") return;
  const session: KhoraAuthSession = {
    authenticated: true,
    timestamp: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function checkAuthSession(): boolean {
  if (typeof window === "undefined") return false;

  // Legacy support for transitioning
  if (localStorage.getItem("khora_auth") === "1") {
    localStorage.removeItem("khora_auth");
    setAuthSession();
    return true;
  }

  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return false;

  try {
    const session = JSON.parse(sessionStr) as KhoraAuthSession;
    if (session.authenticated && (Date.now() - session.timestamp < AUTH_TIMEOUT)) {
      // Refresh session timestamp on valid check
      setAuthSession();
      return true;
    }
  } catch (e) {
    // Ignore parse errors, just clear invalid session
  }

  localStorage.removeItem(SESSION_KEY);
  return false;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("khora_auth");
}
