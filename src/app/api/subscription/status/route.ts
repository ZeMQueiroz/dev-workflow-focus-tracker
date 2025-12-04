// src/app/api/subscription/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProStatus } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  const ownerEmail = session?.user?.email ?? null;

  const { isPro, plan } = await getUserProStatus(ownerEmail);

  return NextResponse.json({ isPro, plan });
}
