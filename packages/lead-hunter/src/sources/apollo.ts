/**
 * Cliente Apollo.io API
 * Documentación: https://apolloio.github.io/apollo-api-docs/
 */

import type { RawProspect, ApolloSearchFilters } from '../types.js';

interface ApolloConfig {
  apiKey: string;
  mockMode?: boolean;
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
}
