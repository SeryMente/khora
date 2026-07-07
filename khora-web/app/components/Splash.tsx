"use client";

import { useEffect, useState } from "react";
import { IBM_Plex_Sans } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  weight: "600",
  subsets: ["latin"],
  display: "swap", // To avoid FOUT as much as possible, though Next.js handles it nicely
});

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Timeout for the total animation duration (2.5s)
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2500);

    // Escape key listener to skip the splash screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearTimeout(timer);
        setIsVisible(false);
        onComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        // The animation logic via pure CSS
        animation: "splash-animation 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      }}
    >
      <div
        className={ibmPlexSans.className}
        style={{
          color: "#FFFFFF",
          fontSize: "8vw",
          letterSpacing: "0.15em",
        }}
      >
        Khora
      </div>
    </div>
  );
}
