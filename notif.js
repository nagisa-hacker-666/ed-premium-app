import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as api from './api';
import { iso, addDays, decodeEntities } from './utils';

const TASK = 'ed-ciel-check';
const CH = 'ed-ciel';
export const NOTIF_DEFAULT = { on: false, notes: true, messages: true, devoirs: true, interro: true };

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function loadNotif() {
  try { const v = await AsyncStorage.getItem('ed_notif'); return v ? { ...NOTIF_DEFAULT, ...JSON.parse(v) } : NOTIF_DEFAULT; } catch { return NOTIF_DEFAULT; }
}
export const saveNotif = (c) => AsyncStorage.setItem('ed_notif', JSON.stringify(c)).catch(() => {});

async function notify(title, body) {
  const content = { title, body };
  try { await Notifications.scheduleNotificationAsync({ content, trigger: { channelId: CH } }); }
  catch { await Notifications.scheduleNotificationAsync({ content, trigger: null }); }
}
export const testNotif = () => notify('ED-premium', 'Les notifications fonctionnent ✅');

const dm = (d) => { const [, m, j] = d.split('-'); return `${Number(j)}/${Number(m)}`; };

// notifyOn=false : met seulement à jour ce que tu as déjà vu (aucune notification)
export async function check(notifyOn) {
  const cfg = await loadNotif();
  const [notes, msgs, dev] = await Promise.all([api.getNotes().catch(() => null), api.getMessages().catch(() => null), api.getDevoirs().catch(() => null)]);
  if (!notes && !msgs && !dev) return;
  let prev = null; try { prev = JSON.parse((await AsyncStorage.getItem('ed_snap')) || 'null'); } catch {}
  const next = prev ? { ...prev } : { notes: [], messages: [], devoirs: [], interro: [] };
  const out = [];
  const now = new Date(); const today = iso(now);

  if (notes) {
    const list = notes.notes || [];
    if (prev && notifyOn && cfg.notes) {
      const fresh = list.filter((n) => !prev.notes.includes(String(n.id)));
      if (fresh.length) out.push([fresh.length > 1 ? `${fresh.length} nouvelles notes` : 'Nouvelle note',
        fresh.slice(0, 3).map((n) => `${decodeEntities(n.libelleMatiere)} : ${n.valeur}/${n.noteSur}`).join('\n')]);
    }
    next.notes = list.map((n) => String(n.id));
  }
  if (msgs) {
    const list = msgs.messages?.received || [];
    if (prev && notifyOn && cfg.messages) {
      const fresh = list.filter((m) => !prev.messages.includes(String(m.id)) && !m.read);
      if (fresh.length === 1) {
        const f = fresh[0].from || {};
        out.push([`Message de ${decodeEntities([f.civilite, f.prenom, f.nom].filter(Boolean).join(' ') || 'quelqu\'un')}`, decodeEntities(fresh[0].subject || '')]);
      } else if (fresh.length > 1) out.push([`${fresh.length} nouveaux messages`, fresh.slice(0, 3).map((m) => decodeEntities(m.subject || '')).join('\n')]);
    }
    next.messages = list.map((m) => String(m.id));
  }
  if (dev) {
    const all = Object.keys(dev).flatMap((d) => dev[d].map((x) => ({ ...x, date: d })));
    if (prev && notifyOn && cfg.devoirs) {
      const fresh = all.filter((x) => !prev.devoirs.includes(String(x.idDevoir)));
      if (fresh.length) out.push([fresh.length > 1 ? `${fresh.length} nouveaux devoirs` : 'Nouveau devoir',
        fresh.slice(0, 3).map((x) => `${decodeEntities(x.matiere)} pour le ${dm(x.date)}`).join('\n')]);
    }
    next.devoirs = all.map((x) => String(x.idDevoir));
    const demain = iso(addDays(now, 1));
    const inter = (dev[demain] || []).filter((x) => x.interrogation);
    next.interro = (next.interro || []).filter((d) => d >= today);
    if (prev && notifyOn && cfg.interro && now.getHours() >= 16 && inter.length && !next.interro.includes(demain)) {
      out.push(['Interro demain', inter.map((x) => decodeEntities(x.matiere)).join(', ')]);
      next.interro.push(demain);
    }
  }
  await AsyncStorage.setItem('ed_snap', JSON.stringify(next));
  for (const [t, b] of out) await notify(t, b);
}

async function backgroundRun() {
  if (AppState.currentState === 'active') return;
  const s = await api.loadSession(); if (!s) return;
  const last = Number((await AsyncStorage.getItem('ed_last_check')) || 0);
  if (Date.now() - last < 20 * 60 * 1000) return;
  await AsyncStorage.setItem('ed_last_check', String(Date.now()));
  const r = await api.login(s.id, s.pw, s.fa || null);
  if (r.status !== 'ok') return;
  await check(true);
}
TaskManager.defineTask(TASK, async () => {
  try { await backgroundRun(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});

export async function enableNotifs() {
  let st = (await Notifications.getPermissionsAsync()).status;
  if (st !== 'granted') st = (await Notifications.requestPermissionsAsync()).status;
  if (st !== 'granted') throw new Error("Notifications refusées : autorise-les dans Réglages Android > Applis > ED-premium > Notifications.");
  try { await Notifications.setNotificationChannelAsync(CH, { name: 'ED-premium', importance: Notifications.AndroidImportance.HIGH }); } catch {}
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 });
  await check(false);
}
export async function disableNotifs() { try { await BackgroundTask.unregisterTaskAsync(TASK); } catch {} }

// à chaque ouverture : réarme la tâche et mémorise ce que tu as déjà vu
export async function afterLogin() {
  const c = await loadNotif(); if (!c.on) return;
  try { await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 30 }); } catch {}
  await check(false);
}
