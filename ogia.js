// ogia.js — lit le HTML de la page « étudiant » d'Ogia (/mobile/etudiant.php)
// et le transforme en cours au même format que l'emploi du temps EcoleDirecte.

// Accepte « xxx.ogia.fr » ou une URL complète ; renvoie le nom d'hôte ou null.
export function normalizeHost(v) {
  const h = String(v || '').trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.ogia\.fr$/.test(h) ? h : null;
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const dec = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// 1) HTML -> liste d'ateliers [{periode, jourIdx, debut:'16:05', fin:'16:55', titre, prof, salle}]
export function parseOgia(html) {
  const out = [];
  const pages = html.split(/<div data-role="page" id="per(\d)">/).slice(1);
  for (let i = 0; i < pages.length; i += 2) {
    const periode = Number(pages[i]);
    const body = pages[i + 1].split('<div data-role="page"')[0];
    for (const d of body.split('<div class="jour">').slice(1)) {
      const jourIdx = JOURS.indexOf(dec(d.split('</div>')[0]));
      if (jourIdx < 0) continue;
      for (const it of d.split(/<div data-role="collapsible"(?=[\s>])/).slice(1)) {
        const h = it.match(/<h4>(\d\d)H(\d\d)-(\d\d)H(\d\d):\s*([\s\S]*?)<\/h4>/);
        const titre = h ? dec(h[5]) : '';
        if (!titre) continue; // créneau vide ou fermé
        const prof = it.match(/Enseignant : <\/span>([^<]*)/);
        const salle = it.match(/Salle : <\/span>([^<]*)/);
        out.push({ periode, jourIdx, debut: `${h[1]}:${h[2]}`, fin: `${h[3]}:${h[4]}`, titre,
          prof: prof ? dec(prof[1]) : '', salle: salle ? dec(salle[1]) : '' });
      }
    }
  }
  return out;
}

// 2) Dates de la semaine -> événements. periods = { 1: {start:'2026-09-07', end:'2026-10-16'}, ... }
const pad = (n) => String(n).padStart(2, '0');
const isoD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function ogiaEvents(items, periods, from, to) {
  const ev = [];
  for (const a of items) {
    const p = periods[a.periode]; if (!p || !p.end) continue;
    const [y, m, d] = p.start.split('-').map(Number);
    const end = new Date(p.end + 'T23:59:00');
    for (let cur = new Date(y, m - 1, d); cur <= end; cur.setDate(cur.getDate() + 1)) {
      if ((cur.getDay() + 6) % 7 !== a.jourIdx) continue;
      const day = isoD(cur);
      if ((from && day < from) || (to && day > to)) continue;
      ev.push({ start_date: `${day} ${a.debut}`, end_date: `${day} ${a.fin}`, matiere: a.titre,
        text: a.titre, salle: a.salle, prof: a.prof, isAnnule: false, ogia: true });
    }
  }
  return ev;
}
