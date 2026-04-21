"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Globe, FileText, Mail, RefreshCw, AlertCircle } from "lucide-react";
import type { KnowledgeSource } from "@/lib/types";

// Mock data
const sources: KnowledgeSource[] = [
  {
    id: "1",
    type: "URL",
    name: "Blog de Marketing",
    url: "https://acme-saas.com/blog",
    status: "READY",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "2",
    type: "DOCUMENT",
    name: "Guía de Email Marketing 2024",
    status: "READY",
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-12"),
  },
  {
    id: "3",
    type: "RSS",
    name: "Industry News Feed",
    url: "https://feeds.industry-news.com/rss",
    status: "PROCESSING",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "4",
    type: "SAMPLE_EMAIL",
    name: "Plantillas CEO",
    content: "Colección de emails del CEO",
    status: "PENDING",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "5",
    type: "URL",
    name: "Documentación API",
    url: "https://docs.acme-saas.com",
    status: "ERROR",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
  },
];

const typeIcons: Record<KnowledgeSource["type"], typeof Globe> = {
  URL: Globe,
  RSS: RefreshCw,
  DOCUMENT: FileText,
  SAMPLE_EMAIL: Mail,
};

function StatusBadge({ status }: { status: KnowledgeSource["status"] }) {
  const variants: Record<KnowledgeSource["status"], "default" | "secondary" | "active" | "destructive" | "outline"> = {
    READY: "active",
    PROCESSING: "secondary",
    PENDING: "outline",
    ERROR: "destructive",
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Sources</h1>
          <p className="text-muted-foreground">Manage sources that power your AI-generated emails</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        {sources.map((source) => {
          const Icon = typeIcons[source.type];
          
          return (
            <Card key={source.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{source.type}</span>
                        {source.url && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-xs">{source.url}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {source.status === "ERROR" && (
                      <div className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Sync failed</span>
                      </div>
                    )}
                    <StatusBadge status={source.status} />
                    <span className="text-sm text-muted-foreground">
                      Updated {new Date(source.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
