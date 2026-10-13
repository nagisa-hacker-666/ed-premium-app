import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Switch } from 'react-native';
import { C, F } from './theme';
import { T } from './ui';
import * as ai from './ai';

const SHARE = [['notes', 'Notes'], ['edt', 'Emploi du temps'], ['devoirs', 'Devoirs'], ['messages', 'Messages'], ['viesco', 'Vie scolaire (absences, retards)']];
const input = () => ({ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, color: C.text, fontFamily: F.mono, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 });

export default function Settings() {
  const [s, setS] = useState(null); const [saved, setSaved] = useState(false);
  useEffect(() => { ai.loadAi().then(setS); }, []);
  if (!s) return null;
  const set = (p) => { setS({ ...s, ...p }); setSaved(false); };
  const save = async () => { await ai.saveAi({ ...s, key: s.key.trim(), model: s.model.trim() }); setSaved(true); };
  const P = ai.PROVIDERS[s.provider];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <T bold style={{ fontSize: 18 }}>Assistant IA</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Object.keys(ai.PROVIDERS).map((k) => (
          <Pressable key={k} onPress={() => set({ provider: k })} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: s.provider === k ? C.accent : C.surface2 }}>
            <T bold style={{ color: s.provider === k ? C.onAccent : C.text }}>{ai.PROVIDERS[k].label}</T>
          </Pressable>
        ))}
      </View>
      <T style={{ color: C.muted, fontSize: 14 }}>Où prendre une clé : {P.help}</T>
      <TextInput style={input()} placeholder="ta clé API" placeholderTextColor={C.muted} secureTextEntry autoCapitalize="none" autoCorrect={false} value={s.key} onChangeText={(v) => set({ key: v })} />
      <TextInput style={input()} placeholder={`modèle (par défaut : ${P.model})`} placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} value={s.model} onChangeText={(v) => set({ model: v })} />
      <T bold style={{ fontSize: 18, marginTop: 8 }}>Ce que l'IA peut voir</T>
      <T style={{ color: C.muted, fontSize: 14 }}>Ces données sont envoyées au fournisseur de ta clé quand tu poses une question, jamais avant. Les messages contiennent des infos sur d'autres personnes : active-les seulement si tu en as besoin.</T>
      {SHARE.map(([k, label]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T>{label}</T>
          <Switch value={!!s.share[k]} onValueChange={(v) => set({ share: { ...s.share, [k]: v } })} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
        </View>
      ))}
      <Pressable onPress={save} style={{ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
        <T bold style={{ color: C.onAccent }}>{saved ? 'Enregistré ✓' : 'Enregistrer'}</T>
      </Pressable>
    </ScrollView>
  );
}
