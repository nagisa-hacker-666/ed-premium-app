// Logique "pure" des easter eggs (sans React) : bus d'événements, détecteurs de séquences, textes.
const subs = new Set();
export const emitEgg = (e) => { subs.forEach((f) => { try { f(e); } catch {} }); };
export const onEgg = (f) => { subs.add(f); return () => subs.delete(f); };

// Code Konami (par glissements du doigt sur la barre du haut) et code secret des onglets
export const KONAMI = ['haut', 'haut', 'bas', 'bas', 'gauche', 'droite', 'gauche', 'droite'];
export const SECRET_TABS = ['plus', 'messages', 'notes', 'agenda', 'home']; // de droite à gauche

export function makeMatcher(seq) {
  let i = 0;
  return {
    push(x) {
      if (x === seq[i]) i++; else i = x === seq[0] ? 1 : 0;
      if (i === seq.length) { i = 0; return true; }
      return false;
    },
    reset() { i = 0; },
  };
}

export function swipeDir(dx, dy, min = 40) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
}

// Notes 20/20 pas encore vues
const num = (x) => parseFloat(String(x).replace(',', '.'));
export function fresh20(notes, seen = []) {
  return (notes || [])
    .filter((n) => {
      if (n.nonSignificatif) return false;
      const v = num(n.valeur); const over = num(n.noteSur) || 20;
      return !isNaN(v) && Math.abs((v / over) * 20 - 20) < 0.001;
    })
    .map((n) => String(n.id ?? `${n.date}|${n.codeMatiere}|${n.devoir}`))
    .filter((k) => !seen.includes(k));
}

export const EXCUSES = [
  "Un pigeon a pris mon bus en otage.",
  "Mon réveil s'est mis en grève.",
  "J'ai dû négocier avec un canard qui bloquait le passage.",
  "Mon chat a caché mes chaussures et il refuse de parler.",
  "Le Wi-Fi de mon cerveau n'avait pas démarré.",
  "J'ai suivi mon GPS... il m'a emmené en 2019.",
  "Mon sac à dos s'est perdu en route, je suis parti à sa recherche.",
  "J'étais en réunion de crise avec mon petit-déjeuner.",
  "Il y avait une file d'attente devant la cour. Une file de poules.",
  "Mon téléphone m'a dit qu'on était samedi. Je lui ai fait confiance.",
  "Un nuage s'est posé sur ma rue.",
  "J'ai été ralenti par un excès de bonne humeur.",
];
export const GREETINGS = [
  (n) => `Salut ${n}, la forme ? 😎`,
  (n) => `Yo ${n} ! 🚀`,
  (n) => `Bienvenue, ${n}. Café d'abord ☕`,
  (n) => `Hey ${n}, le chef est de retour 👑`,
  (n) => `Bip bop ${n} 🤖`,
  (n) => `${n}, légende du lycée 🏆`,
  (n) => `Coucou ${n} 🌈`,
  (n) => `Ah, ${n} ! On t'attendait 🎩`,
];
