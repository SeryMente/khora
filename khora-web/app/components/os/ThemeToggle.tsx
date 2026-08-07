// @l0 L0-002-R · @req UI-03/THEME-TOGGLE
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("khora-theme");
    if (stored === "light") {
      setTheme("light");
      document.documentElement.dataset.theme = "light";
    } else {
      setTheme("dark");
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("khora-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTheme();
    }
  };

  if (!mounted) {
    // Return a matching layout structure before mount to prevent layout shifts
    return (
      <div
        className="flex flex-col items-center justify-center p-2 opacity-0 cursor-pointer"
        style={{ color: "var(--khora-accent)" }}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <Sun size={20} strokeWidth={1.75} />
        </div>
        <span className="text-xs mt-1 font-medium">Tema</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className="flex flex-col items-center justify-center p-2 cursor-pointer border-0 bg-transparent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-lg"
      style={{
        color: "var(--khora-accent)",
        outlineColor: "var(--khora-accent)",
      }}
      title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {theme === "dark" ? (
          <Sun size={20} strokeWidth={1.75} />
        ) : (
          <Moon size={20} strokeWidth={1.75} />
        )}
      </div>
      <span className="text-xs mt-1 font-medium">Tema</span>
    </div>
  );
}
