// ============================================================
// LOGGER SIMPLES — GOSchool (ESM)
// Logger estruturado com níveis e contexto
// ============================================================

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || (process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug);

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const base = { timestamp, level, message, ...meta };
  return JSON.stringify(base);
}

export const logger = {
  debug: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.debug) console.log(formatMessage('debug', message, meta));
  },
  info: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.info) console.log(formatMessage('info', message, meta));
  },
  warn: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.warn) console.warn(formatMessage('warn', message, meta));
  },
  error: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.error) console.error(formatMessage('error', message, meta));
  },
  // Helper para logs de requisição
  request: (req, res, duration) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.sub,
    });
  },
};

export default logger;