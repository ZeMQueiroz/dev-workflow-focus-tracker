"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  currentPeriodEnd: string;
  onCanceled: () => void;
};

export function CancelSubscriptionDialog({
  currentPeriodEnd,
  onCanceled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ??
            "Something went wrong. Please try again.",
        );
      }
      onCanceled();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const dateStr = new Date(currentPeriodEnd).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size='sm'
          variant='outline'
          className='h-8 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 text-[0.75rem] font-medium text-red-500 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600 transition-colors'
        >
          Cancel subscription
        </Button>
      </DialogTrigger>
      <DialogContent className='border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='text-base font-semibold'>
            Cancel your subscription?
          </DialogTitle>
          <DialogDescription className='text-sm text-[var(--text-muted)] mt-2 leading-relaxed'>
            If you cancel, your Pro features will remain active until the end of
            your current billing period on{" "}
            <strong className='font-semibold text-[var(--text-primary)]'>
              {dateStr}
            </strong>
            . After that, you will automatically be downgraded to the Free plan.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className='mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500'>
            {error}
          </p>
        )}

        <div className='mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setOpen(false)}
            disabled={loading}
            className='w-full sm:w-auto h-9 border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-soft)] text-xs'
          >
            Keep plan
          </Button>
          <Button
            size='sm'
            onClick={handleCancel}
            disabled={loading}
            className='w-full sm:w-auto h-9 bg-red-500 text-white hover:bg-red-600 text-xs font-medium border-0'
          >
            {loading ? "Canceling..." : "Yes, cancel plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
