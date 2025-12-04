import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Helper: convert unix seconds to Date (or null if missing)
function unixToDate(unix?: number | null) {
  return typeof unix === "number" ? new Date(unix * 1000) : null;
}

// Helper: robustly read current period end from Stripe object, regardless of casing
function readCurrentPeriodEnd(obj: unknown): number | undefined {
  const r = obj as Record<string, unknown>;
  const snake = r["current_period_end"];
  const camel = r["currentPeriodEnd"];
  return (
    (typeof snake === "number" ? snake : undefined) ??
    (typeof camel === "number" ? camel : undefined)
  );
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Missing webhook secret", { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook error:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const ownerEmail =
          (session.metadata?.ownerEmail as string | undefined) ??
          session.customer_details?.email ??
          undefined;

        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;

        if (!ownerEmail || !subscriptionId || !customerId) break;

        // Stripe SDK returns a Response<Subscription>; access fields safely
        const subResp = await stripe.subscriptions.retrieve(subscriptionId);

        const status =
          (subResp as Partial<Stripe.Subscription>).status ?? "active";

        const currentPeriodEnd =
          unixToDate(readCurrentPeriodEnd(subResp)) ?? new Date();

        const isActive = status === "active" || status === "trialing";

        await (prisma as any).userSettings.upsert({
          where: { ownerEmail },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            isPro: isActive,
            proExpiresAt: currentPeriodEnd,
            plan: isActive ? "PRO" : "FREE",
          },
          create: {
            ownerEmail,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            isPro: isActive,
            proExpiresAt: currentPeriodEnd,
            plan: isActive ? "PRO" : "FREE",
          },
        });

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const settings = await prisma.userSettings.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!settings) break;

        const currentPeriodEnd = unixToDate(readCurrentPeriodEnd(subscription));

        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        await prisma.userSettings.update({
          where: { ownerEmail: settings.ownerEmail },
          data: {
            isPro: isActive,
            proExpiresAt: isActive ? currentPeriodEnd : null,
            plan: isActive ? "PRO" : "FREE",
          },
        });

        break;
      }

      default:
        // ignore other events
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook handler failed:", message);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
