import * as Joi from 'joi';

export function validateEnv(config: Record<string, unknown>) {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().uri().required(),
    DATABASE_SSL: Joi.boolean().default(false),
    JWT_SECRET: Joi.string().min(32).required(),
    REDIS_URL: Joi.string().uri().optional(), // Optional - can work without Redis
    ETHEREUM_RPC_URL: Joi.string().uri().required(),
    ALCHEMY_WEBHOOK_SECRET: Joi.string().min(16).required()
  });

  const { error, value } = schema.validate(config, { allowUnknown: true, abortEarly: false });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return value;
}
