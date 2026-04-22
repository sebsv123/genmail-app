"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Building2, User, ExternalLink, CheckSquare } from "lucide-react";

// Mock prospects data
const mockProspects = [
  {
    id: "1",
    email: "dr.garcia@dentalcare-madrid.es",
    firstName: "Dr. Javier",
    lastName: "García",
    companyName: "Dental Care Madrid",
    companyWebsite: "https://dentalcare-madrid.es",
    role: "Director",
    source: "GOOGLE_MAPS",
    intentScore: 0.75,
    status: "APPROVED",
  },
  {
    id: "2",
    email: "maria@sonrisaperfecta.es",
    firstName: "María",
    lastName: "López",
    companyName: "Sonrisa Perfecta",
    companyWebsite: "https://sonrisaperfecta.es",
    role: "Gerente",
    source: "APOLLO",
    intentScore: 0.62,
    status: "FOUND",
  },
  {
    id: "3",
    email: "antonio@implantespremium.com",
    firstName: "Antonio",
    lastName: "Martínez",
    companyName: "Implantes Premium",
    companyWebsite: "https://implantespremium.com",
    role: "Autónomo",
    source: "HUNTER",
    intentScore: 0.58,
    status: "VALIDATED",
  },
  {
    id: "4",
    email: "laura@sonrisaslindas.es",
    firstName: "Laura",
    lastName: "Fernández",
    companyName: "Sonrisas Lindas",
    companyWebsite: "https://sonrisaslindas.es",
    role: "Directora",
    source: "DIRECTORY",
    intentScore: 0.81,
    status: "ENROLLED",
  },
  {
    id: "5",
    email: "carlos@dentalfresh.es",
    firstName: "Carlos",
    lastName: "Ruiz",
    companyName: "Dental Fresh",
    companyWebsite: "https://dentalfresh.es",
    role: "Gerente",
    source: "MANUAL",
    intentScore: 0.89,
    status: "REPLIED",
  },
];

type ProspectStatus = "FOUND" | "VALIDATED" | "APPROVED" | "ENROLLED" | "REPLIED" | "BOUNCED" | "UNSUBSCRIBED";
type ProspectSource = "LINKEDIN" | "GOOGLE_MAPS" | "APOLLO" | "HUNTER" | "DIRECTORY" | "MANUAL";

const statusColors: Record<ProspectStatus, string> = {
  FOUND: "secondary",
  VALIDATED: "default",
  APPROVED: "active",
  ENROLLED: "nurturing",
  REPLIED: "converted",
  BOUNCED: "destructive",
  UNSUBSCRIBED: "outline",
};

const sourceIcons: Record<ProspectSource, string> = {
  LINKEDIN: "🔗",
  GOOGLE_MAPS: "🗺️",
  APOLLO: "🚀",
  HUNTER: "🎯",
  DIRECTORY: "📁",
  MANUAL: "✏️",
};

interface ProspectTableProps {
  icpId: string;
}

export function ProspectTable({ icpId }: ProspectTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prospects] = useState(mockProspects);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === prospects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map((p) => p.id)));
    }
  };

  const handleApproveSelected = () => {
    // Enroll selected prospects into COLD_OUTREACH sequence
    console.log("Approving prospects:", Array.from(selected));
    setSelected(new Set());
  };

  const approvedProspects = prospects.filter((p) => p.status === "APPROVED");
  const selectedApproved = Array.from(selected).filter((id) =>
    approvedProspects.some((p) => p.id === id)
  );

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size === prospects.length && prospects.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
          </div>
          {selectedApproved.length > 0 && (
            <Button size="sm" onClick={handleApproveSelected}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Enroll {selectedApproved.length} in Sequence
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>Contact</th>
              <th>Company</th>
              <th>Source</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((prospect) => (
              <tr key={prospect.id} className="hover-row">
                <td className="w-10">
                  <Checkbox
                    checked={selected.has(prospect.id)}
                    onCheckedChange={() => toggleSelect(prospect.id)}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {prospect.firstName} {prospect.lastName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {prospect.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{prospect.companyName}</span>
                    {prospect.companyWebsite && (
                      <a
                        href={prospect.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {prospect.role && (
                    <p className="text-xs text-muted-foreground">{prospect.role}</p>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1 text-sm">
                    <span>{sourceIcons[prospect.source as ProspectSource]}</span>
                    <span>{prospect.source.replace("_", " ")}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(prospect.intentScore || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {Math.round((prospect.intentScore || 0) * 100)}
                    </span>
                  </div>
                </td>
                <td>
                  <Badge variant={statusColors[prospect.status as ProspectStatus] as any}>
                    {prospect.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
