export type HuellaServidor = {
  ipv4: string | null;
  receivedAt: string;
  headers: {
    country?: string | null;
    city?: string | null;
    region?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    timezone?: string | null;
    asOrganization?: string | null;
    acceptLanguage?: string | null;
    userAgent?: string | null;
    secChUa?: string | null;
    secChUaMobile?: string | null;
    secChUaPlatform?: string | null;
    referer?: string | null;
  };
};

export type HuellaCliente = {
  timezone: string;
  timezoneOffset: number;
  languages: string[];
  platform: string;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  windowInnerWidth: number;
  windowInnerHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  maxTouchPoints: number;
  connectionType: string | null;
  prefersDarkMode: boolean;
  prefersReducedMotion: boolean;
};

export type HuellaSesion = {
  sessionId: string;
  mode: string;
  acquisitionChannel: string;
  timestamp: string;
};

export type HuellaExhaustiva = {
  servidor: HuellaServidor;
  cliente: HuellaCliente | null;
  sesion: HuellaSesion;
};

export function capturarHuellaCliente(): HuellaCliente | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    timezoneOffset: new Date().getTimezoneOffset(),
    languages: Array.from(nav.languages || [nav.language || 'es']),
    platform: String(nav.platform || ''),
    userAgent: String(nav.userAgent || ''),
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    windowInnerWidth: window.innerWidth || 0,
    windowInnerHeight: window.innerHeight || 0,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen?.colorDepth || 24,
    hardwareConcurrency: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    maxTouchPoints: typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0,
    connectionType: conn?.effectiveType || conn?.type || null,
    prefersDarkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches || false,
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
  };
}

export function extraerIPv4(headers: Record<string, string | string[] | undefined>): string | null {
  const getHeader = (key: string): string | null => {
    const val = headers[key] || headers[key.toLowerCase()];
    if (!val) return null;
    return Array.isArray(val) ? val[0] : val;
  };

  const rawIp = getHeader('x-real-ip') || getHeader('x-vercel-forwarded-for') || getHeader('x-forwarded-for');
  if (!rawIp) return null;

  const candidates = rawIp.split(',').map(s => s.trim());
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  for (const cand of candidates) {
    if (ipv4Regex.test(cand)) {
      return cand;
    }
  }
  return null;
}

export function capturarHuellaServidor(headers: Record<string, string | string[] | undefined>): HuellaServidor {
  const getHeader = (key: string): string | null => {
    const val = headers[key] || headers[key.toLowerCase()];
    if (!val) return null;
    return Array.isArray(val) ? val[0] : val;
  };

  return {
    ipv4: extraerIPv4(headers),
    receivedAt: new Date().toISOString(),
    headers: {
      country: getHeader('x-vercel-ip-country'),
      city: getHeader('x-vercel-ip-city'),
      region: getHeader('x-vercel-ip-country-region'),
      latitude: getHeader('x-vercel-ip-latitude'),
      longitude: getHeader('x-vercel-ip-longitude'),
      timezone: getHeader('x-vercel-ip-timezone'),
      asOrganization: getHeader('x-vercel-ip-as-number'),
      acceptLanguage: getHeader('accept-language'),
      userAgent: getHeader('user-agent'),
      secChUa: getHeader('sec-ch-ua'),
      secChUaMobile: getHeader('sec-ch-ua-mobile'),
      secChUaPlatform: getHeader('sec-ch-ua-platform'),
      referer: getHeader('referer'),
    },
  };
}
