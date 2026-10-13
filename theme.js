import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  ciel: { label: 'Nuit', dark: true, bg: '#0B1220', surface: '#121C2E', surface2: '#1A2740', line: '#263654', text: '#E6EEF8', muted: '#8CA2BF', accent: '#4DA3FF' },
  clair: { label: 'Clair', dark: false, bg: '#F4F7FB', surface: '#FFFFFF', surface2: '#E8EEF6', line: '#D5DEEA', text: '#0F1B2D', muted: '#5B6F8A', accent: '#1F6FEB' },
  amoled: { label: 'Noir AMOLED', dark: true, bg: '#000000', surface: '#0D0D0D', surface2: '#181818', line: '#262626', text: '#F2F2F2', muted: '#8A8A8A', accent: '#4DA3FF' },
  matrix: { label: 'Matrix', dark: true, bg: '#050A06', surface: '#0B140D', surface2: '#112016', line: '#1C3322', text: '#D6F5DC', muted: '#6FA37B', accent: '#3DDC6E' },
  femboy: { label: 'Femboy (clair)', dark: false, fun: true, bg: '#FFF4F9', surface: '#FFFFFF', surface2: '#FFE2EE', line: '#F6C6DB', text: '#4A2B3C', muted: '#9A6F86', accent: '#F36BA6' },
  femboynuit: { label: 'Femboy (nuit)', dark: true, fun: true, bg: '#1D1326', surface: '#2A1B37', surface2: '#3A2648', line: '#563A63', text: '#FFEAF3', muted: '#C79DB8', accent: '#FF8FC1' },
  retro: { label: 'Rétro (secret)', hidden: true, dark: true, bg: '#1A1200', surface: '#241A00', surface2: '#2E2200', line: '#4A3600', text: '#FFC857', muted: '#B8892E', accent: '#FFB000' },
  violet: { label: 'Violet', dark: true, bg: '#120B1F', surface: '#1B1230', surface2: '#26194A', line: '#36275F', text: '#EDE6FF', muted: '#A593D1', accent: '#B78CFF' },
};
export const ACCENTS = ['#F5A9B8', '#5BCEFA', '#4DA3FF', '#3DDC6E', '#FF8A3D', '#B78CFF', '#FF6B9A', '#F2C14E', '#3DD6C6'];

// objet partagé : applyTheme() le modifie, App remonte tout l'arbre après
export const C = { ...THEMES.ciel, fun: false, ok: '#4FCB7A', warn: '#FF8A3D', bad: '#FF5D6C', onAccent: '#04101F' };

const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
};
export function applyTheme(name, accent, bg) {
  Object.assign(C, THEMES[name] || THEMES.ciel);
  C.fun = !!(THEMES[name] || {}).fun;
  if (accent && /^#[0-9a-f]{6}$/i.test(accent)) C.accent = accent;
  if (bg && /^#[0-9a-f]{6}$/i.test(bg)) {
    const dark = lum(bg) < 140;
    const text = dark ? '#F2F4F8' : '#12151C';
    Object.assign(C, dark
      ? { bg, dark, text, surface: mix(bg, '#FFFFFF', 0.07), surface2: mix(bg, '#FFFFFF', 0.13), line: mix(bg, '#FFFFFF', 0.2), muted: mix(text, bg, 0.45) }
      : { bg, dark, text, surface: mix(bg, '#FFFFFF', 0.6), surface2: mix(bg, '#000000', 0.06), line: mix(bg, '#000000', 0.13), muted: mix(text, bg, 0.45) });
  }
  C.onAccent = lum(C.accent) > 150 ? '#04101F' : '#FFFFFF';
}
export async function loadTheme() {
  try { const v = await AsyncStorage.getItem('ed_theme'); return v ? JSON.parse(v) : { name: 'ciel', accent: '' }; } catch { return { name: 'ciel', accent: '' }; }
}
export const saveTheme = (t) => AsyncStorage.setItem('ed_theme', JSON.stringify(t)).catch(() => {});

// palette des matières
export const CABLES = ['#FF8A3D', '#4FCB7A', '#4DA3FF', '#B88458', '#F2C14E', '#B78CFF', '#3DD6C6', '#FF6B9A'];
export const F = {
  text: 'SpaceGrotesk_400Regular', textB: 'SpaceGrotesk_700Bold',
  mono: 'JetBrainsMono_400Regular', monoB: 'JetBrainsMono_700Bold',
};
