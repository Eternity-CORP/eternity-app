/**
 * Logger Utility
 * Centralized logging with environment-aware behavior
 * In production: only errors are logged
 * In development: all levels are logged
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = __DEV__;

const config: LoggerConfig = {
  enabled: true,
  minLevel: isDev ? 'debug' : 'error',
};

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatMessage(level: LogLevel, tag: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`;
}

/**
 * Create a logger instance for a specific module/tag
 */
export function createLogger(tag: string) {
  return {
    debug: (message: string, data?: unknown) => {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', tag, message), data ?? '');
      }
    },
    info: (message: string, data?: unknown) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', tag, message), data ?? '');
      }
    },
    warn: (message: string, data?: unknown) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', tag, message), data ?? '');
      }
    },
    error: (message: string, error?: unknown) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', tag, message), error ?? '');
      }
    },
  };
}

/**
 * Default logger for quick use
 */
export const logger = createLogger('App');

/**
 * Configure logger settings
 */
export function configureLogger(options: Partial<LoggerConfig>) {
  Object.assign(config, options);
}
