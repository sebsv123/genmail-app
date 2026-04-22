import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaClient } from "@genmail/db";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp.resend.com",
        port: Number(process.env.EMAIL_SERVER_PORT) || 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER || "resend",
          pass: process.env.RESEND_API_KEY || "",
        },
      },
      from: process.env.EMAIL_FROM || "noreply@genmail.app",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.businessId = (user as any).businessId;
        session.user.role = (user as any).role;
        session.user.plan = (user as any).plan;
        session.user.onboardingCompleted = (user as any).onboardingCompleted;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.businessId = (user as any).businessId;
        token.onboardingCompleted = (user as any).onboardingCompleted;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "email") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { business: true },
        });

        if (!existingUser) {
          // First login - create business automatically
          const slug = `business-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const business = await prisma.business.create({
            data: {
              name: profile?.name || user.name || user.email!.split("@")[0],
              slug,
              brandVoice: "",
              prohibitedClaims: [],
            },
          });

          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || profile?.name,
              image: user.image || (profile as any)?.picture,
              role: "OWNER",
              plan: "FREE",
              onboardingCompleted: false,
              businessId: business.id,
            },
          });
        }

        return true;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
};
