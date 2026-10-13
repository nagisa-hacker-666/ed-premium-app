import AsyncStorage from '@react-native-async-storage/async-storage';

const K = 'services_list';

// Accepte « monsite.fr/page » ou une URL https ; renvoie une URL https propre ou null.
export function normalizeUrl(v) {
  let s = String(v || '').trim();
  if (!s || /\s/.test(s)) return null;
  s = s.replace(/^http:\/\//i, 'https://');
  if (!/^https:\/\//i.test(s)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[^/]+:\d+/.test(s)) return null; // javascript:, file:, etc.
    s = 'https://' + s;
  }
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]\S*)?$/i.test(s) ? s : null;
}
export const hostOf = (u) => String(u).replace(/^https:\/\//i, '').split(/[/?#]/)[0];

export async function loadServices() {
  try { const v = await AsyncStorage.getItem(K); const l = v ? JSON.parse(v) : []; return Array.isArray(l) ? l : []; } catch { return []; }
}
async function save(list) { try { await AsyncStorage.setItem(K, JSON.stringify(list)); } catch {} return list; }

export async function addService(name, url) {
  const u = normalizeUrl(url); const n = String(name || '').trim().slice(0, 40);
  if (!u || !n) return null;
  return save([...(await loadServices()), { id: String(Date.now()), name: n, url: u }]);
}
export async function removeService(id) { return save((await loadServices()).filter((s) => s.id !== id)); }
