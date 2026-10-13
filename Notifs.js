import React, { useEffect, useState } from 'react';
import { ScrollView, View, Switch, Pressable } from 'react-native';
import { C } from './theme';
import { T } from './ui';
import * as api from './api';
import * as notif from './notif';

const KINDS = [['notes', 'Nouvelles notes'], ['messages', 'Nouveaux messages'], ['devoirs', 'Nouveaux devoirs'], ['interro', "Rappel d'interro (la veille, dès 16 h)"]];

export default function Notifs() {
  const [cfg, setCfg] = useState(null); const [stay, setStay] = useState(true); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { notif.loadNotif().then(setCfg); api.loadSession().then((s) => setStay(!!s)); }, []);
  if (!cfg) return null;
  const save = (c) => { setCfg(c); notif.saveNotif(c); };
  const main = async (v) => {
    setMsg(''); setBusy(true);
    try { if (v) await notif.enableNotifs(); else await notif.disableNotifs(); save({ ...cfg, on: v }); } catch (e) { setMsg(e.message); }
    setBusy(false);
  };
  const run = async (fn, ok) => { setMsg(''); setBusy(true); try { await fn(); setMsg(ok); } catch (e) { setMsg(e.message); } setBusy(false); };
  const btn = { backgroundColor: C.surface2, borderRadius: 8, paddingVertical: 13, alignItems: 'center', opacity: busy ? 0.6 : 1 };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T bold style={{ fontSize: 18 }}>Notifications</T>
        <Switch value={cfg.on} disabled={busy} onValueChange={main} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
      </View>
      {!stay && <T style={{ color: C.warn, fontSize: 14 }}>« Rester connecté » est désactivé (Plus > Mon compte) : sans ça, l'appli ne peut pas se connecter en arrière-plan.</T>}
      {KINDS.map(([k, label]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: cfg.on ? 1 : 0.5 }}>
          <T style={{ flex: 1 }}>{label}</T>
          <Switch value={!!cfg[k]} disabled={!cfg.on} onValueChange={(v) => save({ ...cfg, [k]: v })} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
        </View>
      ))}
      <Pressable disabled={busy} onPress={() => run(notif.testNotif, 'Notification de test envoyée.')} style={btn}><T bold>Tester une notification</T></Pressable>
      <Pressable disabled={busy || !cfg.on} onPress={() => run(() => notif.check(true), 'Vérification terminée.')} style={[btn, !cfg.on && { opacity: 0.4 }]}><T bold>Vérifier maintenant</T></Pressable>
      {!!msg && <T style={{ color: C.muted, fontSize: 14 }}>{msg}</T>}
      <T style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
        Android vérifie en arrière-plan environ toutes les 30 minutes, parfois moins souvent pour économiser la batterie. Pour de meilleurs résultats : Réglages Android > Applis > ED-premium > Batterie > Sans restriction.
      </T>
    </ScrollView>
  );
}
