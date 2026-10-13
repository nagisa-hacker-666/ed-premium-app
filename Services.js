import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, ScrollView, Alert, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { C } from './theme';
import { T } from './ui';
import OgiaConnect from './OgiaConnect';
import { loadServices, addService, removeService, normalizeUrl, hostOf } from './servicesStore';

const IDEES = ['Cantine', 'ENT', 'CDI', 'Pronote', 'Vie scolaire'];
const card = { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 14 };
const input = { color: C.text, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 };

function BackRow({ onBack, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 8 }}>
      <Pressable onPress={onBack} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Feather name="chevron-left" size={20} color={C.accent} /><T style={{ color: C.accent }}>Services</T>
      </Pressable>
      {children}
    </View>
  );
}

export default function Services() {
  const [list, setList] = useState([]);
  const [view, setView] = useState(null); // null | 'ogia' | { id, name, url }
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const web = useRef(null);

  useEffect(() => { loadServices().then(setList); }, []);

  const add = async () => {
    if (!name.trim()) return setErr('Donne un nom au service.');
    if (!normalizeUrl(url)) return setErr("Adresse invalide (ex : monsite.fr). Seules les adresses https sont acceptées.");
    const l = await addService(name, url);
    if (l) { setList(l); setName(''); setUrl(''); setErr(''); }
  };
  const del = (s) => Alert.alert(s.name, 'Supprimer ce service ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => setList(await removeService(s.id)) },
  ]);

  if (view === 'ogia') return <View style={{ flex: 1 }}><BackRow onBack={() => setView(null)} /><OgiaConnect /></View>;

  if (view) {
    return (
      <View style={{ flex: 1 }}>
        <BackRow onBack={() => setView(null)}>
          <Pressable onPress={() => web.current && web.current.reload()} hitSlop={10}><T style={{ color: C.accent }}>Actualiser</T></Pressable>
          <Pressable onPress={() => Linking.openURL(view.url)} hitSlop={10}><T style={{ color: C.muted }}>Navigateur</T></Pressable>
        </BackRow>
        <WebView ref={web} source={{ uri: view.url }} originWhitelist={['https://*']} setSupportMultipleWindows={false}
          allowFileAccess={false} mixedContentMode="never" sharedCookiesEnabled thirdPartyCookiesEnabled domStorageEnabled
          onShouldStartLoadWithRequest={(r) => /^https:\/\//i.test(r.url)} style={{ flex: 1, backgroundColor: C.bg }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled">
      <T style={{ color: C.muted, lineHeight: 21 }}>Ouvre les sites et applications de ton lycée sans quitter l'app. Tu te connectes toi-même dans la page du service : ton mot de passe n'est jamais lu par l'app.</T>

      <Pressable onPress={() => setView('ogia')} style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Feather name="calendar" size={22} color={C.accent} />
        <View style={{ flex: 1 }}><T bold>Ateliers Ogia</T><T style={{ color: C.muted, fontSize: 13 }}>Ajoute tes ateliers à l'emploi du temps</T></View>
        <Feather name="chevron-right" size={20} color={C.muted} />
      </Pressable>

      {list.map((s) => (
        <Pressable key={s.id} onPress={() => setView(s)} onLongPress={() => del(s)} style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Feather name="globe" size={22} color={C.accent} />
          <View style={{ flex: 1 }}><T bold>{s.name}</T><T mono style={{ color: C.muted, fontSize: 12 }}>{hostOf(s.url)}</T></View>
          <Feather name="chevron-right" size={20} color={C.muted} />
        </Pressable>
      ))}

      <T bold style={{ fontSize: 18, marginTop: 12 }}>Ajouter un service</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {IDEES.map((i) => (
          <Pressable key={i} onPress={() => setName(i)} style={{ borderColor: C.line, borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 }}>
            <T style={{ color: C.muted, fontSize: 13 }}>{i}</T>
          </Pressable>
        ))}
      </View>
      <TextInput value={name} onChangeText={setName} placeholder="Nom (ex : Cantine)" placeholderTextColor={C.muted} style={input} maxLength={40} />
      <TextInput value={url} onChangeText={setUrl} placeholder="Adresse (ex : monsite.fr)" placeholderTextColor={C.muted}
        autoCapitalize="none" autoCorrect={false} keyboardType="url" style={input} />
      {!!err && <T style={{ color: C.bad }}>{err}</T>}
      <Pressable onPress={add} style={{ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}>
        <T bold style={{ color: C.onAccent }}>Ajouter</T>
      </Pressable>
      <T style={{ color: C.muted, fontSize: 12 }}>Appui long sur un service pour le supprimer. Les services restent uniquement sur ton téléphone.</T>
    </ScrollView>
  );
}
