import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProStatus } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  const { isPro, plan } = await getUserProStatus(userId);

  return NextResponse.json({ isPro, plan });
}
