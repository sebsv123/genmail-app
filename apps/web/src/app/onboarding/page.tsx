"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Palette, 
  Link2, 
  FileText, 
  Mail, 
  Rss,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Sparkles
} from "lucide-react";

const sectors = [
  "Seguros",
  "Inmobiliaria", 
  "Consultoría",
  "Salud",
  "Educación",
  "Ecommerce",
  "SaaS",
  "Otro"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [prohibitedClaims, setProhibitedClaims] = useState<string[]>([]);
  const [newClaim, setNewClaim] = useState("");

  const addProhibitedClaim = () => {
    if (newClaim.trim() && !prohibitedClaims.includes(newClaim.trim())) {
      setProhibitedClaims([...prohibitedClaims, newClaim.trim()]);
      setNewClaim("");
    }
  };

  const removeProhibitedClaim = (claim: string) => {
    setProhibitedClaims(prohibitedClaims.filter((c) => c !== claim));
  };

  const [submitting, setSubmitting] = useState(false);
  const [sourceType, setSourceType] = useState<"RSS" | "URL" | "DOCUMENT" | "SAMPLE_EMAIL" | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);

  const createSourceIfAny = async (): Promise<boolean> => {
    if (!sourceType) return true; // skip
    const needsUrl = sourceType === "RSS" || sourceType === "URL";
    const needsContent = sourceType === "DOCUMENT" || sourceType === "SAMPLE_EMAIL";
    if (!sourceName.trim()) {
      setStepError("Pon un nombre a la fuente");
      return false;
    }
    if (needsUrl && !sourceUrl.trim()) {
      setStepError("Necesitas indicar la URL");
      return false;
    }
    if (needsContent && !sourceContent.trim()) {
      setStepError("Pega el contenido o texto del email");
      return false;
    }
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sourceName.trim(),
        type: sourceType,
        url: needsUrl ? sourceUrl.trim() : undefined,
        content: needsContent ? sourceContent.trim() : undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setStepError(j.error || "No se pudo crear la fuente");
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (submitting) return;
    setStepError(null);
    if (!businessName || !sector) {
      alert("Necesitamos al menos el nombre del negocio y el sector");
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          sector,
          brandVoice,
          prohibitedClaims,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error al guardar onboarding");
        return;
      }
      // Optionally create the knowledge source
      const ok = await createSourceIfAny();
      if (!ok) {
        setSubmitting(false);
        return;
      }
      // Force a full reload so NextAuth picks up the updated session
      window.location.href = "/dashboard";
    } catch (e) {
      console.error(e);
      alert("Error de red al guardar onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="businessName">Nombre del negocio</Label>
        <Input
          id="businessName"
          placeholder="Acme Inc."
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Sector</Label>
        <div className="flex flex-wrap gap-2">
          {sectors.map((s) => (
            <Badge
              key={s}
              variant={sector === s ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSector(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Ubicación (opcional)</Label>
        <Input
          id="location"
          placeholder="Madrid, España"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="brandVoice">Describe cómo quieres que suenen tus emails</Label>
        <textarea
          id="brandVoice"
          className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm"
          placeholder="Ej: Profesional pero cercano. Evitar jerga técnica. Usar ejemplos concretos. Tono consultivo, no agresivo."
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>¿Qué NO debes decir nunca?</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Ej: 'Garantizado 100%'"
            value={newClaim}
            onChange={(e) => setNewClaim(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProhibitedClaim())}
          />
          <Button type="button" variant="outline" onClick={addProhibitedClaim}>
            Añadir
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {prohibitedClaims.map((claim) => (
            <Badge key={claim} variant="secondary" className="flex items-center gap-1">
              {claim}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeProhibitedClaim(claim)} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  const sourceOptions = [
    { type: "RSS" as const, icon: Rss, title: "RSS Feed", subtitle: "Blog o noticias" },
    { type: "URL" as const, icon: Link2, title: "URL de web", subtitle: "Página corporativa" },
    { type: "DOCUMENT" as const, icon: FileText, title: "Documento", subtitle: "Pega el texto" },
    { type: "SAMPLE_EMAIL" as const, icon: Mail, title: "Email de muestra", subtitle: "Pegar texto" },
  ];

  const renderStep3 = () => (
    <div className="space-y-6">
      <p className="text-muted-foreground">Elige una fuente de conocimiento (opcional):</p>

      <div className="grid grid-cols-2 gap-4">
        {sourceOptions.map(({ type, icon: Icon, title, subtitle }) => (
          <Card
            key={type}
            className={`cursor-pointer transition-colors ${sourceType === type ? "border-accent ring-2 ring-accent" : "hover:border-accent"}`}
            onClick={() => { setSourceType(type); setStepError(null); }}
          >
            <CardContent className="p-6 text-center space-y-3">
              <Icon className="h-8 w-8 mx-auto text-accent" />
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {sourceType && (
        <div className="space-y-4 p-4 rounded-lg border bg-secondary/30">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Configurar {sourceOptions.find((s) => s.type === sourceType)?.title}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSourceType(null); setStepError(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="src-name">Nombre</Label>
            <Input id="src-name" placeholder="Ej: Blog corporativo" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
          </div>
          {(sourceType === "RSS" || sourceType === "URL") && (
            <div className="space-y-2">
              <Label htmlFor="src-url">URL</Label>
              <Input id="src-url" type="url" placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </div>
          )}
          {(sourceType === "DOCUMENT" || sourceType === "SAMPLE_EMAIL") && (
            <div className="space-y-2">
              <Label htmlFor="src-content">Contenido</Label>
              <textarea
                id="src-content"
                className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
                placeholder={sourceType === "SAMPLE_EMAIL" ? "Pega aquí un email de ejemplo..." : "Pega aquí el texto del documento..."}
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {stepError && <p className="text-sm text-destructive">{stepError}</p>}

      <Button variant="ghost" className="w-full" onClick={() => { setSourceType(null); handleComplete(); }} disabled={submitting}>
        Lo haré después
      </Button>
    </div>
  );

  const steps = [
    { number: 1, title: "Tu negocio", icon: Building2 },
    { number: 2, title: "Tu voz de marca", icon: Palette },
    { number: 3, title: "Conecta fuentes", icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                  step >= s.number ? "bg-accent text-accent-foreground" : "bg-secondary"
                }`}
              >
                {step > s.number ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-accent-foreground" />
            </div>
            <CardTitle>
              {step === 1 && "Configura tu negocio"}
              {step === 2 && "Define tu voz de marca"}
              {step === 3 && "Conecta tus fuentes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <Button
                onClick={() => {
                  if (step === 3) {
                    handleComplete();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={submitting}
              >
                {step === 3 ? (submitting ? "Guardando..." : "Completar") : "Siguiente"}
                {step !== 3 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
