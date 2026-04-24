/**
 * Signals Scheduler - FASE 18E
 * Registra el scheduler para recolectar tendencias de sectores
 */

import { addCollectSectorTrendsJob } from "../queues/signals.queue.js";

/**
 * Registra el scheduler que recolecta tendencias cada 6 horas
 */
export async function registerSignalsScheduler(): Promise<void> {
  try {
    // Añadir job repetitivo para recolectar tendencias
    await addCollectSectorTrendsJob();
    console.log("[Signals Scheduler] Registered - collecting sector trends every 6 hours");
  } catch (error) {
    console.error("[Signals Scheduler] Failed to register:", error);
    throw error;
  }
}
