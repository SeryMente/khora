import { Suspense } from "react";
import NotesWorkspace from "../components/notas/NotesWorkspace";
import styles from "./notes.module.css";

export const dynamic = "force-dynamic";

function LoadingNotes() {
  return <main className="mx-auto max-w-5xl p-8 text-center text-sm opacity-60">Cargando Notas…</main>;
}

export default function NotasPage() {
  return (
    <div className={styles.root}>
      <Suspense fallback={<LoadingNotes />}>
        <NotesWorkspace />
      </Suspense>
    </div>
  );
}
