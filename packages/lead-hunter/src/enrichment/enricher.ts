/**
 * Enriquecedor de prospectos
 * Normaliza, deduplica y enriquece datos de prospectos
 */

import type { RawProspect, EnrichedProspect } from '../types.js';

export interface EnrichmentConfig {
  skipNormalization?: boolean;
  skipDeduplication?: boolean;
}

export class ProspectEnricher {
  private config: EnrichmentConfig;

  constructor(config: EnrichmentConfig = {}) {
    this.config = config;
  }

  /**
   * Enriquece una lista de prospectos
   */
  enrich(prospects: RawProspect[]): EnrichedProspect[] {
    // 1. Deduplicar por email
    const deduplicated = this.config.skipDeduplication
      ? prospects
      : this.deduplicateByEmail(prospects);

    // 2. Enriquecer cada prospecto
    return deduplicated.map(prospect => this.enrichSingle(prospect));
  }

  /**
   * Deduplica prospectos por email
   * Mantiene el primero (que debería ser de la fuente con mejor calidad)
   */
  private deduplicateByEmail(prospects: RawProspect[]): RawProspect[] {
    const seen = new Set<string>();
    const duplicates: RawProspect[] = [];
    const unique: RawProspect[] = [];

    for (const prospect of prospects) {
      const email = prospect.email.toLowerCase().trim();
      
      if (seen.has(email)) {
        duplicates.push(prospect);
      } else {
        seen.add(email);
        unique.push(prospect);
      }
    }

    return unique;
  }

  /**
   * Enriquece un solo prospecto
   */
  private enrichSingle(prospect: RawProspect): EnrichedProspect {
    const enriched: EnrichedProspect = { ...prospect };

    if (!this.config.skipNormalization) {
      // Normalizar nombre
      enriched.normalizedName = this.normalizeName(
        prospect.firstName,
        prospect.lastName
      );

      // Normalizar empresa
      enriched.normalizedCompany = this.normalizeCompany(
        prospect.companyName,
        prospect.companyWebsite
      );
    }

    // Calcular score de intención basado en datos disponibles
    enriched.intentScore = this.calculateIntentScore(prospect);

    // Extraer datos de enriquecimiento
    enriched.enrichmentData = this.extractEnrichmentData(prospect);

    return enriched;
  }

  /**
   * Normaliza un nombre completo
   */
  private normalizeName(firstName?: string, lastName?: string): string {
    const parts: string[] = [];
    
    if (firstName) {
      parts.push(this.capitalize(firstName.trim()));
    }
    
    if (lastName) {
      parts.push(this.capitalize(lastName.trim()));
    }

    return parts.join(' ');
  }

  /**
   * Normaliza el nombre de una empresa
   */
  private normalizeCompany(companyName?: string, website?: string): string {
    if (companyName) {
      return this.capitalize(companyName.trim());
    }

    if (website) {
      try {
        const domain = new URL(website).hostname.replace(/^www\./, '');
        return domain
          .split('.')[0]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      } catch {
        // Ignorar URLs inválidas
      }
    }

    return 'Unknown Company';
  }

  /**
   * Capitaliza la primera letra de cada palabra
   */
  private capitalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Calcula un score de intención basado en la calidad de los datos
   */
  private calculateIntentScore(prospect: RawProspect): number {
    let score = 0.5; // Base

    // Tiene nombre completo
    if (prospect.firstName && prospect.lastName) score += 0.1;
    else if (prospect.firstName || prospect.lastName) score += 0.05;

    // Tiene rol
    if (prospect.role) {
      const roleLower = prospect.role.toLowerCase();
      if (roleLower.includes('director') || roleLower.includes('ceo') || roleLower.includes('founder')) {
        score += 0.15;
      } else if (roleLower.includes('manager') || roleLower.includes('head')) {
        score += 0.1;
      } else {
        score += 0.05;
      }
    }

    // Tiene teléfono
    if (prospect.phone) score += 0.05;

    // Tiene website de empresa
    if (prospect.companyWebsite) score += 0.05;

    // Fuente de alta calidad
    if (prospect.source === 'APOLLO') score += 0.1;
    else if (prospect.source === 'HUNTER') score += 0.05;

    // Asegurar que esté entre 0 y 1
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Extrae datos de enriquecimiento del rawData
   */
  private extractEnrichmentData(prospect: RawProspect): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (prospect.rawData && typeof prospect.rawData === 'object') {
      const raw = prospect.rawData as Record<string, unknown>;

      // Extraer campos relevantes según la fuente
      if (prospect.source === 'APOLLO') {
        data.seniority = raw.seniority;
        data.department = raw.department;
        data.industry = raw.industry;
        data.location = raw.location;
      } else if (prospect.source === 'HUNTER') {
        data.confidence = raw.confidence;
        data.seniority = raw.seniority;
        data.department = raw.department;
        data.emailType = raw.type;
      } else if (prospect.source === 'GOOGLE_MAPS') {
        data.rating = raw.rating;
        data.totalReviews = raw.totalReviews;
        data.address = raw.address;
        data.placeId = raw.placeId;
      }
    }

    return data;
  }

  /**
   * Encuentra duplicados en una lista de prospectos
   * Útil para reportar al usuario
   */
  findDuplicates(prospects: RawProspect[]): Map<string, RawProspect[]> {
    const byEmail = new Map<string, RawProspect[]>();

    for (const prospect of prospects) {
      const email = prospect.email.toLowerCase().trim();
      
      if (!byEmail.has(email)) {
        byEmail.set(email, []);
      }
      
      byEmail.get(email)!.push(prospect);
    }

    // Solo retornar los que tienen duplicados
    const duplicates = new Map<string, RawProspect[]>();
    for (const [email, list] of byEmail) {
      if (list.length > 1) {
        duplicates.set(email, list);
      }
    }

    return duplicates;
  }
}
