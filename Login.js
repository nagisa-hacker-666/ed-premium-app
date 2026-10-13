import React, { useEffect, useState } from 'react';
import { View, Image, TextInput, Pressable, Switch, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { C, F } from './theme';
import { T } from './ui';
import * as api from './api';

const input = () => ({ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, color: C.text, fontFamily: F.mono, fontSize: 16, paddingHorizontal: 14, paddingVertical: 13 });
const button = () => ({ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center' });

export default function Login({ onLogin }) {
  const [idf, setIdf] = useState(''); const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const go = async () => {
    if (!idf.trim() || !pw) { setErr('Entre ton identifiant et ton mot de passe.'); return; }
    setBusy(true); setErr('');
    try { await onLogin(idf.trim(), pw, remember); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Image source={require('./assets/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} />
        <T bold style={{ fontSize: 30, lineHeight: 36 }}>ED-premium</T>
        <T style={{ color: C.muted, marginBottom: 10 }}>Connecte-toi avec ton compte EcoleDirecte</T>
        <TextInput style={input()} placeholder="identifiant" placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} value={idf} onChangeText={setIdf} />
        <TextInput style={input()} placeholder="mot de passe" placeholderTextColor={C.muted} secureTextEntry autoCapitalize="none" value={pw} onChangeText={setPw} onSubmitEditing={go} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T style={{ color: C.muted }}>Rester connecté</T>
          <Switch value={remember} onValueChange={setRemember} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
        </View>
        {!!err && <T style={{ color: C.bad }}>{err}</T>}
        <Pressable onPress={go} disabled={busy} style={[button(), busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color={C.onAccent} /> : <T bold style={{ color: C.onAccent, fontSize: 16 }}>Se connecter</T>}
        </Pressable>
        <T style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
          Tes identifiants sont stockés chiffrés sur ton téléphone et envoyés uniquement à EcoleDirecte.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Qcm({ onDone, onCancel }) {
  const [q, setQ] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.getQcm().then(setQ).catch((e) => setErr(e.message)); }, []);
  const pick = async (raw) => {
    setBusy(true); setErr('');
    try { await onDone(await api.answerQcm(raw)); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <T bold style={{ fontSize: 24, lineHeight: 30 }}>Question de sécurité</T>
      <T style={{ color: C.muted }}>EcoleDirecte veut vérifier que c'est bien toi.</T>
      {!q && !err && <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />}
      {!!q && <T style={{ color: C.muted, marginBottom: 6 }}>{q.question}</T>}
      {q?.choices.map((c) => (
        <Pressable key={c.raw} disabled={busy} onPress={() => pick(c.raw)} style={{ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, padding: 14 }}>
          <T>{c.label}</T>
        </Pressable>
      ))}
      {!!err && <T style={{ color: C.bad }}>{err}</T>}
      <Pressable onPress={onCancel} style={{ paddingVertical: 12, alignItems: 'center' }}><T style={{ color: C.muted }}>Annuler</T></Pressable>
    </ScrollView>
  );
}
