import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };

export class Logger {
  constructor(filePath = 'logs/app.log') {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
    ensureDir(path.dirname(abs));
    this.stream = fs.createWriteStream(abs, { flags: 'a' });
  }
  write(obj) {
    const line = JSON.stringify({ ts: dayjs().toISOString(), ...obj }) + '\n';
    this.stream.write(line);
  }
  info(msg, meta = {}) { this.write({ level: 'INFO', msg, ...meta }); }
  warn(msg, meta = {}) { this.write({ level: 'WARN', msg, ...meta }); }
  error(msg, meta = {}) { this.write({ level: 'ERROR', msg, ...meta }); }
}

export const loggingMiddleware = (logger) => (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  const reqMeta = {
    method,
    path: originalUrl,
    headers: {
      'user-agent': req.get('user-agent'),
      'referer': req.get('referer') || req.get('referrer')
    },
    ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress,
  };
  logger.info('request.start', reqMeta);
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info('request.end', { ...reqMeta, status: res.statusCode, durationMs });
  });
  next();
};
