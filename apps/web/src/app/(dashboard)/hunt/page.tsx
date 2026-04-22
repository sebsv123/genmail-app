"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Target, Users, CheckCircle, MessageCircle, Crosshair } from "lucide-react";
import { ICPForm } from "./components/icp-form";
import { ProspectTable } from "./components/prospect-table";

// Mock ICPs
const mockICPs = [
  {
    id: "1",
    sector: "Clínicas dentales Madrid",
    targetRole: "Director",
    location: "Madrid, España",
    isActive: true,
    stats: {
      found: 147,
      validated: 134,
      approved: 89,
      enrolled: 67,
      replied: 12,
    },
  },
  {
    id: "2",
    sector: "Agencias marketing Barcelona",
    targetRole: "CEO",
    location: "Barcelona, España",
    isActive: true,
    stats: {
      found: 83,
      validated: 78,
      approved: 45,
      enrolled: 32,
      replied: 8,
    },
  },
  {
    id: "3",
    sector: "Consultoras IT España",
    targetRole: "Partner",
    companySize: "10-50",
    isActive: false,
    stats: {
      found: 234,
      validated: 198,
      approved: 0,
      enrolled: 0,
      replied: 0,
    },
  },
];

function ICPStatsCard({ stats }: { stats: typeof mockICPs[0]["stats"] }) {
  return (
    <div className="grid grid-cols-5 gap-2 text-center text-xs">
      <div>
        <p className="font-semibold text-muted-foreground">Found</p>
        <p className="text-lg font-bold">{stats.found}</p>
      </div>
      <div>
        <p className="font-semibold text-blue-400">Validated</p>
        <p className="text-lg font-bold text-blue-400">{stats.validated}</p>
      </div>
      <div>
        <p className="font-semibold text-emerald-400">Approved</p>
        <p className="text-lg font-bold text-emerald-400">{stats.approved}</p>
      </div>
      <div>
        <p className="font-semibold text-purple-400">Enrolled</p>
        <p className="text-lg font-bold text-purple-400">{stats.enrolled}</p>
      </div>
      <div>
        <p className="font-semibold text-amber-400">Replied</p>
        <p className="text-lg font-bold text-amber-400">{stats.replied}</p>
      </div>
    </div>
  );
}

export default function HuntPage() {
  const [icps, setICPs] = useState(mockICPs);
  const [showForm, setShowForm] = useState(false);
  const [selectedICP, setSelectedICP] = useState<string | null>(null);

  const activeICPs = icps.filter((icp) => icp.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Crosshair className="h-6 w-6" />
            Lead Hunter
          </h1>
          <p className="text-muted-foreground">Automated prospect discovery and cold outreach</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New ICP
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active ICPs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeICPs.length}</div>
            <p className="text-xs text-muted-foreground">{icps.length} total ICPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects Found</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {icps.reduce((sum, icp) => sum + icp.stats.found, 0)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {icps.reduce((sum, icp) => sum + icp.stats.approved, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Ready to enroll</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replies</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {icps.reduce((sum, icp) => sum + icp.stats.replied, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Response rate: 17.9%</p>
          </CardContent>
        </Card>
      </div>

      {/* ICP Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Ideal Customer Profiles
        </h2>

        {icps.map((icp) => (
          <Card
            key={icp.id}
            className={`cursor-pointer transition-colors ${
              selectedICP === icp.id ? "border-accent" : ""
            } ${!icp.isActive ? "opacity-60" : ""}`}
            onClick={() => setSelectedICP(icp.id === selectedICP ? null : icp.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{icp.sector}</CardTitle>
                    {icp.isActive ? (
                      <Badge variant="active">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Target: {icp.targetRole}
                    {icp.companySize && ` · ${icp.companySize} employees`}
                    {icp.location && ` · ${icp.location}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Trigger hunt
                    }}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Hunt
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ICPStatsCard stats={icp.stats} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prospect Table */}
      {selectedICP && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Prospects Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProspectTable icpId={selectedICP} />
          </CardContent>
        </Card>
      )}

      {/* ICP Form Modal */}
      {showForm && (
        <ICPForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
