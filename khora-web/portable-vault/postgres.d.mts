export type VerifiedPrincipal = {subject: string; binding: string};
export function candidateRuntime(options: {
 authenticate: (request: Request) => Promise<VerifiedPrincipal | null>;
 env?: Record<string, string | undefined>;
}): {handler: (request: Request) => Promise<Response>; initializeSchema: () => Promise<void>; close: () => Promise<void>};
export function postgresConfig(raw: string): object;
