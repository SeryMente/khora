"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import {
  NAVIGATION_REGISTRY,
  navigationGroupNames,
  type NavigationEntry,
  type NavigationChild,
  type NavigationIcon,
} from "../../navigation/registry";

const ICONS: Record<NavigationIcon, LucideIcon> = {
  Files: Icons.Files,
  Keyboard: Icons.Keyboard,
  Network: Icons.Network,
  MessageSquareShare: Icons.MessageSquareShare,
  Mic: Icons.Mic,
  ShieldCheck: Icons.ShieldCheck,
  ScrollText: Icons.ScrollText,
  PenLine: Icons.PenLine,
  UploadCloud: Icons.UploadCloud,
  Wrench: Icons.Wrench,
  Activity: Icons.Activity,
  MapPinned: Icons.MapPinned,
  FileCheck2: Icons.FileCheck2,
  Container: Icons.Container,
  LockKeyhole: Icons.LockKeyhole,
  KeyRound: Icons.KeyRound,
};

function normalizePath(href: string): string {
  return href.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
}

function isEntryActive(pathname: string | null, entry: NavigationEntry): boolean {
  if (!pathname) return false;
  return entry.coverage.some((route) =>
    pathname === route || pathname.startsWith(route + "/"),
  );
}

function isChildActive(pathname: string | null, child: NavigationChild): boolean {
  return normalizePath(child.href) === normalizePath(pathname || "");
}

function NavIcon({ name, size = 22 }: { name: NavigationIcon; size?: number }) {
  const Icon = ICONS[name];
  return <Icon size={size} strokeWidth={1.75} absoluteStrokeWidth aria-hidden="true" />;
}

function MenuLink({ child, pathname, onNavigate }: { child: NavigationChild; pathname: string | null; onNavigate: () => void }) {
  return (
    <Link
      href={child.href}
      data-navigation-child={child.id}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
      aria-current={isChildActive(pathname, child) ? "page" : undefined}
      onClick={onNavigate}
    >
      <NavIcon name={child.icon} size={16} />
      <span>{child.label}</span>
    </Link>
  );
}

function MenuPanel({ entry, pathname, onNavigate }: { entry: NavigationEntry; pathname: string | null; onNavigate: () => void }) {
  const groups = navigationGroupNames(entry);

  return (
    <nav
      aria-label={"Menú " + entry.label}
      aria-describedby={"navigation-menu-description-" + entry.id}
      data-navigation-menu={entry.id}
      className="absolute bottom-full left-1/2 mb-2 w-[min(22rem,calc(100vw-1rem))] -translate-x-1/2 overflow-hidden rounded-xl border shadow-2xl"
      style={{
        borderColor: "var(--khora-border)",
        background: "var(--khora-surface)",
      }}
    >
      <div
        className="border-b px-3 py-2.5 text-left"
        style={{ borderColor: "var(--khora-border)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">{entry.label}</p>
        <p id={"navigation-menu-description-" + entry.id} className="text-[11px] opacity-60">
          Accesos del dominio
        </p>
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-2">
        {groups.map((group) => (
          <section key={group} className="mb-2 last:mb-0" data-navigation-group={group}>
            <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] opacity-45">
              {group}
            </p>
            <div className="space-y-0.5">
              {(entry.children ?? [])
                .filter((child) => child.group === group)
                .map((child) => (
                  <MenuLink
                    key={child.id}
                    child={child}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}

export default function SystemBar() {
  const pathname = usePathname();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const navigationRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setOpenMenuId(null);
  }, [pathname]);

  return (
    <nav
      ref={navigationRef}
      className="fixed bottom-0 inset-x-0 z-50 flex items-end justify-center gap-1 overflow-x-auto p-2"
      aria-label="Barra de sistema"
      data-navigation-primary-count={NAVIGATION_REGISTRY.length}
    >
      {NAVIGATION_REGISTRY.map((entry) => {
        const active = isEntryActive(pathname, entry);

        return (
          <div key={entry.id} className="relative shrink-0" data-navigation-entry={entry.id}>
            {entry.kind === "menu" && openMenuId === entry.id && (
              <MenuPanel
                entry={entry}
                pathname={pathname}
                onNavigate={() => setOpenMenuId(null)}
              />
            )}

            {entry.kind === "direct" ? (
              <Link
                href={entry.href}
                className="flex min-w-16 flex-col items-center justify-center rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
                style={{ color: active ? "var(--khora-ink)" : "var(--khora-accent)" }}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={entry.icon} size={32} />
                <span className="mt-1 text-xs font-medium">{entry.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={openMenuId === entry.id}
                aria-label={entry.label}
                onClick={() =>
                  setOpenMenuId((current) => (current === entry.id ? null : entry.id))
                }
                className="flex min-w-16 flex-col items-center justify-center rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--khora-accent)]"
                style={{ color: active ? "var(--khora-ink)" : "var(--khora-accent)" }}
              >
                {openMenuId === entry.id ? (
                  <Icons.ChevronDown size={32} strokeWidth={1.75} absoluteStrokeWidth aria-hidden="true" />
                ) : (
                  <NavIcon name={entry.icon} size={32} />
                )}
                <span className="mt-1 text-xs font-medium">{entry.label}</span>
              </button>
            )}
          </div>
        );
      })}

      <div className="shrink-0">
        <ThemeToggle />
      </div>
    </nav>
  );
}
