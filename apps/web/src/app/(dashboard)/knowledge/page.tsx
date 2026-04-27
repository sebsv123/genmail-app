"use client";

/**
 * Knowledge Base Dashboard
 * FASE 16F - Panel de Knowledge Base (admin only)
 */

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, TrendingUp, AlertCircle, CheckCircle, MessageSquare, Target, Activity, Building, DollarSign, UserCheck, Globe } from "lucide-react";

interface SectorKnowledge {
  sector: string;
  benchmark: {
    avgOpenRate: number;
    avgClickRate: number;
    avgReplyRate: number;
    bestDayOfWeek: string;
    bestHourRange: string;
    avgEmailLength: string;
    bestFrameworks: string[];
    source: string;
  } | null;
  vocabulary: {
    preferred: string[];
    prohibited: string[];
    powerWords: string[];
    weakWords: string[];
  };
  insights: Array<{
    id: string;
    insightType: string;
    title: string;
    description: string;
    examples: string[];
    weight: number;
  }>;
  templates: Array<{
    id: string;
    name: string;
    sequenceMode: string;
    subject: string;
    bodyText: string;
    copyFramework: string;
    qualityScore: number;
  }>;
  businessMetrics: {
    openRate: number;
    clickRate: number;
    totalEmails: number;
  } | null;
}

const SECTORS = [
  { value: "seguros", label: "Seguros" },
  { value: "inmobiliaria", label: "Inmobiliaria" },
  { value: "salud", label: "Salud" },
  { value: "educacion", label: "Educación" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "saas", label: "SaaS" },
  { value: "consultoria", label: "Consultoría" },
  { value: "legal", label: "Legal" },
  { value: "hosteleria", label: "Hostelería" },
  { value: "automocion", label: "Automoción" },
];

export default function KnowledgePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [knowledge, setKnowledge] = useState<SectorKnowledge | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if not owner
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "OWNER") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Load knowledge when sector selected
  useEffect(() => {
    if (!selectedSector) return;

    setLoading(true);
    fetch(`/api/knowledge?sector=${selectedSector}`)
      .then((res) => res.json())
      .then((data) => {
        setKnowledge(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading knowledge:", err);
        setLoading(false);
      });
  }, [selectedSector]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "OWNER") {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Knowledge Base Sectorial
          </h1>
          <p className="text-muted-foreground mt-1">
            Datos reales de benchmarks y mejores prácticas por sector
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecciona un sector</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Elige un sector..." />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((sector) => (
                <SelectItem key={sector.value} value={sector.value}>
                  {sector.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {knowledge && !loading && (
        <Tabs defaultValue="benchmark" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
            <TabsTrigger value="vocabulary">Vocabulario</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="signals">Señales</TabsTrigger>
          </TabsList>

          {/* Benchmark Tab */}
          <TabsContent value="benchmark" className="space-y-6">
            {knowledge.benchmark && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Open Rate Sector</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(knowledge.benchmark.avgOpenRate * 100).toFixed(1)}%
                      </div>
                      {knowledge.businessMetrics && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Tu: {(knowledge.businessMetrics.openRate * 100).toFixed(1)}%
                          {knowledge.businessMetrics.openRate > knowledge.benchmark.avgOpenRate ? (
                            <span className="text-green-500 ml-2">↑</span>
                          ) : (
                            <span className="text-red-500 ml-2">↓</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Click Rate Sector</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(knowledge.benchmark.avgClickRate * 100).toFixed(1)}%
                      </div>
                      {knowledge.businessMetrics && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Tu: {(knowledge.businessMetrics.clickRate * 100).toFixed(1)}%
                          {knowledge.businessMetrics.clickRate > knowledge.benchmark.avgClickRate ? (
                            <span className="text-green-500 ml-2">↑</span>
                          ) : (
                            <span className="text-red-500 ml-2">↓</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Reply Rate Sector</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(knowledge.benchmark.avgReplyRate * 100).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Mejor Timing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Mejor día de la semana</span>
                      <Badge variant="secondary">{knowledge.benchmark.bestDayOfWeek}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Mejor franja horaria</span>
                      <Badge variant="secondary">{knowledge.benchmark.bestHourRange}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Longitud de email recomendada</span>
                      <Badge variant="secondary">{knowledge.benchmark.avgEmailLength}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Frameworks recomendados</span>
                      <div className="flex gap-2">
                        {knowledge.benchmark.bestFrameworks.map((fw) => (
                          <Badge key={fw} variant="outline">{fw}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Fuente: {knowledge.benchmark.source}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Vocabulary Tab */}
          <TabsContent value="vocabulary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Power Words
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {knowledge.vocabulary.powerWords.map((word) => (
                      <Badge key={word} className="bg-green-100 text-green-800">{word}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Palabras Prohibidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {knowledge.vocabulary.prohibited.map((word) => (
                      <Badge key={word} variant="destructive">{word}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Palabras Preferidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {knowledge.vocabulary.preferred.map((word) => (
                      <Badge key={word} variant="secondary">{word}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-500" />
                    Palabras Débiles (evitar)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {knowledge.vocabulary.weakWords.map((word) => (
                      <Badge key={word} variant="outline" className="text-gray-500">{word}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {knowledge.insights.map((insight) => (
                <Card key={insight.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          insight.insightType === "PAIN_POINT" ? "destructive" :
                          insight.insightType === "TRIGGER" ? "default" :
                          insight.insightType === "OBJECTION" ? "secondary" :
                          insight.insightType === "BUYING_SIGNAL" ? "outline" :
                          "secondary"
                        }>
                          {insight.insightType.replace("_", " ")}
                        </Badge>
                        <Progress value={insight.weight * 100} className="w-20" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{insight.description}</p>
                    {insight.examples.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Ejemplos:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {insight.examples.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {knowledge.templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge>{template.sequenceMode.replace("_", " ")}</Badge>
                        <Badge variant="outline">{template.copyFramework}</Badge>
                        <div className="flex items-center gap-1">
                          <Progress value={template.qualityScore * 100} className="w-20" />
                          <span className="text-sm text-muted-foreground">
                            {(template.qualityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Subject:</p>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Body Preview:</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {template.bodyText}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4 mr-2" />
                      Usar como base
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Signals Tab - FASE 18G */}
          <TabsContent value="signals" className="space-y-6">
            {/* Market Trends Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Tendencias de tu sector
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarketTrendsPanel />
              </CardContent>
            </Card>

            {/* Lead Signals Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Señales de tus leads (últimas 72h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeadSignalsPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ============== SUB-COMPONENTS FOR SIGNALS (FASE 18G) ==============

function MarketTrendsPanel() {
  const [trends, setTrends] = useState<any[]>([]);
  const [hasSpike, setHasSpike] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signals/trends")
      .then((res) => res.json())
      .then((data) => {
        setTrends(data.trends?.slice(0, 5) || []);
        setHasSpike(data.hasSpike);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Recopilando datos del sector...
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <p className="text-muted-foreground">
        Recopilando datos del sector, disponible en 6h
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasSpike && (
        <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">
              🔥 Pico de búsquedas detectado — Momento óptimo para enviar campañas
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {trends.map((t) => (
          <div key={t.keyword} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="font-medium">{t.keyword}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {t.weeklyChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : t.weeklyChange < 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                ) : (
                  <span className="text-gray-400">→</span>
                )}
                <span className={t.weeklyChange > 0 ? "text-green-600" : t.weeklyChange < 0 ? "text-red-600" : "text-gray-500"}>
                  {t.weeklyChange > 0 ? "+" : ""}{t.weeklyChange.toFixed(0)}%
                </span>
              </div>
              <Progress value={t.trendScore} className="w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadSignalsPanel() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signals")
      .then((res) => res.json())
      .then((data) => {
        setSignals(data.signals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "COMPANY_GREW": return <Building className="h-4 w-4 text-blue-500" />;
      case "JOB_CHANGE": return <UserCheck className="h-4 w-4 text-green-500" />;
      case "FUNDING_ROUND": return <DollarSign className="h-4 w-4 text-yellow-500" />;
      case "COMPANY_HIRING": return <Activity className="h-4 w-4 text-purple-500" />;
      case "WEBSITE_VISIT": return <Globe className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSignalLabel = (type: string) => {
    switch (type) {
      case "COMPANY_GREW": return "🏢 Empresa creció";
      case "JOB_CHANGE": return "👔 Cambio de trabajo";
      case "FUNDING_ROUND": return "💰 Ronda de financiación";
      case "COMPANY_HIRING": return "📊 Están contratando";
      case "WEBSITE_VISIT": return "🌐 Visita web";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando señales...
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <p className="text-muted-foreground">
        No hay señales recientes. Los datos aparecerán cuando tus leads generen actividad.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {signals.map((s) => (
        <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0 hover:bg-gray-50 rounded px-2 cursor-pointer">
          {getSignalIcon(s.signalType)}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {s.lead?.name || s.prospect?.firstName || "Lead"} {s.prospect?.lastName || ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {getSignalLabel(s.signalType)} · {new Date(s.detectedAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={s.intentBoost > 0.3 ? "default" : "secondary"}>
            +{(s.intentBoost * 100).toFixed(0)}%
          </Badge>
        </div>
      ))}
    </div>
  );
}
