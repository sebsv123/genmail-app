"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Building2, User, ExternalLink, CheckSquare, Loader2 } from "lucide-react";

type ProspectStatus = "FOUND" | "VALIDATED" | "APPROVED" | "ENROLLED" | "REPLIED" | "BOUNCED" | "UNSUBSCRIBED";
type ProspectSource = "LINKEDIN" | "GOOGLE_MAPS" | "APOLLO" | "HUNTER" | "DIRECTORY" | "MANUAL" | "RSS" | "WEBSITE";

interface Prospect {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  role?: string | null;
  source: ProspectSource;
  intentScore?: number | null;
  status: ProspectStatus;
  emailVerified?: boolean;
}

const statusVariants: Record<ProspectStatus, string> = {
  FOUND: "secondary",
  VALIDATED: "default",
  APPROVED: "active",
  ENROLLED: "nurturing",
  REPLIED: "converted",
  BOUNCED: "destructive",
  UNSUBSCRIBED: "outline",
};

const sourceIcons: Record<string, string> = {
  LINKEDIN: "🔗",
  GOOGLE_MAPS: "🗺️",
  APOLLO: "🚀",
  HUNTER: "🎯",
  DIRECTORY: "📁",
  MANUAL: "✏️",
  RSS: "📰",
  WEBSITE: "🌐",
};

interface ProspectTableProps {
  icpId: string;
  onChange?: () => void;
}

export function ProspectTable({ icpId, onChange }: ProspectTableProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/icps/${icpId}/prospects`);
      const json = await res.json();
      setProspects(json.data?.prospects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [icpId]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) => {
    const ns = new Set(selected);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setSelected(ns);
  };

  const toggleSelectAll = () => {
    if (selected.size === prospects.length) setSelected(new Set());
    else setSelected(new Set(prospects.map((p) => p.id)));
  };

  const updateStatus = async (id: string, status: ProspectStatus) => {
    const res = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await load();
      onChange?.();
    }
  };

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/prospects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "APPROVED" }),
          })
        )
      );
      setSelected(new Set());
      await load();
      onChange?.();
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Cargando prospectos...</p>;

  if (prospects.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-muted-foreground">No hay prospectos todavía.</p>
        <p className="text-sm text-muted-foreground">Pulsa <span className="font-medium">Hunt</span> en el ICP para buscar prospectos automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size === prospects.length && prospects.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">{selected.size} seleccionados</span>
          </div>
          {selected.size > 0 && (
            <Button size="sm" onClick={handleBulkApprove} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}
              Aprobar {selected.size}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>Contacto</th>
              <th>Empresa</th>
              <th>Fuente</th>
              <th>Score</th>
              <th>Status</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.id} className="hover-row">
                <td className="w-10">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{p.firstName || ""} {p.lastName || ""}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {p.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{p.companyName || "-"}</span>
                    {p.companyWebsite && (
                      <a href={p.companyWebsite} target="_blank" rel="noopener noreferrer" className="ml-1 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {p.role && <p className="text-xs text-muted-foreground">{p.role}</p>}
                </td>
                <td>
                  <div className="flex items-center gap-1 text-sm">
                    <span>{sourceIcons[p.source] || "•"}</span>
                    <span>{p.source.replace("_", " ")}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${(p.intentScore || 0) * 100}%` }} />
                    </div>
                    <span className="text-sm">{Math.round((p.intentScore || 0) * 100)}</span>
                  </div>
                </td>
                <td>
                  <Badge variant={statusVariants[p.status] as any}>{p.status}</Badge>
                </td>
                <td>
                  {p.status === "FOUND" || p.status === "VALIDATED" ? (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, "APPROVED")}>
                      Aprobar
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
