"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SequenceAnalytics } from "@/lib/types";

// Mock data
const analytics: SequenceAnalytics[] = [
  {
    sequenceId: "1",
    sequenceName: "Onboarding Evergreen",
    totalSent: 1567,
    openRate: 45.2,
    clickRate: 14.8,
    replyRate: 3.2,
    unsubscribeRate: 0.8,
    bounceRate: 0.3,
  },
  {
    sequenceId: "2",
    sequenceName: "Nurturing Infinito",
    totalSent: 2341,
    openRate: 38.7,
    clickRate: 9.5,
    replyRate: 1.8,
    unsubscribeRate: 1.2,
    bounceRate: 0.4,
  },
  {
    sequenceId: "3",
    sequenceName: "Re-engagement Campaign",
    totalSent: 523,
    openRate: 52.1,
    clickRate: 22.3,
    replyRate: 5.7,
    unsubscribeRate: 2.1,
    bounceRate: 0.8,
  },
];

function MetricCell({ 
  value, 
  benchmark = 0,
  unit = "%",
  reverse = false 
}: { 
  value: number; 
  benchmark?: number;
  unit?: string;
  reverse?: boolean;
}) {
  const diff = value - benchmark;
  const isPositive = reverse ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 0.1;
  
  return (
    <div className="flex items-center gap-1">
      <span className="font-medium">{value}{unit}</span>
      {!isNeutral && (
        <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
        </span>
      )}
      {isNeutral && <Minus className="w-3 h-3 text-muted-foreground" />}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your email campaign performance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45.3%</div>
            <p className="text-xs text-emerald-400">+2.1% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15.5%</div>
            <p className="text-xs text-emerald-400">+0.8% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reply Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.6%</div>
            <p className="text-xs text-amber-400">-0.2% vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unsubscribe Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.4%</div>
            <p className="text-xs text-emerald-400">-0.3% vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance by Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Sequence</th>
                <th>Sent</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
                <th>Reply Rate</th>
                <th>Unsubscribe</th>
                <th>Bounce</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((item) => (
                <tr key={item.sequenceId} className="hover-row">
                  <td className="font-medium">{item.sequenceName}</td>
                  <td className="text-muted-foreground">{item.totalSent.toLocaleString()}</td>
                  <td>
                    <MetricCell value={item.openRate} benchmark={45} />
                  </td>
                  <td>
                    <MetricCell value={item.clickRate} benchmark={15} />
                  </td>
                  <td>
                    <MetricCell value={item.replyRate} benchmark={3} />
                  </td>
                  <td>
                    <MetricCell value={item.unsubscribeRate} benchmark={1.5} reverse />
                  </td>
                  <td>
                    <MetricCell value={item.bounceRate} benchmark={0.5} reverse />
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
