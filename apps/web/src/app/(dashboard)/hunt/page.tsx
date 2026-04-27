"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpPanel } from "@/components/ui/help-panel";
import { Plus, Search, Target, Users, CheckCircle, MessageCircle, Crosshair, Loader2, Trash2 } from "lucide-react";
import { ICPForm, ICPFormData } from "./components/icp-form";
import { ProspectTable } from "./components/prospect-table";

interface ICP {
  id: string;
  sector: string;
  targetRole: string;
  companySize?: string | null;
  location?: string | null;
  isActive: boolean;
  stats: { found: number; validated: number; approved: number; enrolled: number; replied: number };
}

export default function HuntPage() {
  const [icps, setICPs] = useState<ICP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedICP, setSelectedICP] = useState<string | null>(null);
  const [hunting, setHunting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadICPs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/icps");
      const json = await res.json();
      setICPs(json.data?.icps || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadICPs(); }, [loadICPs]);

  const handleCreate = async (data: ICPFormData) => {
    const res = await fetch("/api/icps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowForm(false);
      await loadICPs();
      setToast("ICP creado. Pulsa 'Hunt' para buscar prospectos.");
      setTimeout(() => setToast(null), 4000);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Error creando ICP");
    }
  };

  const handleHunt = async (icpId: string) => {
    setHunting(icpId);
    try {
      const res = await fetch(`/api/icps/${icpId}/hunt`, { method: "POST" });
      const j = await res.json();
      if (res.ok) {
        setToast(j.data?.message || "Hunt en marcha");
        setTimeout(() => { loadICPs(); setToast(null); }, 4000);
      } else {
        alert(j.error || "No se pudo lanzar el hunt");
      }
    } finally {
      setHunting(null);
    }
  };

  const handleDelete = async (icpId: string) => {
    if (!confirm("¿Eliminar este ICP? Sus prospectos también se borrarán.")) return;
    const res = await fetch(`/api/icps/${icpId}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedICP === icpId) setSelectedICP(null);
      loadICPs();
    }
  };

  const activeICPs = icps.filter((icp) => icp.isActive);
  const totalFound = icps.reduce((sum, icp) => sum + icp.stats.found, 0);
  const totalApproved = icps.reduce((sum, icp) => sum + icp.stats.approved, 0);
  const totalReplied = icps.reduce((sum, icp) => sum + icp.stats.replied, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Crosshair className="h-6 w-6" />
            Lead Hunter
          </h1>
          <p className="text-muted-foreground">Encuentra prospectos automáticamente y conviértelos en leads</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo ICP
        </Button>
      </div>

      <HelpPanel
        title="¿Cómo funciona Lead Hunter?"
        defaultOpen={icps.length === 0}
        steps={[
          { label: "Crea un ICP", description: "Define tu cliente ideal: sector, rol objetivo, ubicación, palabras clave y dolores. Cuanto más específico, mejor." },
          { label: "Lanza un Hunt", description: "Pulsa 'Hunt' y el sistema buscará en Google Maps, Apollo, Hunter, directorios y RSS para encontrar prospectos que encajen." },
          { label: "Revisa y aprueba", description: "Los prospectos aparecen como FOUND/VALIDATED. Selecciona los que te interesen y márcalos como APPROVED." },
          { label: "Inscríbelos en una secuencia", description: "Los aprobados pasan automáticamente a tus secuencias de cold outreach y reciben emails personalizados." },
          { label: "Mide resultados", description: "Replied = respuestas reales. Ajusta tu ICP en función de los que mejor convierten." },
        ]}
      />

      {toast && (
        <div className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent">{toast}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ICPs activos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeICPs.length}</div>
            <p className="text-xs text-muted-foreground">{icps.length} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospectos encontrados</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFound}</div>
            <p className="text-xs text-muted-foreground">en todos los ICPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{totalApproved}</div>
            <p className="text-xs text-muted-foreground">listos para enrolar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respuestas</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{totalReplied}</div>
            <p className="text-xs text-muted-foreground">de prospectos enrolados</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Tus Ideal Customer Profiles
        </h2>

        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : icps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Crosshair className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">Aún no tienes ningún ICP</p>
              <p className="text-sm text-muted-foreground">Crea uno para empezar a capturar leads automáticamente.</p>
              <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Crear mi primer ICP</Button>
            </CardContent>
          </Card>
        ) : (
          icps.map((icp) => (
            <Card
              key={icp.id}
              className={`cursor-pointer transition-colors ${selectedICP === icp.id ? "border-accent" : ""} ${!icp.isActive ? "opacity-60" : ""}`}
              onClick={() => setSelectedICP(icp.id === selectedICP ? null : icp.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{icp.sector}</CardTitle>
                      {icp.isActive ? <Badge variant="active">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rol: {icp.targetRole}
                      {icp.companySize && ` · ${icp.companySize} empleados`}
                      {icp.location && ` · ${icp.location}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={hunting === icp.id || !icp.isActive}
                      onClick={(e) => { e.stopPropagation(); handleHunt(icp.id); }}
                    >
                      {hunting === icp.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                      Hunt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(icp.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <Stat label="Found" value={icp.stats.found} />
                  <Stat label="Validated" value={icp.stats.validated} color="text-blue-500" />
                  <Stat label="Approved" value={icp.stats.approved} color="text-emerald-500" />
                  <Stat label="Enrolled" value={icp.stats.enrolled} color="text-purple-500" />
                  <Stat label="Replied" value={icp.stats.replied} color="text-amber-500" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedICP && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Prospectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProspectTable icpId={selectedICP} onChange={loadICPs} />
          </CardContent>
        </Card>
      )}

      {showForm && <ICPForm onClose={() => setShowForm(false)} onSubmit={handleCreate} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className={`font-semibold ${color || "text-muted-foreground"}`}>{label}</p>
      <p className={`text-lg font-bold ${color || ""}`}>{value}</p>
    </div>
  );
}
