# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2024-01-27

### Added

- **Seismic & Volcanic Activity Feature**
  - Multi-source seismic data aggregation from USGS, OVSICORI, and RSN
  - Real-time earthquake tracking with interactive maps
  - Volcanic activity monitoring for Costa Rica's 5 major volcanoes
  - Advanced filtering by time period, magnitude, source, and location
  - Server-side pagination for earthquake listings
  - Bilingual support (English/Spanish) via next-intl

### Features

- `seismic-service` Edge Function for aggregating earthquake data from multiple APIs
- `volcanic-service` Edge Function for scraping volcano data from Smithsonian GVP
- Interactive seismic map with magnitude-based color coding
- Filter UI with time period, magnitude, source, and location filters
- Volcano statistics dashboard (active, dormant, extinct counts)
- Debounced filter changes (300ms) to reduce API calls
- React.memo for earthquake list items to prevent unnecessary re-renders

### Technical

- Type-safe contracts between server and client
- `VOLCANO_COORDINATES` constant with precise lat/lng for all 5 Costa Rica volcanoes
- `useDebounce` and `useDebouncedCallback` hooks for performance optimization
- Memoized `EarthquakeItem` component for reduced re-renders
- Comprehensive test suite for coordinate utilities and Edge Functions

### Documentation

- API contract documentation for seismic-service
- Developer setup guide with architecture diagrams
- Complete TypeScript type definitions for SeismicEvent and Volcano

### Bug Fixes

- Fixed `isWithinCostaRica()` coordinate bounds logic (was inverted)
- Fixed i18n key mismatches between English and Spanish translations
- Removed debug console.log statements from production code
- Fixed volcano data structure mismatch between service and UI
- Removed hardcoded Spanish text, replaced with i18n translations
- Removed all `(volcano as any)` type assertions for better type safety

### Commits

- `c940621c` - chore: add unit tests
- `7161a13c` - chore: add tech docs
- `eb526655` - chore: fix bugs, add memoization, update translations
- `ec9378c8` - feat: add volcanic data
- `e690e9c6` - chore: fix mapping through filters
- `559f5a76` - chore: filters enums
- `805a9c90` - chore: add loading indicator
- `920f1d8f` - chore: filters messages
- `9a2d74f3` - feat: add filters for quakes list
- `05aaf90c` - chore: fix RSN data fetching with various headers
- `4281420e` - chore: explicit contract between server and client on earthquake type
- `cc45d663` - fix: fix import issues
- `4457c10e` - chore: translate strings
- `1277cbba` - feat: use ISC for seismic data and add pagination
- `b2150c5e` - feat: scrape GVP SI volcanic data
- `a38cdcdd` - feat: add RSN as primary source for seismic data

## [1.0.0] - 2024-01-01

### Added

- Initial release
- Basic project setup with Next.js and Supabase
- Weather data integration
- News feed functionality
- Authentication system
