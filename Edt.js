import React, { useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from './theme';
import { T, useLoad, State } from './ui';
import * as api from './api';
import { addDays, monday, iso, parseDate, hhmm, fmtDay, cableColor } from './utils';

const L = ['L', 'M', 'M', 'J', 'V', 'S'];

export default function Edt() {
  const [sel, setSel] = useState(() => { const t = new Date(); return t.getDay() === 0 ? addDays(t, 1) : t; });
  const ws = monday(sel);
  const q = useLoad(() => api.getEdt(iso(ws), iso(addDays(ws, 6))), [iso(ws)]);
  const Arrow = ({ n, name }) => (
    <Pressable onPress={() => setSel(addDays(sel, n))} hitSlop={10} style={{ padding: 6 }}><Feather name={name} size={22} color={C.muted} /></Pressable>
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 4 }}>
        <Arrow n={-7} name="chevron-left" />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
          {L.map((l, i) => {
            const d = addDays(ws, i); const on = iso(d) === iso(sel);
            return (
              <Pressable key={i} onPress={() => setSel(d)} style={{ alignItems: 'center', paddingVertical: 6, width: 40, borderRadius: 8, backgroundColor: on ? C.accent : 'transparent' }}>
                <T style={{ color: on ? C.onAccent : C.muted, fontSize: 13 }}>{l}</T>
                <T mono bold style={{ color: on ? C.onAccent : C.text }}>{d.getDate()}</T>
              </Pressable>
            );
          })}
        </View>
        <Arrow n={7} name="chevron-right" />
      </View>
      <T bold style={{ paddingHorizontal: 16, paddingVertical: 10, fontSize: 17 }}>{fmtDay(sel)}</T>
      <State q={q}>
        {(data) => {
          const day = (data || []).filter((c) => iso(parseDate(c.start_date)) === iso(sel)).sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
          return (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
              {day.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', gap: 12, opacity: c.isAnnule ? 0.5 : 1 }}>
                  <View style={{ width: 48 }}>
                    <T mono bold>{hhmm(parseDate(c.start_date))}</T>
                    <T mono style={{ color: C.muted, fontSize: 13 }}>{hhmm(parseDate(c.end_date))}</T>
                  </View>
                  <View style={{ width: 4, borderRadius: 2, backgroundColor: cableColor(c.codeMatiere) }} />
                  <View style={{ flex: 1 }}>
                    <T bold style={c.isAnnule && { textDecorationLine: 'line-through' }}>{c.matiere || c.text}</T>
                    {!!c.prof && <T style={{ color: C.muted, fontSize: 14 }}>{c.prof}</T>}
                    {c.isAnnule && <T style={{ color: C.bad, fontSize: 13 }}>Cours annulé</T>}
                  </View>
                  {!!c.salle && <T mono style={{ color: C.muted }}>{c.salle}</T>}
                </View>
              ))}
              {!day.length && <T style={{ color: C.muted, marginTop: 20 }}>Pas de cours ce jour-là.</T>}
            </ScrollView>
          );
        }}
      </State>
    </View>
  );
}
