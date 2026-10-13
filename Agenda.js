import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { C } from './theme';
import { T } from './ui';
import Edt from './Edt';
import Devoirs from './Devoirs';

export default function Agenda() {
  const [m, setM] = useState('edt');
  const seg = (k, label) => (
    <Pressable key={k} onPress={() => setM(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8, backgroundColor: m === k ? C.accent : 'transparent' }}>
      <T bold style={{ color: m === k ? C.onAccent : C.muted }}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', margin: 16, marginTop: 0, padding: 4, borderRadius: 12, backgroundColor: C.surface2 }}>
        {seg('edt', 'Cours')}{seg('dev', 'Devoirs')}
      </View>
      {m === 'edt' ? <Edt /> : <Devoirs />}
    </View>
  );
}
