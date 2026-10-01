import fs from "fs";
import path from "path";

export function GlobalFooter() {
  let version = "desconocida";
  try {
    const filePath = path.join(process.cwd(), "package.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    if (typeof parsed.version === "string" && parsed.version.trim()) {
      version = parsed.version.trim();
    }
  } catch {
    // El indicador es informativo y no debe afectar el renderizado de Khora.
  }

  return (
    <footer className="fixed bottom-2 left-0 z-50 w-full pointer-events-none flex justify-center pb-safe">
      <span className="text-[8px] leading-none text-cora-text/45 font-mono tracking-[0.14em]">
        v{version}
      </span>
    </footer>
  );
}
