/**
 * Lead Hunter Engine
 * Clase principal que orquesta todo el proceso de prospección
 */

import { SourceAggregator, type SourceAggregatorConfig } from './sources/index.js';
import { ProspectEnricher } from './enrichment/enricher.js';
import { EmailValidator } from './validation/email-validator.js';
import type { 
  ICP, 
  RawProspect, 
  EnrichedProspect, 
  HuntOptions,
  SourceSearchResult,
  ProspectSource,
} from './types.js';

export interface HunterEngineConfig extends SourceAggregatorConfig {
  enrichment?: {
    skipNormalization?: boolean;
    skipDeduplication?: boolean;
  };
  validation?: {
    skipDisposableCheck?: boolean;
  };
}

export class HunterEngine {
  private sources: SourceAggregator;
  private enricher: ProspectEnricher;
  private validator: EmailValidator;
  private config: HunterEngineConfig;

  constructor(config: HunterEngineConfig) {
    this.config = config;
    
    this.sources = new SourceAggregator({
      apolloApiKey: config.apolloApiKey,
      hunterApiKey: config.hunterApiKey,
      googlePlacesApiKey: config.googlePlacesApiKey,
      mockMode: config.mockMode,
    });
    
    this.enricher = new ProspectEnricher(config.enrichment);
    this.validator = new EmailValidator();
  }

  /**
   * Ejecuta la búsqueda completa de prospectos según un ICP
   * Flujo: Sources → Enrichment → Validation
   */
  async hunt(icp: ICP, options: HuntOptions = {}): Promise<{
    prospects: EnrichedProspect[];
    results: SourceSearchResult[];
    stats: {
      totalFound: number;
      unique: number;
      validated: number;
      corporate: number;
    };
  }> {
    // 1. Buscar desde múltiples fuentes
    const sourceResults = await this.sources.searchFromICP(icp, options);
    
    // 2. Combinar y eliminar duplicados
    const combined = this.sources.combineProspects(sourceResults);
    
    // 3. Enriquecer prospectos
    const enriched = this.enricher.enrich(combined);
    
    // 4. Validar emails (si no se solicita saltar)
    let validated: EnrichedProspect[];
    if (options.skipValidation) {
      validated = enriched;
    } else {
      validated = await this.validator.validateProspects(enriched);
    }

    // 5. Calcular estadísticas
    const stats = {
      totalFound: sourceResults.reduce((sum, r) => sum + r.totalFound, 0),
      unique: combined.length,
      validated: validated.filter(p => p.emailVerified).length,
      corporate: validated.filter(p => {
        const domain = p.email.split('@')[1];
        return domain && this.validator.isCorporateDomain(domain);
      }).length,
    };

    return {
      prospects: validated,
      results: sourceResults,
      stats,
    };
  }

  /**
   * Busca desde una fuente específica
   */
  async huntFromSource(
    icp: ICP, 
    source: ProspectSource, 
    maxResults = 100
  ): Promise<EnrichedProspect[]> {
    const results = await this.sources.searchFromICP(icp, {
      sources: [source],
      maxResults,
    });

    const combined = this.sources.combineProspects(results);
    const enriched = this.enricher.enrich(combined);
    
    return this.validator.validateProspects(enriched);
  }

  /**
   * Enriquece prospectos existentes (por ejemplo, subidos manualmente)
   */
  async enrichExisting(prospects: RawProspect[]): Promise<EnrichedProspect[]> {
    const enriched = this.enricher.enrich(prospects);
    return this.validator.validateProspects(enriched);
  }

  /**
   * Valida una lista de emails
   */
  async validateEmails(emails: string[]): Promise<{
    valid: string[];
    invalid: string[];
    details: Awaited<ReturnType<typeof this.validator.validateMany>>;
  }> {
    const validations = await this.validator.validateMany(emails);
    
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const v of validations) {
      if (v.isValid) {
        valid.push(v.email);
      } else {
        invalid.push(v.email);
      }
    }

    return { valid, invalid, details: validations };
  }

  /**
   * Sugiere correcciones para emails con typos
   */
  suggestEmailCorrections(emails: string[]): Array<{ original: string; suggestion: string }> {
    const suggestions: Array<{ original: string; suggestion: string }> = [];
    
    for (const email of emails) {
      const correction = this.validator.suggestCorrection(email);
      if (correction && correction !== email) {
        suggestions.push({ original: email, suggestion: correction });
      }
    }

    return suggestions;
  }

  /**
   * Genera un reporte de duplicados
   */
  findDuplicates(prospects: RawProspect[]): Map<string, RawProspect[]> {
    return this.enricher.findDuplicates(prospects);
  }

  /**
   * Filtra prospectos por criterios de calidad
   */
  filterQualityProspects(
    prospects: EnrichedProspect[], 
    minScore = 0.5,
    requireCorporate = false
  ): EnrichedProspect[] {
    return prospects.filter(p => {
      const scoreOk = (p.intentScore || 0) >= minScore;
      const corporateOk = !requireCorporate || (
        p.email && this.validator.isCorporateDomain(p.email.split('@')[1] || '')
      );
      return scoreOk && corporateOk;
    });
  }

  /**
   * Ordena prospectos por potencial (score de intención)
   */
  sortByPotential(prospects: EnrichedProspect[]): EnrichedProspect[] {
    return [...prospects].sort((a, b) => {
      const scoreA = a.intentScore || 0;
      const scoreB = b.intentScore || 0;
      return scoreB - scoreA;
    });
  }
}
