import rateLimit from 'express-rate-limit';

/**
 * Rate limiter для BLIK endpoints
 * Защита от брутфорса кодов
 */
export const blikRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 попыток на IP+code
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Ключ по IP + code для защиты конкретного кода
  keyGenerator: (req) => {
    const code = req.params.code || 'unknown';
    return `${req.ip}-${code}`;
  },
  // Пропускать успешные запросы (не считать их в лимит)
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter для создания кодов
 * Защита от спама
 */
export const blikCreateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 20, // максимум 20 кодов в час
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many codes created, please try again later',
  },
  keyGenerator: (req) => {
    // По userId из auth
    return (req.user as any)?.id || req.ip;
  },
});

/**
 * Rate limiter для payment endpoints
 * Общая защита от злоупотреблений
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 30, // максимум 30 запросов в минуту
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many payment requests, please slow down',
  },
  keyGenerator: (req) => {
    return (req.user as any)?.id || req.ip;
  },
});

/**
 * Rate limiter для crosschain endpoints
 * Защита от перегрузки внешних API
 */
export const crosschainRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // максимум 20 котировок в минуту
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many crosschain requests, please wait',
  },
  keyGenerator: (req) => {
    return (req.user as any)?.id || req.ip;
  },
});
