"use client";

import { Search, Tag, X } from "lucide-react";
import { buildTagTree, type TagNode } from "@/lib/notes/domain";
import type { NoteStatus } from "@/lib/notes/types";

function TagBranch({
  nodes,
  selected,
  onSelect,
  depth = 0,
}: {
  nodes: TagNode[];
  selected: string;
  onSelect: (tag: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth ? "ml-3 border-l pl-2" : "space-y-1"}>
      {nodes.map((node) => (
        <li key={node.path}>
          <button type="button" aria-pressed={selected === node.path} onClick={() => onSelect(selected === node.path ? "" : node.path)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-black/5" style={{ color: selected === node.path ? "var(--khora-accent)" : "var(--khora-ink)" }}>
            <Tag size={13} className="shrink-0 opacity-55" /><span className="truncate">{node.name}</span>
          </button>
          {node.children.length > 0 && <TagBranch nodes={node.children} selected={selected} onSelect={onSelect} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default function NotesFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  tags,
  selectedTag,
  onTagChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status: NoteStatus;
  onStatusChange: (value: NoteStatus) => void;
  tags: string[];
  selectedTag: string;
  onTagChange: (value: string) => void;
}) {
  const tree = buildTagTree(tags);
  return (
    <aside className="flex w-full flex-col gap-4 lg:w-60 lg:shrink-0">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={17} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar notas" aria-label="Buscar en notas" className="min-h-11 w-full rounded-xl border bg-transparent pl-10 pr-10 text-sm outline-none focus:ring-2" style={{ borderColor: "var(--khora-border)" }} />
        {query && <button type="button" onClick={() => onQueryChange("")} aria-label="Limpiar búsqueda" className="absolute right-1 top-1/2 min-h-11 min-w-11 -translate-y-1/2"><X className="mx-auto" size={15} /></button>}
      </label>

      <nav aria-label="Estado de notas" className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: "var(--khora-bg, rgba(127,127,127,.12))" }}>
        {(["active", "archived", "trashed"] as const).map((item) => (
          <button key={item} type="button" aria-pressed={status === item} onClick={() => onStatusChange(item)} className="min-h-11 rounded-lg px-2 text-xs font-medium" style={{ background: status === item ? "var(--khora-surface)" : "transparent", color: "var(--khora-ink)" }}>
            {item === "active" ? "Activas" : item === "archived" ? "Archivadas" : "Papelera"}
          </button>
        ))}
      </nav>

      {tree.length > 0 && (
        <section aria-label="Filtrar por etiqueta">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide opacity-55">Etiquetas</h3>
            {selectedTag && <button type="button" onClick={() => onTagChange("")} className="min-h-11 px-2 text-xs underline">Limpiar</button>}
          </div>
          <TagBranch nodes={tree} selected={selectedTag} onSelect={onTagChange} />
        </section>
      )}
    </aside>
  );
}
