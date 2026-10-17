/** Cosmetic, bounded identity grammar. Not encryption or a user identifier. */
export const INTERVALO_VERSION = 1;
export const INTERVALO_VARIANTS = 54;
const PROFILES = [[22, 42, 62], [26, 46, 62], [22, 38, 58]] as const;
const GAPS = [12, 16, 20] as const;
const OFFSETS = [-3, 0, 3] as const;
// Static semantic namespace: Intérprete. Never derived from personal content.
const NAMESPACE = 0x496e7472;
export function variantFromSeed(seed: number): number {
    return Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff
        ? ((seed ^ NAMESPACE) >>> 0) % INTERVALO_VARIANTS : 0;
}
export function sampleIntervaloVariant(source?: Pick<Crypto, "getRandomValues">): number {
    try {
        if (!source) return 0;
        const values = new Uint32Array(1);
        source.getRandomValues(values);
        return variantFromSeed(values[0]);
    } catch { return 0; }
}
export function intervaloGeometry(variant: number) {
    const index = Number.isInteger(variant) && variant >= 0 && variant < INTERVALO_VARIANTS ? variant : 0;
    const profile = PROFILES[Math.floor(index / 18)];
    const gap = GAPS[Math.floor(index / 6) % 3];
    const side = Math.floor(index / 3) % 2;
    const offset = OFFSETS[index % 3];
    const left = 80 - gap / 2 - 10;
    const right = 80 + gap / 2;
    const bars = Array.from({ length: 6 }, (_, i) => {
        const height = i < 3 ? profile[i] : profile[5 - i];
        const x = i < 3 ? left - (2 - i) * 18 : right + (i - 3) * 18;
        return { x, y: 50 - height / 2, width: 10, height, rx: 5 };
    });
    const cutBar = side === 0 ? 2 : 3;
    const cutX = bars[cutBar].x - 1;
    const cutY = 49 + offset;
    return { index, gap, cutBar, cutX, cutY, bars,
        cut: 'M' + cutX + ' ' + cutY + ' l12 -8 v7 l-12 8 Z' };
}
