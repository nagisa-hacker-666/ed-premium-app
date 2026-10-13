import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, Dimensions } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './theme';
import { T } from './ui';
import { emitEgg, fresh20 } from './eggBus';
import Snake from './Snake';

const EMOJIS = ['🎉', '✨', '🥚', '⭐', '🎊', '💫'];

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const items = useRef(Array.from({ length: 30 }, (_, i) => ({
    y: new Animated.Value(-40), x: Math.random() * (width - 30), e: EMOJIS[i % EMOJIS.length],
    d: 2200 + Math.random() * 2200, w: Math.random() * 900,
  }))).current;
  useEffect(() => {
    items.forEach((it) => Animated.timing(it.y, { toValue: height + 40, duration: it.d, delay: it.w, useNativeDriver: true }).start());
  }, []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {items.map((it, i) => (
        <Animated.Text key={i} style={{ position: 'absolute', left: it.x, fontSize: 24, transform: [{ translateY: it.y }] }}>{it.e}</Animated.Text>
      ))}
    </View>
  );
}

const FULL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

export function EggLayer({ egg, onClose }) {
  if (!egg) return null;
  if (egg.kind === 'snake') return <View style={{ ...FULL, backgroundColor: C.bg }}><Snake onClose={onClose} /></View>;
  return (
    <View style={{ ...FULL, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
      <View style={{ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 22, gap: 12, width: '100%', maxWidth: 380 }}>
        <T bold style={{ fontSize: 22, textAlign: 'center' }}>{egg.title}</T>
        <T style={{ textAlign: 'center', color: C.muted, lineHeight: 22 }}>{egg.msg}</T>
        <Pressable onPress={onClose} style={{ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
          <T bold style={{ color: C.onAccent }}>Fermer</T>
        </Pressable>
      </View>
      {!!egg.confetti && <Confetti />}
    </View>
  );
}

// Secouer le téléphone
export function useShake(active, onShake) {
  const cb = useRef(onShake); cb.current = onShake;
  useEffect(() => {
    if (!active) return undefined;
    let last = 0;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      if (Math.sqrt(x * x + y * y + z * z) > 2.5 && now - last > 4000) { last = now; cb.current(); }
    });
    return () => sub.remove();
  }, [active]);
}

// 20/20 : déclenche une seule fois par note
export async function checkTwenty(notes) {
  try {
    const raw = await AsyncStorage.getItem('egg_seen20');
    const seen = raw ? JSON.parse(raw) : [];
    const fresh = fresh20(notes, seen);
    if (!fresh.length) return;
    await AsyncStorage.setItem('egg_seen20', JSON.stringify([...seen, ...fresh]));
    emitEgg({ kind: 'card', confetti: true, title: '20/20 ! 🏆', msg: "Tu as le droit d'être insupportable aujourd'hui." });
  } catch {}
}
