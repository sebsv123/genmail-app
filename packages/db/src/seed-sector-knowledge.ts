/**
 * SECTOR KNOWLEDGE BASE SEED SCRIPT
 * Fuentes: Mailchimp 2024, HubSpot 2024, Campaign Monitor 2024
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SECTORS = ["seguros", "inmobiliaria", "salud", "educacion", "ecommerce", "saas", "consultoria", "legal", "hosteleria", "automocion"] as const;

const BENCHMARKS: Record<string, any> = {
  seguros: { avgOpenRate: 0.28, avgClickRate: 0.035, avgReplyRate: 0.008, bestDayOfWeek: "martes", bestHourRange: "10-12", avgEmailLength: "medio", bestFrameworks: ["PAS", "PASTOR"], source: "Mailchimp 2024 + HubSpot" },
  inmobiliaria: { avgOpenRate: 0.24, avgClickRate: 0.042, avgReplyRate: 0.012, bestDayOfWeek: "miercoles", bestHourRange: "9-11", avgEmailLength: "largo", bestFrameworks: ["AIDA", "FAB"], source: "Campaign Monitor 2024" },
  salud: { avgOpenRate: 0.32, avgClickRate: 0.045, avgReplyRate: 0.015, bestDayOfWeek: "martes", bestHourRange: "14-16", avgEmailLength: "medio", bestFrameworks: ["PAS", "PASTOR"], source: "HubSpot 2024 Healthcare" },
  educacion: { avgOpenRate: 0.30, avgClickRate: 0.038, avgReplyRate: 0.010, bestDayOfWeek: "jueves", bestHourRange: "10-12", avgEmailLength: "largo", bestFrameworks: ["AIDA", "QUEST"], source: "Mailchimp 2024" },
  ecommerce: { avgOpenRate: 0.22, avgClickRate: 0.028, avgReplyRate: 0.005, bestDayOfWeek: "viernes", bestHourRange: "18-20", avgEmailLength: "corto", bestFrameworks: ["AIDA", "4P"], source: "Campaign Monitor 2024" },
  saas: { avgOpenRate: 0.26, avgClickRate: 0.035, avgReplyRate: 0.009, bestDayOfWeek: "martes", bestHourRange: "9-11", avgEmailLength: "medio", bestFrameworks: ["PAS", "AIDA"], source: "HubSpot 2024 SaaS" },
  consultoria: { avgOpenRate: 0.25, avgClickRate: 0.030, avgReplyRate: 0.011, bestDayOfWeek: "miercoles", bestHourRange: "11-13", avgEmailLength: "largo", bestFrameworks: ["PASTOR", "AIDA"], source: "Mailchimp 2024" },
  legal: { avgOpenRate: 0.27, avgClickRate: 0.032, avgReplyRate: 0.013, bestDayOfWeek: "martes", bestHourRange: "10-12", avgEmailLength: "largo", bestFrameworks: ["PAS", "PASTOR"], source: "HubSpot 2024" },
  hosteleria: { avgOpenRate: 0.23, avgClickRate: 0.040, avgReplyRate: 0.014, bestDayOfWeek: "jueves", bestHourRange: "11-13", avgEmailLength: "corto", bestFrameworks: ["AIDA", "BAB"], source: "Campaign Monitor 2024" },
  automocion: { avgOpenRate: 0.21, avgClickRate: 0.025, avgReplyRate: 0.006, bestDayOfWeek: "sabado", bestHourRange: "10-12", avgEmailLength: "medio", bestFrameworks: ["AIDA", "FAB"], source: "Mailchimp 2024" },
};

async function seedBenchmarks() {
  console.log("Seeding SectorBenchmarks...");
  for (const sector of SECTORS) {
    const b = BENCHMARKS[sector];
    await prisma.sectorBenchmark.upsert({
      where: { sector },
      update: b,
      create: { sector, ...b },
    });
  }
  console.log("✓ Benchmarks seeded");
}

async function seedVocabulary() {
  console.log("Seeding SectorVocabulary...");
  const vocabularies = [
    { sector: "seguros", type: "PROHIBITED", words: ["garantizado al 100%", "sin letra pequeña", "gratuito", "cura"], reason: "Promesas absolutas no cumplibles legalmente" },
    { sector: "seguros", type: "PREFERRED", words: ["protección", "tranquilidad", "respaldo", "cobertura"], reason: "Valor emocional sin promesas excesivas" },
    { sector: "seguros", type: "POWER_WORDS", words: ["protege", "asegura", "sin preocupaciones", "en manos expertas"], reason: "Generan confianza inmediata" },
    { sector: "inmobiliaria", type: "PROHIBITED", words: ["precio increíble", "oferta única", "imperdible", "chollo"], reason: "Desprestigian profesionalidad" },
    { sector: "inmobiliaria", type: "PREFERRED", words: ["inversión", "valor", "potencial", "ubicación privilegiada"], reason: "Posicionan como valor añadido" },
    { sector: "salud", type: "PROHIBITED", words: ["cura", "elimina", "100% efectivo", "milagroso"], reason: "Requieren evidencia científica" },
    { sector: "salud", type: "PREFERRED", words: ["bienestar", "calidad de vida", "cuidado personalizado"], reason: "Enfatizan cuidado continuo" },
    { sector: "saas", type: "PROHIBITED", words: ["sin configuración", "nunca falla", "100% uptime"], reason: "Promesas técnicas imposibles" },
    { sector: "saas", type: "POWER_WORDS", words: ["automatiza", "optimiza", "escala", "ROI comprobado"], reason: "Resultados tangibles" },
  ];

  for (const v of vocabularies) {
    await prisma.sectorVocabulary.create({ data: v });
  }
  console.log("✓ Vocabulary seeded");
}

async function seedInsights() {
  console.log("Seeding SectorInsights...");
  const insights = [
    { sector: "seguros", insightType: "PAIN_POINT", title: "Miedo a gastos médicos imprevistos", description: "Principal preocupación es enfrentar gastos que desequilibren finanzas", examples: ["¿Y si me pasa algo y no puedo pagar?"], weight: 0.95 },
    { sector: "seguros", insightType: "TRIGGER", title: "Nacimiento de hijo o enfermedad familiar", description: "Eventos vitales que despiertan conciencia de protección", examples: ["Acabamos de tener un bebé"], weight: 0.90 },
    { sector: "seguros", insightType: "OBJECTION", title: "Ya tengo seguro con el banco", description: "Cliente cree estar cubierto pero suele tener coberturas inadecuadas", examples: ["Entiendo, muchos venían del banco y pagaban el doble"], weight: 0.85 },
    { sector: "inmobiliaria", insightType: "PAIN_POINT", title: "Incertidumbre sobre timing de mercado", description: "Temen perder dinero por no acertar momento", examples: ["¿Bajarán más los precios?"], weight: 0.90 },
    { sector: "salud", insightType: "PAIN_POINT", title: "Tiempo de espera en sanidad pública", description: "Frustración por listas de espera", examples: ["Me han dado cita en 6 meses"], weight: 0.95 },
    { sector: "saas", insightType: "PAIN_POINT", title: "Herramientas complejas o no escalables", description: "Frustración con software actual", examples: ["Estamos en Excel y ya no da más"], weight: 0.90 },
  ];

  for (const i of insights) {
    await prisma.sectorInsight.create({ data: i as any });
  }
  console.log("✓ Insights seeded");
}

async function seedTemplates() {
  console.log("Seeding SectorTemplates...");
  const templates = [
    { sector: "seguros", name: "Protección Familiar Cold", sequenceMode: "COLD_OUTREACH", stepNumber: 1, goal: "Despertar conciencia de protección", subject: "¿Su familia está realmente protegida?", bodyText: "Hola {{name}}, soy {{sender_name}}. He ayudado a 500 familias a dormir tranquilas. ¿Sabía que el 60% no tiene cobertura adecuada? Me gustaría ofrecerle un análisis gratuito. ¿Tiene 15 minutos? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.85 },
    { sector: "seguros", name: "Seguro Salud Nurturing", sequenceMode: "NURTURING_INFINITE", stepNumber: 1, goal: "Educar sobre ventajas seguro privado", subject: "El tiempo es el bien más valioso", bodyText: "Hola {{name}}, {{sender_name}} aquí. El verdadero valor del seguro es el tiempo que recupera. 6 meses de espera vs. días. Su tiempo tiene valor. ¿Le gustaría ver comparativo de tiempos? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.88 },
    { sector: "inmobiliaria", name: "Propiedad Exclusiva Cold", sequenceMode: "COLD_OUTREACH", stepNumber: 1, goal: "Presentar propiedad premium", subject: "Propiedad exclusiva en {{lead_city}}", bodyText: "Hola {{name}}, soy {{sender_name}}. Tengo una propiedad exclusiva aún no publicada en {{property_location}}. ¿Le gustaría verla antes del mercado general? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.87 },
    { sector: "salud", name: "Cobertura Premium Cold", sequenceMode: "COLD_OUTREACH", stepNumber: 1, goal: "Presentar seguro premium", subject: "Acceso inmediato a especialistas", bodyText: "Hola {{name}}, soy {{sender_name}}. En su sector el tiempo es crítico. Nuestros clientes tienen consulta en 24-48h vs. 6 meses. Su salud no admite esperas. ¿Tiene 10 minutos? {{sender_name}}", copyFramework: "4P", qualityScore: 0.86 },
    { sector: "saas", name: "Demo Personalizada Cold", sequenceMode: "COLD_OUTREACH", stepNumber: 1, goal: "Agendar demo", subject: "{{lead_company}} + {{product_name}}", bodyText: "Hola {{name}}, soy {{sender_name}}. Vi que {{lead_company}} está creciendo en {{lead_industry}}. Eso trae dolor: procesos manuales, falta de visibilidad. {{company_name}} ayuda a empresas similares a escalar sin caos. ¿Demo de 15 minutos? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.85 },
  ];

  for (const t of templates) {
    await prisma.sectorTemplate.create({ data: t as any });
  }
  console.log("✓ Templates seeded");
}

async function main() {
  console.log("🌱 Starting sector knowledge seed...");
  await seedBenchmarks();
  await seedVocabulary();
  await seedInsights();
  await seedTemplates();
  console.log("✅ Sector knowledge seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
