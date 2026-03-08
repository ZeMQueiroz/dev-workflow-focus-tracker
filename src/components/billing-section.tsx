"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Sparkles, Download, Loader2 } from "lucide-react";
import { PlanModalTrigger } from "@/components/plan-modal-trigger";
import { UpgradeToProButton } from "@/components/upgrade-to-pro-button";
import ManageBillingButton from "@/components/manage-billing-button";
import { CancelSubscriptionDialog } from "@/components/cancel-subscription-dialog";

type SubData = {
  isPro: boolean;
  plan: string;
  cancelAtPeriodEnd: boolean;
  stripeData: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    card: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    } | null;
  } | null;
} | null;

type Invoice = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export function BillingSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuccessRedirect = searchParams.get("billing") === "success";

  const [subData, setSubData] = React.useState<SubData>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [polling, setPolling] = React.useState(isSuccessRedirect);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let pollCount = 0;
    const maxPolls = 10; // 10 * 2000ms = 20s max

    async function fetchBilling() {
      try {
        const [subRes, invRes] = await Promise.all([
          fetch("/api/billing/subscription"),
          fetch("/api/billing/invoices"),
        ]);
        let newSubData: SubData = null;

        if (subRes.ok) {
          newSubData = await subRes.json();
          setSubData(newSubData);
        }
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoices(invData.invoices || []);
        }

        // Check if we need to poll
        if (isSuccessRedirect && (!newSubData || !newSubData.isPro)) {
          pollCount++;
          if (pollCount < maxPolls) {
            timeoutId = setTimeout(fetchBilling, 2000);
          } else {
            // Give up on polling
            setPolling(false);
            setLoading(false);
            // Drop the param
            router.replace("/settings");
          }
        } else {
          // Success parsing Pro state OR we weren't polling anyway
          setPolling(false);
          setLoading(false);

          if (isSuccessRedirect && newSubData?.isPro) {
            // We got the Pro state, burst the router cache and drop param
            router.replace("/settings");
            router.refresh();
          }
        }
      } catch (err) {
        console.error("Failed to load billing data", err);
        setPolling(false);
        setLoading(false);
      }
    }

    fetchBilling();

    return () => clearTimeout(timeoutId);
  }, [isSuccessRedirect, router]);

  if (loading || polling) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-[var(--text-muted)]'>
        <Loader2 className='h-5 w-5 animate-spin' />
        {polling && <p className='text-sm'>Confirming upgrade...</p>}
      </div>
    );
  }

  const { isPro, stripeData, cancelAtPeriodEnd } = subData || {
    isPro: false,
    cancelAtPeriodEnd: false,
  };
  const currentPlan = isPro ? "pro" : "free";

  let statusText = "You’re on the free plan with no active billing.";
  if (isPro) {
    if (cancelAtPeriodEnd || stripeData?.cancelAtPeriodEnd) {
      const d = stripeData?.currentPeriodEnd
        ? new Date(stripeData.currentPeriodEnd).toLocaleDateString()
        : "the end of your period";
      statusText = `Your subscription will cancel on ${d}.`;
    } else if (stripeData?.currentPeriodEnd) {
      statusText = `Your Pro subscription renews on ${new Date(stripeData.currentPeriodEnd).toLocaleDateString()}.`;
    } else {
      statusText = "Active Pro subscription.";
    }
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2.5'>
              <span className='text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]'>
                Current plan
              </span>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  isPro
                    ? cancelAtPeriodEnd || stripeData?.cancelAtPeriodEnd
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-[var(--bg-surface-soft)] text-[var(--text-muted)] border border-[var(--border-subtle)]",
                ].join(" ")}
              >
                <CreditCard className='h-3 w-3' />
                {isPro
                  ? cancelAtPeriodEnd || stripeData?.cancelAtPeriodEnd
                    ? "Cancels soon"
                    : "Pro"
                  : "Free"}
              </span>
            </div>

            <p className='mt-2 text-sm text-[var(--text-muted)]'>
              {statusText}
            </p>

            {stripeData?.card && (
              <div className='mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono'>
                <span className='uppercase'>{stripeData.card.brand}</span>{" "}
                ending in {stripeData.card.last4}
              </div>
            )}

            {!isPro && (
              <div className='mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]'>
                <Sparkles className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
                <span>
                  Unlock PDF exports, integrations, and priority support
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className='mt-5 flex flex-wrap items-center gap-2'>
          {isPro ? (
            <>
              <ManageBillingButton />
              {!(cancelAtPeriodEnd || stripeData?.cancelAtPeriodEnd) &&
                stripeData?.currentPeriodEnd && (
                  <CancelSubscriptionDialog
                    currentPeriodEnd={stripeData.currentPeriodEnd}
                    onCanceled={async () => {
                      // Re-fetch full subscription so stripeData is fresh
                      try {
                        const [subRes, invRes] = await Promise.all([
                          fetch("/api/billing/subscription"),
                          fetch("/api/billing/invoices"),
                        ]);
                        if (subRes.ok) setSubData(await subRes.json());
                        if (invRes.ok) {
                          const d = await invRes.json();
                          setInvoices(d.invoices ?? []);
                        }
                      } catch {
                        // Fallback: patch local state so UI responds immediately
                        setSubData((prev) =>
                          prev ? { ...prev, cancelAtPeriodEnd: true } : prev,
                        );
                      }
                    }}
                  />
                )}
            </>
          ) : (
            <>
              <UpgradeToProButton />
              <PlanModalTrigger currentPlan={currentPlan} />
            </>
          )}
        </div>

        <p className='mt-4 text-[0.7rem] text-[var(--text-muted)] opacity-70'>
          Use Manage billing to update your payment method or view portal
          options.
        </p>
      </div>

      {isPro && (
        <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden'>
          <div className='border-b border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-5 py-3.5'>
            <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
              Payment history
            </h3>
          </div>

          {invoices.length === 0 ? (
            <div className='p-6 text-center text-sm text-[var(--text-muted)]'>
              No invoices found yet.
            </div>
          ) : (
            <ul className='divide-y divide-[var(--border-subtle)]'>
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className='flex items-center justify-between px-5 py-4'
                >
                  <div>
                    <div className='text-sm font-medium text-[var(--text-primary)]'>
                      {new Date(inv.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className='mt-0.5 text-xs text-[var(--text-muted)] uppercase tracking-wide'>
                      {inv.status}
                    </div>
                  </div>
                  <div className='flex items-center gap-4'>
                    <div className='font-mono text-sm text-[var(--text-primary)]'>
                      {(inv.amount / 100).toFixed(2)}{" "}
                      {inv.currency.toUpperCase()}
                    </div>
                    {inv.hostedInvoiceUrl && (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] transition-colors'
                        title='Download invoice'
                      >
                        <Download className='h-3.5 w-3.5' />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
