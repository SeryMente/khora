// @l0 L0-002-R · @req SISTEMA-MENU/E1 · @req EP-LAUNCHER/UI-3
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, LockKeyhole, ShieldCheck } from "lucide-react";
import EntornoPersistentePanel from "@/app/components/os/EntornoPersistentePanel";
import PaginaBoveda from "@/app/components/os/PaginaBoveda";

type SecurityTab = "seguridad" | "entorno-persistente" | "boveda";

const TABS: Array<{ id: SecurityTab; label: string; icon: typeof ShieldCheck }> = [
  { id: "seguridad", label: "Seguridad", icon: ShieldCheck },
  { id: "entorno-persistente", label: "Entorno Persistente", icon: Container },
  { id: "boveda", label: "Bóveda", icon: LockKeyhole },
];

function parseTab(value: string | null): SecurityTab {
  return value === "entorno-persistente" || value === "boveda" ? value : "seguridad";
}

function SeguridadOverview({ onOpen }: { onOpen: (tab: Exclude<SecurityTab, "seguridad">) => void }) {
  const border = { borderColor: "var(--khora-border)" };
  return <div className="space-y-7">
    <header className="space-y-3 border-b pb-6 text-center" style={border}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border" style={{ ...border, background: "var(--khora-surface)" }}><ShieldCheck size={30} style={{ color: "var(--khora-accent)" }} /></div>
      <h1 className="text-2xl font-bold uppercase tracking-[0.18em]">Seguridad</h1>
      <p className="mx-auto max-w-2xl text-sm leading-relaxed opacity-70">Controles de acceso, custodia y entornos aislados. Cada responsabilidad vive en un submódulo explícito.</p>
    </header>
    <div className="grid gap-4 md:grid-cols-2">
      <button type="button" onClick={() => onOpen("entorno-persistente")} className="min-h-52 rounded-xl border p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ ...border, background: "var(--khora-surface)" }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border" style={border}><Container size={23} /></span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Submódulo</p>
        <h2 className="mt-1 text-lg font-bold">Entorno Persistente</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-70">Sesiones cifradas, comando de arranque y bitácora remota.</p>
      </button>
      <button type="button" onClick={() => onOpen("boveda")} className="min-h-52 rounded-xl border p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ ...border, background: "var(--khora-surface)" }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border" style={border}><LockKeyhole size={23} /></span>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Submódulo</p>
        <h2 className="mt-1 text-lg font-bold">Bóveda</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-70">Apertura temporal y custodia de grabaciones, volcados y secretos operativos.</p>
      </button>
    </div>
  </div>;
}

function SeguridadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SecurityTab>(() => parseTab(searchParams?.get("tab") || null));

  useEffect(() => { setActiveTab(parseTab(searchParams?.get("tab") || null)); }, [searchParams]);

  function openTab(tab: SecurityTab) {
    setActiveTab(tab);
    router.replace(tab === "seguridad" ? "/sistema/seguridad" : `/sistema/seguridad?tab=${tab}`, { scroll: false });
  }

  return <div className="w-full max-w-5xl space-y-8">
    <div className="flex max-w-full overflow-x-auto border-b" style={{ borderColor: "var(--khora-border)" }} role="tablist" aria-label="Módulos de seguridad">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => openTab(tab.id)} className="flex min-h-12 shrink-0 items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]" style={{ borderBottom: activeTab === tab.id ? "2px solid var(--khora-accent)" : "2px solid transparent", opacity: activeTab === tab.id ? 1 : .55 }}><Icon size={18} />{tab.label}</button>;
      })}
    </div>
    {activeTab === "seguridad" && <SeguridadOverview onOpen={openTab} />}
    {activeTab === "entorno-persistente" && <EntornoPersistentePanel />}
    {activeTab === "boveda" && <PaginaBoveda />}
  </div>;
}

export default function SeguridadPage() {
  return <main className="flex min-h-screen w-full justify-center p-4 py-10 pb-28 font-mono sm:p-8 sm:pb-28" style={{ background: "var(--khora-bg)", color: "var(--khora-ink)" }}><Suspense fallback={<div className="text-xs opacity-60">Cargando módulos de seguridad...</div>}><SeguridadContent /></Suspense></main>;
}
