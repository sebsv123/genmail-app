/**
 * Cliente Apollo.io API
 * Documentación: https://apolloio.github.io/apollo-api-docs/
 */

import type { RawProspect, ApolloSearchFilters } from '../types.js';

interface ApolloConfig {
  apiKey: string;
  mockMode?: boolean;
}

// Tipos para señales externas (FASE 18C)
export interface ExternalSignalData {
  signalType: 'COMPANY_HIRING' | 'COMPANY_GREW' | 'JOB_CHANGE' | 'FUNDING_ROUND';
  source: 'apollo';
  intentBoost: number;
  data: Record<string, any>;
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  organization?: {
    name?: string;
    website_url?: string;
    primary_phone?: {
      number?: string;
    };
  };
  phone_numbers?: Array<{ number?: string }>;
  linkedin_url?: string;
}

export class ApolloClient {
  private apiKey: string;
  private mockMode: boolean;
  private baseUrl = 'https://api.apollo.io/v1';

  constructor(config: ApolloConfig) {
    this.apiKey = config.apiKey;
    this.mockMode = config.mockMode || !config.apiKey;
  }

  /**
   * Busca personas por título, industria y ubicación
   */
  async searchPeople(filters: ApolloSearchFilters, maxResults = 100): Promise<RawProspect[]> {
    if (this.mockMode) {
      return this.generateMockProspects(filters, maxResults);
    }

    try {
      const response = await fetch(`${this.baseUrl}/mixed_people/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          person_titles: filters.personTitles,
          person_locations: filters.personLocations,
          organization_industry_tag_ids: filters.organizationIndustryTagIds,
          organization_num_employees_ranges: filters.organizationNumEmployeesRanges,
          q_keywords: filters.qKeywords,
          per_page: Math.min(maxResults, 100),
        }),
      });

      if (!response.ok) {
        throw new Error(`Apollo API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapApolloPeopleToProspects(data.people || []);
    } catch (error) {
      console.error('Apollo search failed:', error);
      // Fallback a mock en caso de error
      return this.generateMockProspects(filters, maxResults);
    }
  }

  /**
   * Mapea respuesta de Apollo a RawProspect
   */
  private mapApolloPeopleToProspects(people: ApolloPerson[]): RawProspect[] {
    return people
      .filter(p => p.email) // Solo incluir con email
      .map(person => ({
        email: person.email!,
        firstName: person.first_name,
        lastName: person.last_name,
        companyName: person.organization?.name,
        companyWebsite: person.organization?.website_url,
        role: person.title,
        phone: person.phone_numbers?.[0]?.number || person.organization?.primary_phone?.number,
        source: 'APOLLO' as const,
        sourceUrl: person.linkedin_url,
        rawData: person as unknown,
      }));
  }

  /**
   * Genera prospectos mock para desarrollo
   */
  private generateMockProspects(filters: ApolloSearchFilters, count: number): RawProspect[] {
    const titles = filters.personTitles || ['Director', 'Manager', 'CEO'];
    const locations = filters.personLocations || ['Madrid, Spain', 'Barcelona, Spain'];
    const industries = ['Software', 'Consulting', 'Healthcare', 'E-commerce'];
    
    const prospects: RawProspect[] = [];
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const title = titles[i % titles.length];
      const location = locations[i % locations.length];
      const industry = industries[i % industries.length];
      
      prospects.push({
        email: `contact${i + 1}@${industry.toLowerCase().replace('-', '')}-demo.es`,
        firstName: ['Javier', 'María', 'Carlos', 'Ana', 'Pedro'][i % 5],
        lastName: ['García', 'López', 'Martínez', 'Fernández', 'Sánchez'][i % 5],
        companyName: `${industry} Solutions ${String.fromCharCode(65 + i)}`,
        companyWebsite: `https://${industry.toLowerCase().replace('-', '')}${i + 1}.es`,
        role: title,
        phone: `+34 600 ${String(100000 + i * 111).slice(1)}`,
        source: 'APOLLO',
        sourceUrl: `https://linkedin.com/in/demo-contact-${i + 1}`,
        rawData: {
          title,
          location,
          industry,
          seniority: 'Manager',
          department: 'Sales',
        },
      });
    }
    
    return prospects;
  }

  // ==================== EXTERNAL SIGNALS (FASE 18C) ====================

  /**
   * Obtiene señales de la empresa (crecimiento, hiring, funding)
   * SIEMPRE devuelve array, nunca lanza error
   */
  async getCompanySignals(domain: string): Promise<ExternalSignalData[]> {
    if (this.mockMode) {
      return []; // En mock mode no hay señales reales
    }

    const signals: ExternalSignalData[] = [];

    try {
      // Enriquecer organización por dominio
      const response = await fetch(`${this.baseUrl}/organizations/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        console.warn(`Apollo enrich failed for ${domain}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const org = data.organization;

      if (!org) return [];

      // Detectar crecimiento (headcount creció >20% en 6 meses)
      if (org.employee_count && org.employee_count_6_months_ago) {
        const growth = (org.employee_count - org.employee_count_6_months_ago) / org.employee_count_6_months_ago;
        if (growth > 0.20) {
          signals.push({
            signalType: 'COMPANY_GREW',
            source: 'apollo',
            intentBoost: 0.25,
            data: {
              growth_percentage: Math.round(growth * 100),
              headcount: org.employee_count,
              previous_headcount: org.employee_count_6_months_ago
            }
          });
        }
      }

      // Detectar hiring activo
      if (org.job_postings_count && org.job_postings_count > 0) {
        signals.push({
          signalType: 'COMPANY_HIRING',
          source: 'apollo',
          intentBoost: 0.20,
          data: {
            open_positions: org.job_postings_count,
            hiring_departments: org.hiring_departments || []
          }
        });
      }

      // Detectar funding reciente
      if (org.recently_funded && org.latest_funding_date) {
        const fundingDate = new Date(org.latest_funding_date);
        const monthsSinceFunding = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsSinceFunding <= 12) {
          signals.push({
            signalType: 'FUNDING_ROUND',
            source: 'apollo',
            intentBoost: 0.30,
            data: {
              amount: org.latest_funding_amount,
              round: org.latest_funding_round,
              date: org.latest_funding_date
            }
          });
        }
      }

    } catch (error) {
      console.warn(`Error getting company signals for ${domain}:`, error);
    }

    return signals;
  }

  /**
   * Obtiene señales del contacto (cambio de trabajo reciente)
   * SIEMPRE devuelve array, nunca lanza error
   */
  async getContactSignals(email: string): Promise<ExternalSignalData[]> {
    if (this.mockMode) {
      return [];
    }

    const signals: ExternalSignalData[] = [];

    try {
      const response = await fetch(`${this.baseUrl}/people/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        console.warn(`Apollo people match failed for ${email}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const person = data.person;

      if (!person || !person.started_at) return [];

      const startedAt = new Date(person.started_at);
      const monthsInRole = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

      // Cambio de trabajo en últimos 3 meses
      if (monthsInRole <= 3) {
        signals.push({
          signalType: 'JOB_CHANGE',
          source: 'apollo',
          intentBoost: 0.35,
          data: {
            new_role: person.title,
            new_company: person.organization?.name,
            started_at: person.started_at,
            months_in_role: Math.round(monthsInRole)
          }
        });
      }

    } catch (error) {
      console.warn(`Error getting contact signals for ${email}:`, error);
    }

    return signals;
  }
}
