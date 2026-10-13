import React, { useRef } from 'react';
import { ScrollView, View, Image, Pressable, Vibration } from 'react-native';
import { C } from './theme';
import { T, Linkify } from './ui';
import { emitEgg } from './eggBus';

// Modifie ces deux lignes pour changer le nom affiché dans les crédits
const CREATOR = 'Nagisa';
const VERSION = 'v9';

const Section = ({ title, children }) => (
  <View style={{ gap: 6 }}>
    <T bold style={{ fontSize: 17 }}>{title}</T>
    {children}
  </View>
);
const L = ({ children }) => <Linkify style={{ color: C.muted, lineHeight: 22 }}>{children}</Linkify>;

export default function Credits() {
  const taps = useRef({ n: 0, t: 0 });
  const tapVersion = () => {
    const now = Date.now(); const s = taps.current;
    s.n = now - s.t < 2000 ? s.n + 1 : 1; s.t = now;
    if (s.n >= 7) { s.n = 0; Vibration.vibrate(80); emitEgg({ kind: 'card', confetti: true, title: 'Easter egg n°1 🥚', msg: 'Bravo, tu as trouvé le premier ! Il y en a d\'autres… cherche bien 😉' }); }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Image source={require('./assets/icon.png')} style={{ width: 96, height: 96, borderRadius: 22 }} />
        <T bold style={{ fontSize: 26 }}>ED-premium</T>
        <Pressable onPress={tapVersion} hitSlop={10}><T mono style={{ color: C.muted }}>version {VERSION}</T></Pressable>
      </View>

      <Section title="Créateur">
        <L>Conçue par {CREATOR}.</L>
        <L>Développée avec l'aide de Claude, l'assistant d'Anthropic.</L>
      </Section>

      <Section title="Remerciements">
        <L>Merci à la communauté open source qui a documenté l'API d'EcoleDirecte :</L>
        <L>https://github.com/EduWireApps/ecoledirecte-api-docs</L>
        <L>https://github.com/a2br/ecoledirecte.js</L>
        <L>https://github.com/fredericlam/GoodMorning</L>
        <L>https://github.com/jeromeboivin/EcoleDirecteMCP</L>
      </Section>

      <Section title="Technologies">
        <L>React Native et Expo.</L>
        <L>Icônes Feather (licence MIT).</L>
        <L>Polices Space Grotesk et JetBrains Mono (licence SIL Open Font).</L>
        <L>Logo : image fournie par l'auteur de l'appli.</L>
      </Section>

      <Section title="Important">
        <L>ED-premium est une application indépendante et non officielle. Elle n'est ni affiliée à EcoleDirecte, ni approuvée par EcoleDirecte. Le nom EcoleDirecte appartient à son propriétaire.</L>
        <L>Tes identifiants sont envoyés uniquement à EcoleDirecte. Si tu utilises l'assistant IA, les données que tu autorises sont envoyées au fournisseur de ta clé API, et seulement quand tu poses une question.</L>
      </Section>
    </ScrollView>
  );
}
