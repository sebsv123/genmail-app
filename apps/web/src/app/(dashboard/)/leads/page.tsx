"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import type { Lead, LeadStage } from "@/lib/types";

// Mock data
const leads: Lead[] = [
  {
    id: "1",
    email: "maria.garcia@empresa-a.com",
    name: "María García",
    phone: "+34 612 345 678",
    stage: "NURTURING",
    intentScore: 65.5,
    lastEngagement: new Date("2024-01-15T10:30:00"),
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    email: "carlos.lopez@startup-b.io",
    name: "Carlos López",
    phone: "+34 623 456 789",
    stage: "QUALIFIED",
    intentScore: 78.9,
    lastEngagement: new Date("2024-01-15T09:15:00"),
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "3",
    email: "ana.martinez@corp-c.es",
    name: "Ana Martínez",
    stage: "CONVERTED",
    intentScore: 92.1,
    lastEngagement: new Date("2024-01-14T16:45:00"),
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "4",
    email: "pedro.sanchez@shop-d.com",
    name: "Pedro Sánchez",
    phone: "+34 634 567 890",
    stage: "NEW",
    intentScore: 45.2,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "5",
    email: "laura.torres@consult-e.net",
    name: "Laura Torres",
    stage: "UNSUBSCRIBED",
    intentScore: 12.0,
    lastEngagement: new Date("2024-01-12T11:20:00"),
    createdAt: new Date("2023-12-20"),
    updatedAt: new Date("2024-01-12"),
  },
];

const stages: LeadStage[] = ["NEW", "NURTURING", "QUALIFIED", "CONVERTED", "UNSUBSCRIBED"];

function StageBadge({ stage }: { stage: LeadStage }) {
  const variants: Record<LeadStage, "new" | "nurturing" | "qualified" | "converted" | "unsubscribed"> = {
    NEW: "new",
    NURTURING: "nurturing",
    QUALIFIED: "qualified",
    CONVERTED: "converted",
    UNSUBSCRIBED: "unsubscribed",
  };
  return <Badge variant={variants[stage]}>{stage}</Badge>;
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<LeadStage | "ALL">("ALL");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "ALL" || lead.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStage === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStage("ALL")}
              >
                All
              </Button>
              {stages.map((stage) => (
                <Button
                  key={stage}
                  variant={selectedStage === stage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStage(stage)}
                >
                  {stage}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
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
                  <td>
                    <StageBadge stage={lead.stage} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${lead.intentScore || 0}%` }}
                        />
                      </div>
                      <span className="text-sm">{Math.round(lead.intentScore || 0)}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground">
                    {lead.lastEngagement 
                      ? new Date(lead.lastEngagement).toLocaleDateString()
                      : "Never"
                    }
                  </td>
                  <td className="text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
