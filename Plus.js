import React from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from './theme';
import { T, Linkify, useLoad, State } from './ui';
import * as api from './api';
import { parseDate, fmtDay, stripHtml, decodeEntities } from './utils';
import Settings from './Settings';
import Apparence from './Apparence';
import Compte from './Compte';
import Notifs from './Notifs';
import Credits from './Credits';
import OgiaConnect from './OgiaConnect';

const Back = ({ onPress, title }) => (
  <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16, paddingTop: 0 }}>
    <Feather name="chevron-left" size={22} color={C.accent} /><T style={{ color: C.accent }}>{title}</T>
  </Pressable>
);
const COL = { Absence: C.bad, Retard: C.warn };

function VieSco() {
  const q = useLoad(() => api.getVieScolaire(), []);
  return (
    <State q={q}>
      {(d) => {
        const ar = d.absencesRetards || []; const other = d.sanctionsEncouragements || [];
        const all = [...ar, ...other].sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1));
        const abs = ar.filter((a) => a.typeElement === 'Absence').length; const ret = ar.filter((a) => a.typeElement === 'Retard').length;
        const nj = ar.filter((a) => a.justifie === false).length;
        return (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 4 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <T mono>{abs} absences</T><T mono>{ret} retards</T><T mono style={{ color: nj ? C.warn : C.ok }}>{nj} à justifier</T>
            </View>
            {all.map((a) => (
              <View key={a.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: COL[a.typeElement] || C.accent }} />
                <View style={{ flex: 1 }}>
                  <T bold>{a.typeElement}{a.libelle ? `: ${decodeEntities(a.libelle)}` : ''}</T>
                  <T style={{ color: C.muted, fontSize: 14 }}>{a.displayDate || a.date}{a.matiere ? `, ${a.matiere}` : ''}</T>
                  {!!a.motif && <T style={{ color: C.muted, fontSize: 14 }}>{decodeEntities(a.motif)}</T>}
                </View>
                {COL[a.typeElement] && <T style={{ color: a.justifie ? C.ok : C.warn, fontSize: 13 }}>{a.justifie ? 'justifiée' : 'à justifier'}</T>}
              </View>
            ))}
            {!all.length && <T style={{ color: C.muted }}>Rien à signaler.</T>}
          </ScrollView>
        );
      }}
    </State>
  );
}

function Actus() {
  const q = useLoad(() => api.getTimeline(), []);
  return (
    <State q={q}>
      {(d) => (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
          {(d || []).map((a, i) => (
            <View key={i} style={{ paddingVertical: 12, borderBottomColor: C.line, borderBottomWidth: 1, gap: 2 }}>
              <T bold>{decodeEntities(a.titre)}</T>
              {!!a.soustitre && <T style={{ color: C.muted }}>{decodeEntities(a.soustitre)}</T>}
              {!!a.contenu && <Linkify style={{ color: C.muted, fontSize: 14 }}>{stripHtml(String(a.contenu))}</Linkify>}
              <T mono style={{ color: C.muted, fontSize: 12 }}>{a.date ? fmtDay(parseDate(a.date)) : ''}</T>
            </View>
          ))}
          {!(d || []).length && <T style={{ color: C.muted }}>Rien de neuf.</T>}
        </ScrollView>
      )}
    </State>
  );
}

export default function Plus({ sub, setSub, account, theme, onTheme, prefs, setPrefs, onLogout, onWipe }) {
  const wrap = (el) => <View style={{ flex: 1 }}><Back onPress={() => setSub(null)} title="Plus" />{el}</View>;
  if (sub === 'vie') return wrap(<VieSco />);
  if (sub === 'actus') return wrap(<Actus />);
  if (sub === 'compte') return wrap(<Compte account={account} prefs={prefs} setPrefs={setPrefs} onLogout={onLogout} onWipe={onWipe} />);
  if (sub === 'theme') return wrap(<Apparence theme={theme} onTheme={onTheme} />);
  if (sub === 'ia') return wrap(<Settings />);
  if (sub === 'notifs') return wrap(<Notifs />);
  if (sub === 'credits') return wrap(<Credits />);
  if (sub === 'ogia') return wrap(<OgiaConnect />);
  const row = (k, icon, label) => (
    <Pressable key={k} onPress={() => setSub(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomColor: C.line, borderBottomWidth: 1 }}>
      <Feather name={icon} size={22} color={C.accent} /><T style={{ flex: 1, fontSize: 17 }}>{label}</T><Feather name="chevron-right" size={20} color={C.muted} />
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
      {row('ogia', 'calendar', 'Ateliers Ogia')}{row('vie', 'clock', 'Vie scolaire')}{row('actus', 'rss', 'Actualités')}{row('notifs', 'bell', 'Notifications')}{row('compte', 'user', 'Mon compte')}{row('theme', 'droplet', 'Apparence')}{row('ia', 'cpu', 'Assistant IA')}{row('credits', 'info', 'À propos et crédits')}
    </ScrollView>
  );
}
