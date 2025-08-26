
  import crypto from 'crypto';
  import { customAlphabet } from 'nanoid';

  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 7);

  export const generateCode = () => nanoid();

  export const isValidShortcode = (s) => /^[A-Za-z0-9_-]{3,32}$/.test(s);

  export const isValidUrl = (u) => {
    try {
      const parsed = new URL(u);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  export const obfuscateIp = (ip, salt = '') => {
    try {
      const hash = crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
      let prefix = 'unknown';
      if (ip?.includes('.')) {
        const parts = ip.split('.');
        prefix = parts.slice(0, 2).join('.') + '.x.x';
      } else if (ip?.includes(':')) {
        prefix = ip.split(':')[0] + '::/64';
      }
      return { ipHash: hash, ipPrefix: prefix };
    } catch {
      return { ipHash: 'na', ipPrefix: 'unknown' };
    }
  };
