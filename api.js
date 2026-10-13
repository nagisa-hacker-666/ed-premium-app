import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { b64decode, iso, addDays, monday } from './utils';
import { mergeOgia } from './ogiaStore';

const BASE = 'https://api.ecoledirecte.com/v3';
const V = '4.96.3';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const S = { token: null, tfa: null, gtk: null, account: null, creds: null };

function hdrs(useGtk) {
  const h = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json, text/plain, */*', 'User-Agent': UA };
  if (S.token) h['X-Token'] = S.token;
  if (S.tfa) h['2FA-Token'] = S.tfa;
  if (useGtk && S.gtk) h['X-Gtk'] = S.gtk;
  return h;
}
function track(res, json) {
  if (json && json.token) S.token = json.token;
  const t = res.headers.get('x-token'); if (t) S.token = t;
  const f = res.headers.get('2fa-token'); if (f) S.tfa = f;
}

async function call(path, data = {}, useGtk = false) {
  let res;
  try {
    res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${V}`, {
      method: 'POST', headers: hdrs(useGtk), body: 'data=' + encodeURIComponent(JSON.stringify(data)),
    });
  } catch { throw Object.assign(new Error('Pas de connexion à EcoleDirecte. Vérifie ton réseau.'), { net: true }); }
  let json;
  try { json = await res.json(); } catch { throw new Error('Réponse illisible de EcoleDirecte.'); }
  track(res, json);
  return json;
}

// Avant chaque login : récupérer le cookie GTK et le renvoyer en header X-Gtk
async function fetchGtk() {
  S.gtk = null;
  try {
    const res = await fetch(`${BASE}/login.awp?gtk=1&v=${V}`, { headers: hdrs(false) });
    const m = (res.headers.get('set-cookie') || '').match(/GTK=([^;,\s]+)/);
    S.gtk = m ? m[1] : null;
    track(res, null);
  } catch {}
}

// trusted = { cn, cv } (appareil de confiance obtenu après le QCM). keep = garder token/2FA-Token (login final après QCM)
export async function login(identifiant, motdepasse, trusted = null, keep = false) {
  if (!keep) { S.token = null; S.tfa = null; }
  await fetchGtk();
  const data = { identifiant, motdepasse, isReLogin: false, uuid: '', fa: [] };
  if (trusted) Object.assign(data, { cn: trusted.cn, cv: trusted.cv, fa: [{ cn: trusted.cn, cv: trusted.cv, uniq: false }] });
  const j = await call('/login.awp', data, true);
  if (j.code === 200) {
    const acc = j.data.accounts[0];
    if (acc.typeCompte !== 'E') throw new Error("Ce n'est pas un compte élève (parent ou prof). Utilise l'identifiant élève.");
    S.account = acc; S.creds = { identifiant, motdepasse, trusted };
    if (OFFLINE_ON) AsyncStorage.setItem('ed_account', JSON.stringify(acc)).catch(() => {});
    return { status: 'ok', account: acc };
  }
  if (j.code === 250) {
    if (j.data && j.data.totp) throw new Error("Ton compte utilise un code TOTP : pas géré pour l'instant.");
    S.creds = { identifiant, motdepasse, trusted: null };
    return { status: 'qcm' };
  }
  throw new Error(j.message || 'Connexion refusée.');
}

// Pendant le QCM : X-Token + 2FA-Token, SANS X-Gtk
export async function getQcm() {
  const j = await call('/connexion/doubleauth.awp?verbe=get', {}, false);
  if (j.code !== 200) throw new Error(j.message || 'Impossible de charger la question de sécurité.');
  return { question: b64decode(j.data.question), choices: (j.data.propositions || []).map((p) => ({ raw: p, label: b64decode(p) })) };
}
export async function answerQcm(raw) {
  const j = await call('/connexion/doubleauth.awp?verbe=post', { choix: raw }, false);
  if (j.code !== 200) throw new Error(j.message || 'Mauvaise réponse.');
  return { cn: j.data.cn, cv: j.data.cv };
}

// --- cache hors ligne ---
let OFFLINE_ON = true; let offListener = null;
export const setOfflineEnabled = (v) => { OFFLINE_ON = !!v; };
export const onOffline = (fn) => { offListener = fn; };
const flag = (off, t) => { if (offListener) offListener(off ? { at: t } : null); };
const ck = (path, data) => 'c:' + path + '|' + JSON.stringify(data);
const putCache = async (k, d) => { if (OFFLINE_ON) { try { await AsyncStorage.setItem(k, JSON.stringify({ t: Date.now(), d })); } catch {} } };
const getCache = async (k) => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
export async function clearCache() {
  try { const ks = await AsyncStorage.getAllKeys(); await AsyncStorage.multiRemove(ks.filter((k) => k.startsWith('c:') || k === 'ed_account' || k === 'ed_snap')); } catch {}
}
// démarrage sans réseau : on reprend le compte enregistré
export async function offlineStart(sess) {
  try {
    const v = await AsyncStorage.getItem('ed_account'); if (!v) return null;
    S.account = JSON.parse(v); S.token = null; S.creds = { identifiant: sess.id, motdepasse: sess.pw, trusted: sess.fa || null };
    return S.account;
  } catch { return null; }
}

let reloginP = null;
function relogin() {
  if (!reloginP) {
    reloginP = (async () => {
      const r = await login(S.creds.identifiant, S.creds.motdepasse, S.creds.trusted);
      if (r.status !== 'ok') throw new Error('Reconnexion impossible : la question de sécurité est demandée. Déconnecte-toi puis reconnecte-toi.');
    })().finally(() => { reloginP = null; });
  }
  return reloginP;
}

async function authed(path, data = {}, retry = true) {
  const k = ck(path, data);
  try {
    if (!S.token && S.creds) await relogin();
    const j = await call(path, data, false);
    if (j.code === 200) { putCache(k, j.data); flag(false); return j.data; }
    if (retry && [520, 525].includes(j.code) && S.creds) { await relogin(); return authed(path, data, false); }
    throw new Error(j.message || `Erreur EcoleDirecte (${j.code})`);
  } catch (e) {
    if (e.net && OFFLINE_ON) { const c = await getCache(k); if (c) { flag(true, c.t); return c.d; } }
    throw e;
  }
}

const id = () => S.account.id;
export const getNotes = () => authed(`/eleves/${id()}/notes.awp?verbe=get`, { anneeScolaire: '' });
export const getEdt = async (from, to) => mergeOgia(await authed(`/E/${id()}/emploidutemps.awp?verbe=get`, { dateDebut: from, dateFin: to, avecTrous: false }), from, to);
export const getDevoirs = () => authed(`/Eleves/${id()}/cahierdetexte.awp?verbe=get`, {});
export const getDevoirsJour = (date) => authed(`/Eleves/${id()}/cahierdetexte/${date}.awp?verbe=get`, {});

export const saveSession = (idf, pw, fa) => SecureStore.setItemAsync('ed_session', JSON.stringify({ id: idf, pw, fa }));
export async function loadSession() {
  try { const v = await SecureStore.getItemAsync('ed_session'); return v ? JSON.parse(v) : null; } catch { return null; }
}
export async function clearSession() {
  S.token = null; S.tfa = null; S.account = null; S.creds = null;
  try { await SecureStore.deleteItemAsync('ed_session'); } catch {}
  await clearCache();
}

const annee = () => { const d = new Date(); const y = d.getFullYear(); return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; };
export const getMessages = () => authed(`/eleves/${id()}/messages.awp?verbe=getall&typeRecuperation=received&orderBy=date&order=desc&page=0&itemsPerPage=100&onlyRead=&query=&idClasseur=0`, { anneeMessages: annee() });
export const getMessage = (mid) => authed(`/eleves/${id()}/messages/${mid}.awp?verbe=get&mode=destinataire`, { anneeMessages: annee() });
export const getVieScolaire = () => authed(`/eleves/${id()}/viescolaire.awp?verbe=get`, {});
export const getTimeline = () => authed(`/eleves/${id()}/timeline.awp?verbe=get`, {});

// --- réglages de compte ---
export async function setStay(on) {
  if (on) { if (S.creds) await saveSession(S.creds.identifiant, S.creds.motdepasse, S.creds.trusted || undefined); }
  else { try { await SecureStore.deleteItemAsync('ed_session'); } catch {} }
}
export async function forgetDevice() {
  if (S.creds) S.creds.trusted = null;
  const s = await loadSession(); if (s) await saveSession(s.id, s.pw, undefined);
}
export async function wipeAll() {
  await clearSession();
  try { await SecureStore.deleteItemAsync('ed_ai'); } catch {}
  try { await AsyncStorage.clear(); } catch {}
}

// préchauffe le cache pour pouvoir tout consulter hors ligne
export async function prefetch() {
  const t = new Date(); const ws = monday(t);
  await Promise.allSettled([
    getNotes(), getVieScolaire(), getTimeline(),
    getEdt(iso(t), iso(addDays(t, 6))),
    getEdt(iso(ws), iso(addDays(ws, 6))),
    getEdt(iso(addDays(ws, 7)), iso(addDays(ws, 13))),
    (async () => { const sum = await getDevoirs(); const dates = Object.keys(sum).filter((d) => d >= iso(t)).sort().slice(0, 10); await Promise.all(dates.map((d) => getDevoirsJour(d).catch(() => {}))); })(),
    (async () => { const m = await getMessages(); await Promise.all((m.messages?.received || []).slice(0, 15).map((x) => getMessage(x.id).catch(() => {}))); })(),
  ]);
}
