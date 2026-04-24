import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export interface ApiError {
  error: string;
  status: number;
}

export interface ApiSuccess<T> {
  data: T;
  success: true;
}

export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message, status }, { status });
}

export function apiSuccess<T>(data: T): NextResponse {
  return NextResponse.json({ data, success: true });
}

export type AuthenticatedHandler = (
  req: NextRequest,
  session: { user: { id: string; businessId: string; role: string } }
) => Promise<NextResponse>;

export async function withAuth(
  handler: AuthenticatedHandler
): Promise<NextResponse> {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.businessId) {
      return apiError("Unauthorized", 401);
    }

    return handler(req, session as any);
  };
}

export type BusinessHandler = (
  req: NextRequest,
  session: { user: { id: string; businessId: string; role: string } },
  businessId: string
) => Promise<NextResponse>;

export async function withBusiness(
  handler: BusinessHandler
): Promise<NextResponse> {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.businessId) {
      return apiError("Unauthorized", 401);
    }

    const businessId = session.user.businessId;
    return handler(req, session as any, businessId);
  };
}

export async function getSessionBusinessId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.businessId || null;
}
