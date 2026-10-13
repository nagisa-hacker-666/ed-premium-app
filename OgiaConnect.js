import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import { C } from './theme';
import { T } from './ui';
import { saveOgiaHtml, getHost, setHost, clearHost } from './ogiaStore';

// Récupère le HTML brut de la page "étudiant" avec la session de la WebView
const GRAB = `(function(){fetch('/mobile/etudiant.php',{credentials:'include'}).then(function(r){return r.text();}).then(function(t){window.ReactNativeWebView.postMessage(JSON.stringify({html:t}));}).catch(function(){});})();true;`;

export default function OgiaConnect() {
  const ref = useRef(null);
  const [host, setHostS] = useState(undefined); // undefined = chargement, null = pas encore saisie
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState("Connecte-toi : tes ateliers seront ajoutés à l'emploi du temps. Ton mot de passe reste dans la page officielle.");

  useEffect(() => { getHost().then((h) => setHostS(h || null)); }, []);

  if (host === undefined) return null;

  if (!host) {
    const save = async () => {
      const h = await setHost(input);
      if (!h) return setErr("Adresse invalide : elle doit finir par .ogia.fr");
      setErr(''); setHostS(h);
    };
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <T style={{ color: C.muted, lineHeight: 22 }}>Entre l'adresse d'Ogia de ton établissement. Elle reste uniquement sur ton téléphone.</T>
        <TextInput value={input} onChangeText={setInput} placeholder="xxxx.ogia.fr" placeholderTextColor={C.muted}
          autoCapitalize="none" autoCorrect={false} keyboardType="url"
          style={{ color: C.text, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 }} />
        {!!err && <T style={{ color: C.bad }}>{err}</T>}
        <Pressable onPress={save} style={{ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}>
          <T bold style={{ color: C.onAccent }}>Valider</T>
        </Pressable>
      </View>
    );
  }

  const BASE = `https://${host}`;
  const onLoadEnd = (e) => {
    const u = (e.nativeEvent && e.nativeEvent.url) || '';
    if (u.startsWith(BASE) && !u.includes('login.php') && ref.current) ref.current.injectJavaScript(GRAB);
  };
  const onMessage = async (e) => {
    try {
      const { html } = JSON.parse(e.nativeEvent.data);
      if (!html || !html.includes('id="per1"')) return;
      const n = await saveOgiaHtml(html);
      setOk(true);
      setMsg(`${n} atelier${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} à ton emploi du temps.`);
    } catch {}
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
        <T style={{ color: ok ? C.ok : C.muted, fontSize: 14 }}>{msg}</T>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Pressable onPress={() => ref.current && ref.current.reload()}><T style={{ color: C.accent }}>Actualiser</T></Pressable>
          <Pressable onPress={async () => { await clearHost(); setHostS(null); }}><T style={{ color: C.muted }}>Changer d'adresse</T></Pressable>
        </View>
      </View>
      <WebView ref={ref} source={{ uri: `${BASE}/login.php` }} onLoadEnd={onLoadEnd} onMessage={onMessage}
        sharedCookiesEnabled thirdPartyCookiesEnabled style={{ flex: 1, backgroundColor: C.bg }} />
    </View>
  );
}
