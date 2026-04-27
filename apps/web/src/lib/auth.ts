import { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";

const prisma = db;

// Build providers list dynamically based on env vars (so app boots without all keys)
const providers: any[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.RESEND_API_KEY) {
  providers.push(
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp.resend.com",
        port: Number(process.env.EMAIL_SERVER_PORT) || 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER || "resend",
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM || "noreply@genmail.app",
    })
  );
}

// Dev-only credentials provider (only if NO real provider is configured AND not in production)
if (providers.length === 0 && process.env.NODE_ENV !== "production") {
  console.warn(
    "[Auth] No GOOGLE/RESEND credentials configured. Enabling DEV credentials login (insecure)."
  );
  providers.push(
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        let user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) {
          // Auto-create user + business for first-time dev login
          const business = await prisma.business.create({
            data: { name: "Dev Business", sector: "general", brandVoice: "", prohibitedClaims: [] },
          });
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split("@")[0],
              role: "OWNER",
              plan: "FREE",
              onboardingCompleted: false,
              businessId: business.id,
            },
          });
        }
        return user as any;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers,
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        const sessionUser = session.user as any;
        // Use either token (jwt strategy) or user (database strategy)
        const src = token || user;
        sessionUser.id = (src as any)?.id || (src as any)?.sub;
        sessionUser.businessId = (src as any)?.businessId;
        sessionUser.role = (src as any)?.role;
        sessionUser.plan = (src as any)?.plan;
        sessionUser.onboardingCompleted = (src as any)?.onboardingCompleted;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // First sign-in: copy user fields into token
      if (user) {
        token.id = (user as any).id;
        token.businessId = (user as any).businessId;
        token.role = (user as any).role;
        token.plan = (user as any).plan;
        token.onboardingCompleted = (user as any).onboardingCompleted;
      }
      // On `update` trigger (e.g. after onboarding), refresh from DB
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.businessId = fresh.businessId;
          token.role = fresh.role;
          token.plan = fresh.plan;
          token.onboardingCompleted = fresh.onboardingCompleted;
        }
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
          const business = await prisma.business.create({
            data: {
              name: profile?.name || user.name || user.email!.split("@")[0],
              sector: "general",
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
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Helper para usar en route handlers que requieren autenticación.
 * Devuelve la sesión o null si no está autenticado.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as typeof session & { user: { id: string; businessId: string; role: string; plan: string; onboardingCompleted: boolean } };
}
