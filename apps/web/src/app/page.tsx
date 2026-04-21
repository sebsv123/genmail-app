import { Button } from "@/components/ui/button";
import { Mail, Sparkles, Zap, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">GenMail</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Características
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Iniciar sesión
            </Button>
            <Button size="sm">Comenzar gratis</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            <span>Impulsado por IA</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Email marketing que se{" "}
            <span className="text-primary">escribe solo</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Crea campañas de email irresistibles con la ayuda de la inteligencia artificial. 
            Ahorra tiempo y aumenta tus conversiones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4 mr-2" />
              Prueba gratis por 14 días
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Ver demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-muted-foreground text-lg">
              Herramientas potentes para escalar tu email marketing
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="IA Generativa"
              description="Genera emails persuasivos en segundos con nuestros modelos de IA entrenados para conversiones."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Automatización"
              description="Crea flujos automatizados que nutren leads y recuperan carritos abandonados."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Analytics"
              description="Métricas detalladas en tiempo real. A/B testing integrado para optimizar resultados."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-semibold">GenMail</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 GenMail. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
