"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type CopySummaryButtonProps = {
  text: string;
};

const CopySummaryButton = ({ text }: CopySummaryButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy summary", e);
    }
  };

  return (
    <button
      type='button'
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy as Markdown"}
      aria-live='polite'
      className={[
        "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all",
        copied
          ? "border-transparent bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
          : "border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
      ].join(" ")}
    >
      {copied ? (
        <Check className='h-3.5 w-3.5' aria-hidden='true' />
      ) : (
        <Copy className='h-3.5 w-3.5' aria-hidden='true' />
      )}
      <span>{copied ? "Copied!" : "Copy as Markdown"}</span>
    </button>
  );
};

export { CopySummaryButton };
