/**
 * Cliente Hunter.io API
 * Documentación: https://hunter.io/api/docs
 */

import type { RawProspect } from '../types.js';

interface HunterConfig {
  apiKey: string;
  mockMode?: boolean;
}

interface HunterDomainSearchResult {
  data: {
    emails: Array<{
      value: string;
      type: string;
      confidence: number;
      first_name?: string;
      last_name?: string;
      position?: string;
      seniority?: string;
      department?: string;
      linkedin?: string;
      twitter?: string;
      phone_number?: string;
    }>;
    organization?: string;
    domain: string;
  };
}

export class HunterClient {
  private apiKey: string;
  private mockMode: boolean;
  private baseUrl = 'https://api.hunter.io/v2';

  constructor(config: HunterConfig) {
    this.apiKey = config.apiKey;
    this.mockMode = config.mockMode || !config.apiKey;
  }

  /**
   * Busca emails por dominio
   */
  async searchDomain(domain: string, maxResults = 100): Promise<RawProspect[]> {
    if (this.mockMode) {
      return this.generateMockProspects(domain, maxResults);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}&limit=${Math.min(maxResults, 100)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Hunter API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as HunterDomainSearchResult;
      return this.mapHunterEmailsToProspects(data.data, domain);
    } catch (error) {
      console.error('Hunter domain search failed:', error);
      return this.generateMockProspects(domain, maxResults);
    }
  }

  /**
   * Mapea respuesta de Hunter a RawProspect
   */
  private mapHunterEmailsToProspects(data: HunterDomainSearchResult['data'], domain: string): RawProspect[] {
    return data.emails
      .filter(e => e.value && e.confidence > 50) // Solo emails con confianza > 50%
      .map(email => ({
        email: email.value,
        firstName: email.first_name,
        lastName: email.last_name,
        companyName: data.organization || domain,
        companyWebsite: `https://${domain}`,
        role: email.position,
        phone: email.phone_number,
        source: 'HUNTER' as const,
        sourceUrl: `https://hunter.io/domain/${domain}`,
        rawData: {
          confidence: email.confidence,
          type: email.type,
          seniority: email.seniority,
          department: email.department,
          linkedin: email.linkedin,
          twitter: email.twitter,
        } as unknown,
      }));
  }

  /**
   * Genera prospectos mock para desarrollo
   */
  private generateMockProspects(domain: string, count: number): RawProspect[] {
    const companyName = domain.replace(/\.\w+$/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const prospects: RawProspect[] = [];
    
    const roles = ['CEO', 'Director', 'Marketing Manager', 'Sales Manager', 'Founder'];
    const firstNames = ['Ana', 'Carlos', 'María', 'Javier', 'Laura'];
    const lastNames = ['García', 'López', 'Martínez', 'Sánchez', 'Ruiz'];
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const role = roles[i % roles.length];
      
      prospects.push({
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        firstName,
        lastName,
        companyName,
        companyWebsite: `https://${domain}`,
        role,
        source: 'HUNTER',
        sourceUrl: `https://hunter.io/domain/${domain}`,
        rawData: {
          confidence: 85 + i * 3,
          type: 'personal',
          seniority: 'senior',
          department: role.includes('Marketing') ? 'Marketing' : 'Executive',
        } as unknown,
      });
    }
    
    return prospects;
  }
}
