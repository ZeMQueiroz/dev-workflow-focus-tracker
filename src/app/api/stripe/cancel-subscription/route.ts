import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getUserProStatus } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { isPro, stripeSubscriptionId } = await getUserProStatus(userId);

  if (!isPro || !stripeSubscriptionId) {
    return new NextResponse("No active subscription to cancel", {
      status: 400,
    });
  }

  try {
    // Cancel at period end
    const updatedSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    // Also optimistically update the DB here (webhook will eventually do it too)
    await prisma.userSettings.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return NextResponse.json({
      success: true,
      status: updatedSubscription.status,
    });
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return new NextResponse("Failed to cancel subscription", { status: 500 });
  }
}
