import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './theme';
import { T, Linkify, useLoad, State } from './ui';
import * as api from './api';
import { iso, parseDate, fmtDay, b64decode, stripHtml, cableColor } from './utils';

export default function Devoirs() {
  const [done, setDone] = useState({});
  useEffect(() => { AsyncStorage.getItem('ed_done').then((v) => v && setDone(JSON.parse(v))).catch(() => {}); }, []);
  const toggle = (id, cur) => { const n = { ...done, [id]: !cur }; setDone(n); AsyncStorage.setItem('ed_done', JSON.stringify(n)).catch(() => {}); };

  const q = useLoad(async () => {
    const sum = await api.getDevoirs(); const today = iso(new Date());
    const dates = Object.keys(sum).filter((d) => d >= today).sort().slice(0, 10);
    return Promise.all(dates.map(async (date) => {
      try {
        const r = await api.getDevoirsJour(date);
        const items = (r.matieres || []).filter((m) => m.aFaire).map((m) => ({
          id: String(m.aFaire.idDevoir), matiere: m.matiere, code: m.codeMatiere, prof: m.nomProf,
          text: stripHtml(b64decode(m.aFaire.contenu || '')), interro: m.interrogation || m.aFaire.interrogation, effectue: !!m.aFaire.effectue,
        }));
        return { date, items };
      } catch { return { date, items: [], err: true }; }
    }));
  }, []);

  return (
    <State q={q}>
      {(days) => (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
          {days.map((d) => (
            <View key={d.date} style={{ gap: 4 }}>
              <T bold style={{ fontSize: 18 }}>{fmtDay(parseDate(d.date))}</T>
              {d.err && <T style={{ color: C.bad }}>Impossible de charger ce jour.</T>}
              {d.items.map((it) => {
                const ok = done[it.id] ?? it.effectue;
                return (
                  <Pressable key={it.id} onPress={() => toggle(it.id, ok)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1, opacity: ok ? 0.5 : 1 }}>
                    <View style={{ width: 4, borderRadius: 2, backgroundColor: cableColor(it.code) }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T bold>{it.matiere}{it.interro ? '  (interro)' : ''}</T>
                      <Linkify style={[{ color: C.muted, lineHeight: 21 }, ok && { textDecorationLine: 'line-through' }]}>{it.text || 'Pas de détail.'}</Linkify>
                    </View>
                    <Feather name={ok ? 'check-square' : 'square'} size={22} color={ok ? C.ok : C.muted} />
                  </Pressable>
                );
              })}
            </View>
          ))}
          {!days.length && <T style={{ color: C.muted }}>Aucun devoir à venir.</T>}
        </ScrollView>
      )}
    </State>
  );
}
