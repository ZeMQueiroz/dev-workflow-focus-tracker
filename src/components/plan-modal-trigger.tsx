"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Plan = "free" | "pro";

type PlanModalTriggerProps = {
  currentPlan: Plan;
  children?: React.ReactNode; // optional custom trigger
};

export const PlanModalTrigger: React.FC<PlanModalTriggerProps> = ({
  currentPlan,
  children,
}) => {
  const [open, setOpen] = React.useState(false);
  const isPro = currentPlan === "pro";

  const trigger = children ? (
    children
  ) : (
    <Button
      size="sm"
      variant="outline"
      className="border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-[0.75rem] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
    >
      {isPro ? "Change plan" : "See plans"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent
        className="w-[min(100vw-2rem,960px)] max-w-5xl border-[var(--border-subtle)] 
                   bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] sm:p-7"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            Choose your Weekline plan
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            Start on Free and upgrade to Pro when you need polished exports,
            automation, and integrations.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Free plan */}
          <div
            className={[
              "flex min-h-[320px] flex-col rounded-xl border bg-[var(--bg-surface-soft)] p-5 text-xs",
              !isPro
                ? "border-[var(--accent-solid)]/70 shadow-[0_0_0_1px_var(--accent-solid)]"
                : "border-[var(--border-subtle)]",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Free</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  <span className="text-lg font-semibold text-[var(--text-primary)]">
                    €0
                  </span>{" "}
                  / month
                </div>
              </div>

              {!isPro && (
                <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--text-muted)]">
                  Current plan
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-1.5 text-[0.8rem] text-[var(--text-muted)]">
              <Feature>Core focus timer &amp; projects</Feature>
              <Feature>Weekly summary view</Feature>
              <Feature>CSV / JSON exports</Feature>
              <Feature>Built-in themes</Feature>
            </ul>

            <div className="mt-5 flex-1" />

            {!isPro && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[0.8rem] text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                disabled
              >
                Current plan
              </Button>
            )}
          </div>

          {/* Pro plan */}
          <div className="flex min-h-[320px] flex-col rounded-xl border border-[var(--accent-solid)] bg-[var(--bg-surface-soft)] p-5 text-xs shadow-[0_0_0_1px_var(--accent-solid)]">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Pro</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  <span className="text-lg font-semibold text-[var(--text-primary)]">
                    3,99€
                  </span>{" "}
                  / month{" "}
                  <span className="text-[0.7rem] text-[var(--text-muted)]">
                    incl. VAT
                  </span>
                </div>
              </div>

              {isPro && (
                <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--text-muted)]">
                  Current plan
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-1.5 text-[0.8rem] text-[var(--text-muted)]">
              <Feature>Everything in Free</Feature>
              <Feature>Client-ready PDF exports</Feature>
              <Feature>Automatic weekly email reports (roadmap)</Feature>
              <Feature>
                Notion / Obsidian / calendar integrations (roadmap)
              </Feature>
              <Feature>Priority support &amp; early access</Feature>
            </ul>

            <div className="mt-5 flex-1" />

            <Button
              size="sm"
              className="mt-2 w-full bg-[var(--accent-solid)] text-[0.8rem] font-medium text-[var(--text-on-accent)] hover:brightness-110"
              asChild
            >
              {/* TODO: wire to Stripe checkout / upgrade route */}
              <a href="/pro">{isPro ? "Manage billing" : "Upgrade to Pro"}</a>
            </Button>
          </div>
        </div>

        <p className="mt-5 text-[0.7rem] text-[var(--text-muted)]">
          You can change or cancel your plan at any time. Pricing and features
          are placeholders until billing is fully wired up.
        </p>
      </DialogContent>
    </Dialog>
  );
};

const Feature: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2">
    <Check className="mt-[2px] h-3 w-3 shrink-0 text-[var(--accent-solid)]" />
    <span>{children}</span>
  </li>
);
