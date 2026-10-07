import packageInfo from "../../package.json";

const version =
  typeof packageInfo.version === "string" && packageInfo.version.trim()
    ? packageInfo.version.trim()
    : "desconocida";

export function GlobalFooter() {
  return (
    <footer
      aria-label="Versión de Khora"
      className="fixed bottom-2 left-0 z-50 w-full pointer-events-none flex justify-center pb-safe"
    >
      <span
        className="text-[9px] leading-none font-mono tracking-[0.14em]"
        style={{ color: "var(--khora-accent)", opacity: 0.5 }}
      >
        v{version}
      </span>
    </footer>
  );
}
