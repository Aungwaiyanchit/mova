export default () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "3000", 10),
  frontendUrl: process.env.FRONTEND_URL,
  tmdb: {
    apiKey: process.env.TMDB_API_KEY,
    accessToken: process.env.TMDB_ACCESS_TOKEN,
    baseUrl: process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3",
  },
  torrentio: {
    baseUrl: process.env.TORRENTIO_BASE_URL || "https://torrentio.strem.fun",
  },
  cache: {
    ttl: Number.parseInt(process.env.CACHE_TTL || "3600", 10),
  },
  throttle: {
    ttl: Number.parseInt(process.env.THROTTLE_TTL || "60000", 10),
    limit: Number.parseInt(process.env.THROTTLE_LIMIT || "100", 10),
  },
});
