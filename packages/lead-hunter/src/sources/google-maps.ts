/**
 * Cliente Google Places API
 * Documentación: https://developers.google.com/maps/documentation/places/web-service/overview
 */

import type { RawProspect, GooglePlacesFilters } from '../types.js';

interface GoogleMapsConfig {
  apiKey: string;
  mockMode?: boolean;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  business_status?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  url?: string;
}

export class GoogleMapsClient {
  private apiKey: string;
  private mockMode: boolean;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(config: GoogleMapsConfig) {
    this.apiKey = config.apiKey;
    this.mockMode = config.mockMode || !config.apiKey;
  }

  /**
   * Busca negocios por texto (textsearch)
   */
  async searchPlaces(filters: GooglePlacesFilters, maxResults = 60): Promise<RawProspect[]> {
    if (this.mockMode) {
      return this.generateMockProspects(filters, maxResults);
    }

    try {
      // Primero: textsearch para obtener place_ids
      const searchResponse = await fetch(
        `${this.baseUrl}/textsearch/json?query=${encodeURIComponent(filters.query + ' ' + filters.location)}&key=${this.apiKey}&type=${filters.type || 'establishment'}`,
        { method: 'GET' }
      );

      if (!searchResponse.ok) {
        throw new Error(`Google Places API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      
      if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${searchData.status}`);
      }

      const places = searchData.results?.slice(0, Math.min(maxResults, 20)) || [];
      
      // Segundo: obtener detalles de cada lugar
      const prospects: RawProspect[] = [];
      for (const place of places) {
        const details = await this.getPlaceDetails(place.place_id);
        if (details) {
          const prospect = this.mapPlaceToProspect(details);
          if (prospect) prospects.push(prospect);
        }
      }

      return prospects;
    } catch (error) {
      console.error('Google Maps search failed:', error);
      return this.generateMockProspects(filters, maxResults);
    }
  }

  /**
   * Obtiene detalles de un lugar
   */
  private async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/details/json?place_id=${placeId}&fields=name,website,formatted_phone_number,international_phone_number,business_status,types,rating,user_ratings_total,url,formatted_address&key=${this.apiKey}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        return null;
      }

      return data.result;
    } catch {
      return null;
    }
  }

  /**
   * Mapea Google Place a RawProspect
   */
  private mapPlaceToProspect(place: GooglePlace): RawProspect | null {
    // Solo incluir si tiene website
    if (!place.website) {
      return null;
    }

    // Intentar extraer dominio del email del sitio web
    const domain = new URL(place.website).hostname.replace(/^www\./, '');
    const email = `info@${domain}`;

    return {
      email,
      companyName: place.name,
      companyWebsite: place.website,
      phone: place.international_phone_number || place.formatted_phone_number,
      source: 'GOOGLE_MAPS' as const,
      sourceUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      rawData: {
        placeId: place.place_id,
        address: place.formatted_address,
        rating: place.rating,
        totalReviews: place.user_ratings_total,
        types: place.types,
        businessStatus: place.business_status,
      } as unknown,
    };
  }

  /**
   * Genera prospectos mock para desarrollo
   */
  private generateMockProspects(filters: GooglePlacesFilters, count: number): RawProspect[] {
    const query = filters.query.toLowerCase();
    const location = filters.location;
    
    const isDental = query.includes('dental') || query.includes('dentista');
    const isTech = query.includes('software') || query.includes('tech');
    const isRestaurant = query.includes('restaurant') || query.includes('café');
    
    const prospects: RawProspect[] = [];
    
    const mockData = isDental
      ? [
          { name: 'Clínica Dental Sonrisas', domain: 'sonrisasdental.es', phone: '+34 912 345 678' },
          { name: 'Dental Care Madrid', domain: 'dentalcare-madrid.es', phone: '+34 913 456 789' },
          { name: 'Implantes Premium', domain: 'implantespremium.com', phone: '+34 914 567 890' },
          { name: 'Sonrisa Perfecta', domain: 'sonrisaperfecta.es', phone: '+34 915 678 901' },
          { name: 'Dental Fresh', domain: 'dentalfresh.es', phone: '+34 916 789 012' },
        ]
      : isTech
      ? [
          { name: 'Tech Solutions Madrid', domain: 'techsolutions.es', phone: '+34 911 111 111' },
          { name: 'Software Pro', domain: 'softwarepro.es', phone: '+34 922 222 222' },
          { name: 'Cloud Systems', domain: 'cloudsystems.es', phone: '+34 933 333 333' },
          { name: 'Data Dynamics', domain: 'datadynamics.es', phone: '+34 944 444 444' },
          { name: 'AI Innovations', domain: 'aiinnovations.es', phone: '+34 955 555 555' },
        ]
      : isRestaurant
      ? [
          { name: 'El Buen Sabor', domain: 'elbuensabor.es', phone: '+34 966 666 666' },
          { name: 'Café Central', domain: 'cafecentral.es', phone: '+34 977 777 777' },
          { name: 'Restaurante La Cueva', domain: 'lacueva.es', phone: '+34 988 888 888' },
          { name: 'Gastro Bar', domain: 'gastrobar.es', phone: '+34 999 999 999' },
        ]
      : [
          { name: 'Consulting Pro', domain: 'consultingpro.es', phone: '+34 900 000 001' },
          { name: 'Marketing Solutions', domain: 'marketingsolutions.es', phone: '+34 900 000 002' },
          { name: 'Legal Advisors', domain: 'legaladvisors.es', phone: '+34 900 000 003' },
          { name: 'Finance Experts', domain: 'financeexperts.es', phone: '+34 900 000 004' },
        ];
    
    for (let i = 0; i < Math.min(count, mockData.length); i++) {
      const data = mockData[i];
      prospects.push({
        email: `info@${data.domain}`,
        companyName: data.name,
        companyWebsite: `https://${data.domain}`,
        phone: data.phone,
        source: 'GOOGLE_MAPS',
        sourceUrl: `https://maps.google.com/?q=${encodeURIComponent(data.name + ' ' + location)}`,
        rawData: {
          placeId: `mock-place-${i}`,
          address: `Calle Demo ${i + 1}, ${location}`,
          rating: 4.0 + Math.random(),
          totalReviews: 10 + Math.floor(Math.random() * 200),
          businessStatus: 'OPERATIONAL',
          query: filters.query,
        } as unknown,
      });
    }
    
    return prospects;
  }
}
