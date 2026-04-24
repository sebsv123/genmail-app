/**
 * Orquestador de fuentes de prospección
 * Combina Apollo, Hunter y Google Maps
 */

import { ApolloClient } from './apollo.js';
import { HunterClient } from './hunter.js';
import { GoogleMapsClient } from './google-maps.js';
import type { 
  RawProspect, 
  SourceSearchResult, 
  ICP, 
  ProspectSource,
  HuntOptions,
} from '../types.js';

export interface SourceAggregatorConfig {
  apolloApiKey?: string;
  hunterApiKey?: string;
  googlePlacesApiKey?: string;
  mockMode?: boolean;
}

export class SourceAggregator {
  private apollo: ApolloClient;
  private hunter: HunterClient;
  private googleMaps: GoogleMapsClient;
  private config: SourceAggregatorConfig;

  constructor(config: SourceAggregatorConfig) {
    this.config = config;
    
    this.apollo = new ApolloClient({
      apiKey: config.apolloApiKey || '',
      mockMode: config.mockMode || !config.apolloApiKey,
    });
    
    this.hunter = new HunterClient({
      apiKey: config.hunterApiKey || '',
      mockMode: config.mockMode || !config.hunterApiKey,
    });
    
    this.googleMaps = new GoogleMapsClient({
      apiKey: config.googlePlacesApiKey || '',
      mockMode: config.mockMode || !config.googlePlacesApiKey,
    });
  }

  /**
   * Busca prospectos desde múltiples fuentes según el ICP
   */
  async searchFromICP(icp: ICP, options: HuntOptions = {}): Promise<SourceSearchResult[]> {
    const maxResults = options.maxResults || 100;
    const sources = options.sources || ['APOLLO', 'GOOGLE_MAPS', 'HUNTER'];
    
    const results: SourceSearchResult[] = [];
    const errors: string[] = [];

    // 1. Apollo.io - Buscar por título e industria
    if (sources.includes('APOLLO')) {
      try {
        const apolloProspects = await this.apollo.searchPeople({
          personTitles: icp.targetRole ? [icp.targetRole] : undefined,
          personLocations: icp.location ? [icp.location] : undefined,
          qKeywords: icp.keywords?.join(' '),
          organizationNumEmployeesRanges: icp.companySize ? [icp.companySize] : undefined,
        }, Math.floor(maxResults / sources.length));
        
        results.push({
          source: 'APOLLO',
          prospects: apolloProspects,
          totalFound: apolloProspects.length,
        });
      } catch (error) {
        errors.push(`Apollo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Google Maps - Buscar negocios por sector y ubicación
    if (sources.includes('GOOGLE_MAPS')) {
      try {
        const mapsProspects = await this.googleMaps.searchPlaces({
          query: icp.sector,
          location: icp.location || 'Madrid, Spain',
          type: 'establishment',
        }, Math.floor(maxResults / sources.length));
        
        results.push({
          source: 'GOOGLE_MAPS',
          prospects: mapsProspects,
          totalFound: mapsProspects.length,
        });
      } catch (error) {
        errors.push(`Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 3. Hunter.io - Buscar emails por dominio (si tenemos websites de Maps)
    if (sources.includes('HUNTER')) {
      try {
        // Extraer dominios únicos de los prospects de Google Maps
        const domains = new Set<string>();
        const mapsResults = results.find(r => r.source === 'GOOGLE_MAPS');
        
        if (mapsResults) {
          for (const prospect of mapsResults.prospects.slice(0, 5)) {
            if (prospect.companyWebsite) {
              try {
                const domain = new URL(prospect.companyWebsite).hostname.replace(/^www\./, '');
                if (!domains.has(domain)) {
                  domains.add(domain);
                  const hunterProspects = await this.hunter.searchDomain(domain, 5);
                  
                  // Agregar resultados de Hunter a los resultados existentes
                  const hunterResult: SourceSearchResult = {
                    source: 'HUNTER',
                    prospects: hunterProspects,
                    totalFound: hunterProspects.length,
                  };
                  results.push(hunterResult);
                }
              } catch {
                // Ignorar URLs inválidas
              }
            }
          }
        }
        
        // Si no hay dominios de Maps, generar mock
        if (domains.size === 0 && this.config.mockMode) {
          const mockDomains = [
            'dentalcare-madrid.es',
            'sonrisasdental.es',
            'implantespremium.com',
          ];
          
          for (const domain of mockDomains) {
            const hunterProspects = await this.hunter.searchDomain(domain, 3);
            results.push({
              source: 'HUNTER',
              prospects: hunterProspects,
              totalFound: hunterProspects.length,
            });
          }
        }
      } catch (error) {
        errors.push(`Hunter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Combina prospectos de todas las fuentes eliminando duplicados por email
   */
  combineProspects(results: SourceSearchResult[]): RawProspect[] {
    const seenEmails = new Set<string>();
    const combined: RawProspect[] = [];

    // Ordenar fuentes por prioridad (Apollo tiene mejor calidad de datos)
    const priority: ProspectSource[] = ['APOLLO', 'HUNTER', 'GOOGLE_MAPS', 'LINKEDIN', 'DIRECTORY', 'MANUAL'];
    
    const sortedResults = [...results].sort((a, b) => {
      return priority.indexOf(a.source) - priority.indexOf(b.source);
    });

    for (const result of sortedResults) {
      for (const prospect of result.prospects) {
        const email = prospect.email.toLowerCase().trim();
        
        if (!seenEmails.has(email)) {
          seenEmails.add(email);
          combined.push(prospect);
        }
      }
    }

    return combined;
  }
}

// Re-export clients
export { ApolloClient } from './apollo.js';
export { HunterClient } from './hunter.js';
export { GoogleMapsClient } from './google-maps.js';
export { GoogleTrendsClient, googleTrendsClient } from './google-trends.js';
export type { TrendData } from './google-trends.js';
