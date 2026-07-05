import { db, type Captura } from "./db";
import { generateHash } from "./forensics";

export interface ChainHealthResult {
    ok: boolean;
    brokenAtSecuencia?: number;
    errorType?: 'missing_sequence' | 'hash_mismatch' | 'broken_link';
    message: string;
}

export async function verifyChainHealth(): Promise<ChainHealthResult> {
    const allCapturas = await db.capturas.toArray();
    const capturas = allCapturas
        .filter(c => c.secuencia !== undefined && c.hash !== undefined)
        .sort((a, b) => (a.secuencia || 0) - (b.secuencia || 0));
    
    if (capturas.length === 0) {
        return { ok: true, message: "Cadena vacía o sin registros secuenciados ✓" };
    }

    let expectedSecuencia = capturas[0].secuencia;
    if (expectedSecuencia === undefined) {
        return { ok: false, message: "Las entradas no tienen secuencia" };
    }

    let previousHash = "genesis";

    for (let i = 0; i < capturas.length; i++) {
        const c = capturas[i];
        
        if (c.secuencia !== expectedSecuencia) {
            return { 
                ok: false, 
                brokenAtSecuencia: expectedSecuencia,
                errorType: 'missing_sequence',
                message: `Ruptura detectada: Falta secuencia ${expectedSecuencia}` 
            };
        }

        if (c.hashPrevio !== previousHash) {
            return { 
                ok: false, 
                brokenAtSecuencia: c.secuencia,
                errorType: 'broken_link',
                message: `Ruptura detectada en secuencia ${c.secuencia}: hash previo no coincide. Esperado: ${previousHash.slice(0, 8)}..., Encontrado: ${c.hashPrevio?.slice(0, 8)}...` 
            };
        }

        // Recompute hash
        const contentToHash = `${c.texto}|${c.timestamp}|${c.secuencia}|${c.hashPrevio}`;
        const recomputedHash = await generateHash(contentToHash);

        if (recomputedHash !== c.hash) {
            return { 
                ok: false, 
                brokenAtSecuencia: c.secuencia,
                errorType: 'hash_mismatch',
                message: `Ruptura detectada en secuencia ${c.secuencia}: el hash del contenido no coincide con el almacenado.` 
            };
        }

        previousHash = c.hash || "genesis";
        expectedSecuencia++;
    }

    return { ok: true, message: `Cadena íntegra ✓ (${capturas.length} registros)` };
}
