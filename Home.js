import React, { useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl, Vibration } from 'react-native';
import { C } from './theme';
import { T, useLoad, State } from './ui';
import * as api from './api';
import AnneeCard from './Annee';
import { GREETINGS } from './eggBus';
import { iso, addDays, parseDate, hhmm, fmtDay, pad, cableColor, computeAverages, fmt, gradeOn20 } from './utils';

const cap = (s = '') => { const t = String(s).trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
function rel(start, end) {
  const now = new Date();
  if (now >= start && now < end) return 'En cours';
  const m = Math.round((start - now) / 60000);
  if (m < 60) return `Dans ${m} min`;
  if (iso(start) === iso(now)) return `Dans ${Math.floor(m / 60)} h ${pad(m % 60)}`;
  return cap(fmtDay(start));
}
const Pill = ({ label, color, onPress }) => (
  <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.surface2 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /><T>{label}</T>
  </Pressable>
);

export default function Home({ account, go, nick }) {
  const [gv, setGv] = useState(-1);
  const q = useLoad(async () => {
    const t = new Date();
    const [edt, dev, notes, msgs, vie] = await Promise.all([
      api.getEdt(iso(t), iso(addDays(t, 6))).catch(() => []),
      api.getDevoirs().catch(() => ({})),
      api.getNotes().catch(() => null),
      api.getMessages().catch(() => null),
      api.getVieScolaire().catch(() => null),
    ]);
    return { edt, dev, notes, msgs, vie };
  }, []);
  const name = nick ? nick.trim() : cap(account.prenom || '');

  return (
    <State q={q}>
      {({ edt, dev, notes, msgs, vie }) => {
        const now = new Date(); const today = iso(now);
        const all = (edt || []).map((c) => ({ ...c, s: parseDate(c.start_date), e: parseDate(c.end_date) })).sort((a, b) => a.s - b.s);
        const next = all.filter((c) => !c.isAnnule && c.e > now)[0];
        const todayList = all.filter((c) => iso(c.s) === today);
        const allNotes = notes?.notes || [];
        const { general } = computeAverages(allNotes);
        const upcoming = Object.keys(dev).filter((d) => d >= today).sort();
        const left = upcoming.reduce((n, d) => n + dev[d].filter((x) => !x.effectue).length, 0);
        const unread = (msgs?.messages?.received || []).filter((m) => !m.read).length;
        const toJustify = (vie?.absencesRetards || []).filter((a) => a.justifie === false).length;
        const lastNotes = [...allNotes].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
        const s = (n) => (n > 1 ? 's' : '');
        return (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
            <View>
              <Pressable delayLongPress={500} onLongPress={() => { Vibration.vibrate(30); setGv((v) => (v + 1) % GREETINGS.length); }}>
                <T bold style={{ fontSize: 28, lineHeight: 34 }}>{gv >= 0 ? GREETINGS[gv](name || 'toi') : C.fun ? (name ? `Coucou ${name} 💖` : 'Coucou 💖') : (name ? `Bonjour ${name}` : 'Bonjour')}</T>
              </Pressable>
              <T style={{ color: C.muted }}>{cap(fmtDay(now))}</T>
            </View>

            <View style={{ gap: 8 }}>
              <T bold style={{ fontSize: 18 }}>Prochain cours</T>
              {next ? (
                <View style={{ flexDirection: 'row', gap: 14, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 16 }}>
                  <View style={{ width: 5, borderRadius: 3, backgroundColor: cableColor(next.codeMatiere) }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ color: C.accent, fontSize: 13 }}>{rel(next.s, next.e)}</T>
                    <T bold style={{ fontSize: 20 }}>{next.matiere || next.text}</T>
                    <T mono style={{ color: C.muted }}>{hhmm(next.s)} > {hhmm(next.e)}</T>
                  </View>
                  {!!next.salle && <T mono bold style={{ fontSize: 18 }}>{next.salle}</T>}
                </View>
              ) : <T style={{ color: C.muted }}>Pas de cours à venir cette semaine.</T>}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {general != null && <Pill label={`Moyenne ${fmt(general)}`} color={C.accent} onPress={() => go('notes')} />}
              <Pill label={left ? `${left} devoir${s(left)} à faire` : (C.fun ? 'Aucun devoir ✨' : 'Aucun devoir à faire')} color={left ? C.warn : C.ok} onPress={() => go('agenda')} />
              <Pill label={unread ? `${unread} message${s(unread)} non lu${s(unread)}` : 'Aucun nouveau message'} color={unread ? C.accent : C.ok} onPress={() => go('messages')} />
              {toJustify > 0 && <Pill label={`${toJustify} absence${s(toJustify)} à justifier`} color={C.warn} onPress={() => go('plus', 'vie')} />}
            </View>

            <AnneeCard />

            {todayList.length > 0 && (
              <View>
                <T bold style={{ fontSize: 18, marginBottom: 6 }}>Aujourd'hui</T>
                {todayList.map((c) => (
                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomColor: C.line, borderBottomWidth: 1, opacity: c.e < now || c.isAnnule ? 0.45 : 1 }}>
                    <T mono style={{ width: 48, color: C.muted }}>{hhmm(c.s)}</T>
                    <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: cableColor(c.codeMatiere) }} />
                    <T bold style={[{ flex: 1 }, c.isAnnule && { textDecorationLine: 'line-through' }]}>{c.matiere || c.text}</T>
                    {!!c.salle && <T mono style={{ color: C.muted }}>{c.salle}</T>}
                  </View>
                ))}
              </View>
            )}

            <View>
              <T bold style={{ fontSize: 18, marginBottom: 6 }}>Prochains devoirs</T>
              {upcoming.slice(0, 3).map((d) => (
                <Pressable key={d} onPress={() => go('agenda')} style={{ paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1 }}>
                  <T bold>{cap(fmtDay(parseDate(d)))}</T>
                  <T style={{ color: C.muted }}>{dev[d].map((x) => x.matiere).join(', ')}</T>
                </Pressable>
              ))}
              {!upcoming.length && <T style={{ color: C.muted }}>{C.fun ? 'Rien à faire, profite ✨' : "Rien à faire pour l'instant."}</T>}
            </View>

            <View>
              <T bold style={{ fontSize: 18, marginBottom: 6 }}>Dernières notes</T>
              {lastNotes.map((n) => {
                const g = gradeOn20(n);
                return (
                  <Pressable key={n.id} onPress={() => go('notes')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1, gap: 12 }}>
                    <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: cableColor(n.codeMatiere) }} />
                    <View style={{ flex: 1 }}>
                      <T bold>{n.libelleMatiere}</T>
                      <T style={{ color: C.muted }} numberOfLines={1}>{n.devoir}</T>
                    </View>
                    <T mono bold style={{ fontSize: 18, color: g == null ? C.muted : g >= 14 ? C.ok : g < 8 ? C.bad : C.text }}>{n.valeur}</T>
                  </Pressable>
                );
              })}
              {!lastNotes.length && <T style={{ color: C.muted }}>Aucune note pour l'instant.</T>}
            </View>
          </ScrollView>
        );
      }}
    </State>
  );
}
