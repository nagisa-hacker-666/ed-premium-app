import AsyncStorage from '@react-native-async-storage/async-storage';
export const PREFS_DEFAULT = { startTab: 'home', nick: '', offline: true };
export async function loadPrefs() {
  try { const v = await AsyncStorage.getItem('ed_prefs'); return v ? { ...PREFS_DEFAULT, ...JSON.parse(v) } : PREFS_DEFAULT; } catch { return PREFS_DEFAULT; }
}
export const savePrefs = (p) => AsyncStorage.setItem('ed_prefs', JSON.stringify(p)).catch(() => {});
