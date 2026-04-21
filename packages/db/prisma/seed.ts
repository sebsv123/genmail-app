import { PrismaClient, UserRole, LeadStage, SequenceMode, SequenceStatus, EnrollmentStatus, GeneratedEmailStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.analyticsEvent.deleteMany();
  await prisma.generatedEmail.deleteMany();
  await prisma.leadMemory.deleteMany();
  await prisma.sequenceEnrollment.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.knowledgeSource.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  // 1. Create Business (tenant)
  const business = await prisma.business.create({
    data: {
      name: 'Acme SaaS Demo',
      slug: 'acme-saas-demo',
      sector: 'Software as a Service',
      brandVoice: `Ton: Profesional pero cercano. Somos expertos pero no arrogantes.
Estilo: Frases cortas y directas. Evitar jerga técnica innecesaria.
Vocabulario: Usar "tú" en lugar de "usted". Palabras positivas: potenciar, crecer, optimizar.
Evitar: "solución integral", "sinergias", "paradigmas disruptivos".`,
      prohibitedClaims: [
        'Mejores resultados garantizados',
        '100% efectivo',
        'Sin riesgo',
        'Único en el mercado'
      ],
    },
  });
  console.log(`✅ Created business: ${business.name}`);

  // 2. Create User
  const user = await prisma.user.create({
    data: {
      email: 'admin@acme-saas.com',
      name: 'Juan Pérez',
      role: UserRole.OWNER,
      businessId: business.id,
    },
  });
  console.log(`✅ Created user: ${user.name} (${user.email})`);

  // 3. Create 5 Leads in different stages
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        email: 'maria.garcia@empresa-a.com',
        name: 'María García',
        phone: '+34 612 345 678',
        businessId: business.id,
        stage: LeadStage.NEW,
        contextData: {
          source: 'landing-page',
          interest: 'pricing',
          companySize: '10-50',
          role: 'Marketing Manager'
        },
        intentScore: 45.5,
      },
    }),
    prisma.lead.create({
      data: {
        email: 'carlos.lopez@startup-b.io',
        name: 'Carlos López',
        phone: '+34 623 456 789',
        businessId: business.id,
        stage: LeadStage.NURTURING,
        contextData: {
          source: 'webinar',
          interest: 'automation',
          companySize: '1-10',
          role: 'CEO'
        },
        intentScore: 62.3,
      },
    }),
    prisma.lead.create({
      data: {
        email: 'ana.martinez@corp-c.es',
        name: 'Ana Martínez',
        businessId: business.id,
        stage: LeadStage.QUALIFIED,
        contextData: {
          source: 'demo-request',
          interest: 'enterprise',
          companySize: '200+',
          role: 'CTO'
        },
        intentScore: 78.9,
      },
    }),
    prisma.lead.create({
      data: {
        email: 'pedro.sanchez@shop-d.com',
        name: 'Pedro Sánchez',
        phone: '+34 634 567 890',
        businessId: business.id,
        stage: LeadStage.CONVERTED,
        contextData: {
          source: 'referral',
          interest: 'ecommerce',
          companySize: '50-200',
          role: 'Ecommerce Director'
        },
        intentScore: 92.1,
      },
    }),
    prisma.lead.create({
      data: {
        email: 'laura.torres@consult-e.net',
        name: 'Laura Torres',
        businessId: business.id,
        stage: LeadStage.UNSUBSCRIBED,
        contextData: {
          source: 'newsletter',
          interest: 'consulting',
          companySize: '1-5',
          role: 'Independent Consultant'
        },
        intentScore: 12.0,
      },
    }),
  ]);
  console.log(`✅ Created ${leads.length} leads in various stages`);

  // 4. Create Evergreen Sequence with 3 templates
  const sequence = await prisma.sequence.create({
    data: {
      name: 'Onboarding Evergreen',
      mode: SequenceMode.EVERGREEN,
      status: SequenceStatus.ACTIVE,
      goal: 'Convertir leads nuevos en usuarios activos mediante educación progresiva',
      businessId: business.id,
    },
  });
  console.log(`✅ Created sequence: ${sequence.name}`);

  // Create 3 email templates for the sequence
  const templates = await Promise.all([
    prisma.emailTemplate.create({
      data: {
        sequenceId: sequence.id,
        stepNumber: 1,
        subject: 'Bienvenido a {{companyName}} - Empecemos con lo básico',
        bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bienvenido</title>
</head>
<body>
  <h1>¡Hola {{leadName}}!</h1>
  <p>Bienvenido a {{companyName}}. Soy {{senderName}}, y voy a ser tu guía en este proceso.</p>
  <p>En este primer email quiero compartirte los 3 pilares de nuestra plataforma:</p>
  <ol>
    <li><strong>Automatización inteligente</strong> - Sin configuraciones complejas</li>
    <li><strong>Analytics accionables</strong> - Datos que puedes usar, no solo ver</li>
    <li><strong>Integraciones nativas</strong> - Conecta tu stack en minutos</li>
  </ol>
  <p>¿Listo para verlo en acción? <a href="{{demoLink}}">Reserva tu demo personalizada</a></p>
  <p>Saludos,<br>{{senderName}}</p>
</body>
</html>`,
        bodyText: `¡Hola {{leadName}}!

Bienvenido a {{companyName}}. Soy {{senderName}}, y voy a ser tu guía en este proceso.

En este primer email quiero compartirte los 3 pilares de nuestra plataforma:

1. Automatización inteligente - Sin configuraciones complejas
2. Analytics accionables - Datos que puedes usar, no solo ver
3. Integraciones nativas - Conecta tu stack en minutos

¿Listo para verlo en acción? Reserva tu demo: {{demoLink}}

Saludos,
{{senderName}}`,
        copyFramework: 'AIDA',
        goal: 'Establecer credibilidad y generar interés inicial',
      },
    }),
    prisma.emailTemplate.create({
      data: {
        sequenceId: sequence.id,
        stepNumber: 2,
        subject: 'El problema que la mayoría ignora (y cómo resolverlo)',
        bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>El problema</title>
</head>
<body>
  <h1>¿Sabías que el 70% del tiempo de marketing se pierde en tareas manuales?</h1>
  <p>Hola {{leadName}},</p>
  <p>La semana pasada publiqué un informe sobre productividad en equipos de marketing. El dato más impactante: <strong>7 de cada 10 horas</strong> se van en copy-paste, cambios de herramienta, y esperando reportes.</p>
  <p>El problema no es la falta de esfuerzo. Es la falta de <strong>automatización inteligente</strong>.</p>
  <p>Aquí está lo que descubrieron los equipos que implementaron automatización:</p>
  <ul>
    <li>🚀 3x más campañas lanzadas</li>
    <li>📈 40% mejor engagement</li>
    <li>⏰ 15 horas recuperadas por semana</li>
  </ul>
  <p>¿Te gustaría ver cómo funciona para tu caso específico?</p>
  <p><a href="{{demoLink}}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Ver demo personalizada</a></p>
  <p>Saludos,<br>{{senderName}}</p>
</body>
</html>`,
        bodyText: `¿Sabías que el 70% del tiempo de marketing se pierde en tareas manuales?

Hola {{leadName}},

La semana pasada publiqué un informe sobre productividad en equipos de marketing. El dato más impactante: 7 de cada 10 horas se van en copy-paste, cambios de herramienta, y esperando reportes.

El problema no es la falta de esfuerzo. Es la falta de automatización inteligente.

Aquí está lo que descubrieron los equipos que implementaron automatización:

🚀 3x más campañas lanzadas
📈 40% mejor engagement
⏰ 15 horas recuperadas por semana

¿Te gustaría ver cómo funciona para tu caso específico?

Reserva tu demo: {{demoLink}}

Saludos,
{{senderName}}`,
        copyFramework: 'PAS',
        goal: 'Agitar el problema y presentar la solución',
      },
    }),
    prisma.emailTemplate.create({
      data: {
        sequenceId: sequence.id,
        stepNumber: 3,
        subject: 'Antes y después: cómo {{companyName}} transformó 3 negocios',
        bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Casos de éxito</title>
</head>
<body>
  <h1>Resultados reales de clientes como tú</h1>
  <p>Hola {{leadName}},</p>
  <p>Hoy quiero compartirte 3 historias de transformación:</p>
  
  <h3>🏢 TechStart (SaaS B2B)</h3>
  <p><strong>Antes:</strong> 2 personas dedicadas 100% a email marketing manual<br>
  <strong>Después:</strong> 1 persona a media jornada, 4x más emails enviados<br>
  <strong>Resultado:</strong> 127% aumento en demos mensuales</p>
  
  <h3>🛍️ ModaDirecta (Ecommerce)</h3>
  <p><strong>Antes:</strong> 8% tasa de apertura, 0.5% conversión<br>
  <strong>Después:</strong> 34% apertura, 3.2% conversión<br>
  <strong>Resultado:</strong> +€45K en ventas atribuidas a email</p>
  
  <h3>📚 EduPro (EdTech)</h3>
  <p><strong>Antes:</strong> Leads fríos sin nurturing<br>
  <strong>Después:</strong> Secuencia automatizada de 7 emails<br>
  <strong>Resultado:</strong> 23% de leads se convierten en pagos</p>
  
  <p>Tu negocio podría ser el siguiente caso de éxito.</p>
  <p><a href="{{demoLink}}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Empezar mi transformación</a></p>
  
  <p>Saludos,<br>{{senderName}}</p>
</body>
</html>`,
        bodyText: `Resultados reales de clientes como tú

Hola {{leadName}},

Hoy quiero compartirte 3 historias de transformación:

🏢 TechStart (SaaS B2B)
Antes: 2 personas dedicadas 100% a email marketing manual
Después: 1 persona a media jornada, 4x más emails enviados
Resultado: 127% aumento en demos mensuales

🛍️ ModaDirecta (Ecommerce)
Antes: 8% tasa de apertura, 0.5% conversión
Después: 34% apertura, 3.2% conversión
Resultado: +€45K en ventas atribuidas a email

📚 EduPro (EdTech)
Antes: Leads fríos sin nurturing
Después: Secuencia automatizada de 7 emails
Resultado: 23% de leads se convierten en pagos

Tu negocio podría ser el siguiente caso de éxito.

Empezar mi transformación: {{demoLink}}

Saludos,
{{senderName}}`,
        copyFramework: 'BAB',
        goal: 'Social proof y motivar a la acción',
      },
    }),
  ]);
  console.log(`✅ Created ${templates.length} email templates`);

  // Create knowledge sources for the business
  const knowledgeSources = await Promise.all([
    prisma.knowledgeSource.create({
      data: {
        businessId: business.id,
        type: 'URL',
        name: 'Blog de Marketing',
        url: 'https://acme-saas.com/blog',
        status: 'READY',
      },
    }),
    prisma.knowledgeSource.create({
      data: {
        businessId: business.id,
        type: 'DOCUMENT',
        name: 'Guía de Email Marketing 2024',
        content: 'Guía completa sobre mejores prácticas de email marketing...',
        status: 'READY',
      },
    }),
  ]);
  console.log(`✅ Created ${knowledgeSources.length} knowledge sources`);

  console.log('\n🎉 Seed completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Business: ${business.name} (slug: ${business.slug})`);
  console.log(`   - User: ${user.email}`);
  console.log(`   - Leads: ${leads.length} (NEW: 1, NURTURING: 1, QUALIFIED: 1, CONVERTED: 1, UNSUBSCRIBED: 1)`);
  console.log(`   - Sequence: ${sequence.name} with ${templates.length} templates`);
  console.log(`   - Knowledge Sources: ${knowledgeSources.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
