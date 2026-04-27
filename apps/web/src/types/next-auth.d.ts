import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      businessId: string;
      role: "OWNER" | "MEMBER";
      plan: "FREE" | "STARTER" | "PRO" | "AGENCY";
      onboardingCompleted: boolean;
    };
  }

  interface User {
    id: string;
    businessId: string;
    role: "OWNER" | "MEMBER";
    plan: "FREE" | "STARTER" | "PRO" | "AGENCY";
    onboardingCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    businessId?: string;
    onboardingCompleted?: boolean;
  }
}
