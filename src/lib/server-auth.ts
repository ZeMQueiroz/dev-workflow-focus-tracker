import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export const getCurrentUserEmail = async (): Promise<string | null> => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return email ?? null;
};
