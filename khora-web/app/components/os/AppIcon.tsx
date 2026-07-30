import Link from 'next/link';

interface AppIconProps {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}

export default function AppIcon({ label, icon, href, active }: AppIconProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-start gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl"
    >
      <div
        className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 transition-opacity group-hover:opacity-80"
        style={{
          backgroundColor: 'var(--khora-surface)',
          borderColor: active ? 'var(--khora-ink)' : 'transparent',
        }}
      >
        {icon}
      </div>
      <span className="w-full truncate text-center text-xs font-medium">
        {label}
      </span>
    </Link>
  );
}
