// @l0 L0-002 · @req UI-REVIEW/SHELL
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SCREENS } from "@/lib/ui-review/registry";
import { ScreenId } from "@/lib/ui-review/types";
import { ReviewHarnessShell } from "../ReviewHarnessShell";

export const dynamic = "force-dynamic";

export default async function UiReviewScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;

  if (!SCREENS.includes(screen as ScreenId)) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-8 text-xs font-mono text-amber-400 bg-zinc-950 min-h-screen">Cargando Harness de Revisión...</div>}>
      <ReviewHarnessShell initialScreen={screen as ScreenId} />
    </Suspense>
  );
}
