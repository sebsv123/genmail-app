import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If onboarding not completed, redirect to onboarding
    if (token && !token.onboardingCompleted && pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // If onboarding completed and trying to access onboarding, redirect to dashboard
    if (token && token.onboardingCompleted && pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // Allow public paths
        const publicPaths = ["/login", "/register", "/verify-email"];
        if (publicPaths.includes(req.nextUrl.pathname)) {
          return true;
        }

        // Require auth for protected paths
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true;
        }

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/hunt/:path*",
    "/leads/:path*",
    "/sequences/:path*",
    "/sources/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/emails/:path*",
    "/experiments/:path*",
    "/knowledge/:path*",
  ],
};
