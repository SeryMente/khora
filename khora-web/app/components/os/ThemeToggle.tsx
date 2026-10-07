// @l0 L0-002-R · @req UI-03/THEME-TOGGLE
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const nextTheme = localStorage.getItem("khora-theme") === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("khora-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="flex flex-col items-center justify-center p-2 opacity-0"
        style={{ color: "var(--khora-accent)" }}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <Sun size={20} strokeWidth={1.75} />
        </div>
        <span className="text-xs mt-1 font-medium">Tema</span>
      </div>
    );
  }

  const label = theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className="flex flex-col items-center justify-center p-2 cursor-pointer border-0 bg-transparent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-lg"
      style={{ color: "var(--khora-accent)", outlineColor: "var(--khora-accent)" }}
    >
      <span className="w-8 h-8 flex items-center justify-center" aria-hidden="true">
        {theme === "dark" ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
      </span>
      <span className="text-xs mt-1 font-medium">Tema</span>
    </button>
  );
}
