"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

type InlineSignInButtonProps = {
  label?: string;
  className?: string;
};

export const InlineSignInButton = ({
  label = "Sign in to Weekline",
  className,
}: InlineSignInButtonProps) => {
  return (
    <Button
      type="button"
      size="sm"
      className={[
        "mt-3 bg-[var(--accent-solid)] text-xs font-medium text-slate-900 hover:brightness-95",
        className ?? "",
      ].join(" ")}
      onClick={() => signIn()} // lets user pick GitHub or Google
    >
      {label}
    </Button>
  );
};
