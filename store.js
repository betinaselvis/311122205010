import dayjs from 'dayjs';

class Store {
  constructor() {
    this.map = new Map();
  }
  exists(code) { return this.map.has(code); }
  get(code) { return this.map.get(code); }
  set(item) { this.map.set(item.shortcode, item); return item; }
  incrementClick(code, click) {
    const it = this.map.get(code);
    if (!it) return null;
    it.clicks.push(click);
    return it;
  }
}

export const store = new Store();

export const ttlExpired = (item) => dayjs().isAfter(dayjs(item.expiryAt));
