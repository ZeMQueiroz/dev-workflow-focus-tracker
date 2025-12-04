import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ownerEmail = session.user.email;

  // Access via index to avoid stale Prisma types during generation
  const userSettings = await (prisma as any).userSettings.findUnique({
    where: { ownerEmail },
  });

  if (!userSettings?.stripeCustomerId) {
    return new NextResponse("No Stripe customer", { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: userSettings.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
