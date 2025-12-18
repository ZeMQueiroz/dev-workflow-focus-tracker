// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      // token.email is often already set by NextAuth,
      // but we normalize and ensure we have an internal userId.
      const email =
        (typeof token.email === "string" ? token.email : user?.email) ?? null;

      if (!email) return token;

      const normalizedEmail = email.toLowerCase().trim();
      token.email = normalizedEmail;

      // Only do DB work if we don't already have userId in the token
      if (!token.userId) {
        const dbUser = await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: {},
          create: { email: normalizedEmail },
          select: { id: true },
        });

        token.userId = dbUser.id;

        // Ensure a UserSettings row exists for this userId
        await prisma.userSettings.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: { userId: dbUser.id },
          select: { id: true },
        });
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }
      // expose your internal user id to the app
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
