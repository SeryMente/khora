export interface ForensicMetadata {
	geo?: { lat: number; long: number; accuracy: number };
	platform: string;
	resolution: string;
	timezone: string;
	appVersion: string;
	duracionCapturaMs?: number;
}

export async function getForensicMetadata(duracionMs?: number): Promise<ForensicMetadata> {
	// Platform
	const platform = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
	
	// Resolution
	const resolution = typeof window !== 'undefined' && typeof window.screen !== 'undefined'
		? `${window.screen.width}x${window.screen.height} (viewport: ${window.innerWidth}x${window.innerHeight})`
		: 'Unknown';
		
	// Timezone
	const timezone = typeof Intl !== 'undefined' 
		? `${Intl.DateTimeFormat().resolvedOptions().timeZone} (Offset: ${new Date().getTimezoneOffset()})`
		: 'Unknown';
		
	// App version (mocked as env var or hardcoded if not present)
	const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev-build';

	// Geo (only if permission is already granted, avoid prompting aggressively, or we can just try to get it with a short timeout if we want, but instructions say "solo si hay permiso; si no, dejar vacío, NUNCA inventar")
	let geo = undefined;
	if (typeof navigator !== 'undefined' && 'geolocation' in navigator && 'permissions' in navigator) {
		try {
			const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
			if (permission.state === 'granted') {
				geo = await new Promise<{lat: number, long: number, accuracy: number} | undefined>((resolve) => {
					navigator.geolocation.getCurrentPosition(
						(pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude, accuracy: pos.coords.accuracy }),
						() => resolve(undefined),
						{ timeout: 2000 }
					);
				});
			}
		} catch (e) {
			// ignore
		}
	}

	return {
		geo,
		platform,
		resolution,
		timezone,
		appVersion,
		duracionCapturaMs: duracionMs
	};
}

export async function generateHash(content: string): Promise<string> {
	if (typeof crypto !== 'undefined' && crypto.subtle) {
		const msgBuffer = new TextEncoder().encode(content);
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}
	// Fallback if subtle is not available (e.g. non-HTTPS local dev)
	return `fallback-hash-${Date.now()}`;
}
