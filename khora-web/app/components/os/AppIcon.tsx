// @l0 L0-002-R · @req UI-01/REQ-1
import Link from 'next/link';
import * as Icons from 'lucide-react';
import React from 'react';

interface AppIconProps {
  // Contract props
  etiqueta?: string;
  icono?: React.ReactNode | string;
  href: string;
  estado?: string | boolean;

  // Legacy/existing props
  label?: string;
  icon?: React.ReactNode | string;
  active?: boolean;
}

export default function AppIcon({
  etiqueta,
  icono,
  href,
  estado,
  label,
  icon,
  active,
}: AppIconProps) {
  const resolvedLabel = etiqueta ?? label ?? '';
  const rawIcon = icono ?? icon;
  const resolvedEstado = estado !== undefined
    ? String(estado)
    : (active !== undefined ? String(active) : 'normal');

  // If active/estado is true, active, or similar, highlight the border
  const isHighlight = resolvedEstado === 'true' || resolvedEstado === 'active' || active === true;

  // Resolve icon
  let resolvedIcon: React.ReactNode = null;
  if (typeof rawIcon === 'string') {
    const IconComponent = (Icons as any)[rawIcon];
    if (IconComponent) {
      resolvedIcon = <IconComponent className="w-8 h-8" style={{ color: 'var(--khora-ink)' }} />;
    }
  } else if (React.isValidElement(rawIcon)) {
    resolvedIcon = rawIcon;
  } else if (typeof rawIcon === 'function') {
    const IconComponent = rawIcon as React.ComponentType<any>;
    resolvedIcon = <IconComponent className="w-8 h-8" style={{ color: 'var(--khora-ink)' }} />;
  } else {
    resolvedIcon = rawIcon as React.ReactNode;
  }

  return (
    <Link
      href={href}
      data-testid="app-icon"
      data-estado={resolvedEstado}
      className="group flex flex-col items-center justify-start gap-1.5 w-full rounded-2xl focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-shadow"
      style={{
        outlineColor: 'var(--khora-accent)',
        color: 'var(--khora-ink)',
      }}
    >
      <div
        className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: 'var(--khora-surface)',
          borderColor: isHighlight ? 'var(--khora-ink)' : 'transparent',
        }}
      >
        {resolvedIcon}
      </div>
      <span
        className="w-full text-center text-xs font-medium leading-tight line-clamp-2 px-1 break-words"
        style={{
          fontFamily: 'var(--font-sans), sans-serif',
        }}
      >
        {resolvedLabel}
      </span>
    </Link>
  );
}
