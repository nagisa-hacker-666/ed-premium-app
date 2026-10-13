import React, { useState } from 'react';
import { ScrollView, View, Image, Pressable, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { C, F, THEMES, ACCENTS } from './theme';
import { T } from './ui';

const BGS = ['#000000', '#0B1220', '#14161C', '#1D1326', '#0F2318', '#2B0F1F', '#F4F7FB', '#FFF4F9', '#FFFFFF'];
const DIMS = [['Léger', 0.35], ['Moyen', 0.6], ['Fort', 0.85]];
const hexOk = (h) => /^#[0-9a-f]{6}$/i.test((h || '').trim());
const input = () => ({ flex: 1, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, color: C.text, fontFamily: F.mono, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 });

export default function Apparence({ theme, onTheme }) {
  const [hex, setHex] = useState(theme.accent || ''); const [bgHex, setBgHex] = useState(theme.bg || ''); const [err, setErr] = useState('');
  const pick = (patch) => onTheme({ ...theme, ...patch });
  const dim = theme.dim ?? 0.6;

  const chooseImage = async () => {
    setErr('');
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 19], quality: 0.8 });
      if (r.canceled || !r.assets || !r.assets[0]) return;
      let uri = r.assets[0].uri;
      try {
        const dest = new File(Paths.document, `fond-${Date.now()}.jpg`);
        new File(uri).copy(dest); uri = dest.uri;
      } catch {}
      if (theme.bgImage && theme.bgImage.includes('fond-')) { try { new File(theme.bgImage).delete(); } catch {} }
      pick({ bgImage: uri, dim });
    } catch { setErr("Impossible d'ouvrir la galerie."); }
  };
  const removeImage = () => {
    if (theme.bgImage && theme.bgImage.includes('fond-')) { try { new File(theme.bgImage).delete(); } catch {} }
    pick({ bgImage: '' });
  };
  const chip = (on) => ({ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, backgroundColor: on ? C.accent : C.surface2 });
  const okBtn = { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <T bold style={{ fontSize: 18 }}>Thème</T>
      {Object.keys(THEMES).filter((k) => !THEMES[k].hidden || theme.name === k).map((k) => {
        const t = THEMES[k]; const on = theme.name === k;
        return (
          <Pressable key={k} onPress={() => pick({ name: k })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: on ? C.accent : C.line, backgroundColor: C.surface }}>
            <View style={{ flexDirection: 'row' }}>
              {[t.bg, t.surface2, t.accent].map((c, i) => <View key={i} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c, marginLeft: i ? -8 : 0, borderWidth: 1, borderColor: C.line }} />)}
            </View>
            <T bold style={{ flex: 1 }}>{t.label}</T>
            {on && <T style={{ color: C.accent }}>actif</T>}
          </Pressable>
        );
      })}

      <T bold style={{ fontSize: 18, marginTop: 8 }}>Couleur d'accent</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Pressable onPress={() => { setHex(''); pick({ accent: '' }); }} style={chip(!theme.accent)}><T bold style={{ color: !theme.accent ? C.onAccent : C.text }}>Par défaut</T></Pressable>
        {ACCENTS.map((a) => (
          <Pressable key={a} onPress={() => { setHex(a); pick({ accent: a }); }} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: a, borderWidth: theme.accent === a ? 3 : 0, borderColor: C.text }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput value={hex} onChangeText={setHex} placeholder="#RRGGBB perso" placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} style={input()} />
        <Pressable onPress={() => (hexOk(hex) ? (setErr(''), pick({ accent: hex.trim() })) : setErr('Format attendu : #RRGGBB (ex : #FF8A3D)'))} style={okBtn}><T bold style={{ color: C.onAccent }}>OK</T></Pressable>
      </View>

      <T bold style={{ fontSize: 18, marginTop: 8 }}>Couleur de fond</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Pressable onPress={() => { setBgHex(''); pick({ bg: '' }); }} style={chip(!theme.bg)}><T bold style={{ color: !theme.bg ? C.onAccent : C.text }}>Du thème</T></Pressable>
        {BGS.map((b) => (
          <Pressable key={b} onPress={() => { setBgHex(b); pick({ bg: b }); }} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: b, borderWidth: theme.bg === b ? 3 : 1, borderColor: theme.bg === b ? C.accent : C.line }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput value={bgHex} onChangeText={setBgHex} placeholder="#RRGGBB perso" placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false} style={input()} />
        <Pressable onPress={() => (hexOk(bgHex) ? (setErr(''), pick({ bg: bgHex.trim() })) : setErr('Format attendu : #RRGGBB (ex : #101820)'))} style={okBtn}><T bold style={{ color: C.onAccent }}>OK</T></Pressable>
      </View>

      <T bold style={{ fontSize: 18, marginTop: 8 }}>Image de fond</T>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        {!!theme.bgImage && <Image source={{ uri: theme.bgImage }} style={{ width: 90, height: 190, borderRadius: 12, borderWidth: 1, borderColor: C.line }} />}
        <View style={{ flex: 1, gap: 10 }}>
          <Pressable onPress={chooseImage} style={{ backgroundColor: C.surface2, borderRadius: 8, paddingVertical: 13, alignItems: 'center' }}>
            <T bold>{theme.bgImage ? "Changer l'image" : 'Choisir une image'}</T>
          </Pressable>
          {!!theme.bgImage && (
            <>
              <Pressable onPress={removeImage} style={{ borderColor: C.line, borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' }}><T>Retirer l'image</T></Pressable>
              <T style={{ color: C.muted, fontSize: 14 }}>Voile sur l'image (pour garder le texte lisible)</T>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIMS.map(([label, v]) => <Pressable key={label} onPress={() => pick({ dim: v })} style={chip(dim === v)}><T bold style={{ color: dim === v ? C.onAccent : C.text, fontSize: 13 }}>{label}</T></Pressable>)}
              </View>
            </>
          )}
        </View>
      </View>
      {!!err && <T style={{ color: C.bad }}>{err}</T>}
    </ScrollView>
  );
}
