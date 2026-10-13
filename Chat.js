import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from './theme';
import { T, Linkify } from './ui';
import * as ai from './ai';

const IDEES = ['Qu\'est-ce que j\'ai à faire cette semaine ?', 'Résume mes derniers messages', 'Où j\'en suis dans chaque matière ?', 'Comment remonter ma moyenne ?'];
const clean = (t) => String(t).replace(/\*\*/g, '').replace(/^\s*[*-] /gm, '• ');

export default function Chat({ account, onClose, goSettings }) {
  const [cfg, setCfg] = useState(null); const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState(''); const [busy, setBusy] = useState(false); const sc = useRef();
  useEffect(() => { ai.loadAi().then(setCfg); }, []);

  const send = async (t) => {
    const text = (t ?? txt).trim(); if (!text || busy || !cfg) return;
    setTxt('');
    const next = [...msgs, { role: 'user', content: text }]; setMsgs(next); setBusy(true);
    try {
      const ctx = await ai.buildContext(cfg.share, account);
      const h = next.filter((m) => !m.err).slice(-14).map((m) => ({ role: m.role, content: m.content }));
      while (h[0] && h[0].role === 'assistant') h.shift();
      const out = await ai.ask(cfg, ai.SYSTEM(ctx), h);
      setMsgs((m) => [...m, { role: 'assistant', content: out || '(réponse vide)' }]);
    } catch (e) { setMsgs((m) => [...m, { role: 'assistant', content: e.message, err: true }]); }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <T bold style={{ fontSize: 24 }}>Assistant</T>
        <Pressable onPress={onClose} hitSlop={12}><Feather name="x" size={24} color={C.muted} /></Pressable>
      </View>
      <ScrollView ref={sc} onContentSizeChange={() => sc.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {cfg && !cfg.key && (
          <View style={{ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
            <T>Pour utiliser l'IA, colle ta propre clé API dans les réglages (Gemini et Groq ont une offre gratuite).</T>
            <Pressable onPress={goSettings} style={{ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}>
              <T bold style={{ color: C.onAccent }}>Ouvrir les réglages</T>
            </Pressable>
          </View>
        )}
        {!msgs.length && cfg?.key && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <T style={{ color: C.muted }}>Pose-moi une question sur tes notes, ton emploi du temps, tes devoirs{cfg.share.messages ? ' ou tes messages' : ''}.</T>
            {IDEES.map((i) => (
              <Pressable key={i} onPress={() => send(i)} style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 12 }}><T>{i}</T></Pressable>
            ))}
          </View>
        )}
        {msgs.map((m, i) => (
          <View key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.role === 'user' ? C.accent : C.surface, borderRadius: 14, padding: 12, borderColor: m.err ? C.bad : 'transparent', borderWidth: 1 }}>
            <Linkify plain={m.role === 'user' || !!m.err} selectable style={{ color: m.role === 'user' ? C.onAccent : m.err ? C.bad : C.text, lineHeight: 22 }}>{clean(m.content)}</Linkify>
          </View>
        ))}
        {busy && <View style={{ alignSelf: 'flex-start', backgroundColor: C.surface, borderRadius: 14, padding: 12 }}><T mono style={{ color: C.muted }}>...</T></View>}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderTopColor: C.line, borderTopWidth: 1, alignItems: 'flex-end' }}>
        <TextInput value={txt} onChangeText={setTxt} placeholder="Ta question..." placeholderTextColor={C.muted} multiline
          style={{ flex: 1, maxHeight: 120, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.text, fontFamily: F.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 10 }} />
        <Pressable onPress={() => send()} disabled={busy || !txt.trim()} style={{ backgroundColor: C.accent, borderRadius: 10, padding: 12, opacity: busy || !txt.trim() ? 0.5 : 1 }}>
          <Feather name="send" size={20} color={C.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
