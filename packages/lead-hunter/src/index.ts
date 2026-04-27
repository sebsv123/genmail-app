/**
 * Lead Hunter - Sistema de captación automática de prospectos
 * 
 * @packageDocumentation
 * 
 * Este paquete proporciona:
 * - Integración con múltiples fuentes de prospección (Apollo, Hunter, Google Maps)
 * - Enriquecimiento y normalización de datos
 * - Validación de emails sin SMTP
 * - Orquestación del proceso completo de hunting
 * 
 * @example
 * ```typescript
 * import { HunterEngine } from '@genmail/lead-hunter';
 * 
 * const engine = new HunterEngine({
 *   apolloApiKey: process.env.APOLLO_API_KEY,
 *   hunterApiKey: process.env.HUNTER_API_KEY,
 *   googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
 * });
 * 
 * const icp = {
 *   sector: 'Clínicas dentales Madrid',
 *   targetRole: 'Director',
 *   location: 'Madrid, España',
 *   keywords: ['clínica dental', 'odontología'],
 *   painPoints: ['Falta de pacientes', 'Baja conversión web'],
 * };
 * 
 * const { prospects, stats } = await engine.hunt(icp, { maxResults: 100 });
 * console.log(`Encontrados ${stats.validated} prospectos validados`);
 * ```
 */

// ==================== TYPES ====================
export type {
  ProspectSource,
  ICP,
  RawProspect,
  EnrichedProspect,
  HunterConfig,
  SourceSearchResult,
  HuntOptions,
  ApolloSearchFilters,
  GooglePlacesFilters,
} from './types.js';

// ==================== ENGINE ====================
export { HunterEngine, type HunterEngineConfig } from './hunter-engine.js';

// ==================== SOURCES ====================
export { 
  SourceAggregator, 
  type SourceAggregatorConfig,
  ApolloClient,
  HunterClient,
  GoogleMapsClient,
  GoogleTrendsClient,
  googleTrendsClient,
  type TrendData,
} from './sources/index.js';

// ==================== ENRICHMENT ====================
export { 
  ProspectEnricher, 
  type EnrichmentConfig,
} from './enrichment/enricher.js';

// ==================== VALIDATION ====================
export { 
  EmailValidator, 
  type ValidationResult,
} from './validation/email-validator.js';

// ==================== VERSION ====================
export const VERSION = '0.1.0';
