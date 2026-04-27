/**
 * Signals Worker - FASE 18E
 * Procesa señales externas y enriquece scoring
 */

import { Worker } from "bullmq";
import {
  SIGNALS_QUEUE,
  type CollectSectorTrendsJobData,
  type EnrichProspectSignalsJobData,
  type ProcessExternalSignalJobData,
  getRedisConnection,
} from "@genmail/queue";
import { db } from "../lib/db.js";
import { ApolloClient, googleTrendsClient } from "@genmail/lead-hunter";

export function createSignalsWorker(): Worker {
  const worker = new Worker<
    CollectSectorTrendsJobData | EnrichProspectSignalsJobData | ProcessExternalSignalJobData
  >(
    SIGNALS_QUEUE,
    async (job) => {
      const { name } = job;

      if (name === "CollectSectorTrendsJob") {
        return handleCollectSectorTrends(job.data as CollectSectorTrendsJobData);
      }

      if (name === "EnrichProspectSignalsJob") {
        return handleEnrichProspectSignals(job.data as EnrichProspectSignalsJobData);
      }

      if (name === "ProcessExternalSignalJob") {
        return handleProcessExternalSignal(job.data as ProcessExternalSignalJobData);
      }

      throw new Error(`Unknown job name: ${name}`);
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[Signals Worker] Job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Signals Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

/**
 * CollectSectorTrendsJob
 * Recolecta tendencias de Google Trends para todos los sectores activos
 */
async function handleCollectSectorTrends(_data: CollectSectorTrendsJobData) {
  console.log("[Signals Worker] Collecting sector trends...");

  // Obtener sectores únicos de todos los Business activos
  const businesses = await db.business.findMany({
    where: { active: true },
    select: { sector: true, id: true },
  });

  if (businesses.length === 0) {
    console.log("[Signals Worker] No active businesses found");
    return { processed: 0, sectors: [] };
  }

  const uniqueSectors: string[] = Array.from(new Set(businesses.map((b: { sector: string }) => b.sector)));
  console.log(`[Signals Worker] Processing trends for sectors: ${uniqueSectors.join(", ")}`);

  const results: { sector: string; trends: any[]; spike: boolean }[] = [];

  for (const sector of uniqueSectors) {
    try {
      // Obtener tendencias del sector
      const trends = await googleTrendsClient.getSectorTrends(sector);

      // Guardar/actualizar SectorTrend en DB
      for (const trend of trends) {
        await db.sectorTrend.upsert({
          where: {
            sector_keyword_recordedAt: {
              sector,
              keyword: trend.keyword,
              recordedAt: new Date(),
            },
          },
          update: {
            trendScore: trend.score,
            weeklyChange: trend.weeklyChange,
          },
          create: {
            sector,
            keyword: trend.keyword,
            trendScore: trend.score,
            weeklyChange: trend.weeklyChange,
            region: "ES",
          },
        });
      }

      // Detectar spike
      const hasSpike = await googleTrendsClient.detectTrendSpike(sector);

      results.push({ sector, trends, spike: hasSpike });

      // Si hay spike, crear notificaciones para businesses del sector
      if (hasSpike) {
        const topTrend = trends[0];
        const sectorBusinesses = businesses.filter((b: { sector: string; id: string }) => b.sector === sector);

        for (const business of sectorBusinesses) {
          await db.notification.create({
            data: {
              businessId: business.id,
              title: "📈 Pico de búsquedas en tu sector",
              body: `Esta semana hay un aumento del ${Math.abs(topTrend.weeklyChange).toFixed(0)}% en búsquedas de '${topTrend.keyword}'. Buen momento para enviar campañas.`,
              actionUrl: "/dashboard/sequences",
              type: "SYSTEM",
            },
          });
        }
      }
    } catch (error) {
      console.error(`[Signals Worker] Error processing sector ${sector}:`, error);
    }
  }

  return { processed: results.length, sectors: uniqueSectors };
}

/**
 * EnrichProspectSignalsJob
 * Enriquece prospecto con señales de Apollo
 */
async function handleEnrichProspectSignals(data: EnrichProspectSignalsJobData) {
  const { prospectId } = data;
  console.log(`[Signals Worker] Enriching prospect ${prospectId}`);

  // Cargar prospecto
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) {
    throw new Error(`Prospect ${prospectId} not found`);
  }

  if (!prospect.email || !prospect.companyWebsite) {
    return { enriched: false, reason: "Missing email or website" };
  }

  // Inicializar Apollo client
  const apollo = new ApolloClient({
    apiKey: process.env.APOLLO_API_KEY || "",
    mockMode: !process.env.APOLLO_API_KEY,
  });

  let totalBoost = 0;
  const signals: any[] = [];

  try {
    // Obtener señales de empresa
    const domain = new URL(prospect.companyWebsite).hostname.replace("www.", "");
    const companySignals = await apollo.getCompanySignals(domain);

    for (const signal of companySignals) {
      const externalSignal = await db.externalSignal.create({
        data: {
          signalType: signal.signalType,
          source: signal.source,
          data: signal.data,
          intentBoost: signal.intentBoost,
          prospectId: prospect.id,
          detectedAt: new Date(),
        },
      });
      signals.push(externalSignal);
      totalBoost += signal.intentBoost;
    }
  } catch (error) {
    console.warn(`[Signals Worker] Error getting company signals for ${prospectId}:`, error);
  }

  try {
    // Obtener señales de contacto
    const contactSignals = await apollo.getContactSignals(prospect.email);

    for (const signal of contactSignals) {
      const externalSignal = await db.externalSignal.create({
        data: {
          signalType: signal.signalType,
          source: signal.source,
          data: signal.data,
          intentBoost: signal.intentBoost,
          prospectId: prospect.id,
          detectedAt: new Date(),
        },
      });
      signals.push(externalSignal);
      totalBoost += signal.intentBoost;
    }
  } catch (error) {
    console.warn(`[Signals Worker] Error getting contact signals for ${prospectId}:`, error);
  }

  // Calcular nuevo intentScore (máximo boost total: +0.5)
  const maxBoost = 0.5;
  const actualBoost = Math.min(totalBoost, maxBoost);
  const currentScore = prospect.intentScore ?? 0;
  const newIntentScore = Math.min(1, currentScore + actualBoost);

  // Actualizar prospecto
  const newStatus = newIntentScore > 0.5 ? "VALIDATED" : prospect.status;

  await db.prospect.update({
    where: { id: prospectId },
    data: {
      intentScore: newIntentScore,
      status: newStatus,
    },
  });

  return {
    enriched: true,
    signalsCount: signals.length,
    intentScore: newIntentScore,
    status: newStatus,
  };
}

/**
 * ProcessExternalSignalJob
 * Procesa una señal externa existente
 */
async function handleProcessExternalSignal(data: ProcessExternalSignalJobData) {
  const { signalId } = data;
  console.log(`[Signals Worker] Processing external signal ${signalId}`);

  const signal = await db.externalSignal.findUnique({
    where: { id: signalId },
    include: {
      lead: true,
      prospect: true,
    },
  });

  if (!signal) {
    throw new Error(`ExternalSignal ${signalId} not found`);
  }

  // Si tiene lead, encolar recalculación de score
  if (signal.leadId && signal.lead) {
    // Aquí encolaríamos RecalculateLeadScoreJob si existiera
    console.log(`[Signals Worker] Would recalculate score for lead ${signal.leadId}`);
  }

  // Si tiene prospecto, actualizar intentScore
  if (signal.prospectId && signal.prospect) {
    const currentScore = signal.prospect.intentScore ?? 0;
    const newIntentScore = Math.min(1, currentScore + signal.intentBoost);
    const newStatus = newIntentScore > 0.5 ? "VALIDATED" : signal.prospect.status;

    await db.prospect.update({
      where: { id: signal.prospectId },
      data: {
        intentScore: newIntentScore,
        status: newStatus,
      },
    });

    console.log(`[Signals Worker] Updated prospect ${signal.prospectId} intentScore: ${newIntentScore}`);
  }

  // Marcar como procesado
  await db.externalSignal.update({
    where: { id: signalId },
    data: { processedAt: new Date() },
  });

  return { processed: true, signalId };
}
