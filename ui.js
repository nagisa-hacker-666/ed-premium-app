import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, Pressable, ActivityIndicator, Linking } from 'react-native';
import { C, F } from './theme';

export const T = ({ style, mono, bold, children, ...p }) => (
  <Text {...p} style={[{ color: C.text, fontSize: 15, fontFamily: mono ? (bold ? F.monoB : F.mono) : bold ? F.textB : F.text }, style]}>{children}</Text>
);

export function useLoad(fn, deps = []) {
  const [st, set] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    set((s) => ({ ...s, loading: true, error: null }));
    try { set({ data: await fn(), error: null, loading: false }); }
    catch (e) { set((s) => ({ ...s, error: e.message, loading: false })); }
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...st, reload: run };
}

export function State({ q, children }) {
  if (q.error && !q.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <T style={{ color: C.bad, textAlign: 'center' }}>{q.error}</T>
        <Pressable onPress={q.reload} style={{ backgroundColor: C.surface2, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 }}>
          <T bold>Réessayer</T>
        </Pressable>
      </View>
    );
  }
  if (!q.data) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;
  return children(q.data);
}

// Texte avec liens http(s) / www cliquables. plain = pas de liens.
export function Linkify({ children, plain, ...p }) {
  const text = String(children ?? '');
  if (plain) return <T {...p}>{text}</T>;
  const parts = []; const re = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi; let last = 0, m;
  while ((m = re.exec(text))) {
    let url = m[1]; let trail = '';
    const t = url.match(/[.,;:!?)\]]+$/); if (t) { trail = t[0]; url = url.slice(0, -trail.length); }
    parts.push(text.slice(last, m.index)); parts.push({ url, trail }); last = m.index + m[1].length;
  }
  parts.push(text.slice(last));
  return (
    <T {...p}>
      {parts.map((x, i) => typeof x === 'string' ? x : (
        <React.Fragment key={i}>
          <Text style={{ color: C.accent, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(/^https?:/i.test(x.url) ? x.url : 'https://' + x.url).catch(() => {})}>{x.url}</Text>{x.trail}
        </React.Fragment>
      ))}
    </T>
  );
}
