"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  return (
    <div className="relative group bg-[#08080a] border border-white/[0.1] rounded-lg p-3 overflow-hidden">
      <pre className="text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre pr-12 pb-2">
        {text}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-[#18181b] border border-white/[0.1] rounded hover:bg-white/[0.1] transition-colors"
        title="Copiar al portapapeles"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  );
}
