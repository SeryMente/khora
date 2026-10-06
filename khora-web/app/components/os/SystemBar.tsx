"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function SystemBar() {
  const pathname = usePathname();
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!systemMenuRef.current?.contains(event.target as Node)) {
        setSystemMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSystemMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setSystemMenuOpen(false);
  }, [pathname]);

  const systemActive =
    pathname?.startsWith("/sistema/registro") ||
    pathname?.startsWith("/sistema/otros");

  return (
    <nav
      className="fixed bottom-0 w-full flex justify-around items-center p-2 z-50"
      aria-label="Barra de sistema"
    >
      <Link
        href="/sistema/volcados"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color:
            pathname === "/sistema/volcados"
              ? "var(--khora-ink)"
              : "var(--khora-accent)",
        }}
      >
        <Icons.Files size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Volcados</span>
      </Link>

      <Link
        href="/sistema/ingreso"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color:
            pathname === "/sistema/ingreso"
              ? "var(--khora-ink)"
              : "var(--khora-accent)",
        }}
      >
        <Icons.Keyboard size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Ingreso</span>
      </Link>

      <Link
        href="/grafo"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color: pathname === "/grafo" ? "var(--khora-ink)" : "var(--khora-accent)",
        }}
      >
        <Icons.Network size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Grafo</span>
      </Link>

      <Link
        href="/sistema/consulta"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color:
            pathname === "/sistema/consulta"
              ? "var(--khora-ink)"
              : "var(--khora-accent)",
        }}
      >
        <Icons.MessageSquareShare
          size={32}
          strokeWidth={1.75}
          absoluteStrokeWidth={true}
        />
        <span className="text-xs mt-1 font-medium">Consulta</span>
      </Link>

      <Link
        href="/sistema/kpis"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color:
            pathname === "/sistema/kpis"
              ? "var(--khora-ink)"
              : "var(--khora-accent)",
        }}
      >
        <Icons.Activity size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">KPIs</span>
      </Link>

      <div ref={systemMenuRef} className="relative">
        {systemMenuOpen && (
          <div
            role="menu"
            aria-label="Menú Sistema"
            className="absolute bottom-full right-0 mb-2 min-w-48 overflow-hidden rounded-xl border shadow-2xl"
            style={{
              borderColor: "var(--khora-border)",
              background: "var(--khora-surface)",
            }}
          >
            <div
              className="border-b px-3 py-2 text-left"
              style={{ borderColor: "var(--khora-border)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">
                Sistema
              </p>
              <p className="text-xs opacity-60">Módulos del entorno</p>
            </div>

            <Link
              href="/sistema/registro"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80"
            >
              <Icons.ScrollText size={16} />
              <span>Registro</span>
            </Link>

            <Link
              href="/sistema/otros"
              role="menuitem"
              className="flex w-full items-center gap-3 border-t px-4 py-3 text-left text-xs font-bold hover:opacity-80"
              style={{ borderColor: "var(--khora-border)" }}
            >
              <Icons.PackageSearch size={16} />
              <span>Otros</span>
            </Link>
          </div>
        )}

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={systemMenuOpen}
          onClick={() => setSystemMenuOpen((open) => !open)}
          className="flex flex-col items-center justify-center p-2"
          style={{
            color: systemActive ? "var(--khora-ink)" : "var(--khora-accent)",
          }}
        >
          {systemMenuOpen ? (
            <Icons.ChevronDown
              size={32}
              strokeWidth={1.75}
              absoluteStrokeWidth={true}
            />
          ) : (
            <Icons.ScrollText
              size={32}
              strokeWidth={1.75}
              absoluteStrokeWidth={true}
            />
          )}
          <span className="text-xs mt-1 font-medium">Sistema</span>
        </button>
      </div>

      <ThemeToggle />
    </nav>
  );
}
