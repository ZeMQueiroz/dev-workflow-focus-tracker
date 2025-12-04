import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerEmail = session.user.email;

    // Ensure we have a UserSettings row
    let userSettings = await prisma.userSettings.findUnique({
      where: { ownerEmail },
    });

    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: { ownerEmail },
      });
    }

    let stripeCustomerId = userSettings.stripeCustomerId;

    // Ensure Stripe customer exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: ownerEmail,
        metadata: { ownerEmail },
      });

      stripeCustomerId = customer.id;

      await prisma.userSettings.update({
        where: { ownerEmail },
        data: { stripeCustomerId },
      });
    }

    const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRO_MONTHLY_PRICE_ID" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL" },
        { status: 500 }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancel`,
      metadata: { ownerEmail },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("create-checkout-session error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
