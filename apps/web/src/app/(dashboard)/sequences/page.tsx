"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Zap, Clock } from "lucide-react";

const sequences = [
  { id: "1", name: "Onboarding Evergreen", mode: "EVERGREEN", status: "ACTIVE", goal: "Convertir leads nuevos en usuarios activos", activeEnrollments: 234, totalEnrollments: 1567, createdAt: "2024-01-01" },
  { id: "2", name: "Nurturing Infinito", mode: "NURTURING_INFINITE", status: "ACTIVE", goal: "Mantener engagement a largo plazo", activeEnrollments: 456, totalEnrollments: 2341, createdAt: "2024-01-05" },
  { id: "3", name: "Re-engagement Campaign", mode: "EVERGREEN", status: "PAUSED", goal: "Recuperar leads inactivos", activeEnrollments: 0, totalEnrollments: 523, createdAt: "2023-12-15" },
  { id: "4", name: "Product Launch Q1", mode: "EVERGREEN", status: "DRAFT", goal: "Anunciar nuevas features", activeEnrollments: 0, totalEnrollments: 0, createdAt: "2024-01-15" },
];

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = { DRAFT: "outline", ACTIVE: "active", PAUSED: "nurturing", ARCHIVED: "secondary" };
  return <Badge variant={variants[status] as any}>{status}</Badge>;
}

function ModeBadge({ mode }: { mode: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {mode === "EVERGREEN" ? <Clock className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
      {mode === "EVERGREEN" ? "Evergreen" : "Nurturing"}
    </div>
  );
}

export default function SequencesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
          <p className="text-muted-foreground">Manage your email sequences and enrollments</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Sequence</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sequences.map((seq) => (
          <Card key={seq.id} className={seq.status === "ARCHIVED" ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{seq.name}</CardTitle>
                  <ModeBadge mode={seq.mode} />
                </div>
                <StatusBadge status={seq.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{seq.goal}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{seq.activeEnrollments} active</span>
                </div>
                <span className="text-muted-foreground">{seq.totalEnrollments} total</span>
              </div>
              {seq.status === "ACTIVE" && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Running since {seq.createdAt}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
