import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { C } from './theme';
import { T, useLoad, State } from './ui';
import * as api from './api';
import { checkTwenty } from './Eggs';
import { cableColor, computeAverages, fmt, gradeOn20, parseDate } from './utils';

export default function Notes() {
  const q = useLoad(() => api.getNotes(), []);
  const [per, setPer] = useState(null); const [open, setOpen] = useState({});
  useEffect(() => { if (q.data) checkTwenty(q.data.notes); }, [q.data]);
  return (
    <State q={q}>
      {(d) => {
        const periodes = d.periodes || [];
        const now = new Date();
        const cur = per ?? (periodes.find((p) => parseDate(p.dateDebut) <= now && now <= parseDate(p.dateFin))?.codePeriode ?? 'all');
        const notes = (d.notes || []).filter((n) => cur === 'all' || n.codePeriode === cur);
        const { list, general } = computeAverages(notes);
        const chip = (code, label) => (
          <Pressable key={code} onPress={() => setPer(code)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: cur === code ? C.accent : C.surface2 }}>
            <T bold style={{ color: cur === code ? C.onAccent : C.text }}>{label}</T>
          </Pressable>
        );
        return (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {periodes.map((p) => chip(p.codePeriode, p.periode))}
              {chip('all', "Toute l'année")}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <T style={{ color: C.muted }}>Moyenne générale (estimée)</T>
              <T mono bold style={{ fontSize: 22 }}>{fmt(general)}</T>
            </View>
            {list.sort((a, b) => a.label.localeCompare(b.label)).map((s) => (
              <View key={s.code} style={{ borderBottomColor: C.line, borderBottomWidth: 1, paddingBottom: 6 }}>
                <Pressable onPress={() => setOpen({ ...open, [s.code]: !open[s.code] })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: cableColor(s.code) }} />
                  <T bold style={{ flex: 1 }}>{s.label}</T>
                  <T mono bold style={{ fontSize: 18 }}>{fmt(s.avg)}</T>
                </Pressable>
                {open[s.code] && s.notes.sort((a, b) => (a.date < b.date ? 1 : -1)).map((n) => {
                  const g = gradeOn20(n);
                  return (
                    <View key={n.id} style={{ flexDirection: 'row', paddingLeft: 16, paddingVertical: 6, gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <T>{n.devoir}</T>
                        <T style={{ color: C.muted, fontSize: 13 }}>{n.date}  coef {n.coef}{n.moyenneClasse ? `  classe ${n.moyenneClasse}` : ''}</T>
                      </View>
                      <T mono bold style={{ color: g == null ? C.muted : g >= 14 ? C.ok : g < 8 ? C.bad : C.text }}>{n.valeur}<T mono style={{ color: C.muted, fontSize: 12 }}>/{n.noteSur}</T></T>
                    </View>
                  );
                })}
              </View>
            ))}
            {!list.length && <T style={{ color: C.muted }}>Aucune note sur cette période.</T>}
          </ScrollView>
        );
      }}
    </State>
  );
}
