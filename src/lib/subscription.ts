import { prisma } from "@/lib/prisma";

export type Plan = "FREE" | "PRO";

type ProStatus = {
  isPro: boolean;
  plan: Plan;
  proExpiresAt: Date | null;
};

export async function getUserProStatus(
  ownerEmail: string | null | undefined
): Promise<ProStatus> {
  if (!ownerEmail) {
    return {
      isPro: false,
      plan: "FREE",
      proExpiresAt: null,
    };
  }

  try {
    const settings = (prisma as any).userSettings.findUnique({
      where: { ownerEmail },
    });

    if (!settings) {
      return {
        isPro: false,
        plan: "FREE",
        proExpiresAt: null,
      };
    }

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
    return {
      isPro: false,
      plan: "FREE",
      proExpiresAt: null,
    };
  }
}
