import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTagTree, convertNoteMode, deriveTitle, extractTags, serializeChecklist, tagsForNote } from "../../lib/notes/domain";
import { isSafeExternalUrl, SafeMarkdown } from "../../lib/notes/markdown";
import type { ChecklistItem, NoteDraft } from "../../lib/notes/types";

test("hashtag parser accepts simple tags and hierarchical paths with at least three levels", () => {
  assert.deepEqual(extractTags("Tema #Personal y #proyecto/khora/notas; #incorrecta/dos #Personal"), ["personal", "proyecto/khora/notas"]);
});
test("hashtags are detected after punctuation and not inside words", () => {
  assert.deepEqual(extractTags("Paréntesis (#Etiqueta), coma #otra_tag yx#noTag"), ["etiqueta", "otra_tag"]);
});
test("tags are derived from note body and checklist item text only", () => {
  const items: ChecklistItem[] = [{ id: "i1", text: "Validar #seguridad/xss/tests", is_completed: false, position: 0 }];
  assert.deepEqual(tagsForNote("Contenido #khora/modulo/notas", items), ["khora/modulo/notas", "seguridad/xss/tests"]);
});
test("automatic title selects first non-empty content line then first checklist item", () => {
  assert.equal(deriveTitle("\n  Primera línea\nsegunda"), "Primera línea");
  assert.equal(deriveTitle("", [{ id: "a", text: "Primer elemento", is_completed: false, position: 0 }]), "Primer elemento");
  assert.equal(deriveTitle("x".repeat(61)).length, 60);
});
test("checklist serialization preserves positions and completion state", () => {
  const items: ChecklistItem[] = [
    { id: "b", text: "Segundo", is_completed: true, position: 1 },
    { id: "a", text: "Primero", is_completed: false, position: 0 },
  ];
  assert.equal(serializeChecklist(items), "[ ] Primero\n[x] Segundo");
});
test("text/checklist conversion preserves all source lines and completed markers", () => {
  const draft: NoteDraft = { mode: "text", content: "Uno\n[x] Dos\nTres", checklist_items: [], color: "default", is_pinned: false };
  const checklist = convertNoteMode(draft, "checklist");
  assert.deepEqual(checklist.checklist_items.map((item) => [item.text, item.is_completed]), [["Uno", false], ["Dos", true], ["Tres", false]]);
  const text = convertNoteMode(checklist, "text");
  assert.equal(text.content, "[ ] Uno\n[x] Dos\n[ ] Tres");
});
test("tag tree is derived from actual hierarchical tags", () => {
  assert.deepEqual(buildTagTree(["proyecto/khora/notas", "proyecto/khora/roadmap"])[0], {
    name: "proyecto", path: "proyecto", children: [
      { name: "khora", path: "proyecto/khora", children: [
        { name: "notas", path: "proyecto/khora/notas", children: [] },
        { name: "roadmap", path: "proyecto/khora/roadmap", children: [] },
      ] },
    ],
  });
});
test("Markdown renderer escapes HTML and only links HTTP(S) destinations", () => {
  const html = renderToStaticMarkup(React.createElement(SafeMarkdown, {
    content: '<script>alert(1)</script> **bold** *italic* `code` https://example.com',
  }));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script|onerror=|onmouseover=/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<strong>bold<\/strong>/);
});
test("unsafe URI schemes are rejected", () => {
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
  assert.equal(isSafeExternalUrl("data:text/html,<script>"), false);
  assert.equal(isSafeExternalUrl("https://example.com"), true);
});
