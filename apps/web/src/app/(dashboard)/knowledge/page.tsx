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
import { Loader2, BookOpen, TrendingUp, AlertCircle, CheckCircle, MessageSquare, Target } from "lucide-react";

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
    if (status === "authenticated" && session?.user?.role !== "owner") {
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

  if (session?.user?.role !== "owner") {
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
            <TabsTrigger value="vocabulary">Vocabulario</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
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
        </Tabs>
      )}
    </div>
  );
}
