# Streaming Backend

A production-quality Netflix-style movie streaming backend built with **Node.js, TypeScript, NestJS, pnpm, and Biome**.

## Features

- **Movie Discovery** - Browse movies with pagination, filtering by genre, year, and sorting
- **Movie Search** - Search movies by title with pagination
- **Movie Details** - Complete movie metadata including cast, genres, production info, similar movies
- **Genres** - List all genres and browse movies by genre
- **Popular Movies** - Trending and popular movies with time windows (day/week)
- **Cast Information** - Detailed cast with character names, profile images, and cast order
- **Streaming Sources** - Normalized streaming sources from Torrentio

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5 (strict mode)
- **Package Manager**: pnpm 10
- **Linting/Formatting**: Biome
- **API Documentation**: Swagger/OpenAPI
- **HTTP Client**: Axios via @nestjs/axios
- **Caching**: cache-manager (in-memory, Redis-ready)
- **Validation**: class-validator, class-transformer
- **Rate Limiting**: @nestjs/throttler
- **Testing**: Jest with Supertest

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── configuration.ts
│   ├── validation.ts
│   └── index.ts
├── common/
│   ├── cache/
│   │   ├── cache.service.ts
│   │   └── cache.module.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── common.module.ts
└── modules/
    ├── movies/
    │   ├── movies.module.ts
    │   ├── movies.controller.ts
    │   ├── movies.service.ts
    │   └── dto/
    ├── genres/
    │   ├── genres.module.ts
    │   ├── genres.controller.ts
    │   ├── genres.service.ts
    │   └── dto/
    ├── trending/
    │   ├── trending.module.ts
    │   ├── trending.controller.ts
    │   ├── trending.service.ts
    │   └── dto/
    ├── streams/
    │   ├── streams.module.ts
    │   ├── streams.controller.ts
    │   ├── streams.service.ts
    │   └── dto/
    ├── tmdb/
    │   ├── tmdb.module.ts
    │   ├── tmdb.service.ts
    │   ├── tmdb.client.ts
    │   └── interfaces/
    └── torrentio/
        ├── torrentio.module.ts
        ├── torrentio.service.ts
        ├── torrentio.client.ts
        └── interfaces/
```

## Installation

```bash
# Install dependencies
pnpm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Application
NODE_ENV=development
PORT=3000

# TMDB Configuration
TMDB_API_KEY=your_tmdb_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3

# Torrentio Configuration
TORRENTIO_BASE_URL=https://torrentio.strem.fun

# Cache & Rate Limiting
CACHE_TTL=3600
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### Required API Keys

1. **TMDB API Key**: Get from [TMDB Settings](https://www.themoviedb.org/settings/api)
2. **Torrentio**: No API key required, uses public endpoint

## Development

```bash
# Start development server with hot reload
pnpm dev

# Run linting
pnpm lint

# Format code
pnpm format

# Run all checks (lint + format)
pnpm check
```

## Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start:prod
```

## Testing

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

## API Documentation

Swagger UI available at: `http://localhost:3000/api/docs`

The API is public and rate-limited. Movie stream sources are exposed only through the dedicated
`/api/movies/:id/streams` endpoint and are not included in movie detail responses.

## API Endpoints

### Movies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movies` | Browse movies with filters |
| GET | `/api/movies/search?q={query}` | Search movies |
| GET | `/api/movies/popular` | Get popular movies |
| GET | `/api/movies/trending?timeWindow={day|week}` | Get trending movies |
| GET | `/api/movies/:id` | Get movie details |
| GET | `/api/movies/:id/cast` | Get movie cast |
| GET | `/api/movies/:id/streams` | Get streaming sources |

### Genres

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/genres` | Get all genres |
| GET | `/api/genres/:genreId/movies` | Get movies by genre |

### Query Parameters

**Movies Browse** (`/api/movies`):
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `sort` (string, default: "popularity.desc")
- `year` (number, optional)
- `genre` (number, optional)

**Movies Search** (`/api/movies/search`):
- `q` (string, required)
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Trending** (`/api/movies/trending`):
- `timeWindow` (enum: "day" | "week", default: "week")
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Genres** (`/api/genres/:genreId/movies`):
- `page` (number, default: 1)
- `limit` (number, default: 20)

## Response Format

### Standard Response

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "statusCode": 404,
  "message": "Movie not found",
  "error": "HttpException",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/movies/999"
}
```

## Example Requests

### Browse Movies

```bash
curl "http://localhost:3000/api/movies?page=1&limit=20&sort=popularity.desc&year=2024&genre=28"
```

### Search Movies

```bash
curl "http://localhost:3000/api/movies/search?q=oppenheimer&page=1&limit=10"
```

### Get Movie Details

```bash
curl "http://localhost:3000/api/movies/123"
```

### Get Streaming Sources

```bash
curl "http://localhost:3000/api/movies/123/streams"
```

### Get Popular Movies

```bash
curl "http://localhost:3000/api/movies/popular?page=1&limit=20"
```

### Get Trending Movies

```bash
curl "http://localhost:3000/api/movies/trending?timeWindow=week"
```

## TMDB Configuration

The backend uses TMDB (The Movie Database) for all movie metadata:

- **Base URL**: `https://api.themoviedb.org/3`
- **Image Base URL**: `https://image.tmdb.org/t/p/`
- **Required**: A v3 API key in `TMDB_API_KEY` or a v4 read-access token in
  `TMDB_ACCESS_TOKEN`. Existing v4 tokens stored in `TMDB_API_KEY` are detected automatically.

### TMDB Endpoints Used

- `/genre/movie/list` - Genres
- `/movie/popular` - Popular movies
- `/trending/movie/{day|week}` - Trending movies
- `/search/movie` - Search
- `/discover/movie` - Browse with filters
- `/movie/{id}` - Movie details
- `/movie/{id}/credits` - Cast & crew
- `/movie/{id}/similar` - Similar movies
- `/movie/{id}/external_ids` - IMDB ID for streaming

## Torrentio Configuration

Torrentio provides streaming sources:

- **Base URL**: `https://torrentio.strem.fun`
- **No API key required**
- **Endpoint**: `/stream/movie/{imdb_id}.json`

### Stream Normalization

Raw Torrentio streams are normalized to:

```typescript
interface MovieStream {
  id: string;
  title: string;
  quality?: string;      // e.g., "1080p", "4K"
  type?: string;         // "torrent" | "http"
  url?: string;          // magnet link or http URL
  infoHash?: string;     // torrent info hash
  fileIndex?: number;    // file index in torrent
  size?: string;         // formatted size (e.g., "2.5 GB")
  seeders?: number;      // seed count
}
```

## Caching

The application includes a caching abstraction (`CacheService`) that wraps `cache-manager`:

- **Default TTL**: 1 hour (3600 seconds)
- **Popular/Trending**: 30 minutes
- **Search**: 5 minutes
- **Movie Details**: 1 hour

Ready for Redis by changing the cache store configuration.

## Security

- **CORS**: Configured for development (all origins) and production (specific origin)
- **Rate Limiting**: 100 requests per minute per IP
- **Validation**: All inputs validated with class-validator
- **Error Sanitization**: API keys removed from error messages
- **No Secrets in Code**: All credentials via environment variables

## Logging

Structured logging for:
- Server startup
- Incoming requests (method, URL, duration)
- External API failures
- Application errors

## Code Quality

```bash
# Run all checks
pnpm check

# Lint only
pnpm lint

# Format only
pnpm format
```

## License

UNLICENSED - Private project
