import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import { store, ttlExpired } from './store.js';
import { Logger, loggingMiddleware } from './logger.js';
import { generateCode, isValidShortcode, isValidUrl, obfuscateIp } from './utils.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

const logger = new Logger(process.env.LOG_FILE || 'logs/app.log');
app.use(loggingMiddleware(logger));

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', time: dayjs().toISOString() }));

app.post('/shorturls', (req, res) => {
  const { url, validity, shortcode } = req.body || {};
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'INVALID_URL', message: 'Provide a valid http(s) URL.' });
  }
  let minutes = 30;
  if (typeof validity !== 'undefined') {
    if (!Number.isInteger(validity) || validity <= 0) {
      return res.status(400).json({ error: 'INVALID_VALIDITY', message: 'validity must be a positive integer (minutes).' });
    }
    minutes = validity;
  }
  let code = shortcode;
  if (code) {
    if (!isValidShortcode(code)) {
      return res.status(400).json({ error: 'INVALID_SHORTCODE', message: 'Shortcode must be 3-32 chars, alphanumeric, dash or underscore.' });
    }
    if (store.exists(code)) {
      return res.status(409).json({ error: 'SHORTCODE_TAKEN', message: 'Provided shortcode already exists.' });
    }
  } else {
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 5) return res.status(500).json({ error: 'GENERATION_FAILURE', message: 'Unable to allocate unique shortcode.' });
    } while (store.exists(code));
  }
  const now = dayjs();
  const expiryAt = now.add(minutes, 'minute');
  const item = {
    shortcode: code,
    url,
    createdAt: now.toISOString(),
    expiryAt: expiryAt.toISOString(),
    clicks: [],
  };
  store.set(item);
  logger.info('shorturl.created', { shortcode: code, url, expiryAt: item.expiryAt });
  return res.status(201).json({
    shortLink: `${BASE_URL}/${code}`,
    expiry: item.expiryAt,
  });
});

app.get('/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const item = store.get(shortcode);
  if (!item) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shortcode does not exist.' });
  if (ttlExpired(item)) return res.status(410).json({ error: 'EXPIRED', message: 'The short link has expired.' });
  const referrer = req.get('referer') || req.get('referrer') || null;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const { ipHash, ipPrefix } = obfuscateIp(ip, process.env.IP_SALT || '');
  const geo = {
    country: req.get('x-geo-country') || null,
    region: req.get('x-geo-region') || null,
    city: req.get('x-geo-city') || null,
    ipPrefix,
    ipHash,
  };
  const click = { ts: dayjs().toISOString(), referrer, geo };
  store.incrementClick(shortcode, click);
  logger.info('shorturl.click', { shortcode, referrer, geo });
  return res.redirect(302, item.url);
});

app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const item = store.get(shortcode);
  if (!item) return res.status(404).json({ error: 'NOT_FOUND', message: 'Shortcode does not exist.' });
  const payload = {
    shortcode: item.shortcode,
    originalUrl: item.url,
    createdAt: item.createdAt,
    expiry: item.expiryAt,
    totalClicks: item.clicks.length,
    clicks: item.clicks.map(c => ({ ts: c.ts, referrer: c.referrer, geo: c.geo })),
  };
  return res.status(200).json(payload);
});

app.use((err, req, res, next) => {
  logger.error('unhandled.exception', { message: err?.message, stack: err?.stack });
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('service.start', { port: PORT, baseUrl: BASE_URL });
});
