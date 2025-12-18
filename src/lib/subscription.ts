// src/lib/subscription.ts
import { prisma } from "@/lib/prisma";

export type Plan = "FREE" | "PRO";

type ProStatus = {
  isPro: boolean;
  plan: Plan;
  proExpiresAt: Date | null;
};

export async function getUserProStatus(
  userId: string | null | undefined
): Promise<ProStatus> {
  if (!userId) {
    return { isPro: false, plan: "FREE", proExpiresAt: null };
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        isPro: true,
        plan: true,
        proExpiresAt: true,
      },
    });

    if (!settings) {
      return { isPro: false, plan: "FREE", proExpiresAt: null };
    }

    // Trust DB "plan" if present, but keep it consistent with isPro
    const isPro = !!settings.isPro;
    const plan: Plan = isPro ? "PRO" : "FREE";

    return {
      isPro,
      plan,
      proExpiresAt: settings.proExpiresAt ?? null,
    };
  } catch (err: any) {
    console.error(
      "getUserProStatus failed (treating as FREE):",
      err?.code ?? err
    );
    return { isPro: false, plan: "FREE", proExpiresAt: null };
  }
}
