"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";

const leads = [
  { id: "1", email: "maria.garcia@empresa-a.com", name: "María García", phone: "+34 612 345 678", stage: "NURTURING", intentScore: 65.5, lastEngagement: "2024-01-15", createdAt: "2024-01-10" },
  { id: "2", email: "carlos.lopez@startup-b.io", name: "Carlos López", phone: "+34 623 456 789", stage: "QUALIFIED", intentScore: 78.9, lastEngagement: "2024-01-15", createdAt: "2024-01-08" },
  { id: "3", email: "ana.martinez@corp-c.es", name: "Ana Martínez", stage: "CONVERTED", intentScore: 92.1, lastEngagement: "2024-01-14", createdAt: "2024-01-05" },
  { id: "4", email: "pedro.sanchez@shop-d.com", name: "Pedro Sánchez", phone: "+34 634 567 890", stage: "NEW", intentScore: 45.2, createdAt: "2024-01-15" },
  { id: "5", email: "laura.torres@consult-e.net", name: "Laura Torres", stage: "UNSUBSCRIBED", intentScore: 12.0, lastEngagement: "2024-01-12", createdAt: "2023-12-20" },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<LeadStage | "ALL">("ALL");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "ALL" || lead.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage your leads and their journey</p>
        </div>
        <Button>
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
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Stage</th>
                <th>Intent Score</th>
                <th>Last Engagement</th>
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
                        <div className="h-full bg-accent rounded-full" style={{ width: `${lead.intentScore || 0}%` }} />
                      </div>
                      <span className="text-sm">{Math.round(lead.intentScore || 0)}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{lead.lastEngagement || "Never"}</td>
                  <td className="text-muted-foreground">{lead.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
