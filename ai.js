import * as SecureStore from 'expo-secure-store';
import * as api from './api';
import { iso, addDays, parseDate, hhmm, fmtDay, computeAverages, fmt, b64decode, stripHtml, decodeContent } from './utils';

export const PROVIDERS = {
  claude: { label: 'Claude', model: 'claude-haiku-5-5', help: 'console.anthropic.com (payant à l\'usage)' },
  gemini: { label: 'Gemini', model: 'gemini-flash-latest', help: 'aistudio.google.com (gratuit, limité)' },
  groq: { label: 'Groq', model: 'llama-3.3-70b-versatile', help: 'console.groq.com (gratuit, limité)' },
};
export const DEFAULTS = { provider: 'gemini', key: '', model: '', share: { notes: true, edt: true, devoirs: true, messages: false, viesco: false } };

export async function loadAi() {
  try {
    const v = await SecureStore.getItemAsync('ed_ai');
    if (!v) return DEFAULTS;
    const j = JSON.parse(v);
    return { ...DEFAULTS, ...j, share: { ...DEFAULTS.share, ...(j.share || {}) } };
  } catch { return DEFAULTS; }
}
export const saveAi = (s) => SecureStore.setItemAsync('ed_ai', JSON.stringify(s));

let cache = { at: 0, key: '', text: '' };
export async function buildContext(share, account) {
  const k = JSON.stringify(share);
  if (Date.now() - cache.at < 300000 && cache.key === k) return cache.text;
  const now = new Date(); const today = iso(now); const out = {};
  const tasks = [];
  if (share.notes) tasks.push(api.getNotes().then((d) => {
    const notes = d.notes || []; const { list, general } = computeAverages(notes);
    out.notes = `NOTES (moyenne générale estimée ${fmt(general)}/20)\n` + list.map((s) => `- ${s.label}: moyenne ${fmt(s.avg)}`).join('\n') +
      '\nDernières notes:\n' + [...notes].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 25)
        .map((n) => `- ${n.date} ${n.libelleMatiere} "${n.devoir}": ${n.valeur}/${n.noteSur} coef ${n.coef}${n.moyenneClasse ? ` (moy. classe ${n.moyenneClasse})` : ''}`).join('\n');
  }).catch(() => {}));
  if (share.edt) tasks.push(api.getEdt(today, iso(addDays(now, 7))).then((d) => {
    out.edt = 'EMPLOI DU TEMPS (7 jours)\n' + (d || []).map((c) => ({ ...c, s: parseDate(c.start_date), e: parseDate(c.end_date) })).sort((a, b) => a.s - b.s).slice(0, 60)
      .map((c) => `- ${fmtDay(c.s)} ${hhmm(c.s)}-${hhmm(c.e)} ${c.matiere || c.text} salle ${c.salle || '?'}${c.isAnnule ? ' ANNULÉ' : ''}`).join('\n');
  }).catch(() => {}));
  if (share.devoirs) tasks.push((async () => {
    const sum = await api.getDevoirs();
    const dates = Object.keys(sum).filter((d) => d >= today).sort().slice(0, 8);
    const det = await Promise.all(dates.map(async (d) => {
      try {
        const r = await api.getDevoirsJour(d);
        return `Pour le ${d}:\n` + (r.matieres || []).filter((m) => m.aFaire)
          .map((m) => `- ${m.matiere}${m.interrogation ? ' (interro)' : ''}: ${stripHtml(b64decode(m.aFaire.contenu || '')).slice(0, 400)}`).join('\n');
      } catch { return ''; }
    }));
    out.devoirs = 'DEVOIRS À FAIRE\n' + det.filter(Boolean).join('\n');
  })().catch(() => {}));
  if (share.messages) tasks.push((async () => {
    const d = await api.getMessages();
    const list = (d.messages?.received || []).slice(0, 8);
    const det = await Promise.all(list.map(async (m) => {
      const who = [m.from?.civilite, m.from?.prenom, m.from?.nom].filter(Boolean).join(' ');
      let body = '';
      try { body = decodeContent((await api.getMessage(m.id)).content).slice(0, 700); } catch {}
      return `- ${m.date} de ${who} | sujet: ${m.subject}${m.read ? '' : ' (non lu)'}\n  ${body}`;
    }));
    out.messages = 'MESSAGES REÇUS (récents)\n' + det.join('\n');
  })().catch(() => {}));
  if (share.viesco) tasks.push(api.getVieScolaire().then((d) => {
    const f = (a) => `- ${a.displayDate || a.date} ${a.typeElement} ${a.libelle || ''} ${a.motif || ''}${['Absence', 'Retard'].includes(a.typeElement) ? (a.justifie ? ' (justifiée)' : ' (NON justifiée)') : ''}`;
    out.viesco = 'VIE SCOLAIRE\n' + [...(d.absencesRetards || []), ...(d.sanctionsEncouragements || [])].map(f).join('\n');
  }).catch(() => {}));
  await Promise.all(tasks);
  const head = `Date: ${fmtDay(now)} ${hhmm(now)}\nÉlève: ${account.prenom} ${account.nom}, classe ${account.profile?.classe?.libelle || '?'}`;
  const text = [head, out.notes, out.edt, out.devoirs, out.messages, out.viesco].filter(Boolean).join('\n\n').slice(0, 24000);
  cache = { at: Date.now(), key: k, text };
  return text;
}

export const SYSTEM = (ctx) => `Tu es l'assistant intégré à ED-premium, une appli pour les élèves. Réponds en français, de façon courte, claire et concrète, sur un ton cool mais respectueux. Voici les données de l'élève qu'il a autorisées. Utilise-les pour répondre, ne les invente jamais, et dis-le quand une information manque. Pour les devoirs et les cours, explique pour qu'il comprenne plutôt que de donner juste la réponse.\n\n${ctx || '(Aucune donnée partagée.)'}`;

async function post(url, headers, body, errMsg) {
  let r;
  try { r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }); }
  catch { throw new Error('Pas de connexion internet.'); }
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error(j.error?.message || j.message || `${errMsg} (erreur ${r.status})`);
  return j;
}

export async function ask(cfg, system, history) {
  if (!cfg.key) throw new Error('Ajoute ta clé API dans Plus > Réglages.');
  const p = cfg.provider; const model = cfg.model || PROVIDERS[p].model;
  if (p === 'claude') {
    const j = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
      { model, max_tokens: 1024, system, messages: history }, 'Erreur Claude');
    return (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  }
  if (p === 'gemini') {
    const j = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': cfg.key },
      { systemInstruction: { parts: [{ text: system }] }, contents: history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }, 'Erreur Gemini');
    return (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join('');
  }
  const j = await post('https://api.groq.com/openai/v1/chat/completions', { authorization: `Bearer ${cfg.key}` },
    { model, messages: [{ role: 'system', content: system }, ...history] }, 'Erreur Groq');
  return j.choices?.[0]?.message?.content || '';
}
