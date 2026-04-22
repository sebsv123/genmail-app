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

  const handleComplete = async () => {
    // Mark onboarding as completed
    router.push("/dashboard");
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

  const renderStep3 = () => (
    <div className="space-y-6">
      <p className="text-muted-foreground">Elige una fuente de conocimiento para empezar:</p>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-accent transition-colors">
          <CardContent className="p-6 text-center space-y-3">
            <Rss className="h-8 w-8 mx-auto text-accent" />
            <p className="font-medium">RSS Feed</p>
            <p className="text-xs text-muted-foreground">Blog o noticias</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-accent transition-colors">
          <CardContent className="p-6 text-center space-y-3">
            <Link2 className="h-8 w-8 mx-auto text-accent" />
            <p className="font-medium">URL de web</p>
            <p className="text-xs text-muted-foreground">Página corporativa</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-accent transition-colors">
          <CardContent className="p-6 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-accent" />
            <p className="font-medium">Subir documento</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, etc.</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-accent transition-colors">
          <CardContent className="p-6 text-center space-y-3">
            <Mail className="h-8 w-8 mx-auto text-accent" />
            <p className="font-medium">Email de muestra</p>
            <p className="text-xs text-muted-foreground">Pegar texto</p>
          </CardContent>
        </Card>
      </div>

      <Button variant="ghost" className="w-full" onClick={handleComplete}>
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
              >
                {step === 3 ? "Completar" : "Siguiente"}
                {step !== 3 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
