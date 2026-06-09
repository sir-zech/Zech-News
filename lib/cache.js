// Tiny LRU + TTL cache. On Render this persists for the process lifetime
// (the real win); on Vercel it survives only within a warm invocation — still useful.

class LRUCache {
  constructor({ max = 500, ttl = 120000 } = {}) {
    this.max = max;
    this.ttl = ttl;
    this.map = new Map(); // key -> { value, expires }
  }

  get(key) {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.expires) {
      this.map.delete(key);
      return null;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  set(key, value, ttl = this.ttl) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expires: Date.now() + ttl });
    while (this.map.size > this.max) {
      this.map.delete(this.map.keys().next().value);
    }
    return value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  /** Get from cache or compute+store. `fn` is an async producer. */
  async wrap(key, fn, ttl = this.ttl) {
    const hit = this.get(key);
    if (hit !== null) return hit;
    const value = await fn();
    if (value !== undefined && value !== null) this.set(key, value, ttl);
    return value;
  }

  get size() {
    return this.map.size;
  }
}

// Purpose-scoped singletons shared across the process.
const caches = {
  feed: new LRUCache({ max: 300, ttl: 120000 }), // 2 min
  source: new LRUCache({ max: 300, ttl: 180000 }), // 3 min
  extract: new LRUCache({ max: 400, ttl: 3600000 }), // 1 hour
  image: new LRUCache({ max: 3000, ttl: 86400000 }), // 24 hours
};

module.exports = { LRUCache, caches };
