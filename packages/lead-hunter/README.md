# Lead Hunter

Sistema de captación automática de prospectos para GenMail.

## Características

- 🔍 **Múltiples fuentes**: Apollo.io, Hunter.io, Google Places
- 🧹 **Enriquecimiento**: Normalización, deduplicación, scoring
- ✅ **Validación**: Verificación de emails sin SMTP (evita blacklists)
- 🎯 **ICP-based**: Define perfiles ideales y busca coincidencias
- 🔧 **Modo mock**: Funciona sin API keys para desarrollo

## Variables de Entorno

```bash
# API Keys (opcionales - si no están, usa modo mock)
APOLLO_API_KEY=your_apollo_api_key
HUNTER_API_KEY=your_hunter_api_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

## Uso

```typescript
import { HunterEngine } from '@genmail/lead-hunter';

const engine = new HunterEngine({
  apolloApiKey: process.env.APOLLO_API_KEY,
  hunterApiKey: process.env.HUNTER_API_KEY,
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
});

const icp = {
  sector: 'Clínicas dentales Madrid',
  targetRole: 'Director',
  location: 'Madrid, España',
  keywords: ['clínica dental', 'odontología'],
  painPoints: ['Falta de pacientes', 'Baja conversión web'],
};

const { prospects, stats } = await engine.hunt(icp, { maxResults: 100 });

console.log(`Encontrados ${stats.totalFound} prospectos`);
console.log(`Únicos: ${stats.unique}`);
console.log(`Validados: ${stats.validated}`);
console.log(`Corporativos: ${stats.corporate}`);
```

## Arquitectura

```
HunterEngine
├── Sources (SourceAggregator)
│   ├── ApolloClient → Busca por título/industria/ubicación
│   ├── GoogleMapsClient → Busca negocios por sector
│   └── HunterClient → Busca emails por dominio
├── Enrichment (ProspectEnricher)
│   ├── Deduplicación por email
│   ├── Normalización de nombres
│   └── Scoring de intención
└── Validation (EmailValidator)
    ├── Validación de formato
    ├── Verificación MX (simulada)
    └── Filtro de dominios desechables
```

## Modo Mock

Cuando no hay API keys configuradas, todos los clientes devuelven datos
realistas de demostración. Esto permite desarrollo sin costes de API.

## API de Fuentes

### Apollo.io
```typescript
const apollo = new ApolloClient({ apiKey: '...' });
const prospects = await apollo.searchPeople({
  personTitles: ['Director', 'CEO'],
  personLocations: ['Madrid, Spain'],
  qKeywords: 'software SaaS',
});
```

### Hunter.io
```typescript
const hunter = new HunterClient({ apiKey: '...' });
const prospects = await hunter.searchDomain('acme-saas.com');
```

### Google Maps
```typescript
const maps = new GoogleMapsClient({ apiKey: '...' });
const prospects = await maps.searchPlaces({
  query: 'clínicas dentales',
  location: 'Madrid, España',
});
```

## Licencia

Proprietary - GenMail Team
