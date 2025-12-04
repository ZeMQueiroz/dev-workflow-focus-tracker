"use client";

import { useState } from "react";

export function UpgradeToProButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });

      if (!res.ok) {
        let msg = "Failed to create checkout session";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // ignore JSON parse errors
        }
        console.error(msg);
        return;
      }

      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-md bg-[var(--accent-solid)] px-3 py-1.5 text-[0.75rem] font-medium text-[var(--text-on-accent)] hover:brightness-110 disabled:opacity-50"
    >
      {loading ? "Redirecting..." : "Upgrade to Pro"}
    </button>
  );
}
