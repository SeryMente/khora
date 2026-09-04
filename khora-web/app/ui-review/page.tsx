// @l0 L0-002 · @req UI-REVIEW/SHELL
import { Suspense } from "react";
import { ReviewHarnessShell } from "./ReviewHarnessShell";

export const dynamic = "force-dynamic";

export default function UiReviewRootPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-amber-400 bg-zinc-950 min-h-screen">Cargando Harness de Revisión...</div>}>
      <ReviewHarnessShell initialScreen="ingreso" />
    </Suspense>
  );
}
