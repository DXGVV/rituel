'use strict';
/* =========================================================
   Rituel · Tom  —  routine skincare et dents
   Données stockées uniquement sur le téléphone
   (localStorage, photos dans IndexedDB)
   ========================================================= */

/* ---------- Catalogue : catégories et recommandations par défaut ---------- */
// Jours : 0 = dimanche … 6 = samedi. am / pm = jours où le produit sert le matin / le soir.
// order : position dans la routine (plus petit = d'abord). Les dents passent avant la peau.
const ALL = [0, 1, 2, 3, 4, 5, 6];
const CATEGORIES = {
  oilpull:    { label: 'Huile de coco',      group: 'teeth', order: 1,  am: ALL, pm: [], note: '1 c. à café + un peu d\'eau, 5 min. Recracher à la poubelle, pas dans l\'évier.' },
  tongue:     { label: 'Gratte-langue',      group: 'teeth', order: 2,  am: ALL, pm: [], note: 'Avant le brossage, 5–6 passages.' },
  siwak:      { label: 'Siwak',              group: 'teeth', order: 3,  am: ALL, pm: ALL, note: 'Frotter dents et gencives, environ 1 min.' },
  floss:      { label: 'Fil / brossettes',   group: 'teeth', order: 4,  am: [], pm: ALL, note: 'Avant le brossage du soir.' },
  toothpaste: { label: 'Brossage',           group: 'teeth', order: 5,  am: ALL, pm: ALL, note: '2 minutes. Recracher sans rincer.' },
  mouthwash:  { label: 'Bain de bouche',     group: 'teeth', order: 6,  am: [], pm: ALL, note: '30 s. Attendre 30 min avant de manger ou boire.' },
  whitening:  { label: 'Blanchiment',        group: 'teeth', order: 7,  am: [], pm: [0], note: 'Une fois par semaine pour ménager l\'émail.' },

  cleanser:   { label: 'Nettoyant',          group: 'skin', order: 10, am: ALL, pm: ALL, note: 'Eau tiède, 30–60 s.' },
  patch:      { label: 'Patchs yeux',        group: 'skin', order: 15, am: [], pm: ALL, note: '15 min.' },
  toner:      { label: 'Tonique / essence',  group: 'skin', order: 20, am: ALL, pm: ALL, note: 'Sur peau propre.' },
  mask:       { label: 'Masque',             group: 'skin', order: 25, am: [], pm: [0], note: 'Une fois par semaine, après le nettoyant.' },
  vitc:       { label: 'Vitamine C',         group: 'skin', order: 28, am: ALL, pm: [], note: 'Le matin, avant la crème : antioxydant sous le SPF.' },
  serum:      { label: 'Sérum',              group: 'skin', order: 30, am: ALL, pm: ALL, note: '' },
  exfoliant:  { label: 'Exfoliant AHA/BHA',  group: 'skin', order: 35, am: [], pm: [1, 3, 5], note: 'Jamais le même soir que le rétinol.' },
  retinoid:   { label: 'Rétinol',            group: 'skin', order: 35, am: [], pm: [2, 4, 6], note: 'Fine couche sur peau sèche.' },
  other:      { label: 'Autre',              group: 'skin', order: 45, am: [], pm: ALL, note: '' },
  eye:        { label: 'Contour des yeux',   group: 'skin', order: 50, am: ALL, pm: ALL, note: 'Tapoter avec l\'annulaire.' },
  moisturizer:{ label: 'Hydratant',          group: 'skin', order: 60, am: ALL, pm: ALL, note: '' },
  lip:        { label: 'Lèvres',             group: 'skin', order: 70, am: [], pm: ALL, note: '' },
  spf:        { label: 'Protection solaire', group: 'skin', order: 90, am: ALL, pm: [], note: 'Dernière étape, 2 doigts de produit, même s\'il fait gris.' },
  concealer:  { label: 'Anti-cernes',        group: 'skin', order: 95, am: ALL, pm: [], note: '' },
};

// Devine une catégorie depuis le nom d'un produit (pour coller une liste d'un coup).
const GUESS = [
  ['oilpull', /huile de coco|coconut|oil pulling/i],
  ['siwak', /siwa[kc]|miswak/i],
  ['patch', /patch.*(yeux|eye)|(yeux|eye).*patch/i],
  ['tongue', /langue|tongue/i],
  ['floss', /fil dentaire|floss|brossette|hydropulseur|waterpik|jet dentaire/i],
  ['mouthwash', /bain de bouche|mouthwash|listerine|rince/i],
  ['whitening', /blanchi|whiten|strip/i],
  ['toothpaste', /dentifrice|toothpaste|sensodyne|elmex|signal|colgate|brosse à dents|toothbrush/i],
  ['spf', /spf|solaire|sunscreen|sun ?cream|écran|ecran|uv/i],
  ['retinoid', /r[ée]tin|retinal|tretino|adapal|differin|bakuchiol/i],
  ['vitc', /vitamine ?c|vitamin ?c|ascorbi|\bvit c\b/i],
  ['exfoliant', /aha|bha|pha|glycoli|salicyl|lactique|lactic|mandéli|mandelic|exfoli|peeling|gommage|scrub/i],
  ['mask', /masque|mask/i],
  ['eye', /yeux|eye|contour/i],
  ['lip', /l[èe]vre|lip|baume/i],
  ['cleanser', /nettoy|cleans|moussant|foaming|purifiant|gel lavant|mousse|savon|démaquill|demaquill|huile démaq|micellaire|wash/i],
  ['toner', /tonique|toner|lotion|essence|brume|mist/i],
  ['moisturizer', /crème|creme|cream|hydrat|moistur|émulsion|emulsion|baume|lotion|gel-crème/i],
  ['serum', /sérum|serum|niacinamide|hyaluron|ampoule|booster|peptide|centella|cica|azéla|azela/i],
];
function guessCategory(name) {
  for (const [cat, re] of GUESS) if (re.test(name)) return cat;
  return 'other';
}

// Routine de Tom (mise à jour du 29 octobre 2026). role = à quoi sert le produit, en un ou deux mots.
// optional = étape facultative : affichée, mais ne compte pas dans la progression.
// Le fil dentaire est un conseil ajouté, supprimable.
const ROUTINE_VERSION = 2;
const TEETH_PRODUCTS = [
  ['Huile de coco (oil pulling)', 'oilpull', { role: 'Antibactérien' }],
  ['Gel Nonio', 'tongue', { role: 'Langue', note: 'Sur la langue, avec un gratte-langue ou une brosse.' }],
  ['Siwak', 'siwak', { role: 'Nettoyage' }],
  ['Brosse à dents électrique', 'toothpaste', { role: 'Brossage', note: '2 min, 30 s par quart de bouche. Dentifrice fluoré, recracher sans rincer.' }],
  ['Fil dentaire ou brossettes', 'floss', { role: 'Entre les dents', note: 'Conseil : la brosse ne nettoie pas entre les dents. Chaque soir, avant le brossage.' }],
  ['Patchs blanchissants', 'whitening', { role: 'Blanchiment', note: '1 fois/semaine. Pas juste après le brossage : attendre 30 min limite la sensibilité.' }],
];
const SKIN_PRODUCTS = [
  ['Nettoyant ANUA', 'cleanser', { role: 'Nettoyant' }],
  ['ANUA Niacinamide 10 % + Acide tranexamique 4 %', 'serum', { role: 'Éclat / anti-taches', pm: [] }],
  ['The Ordinary Acide salicylique 2 %', 'exfoliant', { role: 'Points noirs', pm: [1, 4], note: 'Nez, joues, menton.' }],
  ['Beauty of Joseon Revive Eye Serum', 'eye', { role: 'Anti-rides', am: [], note: 'Contour des yeux + front.' }],
  ['Masque niacinamide + TXA', 'mask', { role: 'Masque bonus', optional: true, note: 'Bonus, quand tu en as envie. Change le jour dans Produits.' }],
  ['Isntree Hyaluronic Acid Aqua Gel Cream', 'moisturizer', { role: 'Hydratation' }],
  ['Numbuzin No.1 Clear Filter Sun Essence', 'spf', { role: 'Protection solaire', note: '2 doigts de produit, en dernier. À renouveler toutes les 2 h si tu es dehors.' }],
  ['The Saem Cover Perfection 0.5 Ice Beige', 'concealer', { role: 'Anti-cernes', optional: true, note: 'Mélangé avec un point de crème hydratante.' }],
];
const DEFAULT_PRODUCTS = [...TEETH_PRODUCTS, ...SKIN_PRODUCTS];

const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/* ---------- Stockage ---------- */
const APP_VERSION = '1.1.0';
const STORE_KEY = 'rituel-tom-v1';
function uid() { return Math.random().toString(36).slice(2, 10); }
function makeProduct(name, category = guessCategory(name), over = {}) {
  const c = CATEGORIES[category];
  return { id: uid(), name, category, role: '', am: [...c.am], pm: [...c.pm], note: '', optional: false, active: true, ...over };
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.products)) return s;
  } catch (e) { /* stockage vide ou illisible */ }
  return { products: DEFAULT_PRODUCTS.map(([n, cat, over]) => makeProduct(n, cat, over)), log: {}, photos: {}, routineVersion: ROUTINE_VERSION };
}
// Passage à la routine du 29 octobre : nouveaux produits peau, rôles, gel Nonio.
// Les jours déjà passés gardent leur score (calculé avec l'ancienne routine) pour ne pas casser le calendrier.
function migrateRoutine() {
  if ((state.routineVersion || 1) >= ROUTINE_VERSION) return;
  const today = iso(new Date());
  for (const date of Object.keys(state.log)) if (date < today) state.log[date].snap = dayProgress(date);
  const old = state.products;
  const reuse = (re, cat) => old.find(p => p.category === cat && re.test(p.name));
  const fresh = ([n, cat, over]) => makeProduct(n, cat, over);
  const teeth = old.filter(p => CATEGORIES[p.category].group === 'teeth');
  for (const def of TEETH_PRODUCTS) {
    const match = teeth.find(p => p.category === def[1]);
    if (match) { if (!match.role) match.role = def[2].role; } else if (def[1] === 'tongue') teeth.push(fresh(def));
  }
  const skin = SKIN_PRODUCTS.map(def => {
    const p = fresh(def);
    // Même produit qu'avant : on garde son id pour que les cases déjà cochées restent liées.
    const prev = def[1] === 'cleanser' ? reuse(/anua/i, 'cleanser') : def[1] === 'serum' ? reuse(/niacinamide/i, 'serum') : def[1] === 'exfoliant' ? reuse(/salicyl/i, 'exfoliant') : null;
    if (prev) p.id = prev.id;
    return p;
  });
  state.products = [...teeth, ...skin];
  state.routineVersion = ROUTINE_VERSION;
}
let state = loadState();
state.photos = state.photos || {};
state.start = state.start || iso(new Date()); // les jours d'avant l'installation ne comptent pas comme ratés
migrateRoutine();
save();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('Sauvegarde impossible'); }
}

// Photos : IndexedDB (trop lourdes pour localStorage). state.photos[date] = true sert d'index.
const db = new Promise((resolve, reject) => {
  const req = indexedDB.open('rituel', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('photos');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
async function idb(mode, fn) {
  const d = await db;
  return new Promise((resolve, reject) => {
    const tx = d.transaction('photos', mode);
    const r = fn(tx.objectStore('photos'));
    tx.oncomplete = () => resolve(r && r.result);
    tx.onerror = () => reject(tx.error);
  });
}
const photoGet = date => idb('readonly', s => s.get(date));
const photoPut = (date, blob) => idb('readwrite', s => s.put(blob, date));
const photoDel = date => idb('readwrite', s => s.delete(date));
const urlCache = {};
async function photoURL(date) {
  if (urlCache[date]) return urlCache[date];
  const blob = await photoGet(date);
  if (!blob) return null;
  return (urlCache[date] = URL.createObjectURL(blob));
}
function resizeImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('conversion'))), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Dates ---------- */
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
const todayISO = () => iso(new Date());
function longDate(s) {
  const d = parseISO(s);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function shortDate(s) { const d = parseISO(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4)}.`; }

/* ---------- Routine du jour ---------- */
function routineFor(date) {
  const dow = parseISO(date).getDay();
  const out = { am: [], pm: [] };
  for (const p of state.products) {
    if (!p.active) continue;
    for (const slot of ['am', 'pm']) if (p[slot].includes(dow)) out[slot].push(p);
  }
  // Rétinoïde et exfoliant le même soir : on garde le rétinoïde, l'exfoliant saute.
  if (out.pm.some(p => p.category === 'retinoid')) out.pm = out.pm.filter(p => p.category !== 'exfoliant');
  // Dents d'abord, puis la peau, chaque groupe dans l'ordre de ses catégories.
  const key = p => (CATEGORIES[p.category].group === 'teeth' ? 0 : 1000) + CATEGORIES[p.category].order;
  for (const slot of ['am', 'pm']) out[slot].sort((a, b) => key(a) - key(b));
  return out;
}
function isDone(date, slot, id) { return !!(state.log[date] && state.log[date][slot] && state.log[date][slot][id]); }
function toggleDone(date, slot, id) {
  const day = (state.log[date] = state.log[date] || {});
  const s = (day[slot] = day[slot] || {});
  if (s[id]) delete s[id]; else s[id] = Date.now();
  delete day.snap; // jour modifié : on le recalcule avec la routine actuelle
  save();
}
function dayProgress(date) {
  const snap = state.log[date] && state.log[date].snap;
  if (snap) return snap;
  const r = routineFor(date);
  let total = 0, done = 0;
  const per = {};
  for (const slot of ['am', 'pm']) {
    const steps = r[slot].filter(p => !p.optional);
    const t = steps.length;
    const d = steps.filter(p => isDone(date, slot, p.id)).length;
    per[slot] = t ? d / t : 0;
    total += t; done += d;
  }
  return { total, done, ratio: total ? done / total : 0, per };
}
function streak() {
  let n = 0, d = todayISO();
  if (dayProgress(d).ratio < 1) d = addDays(d, -1); // aujourd'hui pas encore fini : on compte depuis hier
  while (dayProgress(d).ratio === 1 && dayProgress(d).total > 0) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- UI helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}
const sheet = $('#sheet');
function openSheet(html, bind) {
  sheet.innerHTML = `<div class="sheet-inner">${html}</div>`;
  bind && bind(sheet);
  if (!sheet.open) sheet.showModal();
  // Pas de clavier qui surgit à l'ouverture sur iPhone.
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function closeSheet() { sheet.close(); }
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });

let ui = { tab: 'today', date: todayISO(), month: todayISO().slice(0, 7), compare: [] };
function go(tab, extra = {}) {
  Object.assign(ui, { tab }, extra);
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

function render() {
  const views = { today: renderToday, calendar: renderCalendar, photos: renderPhotos, products: renderProducts };
  $('#topbar-extra').innerHTML = '';
  views[ui.tab]();
}

/* ---------- Vue : Jour ---------- */
function stepHTML(p, slot, i) {
  const c = CATEGORIES[p.category];
  const note = p.note || c.note;
  const done = isDone(ui.date, slot, p.id);
  return `<button class="step ${c.group} ${done ? 'done' : ''}" data-slot="${slot}" data-id="${p.id}" style="width:100%;text-align:left">
    <span class="num">${i + 1}</span>
    <span class="body"><span class="name">${esc(p.name)}</span><span class="tag">${esc(p.role || c.label)}</span>${p.optional ? '<span class="pill">optionnel</span>' : ''}
      ${note ? `<div class="note">${esc(note)}</div>` : ''}</span>
    <span class="check"></span>
  </button>`;
}
function renderToday() {
  const date = ui.date;
  const isToday = date === todayISO();
  $('#title').textContent = isToday ? "Aujourd'hui" : 'Routine';
  const r = routineFor(date);
  const pr = dayProgress(date);
  const hasPhoto = !!state.photos[date];
  // Soirs d'exfoliation (lundi et jeudi) ou de rétinol mis en avant dans le titre.
  const cats = r.pm.map(p => p.category);
  const pmLabel = cats.includes('retinoid') ? 'Soir · Rétinol' : cats.includes('exfoliant') ? 'Soir · Exfoliation' : 'Soir';
  const slotBlock = (slot, label, icon) => {
    const list = r[slot];
    const required = list.filter(p => !p.optional);
    const d = required.filter(p => isDone(date, slot, p.id)).length;
    return `<div class="section-title"><h2>${icon} ${label}</h2><span class="muted small">${d}/${required.length}</span></div>
      <div class="card" style="padding:4px 10px">${list.length ? list.map((p, i) => stepHTML(p, slot, i)).join('') : '<p class="muted small">Rien de prévu.</p>'}</div>`;
  };
  $('#view').innerHTML = `
    <div class="daynav">
      <button class="icon-btn" id="prev" aria-label="Jour précédent">‹</button>
      <div class="label"><strong>${longDate(date)}</strong>
        ${isToday ? `<span class="muted small">Série : ${streak()} jour${streak() > 1 ? 's' : ''} complet${streak() > 1 ? 's' : ''}</span>` : `<button class="muted small" id="back-today">Revenir à aujourd'hui</button>`}</div>
      <button class="icon-btn" id="next" aria-label="Jour suivant">›</button>
    </div>
    <div class="card">
      <div class="row"><strong>${pr.done}/${pr.total} étapes</strong><span class="spacer"></span><span class="muted small">${Math.round(pr.ratio * 100)} %</span></div>
      <div class="progress"><div style="width:${pr.ratio * 100}%"></div></div>
    </div>
    ${slotBlock('am', 'Matin', '☀︎')}
    ${slotBlock('pm', pmLabel, '☾')}
    <div class="section-title"><h2>◉ Photo du jour</h2></div>
    <div class="card photo-card">
      <div class="thumb" id="day-thumb">${hasPhoto ? '' : '◉'}</div>
      <div class="body" style="flex:1">
        <div class="small muted">${hasPhoto ? 'Photo enregistrée. Même lumière et même angle chaque jour pour bien comparer.' : 'Une photo par jour, même endroit, même lumière.'}</div>
        <button class="btn primary" id="take-photo" style="margin-top:8px">${hasPhoto ? 'Reprendre' : 'Prendre la photo'}</button>
      </div>
    </div>`;
  $('#prev').onclick = () => { ui.date = addDays(date, -1); render(); };
  $('#next').onclick = () => { ui.date = addDays(date, 1); render(); };
  const bt = $('#back-today'); if (bt) bt.onclick = () => { ui.date = todayISO(); render(); };
  document.querySelectorAll('.step').forEach(el => el.addEventListener('click', () => {
    toggleDone(date, el.dataset.slot, el.dataset.id);
    const was = pr.ratio;
    render();
    if (was < 1 && dayProgress(date).ratio === 1) toast('Routine complète ✨');
  }));
  $('#take-photo').onclick = () => takePhoto(date);
  if (hasPhoto) photoURL(date).then(u => {
    const t = $('#day-thumb');
    if (u && t) { t.style.backgroundImage = `url(${u})`; t.onclick = () => viewPhoto(date); }
  });
}

/* ---------- Photos ---------- */
let photoTarget = null;
const photoInput = $('#photo-input');
function takePhoto(date) { photoTarget = date; photoInput.value = ''; photoInput.click(); }
photoInput.addEventListener('change', async () => {
  const f = photoInput.files && photoInput.files[0];
  if (!f || !photoTarget) return;
  try {
    const blob = await resizeImage(f);
    await photoPut(photoTarget, blob);
    if (urlCache[photoTarget]) { URL.revokeObjectURL(urlCache[photoTarget]); delete urlCache[photoTarget]; }
    state.photos[photoTarget] = true;
    save();
    toast('Photo enregistrée');
    render();
  } catch (e) { toast('Impossible de lire la photo'); }
});
async function viewPhoto(date) {
  const u = await photoURL(date);
  openSheet(`<h3>${longDate(date)}</h3>
    <div class="viewer"><img src="${u}" alt="Photo du ${longDate(date)}"></div>
    <div class="sheet-actions" style="margin-top:14px">
      <button class="btn danger" id="del">Supprimer</button>
      <button class="btn" id="retake">Reprendre</button>
      <button class="btn primary" id="close">Fermer</button>
    </div>`, s => {
    $('#close', s).onclick = closeSheet;
    $('#retake', s).onclick = () => { closeSheet(); takePhoto(date); };
    $('#del', s).onclick = async () => {
      if (!confirm('Supprimer cette photo ?')) return;
      await photoDel(date);
      delete state.photos[date];
      if (urlCache[date]) { URL.revokeObjectURL(urlCache[date]); delete urlCache[date]; }
      save(); closeSheet(); render();
    };
  });
}
function renderPhotos() {
  $('#title').textContent = 'Photos';
  const dates = Object.keys(state.photos).filter(d => state.photos[d]).sort().reverse();
  const cmp = ui.compare;
  $('#topbar-extra').innerHTML = dates.length >= 2 ? `<button class="btn" id="cmp-toggle">${ui.comparing ? 'Annuler' : 'Comparer'}</button>` : '';
  let html = '';
  if (!state.photos[todayISO()]) html += `<button class="btn primary block" id="snap" style="margin-bottom:14px">◉ Photo d'aujourd'hui</button>`;
  if (ui.comparing) {
    html += `<div class="banner">${cmp.length < 2 ? `Choisis ${2 - cmp.length} photo${cmp.length ? '' : 's'} à comparer.` : 'Avant / après :'}</div>`;
    if (cmp.length === 2) {
      const [a, b] = [...cmp].sort();
      html += `<div class="compare card" style="padding:8px"><figure><img id="ca"><figcaption>${shortDate(a)}</figcaption></figure><figure><img id="cb"><figcaption>${shortDate(b)}</figcaption></figure></div>`;
    }
  }
  if (!dates.length) html += `<div class="card muted">Aucune photo pour l'instant. Prends-en une chaque jour depuis l'écran Jour, tu pourras comparer avant / après ici.</div>`;
  html += `<div class="grid">${dates.map(d => `<button class="ph ${cmp.includes(d) && ui.comparing ? 'sel' : ''}" data-d="${d}"><small>${shortDate(d)}</small></button>`).join('')}</div>`;
  $('#view').innerHTML = html;
  const snap = $('#snap'); if (snap) snap.onclick = () => takePhoto(todayISO());
  const tg = $('#cmp-toggle'); if (tg) tg.onclick = () => { ui.comparing = !ui.comparing; ui.compare = []; render(); };
  document.querySelectorAll('.ph').forEach(el => {
    photoURL(el.dataset.d).then(u => { if (u) el.style.backgroundImage = `url(${u})`; });
    el.onclick = () => {
      const d = el.dataset.d;
      if (!ui.comparing) return viewPhoto(d);
      ui.compare = cmp.includes(d) ? cmp.filter(x => x !== d) : [...cmp, d].slice(-2);
      render();
    };
  });
  if (ui.comparing && cmp.length === 2) {
    const [a, b] = [...cmp].sort();
    photoURL(a).then(u => { $('#ca').src = u; });
    photoURL(b).then(u => { $('#cb').src = u; });
  }
}

/* ---------- Vue : Calendrier ---------- */
function renderCalendar() {
  $('#title').textContent = 'Calendrier';
  const [y, m] = ui.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysIn = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // semaine commençant lundi
  const today = todayISO();
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div class="day empty"></div>';
  let fullDays = 0, pastDays = 0, photos = 0;
  for (let d = 1; d <= daysIn; d++) {
    const date = iso(new Date(y, m - 1, d));
    const pr = dayProgress(date);
    const future = date > today;
    if (!future && date >= state.start) { pastDays++; if (pr.ratio === 1) fullDays++; }
    if (state.photos[date]) photos++;
    cells += `<button class="day ${date === today ? 'today' : ''}" data-d="${date}">
      ${future ? '' : `<div class="fill" style="height:${pr.ratio * 100}%"></div>`}
      ${state.photos[date] ? '<b class="cam">◉</b>' : ''}
      <span>${d}</span>
      <span class="dots"><i class="${pr.per.am === 1 ? 'on' : ''}"></i><i class="${pr.per.pm === 1 ? 'on' : ''}"></i></span>
    </button>`;
  }
  $('#view').innerHTML = `
    <div class="daynav">
      <button class="icon-btn" id="pm" aria-label="Mois précédent">‹</button>
      <div class="label"><strong>${MONTHS[m - 1]} ${y}</strong></div>
      <button class="icon-btn" id="nm" aria-label="Mois suivant">›</button>
    </div>
    <div class="stats">
      <div class="stat"><b>${streak()}</b><span>jours de suite</span></div>
      <div class="stat"><b>${fullDays}/${pastDays}</b><span>jours complets</span></div>
      <div class="stat"><b>${photos}</b><span>photos ce mois</span></div>
    </div>
    <div class="cal-head">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><b style="color:var(--ok)">●</b> gauche : matin fait</span><span><b style="color:var(--ok)">●</b> droite : soir fait</span><span>◉ photo prise</span><span>Le remplissage vert = % de la journée</span></div>`;
  const shift = n => { const d = new Date(y, m - 1 + n, 1); ui.month = iso(d).slice(0, 7); render(); };
  $('#pm').onclick = () => shift(-1);
  $('#nm').onclick = () => shift(1);
  document.querySelectorAll('.cal .day[data-d]').forEach(el => el.onclick = () => go('today', { date: el.dataset.d }));
}

/* ---------- Vue : Produits ---------- */
function daysLabel(days) {
  if (days.length === 7) return 'tous les jours';
  return [1, 2, 3, 4, 5, 6, 0].filter(d => days.includes(d)).map(d => DAY_SHORT[d]).join(', ');
}
function scheduleLabel(p) {
  const parts = [];
  if (p.am.length) parts.push(`matin ${daysLabel(p.am)}`);
  if (p.pm.length) parts.push(`soir ${daysLabel(p.pm)}`);
  return parts.join(' · ') || 'jamais';
}
function renderProducts() {
  $('#title').textContent = 'Produits';
  $('#topbar-extra').innerHTML = `<button class="icon-btn" id="add" aria-label="Ajouter">＋</button>`;
  const groups = [['teeth', 'Dents'], ['skin', 'Peau']];
  const listHTML = g => {
    const items = state.products.filter(p => CATEGORIES[p.category].group === g)
      .sort((a, b) => CATEGORIES[a.category].order - CATEGORIES[b.category].order);
    if (!items.length) return '<p class="muted small" style="padding:8px 4px">Aucun produit.</p>';
    return items.map(p => `<button class="prod" data-id="${p.id}" style="width:100%;text-align:left;${p.active ? '' : 'opacity:.5'}">
      <span class="body"><strong>${esc(p.name)}</strong>
        <div class="meta">${esc(p.role || CATEGORIES[p.category].label)}${p.optional ? ' (optionnel)' : ''} · ${scheduleLabel(p)}</div></span>
      <span class="muted">›</span></button>`).join('');
  };
  $('#view').innerHTML = `
    <div class="row" style="margin-bottom:14px"><button class="btn block" id="import">Ajouter une liste</button><button class="btn block" id="more">Sauvegarde</button></div>
    ${groups.map(([g, label]) => `<div class="section-title"><h2>${label}</h2></div><div class="card" style="padding:4px 10px">${listHTML(g)}</div>`).join('')}
    <p class="muted small">Exfoliant les lundis et jeudis soir. Les étapes optionnelles s'affichent mais ne comptent pas dans la progression. Touche un produit pour changer son rôle ou ses jours.</p>`;
  $('#add').onclick = () => editProduct(null);
  $('#import').onclick = importList;
  $('#more').onclick = backupSheet;
  document.querySelectorAll('.prod').forEach(el => el.onclick = () => editProduct(el.dataset.id));
}
function editProduct(id) {
  const existing = state.products.find(p => p.id === id);
  const p = existing ? JSON.parse(JSON.stringify(existing)) : makeProduct('', 'other');
  const catOptions = g => Object.entries(CATEGORIES).filter(([, c]) => c.group === g)
    .map(([k, c]) => `<option value="${k}" ${k === p.category ? 'selected' : ''}>${c.label}</option>`).join('');
  const dayChips = slot => [1, 2, 3, 4, 5, 6, 0]
    .map(d => `<button class="chip ${p[slot].includes(d) ? 'on' : ''}" data-slot="${slot}" data-day="${d}">${DAY_SHORT[d]}</button>`).join('');
  const draw = () => openSheet(`
    <h3>${existing ? 'Modifier' : 'Nouveau produit'}</h3>
    <label class="field"><span>Nom</span><input type="text" id="f-name" value="${esc(p.name)}" placeholder="ex. CeraVe gel moussant"></label>
    <label class="field"><span>Rôle (1 ou 2 mots)</span><input type="text" id="f-role" value="${esc(p.role || '')}" placeholder="ex. Anti-taches"></label>
    <label class="field"><span>Type</span><select id="f-cat"><optgroup label="Peau">${catOptions('skin')}</optgroup><optgroup label="Dents">${catOptions('teeth')}</optgroup></select></label>
    <div class="field"><span>☀︎ Matin</span><div class="chips days">${dayChips('am')}</div></div>
    <div class="field"><span>☾ Soir</span><div class="chips days">${dayChips('pm')}</div></div>
    <label class="field"><span>Note (optionnel)</span><input type="text" id="f-note" value="${esc(p.note)}" placeholder="${esc(CATEGORIES[p.category].note || 'ex. 2 gouttes')}"></label>
    <label class="row" style="margin-bottom:10px"><input type="checkbox" id="f-optional" ${p.optional ? 'checked' : ''}> <span>Optionnel (ne compte pas dans la progression)</span></label>
    <label class="row" style="margin-bottom:14px"><input type="checkbox" id="f-active" ${p.active ? 'checked' : ''}> <span>Utilisé en ce moment</span></label>
    <div class="sheet-actions">
      ${existing ? '<button class="btn danger" id="f-del">Supprimer</button>' : ''}
      <button class="btn" id="f-cancel">Annuler</button>
      <button class="btn primary" id="f-save">Enregistrer</button>
    </div>`, s => {
    const sync = () => {
      p.name = $('#f-name', s).value; p.role = $('#f-role', s).value.trim(); p.note = $('#f-note', s).value;
      p.optional = $('#f-optional', s).checked; p.active = $('#f-active', s).checked;
    };
    $('#f-cat', s).onchange = e => {
      sync();
      const c = CATEGORIES[e.target.value];
      Object.assign(p, { category: e.target.value, am: [...c.am], pm: [...c.pm] });
      draw();
    };
    s.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
      sync();
      const slot = b.dataset.slot, v = Number(b.dataset.day);
      p[slot] = p[slot].includes(v) ? p[slot].filter(x => x !== v) : [...p[slot], v];
      draw();
    });
    $('#f-cancel', s).onclick = closeSheet;
    const del = $('#f-del', s);
    if (del) del.onclick = () => {
      if (!confirm(`Supprimer « ${p.name} » ?`)) return;
      state.products = state.products.filter(x => x.id !== p.id); save(); closeSheet(); render();
    };
    $('#f-save', s).onclick = () => {
      sync();
      if (!p.name.trim()) return toast('Donne un nom au produit');
      p.name = p.name.trim();
      if (existing) Object.assign(existing, p); else state.products.push(p);
      save(); closeSheet(); render();
    };
  });
  draw();
}
function importList() {
  openSheet(`
    <h3>Ajouter une liste</h3>
    <p class="muted small">Un produit par ligne. Je devine le type (nettoyant, sérum, SPF, siwak…) et je le place au bon moment. Tu pourras corriger ensuite.</p>
    <label class="field"><textarea id="list" placeholder="CeraVe gel moussant&#10;The Ordinary Niacinamide 10%&#10;Bain de bouche"></textarea></label>
    <div class="sheet-actions"><button class="btn" id="cancel">Annuler</button><button class="btn primary" id="go">Ajouter</button></div>`, s => {
    $('#cancel', s).onclick = closeSheet;
    $('#go', s).onclick = () => {
      const names = $('#list', s).value.split('\n').map(x => x.replace(/^[\s\-•*\d.)]+/, '').trim()).filter(Boolean);
      if (!names.length) return toast('Liste vide');
      state.products.push(...names.map(n => makeProduct(n)));
      save(); closeSheet(); render();
      toast(`${names.length} produit${names.length > 1 ? 's' : ''} ajouté${names.length > 1 ? 's' : ''}`);
    };
  });
}

/* ---------- Sauvegarde / restauration ---------- */
function blobToDataURL(b) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
async function exportBackup() {
  const photos = {};
  for (const d of Object.keys(state.photos)) { const b = await photoGet(d); if (b) photos[d] = await blobToDataURL(b); }
  const blob = new Blob([JSON.stringify({ app: 'rituel', version: 1, state, photos })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rituel-sauvegarde-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'rituel' || !data.state) throw new Error('format');
    state = data.state;
    for (const [d, url] of Object.entries(data.photos || {})) await photoPut(d, await (await fetch(url)).blob());
    save(); closeSheet(); render(); toast('Sauvegarde restaurée');
  } catch (e) { toast('Fichier de sauvegarde invalide'); }
}
function backupSheet() {
  openSheet(`
    <h3>Sauvegarde</h3>
    <p class="muted small">Tout reste sur ton téléphone. Exporte de temps en temps pour ne rien perdre (photos incluses).</p>
    <div class="sheet-actions" style="flex-direction:column">
      <button class="btn primary" id="exp">Exporter</button>
      <label class="btn">Restaurer un fichier<input type="file" id="imp" accept="application/json,.json" hidden></label>
      <button class="btn" id="close">Fermer</button>
    </div>`, s => {
    $('#exp', s).onclick = exportBackup;
    $('#imp', s).onchange = e => e.target.files[0] && importBackup(e.target.files[0]);
    $('#close', s).onclick = closeSheet;
  });
}

/* ---------- Démarrage ---------- */
// Retour sur l'app un autre jour : on se recale sur aujourd'hui.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ui.tab === 'today' && ui.lastSeen !== todayISO()) { ui.date = todayISO(); render(); }
  ui.lastSeen = todayISO();
});
ui.lastSeen = todayISO();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
