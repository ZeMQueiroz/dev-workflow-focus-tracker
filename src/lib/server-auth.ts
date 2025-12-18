import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export const getCurrentUserId = async (): Promise<string | null> => {
  const session = await getServerSession(authOptions);
  // session.user.id comes from your NextAuth session callback + TS augmentation
  return session?.user?.id ?? null;
};

// deprecated: use getCurrentUserId where possible
export const getCurrentUserEmail = async (): Promise<string | null> => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return email ?? null;
};
