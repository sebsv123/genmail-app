"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Zap, Clock } from "lucide-react";
import { HelpPanel } from "@/components/ui/help-panel";

interface Sequence {
  id: string;
  name: string;
  mode: string;
  status: string;
  goal?: string | null;
  createdAt: string;
  _count?: { enrollments: number };
}

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
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"EVERGREEN" | "NURTURING_INFINITE">("EVERGREEN");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSequences = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sequences");
      const json = await res.json();
      setSequences(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSequences();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode, goal: goal || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create sequence");
      }
      setShowModal(false);
      setName("");
      setGoal("");
      setMode("EVERGREEN");
      await loadSequences();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
          <p className="text-muted-foreground">Manage your email sequences and enrollments</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />New Sequence</Button>
      </div>

      <HelpPanel
        title="¿Qué es una secuencia?"
        defaultOpen={sequences.length === 0}
        steps={[
          { label: "Crea una secuencia", description: "Una secuencia es un flujo de emails automatizado (pasos) que recibirán tus leads." },
          { label: "Evergreen vs Nurturing", description: "Evergreen: secuencia finita con pasos definidos. Nurturing: continua, la IA decide cuándo enviar el siguiente email según engagement." },
          { label: "Añade pasos", description: "Cada paso tiene un objetivo (subject, delay, condición). Más adelante podrás definir templates y triggers." },
          { label: "Enroll leads", description: "Asigna leads o prospectos aprobados a la secuencia para que empiecen a recibir emails." },
        ]}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No sequences yet. Create your first one to start sending emails.</p>
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Create Sequence</Button>
          </CardContent>
        </Card>
      ) : (
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
                {seq.goal && <p className="text-sm text-muted-foreground line-clamp-2">{seq.goal}</p>}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{seq._count?.enrollments ?? 0} enrollments</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(seq.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Sequence" description="Create an email sequence to engage your leads.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seq-name">Name</Label>
            <Input id="seq-name" required placeholder="e.g. Welcome Series" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seq-mode">Mode</Label>
            <select id="seq-mode" value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="EVERGREEN">Evergreen (finite steps)</option>
              <option value="NURTURING_INFINITE">Nurturing (continuous)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seq-goal">Goal (optional)</Label>
            <Input id="seq-goal" placeholder="e.g. Convert trial users to paid" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating || !name}>{creating ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
