"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NotebookText,
  Radio,
  Network,
  Cpu,
  Hexagon,
  Server,
  MessageSquareShare,
  Zap
} from "lucide-react";
import { CapturarModal } from "./CapturarModal";

const NAV_ITEMS = [
  { href: "/bitacora", label: "Bitácora", icon: NotebookText },
  { href: "/cabina", label: "Cabina", icon: Radio },
  { href: "/integracion", label: "Integración", icon: Network },
  { href: "/nucleo", label: "Núcleo", icon: Cpu },
  { href: "/prisma", label: "Prisma", icon: Hexagon },
  { href: "/sistema", label: "Sistema", icon: Server },
];

export function ShellNav() {
  const pathname = usePathname();
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);

  // No mostramos shell nav en la home "/" u otras que se decida excluir (pero por ahora lo mostraremos para todo en general excepto la splash original)
  // Sin embargo, si es deseado mostrar el nav siempre, lo dejamos fijo.

  return (
    <>
      {/* Mobile Bottom Navigation - Visible solo en < md */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#081222]/90 backdrop-blur-lg border-t border-[#1F3C6A]/50 pb-safe">
        {/* Acciones Primarias (Flotantes arriba de la barra inferior) */}
        <div className="absolute -top-14 left-0 right-0 flex justify-center gap-4 px-4 pointer-events-none">
          <Link
            href="/preguntar"
            className="pointer-events-auto bg-[#112A4F] text-[#3FA7FF] border border-[#1F3C6A] p-3 rounded-2xl shadow-lg flex items-center justify-center gap-2"
            title="Preguntar"
          >
            <MessageSquareShare className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setIsCaptureModalOpen(true)}
            className="pointer-events-auto bg-[#3FA7FF] text-white p-3 rounded-2xl shadow-[0_0_15px_rgba(63,167,255,0.4)] flex items-center justify-center gap-2"
            title="Capturar"
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-between items-center px-2 py-3 overflow-x-auto no-scrollbar gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${
                  isActive
                    ? "text-[#3FA7FF] bg-[#3FA7FF]/10"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-mono tracking-wider uppercase">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar - Visible solo en >= md */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 bottom-0 z-40 bg-[#081222]/90 backdrop-blur-lg border-r border-[#1F3C6A]/50 p-4 pt-8">
        <div className="mb-10 px-4">
          <h1 className="font-semibold text-white tracking-[0.2em] uppercase text-sm">
            KHORA OS
          </h1>
        </div>

        <div className="flex flex-col gap-3 mb-10">
          <button
            onClick={() => setIsCaptureModalOpen(true)}
            className="bg-[#3FA7FF] text-white px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(63,167,255,0.4)] flex items-center gap-3 hover:bg-[#3FA7FF]/90 transition-colors w-full cursor-pointer text-left"
          >
            <Zap className="w-5 h-5" />
            <span className="font-semibold text-sm">Capturar</span>
          </button>

          <Link
            href="/preguntar"
            className="bg-[#112A4F] text-[#3FA7FF] border border-[#1F3C6A] px-4 py-3 rounded-xl flex items-center gap-3 hover:bg-[#112A4F]/80 hover:border-[#3FA7FF]/50 transition-colors"
          >
            <MessageSquareShare className="w-5 h-5" />
            <span className="font-semibold text-sm">Preguntar</span>
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="px-4 mb-2 text-xs font-mono text-gray-500 tracking-wider uppercase">
            Dominios
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "text-[#3FA7FF] bg-[#3FA7FF]/10 border border-[#3FA7FF]/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <CapturarModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
      />
    </>
  );
}
