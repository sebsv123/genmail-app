/**
 * SECTOR KNOWLEDGE BASE SEED SCRIPT - FASE 16B
 * Fuentes: Mailchimp Email Marketing Benchmarks 2024, HubSpot State of Marketing 2024,
 *          Campaign Monitor Email Benchmarks 2024, Klaviyo Ecommerce Benchmarks 2024
 */

import { PrismaClient, SectorVocabularyType, SectorInsightType, SequenceMode } from "@prisma/client";

const prisma = new PrismaClient();

const SECTORS = ["seguros", "inmobiliaria", "salud", "educacion", "ecommerce", "saas", "consultoria", "legal", "hosteleria", "automocion"] as const;

const BENCHMARKS: Record<string, any> = {
  seguros: { avgOpenRate: 0.28, avgClickRate: 0.035, avgReplyRate: 0.008, bestDayOfWeek: "martes", bestHourRange: "10-12", avgEmailLength: "medio", bestFrameworks: ["PAS", "PASTOR"], source: "Mailchimp Email Marketing Benchmarks 2024" },
  inmobiliaria: { avgOpenRate: 0.24, avgClickRate: 0.042, avgReplyRate: 0.006, bestDayOfWeek: "miercoles", bestHourRange: "9-11", avgEmailLength: "corto", bestFrameworks: ["AIDA", "BAB"], source: "HubSpot State of Marketing 2024" },
  salud: { avgOpenRate: 0.32, avgClickRate: 0.038, avgReplyRate: 0.010, bestDayOfWeek: "martes", bestHourRange: "8-10", avgEmailLength: "medio", bestFrameworks: ["PAS", "STAR"], source: "Campaign Monitor Email Benchmarks 2024" },
  educacion: { avgOpenRate: 0.29, avgClickRate: 0.044, avgReplyRate: 0.009, bestDayOfWeek: "jueves", bestHourRange: "10-12", avgEmailLength: "largo", bestFrameworks: ["AIDA", "4PS"], source: "Mailchimp Email Marketing Benchmarks 2024" },
  ecommerce: { avgOpenRate: 0.21, avgClickRate: 0.055, avgReplyRate: 0.004, bestDayOfWeek: "martes", bestHourRange: "11-13", avgEmailLength: "corto", bestFrameworks: ["BAB", "AIDA"], source: "Klaviyo Ecommerce Benchmarks 2024" },
  saas: { avgOpenRate: 0.26, avgClickRate: 0.048, avgReplyRate: 0.012, bestDayOfWeek: "martes", bestHourRange: "9-11", avgEmailLength: "corto", bestFrameworks: ["PAS", "SPIN"], source: "HubSpot State of Marketing 2024" },
  consultoria: { avgOpenRate: 0.31, avgClickRate: 0.040, avgReplyRate: 0.015, bestDayOfWeek: "miercoles", bestHourRange: "8-10", avgEmailLength: "medio", bestFrameworks: ["PASTOR", "SPIN"], source: "Mailchimp Email Marketing Benchmarks 2024" },
  legal: { avgOpenRate: 0.27, avgClickRate: 0.028, avgReplyRate: 0.011, bestDayOfWeek: "lunes", bestHourRange: "9-11", avgEmailLength: "medio", bestFrameworks: ["PAS", "FAB"], source: "Campaign Monitor Email Benchmarks 2024" },
  hosteleria: { avgOpenRate: 0.23, avgClickRate: 0.060, avgReplyRate: 0.005, bestDayOfWeek: "jueves", bestHourRange: "16-18", avgEmailLength: "corto", bestFrameworks: ["AIDA", "BAB"], source: "Mailchimp Email Marketing Benchmarks 2024" },
  automocion: { avgOpenRate: 0.25, avgClickRate: 0.045, avgReplyRate: 0.007, bestDayOfWeek: "sabado", bestHourRange: "10-12", avgEmailLength: "corto", bestFrameworks: ["BAB", "FAB"], source: "HubSpot State of Marketing 2024" }
};

async function seedBenchmarks() {
  console.log("Seeding SectorBenchmarks...");
  for (const sector of SECTORS) {
    const b = BENCHMARKS[sector];
    await prisma.sectorBenchmark.upsert({ where: { sector }, update: b, create: { sector, ...b } });
  }
  console.log("✓ Benchmarks seeded");
}

async function seedVocabulary() {
  console.log("Seeding SectorVocabulary...");
  const vocabularies = [
    { sector: "seguros", type: SectorVocabularyType.PROHIBITED, words: ["garantizado al 100%", "sin letra pequeña", "el mejor precio", "gratis", "cura", "elimina el riesgo", "te salvamos"], reason: "Promesas absolutas no cumplibles legalmente" },
    { sector: "seguros", type: SectorVocabularyType.PREFERRED, words: ["protección", "tranquilidad", "respaldo", "cobertura", "seguridad familiar", "paz mental", "asesoramiento personalizado"], reason: "Valor emocional sin promesas excesivas" },
    { sector: "seguros", type: SectorVocabularyType.POWER_WORDS, words: ["protege", "asegura", "respaldo", "sin preocupaciones", "en manos expertas", "blindado", "cubierto"], reason: "Generan confianza inmediata" },
    { sector: "seguros", type: SectorVocabularyType.WEAK_WORDS, words: ["intentamos", "quizás", "posiblemente", "creemos que", "esperamos", "tal vez"], reason: "Transmiten duda y falta de compromiso" },
    { sector: "inmobiliaria", type: SectorVocabularyType.PROHIBITED, words: ["oportunidad única", "no te lo pierdas", "precio de regalo", "ganga", "te arrepentirás"], reason: "Lenguaje de urgencia falsa que desprestigia" },
    { sector: "inmobiliaria", type: SectorVocabularyType.PREFERRED, words: ["inversión", "rentabilidad", "zona premium", "valor", "patrimonio", "ubicación estratégica"], reason: "Posicionan como valor añadido" },
    { sector: "inmobiliaria", type: SectorVocabularyType.POWER_WORDS, words: ["rentable", "exclusivo", "prime", "revalorización", "oportunidad real", "patrimonio sólido"], reason: "Transmiten exclusividad y potencial financiero" },
    { sector: "inmobiliaria", type: SectorVocabularyType.WEAK_WORDS, words: ["barato", "económico", "asequible", "precio bajo"], reason: "Asocian la propiedad con baja calidad" },
    { sector: "salud", type: SectorVocabularyType.PROHIBITED, words: ["cura definitiva", "100% efectivo", "sin efectos secundarios", "milagro", "tratamiento revolucionario", "garantizado"], reason: "Requieren evidencia científica" },
    { sector: "salud", type: SectorVocabularyType.PREFERRED, words: ["bienestar", "calidad de vida", "prevención", "diagnóstico temprano", "acompañamiento médico", "segunda opinión"], reason: "Enfatizan cuidado continuo" },
    { sector: "salud", type: SectorVocabularyType.POWER_WORDS, words: ["salud", "bienestar", "expertos", "especialistas", "resultados probados", "evidencia clínica"], reason: "Transmiten profesionalidad" },
    { sector: "salud", type: SectorVocabularyType.WEAK_WORDS, words: ["intentamos curar", "puede que funcione", "quizás mejore", "a veces ayuda"], reason: "Transmiten incertidumbre" },
    { sector: "educacion", type: SectorVocabularyType.PROHIBITED, words: ["diploma garantizado", "aprobado seguro", "sin estudiar", "100% online sin esfuerzo", "titulación inmediata"], reason: "Desvalorizan el esfuerzo académico" },
    { sector: "educacion", type: SectorVocabularyType.PREFERRED, words: ["formación de calidad", "titulación oficial", "docentes expertos", "metodología probada", "inserción laboral"], reason: "Enfatizan valor académico real" },
    { sector: "educacion", type: SectorVocabularyType.POWER_WORDS, words: ["aprende", "domina", "certifícate", "especialízate", "progresa", "avanza"], reason: "Verbos de acción que motivan" },
    { sector: "educacion", type: SectorVocabularyType.WEAK_WORDS, words: ["fácil", "sin complicaciones", "para torpes", "cualquiera puede"], reason: "Minimizan el valor de la formación" },
    { sector: "ecommerce", type: SectorVocabularyType.PROHIBITED, words: ["envío siempre gratis", "devolución sin límite", "precio más bajo garantizado", "imposible de encontrar"], reason: "Promesas operativas difíciles de cumplir" },
    { sector: "ecommerce", type: SectorVocabularyType.PREFERRED, words: ["stock disponible", "envío rápido", "calidad garantizada", "satisfacción asegurada", "pago seguro"], reason: "Transmiten confianza operativa" },
    { sector: "ecommerce", type: SectorVocabularyType.POWER_WORDS, words: ["exclusivo", "limitado", "reserva", "compra ahora", "últimas unidades", "oferta flash"], reason: "Generan urgencia legítima" },
    { sector: "ecommerce", type: SectorVocabularyType.WEAK_WORDS, words: ["quizás te guste", "podría interesarte", "si quieres ver", "echa un vistazo"], reason: "Falta de convicción" },
    { sector: "saas", type: SectorVocabularyType.PROHIBITED, words: ["sin configuración", "nunca falla", "100% uptime", "resultados garantizados", "cero esfuerzo"], reason: "Promesas técnicas imposibles" },
    { sector: "saas", type: SectorVocabularyType.PREFERRED, words: ["integración sencilla", "soporte dedicado", "escalable", "seguro", "actualizaciones automáticas"], reason: "Beneficios reales de SaaS" },
    { sector: "saas", type: SectorVocabularyType.POWER_WORDS, words: ["automatiza", "optimiza", "escala", "ROI comprobado", "aumenta", "reduce"], reason: "Verbos de resultado tangibles" },
    { sector: "saas", type: SectorVocabularyType.WEAK_WORDS, words: ["prueba a ver", "igual te sirve", "puede ayudarte", "no sé si te interesa"], reason: "Duda que transmite falta de confianza" },
    { sector: "consultoria", type: SectorVocabularyType.PROHIBITED, words: ["solución mágica", "resultados inmediatos", "cambio radical garantizado", "éxito asegurado"], reason: "Consultoría es proceso, no solución instantánea" },
    { sector: "consultoria", type: SectorVocabularyType.PREFERRED, words: ["diagnóstico personalizado", "plan de acción", "acompañamiento", "expertise sectorial", "metodología probada"], reason: "Enfatizan proceso profesional" },
    { sector: "consultoria", type: SectorVocabularyType.POWER_WORDS, words: ["transforma", "optimiza", "potencia", "resultados medibles", "estratégico", "rentabiliza"], reason: "Demuestran valor consultivo" },
    { sector: "consultoria", type: SectorVocabularyType.WEAK_WORDS, words: ["podemos intentar", "a ver qué pasa", "quizás funcione", "no prometo nada"], reason: "Falta de confianza en el valor añadido" },
    { sector: "legal", type: SectorVocabularyType.PROHIBITED, words: ["victoria garantizada", "100% casos ganados", "proceso rápido seguro", "dinero de vuelta si no"], reason: "La práctica legal no permite garantizar resultados" },
    { sector: "legal", type: SectorVocabularyType.PREFERRED, words: ["asesoramiento experto", "estrategia jurídica", "defensa de sus intereses", "experiencia probada", "transparencia"], reason: "Enfatizan profesionalidad" },
    { sector: "legal", type: SectorVocabularyType.POWER_WORDS, words: ["protege", "defiende", "resuelve", "gana", "experto", "especialista"], reason: "Transmiten capacidad profesional" },
    { sector: "legal", type: SectorVocabularyType.WEAK_WORDS, words: ["no podemos prometer", "quizás salga bien", "ojalá", "esperemos que sí"], reason: "Duda que menoscaba confianza" },
    { sector: "hosteleria", type: SectorVocabularyType.PROHIBITED, words: ["el mejor restaurante", "comida 100% casera siempre", "nunca fallamos", "imposible no gustar"], reason: "Superlativos absolutos difíciles de sostener" },
    { sector: "hosteleria", type: SectorVocabularyType.PREFERRED, words: ["producto fresco", "cocina tradicional", "ambiente acogedor", "atención personalizada", "reserva recomendada"], reason: "Destacan calidad real" },
    { sector: "hosteleria", type: SectorVocabularyType.POWER_WORDS, words: ["sabor", "auténtico", "experiencia", "exquisito", "delicioso", "recomendado"], reason: "Evocan experiencia gastronómica positiva" },
    { sector: "hosteleria", type: SectorVocabularyType.WEAK_WORDS, words: ["normal", "está bien", "no está mal", "regular"], reason: "Mediocridad que no motiva a visitar" },
    { sector: "automocion", type: SectorVocabularyType.PROHIBITED, words: ["motor indestructible", "nunca se avería", "consumo cero", "mejor precio garantizado"], reason: "Promesas técnicas imposibles de cumplir" },
    { sector: "automocion", type: SectorVocabularyType.PREFERRED, words: ["kilometraje certificado", "revisión completa", "garantía oficial", "historial de mantenimiento", "financiación flexible"], reason: "Transmiten confianza y transparencia" },
    { sector: "automocion", type: SectorVocabularyType.POWER_WORDS, words: ["conduce", "potencia", "eficiencia", "seguridad", "confort", "fiabilidad"], reason: "Atributos valorados por compradores" },
    { sector: "automocion", type: SectorVocabularyType.WEAK_WORDS, words: ["viejo", "desfasado", "gastón", "ruidoso", "pasado de moda"], reason: "Desprecian el producto" }
  ];
  for (const v of vocabularies) {
    await prisma.sectorVocabulary.create({ data: v });
  }
  console.log("✓ Vocabulary seeded");
}

async function seedInsights() {
  console.log("Seeding SectorInsights...");
  const insights = [
    { sector: "seguros", insightType: SectorInsightType.PAIN_POINT, title: "Miedo a gastos médicos imprevistos", description: "Principal preocupación es enfrentar gastos que desequilibren finanzas", examples: ["¿Y si me pasa algo y no puedo pagar?"], weight: 0.95 },
    { sector: "seguros", insightType: SectorInsightType.TRIGGER, title: "Nacimiento de hijo o enfermedad familiar", description: "Eventos vitales que despiertan conciencia de protección", examples: ["Acabamos de tener un bebé"], weight: 0.90 },
    { sector: "seguros", insightType: SectorInsightType.OBJECTION, title: "Ya tengo seguro con el banco", description: "Cliente cree estar cubierto pero suele tener coberturas inadecuadas", examples: ["Mi banco me lo da incluido"], weight: 0.80 },
    { sector: "seguros", insightType: SectorInsightType.TRUST_FACTOR, title: "Número de familias protegidas", description: "La credibilidad se demuestra con track record", examples: ["+1200 familias protegidas", "10 años de experiencia"], weight: 0.87 },
    { sector: "inmobiliaria", insightType: SectorInsightType.PAIN_POINT, title: "Incertidumbre sobre timing de mercado", description: "Temen perder dinero por no acertar momento", examples: ["¿Bajarán más los precios?"], weight: 0.90 },
    { sector: "inmobiliaria", insightType: SectorInsightType.TRIGGER, title: "Cambio de trabajo o ciudad", description: "Relocalización profesional genera necesidad de cambio", examples: ["Me han ofrecido un trabajo en Madrid"], weight: 0.88 },
    { sector: "inmobiliaria", insightType: SectorInsightType.TRUST_FACTOR, title: "Transparencia en documentación", description: "La seguridad legal es prioritaria", examples: ["Todos los documentos en regla"], weight: 0.90 },
    { sector: "salud", insightType: SectorInsightType.PAIN_POINT, title: "Tiempo de espera en sanidad pública", description: "Frustración por listas de espera", examples: ["Me han dado cita en 6 meses"], weight: 0.95 },
    { sector: "salud", insightType: SectorInsightType.TRIGGER, title: "Diagnóstico o síntoma preocupante", description: "La salud de uno mismo activa búsqueda de soluciones", examples: ["Me han detectado algo en análisis"], weight: 0.93 },
    { sector: "salud", insightType: SectorInsightType.TRUST_FACTOR, title: "Reputación de médicos en cuadro", description: "La calidad del cuadro médico es decisiva", examples: ["Los mejores especialistas"], weight: 0.91 },
    { sector: "educacion", insightType: SectorInsightType.PAIN_POINT, title: "Inseguridad sobre salidas profesionales", description: "Temor a invertir tiempo sin retorno", examples: ["¿Y si no encuentro trabajo después?"], weight: 0.90 },
    { sector: "educacion", insightType: SectorInsightType.TRIGGER, title: "Momento de transición profesional", description: "Cambio de trabajo activa necesidad de reciclaje", examples: ["Quiero cambiar de sector"], weight: 0.87 },
    { sector: "educacion", insightType: SectorInsightType.TRUST_FACTOR, title: "Tasa de inserción laboral", description: "Los resultados concretos demuestran valor", examples: ["90% de inserción laboral"], weight: 0.88 },
    { sector: "ecommerce", insightType: SectorInsightType.PAIN_POINT, title: "Desconfianza en compras online", description: "Miedo a fraudes o productos defectuosos", examples: ["¿Y si no me llega?"], weight: 0.89 },
    { sector: "ecommerce", insightType: SectorInsightType.TRIGGER, title: "Necesidad urgente o temporada", description: "Eventos puntuales generan demanda inmediata", examples: ["Lo necesito para el fin de semana"], weight: 0.86 },
    { sector: "ecommerce", insightType: SectorInsightType.TRUST_FACTOR, title: "Opiniones de clientes", description: "Las reviews sociales reducen percepción de riesgo", examples: ["4.8 estrellas con 500+ reviews"], weight: 0.92 },
    { sector: "saas", insightType: SectorInsightType.PAIN_POINT, title: "Herramientas complejas o no escalables", description: "Frustración con software actual", examples: ["Estamos en Excel y ya no da más"], weight: 0.91 },
    { sector: "saas", insightType: SectorInsightType.TRIGGER, title: "Crecimiento que supera capacidad actual", description: "El crecimiento revela limitaciones operativas", examples: ["Hemos crecido 50% y el sistema no da abasto"], weight: 0.89 },
    { sector: "saas", insightType: SectorInsightType.TRUST_FACTOR, title: "Casos de éxito de empresas similares", description: "La credibilidad se transfiere de casos comparables", examples: ["Empresas como la suya ahorran 20h/semana"], weight: 0.90 },
    { sector: "consultoria", insightType: SectorInsightType.PAIN_POINT, title: "Falta de claridad estratégica", description: "No saber por dónde empezar o qué priorizar", examples: ["No tenemos claro el plan para el próximo año"], weight: 0.90 },
    { sector: "consultoria", insightType: SectorInsightType.TRIGGER, title: "Resultados por debajo de expectativas", description: "Bajo rendimiento activa búsqueda de diagnóstico externo", examples: ["Los resultados han bajado dos trimestres"], weight: 0.88 },
    { sector: "consultoria", insightType: SectorInsightType.TRUST_FACTOR, title: "Reputación del consultor", description: "La credibilidad viene de experiencia específica", examples: ["15 años en el sector retail"], weight: 0.89 },
    { sector: "legal", insightType: SectorInsightType.PAIN_POINT, title: "Incertidumbre sobre costes legales", description: "Temor a que los honorarios se disparen", examples: ["¿Cuánto me va a costar en total?"], weight: 0.92 },
    { sector: "legal", insightType: SectorInsightType.TRIGGER, title: "Problema legal urgente o demanda", description: "Conflictos que requieren respuesta inmediata", examples: ["Me han enviado un burofax"], weight: 0.94 },
    { sector: "legal", insightType: SectorInsightType.TRUST_FACTOR, title: "Especialización específica en la materia", description: "La experiencia específica genera confianza técnica", examples: ["Especialistas en derecho laboral"], weight: 0.91 },
    { sector: "hosteleria", insightType: SectorInsightType.PAIN_POINT, title: "Desconfianza en reservas online", description: "Miedo a que la reserva no esté bien gestionada", examples: ["¿Está confirmada mi reserva?"], weight: 0.85 },
    { sector: "hosteleria", insightType: SectorInsightType.TRIGGER, title: "Ocasiones especiales o celebraciones", description: "Eventos sociales generan necesidad de reserva", examples: ["Es para aniversario"], weight: 0.88 },
    { sector: "hosteleria", insightType: SectorInsightType.TRUST_FACTOR, title: "Reconocimientos y valoraciones", description: "La reputación social valida la calidad", examples: ["Estrella Michelin"], weight: 0.90 },
    { sector: "automocion", insightType: SectorInsightType.PAIN_POINT, title: "Desconfianza en concesionarios", description: "Miedo a pagar de más o a ocultación de defectos", examples: ["¿El precio es negociable?"], weight: 0.91 },
    { sector: "automocion", insightType: SectorInsightType.TRIGGER, title: "Fin de leasing o avería grave", description: "Momentos que forzan cambio de vehículo", examples: ["Se me acaba el leasing"], weight: 0.89 },
    { sector: "automocion", insightType: SectorInsightType.TRUST_FACTOR, title: "Garantía oficial e historial", description: "La seguridad post-venta es decisiva", examples: ["Garantía oficial 5 años"], weight: 0.92 }
  ];
  for (const i of insights) {
    await prisma.sectorInsight.create({ data: i });
  }
  console.log("✓ Insights seeded");
}

async function seedTemplates() {
  console.log("Seeding SectorTemplates...");
  const templates = [
    { sector: "seguros", name: "Protección Familiar Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Despertar conciencia de protección", subject: "¿Su familia está realmente protegida?", bodyText: "Hola {{name}}, soy {{sender_name}}. He ayudado a 500 familias a dormir tranquilas. ¿Sabía que el 60% no tiene cobertura adecuada? Me gustaría ofrecerle un análisis gratuito. ¿Tiene 15 minutos? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.85 },
    { sector: "seguros", name: "Seguro Salud Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Educar sobre ventajas seguro privado", subject: "El tiempo es el bien más valioso", bodyText: "Hola {{name}}, {{sender_name}} aquí. El verdadero valor del seguro es el tiempo que recupera. 6 meses de espera vs. días. Su tiempo tiene valor. ¿Le gustaría ver comparativo de tiempos? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.88 },
    { sector: "seguros", name: "Revisión Anual Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Revisión de cobertura existente", subject: "Es hora de revisar su póliza", bodyText: "Hola {{name}}, {{sender_name}}. Como cada año, le escribo para revisar si su póliza sigue ajustada a sus necesidades. ¿Hablamos 10 minutos? {{sender_name}}", copyFramework: "PASTOR", qualityScore: 0.82 },
    { sector: "inmobiliaria", name: "Propiedad Exclusiva Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Presentar propiedad premium", subject: "Propiedad exclusiva en {{lead_city}}", bodyText: "Hola {{name}}, soy {{sender_name}}. Tengo una propiedad exclusiva aún no publicada. ¿Le gustaría verla antes del mercado general? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.87 },
    { sector: "inmobiliaria", name: "Market Report Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Educar sobre mercado local", subject: "Informe de mercado {{lead_city}} - {{month}}", bodyText: "Hola {{name}}, {{sender_name}}. Adjunto informe mensual de precios en su zona. ¿Le gustaría saber cuánto vale su propiedad hoy? {{sender_name}}", copyFramework: "FAB", qualityScore: 0.84 },
    { sector: "inmobiliaria", name: "Inversión Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Presentar oportunidades de inversión", subject: "Nuevas oportunidades de inversión disponibles", bodyText: "Hola {{name}}, {{sender_name}}. Han salido nuevas oportunidades en {{lead_city}} con rentabilidades del 6-8%. ¿Le interesa recibir el dossier? {{sender_name}}", copyFramework: "BAB", qualityScore: 0.86 },
    { sector: "salud", name: "Cobertura Premium Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Presentar seguro premium", subject: "Acceso inmediato a especialistas", bodyText: "Hola {{name}}, soy {{sender_name}}. En su sector el tiempo es crítico. Nuestros clientes tienen consulta en 24-48h vs. 6 meses. ¿Tiene 10 minutos? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.86 },
    { sector: "salud", name: "Bienestar Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Educar sobre prevención", subject: "Check-up anual: su salud merece atención", bodyText: "Hola {{name}}, {{sender_name}}. ¿Cuándo fue su último chequeo? La prevención es la mejor inversión. ¿Le gustaría agendar el suyo? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.84 },
    { sector: "salud", name: "Segunda Opinión Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Ofrecer servicio de segunda opinión", subject: "Segunda opinión médica sin coste", bodyText: "Hola {{name}}, {{sender_name}}. Sabemos que algunos diagnósticos generan dudas. Ofrecemos segunda opinión gratuita. ¿Necesita revisar algún informe? {{sender_name}}", copyFramework: "STAR", qualityScore: 0.88 },
    { sector: "educacion", name: "Formación Sectorial Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Presentar programa formativo", subject: "Formación que su sector demanda", bodyText: "Hola {{name}}, soy {{sender_name}}. El 78% de profesionales en {{lead_sector}} están actualizando skills este año. ¿Le gustaría saber qué les está dando ventaja? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.85 },
    { sector: "educacion", name: "Recursos Gratuitos Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Educar y generar confianza", subject: "Guía gratuita: Tendencias {{lead_sector}} 2024", bodyText: "Hola {{name}}, {{sender_name}}. He preparado una guía con las 10 tendencias del sector. Sin registro, sin compromiso. ¿Se la envío? {{sender_name}}", copyFramework: "4PS", qualityScore: 0.87 },
    { sector: "educacion", name: "Webinar Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Invitar a evento educativo", subject: "Webinar: Cómo destacar en {{lead_sector}}", bodyText: "Hola {{name}}, {{sender_name}}. El próximo martes hacemos webinar gratuito con expertos. Plazas limitadas. ¿Reservamos la suya? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.83 },
    { sector: "ecommerce", name: "Nuevo Cliente Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Conversión primera compra", subject: "15% de descuento en su primera compra", bodyText: "Hola {{name}}, {{sender_name}}. Bienvenido. Como nuevo cliente, tiene 15% descuento + envío gratis. Código: BIENVENIDO15. {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.88 },
    { sector: "ecommerce", name: "Carrito Abandonado Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Recuperar venta perdida", subject: "¿Olvidó algo? Le guardamos su carrito", bodyText: "Hola {{name}}, {{sender_name}}. Vi que dejó artículos en el carrito. Se lo guardamos 24h más. Código: EXPRESS. {{sender_name}}", copyFramework: "BAB", qualityScore: 0.90 },
    { sector: "ecommerce", name: "Nuevos Productos Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Informar de novedades", subject: "Novedades esta semana - {{product_category}}", bodyText: "Hola {{name}}, {{sender_name}}. Hemos recibido nuevos productos que creo que le interesarán. Stock limitado. {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.85 },
    { sector: "saas", name: "Demo Personalizada Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Agendar demo", subject: "{{lead_company}} + {{product_name}}", bodyText: "Hola {{name}}, soy {{sender_name}}. Vi que {{lead_company}} está creciendo. Eso trae dolor: procesos manuales. ¿Demo de 15 minutos? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.85 },
    { sector: "saas", name: "Case Study Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Demostrar valor con caso real", subject: "Cómo {{similar_company}} redujo costes 30%", bodyText: "Hola {{name}}, {{sender_name}}. Adjunto caso de estudio de {{similar_company}}. Redujeron costes 30% en 6 meses. ¿Le interesa ver cómo? {{sender_name}}", copyFramework: "STAR", qualityScore: 0.87 },
    { sector: "saas", name: "Feature Update Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Informar de nueva funcionalidad", subject: "Nueva función que {{lead_company}} necesitaba", bodyText: "Hola {{name}}, {{sender_name}}. Acabamos de lanzar {{new_feature}}. ¿Le gustaría verlo en acción? {{sender_name}}", copyFramework: "FAB", qualityScore: 0.84 },
    { sector: "consultoria", name: "Diagnóstico Gratuito Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Ofrecer evaluación inicial", subject: "Diagnóstico gratuito para {{lead_company}}", bodyText: "Hola {{name}}, soy {{sender_name}}. Trabajo con empresas de {{lead_industry}} ayudándoles a identificar oportunidades. ¿Diagnóstico gratuito de 30 min? {{sender_name}}", copyFramework: "SPIN", qualityScore: 0.88 },
    { sector: "consultoria", name: "Insight Sectorial Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Demostrar expertise", subject: "3 errores que cuestan dinero en {{lead_industry}}", bodyText: "Hola {{name}}, {{sender_name}}. He escrito un informe sobre errores comunes en 15 años en {{lead_industry}}. ¿Se lo envío? {{sender_name}}", copyFramework: "PASTOR", qualityScore: 0.86 },
    { sector: "consultoria", name: "Nuevo Servicio Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Presentar nueva oferta", subject: "Nuevo servicio: {{service_name}}", bodyText: "Hola {{name}}, {{sender_name}}. Acabamos de lanzar {{service_name}}, diseñado para empresas como {{lead_company}}. {{sender_name}}", copyFramework: "FAB", qualityScore: 0.85 },
    { sector: "legal", name: "Consulta Inicial Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Agendar primera consulta", subject: "Primera consulta gratuita - {{legal_matter}}", bodyText: "Hola {{name}}, soy {{sender_name}}, abogado especializado. Ofrezco primera consulta gratuita para evaluar su caso. ¿Tiene 20 minutos? {{sender_name}}", copyFramework: "PAS", qualityScore: 0.86 },
    { sector: "legal", name: "Newsletter Legal Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Educar sobre cambios legales", subject: "Cambio legal que afecta a {{lead_sector}}", bodyText: "Hola {{name}}, {{sender_name}}. Ha entrado en vigor nueva normativa que afecta a empresas como la suya. ¿Se lo envío? {{sender_name}}", copyFramework: "4PS", qualityScore: 0.84 },
    { sector: "legal", name: "Revisión Contratos Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Ofrecer revisión preventiva", subject: "¿Cuándo revisó sus contratos por última vez?", bodyText: "Hola {{name}}, {{sender_name}}. Los contratos deberían revisarse anualmente. Ofrezco revisión express a precio especial. {{sender_name}}", copyFramework: "BAB", qualityScore: 0.85 },
    { sector: "hosteleria", name: "Reserva Directa Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Captar reserva directa", subject: "Beneficios de reservar directamente", bodyText: "Hola {{name}}, {{sender_name}} de {{restaurant_name}}. Reservando directamente: mejor mesa, copa de bienvenida. ¿Reservamos? {{sender_name}}", copyFramework: "BAB", qualityScore: 0.87 },
    { sector: "hosteleria", name: "Menú Semanal Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Mantener engagement", subject: "Menú de esta semana - Especial {{dish}}", bodyText: "Hola {{name}}, {{sender_name}}. Este jueves tenemos nuestro especial {{dish}}. Reservas limitadas. ¿Le guardamos mesa? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.85 },
    { sector: "hosteleria", name: "Evento Especial Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Promocionar evento", subject: "{{event_name}} - {{date}}", bodyText: "Hola {{name}}, {{sender_name}}. El {{date}} celebramos {{event_name}}: menú especial, música en vivo. ¿Reservamos? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.86 },
    { sector: "automocion", name: "Oferta Vehículo Cold", sequenceMode: SequenceMode.COLD_OUTREACH, stepNumber: 1, goal: "Presentar vehículo específico", subject: "{{vehicle_model}} disponible para entrega inmediata", bodyText: "Hola {{name}}, soy {{sender_name}} de {{dealer_name}}. Acaba de llegar un {{vehicle_model}}. Kilometraje certificado, garantía oficial. ¿Agendamos visita? {{sender_name}}", copyFramework: "FAB", qualityScore: 0.88 },
    { sector: "automocion", name: "Fin de Leasing Nurturing", sequenceMode: SequenceMode.NURTURING_INFINITE, stepNumber: 1, goal: "Captar cambio de vehículo", subject: "Su leasing termina pronto - Opciones disponibles", bodyText: "Hola {{name}}, {{sender_name}}. Veo que su leasing termina en {{months_left}} meses. ¿Le ayudo a encontrar su próximo vehículo? {{sender_name}}", copyFramework: "BAB", qualityScore: 0.87 },
    { sector: "automocion", name: "Oferta Fin de Mes Evergreen", sequenceMode: SequenceMode.EVERGREEN, stepNumber: 1, goal: "Urgencia por cierre de mes", subject: "Fin de mes: ofertas especiales en stock", bodyText: "Hola {{name}}, {{sender_name}}. Cerramos mes y tenemos unidades con descuentos. Stock limitado. ¿Viene este fin de semana? {{sender_name}}", copyFramework: "AIDA", qualityScore: 0.85 }
  ];
  for (const t of templates) {
    await prisma.sectorTemplate.create({ data: t });
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
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
