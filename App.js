import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Pressable, ActivityIndicator, Vibration } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Feather } from '@expo/vector-icons';
import { C, applyTheme, loadTheme, saveTheme } from './theme';
import { loadPrefs, savePrefs, PREFS_DEFAULT } from './prefs';
import { T } from './ui';
import * as api from './api';
import Login, { Qcm } from './Login';
import Home from './Home';
import Notes from './Notes';
import Agenda from './Agenda';
import Messages from './Messages';
import Plus from './Plus';
import Chat from './Chat';
import * as notif from './notif';
import { EggLayer, useShake } from './Eggs';
import { emitEgg, onEgg, makeMatcher, swipeDir, KONAMI, SECRET_TABS, EXCUSES } from './eggBus';
import { fmtDay, hhmm } from './utils';

const TABS = [
  { key: 'home', label: 'Accueil', icon: 'home', title: 'Accueil' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar', title: 'Agenda' },
  { key: 'notes', label: 'Notes', icon: 'bar-chart-2', title: 'Notes' },
  { key: 'messages', label: 'Messages', icon: 'mail', title: 'Messages' },
  { key: 'plus', label: 'Plus', icon: 'grid', title: 'Plus' },
];

export default function App() {
  const [fontsOk] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_700Bold, JetBrainsMono_400Regular, JetBrainsMono_700Bold });
  const [stage, setStage] = useState('boot');
  const [account, setAccount] = useState(null);
  const [pending, setPending] = useState(null);
  const [tab, setTab] = useState('home');
  const [aiOpen, setAiOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [off, setOff] = useState(null);
  const [theme, setTheme] = useState({ name: 'ciel', accent: '' });
  const [rev, setRev] = useState(0);
  const [prefs, setPrefsS] = useState(PREFS_DEFAULT);
  const [plusSub, setPlusSub] = useState(null);
  const [egg, setEgg] = useState(null);
  const konami = useRef(makeMatcher(KONAMI)).current;
  const secret = useRef(makeMatcher(SECRET_TABS)).current;
  const ts = useRef({ start: null, last: null, t: 0 });
  useEffect(() => onEgg(setEgg), []);
  useShake(stage === 'app' && !egg, () => {
    Vibration.vibrate(60);
    emitEgg({ kind: 'card', title: 'Excuse du jour 🎲', msg: `« ${EXCUSES[Math.floor(Math.random() * EXCUSES.length)]} »\n\n(à ne pas utiliser pour de vrai 😄)` });
  });
  const onTS = (e) => { const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; ts.current.start = p; ts.current.last = p; };
  const onTM = (e) => { ts.current.last = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; };
  const onTE = (e) => {
    const s = ts.current.start; if (!s) return;
    const l = typeof e.nativeEvent.pageX === 'number' ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY } : (ts.current.last || s);
    ts.current.start = null;
    const d = swipeDir(l.x - s.x, l.y - s.y, 40); if (!d) return;
    const now = Date.now(); if (now - ts.current.t > 4000) konami.reset(); ts.current.t = now;
    if (konami.push(d)) { Vibration.vibrate(80); emitEgg({ kind: 'snake' }); }
  };
  const tabPress = (key) => {
    if (secret.push(key)) {
      Vibration.vibrate(80);
      onTheme({ name: 'retro', accent: '' });
      emitEgg({ kind: 'card', confetti: true, title: 'Mode rétro activé 📺', msg: 'Écran ambre débloqué. Il reste dans Apparence tant qu\'il est actif.' });
    }
  };

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([loadTheme(), loadPrefs()]);
      api.onOffline(setOff); api.setOfflineEnabled(p.offline !== false);
      applyTheme(t.name, t.accent, t.bg); setTheme(t); setPrefsS(p); setTab(p.startTab || 'home'); setReady(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const s = await api.loadSession();
      if (!s) return setStage('login');
      try {
        const r = await api.login(s.id, s.pw, s.fa || null);
        if (r.status === 'ok') { setAccount(r.account); setStage('app'); afterLogin(); }
        else { setPending({ id: s.id, pw: s.pw, remember: true }); setStage('qcm'); }
      } catch (e) {
        if (e.net) { const acc = await api.offlineStart(s); if (acc) { setAccount(acc); setStage('app'); return; } }
        setStage('login');
      }
    })();
  }, []);

  const onLogin = async (id, pw, remember) => {
    const r = await api.login(id, pw);
    if (r.status === 'ok') { if (remember) await api.saveSession(id, pw); setAccount(r.account); setStage('app'); afterLogin(); }
    else { setPending({ id, pw, remember }); setStage('qcm'); }
  };
  const onQcm = async (fa) => {
    const r = await api.login(pending.id, pending.pw, fa, true);
    if (r.status !== 'ok') throw new Error('Connexion refusée après la vérification.');
    if (pending.remember) await api.saveSession(pending.id, pending.pw, fa);
    setAccount(r.account); setStage('app'); afterLogin();
  };
  const afterLogin = () => { api.prefetch().catch(() => {}); notif.afterLogin().catch(() => {}); };
  const onTheme = (t) => { applyTheme(t.name, t.accent, t.bg); setTheme(t); saveTheme(t); setRev((r) => r + 1); };
  const setPrefs = (p) => { setPrefsS(p); savePrefs(p); api.setOfflineEnabled(p.offline !== false); if (p.offline === false) api.clearCache(); };
  const wipe = async () => { await api.wipeAll(); applyTheme('ciel', ''); setTheme({ name: 'ciel', accent: '' }); setPrefsS(PREFS_DEFAULT); setRev((r) => r + 1); await logout(); };
  const logout = async () => { await api.clearSession(); setAccount(null); setTab('home'); setAiOpen(false); setPlusSub(null); setStage('login'); };

  const cur = TABS.find((t) => t.key === tab);
  const scrim = C.bg + Math.round((theme.dim ?? 0.6) * 255).toString(16).padStart(2, '0');
  return (
    <SafeAreaProvider>
      <StatusBar style={C.dark ? 'light' : 'dark'} />
      <View key={rev} style={{ flex: 1, backgroundColor: C.bg }}>
        {!!theme.bgImage && (
          <>
            <Image source={{ uri: theme.bgImage }} resizeMode="cover" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
          </>
        )}
        <SafeAreaView style={{ flex: 1 }}>
        {!fontsOk || !ready || stage === 'boot' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>
        ) : stage === 'login' ? <Login onLogin={onLogin} />
        : stage === 'qcm' ? <Qcm onDone={onQcm} onCancel={() => setStage('login')} />
        : (
          <View style={{ flex: 1 }}>
            <View onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
              <T bold style={{ fontSize: 24 }}>{cur.title}</T>
              <Pressable onPress={() => setAiOpen(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: C.accent, borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }}><Feather name="cpu" size={16} color={C.accent} /><T bold style={{ color: C.accent }}>IA</T></Pressable>
            </View>
            {off && (
              <View style={{ backgroundColor: C.surface2, paddingVertical: 6, paddingHorizontal: 16 }}>
                <T style={{ color: C.warn, fontSize: 13 }}>Hors ligne : données du {fmtDay(new Date(off.at))} à {hhmm(new Date(off.at))}</T>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {tab === 'home' && <Home account={account} go={(t, sub) => { setTab(t); if (sub) setPlusSub(sub); }} nick={prefs.nick} />}
              {tab === 'agenda' && <Agenda />}
              {tab === 'notes' && <Notes />}
              {tab === 'messages' && <Messages />}
              {tab === 'plus' && <Plus sub={plusSub} setSub={setPlusSub} account={account} theme={theme} onTheme={onTheme} prefs={prefs} setPrefs={setPrefs} onLogout={logout} onWipe={wipe} />}
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderTopColor: C.line, borderTopWidth: 1 }}>
              {TABS.map((t) => (
                <Pressable key={t.key} onPress={() => { setTab(t.key); tabPress(t.key); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 }}>
                  <Feather name={t.icon} size={22} color={tab === t.key ? C.accent : C.muted} />
                  <T style={{ fontSize: 12, color: tab === t.key ? C.accent : C.muted }}>{t.label}</T>
                </Pressable>
              ))}
            </View>
            {aiOpen && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
                <Chat account={account} onClose={() => setAiOpen(false)} goSettings={() => { setAiOpen(false); setTab('plus'); setPlusSub('ia'); }} />
              </View>
            )}
            <EggLayer egg={egg} onClose={() => setEgg(null)} />
          </View>
        )}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
