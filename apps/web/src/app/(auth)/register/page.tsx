"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mail, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando...</div>}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/onboarding";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    getProviders().then((p) => setProviders(p || {}));
  }, []);

  const hasGoogle = !!providers?.google;
  const hasEmail = !!providers?.email;
  const hasCredentials = !!providers?.credentials;

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn("google", { callbackUrl });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (hasEmail) {
        await signIn("email", { email, callbackUrl });
      } else if (hasCredentials) {
        // Dev mode: credentials provider auto-creates user + business
        const res = await signIn("credentials", { email, callbackUrl, redirect: false });
        if (res?.error) {
          setError(res.error);
        } else {
          router.push(callbackUrl as any);
        }
      } else {
        setError("No authentication providers configured. Set GOOGLE_CLIENT_ID/SECRET or RESEND_API_KEY in .env.");
      }
    } catch (e: any) {
      setError(e.message || "Sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Empieza gratis</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              14 días gratis
            </Badge>
            <span className="text-xs text-muted-foreground">Sin tarjeta de crédito</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isLoading || !hasGoogle}
          title={!hasGoogle ? "Google sign-in not configured (set GOOGLE_CLIENT_ID/SECRET in .env)" : undefined}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuar con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">o</span>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading || !email}>
            {isLoading ? "Creando..." : hasEmail ? "Enviar enlace mágico" : "Crear cuenta (dev)"}
          </Button>
          {!hasEmail && hasCredentials && (
            <p className="text-xs text-center text-muted-foreground">Modo dev: cuenta creada automáticamente sin contraseña</p>
          )}
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Al registrarte aceptas nuestros{" "}
          <Link href="#" className="underline hover:text-foreground">
            Términos
          </Link>{" "}
          y{" "}
          <Link href="#" className="underline hover:text-foreground">
            Política de privacidad
          </Link>
        </p>

        <p className="text-sm text-center text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
