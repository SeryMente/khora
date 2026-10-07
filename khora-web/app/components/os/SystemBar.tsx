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
    pathname?.startsWith("/sistema/otros") ||
    pathname?.startsWith("/sistema/seguridad") ||
    pathname?.startsWith("/sistema/mcp") ||
    pathname?.startsWith("/sistema/dictado") ||
    pathname?.startsWith("/sistema/editar") ||
    pathname?.startsWith("/sistema/ingesta") ||
    pathname?.startsWith("/sistema/kpis") ||
    pathname?.startsWith("/mapa");

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
            className="absolute bottom-full right-0 mb-2 max-h-[70vh] min-w-56 overflow-y-auto rounded-xl border shadow-2xl"
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

            <div
              className="border-b px-3 py-2 text-left"
              style={{ borderColor: "var(--khora-border)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">
                Operación
              </p>
            </div>

            <Link href="/sistema/dictado" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.Mic size={16} />
              <span>Dictado</span>
            </Link>
            <Link href="/sistema/editar" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.PenLine size={16} />
              <span>Edición</span>
            </Link>
            <Link href="/sistema/ingesta" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.UploadCloud size={16} />
              <span>Ingesta</span>
            </Link>
            <Link href="/sistema/kpis" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.Activity size={16} />
              <span>KPIs</span>
            </Link>

            <Link href="/mapa" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.Map size={16} />
              <span>Mapa</span>
            </Link>

            <div className="border-y px-3 py-2 text-left" style={{ borderColor: "var(--khora-border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">
                Seguridad y control
              </p>
            </div>

            <Link href="/sistema/seguridad" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.ShieldCheck size={16} />
              <span>Seguridad</span>
            </Link>
            <Link href="/sistema/mcp" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.KeyRound size={16} />
              <span>Control MCP</span>
            </Link>
            <Link href="/sistema/otros" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.FileCheck2 size={16} />
              <span>Evidencia normativa</span>
            </Link>
            <Link href="/sistema/registro" role="menuitem" className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-bold hover:opacity-80">
              <Icons.ScrollText size={16} />
              <span>Registro</span>
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
