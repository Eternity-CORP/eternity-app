export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  ethersRpcUrl: process.env.ETHEREUM_RPC_URL || '',
  alchemyWebhookSecret: process.env.ALCHEMY_WEBHOOK_SECRET || '',
  
  // Shard system configuration
  shards: {
    minTxAmountForShard: parseFloat(process.env.MIN_TX_AMOUNT_FOR_SHARD || '0.001'), // in ETH
    maxShardsPerDay: parseInt(process.env.MAX_SHARDS_PER_DAY || '3', 10),
  },
});
