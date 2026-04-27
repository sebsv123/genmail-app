"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter } from "lucide-react";

interface Lead {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  stage: string;
  intentScore?: number | null;
  createdAt: string;
}

const stages = ["NEW", "NURTURING", "QUALIFIED", "CONVERTED", "UNSUBSCRIBED"] as const;
type LeadStage = typeof stages[number];

function StageBadge({ stage }: { stage: LeadStage }) {
  const variants: Record<LeadStage, string> = {
    NEW: "new",
    NURTURING: "nurturing",
    QUALIFIED: "qualified",
    CONVERTED: "converted",
    UNSUBSCRIBED: "unsubscribed",
  };
  return <Badge variant={variants[stage] as any}>{stage}</Badge>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<LeadStage | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", phone: "", stage: "NEW" as LeadStage });

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?stage=${selectedStage}&limit=100`);
      const json = await res.json();
      setLeads(json.data?.leads || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          phone: form.phone || undefined,
          stage: form.stage,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create lead");
      }
      setShowModal(false);
      setForm({ email: "", name: "", phone: "", stage: "NEW" });
      await loadLeads();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    return !q || lead.name.toLowerCase().includes(q) || lead.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage your leads and their journey</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant={selectedStage === "ALL" ? "default" : "outline"} size="sm" onClick={() => setSelectedStage("ALL")}>All</Button>
              {stages.map((stage) => (
                <Button key={stage} variant={selectedStage === stage ? "default" : "outline"} size="sm" onClick={() => setSelectedStage(stage)}>{stage}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {filteredLeads.length} Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No leads yet. Add your first one or run a Hunt to capture leads automatically.</p>
              <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
            </div>
          ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Stage</th>
                <th>Intent Score</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {lead.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="font-medium">{lead.name}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{lead.email}</td>
                  <td><StageBadge stage={lead.stage as LeadStage} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${(lead.intentScore || 0) * 100}%` }} />
                      </div>
                      <span className="text-sm">{Math.round((lead.intentScore || 0) * 100)}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Lead" description="Manually add a lead to your database.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" required placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" type="email" required placeholder="john@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone (optional)</Label>
            <Input id="lead-phone" placeholder="+1 555 1234" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-stage">Stage</Label>
            <select id="lead-stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating || !form.email || !form.name}>{creating ? "Adding..." : "Add Lead"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
