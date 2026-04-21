"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save } from "lucide-react";

// Mock business data
const initialBusiness = {
  name: "Acme SaaS Demo",
  sector: "Software as a Service",
  brandVoice: `Ton: Profesional pero cercano. Somos expertos pero no arrogantes.

Estilo: Frases cortas y directas. Evitar jerga técnica innecesaria.

Vocabulario: Usar "tú" en lugar de "usted". Palabras positivas: potenciar, crecer, optimizar.

Evitar: "solución integral", "sinergias", "paradigmas disruptivos".

Personalidad: Como un consultor experimentado que guía sin imponer.`,
  prohibitedClaims: [
    "Mejores resultados garantizados",
    "100% efectivo",
    "Sin riesgo",
    "Único en el mercado"
  ],
};

export default function SettingsPage() {
  const [business, setBusiness] = useState(initialBusiness);
  const [newClaim, setNewClaim] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddClaim = () => {
    if (newClaim.trim() && !business.prohibitedClaims.includes(newClaim.trim())) {
      setBusiness({
        ...business,
        prohibitedClaims: [...business.prohibitedClaims, newClaim.trim()]
      });
      setNewClaim("");
    }
  };

  const handleRemoveClaim = (claim: string) => {
    setBusiness({
      ...business,
      prohibitedClaims: business.prohibitedClaims.filter(c => c !== claim)
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure your business and brand voice</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Basic details about your company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector / Industry</Label>
              <Input
                id="sector"
                value={business.sector}
                onChange={(e) => setBusiness({ ...business, sector: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Voice */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Voice</CardTitle>
          <CardDescription>Define how your brand communicates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brandVoice">Brand Voice Description</Label>
            <textarea
              id="brandVoice"
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={business.brandVoice}
              onChange={(e) => setBusiness({ ...business, brandVoice: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prohibited Claims */}
      <Card>
        <CardHeader>
          <CardTitle>Prohibited Claims</CardTitle>
          <CardDescription>Words and phrases the AI should never use</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {business.prohibitedClaims.map((claim) => (
              <Badge key={claim} variant="secondary" className="px-3 py-1">
                {claim}
                <button
                  onClick={() => handleRemoveClaim(claim)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a prohibited claim..."
              value={newClaim}
              onChange={(e) => setNewClaim(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddClaim()}
            />
            <Button variant="outline" onClick={handleAddClaim}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
