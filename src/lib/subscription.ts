// src/lib/subscription.ts
import { prisma } from "@/lib/prisma";

export type Plan = "FREE" | "PRO";

export type ProStatus = {
  isPro: boolean;
  plan: Plan;
  proExpiresAt: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
};

export async function getUserProStatus(
  userId: string | null | undefined,
): Promise<ProStatus> {
  const DEFAULT: ProStatus = {
    isPro: false,
    plan: "FREE",
    proExpiresAt: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
  };

  if (!userId) return DEFAULT;

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        isPro: true,
        plan: true,
        proExpiresAt: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
      },
    });

    if (!settings) return DEFAULT;

    // If Stripe says subscription is active OR cancel_at_period_end (still in grace),
    // the user is Pro until proExpiresAt passes.
    const now = new Date();
    const periodEndInFuture =
      settings.proExpiresAt != null && settings.proExpiresAt > now;

    // isPro = DB flag OR (period-end in future = still within paid period)
    const isPro = !!settings.isPro || periodEndInFuture;
    const plan: Plan = isPro ? "PRO" : "FREE";

    return {
      isPro,
      plan,
      proExpiresAt: settings.proExpiresAt ?? null,
      cancelAtPeriodEnd: !!settings.cancelAtPeriodEnd,
      stripeCustomerId: settings.stripeCustomerId ?? null,
      stripeSubscriptionId: settings.stripeSubscriptionId ?? null,
      stripeSubscriptionStatus: settings.stripeSubscriptionStatus ?? null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("getUserProStatus failed (treating as FREE):", message);
    return DEFAULT;
  }
}
