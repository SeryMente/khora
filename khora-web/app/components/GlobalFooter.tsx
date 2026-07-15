import fs from 'fs';
import path from 'path';

export function GlobalFooter() {
  let sprint = "??";
  let fraccion = "??";
  try {
    const filePath = path.join(process.cwd(), '../version.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      sprint = parsed.sprint || sprint;
      fraccion = parsed.fraccion || fraccion;
    }
  } catch (e) {
    console.error("Error reading version.json:", e);
  }

  return (
    <footer className="fixed bottom-4 md:bottom-8 left-0 w-full flex justify-center z-10 opacity-40 pointer-events-none pb-safe">
      <span className="text-[9px] text-cora-text font-mono uppercase tracking-[0.3em] text-center px-4">
        Sistema Operativo Khora · {sprint} · {fraccion}
      </span>
    </footer>
  );
}
