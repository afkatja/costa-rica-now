# Seismic & Volcanic Activity Feature - Developer Guide

## Overview

This guide covers local development setup for the Seismic and Volcanic Activity monitoring feature.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ SeismicPage │  │  Earthquakes│  │  Volcanoes  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │  SeismicMap │                         │
│                    └──────┬──────┘                         │
└───────────────────────────┼─────────────────────────────────┘
                            │ Supabase Client
┌───────────────────────────┼─────────────────────────────────┐
│              Supabase Edge Functions                        │
│  ┌────────────────────────┼────────────────────────┐       │
│  │         seismic-service│                        │       │
│  │  ┌─────────────────────┼─────────────────────┐  │       │
│  │  │  USGS API    OVSICORI API    RSN API     │  │       │
│  │  │     │             │              │       │  │       │
│  │  └─────┴─────────────┴──────────────┴───────┘  │       │
│  └─────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────┐       │
│  │         volcanic-service                        │       │
│  │  ┌─────────────────────────────────────────┐   │       │
│  │  │  Smithsonian GVP Web Scraping           │   │       │
│  │  └─────────────────────────────────────────┘   │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase CLI
- Git

## Local Setup

### 1. Clone and Install

```bash
git clone <repository-url>
ccd costa-rica-now
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: For local Edge Functions
SUPABASE_ACCESS_TOKEN=your-access-token
```

### 3. Start Local Development

```bash
# Start Next.js dev server
npm run dev

# In another terminal, start Supabase locally
supabase start
```

### 4. Deploy Edge Functions (Local)

```bash
# Deploy seismic-service function
supabase functions deploy seismic-service --env-file .env.local

# Deploy volcanic-service function
supabase functions deploy volcanic-service --env-file .env.local
```

## Testing Edge Functions Locally

### Using Supabase CLI

```bash
# Invoke seismic-service locally
supabase functions invoke seismic-service --data '{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}'

# Invoke volcanic-service locally
supabase functions invoke volcanic-service --data '{
  "country": "Costa Rica"
}'
```

### Using curl

```bash
# Seismic service
curl -X POST http://localhost:54321/functions/v1/seismic-service \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'

# Volcanic service
curl -X POST http://localhost:54321/functions/v1/volcanic-service \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "Costa Rica"
  }'
```

## Project Structure

```
src/
├── components/
│   ├── SeismicPage.tsx      # Main page component
│   ├── SeismicMap.tsx       # Map visualization
│   ├── Earthquakes.tsx      # Earthquake list with filters
│   ├── Volcanoes.tsx        # Volcano list
│   └── ui/                  # shadcn/ui components
├── hooks/
│   ├── use-geolocation.ts   # Geolocation hook
│   └── use-debounce.ts      # Debounce utilities
├── types/
│   ├── seismic.ts           # SeismicEvent types
│   ├── volcano.ts           # Volcano types
│   └── filters.ts           # Filter enum types
├── messages/
│   ├── en.json              # English translations
│   └── es.json              # Spanish translations
└── docs/
    ├── seismic-contract.md  # API documentation
    └── volcanoes-contract.md # Volcano API docs

supabase/
└── functions/
    ├── seismic-service/
    │   └── index.ts         # Earthquake data aggregation
    ├── volcanic-service/
    │   └── index.ts         # Volcano data scraping
    └── _shared/
        ├── coords.ts        # Coordinate utilities
        └── cors.ts          # CORS headers
```

## Key Implementation Details

### Debounced Filter Changes

The `SeismicPage` component uses debounced filter values to prevent excessive API calls:

```typescript
const debouncedTimeFilter = useDebounce(timeFilter, 300)
// Use debounced value for API calls
```

### Memoized List Items

The `Earthquakes` component uses `React.memo` to prevent unnecessary re-renders:

```typescript
const EarthquakeItem = memo(function EarthquakeItem({ ... }) {
  // Component only re-renders if props change
})
```

### Type Safety

All data structures are fully typed:

```typescript
// Server and client share these types
interface SeismicEvent {
  id: string
  source: "rsn" | "usgs" | "ovsicori" | "manual"
  magnitude: number
  // ...
}
```

## Adding New Volcanoes

To add a new volcano to the monitoring system:

1. Get the volcano ID from Smithsonian GVP
2. Add coordinates to `supabase/functions/_shared/coords.ts`:

```typescript
export const VOLCANO_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // ... existing volcanoes
  "345XXX": { lat: 10.XXX, lng: -84.XXX }, // New volcano
}
```

3. Add the volcano to `COSTA_RICA_VOLCANOES`:

```typescript
export const COSTA_RICA_VOLCANOES = {
  // ... existing volcanoes
  "New Volcano": "345XXX",
}
```

## Troubleshooting

### Edge Function Not Found

```bash
# Redeploy functions
supabase functions deploy seismic-service
supabase functions deploy volcanic-service
```

### CORS Errors

Check that `supabase/functions/_shared/cors.ts` includes your local domain:

```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or specific domain
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}
```

### Data Not Loading

1. Check browser console for errors
2. Verify Supabase client configuration
3. Check Edge Function logs:
   ```bash
   supabase functions logs seismic-service
   ```

### Type Errors

Run TypeScript check:

```bash
npx tsc --noEmit
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Run E2E Tests

```bash
npm run test:e2e
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Edge Functions deployed
- [ ] Environment variables configured
- [ ] i18n strings complete for all languages
- [ ] No console.log statements in production code
- [ ] CHANGELOG.md updated

## Resources

- [USGS API Documentation](https://earthquake.usgs.gov/fdsnws/event/1/)
- [OVSICORI Website](https://www.ovsicori.una.ac.cr)
- [Smithsonian GVP](https://volcano.si.edu)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Run linting: `npm run lint`
4. Submit pull request

## Support

For issues or questions:

- Check existing issues
- Review this documentation
- Contact the development team
