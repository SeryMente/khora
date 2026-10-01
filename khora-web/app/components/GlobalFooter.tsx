import packageInfo from "../../package.json";

const version =
  typeof packageInfo.version === "string" && packageInfo.version.trim()
    ? packageInfo.version.trim()
    : "desconocida";

export function GlobalFooter() {
  return (
    <footer className="fixed bottom-2 left-0 z-50 w-full pointer-events-none flex justify-center pb-safe">
      <span className="text-[8px] leading-none text-cora-text/45 font-mono tracking-[0.14em]">
        v{version}
      </span>
    </footer>
  );
}
