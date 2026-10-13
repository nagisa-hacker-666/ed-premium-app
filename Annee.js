import React from 'react';
import { View } from 'react-native';
import { C } from './theme';
import { T } from './ui';

// Année scolaire 2026-2027 (France métropolitaine) : rentrée le mardi 1er septembre 2026,
// vacances d'été à partir du samedi 3 juillet 2027. Modifie ces deux lignes si besoin.
const DEBUT = new Date(2026, 8, 1, 0, 0);
const FIN = new Date(2027, 6, 3, 0, 0);
const JOUR = 86400000;

export function anneeProgress(now = new Date()) {
  const total = FIN - DEBUT;
  const pct = Math.min(100, Math.max(0, ((now - DEBUT) / total) * 100));
  const restants = Math.max(0, Math.ceil((FIN - now) / JOUR));
  const ecoules = Math.min(Math.round(total / JOUR), Math.max(0, Math.floor((now - DEBUT) / JOUR)));
  return { pct, restants, ecoules, total: Math.round(total / JOUR), avant: now < DEBUT, fini: now >= FIN };
}

export default function AnneeCard() {
  const { pct, restants, ecoules, total, avant, fini } = anneeProgress();
  const s = (n) => (n > 1 ? 's' : '');
  return (
    <View style={{ gap: 8 }}>
      <T bold style={{ fontSize: 18 }}>Année scolaire</T>
      <View style={{ backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T bold style={{ fontSize: 28 }}>{pct.toFixed(1).replace('.', ',')} %</T>
          <T style={{ color: C.muted }}>{fini ? 'Vacances !' : avant ? 'La rentrée approche' : `${restants} jour${s(restants)} restant${s(restants)}`}</T>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: C.accent }} />
        </View>
        <T mono style={{ color: C.muted, fontSize: 12 }}>{ecoules} / {total} jours écoulés</T>
      </View>
    </View>
  );
}
