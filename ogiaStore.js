import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseOgia, ogiaEvents, normalizeHost } from './ogia';

// Dates des périodes d'ateliers (AAAA-MM-JJ). Une période sans "end" n'est pas affichée.
// P1 finit le 16/10/26 (indiqué par Ogia). Le début de P1 est une valeur large : à corriger.
export const PERIODES = {
  1: { start: '2026-09-01', end: '2026-10-16' },
  2: { start: '2026-10-19', end: null }, // <- mettre la date de fin de la période 2
};

const K = 'ogia_items';
const KH = 'ogia_host';
export async function getHost() { try { return (await AsyncStorage.getItem(KH)) || null; } catch { return null; } }
export async function setHost(v) { const h = normalizeHost(v); if (!h) return null; try { await AsyncStorage.setItem(KH, h); } catch {} return h; }
export async function clearHost() { try { await AsyncStorage.removeItem(KH); } catch {} }
let mem = null;

export async function saveOgiaHtml(html) {
  const items = parseOgia(html);
  mem = items;
  try { await AsyncStorage.setItem(K, JSON.stringify({ t: Date.now(), items })); } catch {}
  return items.length;
}
async function loadItems() {
  if (mem) return mem;
  try { const v = await AsyncStorage.getItem(K); mem = v ? (JSON.parse(v).items || []) : []; } catch { mem = []; }
  return mem;
}
export async function clearOgia() { mem = []; try { await AsyncStorage.removeItem(K); } catch {} }

// Ajoute les ateliers Ogia à la liste de cours EcoleDirecte
export async function mergeOgia(base, from, to) {
  const items = await loadItems();
  const list = Array.isArray(base) ? base : [];
  if (!items.length) return list;
  const ev = ogiaEvents(items, PERIODES, from, to).map((e, i) => ({ ...e, id: `ogia-${e.start_date}-${i}`, codeMatiere: 'OGIA' }));
  return [...list, ...ev];
}
