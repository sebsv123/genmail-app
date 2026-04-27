"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HelpPanel } from "@/components/ui/help-panel";
import { Loader2, Save, Building2, Key, Sparkles } from "lucide-react";

interface Business {
  id: string;
  name: string;
  sector: string;
  brandVoice?: string;
  prohibitedClaims: string[];
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => setBusiness(j.data?.business || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: business.name,
          sector: business.sector,
          brandVoice: business.brandVoice,
          prohibitedClaims: business.prohibitedClaims,
        }),
      });
      if (res.ok) setSaved(true);
      else alert("Error guardando");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Datos de tu negocio y preferencias</p>
      </div>

      <HelpPanel
        title="¿Qué configuro aquí?"
        defaultOpen={false}
        steps={[
          { label: "Nombre del negocio", description: "Aparece en la firma de los emails y en las notificaciones." },
          { label: "Sector", description: "Ayuda a la IA a usar el vocabulario correcto para tu industria." },
          { label: "Brand Voice", description: "Describe el tono deseado. Ej: 'profesional pero cercano, evitar jerga técnica'." },
          { label: "Claims prohibidos", description: "Frases que la IA nunca debe usar (ej: 'garantizado 100%')." },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tu negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="biz-name">Nombre</Label>
            <Input
              id="biz-name"
              value={business?.name || ""}
              onChange={(e) => setBusiness((b) => b ? { ...b, name: e.target.value } : null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-sector">Sector</Label>
            <Input
              id="biz-sector"
              value={business?.sector || ""}
              onChange={(e) => setBusiness((b) => b ? { ...b, sector: e.target.value } : null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-voice">Brand Voice</Label>
            <textarea
              id="biz-voice"
              className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
              value={business?.brandVoice || ""}
              onChange={(e) => setBusiness((b) => b ? { ...b, brandVoice: e.target.value } : null)}
              placeholder="Ej: Profesional pero cercano. Evitar jerga técnica."
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
          {saved && <Badge variant="active">Guardado</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys (solo lectura)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Las API keys se configuran en el archivo <code>.env</code> del servidor:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>OPENAI_API_KEY</code> — Para generación de emails</li>
            <li><code>GROQ_API_KEY</code> — Fallback de LLM</li>
            <li><code>XAI_API_KEY</code> — Otro fallback de LLM</li>
            <li><code>RESEND_API_KEY</code> — Para envío de emails</li>
            <li><code>APOLLO_API_KEY</code> / <code>HUNTER_API_KEY</code> — Para Lead Hunter</li>
          </ul>
          <p className="pt-2">Reinicia el servidor tras modificar <code>.env</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
