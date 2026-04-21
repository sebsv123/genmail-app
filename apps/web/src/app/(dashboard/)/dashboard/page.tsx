"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Mail, 
  TrendingUp, 
  Zap,
  ArrowUpRight,
  Clock
} from "lucide-react";
import type { DashboardMetrics, RecentEmail } from "@/lib/types";

// Mock data
const metrics: DashboardMetrics = {
  totalLeads: 1247,
  emailsSent: 8432,
  avgOpenRate: 42.3,
  avgClickRate: 12.8,
  activeSequences: 8,
  leadsThisMonth: 156,
};

const recentEmails: RecentEmail[] = [
  {
    id: "1",
    leadName: "María García",
    leadEmail: "maria@empresa.com",
    subject: "Descubre cómo potenciar tu negocio",
    status: "SENT",
    qualityScore: 0.87,
    sentAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "2",
    leadName: "Carlos López",
    leadEmail: "carlos@startup.io",
    subject: "El problema que la mayoría ignora",
    status: "OPENED",
    qualityScore: 0.92,
    sentAt: new Date("2024-01-15T09:15:00"),
  },
  {
    id: "3",
    leadName: "Ana Martínez",
    leadEmail: "ana@corp.es",
    subject: "Antes y después: 3 negocios transformados",
    status: "CLICKED",
    qualityScore: 0.85,
    sentAt: new Date("2024-01-15T08:45:00"),
  },
  {
    id: "4",
    leadName: "Pedro Sánchez",
    leadEmail: "pedro@shop.com",
    subject: "Bienvenido a tu prueba gratuita",
    status: "PENDING_REVIEW",
    qualityScore: 0.78,
    sentAt: new Date("2024-01-15T08:00:00"),
  },
  {
    id: "5",
    leadName: "Laura Torres",
    leadEmail: "laura@consult.net",
    subject: "¿Todavía interesada en escalar?",
    status: "DRAFT",
    qualityScore: 0.81,
  },
];

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "active" | "nurturing" | "outline"> = {
    SENT: "secondary",
    OPENED: "active",
    CLICKED: "active",
    PENDING_REVIEW: "nurturing",
    DRAFT: "outline",
  };
  return <Badge variant={variants[status] || "default"}>{status}</Badge>;
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your email marketing performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.leadsThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.emailsSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgOpenRate}%</div>
            <p className="text-xs text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +2.4% vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSequences}</div>
            <p className="text-xs text-muted-foreground">
              Running now
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Emails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Quality</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {recentEmails.map((email) => (
                <tr key={email.id} className="hover-row">
                  <td>
                    <div>
                      <p className="font-medium">{email.leadName}</p>
                      <p className="text-xs text-muted-foreground">{email.leadEmail}</p>
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{email.subject}</td>
                  <td>
                    <StatusBadge status={email.status} />
                  </td>
                  <td>
                    <span className={email.qualityScore >= 0.8 ? "text-emerald-400" : "text-amber-400"}>
                      {Math.round(email.qualityScore * 100)}%
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    {email.sentAt 
                      ? new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "-"
                    }
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
