/**
 * Tipos del dominio Lead Hunter
 */

// Fuente de prospección
export type ProspectSource = 'LINKEDIN' | 'GOOGLE_MAPS' | 'APOLLO' | 'HUNTER' | 'DIRECTORY' | 'MANUAL';

// ICP (Ideal Customer Profile)
export interface ICP {
  id: string;
  businessId: string;
  sector: string;
  targetRole: string;
  companySize?: string;
  painPoints: string[];
  location?: string;
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Prospecto crudo (directo de fuentes)
export interface RawProspect {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyWebsite?: string;
  role?: string;
  phone?: string;
  source: ProspectSource;
  sourceUrl?: string;
  rawData?: unknown;
}

// Prospecto enriquecido (después de procesar)
export interface EnrichedProspect extends RawProspect {
  id?: string;
  intentScore?: number;
  enrichmentData?: Record<string, unknown>;
  emailVerified?: boolean;
  emailVerificationDetails?: {
    formatValid: boolean;
    mxValid: boolean;
    domain: string;
    reason?: string;
  };
  duplicates?: string[];
  normalizedName?: string;
  normalizedCompany?: string;
}

// Configuración del HunterEngine
export interface HunterConfig {
  apolloApiKey?: string;
  hunterApiKey?: string;
  googlePlacesApiKey?: string;
  mockMode?: boolean;
}

// Resultados de búsqueda por fuente
export interface SourceSearchResult {
  source: ProspectSource;
  prospects: RawProspect[];
  totalFound: number;
  errors?: string[];
}

// Opciones de búsqueda
export interface HuntOptions {
  maxResults?: number;
  sources?: ProspectSource[];
  skipEnrichment?: boolean;
  skipValidation?: boolean;
}

// Filtros de Apollo API
export interface ApolloSearchFilters {
  personTitles?: string[];
  personLocations?: string[];
  organizationIndustryTagIds?: string[];
  organizationNumEmployeesRanges?: string[];
  qKeywords?: string;
}

// Filtros de Google Places
export interface GooglePlacesFilters {
  query: string;
  location: string;
  radius?: number;
  type?: string;
}
