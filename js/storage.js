// Tiny namespaced wrapper around localStorage. Survives refresh; resets only
// when the user clears site data.

const PREFIX = 'tarbiya.';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
};
