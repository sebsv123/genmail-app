-- 002_seed_icps.sql
-- Seed ICPs (Ideal Customer Profiles) for Valentín Protección Integral
-- Idempotent: uses ON CONFLICT (slug) DO UPDATE

BEGIN;

-- ===========================================================================
-- ICP 1: Salud Madrid
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'salud-madrid',
  'Salud Madrid',
  10, 'active',
  ARRAY['seguro de salud', 'mejor seguro médico Madrid', 'seguro salud individual', 'contratar seguro médico', 'sanidad privada Madrid', 'médico privado', 'seguro sin copagos', 'salud dental'],
  ARRAY['Madrid', 'Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte', 'Las Rozas', 'Alcobendas', 'San Sebastián de los Reyes', 'Tres Cantos'],
  ARRAY['Listas de espera en la sanidad pública', 'No encontrar médico especialista rápidamente', 'Costes elevados de seguros privados', 'Cobertura dental insuficiente', 'Copagos que se acumulan'],
  ARRAY['Problema de salud reciente en la familia', 'Empeoramiento de listas de espera', 'Nuevo trabajo sin seguro médico', 'Cambio de residencia a Madrid'],
  'Seguro de Salud Individual',
  ARRAY['Seguro Dental', 'Seguro de Accidentes'],
  'Desde 35€/mes',
  'cercano, profesional, tranquilizador',
  'AIDA',
  'llamada',
  ARRAY['{lead_name}, ¿sabías que por menos de 1€ al día puedes tener la mejor sanidad privada en Madrid? Sin copagos, sin listas de espera.',
'{lead_name}, en Madrid la sanidad pública tiene listas de espera de hasta 6 meses. No esperes más para protegerte.',
'Accede a los mejores especialistas de Madrid sin esperas. {lead_name}, tu salud no puede esperar.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro de salud Madrid', 'mejor seguro médico', 'contratar seguro médico Madrid', 'seguro salud sin copagos'],
  ARRAY['gratuito', 'gratis', 'subvencionado', 'ayuda del gobierno'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 2: Extranjeros NIE
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'extranjeros-nie',
  'Extranjeros con NIE',
  9, 'active',
  ARRAY['seguro salud extranjeros', 'seguro médico para extranjeros España', 'seguro de salud para NIE', 'seguro viaje larga estancia', 'health insurance Spain', 'seguro para estudiantes extranjeros', 'seguro sin papeles'],
  ARRAY['Madrid', 'Barcelona', 'Valencia', 'Alicante', 'Málaga', 'Marbella', 'Ibiza', 'Tenerife'],
  ARRAY['Dificultad para encontrar seguro siendo extranjero', 'Idioma: no entienden las condiciones en español', 'Requisitos legales para el NIE o visado', 'Precios más altos para extranjeros', 'Coberturas limitadas para no residentes'],
  ARRAY['Solicitud de NIE o visado', 'Renovación de residencia', 'Llegada a España por trabajo', 'Empadronamiento en nuevo municipio'],
  'Seguro de Salud para Extranjeros',
  ARRAY['Seguro de Viaje', 'Seguro Dental'],
  'Desde 40€/mes',
  'acogedor, multilingüe, claro',
  'PAS',
  'whatsapp',
  ARRAY['{lead_name}, ¿necesitas un seguro de salud para tu NIE? Te ayudamos con toda la documentación en inglés y español.',
'{lead_name}, mudarse a España ya es bastante complicado. El seguro de salud no debería serlo. Te lo explicamos todo claro y sin letra pequeña.',
'Looking for health insurance in Spain? {lead_name}, we help foreigners get the coverage they need for their NIE. English spoken.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro salud extranjeros Madrid', 'health insurance Spain NIE', 'seguro médico para estudiantes', 'seguro viaje larga estancia España'],
  ARRAY['gratuito', 'gratis', 'inmigrante ilegal', 'sin papeles'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 3: Autónomos Madrid
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'autonomos-madrid',
  'Autónomos Madrid',
  9, 'active',
  ARRAY['seguro para autónomos', 'mejor seguro autónomos Madrid', 'protección autónomos', 'seguro decesos autónomos', 'seguro accidentes autónomos', 'baja laboral autónomo'],
  ARRAY['Madrid', 'Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte', 'Las Rozas', 'Alcobendas'],
  ARRAY['Si estás de baja no ingresas', 'Falta de protección si tienes un accidente', 'Los gastos fijos no se detienen si te lesionas', 'No tener un plan de contingencia', 'Pensión de jubilación insuficiente'],
  ARRAY['Accidente leve que impide trabajar', 'Compañero autónomo que ha tenido un problema', 'Revisión anual de seguros', 'Cambio de actividad o local'],
  'Seguro de Accidentes para Autónomos',
  ARRAY['Seguro de Decesos', 'Seguro de Salud'],
  'Desde 15€/mes',
  'directo, práctico, de confianza',
  'Problema-Solución',
  'whatsapp',
  ARRAY['{lead_name}, si estás de baja un mes, ¿quién paga tus facturas? Un seguro de accidentes te cubre desde el primer día.',
'{lead_name}, como autónomo tu herramienta de trabajo eres tú. Protégete por menos de 0,50€ al día.',
'¿Sabías que el 60% de los autónomos no tiene ningún seguro? {lead_name}, no seas uno más.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro autónomos Madrid', 'protección para autónomos', 'baja laboral autónomo', 'seguro accidentes autónomos'],
  ARRAY['gratuito', 'gratis', 'subvencionado', 'ayuda del gobierno'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 4: Familias Madrid Oeste
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'familias-madrid-oeste',
  'Familias Madrid Oeste',
  8, 'active',
  ARRAY['seguro de salud familiar', 'mejor seguro médico para familias', 'seguro salud niños Madrid', 'seguro dental familiar', 'seguro hogar', 'protección familiar'],
  ARRAY['Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte', 'Las Rozas', 'Villaviciosa de Odón', 'Madrid'],
  ARRAY['Preocupación por la salud de los hijos', 'Gastos médicos imprevistos en familia', 'Dental infantil no cubierto en pública', 'Falta de tiempo para gestiones médicas', 'Proteger a toda la familia sin arruinarse'],
  ARRAY['Nacimiento de un hijo', 'Cambio de colegio', 'Compra de vivienda familiar', 'Problema de salud de un familiar cercano'],
  'Seguro de Salud Familiar',
  ARRAY['Seguro Dental', 'Seguro de Hogar', 'Seguro de Vida'],
  'Desde 60€/mes (familia)',
  'cálido, protector, cercano',
  'AIDA',
  'llamada',
  ARRAY['{lead_name}, tus hijos merecen la mejor atención médica sin esperas. Por menos de 2€ al día cada uno, toda tu familia protegida.',
'{lead_name}, ¿y si tu hijo se pone malo esta noche? Con nuestro seguro familiar tienes pediatra 24h sin salir de casa.',
'Protege a tu familia con un seguro que entiende de verdad lo que necesitas. {lead_name}, hablemos sin compromiso.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro salud familiar Madrid', 'seguro médico niños', 'mejor seguro familia', 'seguro salud Pozuelo Majadahonda'],
  ARRAY['gratuito', 'gratis', 'subvencionado', 'ayuda del gobierno'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 5: Seniors Protección
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'seniors-proteccion',
  'Seniors Protección',
  7, 'active',
  ARRAY['seguro de salud para mayores', 'mejor seguro para jubilados', 'seguro de decesos', 'seguro vida mayores 65', 'protección para seniors', 'seguro salud senior'],
  ARRAY['Madrid', 'Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte', 'Las Rozas'],
  ARRAY['Preocupación por dejar cargas a la familia', 'Costes de los seguros de salud a partir de cierta edad', 'Cobertura de decesos para no preocupar a los hijos', 'Necesidad de protección sin pagar de más', 'Salud más delicada con la edad'],
  ARRAY['Jubilación reciente', 'Fallecimiento de un ser querido', 'Nacimiento de un nieto', 'Diagnóstico de enfermedad'],
  'Seguro de Decesos',
  ARRAY['Seguro de Salud Senior', 'Seguro de Vida'],
  'Desde 10€/mes',
  'respetuoso, sereno, familiar',
  'PAS',
  'whatsapp',
  ARRAY['{lead_name}, tus hijos ya tienen bastante con lo suyo. No les dejes la carga de organizarlo todo cuando no estés.',
'{lead_name}, la tranquilidad de saber que todo está organizado no tiene precio. Por menos de 0,35€ al día.',
'Un seguro de decesos es el último acto de amor hacia tu familia. {lead_name}, hablemos de cómo protegerlos.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro decesos Madrid', 'seguro mayores 65', 'protección seniors', 'seguro vida jubilados'],
  ARRAY['gratuito', 'gratis', 'inversión', 'rentabilidad'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 6: Upgrade Cliente
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'upgrade-cliente',
  'Upgrade Cliente',
  6, 'active',
  ARRAY['mejorar mi seguro', 'ampliar cobertura seguro', 'seguro más completo', 'cambio de seguro', 'añadir coberturas'],
  ARRAY['Madrid', 'Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte'],
  ARRAY['El seguro actual no cubre lo que necesito', 'He tenido un problema y no me han cubierto', 'Precio elevado para las coberturas que tengo', 'No tengo seguro dental y lo necesito'],
  ARRAY['Siniestro no cubierto', 'Subida de prima en renovación', 'Nueva necesidad (dental, mascota, etc.)', 'Recomendación de un conocido'],
  'Upgrade a Seguro Completo',
  ARRAY['Seguro Dental', 'Seguro de Hogar', 'Seguro de Accidentes'],
  'Desde 5€/mes extra',
  'cercano, honesto, proactivo',
  'Problema-Solución',
  'whatsapp',
  ARRAY['{lead_name}, ¿sabes que por solo 5€ más al mes puedes tener cobertura dental completa? No esperes a tener una urgencia.',
'{lead_name}, tu seguro actual te cubre lo básico, pero ¿y si pasa algo más? Revisemos juntos tu póliza sin compromiso.',
'La mayoría de la gente descubre que necesita más cobertura cuando ya es demasiado tarde. {lead_name}, revisemos tu caso.'],
  '{"apollo": false, "google_places": false}',
  ARRAY['mejorar seguro salud', 'ampliar cobertura', 'cambio de seguro Madrid'],
  ARRAY['gratuito', 'gratis', 'regalado'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 7: Jóvenes Profesionales
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'jovenes-profesionales',
  'Jóvenes Profesionales',
  7, 'active',
  ARRAY['seguro de salud joven', 'seguro médico barato', 'primer seguro de salud', 'seguro para estudiantes', 'seguro salud menores 35'],
  ARRAY['Madrid', 'Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte', 'Las Rozas', 'Alcobendas'],
  ARRAY['Pensar que no lo necesito porque soy joven', 'Presupuesto ajustado al empezar a trabajar', 'No saber por dónde empezar', 'Creer que es muy caro', 'No tener tiempo para buscarlo'],
  ARRAY['Primer trabajo con contrato', 'Emancipación', 'Ida al dentista de urgencia', 'Amigo que ha tenido un problema de salud'],
  'Seguro de Salud Joven',
  ARRAY['Seguro Dental', 'Seguro de Accidentes'],
  'Desde 25€/mes',
  'moderno, directo, sin rodeos',
  'AIDA',
  'whatsapp',
  ARRAY['{lead_name}, eres joven, estás sano... ¿para qué quieres un seguro? Para que siga siendo así. Por menos de 1€ al día.',
'{lead_name}, un café al día es lo que cuesta tener la tranquilidad de estar protegido. ¿A qué esperas para empezar?',
'Tu salud es tu mejor inversión. {lead_name}, protégete desde ya por solo 25€ al mes.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro salud joven Madrid', 'seguro médico barato', 'primer seguro salud', 'seguro para estudiantes Madrid'],
  ARRAY['gratuito', 'gratis', 'subvencionado'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

-- ===========================================================================
-- ICP 8: Mascotas
-- ===========================================================================
INSERT INTO icps (slug, name, priority, status, intent_keywords, zones, pain_points, triggers, primary_product, secondary_products, entry_price, tone, framework, cta_type, hook_templates, hunt_sources, hunt_queries, prohibited_terms, total_leads, reply_rate, conversion_rate, avg_score)
VALUES (
  'mascotas',
  'Mascotas',
  6, 'active',
  ARRAY['seguro para perros', 'seguro para gatos', 'seguro mascotas Madrid', 'seguro veterinario', 'protección mascotas', 'seguro responsabilidad civil perros'],
  ARRAY['Madrid', 'Pozuelo de Alarcón', 'Majadahonda', 'Boadilla del Monte', 'Las Rozas'],
  ARRAY['Gastos veterinarios imprevistos muy elevados', 'Obligación legal de tener seguro para perros peligrosos', 'No saber qué hacer si mi mascota se pone enferma', 'Cirugías veterinarias que cuestan miles de euros'],
  ARRAY['Enfermedad de la mascota', 'Nueva ley de bienestar animal', 'Compra o adopción de una mascota', 'Accidente con la mascota'],
  'Seguro para Mascotas',
  ARRAY['Seguro de Salud', 'Seguro de Hogar'],
  'Desde 8€/mes',
  'cariñoso, práctico, responsable',
  'PAS',
  'whatsapp',
  ARRAY['{lead_name}, tu perro es parte de la familia. Por menos de 0,30€ al día, no tienes que preocuparte por las facturas del veterinario.',
'{lead_name}, ¿sabías que desde 2025 es obligatorio tener un seguro de responsabilidad civil para perros? Nosotros te ayudamos.',
'Una operación de urgencia para tu mascota puede costar más de 2.000€. {lead_name}, no te la juegues.'],
  '{"apollo": true, "google_places": true}',
  ARRAY['seguro mascotas Madrid', 'seguro para perros', 'seguro veterinario', 'seguro responsabilidad civil perros'],
  ARRAY['gratuito', 'gratis', 'subvencionado', 'ayuda del gobierno'],
  0, 0, 0, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  intent_keywords = EXCLUDED.intent_keywords,
  zones = EXCLUDED.zones,
  pain_points = EXCLUDED.pain_points,
  triggers = EXCLUDED.triggers,
  primary_product = EXCLUDED.primary_product,
  secondary_products = EXCLUDED.secondary_products,
  entry_price = EXCLUDED.entry_price,
  tone = EXCLUDED.tone,
  framework = EXCLUDED.framework,
  cta_type = EXCLUDED.cta_type,
  hook_templates = EXCLUDED.hook_templates,
  hunt_sources = EXCLUDED.hunt_sources,
  hunt_queries = EXCLUDED.hunt_queries,
  prohibited_terms = EXCLUDED.prohibited_terms,
  updated_at = NOW();

COMMIT;
