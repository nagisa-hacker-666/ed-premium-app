import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Dimensions, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './theme';
import { T } from './ui';
import { newGame, step } from './snakeLogic';
import { swipeDir } from './eggBus';

const COLS = 16, ROWS = 20;
const DIRS = { haut: { x: 0, y: -1 }, bas: { x: 0, y: 1 }, gauche: { x: -1, y: 0 }, droite: { x: 1, y: 0 } };

export default function Snake({ onClose }) {
  const { width: W, height: H } = Dimensions.get('window');
  const cell = Math.max(10, Math.min(Math.floor((W - 32) / COLS), Math.floor((H - 280) / ROWS)));
  const game = useRef(newGame(COLS, ROWS));
  const next = useRef(null);
  const start = useRef(null);
  const [, force] = useState(0);
  const [score, setScore] = useState(0);
  const [alive, setAlive] = useState(true);
  const [best, setBest] = useState(0);

  useEffect(() => { AsyncStorage.getItem('egg_snake_best').then((v) => setBest(Number(v) || 0)).catch(() => {}); }, []);

  useEffect(() => {
    if (!alive) return;
    const id = setInterval(() => {
      game.current = step(game.current, next.current);
      next.current = null;
      const g = game.current;
      setScore(g.score);
      if (!g.alive) { setAlive(false); Vibration.vibrate(200); }
      force((n) => n + 1);
    }, Math.max(70, 150 - score * 4));
    return () => clearInterval(id);
  }, [alive, score]);

  useEffect(() => {
    if (alive || score <= best) return;
    setBest(score);
    AsyncStorage.setItem('egg_snake_best', String(score)).catch(() => {});
  }, [alive]);

  const restart = () => { game.current = newGame(COLS, ROWS); next.current = null; setScore(0); setAlive(true); };
  const onTS = (e) => { start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; };
  const onTM = (e) => {
    const s = start.current; if (!s) return;
    const x = e.nativeEvent.pageX, y = e.nativeEvent.pageY;
    const d = swipeDir(x - s.x, y - s.y, 18);
    if (d) { next.current = DIRS[d]; start.current = { x, y }; }
  };
  const onTE = () => { start.current = null; };
  const g = game.current;

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T bold style={{ fontSize: 22 }}>Snake 🐍</T>
        <Pressable onPress={onClose} hitSlop={10}><T bold style={{ color: C.accent }}>Fermer</T></Pressable>
      </View>
      <T mono style={{ color: C.muted }}>Score {score}  ·  Record {best}</T>
      <View style={{ width: cell * COLS, height: cell * ROWS, alignSelf: 'center', backgroundColor: C.surface, borderRadius: 8, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
        {!!g.food && <View style={{ position: 'absolute', left: g.food.x * cell + 2, top: g.food.y * cell + 2, width: cell - 4, height: cell - 4, borderRadius: cell, backgroundColor: C.bad }} />}
        {g.snake.map((p, i) => (
          <View key={i} style={{ position: 'absolute', left: p.x * cell + 1, top: p.y * cell + 1, width: cell - 2, height: cell - 2, borderRadius: 4, backgroundColor: i === 0 ? C.accent : C.ok }} />
        ))}
      </View>
      {!alive ? (
        <View style={{ alignItems: 'center', gap: 10 }}>
          <T bold style={{ fontSize: 20 }}>{g.won ? 'Parfait ! 🏆' : 'Perdu 💥'}</T>
          <Pressable onPress={restart} style={{ backgroundColor: C.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22 }}><T bold style={{ color: C.onAccent }}>Rejouer</T></Pressable>
        </View>
      ) : <T style={{ color: C.muted, textAlign: 'center' }}>Glisse le doigt pour tourner.</T>}
    </View>
  );
}
