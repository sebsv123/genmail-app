"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Zap, Clock } from "lucide-react";
import type { Sequence } from "@/lib/types";

// Mock data
const sequences: Sequence[] = [
  {
    id: "1",
    name: "Onboarding Evergreen",
    mode: "EVERGREEN",
    status: "ACTIVE",
    goal: "Convertir leads nuevos en usuarios activos",
    activeEnrollments: 234,
    totalEnrollments: 1567,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Nurturing Infinito",
    mode: "NURTURING_INFINITE",
    status: "ACTIVE",
    goal: "Mantener engagement a largo plazo",
    activeEnrollments: 456,
    totalEnrollments: 2341,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    name: "Re-engagement Campaign",
    mode: "EVERGREEN",
    status: "PAUSED",
    goal: "Recuperar leads inactivos",
    activeEnrollments: 0,
    totalEnrollments: 523,
    createdAt: new Date("2023-12-15"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "4",
    name: "Product Launch Q1",
    mode: "EVERGREEN",
    status: "DRAFT",
    goal: "Anunciar nuevas features",
    activeEnrollments: 0,
    totalEnrollments: 0,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "5",
    name: "Case Study Series",
    mode: "NURTURING_INFINITE",
    status: "ARCHIVED",
    goal: "Social proof mediante casos de éxito",
    activeEnrollments: 0,
    totalEnrollments: 892,
    createdAt: new Date("2023-11-01"),
    updatedAt: new Date("2023-12-30"),
  },
];

function StatusBadge({ status }: { status: Sequence["status"] }) {
  const variants: Record<Sequence["status"], "default" | "secondary" | "active" | "nurturing" | "outline"> = {
    DRAFT: "outline",
    ACTIVE: "active",
    PAUSED: "nurturing",
    ARCHIVED: "secondary",
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function ModeBadge({ mode }: { mode: Sequence["mode"] }) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
          <p className="text-muted-foreground">Manage your email sequences and enrollments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Sequence
        </Button>
      </div>

      {/* Sequences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sequences.map((sequence) => (
          <Card key={sequence.id} className={sequence.status === "ARCHIVED" ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{sequence.name}</CardTitle>
                  <ModeBadge mode={sequence.mode} />
                </div>
                <StatusBadge status={sequence.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {sequence.goal}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{sequence.activeEnrollments} active</span>
                </div>
                <span className="text-muted-foreground">
                  {sequence.totalEnrollments} total
                </span>
              </div>

              {sequence.status === "ACTIVE" && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Running since {new Date(sequence.createdAt).toLocaleDateString()}</span>
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
