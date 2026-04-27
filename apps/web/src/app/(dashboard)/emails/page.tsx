"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpPanel } from "@/components/ui/help-panel";
import { Loader2, Mail, ArrowRight, Eye, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type EmailStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "SCHEDULED" | "SENT" | "FAILED" | "REJECTED";

interface Email {
  id: string;
  subject: string;
  previewText?: string;
  status: EmailStatus;
  qualityScore?: number;
  createdAt: string;
  sentAt?: string;
  lead?: { name: string; email: string } | null;
}

const statusConfig: Record<EmailStatus, { label: string; variant: string; icon: any }> = {
  DRAFT: { label: "Borrador", variant: "outline", icon: AlertCircle },
  PENDING_REVIEW: { label: "Pendiente", variant: "nurturing", icon: Eye },
  APPROVED: { label: "Aprobado", variant: "active", icon: CheckCircle },
  SCHEDULED: { label: "Programado", variant: "default", icon: Clock },
  SENT: { label: "Enviado", variant: "secondary", icon: Mail },
  FAILED: { label: "Falló", variant: "destructive", icon: XCircle },
  REJECTED: { label: "Rechazado", variant: "destructive", icon: XCircle },
};

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EmailStatus | "ALL">("ALL");

  useEffect(() => {
    fetch("/api/emails?limit=100")
      .then((r) => r.json())
      .then((j) => setEmails(j.data?.emails || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? emails : emails.filter((e) => e.status === filter);
  const counts: Record<string, number> = {};
  for (const e of emails) counts[e.status] = (counts[e.status] || 0) + 1;

  const statuses = ["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "REJECTED"] as EmailStatus[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emails generados</h1>
          <p className="text-muted-foreground">Revisa, aprueba y envía los emails generados por IA</p>
        </div>
      </div>

      <HelpPanel
        title="¿Cómo funciona el flujo de emails?"
        defaultOpen={emails.length === 0}
        steps={[
          { label: "Generación", description: "Cuando un lead está en una secuencia activa, la IA genera un email personalizado basado en tus fuentes de conocimiento y el contexto del lead." },
          { label: "Revisión humana", description: "El email aparece en estado PENDING_REVIEW. Puedes abrirlo, leerlo, editarlo si es necesario, y aprobarlo o rechazarlo." },
          { label: "Envío programado", description: "Los aprobados pasan a SCHEDULED y se envían automáticamente en el horario óptimo del destinatario." },
          { label: "Resultados", description: "Una vez enviados (SENT), rastreamos aperturas, clics y respuestas para mejorar futuras generaciones." },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "ALL" ? "default" : "outline"} size="sm" onClick={() => setFilter("ALL")}>
          Todos {emails.length}
        </Button>
        {statuses.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {statusConfig[s].label} {counts[s] || 0}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground">
                {emails.length === 0
                  ? "Aún no se ha generado ningún email."
                  : "Ningún email coincide con el filtro."}
              </p>
              {emails.length === 0 && (
                <>
                  <p className="text-sm text-muted-foreground">Primero crea una secuencia y añade leads o prospectos.</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={"/sequences" as any}>Ir a secuencias <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((email) => {
                const cfg = statusConfig[email.status];
                const Icon = cfg.icon;
                return (
                  <div
                    key={email.id}
                    className="flex items-start gap-4 p-3 rounded-lg border hover:border-accent transition-colors"
                  >
                    <div className="mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{email.subject}</p>
                        <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {email.lead ? `${email.lead.name} <${email.lead.email}>` : "Sin destinatario"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(email.createdAt).toLocaleString()}
                        {email.qualityScore != null && ` · Calidad: ${Math.round(email.qualityScore * 100)}%`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/emails/${email.id}` as any}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
