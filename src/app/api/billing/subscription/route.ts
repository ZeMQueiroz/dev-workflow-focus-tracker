import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getUserProStatus } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { isPro, plan, cancelAtPeriodEnd, stripeSubscriptionId } =
    await getUserProStatus(userId);

  if (!isPro || !stripeSubscriptionId) {
    return NextResponse.json({
      isPro,
      plan,
      cancelAtPeriodEnd,
      stripeData: null,
    });
  }

  try {
    const subscription: any = await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
      { expand: ["default_payment_method"] },
    );

    const periodEnd = new Date(subscription.current_period_end * 1000);
    const periodStart = new Date(subscription.current_period_start * 1000);

    const paymentMethod = subscription.default_payment_method as any;
    let cardData = null;
    if (paymentMethod && paymentMethod.card) {
      cardData = {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      };
    }

    return NextResponse.json({
      isPro,
      plan,
      cancelAtPeriodEnd,
      stripeData: {
        status: subscription.status,
        currentPeriodStart: periodStart.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        card: cardData,
      },
    });
  } catch (error) {
    console.error("Failed to fetch subscription data:", error);
    return new NextResponse("Failed to fetch billing data", { status: 500 });
  }
}
