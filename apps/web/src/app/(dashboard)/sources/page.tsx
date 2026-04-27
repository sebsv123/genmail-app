"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Globe, FileText, Mail, RefreshCw, AlertCircle, BookOpen } from "lucide-react";
import { HelpPanel } from "@/components/ui/help-panel";

interface Source {
  id: string;
  type: string;
  name: string;
  url?: string | null;
  status: string;
  createdAt: string;
  lastSyncedAt?: string | null;
  chunksIndexed?: number;
}

const typeIcons: Record<string, any> = { URL: Globe, RSS: RefreshCw, DOCUMENT: FileText, SAMPLE_EMAIL: Mail };

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = { READY: "active", PROCESSING: "secondary", PENDING: "outline", ERROR: "destructive" };
  return <Badge variant={variants[status] as any}>{status}</Badge>;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"URL" | "RSS" | "DOCUMENT" | "SAMPLE_EMAIL">("URL");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sources");
      const json = await res.json();
      setSources(json.sources || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const payload: any = { name, type };
      if (type === "URL" || type === "RSS") payload.url = url;
      if (type === "DOCUMENT" || type === "SAMPLE_EMAIL") payload.content = content;
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create source");
      }
      setShowModal(false);
      setName("");
      setUrl("");
      setContent("");
      setType("URL");
      await loadSources();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const needsUrl = type === "URL" || type === "RSS";
  const needsContent = type === "DOCUMENT" || type === "SAMPLE_EMAIL";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Sources</h1>
          <p className="text-muted-foreground">Manage sources that power your AI-generated emails</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Source</Button>
      </div>

      <HelpPanel
        title="¿Qué son las fuentes de conocimiento?"
        defaultOpen={sources.length === 0}
        steps={[
          { label: "Añade contenido", description: "Sube URLs, RSS feeds, documentos o emails de muestra. Todo se procesa por la IA." },
          { label: "Se fragmenta en chunks", description: "El texto se divide en trozos y se convierte en vectores (embeddings) para búsqueda semántica." },
          { label: "La IA los usa al escribir", description: "Cuando genera un email, busca los chunks más relevantes para personalizar el contenido." },
          { label: "Más fuentes = mejor", description: "Cuanta más información sobre tu producto/servicio, más precisos y personalizados serán los emails." },
        ]}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No knowledge sources yet. Add URLs, RSS feeds or documents to power your AI emails.</p>
            <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add First Source</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const Icon = typeIcons[source.type] || Globe;
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
                          {source.url && <><span>·</span><span className="truncate max-w-xs">{source.url}</span></>}
                          {typeof source.chunksIndexed === "number" && <><span>·</span><span>{source.chunksIndexed} chunks</span></>}
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
                      <span className="text-sm text-muted-foreground">{new Date(source.lastSyncedAt || source.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Knowledge Source" description="Add content that the AI will use as context when writing emails.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="src-type">Type</Label>
            <select id="src-type" value={type} onChange={(e) => setType(e.target.value as any)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="URL">URL (web page)</option>
              <option value="RSS">RSS Feed</option>
              <option value="DOCUMENT">Document (paste text)</option>
              <option value="SAMPLE_EMAIL">Sample Email (paste text)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="src-name">Name</Label>
            <Input id="src-name" required placeholder="e.g. Marketing blog" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {needsUrl && (
            <div className="space-y-2">
              <Label htmlFor="src-url">URL</Label>
              <Input id="src-url" type="url" required placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          )}
          {needsContent && (
            <div className="space-y-2">
              <Label htmlFor="src-content">Content</Label>
              <textarea id="src-content" required rows={6} placeholder="Paste content here..." value={content} onChange={(e) => setContent(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" disabled={creating || !name}>{creating ? "Adding..." : "Add Source"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
