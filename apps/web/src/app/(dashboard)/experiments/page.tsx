"use client";

import { useEffect, useState } from "react";
import { Beaker, Trophy, AlertCircle, Loader2 } from "lucide-react";

interface ABVariant {
  id: string;
  name: string;
  hypothesis: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

interface ABTest {
  id: string;
  name: string;
  status: "RUNNING" | "COMPLETED" | "STOPPED";
  testType: string;
  startedAt: string;
  completedAt?: string;
  winnerVariantId?: string;
  minSampleSize: number;
  sequence?: {
    id: string;
    name: string;
  };
  variants: ABVariant[];
}

export default function ExperimentsPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiments();
  }, []);

  async function fetchExperiments() {
    try {
      const response = await fetch("/api/experiments");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTests(data.tests || []);
    } catch (err) {
      setError("Error loading experiments");
    } finally {
      setLoading(false);
    }
  }

  async function stopTest(testId: string) {
    if (!confirm("¿Estás seguro de que quieres detener este test?")) return;

    try {
      const response = await fetch(`/api/experiments/${testId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to stop");
      fetchExperiments();
    } catch (err) {
      alert("Error deteniendo el test");
    }
  }

  const runningTests = tests.filter((t) => t.status === "RUNNING");
  const completedTests = tests.filter((t) => t.status === "COMPLETED" || t.status === "STOPPED");

  function renderProgressBar(value: number, max: number, color: string) {
    const percentage = Math.min(100, (value / max) * 100);
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }

  function renderVariantStats(variant: ABVariant, otherVariant: ABVariant) {
    const maxOpen = Math.max(variant.openRate, otherVariant.openRate) || 1;
    const maxClick = Math.max(variant.clickRate, otherVariant.clickRate) || 1;
    const maxReply = Math.max(variant.replyRate, otherVariant.replyRate) || 1;

    return (
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Open Rate</span>
            <span className="font-medium">{(variant.openRate * 100).toFixed(1)}%</span>
          </div>
          {renderProgressBar(variant.openRate, maxOpen, "bg-blue-500")}
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Click Rate</span>
            <span className="font-medium">{(variant.clickRate * 100).toFixed(1)}%</span>
          </div>
          {renderProgressBar(variant.clickRate, maxClick, "bg-green-500")}
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Reply Rate</span>
            <span className="font-medium">{(variant.replyRate * 100).toFixed(1)}%</span>
          </div>
          {renderProgressBar(variant.replyRate, maxReply, "bg-purple-500")}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            Experimentos A/B
          </h1>
          <p className="text-gray-600 mt-1">
            GenMail prueba automáticamente qué versiones funcionan mejor
          </p>
        </div>
        <button
          onClick={() => alert("Feature coming soon: Create manual experiment")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nuevo experimento manual
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Running Tests */}
      {runningTests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Tests en progreso
          </h2>
          <div className="grid gap-6">
            {runningTests.map((test) => (
              <div
                key={test.id}
                className="bg-white border rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{test.name}</h3>
                    <p className="text-sm text-gray-500">
                      {test.testType} • Secuencia: {test.sequence?.name || "N/A"}
                    </p>
                  </div>
                  <button
                    onClick={() => stopTest(test.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Detener test
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {test.variants.map((variant, idx) => (
                    <div
                      key={variant.id}
                      className={`p-4 rounded-lg ${
                        idx === 0 ? "bg-blue-50 border border-blue-200" : "bg-orange-50 border border-orange-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            idx === 0 ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                          }`}
                        >
                          {variant.name}
                        </span>
                        <span className="font-medium">Variante {variant.name}</span>
                      </div>

                      <p className="text-sm text-gray-700 mb-4">
                        {variant.hypothesis}
                      </p>

                      {renderVariantStats(
                        variant,
                        test.variants[idx === 0 ? 1 : 0]
                      )}

                      <div className="mt-4 text-sm text-gray-500">
                        {variant.sent} / {test.minSampleSize} emails enviados
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Tests completados
          </h2>
          <div className="grid gap-4">
            {completedTests.map((test) => {
              const winner = test.variants.find(
                (v) => v.id === test.winnerVariantId
              );
              const loser = test.variants.find(
                (v) => v.id !== test.winnerVariantId
              );

              return (
                <div
                  key={test.id}
                  className="bg-white border rounded-xl p-6 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      {winner ? (
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{test.name}</h3>
                      <p className="text-sm text-gray-500">
                        {test.testType} • Completado{" "}
                        {test.completedAt
                          ? new Date(test.completedAt).toLocaleDateString()
                          : "N/A"}
                      </p>

                      {winner ? (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm">
                            <span className="font-semibold text-green-700">
                              🏆 Ganador: Variante {winner.name}
                            </span>
                            <br />
                            <span className="text-green-600">
                              {(winner.openRate * 100).toFixed(1)}% apertura vs{" "}
                              {(loser?.openRate || 0) * 100}% del perdedor
                            </span>
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Aprendizaje: {winner.hypothesis}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600">
                            📊 Test inconcluso: ambas variantes tuvieron
                            rendimiento similar. Intenta probar variables más
                            diferentes.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!loading && tests.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Beaker className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            No hay experimentos aún
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Los experimentos A/B se crean automáticamente cuando hay suficiente
            volumen de emails (20+). También puedes crear uno manualmente.
          </p>
        </div>
      )}
    </div>
  );
}
