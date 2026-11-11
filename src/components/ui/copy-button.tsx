"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copier" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1 rounded-md border border-outline-variant/60 px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant hover:bg-surface-container-low"
    >
      {copied ? "Copié" : label}
    </button>
  );
}
