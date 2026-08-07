// @l0 L0-002-R · @req UI-03/THEME-TOGGLE
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function SystemBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full flex justify-around items-center p-2 z-50">
      <Link
        href="/capturar"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color: pathname === "/capturar" ? "var(--khora-ink)" : "var(--khora-accent)"
        }}
      >
        <Icons.Mic size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Captura</span>
      </Link>

      <Link
        href="/sistema/volcados"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color: pathname === "/sistema/volcados" ? "var(--khora-ink)" : "var(--khora-accent)"
        }}
      >
        <Icons.Files size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Archivo</span>
      </Link>

      <Link
        href="/grafo"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color: pathname === "/grafo" ? "var(--khora-ink)" : "var(--khora-accent)"
        }}
      >
        <Icons.Network size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Núcleo</span>
      </Link>

      <Link
        href="/sistema/consulta"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color: pathname === "/sistema/consulta" ? "var(--khora-ink)" : "var(--khora-accent)"
        }}
      >
        <Icons.MessageSquareShare size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Consulta</span>
      </Link>

      <Link
        href="/sistema/boveda"
        className="flex flex-col items-center justify-center p-2"
        style={{
          color: pathname === "/sistema/boveda" ? "var(--khora-ink)" : "var(--khora-accent)"
        }}
      >
        <Icons.LockKeyhole size={32} strokeWidth={1.75} absoluteStrokeWidth={true} />
        <span className="text-xs mt-1 font-medium">Bóveda</span>
      </Link>

      <ThemeToggle />
    </nav>
  );
}
