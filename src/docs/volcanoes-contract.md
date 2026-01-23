# Volcanoes Data Contract Documentation

This document outlines the reinforced contract between the server (`supabase/functions/volcanic-service/index.ts`) and client components for volcano data.

## Overview

The reinforced contract ensures type safety, proper data handling, and consistent communication between the backend service and frontend components.

## Type Definitions

### Core Types (`src/types/volcano.ts`)

```typescript
export interface VolcanoEruptionEvent {
  date: string
  details: string
  power: string
}

export interface VolcanoDetails {
  [key: string]: string
}

export interface VolcanoSubDetails {
  [key: string]: string
}

export interface Volcano {
  id: string // Unique identifier from Smithsonian database
  name: string // Volcano name
  url: string // Source URL
  details: VolcanoDetails // Primary volcano information
  subDetails: VolcanoSubDetails // Secondary volcano information
  history: VolcanoEruptionEvent[] // Eruption history
}

export interface VolcanoesResponse {
  success: boolean
  volcanoes: Volcano[]
  metadata: {
    requestedAt: string
    source: string
    filters: {
      country: string
      timeCode: string
    }
    count: number
  }
}

export interface VolcanoesRequest {
  country?: string
  timeCode?: string
}
```

## Server Contract (`supabase/functions/volcanic-service/index.ts`)

### Request Parameters

The server accepts the following optional parameters:

```typescript
{
  country?: string    // Currently only "Costa Rica" is supported
  timeCode?: string   // Eruption time period filter (D1-D7)
}
```

### Response Format

```typescript
{
  success: boolean,
  volcanoes: Volcano[],
  metadata: {
    requestedAt: string,      // ISO timestamp
    source: string,           // Data source identifier
    filters: {                // Applied filters
      country: string,
      timeCode: string
    },
    count: number             // Number of volcanoes returned
  }
}
```

### Data Enhancement

The server enhances raw scraped data with computed properties:

```typescript
{
  ...volcano,
  computedStatus: string,        // Determined volcano status
  computedEruptionTime: string   // Formatted time range
}
```

### Status Determination Logic

```typescript
function determineVolcanoStatus(volcano: Volcano): string {
  // Check explicit status in details
  if (volcano.details["Status"]?.toLowerCase().includes("active")) {
    return "Activo"
  }

  // Check recent eruption history
  const recentEruptions = volcano.history.filter(event => {
    const dateStr = event.date.toLowerCase()
    return (
      dateStr.includes("2020") ||
      dateStr.includes("2019") ||
      dateStr.includes("2018")
    )
  })

  if (recentEruptions.length > 0) {
    return "Activo"
  }

  return "Durmiente" // Default status
}
```

## Client Contract

### Components

#### 1. `SeismicPage.tsx`

**State Management:**

```typescript
const [volcanoes, setVolcanoes] = useState<Volcano[]>([])
const [volcanoLoading, setVolcanoLoading] = useState(false)
const [volcanoError, setVolcanoError] = useState<string | null>(null)
```

**Data Fetching:**

```typescript
const fetchVolcanoes = async () => {
  const response = await supabase.functions.invoke("volcanic-service", {
    body: {
      country: "Costa Rica",
      timeCode: "D1",
    },
  })

  if (!response.data?.success) {
    throw new Error(response.data?.error || "Failed to fetch volcano data")
  }

  const volcanoData = response.data as VolcanoesResponse
  setVolcanoes(volcanoData.volcanoes)
}
```

#### 2. `Volcanoes.tsx`

**Props Interface:**

```typescript
const Volcanoes = ({ volcanoes }: { volcanoes: Volcano[] }) => {
```

**Statistics Calculation:**

```typescript
const activeVolcanoes = volcanoes.filter(volcano => {
  const status =
    (volcano as any).computedStatus || volcano.details["Status"] || "Durmiente"
  return status === "Activo"
}).length
```

**Data Access Patterns:**

```typescript
// For elevation
volcano.subDetails["Summit Elevation"] ||
  volcano.subDetails["Elevation"] ||
  "N/A"(
    // For status
    volcano as any
  ).computedStatus ||
  volcano.details["Status"] ||
  "Durmiente"(
    // For eruption time
    volcano as any
  ).computedEruptionTime ||
  "D1"
```

## Time Code Mappings

| Code | Period    | Description         |
| ---- | --------- | ------------------- |
| D1   | >= 1964   | Historical (Recent) |
| D2   | 1900-1963 | Historical          |
| D3   | 1800-1899 | Historical          |
| D4   | 1700-1799 | Historical          |
| D5   | 1500-1699 | Historical          |
| D6   | 1-1499    | Historical          |
| D7   | Holocene  | Geological Era      |

## Status Types

| Status    | Spanish | Description                          | Color  |
| --------- | ------- | ------------------------------------ | ------ |
| Activo    | Active  | Currently active or recently erupted | Orange |
| Durmiente | Dormant | No recent activity but not extinct   | Blue   |
| Extinto   | Extinct | No potential for future activity     | Gray   |

## Error Handling

### Server Errors

```typescript
{
  error: string,        // Error message
  success: false
}
```

### Client Error Handling

```typescript
try {
  // API call
} catch (error) {
  setVolcanoError(error instanceof Error ? error.message : "Unknown error")
  setVolcanoes([]) // Reset to empty array
}
```

## Data Flow

1. **Request**: Client sends filtered parameters to server
2. **Processing**: Server scrapes Smithsonian data and enhances it
3. **Response**: Server returns typed response with metadata
4. **Validation**: Client validates response structure
5. **State Update**: Client updates component state with typed data
6. **Rendering**: Components render data using contract-defined access patterns

## Breaking Changes Addressed

1. **Type Safety**: Added comprehensive TypeScript interfaces
2. **Data Access**: Fixed property access patterns to match server structure
3. **Error Handling**: Implemented proper error handling and validation
4. **Status Logic**: Added server-side status determination
5. **Statistics**: Enhanced client with real-time statistics calculation
6. **Filtering**: Added support for time-based filtering

## Migration Notes

- All `any[]` types have been replaced with `Volcano[]`
- Property access patterns updated to use contract-defined structure
- Error handling improved with proper type checking
- Console logging reduced to essential debugging only

## Future Enhancements

1. **Caching**: Implement client-side caching for volcano data
2. **Pagination**: Add pagination support for large datasets
3. **Real-time Updates**: Consider WebSocket integration for live updates
4. **Historical Analysis**: Add trend analysis capabilities
5. **Export Features**: Add data export functionality
