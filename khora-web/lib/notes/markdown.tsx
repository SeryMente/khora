import type { ReactNode } from "react";

const INLINE_TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|https?:\/\/[^\s<]+)/g;

export function isSafeExternalUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function renderInlineMarkdown(source: string): ReactNode[] {
  return source.split(INLINE_TOKEN).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return <code key={index} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.92em]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (/^https?:\/\//i.test(part) && isSafeExternalUrl(part)) {
      return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{part}</a>;
    }
    return part;
  });
}

export function SafeMarkdown({ content }: { content: string }) {
  return <span className="whitespace-pre-wrap break-words">{renderInlineMarkdown(content)}</span>;
}
