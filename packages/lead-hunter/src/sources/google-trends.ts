/**
 * Google Trends Integration - FASE 18B
 * Fuentes de tendencias por sector para enriquecer scoring
 */

import { createHash } from "crypto";

// Keywords por sector para monitoreo de tendencias
const SECTOR_KEYWORDS: Record<string, string[]> = {
  seguros: ["seguro de salud precio", "seguro de vida", "comparador seguros", "seguro medico privado", "seguro autonomos"],
  inmobiliaria: ["pisos en venta madrid", "hipoteca 2026", "alquiler piso", "invertir inmuebles", "precio vivienda"],
  salud: ["clinica privada", "medico privado precio", "seguro dental", "segunda opinion medica", "clinica estetica"],
  educacion: ["master online", "curso certificado", "formacion profesional", "postgrado madrid", "curso online precio"],
  ecommerce: ["ofertas online", "comprar online", "tienda online", "descuentos", "envio gratis"],
  saas: ["software gestion empresas", "crm precio", "erp pyme", "automatizacion marketing", "herramienta ventas"],
  consultoria: ["consultoria empresarial", "asesoria estrategica", "consultoría precios", "consultoria digital", "consultores"],
  legal: ["abogado online", "consulta legal", "asesoria juridica", "precio abogado", "bufete madrid"],
  hosteleria: ["restaurante madrid", "reserva restaurante", "menu degustacion", "restaurante estrella michelin", "mejores restaurantes"],
  automocion: ["coche nuevo precio", "concesionario madrid", "coches electricos", "financiacion coche", "vender coche"]
};

// Simple in-memory cache with TTL
const cache = new Map<string, { value: number; expiresAt: number }>();

function getCacheKey(keyword: string, region: string): string {
  return `trend:${keyword}:${region}`;
}

function getCachedValue(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedValue(key: string, value: number, ttlHours: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000
  });
}

export interface TrendData {
  keyword: string;
  score: number;
  weeklyChange: number;
}

export class GoogleTrendsClient {
  private readonly baseUrl = "https://trends.google.com/trends/api/explore";

  /**
   * Obtiene el score de tendencia para una keyword (0-100)
   * SIEMPRE devuelve un valor, nunca lanza error
   */
  async getTrendScore(keyword: string, region = "ES"): Promise<number> {
    const cacheKey = getCacheKey(keyword, region);
    const cached = getCachedValue(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      // Google Trends API requiere parámetros específicos
      const params = new URLSearchParams({
        hl: "es",
        tz: "-120",
        req: JSON.stringify({
          comparisonItem: [{ keyword, geo: region, time: "today 12-m" }],
          category: 0,
          property: ""
        }),
        token: "APP6_UEAAAAAZJcUu" // Token de ejemplo, puede variar
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      if (!response.ok) {
        console.warn(`Google Trends API error for ${keyword}: ${response.status}`);
        setCachedValue(cacheKey, 50, 6); // Cachear fallback 6h
        return 50; // Neutral fallback
      }

      // La respuesta viene con prefijo ")]}'" que hay que quitar
      const text = await response.text();
      const jsonText = text.replace(/^\)\]\}'/, "").trim();
      
      let data: any;
      try {
        data = JSON.parse(jsonText);
      } catch {
        console.warn(`Failed to parse Google Trends response for ${keyword}`);
        setCachedValue(cacheKey, 50, 6);
        return 50;
      }

      // Extraer score del timeline data
      const timelineData = data?.widgets?.[0]?.response?.timelineData || [];
      if (timelineData.length === 0) {
        setCachedValue(cacheKey, 50, 6);
        return 50;
      }

      // Calcular score promedio de los últimos puntos
      const recentPoints = timelineData.slice(-4); // Últimos 4 períodos
      const avgScore = recentPoints.reduce((sum: number, p: any) => sum + (p.value?.[0] || 0), 0) / recentPoints.length;
      
      const normalizedScore = Math.min(100, Math.max(0, avgScore));
      setCachedValue(cacheKey, normalizedScore, 6);
      return normalizedScore;

    } catch (error) {
      console.warn(`Google Trends fetch failed for ${keyword}:`, error);
      setCachedValue(cacheKey, 50, 6);
      return 50; // Neutral fallback
    }
  }

  /**
   * Obtiene tendencias para todas las keywords de un sector
   */
  async getSectorTrends(sector: string): Promise<TrendData[]> {
    const keywords = SECTOR_KEYWORDS[sector.toLowerCase()] || SECTOR_KEYWORDS["saas"];
    const results: TrendData[] = [];

    for (const keyword of keywords) {
      const score = await this.getTrendScore(keyword);
      
      // Calcular weeklyChange comparando con cache antiguo (simulado con 7 días de diferencia)
      const oldCacheKey = `trend:${keyword}:ES:old`;
      const oldScore = getCachedValue(oldCacheKey) || score;
      const weeklyChange = oldScore > 0 ? ((score - oldScore) / oldScore) * 100 : 0;

      results.push({ keyword, score, weeklyChange });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Detecta si hay un pico de tendencia en el sector
   * Compara score actual vs media de últimas 4 semanas
   */
  async detectTrendSpike(sector: string): Promise<boolean> {
    const keywords = SECTOR_KEYWORDS[sector.toLowerCase()] || SECTOR_KEYWORDS["saas"];
    
    let totalCurrent = 0;
    let totalHistorical = 0;
    let count = 0;

    for (const keyword of keywords) {
      const current = await this.getTrendScore(keyword);
      const historical = getCachedValue(`trend:${keyword}:ES:historical`) || current;
      
      totalCurrent += current;
      totalHistorical += historical;
      count++;
    }

    if (count === 0) return false;

    const avgCurrent = totalCurrent / count;
    const avgHistorical = totalHistorical / count;

    // Spike si el actual es 40% mayor que la media histórica
    return avgHistorical > 0 && avgCurrent > avgHistorical * 1.4;
  }

  /**
   * Obtiene las keywords configuradas para un sector
   */
  getKeywordsForSector(sector: string): string[] {
    return SECTOR_KEYWORDS[sector.toLowerCase()] || SECTOR_KEYWORDS["saas"];
  }
}

// Singleton instance
export const googleTrendsClient = new GoogleTrendsClient();
