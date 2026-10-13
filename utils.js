import { CABLES } from './theme';

const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function b64decode(str = '') {
  try {
    const s = String(str).replace(/[^A-Za-z0-9+/]/g, '');
    const bytes = []; let buf = 0, bits = 0;
    for (const ch of s) {
      buf = (buf << 6) | T.indexOf(ch); bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 0xff); buf &= (1 << bits) - 1; }
    }
    try { return decodeURIComponent(bytes.map((b) => '%' + b.toString(16).padStart(2, '0')).join('')); }
    catch { return bytes.map((b) => String.fromCharCode(b)).join(''); }
  } catch { return String(str); }
}

const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä', ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü', Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Agrave: 'À', Ccedil: 'Ç', oelig: 'œ', laquo: '«', raquo: '»', euro: '€', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', deg: '°' };
const decOnce = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return m; } })
  .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return m; } })
  .replace(/&([a-zA-Z]+);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m));
export const decodeEntities = (s = '') => decOnce(decOnce(String(s)));

export function stripHtml(h = '') {
  const t = String(h)
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, u, x) => { const y = x.replace(/<[^>]+>/g, '').trim(); return !y || y === u ? u : `${y} (${u})`; })
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '');
  return decodeEntities(t).replace(/\n{3,}/g, '\n\n').trim();
}

export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function parseDate(s) {
  const [d, t = '00:00'] = String(s).split(' ');
  const [y, m, da] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number);
  return new Date(y, m - 1, da, h, mi);
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export function monday(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const fmtDay = (d) => `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;

export function cableColor(code = '') {
  let h = 0; for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CABLES[h % CABLES.length];
}

const num = (x) => parseFloat(String(x).replace(',', '.'));
export function gradeOn20(n) {
  const v = num(n.valeur); const over = num(n.noteSur) || 20;
  return isNaN(v) ? null : (v / over) * 20;
}
export function computeAverages(notes) {
  const subj = {};
  for (const n of notes) {
    if (n.nonSignificatif) continue;
    const g = gradeOn20(n); if (g == null) continue;
    const coef = num(n.coef) || 1;
    const s = subj[n.codeMatiere] || (subj[n.codeMatiere] = { code: n.codeMatiere, label: n.libelleMatiere, sum: 0, coef: 0, notes: [] });
    s.sum += g * coef; s.coef += coef; s.notes.push(n);
  }
  const list = Object.values(subj).map((s) => ({ ...s, avg: s.coef ? s.sum / s.coef : null }));
  const ok = list.filter((s) => s.avg != null);
  return { list, general: ok.length ? ok.reduce((a, s) => a + s.avg, 0) / ok.length : null };
}
export const fmt = (x, d = 2) => (x == null ? '–' : x.toFixed(d).replace('.', ','));

export function decodeContent(c = '') {
  const orig = String(c).trim();
  if (/^[A-Za-z0-9+/_\-=\r\n]{8,}$/.test(orig)) {
    const t = b64decode(orig.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
    if (t && !t.includes('\uFFFD')) return stripHtml(t);
  }
  return stripHtml(orig);
}
