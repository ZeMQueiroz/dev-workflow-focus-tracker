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

  const { isPro, stripeCustomerId } = await getUserProStatus(userId);

  if (!isPro || !stripeCustomerId) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 24,
    });

    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
    }));

    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return new NextResponse("Failed to fetch invoices", { status: 500 });
  }
}
