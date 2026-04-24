"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Card className="border-border text-center">
      <CardHeader className="space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
          <Mail className="h-8 w-8 text-accent" />
        </div>
        <CardTitle className="text-xl font-bold">Revisa tu email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          Te hemos enviado un enlace mágico para iniciar sesión. Haz clic en el enlace del email para continuar.
        </p>

        <div className="p-4 bg-secondary rounded-lg text-sm text-muted-foreground">
          <p>💡 Consejo: Revisa también la carpeta de spam si no encuentras el email.</p>
        </div>

        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
