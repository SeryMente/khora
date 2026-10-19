"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import IntervaloSonoroMark from "./IntervaloSonoroMark";
import { useBootVariant } from "../../../lib/brand/use-boot-variant";

const DURATION_MS = 1200;
const FONT_DEADLINE_MS = 500;

export type KhoraSplashProps = {
    active?: boolean;
    theme?: "dark" | "light";
    reducedMotion?: boolean;
    onComplete?: () => void;
};

/** Opaque SSR surface; bounded presentation budget includes local font readiness. */
export default function KhoraSplash({ active = true, theme, reducedMotion, onComplete }: KhoraSplashProps = {}) {
    const [visible, setVisible] = useState(true);
    const surface = useRef<HTMLDivElement>(null);
    const word = useRef<HTMLSpanElement>(null);
    const identity = useRef<HTMLDivElement>(null);
    const variant = useBootVariant();
    useLayoutEffect(() => {
        if (document.documentElement.dataset.khoraBoot === "skip" || document.documentElement.dataset.khoraBootComplete === "true") setVisible(false);
    }, []);
    const completed = useRef(false);
    const callback = useRef(onComplete);
    callback.current = onComplete;

    useEffect(() => {
        if (!active || completed.current || !surface.current || !word.current || !identity.current || document.documentElement.dataset.khoraBoot === "skip" || document.documentElement.dataset.khoraBootComplete === "true") return;
        const overlay = surface.current;
        const label = word.current;
        const lockup = identity.current;
        let disposed = false;
        let done = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let fontTimer: ReturnType<typeof setTimeout> | undefined;
        const animations: Animation[] = [];
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const reduce = reducedMotion ?? motion.matches;
        const began = performance.now();
        const budget = reduce ? 500 : DURATION_MS;
        overlay.dataset.budgetStarted = String(began);

        const finish = (skip = false) => {
            if (disposed || done) return;
            done = true;
            completed.current = true;
            document.documentElement.dataset.khoraBootComplete = "true";
            clearTimeout(timer);
            clearTimeout(fontTimer);
            // No exit animation when skipped, and no click/key reaches the shell.
            const fromBackground = getComputedStyle(overlay).backgroundColor;
            overlay.dataset.phase = "complete";
            overlay.style.display = "none";
            if (!reduce && !skip) {
                const toBackground = getComputedStyle(document.body).backgroundColor;
                if (fromBackground !== toBackground) {
                    document.body.animate([{ backgroundColor: fromBackground }, { backgroundColor: toBackground }], { duration: 160 });
                }
            }
            setVisible(false);
            callback.current?.();
        };
        timer = setTimeout(() => finish(true), budget);
        const hidden = () => { if (document.visibilityState === "hidden") finish(true); };
        const restored = (event: PageTransitionEvent) => { if (event.persisted) finish(true); };
        document.addEventListener("visibilitychange", hidden);
        window.addEventListener("pageshow", restored);
        if (document.visibilityState === "hidden") finish(true);
        const keydown = (event: KeyboardEvent) => {
            if (done || !["Escape", "Enter", " "].includes(event.key)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            finish(true);
        };
        const pointerdown = (event: PointerEvent) => {
            if (done) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            finish(true);
        };
        document.addEventListener("keydown", keydown, true);
        document.addEventListener("pointerdown", pointerdown, true);

        const start = async () => {
            // Resolve the actual next/font family, not a remotely fetched font.
            const family = getComputedStyle(label).fontFamily;
            const fontReady = Promise.all([
                document.fonts.load(`600 36px ${family}`),
                document.fonts.ready,
            ]).then(() => "ready", () => "deadline");
            const deadline = new Promise<string>((resolve) => {
                fontTimer = setTimeout(() => resolve("deadline"), FONT_DEADLINE_MS);
            });
            const fontStatus = await Promise.race([fontReady, deadline]);
            clearTimeout(fontTimer);
            if (disposed || done) return;
            overlay.dataset.fontStatus = fontStatus;
            // Never reveal a browser fallback as if it were the approved identity.
            // A missing local asset must not trap the user on a blank surface.
            if (fontStatus !== "ready" && !document.fonts.check(`600 36px ${family}`)) {
                overlay.dataset.fontStatus = "unavailable";
                finish(true);
                return;
            }
            if (reduce) {
                lockup.style.opacity = "1";
                overlay.dataset.phase = "reduced";
                return;
            }
            const remaining = Math.max(0, DURATION_MS - (performance.now() - began));
            if (remaining < 300 || typeof lockup.animate !== "function") { finish(true); return; }
            const wordAnimation = lockup.animate([
                { opacity: 0, offset: 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
                { opacity: 1, offset: 260 / DURATION_MS },
                { opacity: 1, offset: 1 },
            ], { duration: remaining, fill: "forwards" });
            const surfaceAnimation = overlay.animate([
                { opacity: 1, offset: 0 },
                { opacity: 1, offset: 900 / DURATION_MS, easing: "ease-in" },
                { opacity: 0, offset: 1 },
            ], { duration: remaining, fill: "forwards" });
            animations.push(wordAnimation, surfaceAnimation);
            // Both effects share exactly the same document timeline origin.
            const time = document.timeline.currentTime;
            const origin = typeof time === "number" ? time : null;
            wordAnimation.startTime = origin;
            surfaceAnimation.startTime = origin;
            surfaceAnimation.onfinish = () => finish();
            overlay.dataset.phase = "running";
        };
        void start().catch(() => finish(true));
        return () => {
            disposed = true;
            clearTimeout(timer);
            clearTimeout(fontTimer);
            document.removeEventListener("visibilitychange", hidden);
            window.removeEventListener("pageshow", restored);
            document.removeEventListener("keydown", keydown, true);
            document.removeEventListener("pointerdown", pointerdown, true);
            for (const animation of animations) {
                animation.onfinish = null;
                animation.cancel();
            }
        };
    }, [active, reducedMotion]);

    if (!active || !visible) return null;
    return (
        <div ref={surface} className="khora-splash" data-testid="khora-splash"
            data-duracion-ms={DURATION_MS} data-theme={theme} data-phase="font"
            aria-hidden="true">
            <div ref={identity} className="khora-splash-identity">
                <IntervaloSonoroMark variant={variant} />
                <span ref={word} className="khora-splash-word">Khora</span>
            </div>
        </div>
    );
}
