import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Switch, Alert } from 'react-native';
import { C, F } from './theme';
import { T } from './ui';
import * as api from './api';

const TABS = [['home', 'Accueil'], ['agenda', 'Agenda'], ['notes', 'Notes'], ['messages', 'Messages']];

export default function Compte({ account, prefs, setPrefs, onLogout, onWipe }) {
  const [stay, setStay] = useState(null); const [msg, setMsg] = useState(''); const [nick, setNick] = useState(prefs.nick || '');
  useEffect(() => { api.loadSession().then((s) => setStay(!!s)); }, []);
  const rows = [
    ['Nom', [account.prenom, account.nom].filter(Boolean).join(' ')],
    ['Identifiant', account.identifiant || account.login],
    ['Email', account.email],
    ['Établissement', account.nomEtablissement],
    ['Classe', account.profile?.classe?.libelle],
    ['Dernière connexion', account.lastConnexion],
  ].filter((r) => r[1]);
  const btn = (color) => ({ borderColor: color, borderWidth: 1, borderRadius: 8, paddingVertical: 14, alignItems: 'center' });
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <T bold style={{ fontSize: 18 }}>Mon compte</T>
      {rows.map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <T style={{ color: C.muted }}>{k}</T><T style={{ flex: 1, textAlign: 'right' }}>{String(v)}</T>
        </View>
      ))}

      <T bold style={{ fontSize: 18, marginTop: 10 }}>Préférences</T>
      <T style={{ color: C.muted, fontSize: 14 }}>Pseudo affiché sur l'accueil</T>
      <TextInput value={nick} onChangeText={setNick} onEndEditing={() => setPrefs({ ...prefs, nick: nick.trim() })} placeholder={String(account.prenom || '').toLowerCase()} placeholderTextColor={C.muted} autoCapitalize="none" autoCorrect={false}
        style={{ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, color: C.text, fontFamily: F.mono, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 }} />
      <T style={{ color: C.muted, fontSize: 14 }}>Écran de démarrage</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TABS.map(([k, label]) => (
          <Pressable key={k} onPress={() => setPrefs({ ...prefs, startTab: k })} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: prefs.startTab === k ? C.accent : C.surface2 }}>
            <T bold style={{ color: prefs.startTab === k ? C.onAccent : C.text }}>{label}</T>
          </Pressable>
        ))}
      </View>

      <T bold style={{ fontSize: 18, marginTop: 10 }}>Connexion</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T style={{ flex: 1 }}>Rester connecté sur ce téléphone</T>
        {stay !== null && <Switch value={stay} onValueChange={async (v) => { setStay(v); await api.setStay(v); }} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T style={{ flex: 1 }}>Mode hors ligne (copie des données sur le téléphone)</T>
        <Switch value={prefs.offline !== false} onValueChange={(v) => setPrefs({ ...prefs, offline: v })} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
      </View>
      <Pressable onPress={async () => { await api.forgetDevice(); setMsg("Appareil oublié : la question de sécurité sera redemandée à la prochaine connexion."); }} style={btn(C.line)}>
        <T bold>Oublier cet appareil</T>
      </Pressable>
      {!!msg && <T style={{ color: C.muted, fontSize: 14 }}>{msg}</T>}
      <Pressable onPress={onLogout} style={btn(C.warn)}><T bold style={{ color: C.warn }}>Se déconnecter</T></Pressable>
      <Pressable onPress={() => Alert.alert('Tout effacer ?', "Supprime ta session, ta clé IA, ton thème et tes préférences de ce téléphone.", [{ text: 'Annuler', style: 'cancel' }, { text: 'Tout effacer', style: 'destructive', onPress: onWipe }])} style={btn(C.bad)}>
        <T bold style={{ color: C.bad }}>Tout effacer et se déconnecter</T>
      </Pressable>
    </ScrollView>
  );
}
