"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpPanel } from "@/components/ui/help-panel";
import { Users, Mail, TrendingUp, Zap, Clock, ArrowRight, Crosshair, BookOpen, Sparkles } from "lucide-react";

interface Overview {
  totalLeads: number;
  totalSequences: number;
  activeEnrollments: number;
  emailsSent: number;
  emailsPending: number;
  conversionRate: number;
}
interface RagStats {
  totalChunksIndexed: number;
  sourcesReady: number;
  totalEmbeddings: number;
  avgChunksPerEmail: number;
  avgSimilarityScore: number;
}
interface RecentEmail {
  id: string;
  subject: string;
  status: string;
  qualityScore?: number | null;
  createdAt: string;
  sentAt?: string | null;
  lead?: { id: string; name: string; email: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    SENT: "secondary",
    PENDING_REVIEW: "nurturing",
    DRAFT: "outline",
    APPROVED: "active",
    REJECTED: "destructive",
    SCHEDULED: "default",
  };
  return <Badge variant={(variants[status] || "default") as any}>{status}</Badge>;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rag, setRag] = useState<RagStats | null>(null);
  const [emails, setEmails] = useState<RecentEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, e] = await Promise.all([
          fetch("/api/analytics/dashboard").then((r) => r.json()),
          fetch("/api/emails?limit=10").then((r) => r.json()),
        ]);
        setOverview(a.overview);
        setRag(a.ragStats);
        setEmails(e.data?.emails || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isEmpty = !loading && (!overview || (overview.totalLeads === 0 && overview.totalSequences === 0 && overview.emailsSent === 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tu actividad de email marketing</p>
      </div>

      <HelpPanel
        title="¿Por dónde empiezo?"
        defaultOpen={isEmpty}
        steps={[
          { label: "Añade fuentes de conocimiento", description: "En Sources → sube docs, RSS o URLs. El RAG aprende tu estilo y contenido." },
          { label: "Crea un ICP en Lead Hunter", description: "Define a quién quieres alcanzar (sector, rol, ubicación)." },
          { label: "Lanza un Hunt", description: "El sistema buscará prospectos automáticamente y los validará." },
          { label: "Aprueba prospectos", description: "Revisa los encontrados y aprueba los buenos. Pasarán a leads." },
          { label: "Crea una secuencia", description: "Define el flujo de emails que recibirán los leads aprobados." },
          { label: "Revisa y envía emails", description: "Los emails generados aparecen en Emails para revisión humana antes de enviar." },
        ]}
      />

      {isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction href="/sources" icon={BookOpen} title="Conectar fuente" desc="Sube tu primer doc o URL" />
          <QuickAction href="/hunt" icon={Crosshair} title="Crear ICP" desc="Define tu cliente ideal" />
          <QuickAction href="/sequences" icon={Sparkles} title="Crear secuencia" desc="Define el flujo de emails" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total Leads" value={overview?.totalLeads ?? 0} sub={`${overview?.activeEnrollments ?? 0} activos en secuencias`} />
        <MetricCard icon={Mail} label="Emails enviados" value={overview?.emailsSent ?? 0} sub={`${overview?.emailsPending ?? 0} pendientes de revisión`} />
        <MetricCard icon={TrendingUp} label="Conversion rate" value={`${overview?.conversionRate ?? 0}%`} sub="enrolled / sent" />
        <MetricCard icon={Zap} label="Secuencias" value={overview?.totalSequences ?? 0} sub={`${rag?.sourcesReady ?? 0} fuentes listas`} />
      </div>

      {rag && rag.totalChunksIndexed > 0 && (
        <Card className="bg-accent/5 border-accent/30">
          <CardHeader>
            <CardTitle className="text-sm">RAG / Personalización</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground text-xs">Chunks indexados</p><p className="font-bold">{rag.totalChunksIndexed}</p></div>
            <div><p className="text-muted-foreground text-xs">Fuentes listas</p><p className="font-bold">{rag.sourcesReady}</p></div>
            <div><p className="text-muted-foreground text-xs">Avg chunks/email</p><p className="font-bold">{rag.avgChunksPerEmail}</p></div>
            <div><p className="text-muted-foreground text-xs">Similarity</p><p className="font-bold">{rag.avgSimilarityScore}</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Emails recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : emails.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-muted-foreground">Aún no se ha generado ningún email.</p>
              <p className="text-sm text-muted-foreground">Cuando enroles leads en secuencias, los emails aparecerán aquí para revisión.</p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={"/sequences" as any}>Ir a secuencias <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                  <th>Calidad</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id} className="hover-row">
                    <td>
                      <p className="font-medium">{email.lead?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{email.lead?.email || ""}</p>
                    </td>
                    <td className="max-w-xs truncate">{email.subject}</td>
                    <td><StatusBadge status={email.status} /></td>
                    <td>
                      {email.qualityScore != null ? (
                        <span className={email.qualityScore >= 0.8 ? "text-emerald-500" : "text-amber-500"}>
                          {Math.round(email.qualityScore * 100)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-muted-foreground text-xs">
                      {new Date(email.sentAt || email.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number | string; sub: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, icon: Icon, title, desc }: { href: string; icon: any; title: string; desc: string }) {
  return (
    <Link href={href as any} className="block">
      <Card className="hover:border-accent transition-colors h-full">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
