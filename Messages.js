import React, { useState } from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C } from './theme';
import { T, Linkify, useLoad, State } from './ui';
import * as api from './api';
import { parseDate, fmtDay, decodeContent, decodeEntities } from './utils';

const who = (f = {}) => decodeEntities([f.civilite, f.prenom, f.nom].filter(Boolean).join(' ')) || 'Inconnu';
const short = (s) => { const d = parseDate(s); return `${d.getDate()}/${d.getMonth() + 1}`; };

function MessageView({ m, onBack }) {
  const q = useLoad(() => api.getMessage(m.id), [m.id]);
  return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 16 }}>
        <Feather name="chevron-left" size={22} color={C.accent} /><T style={{ color: C.accent }}>Messages</T>
      </Pressable>
      <State q={q}>
        {(d) => (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 12 }}>
            <T bold style={{ fontSize: 20, lineHeight: 26 }}>{decodeEntities(d.subject || m.subject)}</T>
            <T style={{ color: C.muted }}>{who(d.from || m.from)}, {fmtDay(parseDate(d.date || m.date))}</T>
            <Linkify selectable style={{ lineHeight: 23 }}>{decodeContent(d.content) || 'Message vide.'}</Linkify>
            {(d.files || []).map((f, i) => <T key={i} mono style={{ color: C.muted }}>{f.libelle}</T>)}
          </ScrollView>
        )}
      </State>
    </View>
  );
}

export default function Messages() {
  const q = useLoad(() => api.getMessages(), []);
  const [open, setOpen] = useState(null);
  if (open) return <MessageView m={open} onBack={() => { setOpen(null); q.reload(); }} />;
  return (
    <State q={q}>
      {(d) => {
        const list = d.messages?.received || [];
        return (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }} refreshControl={<RefreshControl refreshing={q.loading} onRefresh={q.reload} tintColor={C.accent} />}>
            {list.map((m) => (
              <Pressable key={m.id} onPress={() => setOpen(m)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomColor: C.line, borderBottomWidth: 1 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 8, backgroundColor: m.read ? 'transparent' : C.accent }} />
                <View style={{ flex: 1 }}>
                  <T bold={!m.read} numberOfLines={1}>{who(m.from)}</T>
                  <T style={{ color: m.read ? C.muted : C.text }} numberOfLines={1}>{decodeEntities(m.subject)}</T>
                </View>
                <T mono style={{ color: C.muted, fontSize: 13 }}>{short(m.date)}</T>
              </Pressable>
            ))}
            {!list.length && <T style={{ color: C.muted, marginTop: 20 }}>Aucun message.</T>}
          </ScrollView>
        );
      }}
    </State>
  );
}
