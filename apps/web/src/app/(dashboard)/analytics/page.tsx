"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpPanel } from "@/components/ui/help-panel";
import { Loader2, Users, Mail, TrendingUp, Zap, ArrowRight, Database, BarChart3 } from "lucide-react";
import Link from "next/link";

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

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rag, setRag] = useState<RagStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/dashboard")
      .then((r) => r.json())
      .then((j) => {
        setOverview(j.overview);
        setRag(j.ragStats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando analíticas...
      </div>
    );
  }

  const empty = !overview || (overview.totalLeads === 0 && overview.emailsSent === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Métricas de tu actividad de email marketing</p>
      </div>

      <HelpPanel
        title="¿Qué miden estas métricas?"
        defaultOpen={empty}
        steps={[
          { label: "Total Leads", description: "Número de leads en tu base de datos (manuales + de Lead Hunter)." },
          { label: "Emails enviados", description: "Emails que ya han sido enviados a leads activos." },
          { label: "Pending Review", description: "Emails generados que esperan tu aprobación antes de enviarse." },
          { label: "Conversion Rate", description: "Ratio de leads enrolados vs emails enviados." },
          { label: "RAG Stats", description: "Chunks de conocimiento indexados. Más fuentes = emails más personalizados." },
        ]}
      />

      {empty && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Aún no hay datos para analizar</p>
            <p className="text-sm text-muted-foreground">Empieza creando leads y secuencias para ver métricas reales.</p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href={"/hunt" as any}>Lead Hunter <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={"/sequences" as any}>Secuencias <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total Leads" value={overview?.totalLeads ?? 0} />
        <MetricCard icon={Mail} label="Emails enviados" value={overview?.emailsSent ?? 0} />
        <MetricCard icon={TrendingUp} label="Emails pendientes" value={overview?.emailsPending ?? 0} />
        <MetricCard icon={Zap} label="Conversion rate" value={`${overview?.conversionRate ?? 0}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5" /> Secuencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Secuencias totales" value={overview?.totalSequences ?? 0} />
            <MetricRow label="Enrollments activos" value={overview?.activeEnrollments ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Database className="h-5 w-5" /> RAG / Conocimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow label="Chunks indexados" value={rag?.totalChunksIndexed ?? 0} />
            <MetricRow label="Fuentes listas" value={rag?.sourcesReady ?? 0} />
            <MetricRow label="Lead embeddings" value={rag?.totalEmbeddings ?? 0} />
            <MetricRow label="Avg chunks/email" value={rag?.avgChunksPerEmail ?? 0} />
            <MetricRow label="Similaridad media" value={rag?.avgSimilarityScore ?? 0} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
