export function principalFromVerifiedSession(session: unknown, cookieHeader: string | null, now?: number): {subject: string; binding: string} | null;
