"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

type LoginProvidersProps = {
  callbackUrl: string;
};

export const LoginProviders = ({ callbackUrl }: LoginProvidersProps) => {
  const handleSignIn = (provider: "github" | "google") => {
    // Let next-auth build the correct /api/auth/signin/* URL
    void signIn(provider, { callbackUrl });
  };

  return (
    <div className="mt-5 space-y-3">
      {/* GitHub */}
      <button
        type="button"
        onClick={() => handleSignIn("github")}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-slate-800"
      >
        <Github className="h-4 w-4" />
        <span>Sign in with GitHub</span>
      </button>

      {/* Google */}
      <button
        type="button"
        onClick={() => handleSignIn("google")}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[0.7rem] font-semibold text-slate-800">
          G
        </span>
        <span>Sign in with Google</span>
      </button>
    </div>
  );
};
