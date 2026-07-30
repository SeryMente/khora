"use client";

import React, { useEffect, useState, useRef } from "react";

export default function KhoraSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"idle" | "fade-in" | "retention" | "fade-out">("idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let isCancelled = false;

    const runAnimation = async () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setReducedMotion(prefersReduced);

      await document.fonts.ready;
      if (isCancelled) return;

      requestAnimationFrame(() => {
        if (isCancelled) return;
        setPhase("fade-in");

        if (prefersReduced) {
          setTimeout(() => {
            if (isCancelled) return;
            setPhase("retention");

            setTimeout(() => {
              if (isCancelled) return;
              setPhase("fade-out");

              setTimeout(() => {
                if (isCancelled) return;
                onCompleteRef.current();
              }, 150);
            }, 200);
          }, 150);
        } else {
          setTimeout(() => {
            if (isCancelled) return;
            setPhase("retention");

            setTimeout(() => {
              if (isCancelled) return;
              setPhase("fade-out");

              setTimeout(() => {
                if (isCancelled) return;
                onCompleteRef.current();
              }, 300);
            }, 640);
          }, 260);
        }
      });
    };

    runAnimation();

    return () => {
      isCancelled = true;
    };
  }, []);

  let textOpacity = 0;
  let bg = reducedMotion ? "#0A0A0B" : "#000000";
  let textTransition = "";
  let bgTransition = "";

  if (phase === "idle") {
    textOpacity = 0;
    bg = reducedMotion ? "#0A0A0B" : "#000000";
  } else if (phase === "fade-in") {
    textOpacity = 1;
    bg = reducedMotion ? "#0A0A0B" : "#000000";
    textTransition = reducedMotion ? "opacity 150ms ease" : "opacity 260ms cubic-bezier(0.22, 1, 0.36, 1)";
  } else if (phase === "retention") {
    textOpacity = 1;
    bg = reducedMotion ? "#0A0A0B" : "#000000";
  } else if (phase === "fade-out") {
    textOpacity = 0;
    bg = "#0A0A0B";
    textTransition = reducedMotion ? "opacity 150ms ease" : "opacity 300ms ease-in";
    bgTransition = reducedMotion ? "" : "background-color 300ms ease-in";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        transition: bgTransition,
        zIndex: 9999,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-geist)",
          fontWeight: 600,
          fontSize: "clamp(36px, 5vw, 56px)",
          letterSpacing: "-0.015em",
          color: "#C7CCD1",
          opacity: textOpacity,
          transition: textTransition,
        }}
      >
        Khora
      </span>
    </div>
  );
}
