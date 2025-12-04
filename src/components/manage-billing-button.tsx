"use client";

import { useState } from "react";

const ManageBillingButton = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });

      if (!res.ok) {
        console.error("Failed to create portal session");
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
      className="inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--accent-solid)] px-3 py-1.5 text-[0.75rem] font-medium text-[var(--text-on-accent)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
    >
      {loading ? "Opening..." : "Manage billing"}
    </button>
  );
};

export default ManageBillingButton;
