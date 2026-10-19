"use client";
import { useLayoutEffect, useState } from "react";
import { INTERVALO_VARIANTS, sampleIntervaloVariant } from "./intervalo-sonoro";
/** One cosmetic instance per document, shared by initial and secondary surfaces. */
export function getBootVariant(): number {
    if (typeof document === "undefined") return 0;
    const root = document.documentElement;
    const stored = root.dataset.khoraVariant;
    if (stored !== undefined && /^\d+$/.test(stored) && Number(stored) < INTERVALO_VARIANTS) return Number(stored);
    const variant = sampleIntervaloVariant(window.crypto);
    root.dataset.khoraVariant = String(variant);
    return variant;
}
export function useBootVariant(): number {
    const [variant, setVariant] = useState(0);
    useLayoutEffect(() => { setVariant(getBootVariant()); }, []);
    return variant;
}
