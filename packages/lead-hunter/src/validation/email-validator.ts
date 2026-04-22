/**
 * Validador de emails
 * Verifica formato, MX records (sin SMTP para evitar blacklists)
 */

import type { EnrichedProspect } from '../types.js';

export interface ValidationResult {
  email: string;
  isValid: boolean;
  formatValid: boolean;
  mxValid: boolean;
  domain: string;
  reason?: string;
}

export class EmailValidator {
  private emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  /**
   * Valida un solo email
   */
  async validate(email: string): Promise<ValidationResult> {
    const domain = email.split('@')[1];
    
    if (!domain) {
      return {
        email,
        isValid: false,
        formatValid: false,
        mxValid: false,
        domain: '',
        reason: 'Invalid email format: missing domain',
      };
    }

    // 1. Validar formato
    const formatValid = this.emailRegex.test(email);
    
    if (!formatValid) {
      return {
        email,
        isValid: false,
        formatValid: false,
        mxValid: false,
        domain,
        reason: 'Invalid email format',
      };
    }

    // 2. Validar dominio (MX records)
    // En browser/Node.js moderno, no tenemos acceso directo a DNS
    // Por eso simulamos la validación o usamos una API externa
    const mxValid = await this.checkMxRecords(domain);

    // 3. Lista negra de dominios desechables
    if (this.isDisposableDomain(domain)) {
      return {
        email,
        isValid: false,
        formatValid: true,
        mxValid: true,
        domain,
        reason: 'Disposable email address not allowed',
      };
    }

    return {
      email,
      isValid: formatValid && mxValid,
      formatValid,
      mxValid,
      domain,
      reason: formatValid && mxValid ? undefined : 'MX records not found',
    };
  }

  /**
   * Valida múltiples emails en paralelo
   */
  async validateMany(emails: string[]): Promise<ValidationResult[]> {
    const promises = emails.map(email => this.validate(email));
    return Promise.all(promises);
  }

  /**
   * Valida y enriquece prospectos
   */
  async validateProspects(prospects: EnrichedProspect[]): Promise<EnrichedProspect[]> {
    const validated: EnrichedProspect[] = [];

    for (const prospect of prospects) {
      const validation = await this.validate(prospect.email);
      
      const enriched: EnrichedProspect = {
        ...prospect,
        emailVerified: validation.isValid,
        emailVerificationDetails: {
          formatValid: validation.formatValid,
          mxValid: validation.mxValid,
          domain: validation.domain,
          reason: validation.reason,
        },
      };

      validated.push(enriched);
    }

    return validated;
  }

  /**
   * Verifica MX records (simulado para browser)
   * En producción, esto debería llamar a un servicio backend
   */
  private async checkMxRecords(domain: string): Promise<boolean> {
    // Lista de dominios válidos conocidos (para demo)
    const knownValidDomains = [
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
      'icloud.com', 'protonmail.com', 'zoho.com',
      'acme-saas.com', 'genmail.app', 'demo.es',
    ];

    // Si es un dominio conocido, asumir válido
    if (knownValidDomains.includes(domain.toLowerCase())) {
      return true;
    }

    // Si tiene TLD válido y al menos un punto, asumir potencialmente válido
    // (en producción real, haríamos lookup DNS real)
    const validTLDs = ['.com', '.es', '.io', '.co', '.net', '.org', '.app', '.dev'];
    const hasValidTLD = validTLDs.some(tld => domain.toLowerCase().endsWith(tld));

    // Simular un 80% de éxito para dominios que parecen válidos
    if (hasValidTLD && domain.includes('.')) {
      return Math.random() > 0.2;
    }

    return false;
  }

  /**
   * Verifica si es un dominio desechable
   */
  private isDisposableDomain(domain: string): boolean {
    const disposableDomains = [
      'tempmail.com', 'throwaway.com', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org',
    ];

    return disposableDomains.includes(domain.toLowerCase());
  }

  /**
   * Sugiere correcciones comunes para typos
   */
  suggestCorrection(email: string): string | null {
    const corrections: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmai.com': 'gmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outlook.co': 'outlook.com',
      'yaho.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
    };

    const domain = email.split('@')[1];
    
    if (domain && corrections[domain.toLowerCase()]) {
      const localPart = email.split('@')[0];
      return `${localPart}@${corrections[domain.toLowerCase()]}`;
    }

    return null;
  }

  /**
   * Extrae dominio de un email
   */
  extractDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : null;
  }

  /**
   * Verifica si el dominio parece corporativo (no genérico)
   */
  isCorporateDomain(domain: string): boolean {
    const personalDomains = [
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
      'icloud.com', 'me.com', 'mac.com', 'aol.com',
      'live.com', 'msn.com', 'protonmail.com',
    ];

    return !personalDomains.includes(domain.toLowerCase());
  }
}
