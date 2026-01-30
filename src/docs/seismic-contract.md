# Seismic Service API Contract

## Overview

The Seismic Service is a Supabase Edge Function that aggregates earthquake data from multiple sources (USGS, OVSICORI, RSN) and provides a unified API for client applications.

## Base URL

```
https://<project-ref>.supabase.co/functions/v1/seismic-service
```

## Authentication

Requests must include the Supabase anonymous key header:

```
Authorization: Bearer <anon-key>
```

## Endpoints

### POST /seismic-service

Fetch earthquake data with optional filtering.

#### Request Body

```typescript
{
  startDate?: string    // ISO date (YYYY-MM-DD), defaults to 30 days ago
  endDate?: string      // ISO date (YYYY-MM-DD), defaults to today
  minMagnitude?: number // Minimum magnitude (default: 2.5)
  maxMagnitude?: number // Maximum magnitude (optional)
  source?: "usgs" | "ovsicori" | "rsn" | "manual" // Filter by source
  lat?: number          // Latitude for radius search
  lon?: number          // Longitude for radius search
  radiusKm?: number     // Search radius in kilometers (default: 50)
  limit?: number        // Results per page (default: 100)
  offset?: number       // Pagination offset (default: 0)
}
```

#### Response

```typescript
{
  success: boolean
  events: SeismicEvent[]
  metadata: {
    type: string
    requestedAt: string          // ISO timestamp
    region: string
    dateRange: {
      start: string
      end: string
    }
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    stats: {
      total: number
      sources: {
        usgs: number
        ovsicori: number
        rsn: number
        manual: number
      }
      magnitudeRange: {
        min: number
        max: number
        average: number
      } | null
      feltCount: number
    }
    sources: {
      usgs: string
      ovsicori: string
      rsn: string
    }
    notes: string[]
  }
}
```

#### SeismicEvent Type

```typescript
interface SeismicEvent {
  id: string
  source: "rsn" | "usgs" | "ovsicori" | "manual"
  magnitude: number
  location: string
  lat: number
  lon: number
  depth: number | null
  time: number // Unix timestamp in milliseconds
  felt?: number // Number of felt reports
  intensity?: number // Mercalli intensity
  tsunami: boolean
  url?: string // Link to source detail page
  status?: string // Review status
  formattedTime?: string // Human-readable time (added by server)
  formattedDateTime?: string // Human-readable datetime (added by server)
}
```

#### Example Request

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/seismic-service \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "minMagnitude": 3.0,
    "source": "usgs"
  }'
```

#### Example Response

```json
{
  "success": true,
  "events": [
    {
      "id": "usgs-20240115-001",
      "source": "usgs",
      "magnitude": 4.2,
      "location": "15 km SO de Cartago",
      "lat": 9.7489,
      "lon": -83.9534,
      "depth": 12.3,
      "time": 1705314323000,
      "felt": 45,
      "tsunami": false,
      "url": "https://earthquake.usgs.gov/...",
      "formattedDateTime": "15/1/2024, 08:45"
    }
  ],
  "metadata": {
    "type": "earthquake",
    "requestedAt": "2024-01-31T12:00:00.000Z",
    "region": "Costa Rica",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "pagination": {
      "total": 1,
      "limit": 100,
      "offset": 0,
      "hasMore": false
    },
    "stats": {
      "total": 1,
      "sources": {
        "usgs": 1,
        "ovsicori": 0,
        "rsn": 0,
        "manual": 0
      },
      "magnitudeRange": {
        "min": 4.2,
        "max": 4.2,
        "average": 4.2
      },
      "feltCount": 45
    },
    "sources": {
      "usgs": "USGS Earthquake Hazards Program",
      "ovsicori": "OVSICORI-UNA",
      "rsn": "Red Sismológica Nacional"
    },
    "notes": []
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid date format. Use YYYY-MM-DD."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to fetch data from upstream sources"
}
```

## Data Sources

### USGS (Primary)

- **URL**: https://earthquake.usgs.gov/fdsnws/event/1/query
- **Coverage**: Global
- **Update Frequency**: Real-time
- **Rate Limit**: None documented

### OVSICORI (Costa Rica)

- **URL**: https://www.ovsicori.una.ac.cr
- **Coverage**: Costa Rica and Central America
- **Update Frequency**: ~5-10 minutes
- **Format**: JSON API

### RSN (Red Sismológica Nacional)

- **URL**: http://rsn.ucr.ac.cr
- **Coverage**: Costa Rica
- **Update Frequency**: ~15 minutes
- **Format**: XML

## Rate Limiting

- **Client-side**: Debounced requests recommended (300ms)
- **Server-side**: No explicit rate limiting, but be respectful of upstream APIs
- **Caching**: Responses are not cached; implement client-side caching if needed

## Data Retention

- Historical data available from all sources
- USGS: Data available from 1900 onwards
- OVSICORI: Data available from 1970 onwards
- RSN: Data available from 1980 onwards

## Error Handling Strategy

1. **Partial Failure**: If one source fails, the service continues with available sources
2. **Retry Logic**: Exponential backoff for transient failures
3. **Graceful Degradation**: Returns partial data with error notes when possible

## Changelog

### v1.0.0 (2024-01)

- Initial release
- Support for USGS, OVSICORI, and RSN sources
- Basic filtering and pagination
- Stats aggregation

### v1.1.0 (2024-02)

- Added formatted date/time fields
- Improved error handling
- Added retry logic for failed sources
