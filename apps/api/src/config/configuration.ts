export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'ey_dev',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  blik: {
    codeExpirationMs: parseInt(process.env.BLIK_CODE_EXPIRATION_MS || '120000', 10), // 2 minutes
    codeLength: 6,
  },
});
