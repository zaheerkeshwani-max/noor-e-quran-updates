(function () {
  'use strict';

  const N = window.Native;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const view = $('#view');

  // ---------------------------------------------------------------- settings
  const DEFAULTS = {
    theme: 'light', arFont: 'qalam', guFont: 'noto',
    fs: { ar: 32, gu: 20, tr: 20 },
    showTr: true, showGu: true, keepOn: false,
    autoScroll: true, speed: 1, repeatEach: 1, contNext: true
  };
  const FS_RANGE = { ar: [20, 64], gu: [12, 32], tr: [11, 28] };
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const REPEATS = [1, 2, 3, 5, 10, 0]; // 0 = endless
  // [id, name, swatch, system bar colour, dark?]
  const THEMES = [
    ['light', 'Light', 'linear-gradient(135deg,#F6F1E6 50%,#0A4D44 50%)', '#06352F', 0],
    ['linen', 'Linen', 'linear-gradient(135deg,#F8F6F3 50%,#585248 50%)', '#332F2A', 0],
    ['midnight', 'Midnight', 'linear-gradient(135deg,#11212D 50%,#9BA8AB 50%)', '#06141B', 1],
    ['dark', 'Dark', 'linear-gradient(135deg,#121D1B 50%,#D9B45E 50%)', '#0A2824', 1]
  ];
  const themeOf = id => THEMES.find(t => t[0] === id) || THEMES[0];
  const themeGrid = () => `<div class="theme-grid">${THEMES.map(t =>
    `<button class="theme-card ${t[0] === S.theme ? 'on' : ''}" data-tp="${t[0]}"><span class="sw" style="background:${t[2]}"></span>${t[1]}</button>`).join('')}</div>`;

  // script 0 = Indo-Pak text (Duao no Majmuo), 1 = Uthmani text (Noor Quraan)
  const AR_FONTS = [
    // Al Qalam draws the Indo-Pak jazm for ْ and the Quranic heh for ه, so the Majmuo text's ۡ and ہ are swapped in (arT)
    // file: the same font in assets/fonts, for the home-screen widget
    { id: 'qalam', fam: 'QalamMajeed', name: 'Al Qalam Quran Majeed 2', script: 0, std: true, file: 'qalam_majeed.ttf' },
    { id: 'muhammadi', fam: 'Muhammadi', name: 'Muhammadi', script: 0, file: 'muhammadi.ttf' },
    { id: 'mequran', fam: 'MeQuran', name: 'Me Quran', script: 0, file: 'me_quran.ttf' },
    { id: 'adobe', fam: 'AdobeArabic', name: 'Adobe Arabic', script: 1, file: 'adobe_arabic.otf' }
  ];
  const GU_FONTS = [
    { id: 'noto', fam: 'NotoGuj', name: 'Noto Sans', file: 'NotoSansGujarati.ttf' },
    { id: 'baloo', fam: 'BalooBhai', name: 'Baloo Bhai', file: 'BalooBhai2-Regular.ttf' },
    { id: 'hind', fam: 'HindVadodara', name: 'Hind Vadodara', file: 'HindVadodara-Regular.ttf' },
    { id: 'shruti', fam: 'Shruti', name: 'Shruti', file: 'shruti.ttf' }
  ];
  const BISM = ['بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ', 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'];
  const TAB_COLORS = ['#0F7363', '#C49A3A', '#2F6FB5', '#C0453A', '#7D4BA8', '#3E8E41', '#D2691E'];

  const S = load('qm.settings', {});
  for (const k in DEFAULTS) if (S[k] === undefined) S[k] = JSON.parse(JSON.stringify(DEFAULTS[k]));
  if (!THEMES.some(t => t[0] === S.theme)) S.theme = 'light';
  if (!AR_FONTS.some(f => f.id === S.arFont)) S.arFont = 'qalam';
  if (!REPEATS.includes(Number(S.repeatEach))) S.repeatEach = 5; // 7x was removed
  if (S.fsVer !== 2) { S.fs = Object.assign({}, DEFAULTS.fs); S.fsVer = 2; } // new default sizes from v1.2
  if (S.arVer !== 1) { S.arFont = 'qalam'; S.arVer = 1; } // v2.3: Al Qalam Quran Majeed 2 is the Arabic font again
  // v4.2 features, each with its own on/off switch in Settings
  S.feat = Object.assign({ khatam: true, juzBar: true, hifz: true, duas: true, topics: true, lock: true, words: true, askBm: true }, S.feat || {});
  const saveSettings = () => store('qm.settings', S);

  // ---------------------------------------------------------------- language (v7.2): 'gu' Arabic + Gujarati, 'en' Arabic + English
  // asked once when the app first opens (S.lang unset), changed later in Settings › Language (the page reloads)
  const EN = () => S.lang === 'en';
  const L = (gu, en) => EN() ? en : gu;
  // English names of the well-known ayahs, subjects and duas (their lists below keep the Gujarati)
  const NAME_EN = {
    'આયતુલ કુર્સી': 'Ayat al-Kursi', 'આયએ બલ્લિગ (તબ્લીગ)': 'Ayah of Balligh (Tabligh)', 'આયએ શહાદત': 'Ayah of Shahadah',
    'આયએ મુલ્ક': 'Ayah of Mulk', 'આયએ તત્હીર': 'Ayah of Tat\'hir (Purification)', 'આયએ વિલાયત': 'Ayah of Wilayah',
    'આયએ ઇકમાલે દીન': 'Ayah of Ikmal al-Din (Perfection of Religion)', 'આયએ મુબાહેલા': 'Ayah of Mubahala',
    'આયએ મવદ્દત': 'Ayah of Mawaddah (Love)', 'આયએ ઉલિલ અમ્ર': 'Ayah of Ulil Amr', 'આયએ ઇજાબતે દુઆ (અમ્મંય્ યુજીબુ)': 'Ayah of Answered Dua (Amman Yujib)',
    'નમાઝ': 'Salah (Prayer)', 'સબ્ર (ધીરજ)': 'Sabr (Patience)', 'માં-બાપ (વાલેદૈન)': 'Parents', 'અહલેબૈત (અ.સ.)': 'Ahlul Bayt (a.s.)',
    'જન્નત': 'Jannah (Paradise)', 'તૌબા અને ઇસ્તગફાર': 'Tawbah and Istighfar', 'દુઆ': 'Dua', 'રોઝા': 'Fasting', 'હજ': 'Hajj',
    'સદકો અને અલ્લાહની રાહમાં ખર્ચ': 'Charity and Spending in Allah\'s Way', 'ઇલ્મ': 'Knowledge', 'શુક્ર': 'Shukr (Gratitude)',
    'તકવા (પરહેઝગારી)': 'Taqwa (God-wariness)', 'ઇન્સાફ અને સચ્ચાઈ': 'Justice and Truthfulness', 'અલ્લાહ પર ભરોસો (તવક્કુલ)': 'Tawakkul (Trust in Allah)',
    'અલ્લાહની યાદ (ઝિક્ર)': 'Dhikr (Remembrance of Allah)', 'મૌત અને આખેરત': 'Death and the Hereafter', 'યતીમ અને ગરીબ': 'Orphans and the Poor',
    'હલાલ રોઝી અને વ્યાજ': 'Lawful Earning and Usury', 'સારા અખ્લાક (ગુસ્સો, માફી)': 'Good Manners (Anger, Forgiving)', 'કુરઆન': 'The Quran',
    'તૌહીદ (અલ્લાહ એક છે)': 'Tawhid (Oneness of Allah)',
    'હિદાયત (સીધા રસ્તા) માટેની દુઆ': 'Dua for Guidance (the Straight Path)', 'અમલ કબૂલ થવાની દુઆ': 'Dua for Deeds to Be Accepted',
    'ફરમાંબરદાર બનવા અને તૌબા કબૂલ થવાની દુઆ': 'Dua to Submit and for Repentance to Be Accepted', 'દુનિયા અને આખેરતની ભલાઈની દુઆ': 'Dua for Good in This World and the Hereafter',
    'સબ્ર અને મજબૂત કદમની દુઆ': 'Dua for Patience and Firm Steps', 'બોજ ન નાખવા, માફી અને મદદની દુઆ': 'Dua Not to Be Burdened, for Pardon and Help',
    'હિદાયત પછી દિલ ન ફરે તે માટેની દુઆ': 'Dua That the Heart Not Swerve after Guidance', 'ગુનાહની માફી અને જહન્નમથી બચાવ': 'Forgiveness of Sins and Protection from Hell',
    'નેક ઓલાદની દુઆ (હ. ઝકરીયા અ.)': 'Dua for Righteous Children (Prophet Zakariyya a.s.)', 'હકની ગવાહી આપનારાઓમાં લખી લેવાની દુઆ': 'Dua to Be Written among the Witnesses',
    'ગુનાહની માફી અને કાફિરો સામે મદદ': 'Forgiveness of Sins and Help against the Faithless', 'અલ્લાહની ખિલકત પર વિચારનારાઓની દુઆ': 'Dua of Those Who Reflect on Creation',
    'હ. આદમ (અ.) ની તૌબા': 'Repentance of Prophet Adam (a.s.)', 'ઝાલિમો સાથે ન રાખવાની દુઆ': 'Dua Not to Be Placed with the Wrongdoers',
    'ઝાલિમ લોકોથી નજાતની દુઆ': 'Dua for Deliverance from Wrongdoers', 'મુસલમાન તરીકે મૌત અને નેક લોકોનો સાથ (હ. યુસુફ અ.)': 'To Die a Muslim and Join the Righteous (Prophet Yusuf a.s.)',
    'નમાઝ કાયમ કરવા અને વાલેદૈનની માફીની દુઆ': 'Dua to Keep up Prayer and Forgiveness for Parents', 'માં-બાપ પર રહેમની દુઆ': 'Dua of Mercy for Parents',
    'સચ્ચાઈ સાથે દાખલ થવા અને નીકળવાની દુઆ': 'Dua to Enter and Leave with Truth', 'રહેમત અને સાચી હિદાયતની દુઆ (અસ્હાબે કહફ)': 'Dua for Mercy and Right Guidance (People of the Cave)',
    'દિલ ખુલવા અને કામ આસાન થવાની દુઆ (હ. મૂસા અ.)': 'Dua to Open the Heart and Ease the Task (Prophet Musa a.s.)', 'ઇલ્મ વધવાની દુઆ': 'Dua to Increase Knowledge',
    'બીમારી અને તકલીફમાં દુઆ (હ. ઐયુબ અ.)': 'Dua in Illness and Distress (Prophet Ayyub a.s.)', 'મુસીબતમાંથી નજાતની દુઆ (હ. યુનુસ અ.)': 'Dua for Relief from Hardship (Prophet Yunus a.s.)',
    'ઓલાદ માટેની દુઆ (હ. ઝકરીયા અ.)': 'Dua for Children (Prophet Zakariyya a.s.)', 'બરકતવાળી જગ્યાએ ઉતરવાની દુઆ': 'Dua to Land at a Blessed Place',
    'શેતાનના વસવસાથી પનાહ': 'Refuge from the Whispers of Satan', 'ઈમાન, માફી અને રહેમતની દુઆ': 'Dua for Faith, Forgiveness and Mercy',
    'માફી અને રહેમતની દુઆ': 'Dua for Forgiveness and Mercy', 'જહન્નમના અઝાબથી બચાવની દુઆ': 'Dua for Protection from the Punishment of Hell',
    'નેક પત્ની અને ઓલાદ (આંખોની ઠંડક)': 'Righteous Spouses and Children (Comfort of the Eyes)', 'ઇલ્મ, હિકમત અને નેક લોકોનો સાથ (હ. ઇબ્રાહીમ અ.)': 'Wisdom and the Company of the Righteous (Prophet Ibrahim a.s.)',
    'શુક્ર અને નેક અમલની તૌફીક (હ. સુલયમાન અ.)': 'Gratitude and Good Deeds (Prophet Sulayman a.s.)', 'ગુનાહની માફીની દુઆ (હ. મૂસા અ.)': 'Dua for Forgiveness (Prophet Musa a.s.)',
    'રોઝી અને ભલાઈની દુઆ (હ. મૂસા અ.)': 'Dua for Provision and Good (Prophet Musa a.s.)', 'ફસાદ કરનારાઓ સામે મદદ (હ. લૂત અ.)': 'Help against the Corrupt (Prophet Lut a.s.)',
    'નેક ફરઝંદની દુઆ (હ. ઇબ્રાહીમ અ.)': 'Dua for a Righteous Son (Prophet Ibrahim a.s.)', 'શુક્ર, નેક ઓલાદ અને તૌબાની દુઆ': 'Dua for Gratitude, Righteous Children and Repentance',
    'મોઅમીન ભાઈઓ માટે દુઆ અને દિલની સફાઈ': 'Dua for the Believers and a Clean Heart', 'અલ્લાહ પર ભરોસાની દુઆ': 'Dua of Trust in Allah',
    'નૂર પૂરું થવા અને માફીની દુઆ': 'Dua for Perfect Light and Forgiveness', 'જન્નતમાં ઘરની દુઆ (જ. આસિયા)': 'Dua for a House in Paradise (Lady Asiya)',
    'વાલેદૈન અને મોઅમીનો માટે માફી (હ. નૂહ અ.)': 'Forgiveness for Parents and Believers (Prophet Nuh a.s.)'
  };
  const nameL = gu => (EN() && NAME_EN[gu]) || gu;

  function load(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; }
  }
  function store(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { }
  }

  const arFont = () => AR_FONTS.find(f => f.id === S.arFont) || AR_FONTS[0];
  /** Arabic as the chosen font wants it: jazm ۡ -> ْ , heh ہ -> ه , ۃ -> ة for Al Qalam. */
  const arT = t => !arFont().std ? String(t || '') : String(t || '')
    .replace(/ۡ/g, 'ْ').replace(/ہ/g, 'ه').replace(/ۃ/g, 'ة');
  const guFont = () => GU_FONTS.find(f => f.id === S.guFont) || GU_FONTS[0];

  function applyTheme() {
    const root = document.documentElement;
    root.dataset.theme = S.theme;
    root.dataset.dark = themeOf(S.theme)[4] ? '1' : '0';
    root.style.setProperty('--ar-font', `"${arFont().fam}"`);
    // English mode: the translation in the phone's own font (the Gujarati fonts' Latin letters are not made for reading)
    root.style.setProperty('--gu-font', EN() ? 'system-ui, "Roboto", sans-serif' : `"${guFont().fam}"`);
    // the rest of the app's text (menus, headings, buttons): Gujarati letters from the chosen font, English from the phone's own
    const ui = document.getElementById('guUi') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'guUi' }));
    ui.textContent = `@font-face { font-family: "GuUI"; src: url("../fonts/${guFont().file}"); unicode-range: U+0A80-0AFF, U+200C-200D, U+25CC; font-display: block; }`;
    for (const k of ['ar', 'gu', 'tr']) root.style.setProperty('--fs-' + k, S.fs[k] + 'px');
    document.body.classList.toggle('hide-tr', !S.showTr);
    document.body.classList.toggle('hide-gu', !S.showGu);
    document.body.classList.toggle('lang-en', EN());
    document.documentElement.lang = EN() ? 'en' : 'gu';
    if (N.setLang) N.setLang(EN() ? 'en' : 'gu');
    document.body.classList.toggle('hifz', !!(S.hifz && S.feat.hifz));
    const dt = $('#tabs [data-tab="duas"]');
    const dl = dt && $('span', dt);
    if (dl) dl.textContent = L('Duao', 'Duas');
    if (dt) dt.hidden = !S.feat.duas;
    N.setBars(themeOf(S.theme)[3], false);
    N.keepScreenOn(!!S.keepOn);
    saveWidget(); // fonts and colours of the home-screen widget follow the app
  }

  // ---------------------------------------------------------------- helpers
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const an = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const p3 = n => String(n).padStart(3, '0');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  function getJSON(url) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('GET', url);
      x.onload = () => {
        if ((x.status === 200 || x.status === 0) && x.responseText) {
          try { res(JSON.parse(x.responseText)); } catch (e) { rej(e); }
        } else rej(new Error('load ' + url));
      };
      x.onerror = () => rej(new Error('load ' + url));
      x.send();
    });
  }

  let META = null;
  const surahCache = {};
  // English mode: the translation and transliteration (a[2], a[3]) come from data/en (tools/build_en.py); the Gujarati intro is left out
  const enCache = {};
  const loadEn = n => enCache[n] || (enCache[n] = getJSON(`data/en/${p3(n)}.json`));
  const loadSurah = n => surahCache[n] || (surahCache[n] = !EN() ? getJSON(`data/s/${p3(n)}.json`)
    : Promise.all([getJSON(`data/s/${p3(n)}.json`), loadEn(n)]).then(([d, e]) => {
      d.ayahs.forEach((a, i) => { if (e.t[i]) { a[2] = e.t[i][0]; a[3] = e.t[i][1]; } });
      d.intro = [];
      return d;
    }));
  const sm = n => META.surahs[n - 1];

  /** Juz that holds surah s, ayah n. */
  function juzOf(s, n) {
    let j = 1;
    for (const z of META.juz) if (z.s < s || (z.s === s && z.a <= n)) j = z.n;
    return j;
  }
  /** [surah, ayah] after the last ayah of juz j, or null for the last juz. */
  function juzEnd(j) {
    const z = META.juz[j];
    return z ? [z.s, z.a] : null;
  }

  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z"/></svg>',
    playO: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M18 6v12l-8.5-6zM6 6v12"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M6 6v12l8.5-6zM18 6v12"/></svg>',
    repeat: '<svg viewBox="0 0 24 24"><path d="M17 3.5 20 6.5l-3 3"/><path d="M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5 4 17.5l3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/></svg>',
    bm: '<svg viewBox="0 0 24 24"><path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13"/></svg>',
    head: '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/></svg>',
    // three stacked chevrons, as in the user's auto-scroll icon
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z"/><path d="M15.5 3.5h3l-3 3.5h3"/></svg>',
    scroll: '<svg class="chev3" viewBox="0 0 24 24"><path d="M6 4.2 12 8.4l6-4.2v3.3l-6 4.2-6-4.2zM6 9.4l6 4.2 6-4.2v3.3l-6 4.2-6-4.2zM6 14.6l6 4.2 6-4.2v3.3L12 22.1l-6-4.2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.7 10.8 6.6-3.9M8.7 13.2l6.6 3.9"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    star: '<svg viewBox="0 0 42 42"><path d="M21 1.5l5.3 7.9 9.3-1.6-1.6 9.3 7.9 5.3-7.9 5.3 1.6 9.3-9.3-1.6L21 40.5l-5.3-7.9-9.3 1.6 1.6-9.3L.1 21l7.9-5.3-1.6-9.3 9.3 1.6z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    paint: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-1.9-.4-1 .2-2.1 1.3-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 4.5h14v11l-4.5 4.5H5z"/><path d="M14.5 20v-4.5H19M8.5 9h7M8.5 12.5h4"/></svg>',
    words: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="7.5" height="5.5" rx="1.5"/><rect x="13.5" y="5" width="7.5" height="5.5" rx="1.5"/><path d="M4 15h6.5M4 18.5h4.5M14.5 15h6M14.5 18.5h4"/></svg>',
    flower: '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 5.8L20 6l-1.8 5.8L24 12l-5.8 2.2L20 20l-5.8-1.8L12 24l-2.2-5.8L4 20l1.8-5.8L0 12l5.8-.2L4 6l5.8 1.8z"/></svg>',
    // the user's Quran-on-rehal picture (icon.png in the project folder), scaled down to quran3d.png
    // the same picture as the phone's app icon (green tile, gold medallion), as the user asked for the heading
    quran3d: '<img class="q3d" src="app-icon.png" alt="">',
    go: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    shrink: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17.5 5-4.5 4 3.5 3-2.5 4.5 3.5"/></svg>',
    hands: '<svg viewBox="0 0 24 24"><path d="M11 20.5 6.5 16a3 3 0 0 1-.9-2.1V7.5a1.3 1.3 0 0 1 2.6 0V12M13 20.5l4.5-4.5a3 3 0 0 0 .9-2.1V7.5a1.3 1.3 0 0 0-2.6 0V12"/><path d="M8.2 12.5 11 15v5.5M15.8 12.5 13 15v5.5"/></svg>',
    progress: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="18" rx="3"/><path d="M12 12.5v5.5" stroke-width="3"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5.5 21V4"/><path d="M5.5 4.5h11.5l-2.5 4 2.5 4H5.5"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/></svg>'
  };

  // ---------------------------------------------------------------- bar / toast / sheet
  function setBar({ title, sub = '', back = false, tabs = null, actions = '', icon = '' }) {
    $('#barTitle').innerHTML = icon + `<span>${esc(title)}</span>`;
    $('#barTitle').classList.toggle('brand', !!icon);
    $('#barTitle').parentNode.classList.toggle('branded', !!icon);
    $('#barSub').textContent = sub;
    $('#backBtn').hidden = !back;
    $('#barActions').innerHTML = actions;
    document.body.classList.toggle('no-tabs', !tabs);
    $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tabs));
    requestAnimationFrame(placeNotch);
  }
  /** Moves the dip and dot of the bottom bar over the chosen tab. */
  function placeNotch() {
    const n = $('#tabNotch'), a = $('#tabs a.on');
    if (!n) return;
    const nav = $('#tabs');
    if (!a || document.body.classList.contains('no-tabs')) {
      if (!n.hidden) n.hidden = true;
      n.classList.remove('move'); nav.classList.remove('nmove'); nav.style.setProperty('--nx', '-200px');
      return;
    }
    const first = n.hidden;
    if (first) n.hidden = false;
    n.classList.toggle('move', !first);
    nav.classList.toggle('nmove', !first);
    // centred on the icon itself, not on the tab's box; the line and dot sit on the bar's top edge
    const ic = a.querySelector('svg, .tab-ic') || a, r = ic.getBoundingClientRect(), bar = nav.getBoundingClientRect();
    const x = r.left + r.width / 2 - 42;
    nav.style.setProperty('--nx', (x - bar.left).toFixed(1) + 'px');
    n.style.top = bar.top.toFixed(1) + 'px';
    document.documentElement.style.setProperty('--tab-top', bar.top.toFixed(1) + 'px');
    n.style.transform = `translateX(${x.toFixed(1)}px)`;
  }
  addEventListener('resize', () => requestAnimationFrame(placeNotch));
  // a tab shown or hidden later (Duao) moves the others
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(placeNotch)).observe($('#tabs'));
  if (window.MutationObserver) new MutationObserver(() => requestAnimationFrame(placeNotch))
    .observe($('#tabs'), { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  $('#backBtn').onclick = () => leaveReader() || history.back();

  /**
   * Going back from the Quran after reading at least 30 seconds: if the ayah being read is not bookmarked, asks
   * "Bookmark karvu che?" first (Settings › Ask to Bookmark when Leaving). True while the question is open.
   */
  let readerSince = 0, askedLeave = false;
  function leaveReader() {
    if (!S.feat.askBm || askedLeave || !route || (route.name !== 'surah' && route.name !== 'juz')) return false;
    if (Date.now() - readerSince < 30000) return false; // a quick look is not a tilawat
    const f = firstVisibleAyah();
    if (!f || bmsOf(f[0], f[1]).length) return false;
    const [s, n] = f;
    askedLeave = true;
    const leave = () => { closeSheet(); history.back(); };
    openSheet(`<h3>${L('Bookmark કરવું છે?', 'Bookmark this ayah?')}</h3>
      <div class="sub">${esc(sm(s).en)} · Ayah ${n} — ${L('જ્યાં સુધી વાંચ્યું ત્યાં નિશાની રાખો', 'keep your place where you stopped')}</div>
      <div style="display:flex;gap:8px"><button class="btn" id="yes" style="flex:1">${ICON.bm} ${L('હા', 'Yes')}</button>
        <button class="btn ghost" id="no" style="flex:1">${L('ના', 'No')}</button></div>`, sh => {
      $('#no', sh).onclick = leave;
      $('#yes', sh).onclick = () => openBmSheet(s, n, () => refreshBm(document.getElementById(`a-${s}-${n}`), s, n), leave);
    });
    return true;
  }

  let toastTimer;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
  }

  let sheetOpen = false;
  function openSheet(html, bind) {
    const sh = $('#sheet');
    sh.innerHTML = `<div class="grip"></div><button class="sheet-x" aria-label="Close">${ICON.close}</button>` + html;
    sh.scrollTop = 0;
    $('.sheet-x', sh).onclick = closeSheet;
    $('#sheetBackdrop').classList.add('on');
    sh.classList.add('on');
    sheetOpen = true;
    bind && bind(sh);
  }
  function closeSheet() {
    $('#sheetBackdrop').classList.remove('on');
    $('#sheet').classList.remove('on');
    sheetOpen = false;
  }
  $('#sheetBackdrop').onclick = closeSheet;

  const chips = (name, items, cur) => `<div class="chips" data-chips="${name}">${items.map(([v, l]) =>
    `<button class="chip ${String(v) === String(cur) ? 'on' : ''}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  const sw = (id, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></label>`;
  const seg = (name, items, cur) => `<div class="seg" data-seg="${name}">${items.map(([v, l]) =>
    `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;

  function bindChips(root, name, fn) {
    const box = $(`[data-chips="${name}"]`, root);
    if (!box) return;
    box.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', box).forEach(x => x.classList.toggle('on', x === b));
      fn(b.dataset.v);
    };
  }

  const speedLabel = v => String(v) + 'x';
  const repLabel = v => Number(v) === 0 ? '∞' : String(v);
  const sajdaHtml = t => t === 1
    ? '<div class="sajda-banner wajib"><b>۩ Wajib Sajdah</b><span>Sajdah is obligatory on reciting or hearing this ayah</span></div>'
    : t === 2 ? '<div class="sajda-banner mustahab"><b>۩ Mustahab Sajdah</b><span>Sajdah is recommended after this ayah</span></div>' : '';

  // ---------------------------------------------------------------- bookmarks (in tabs) & last read
  let TABS = load('qm.tabs', null);
  if (!TABS) {
    TABS = [{ id: 'home', name: 'Home', c: 0 }, { id: 'class', name: 'Class', c: 1 }, { id: 'students', name: 'Students', c: 2 }];
    store('qm.tabs', TABS);
  }
  let BM = load('qm.bm', []).map(b => b.t ? b : { s: b.s, n: b.n, at: b.at, t: 'home', note: b.note || '' });
  const saveBm = () => store('qm.bm', BM);
  const saveTabs = () => store('qm.tabs', TABS);
  const tabOf = id => TABS.find(t => t.id === id);
  const tabColor = id => TAB_COLORS[(tabOf(id) || { c: 0 }).c % TAB_COLORS.length];
  const bmsOf = (s, n) => BM.filter(b => b.s === s && b.n === n && tabOf(b.t));

  function setLast(s, n) {
    const cur = load('qm.last', null);
    if (cur && cur.s === s && cur.n === n) return;
    store('qm.last', { s, n, at: Date.now() });
  }

  // ---------------------------------------------------------------- audio player
  // Two elements: one plays while the other preloads the next ayah, so ayahs follow without a gap.
  let audio = new Audio(), spare = new Audio();
  audio.preload = spare.preload = 'auto';
  const P = { s: 0, n: 0, phase: 'ayah', rep: 0, playing: false, range: null, rangeRep: 0, sleepAt: 0, sleepEnd: false };
  let sleepTimer = null;

  // File SSSnnn is ayah n. Surahs 2–114 (not 9) also have SSS000, the qari's Bismillah, which plays
  // before ayah 1 with ayah 1 highlighted. (Surah 1's ayah 1 is itself the Bismillah.)
  const ayahSrc = (s, n) => `${AUDIO_DIR}/${p3(s)}/${p3(s)}${p3(n)}.mp3`;
  const needsBism = (s, n) => n === 1 && s > 1 && s !== 9;
  const curSrc = () => ayahSrc(P.s, P.phase === 'bism' ? 0 : P.n);

  // ---------------------------------------------------------------- Lite APK: ayah audio downloaded from Google Drive
  // The Lite APK has no recitation inside. A surah's ayah files are downloaded from its Drive folder into
  // the phone (same SSS/SSSnnn.mp3 layout as the full APK's assets) and then play the same way.
  const HAS_AUDIO = !N.hasAudio || N.hasAudio();
  const AUDIO_DIR = HAS_AUDIO ? '../audio' : (N.surahDir ? N.surahDir() : '../audio');
  let ASIZE = {}, DLS = {};
  const DLING = {}; // surah → {state, done, total} while downloading
  const mb = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
  function refreshDls() { try { DLS = JSON.parse(N.downloaded ? N.downloaded() : '{}'); } catch (e) { DLS = {}; } }
  const haveSurah = s => HAS_AUDIO || !!DLS[s];
  const dlPct = d => d.total > 0 ? Math.min(99, Math.floor(100 * d.done / d.total)) : 0;
  if (!HAS_AUDIO) {
    refreshDls();
    getJSON('data/asize.json').then(x => { ASIZE = x; }).catch(() => { });
  }

  /** The download button beside a surah: arrow, progress, or a tick once it is on the phone. */
  function dlBtnHtml(s) {
    const d = DLING[s];
    // a small label above a round button
    const btn = (cls, label, inner, style = '') =>
      `<span class="dl-b ${cls}" data-dl="${s}" role="button"><small>${label}</small><span class="dl-c" ${style}>${inner}</span></span>`;
    if (DLS[s]) return btn('ok', 'Audio<br>Saved', ICON.check);
    if (d && (d.state === 'run' || d.state === 'wait')) {
      const pct = dlPct(d);
      return btn('run', 'Download<br>Audio', `<i>${d.state === 'wait' ? '…' : pct + '%'}</i>`, `style="--p:${pct}"`);
    }
    return btn('', 'Download<br>Audio', ICON.down);
  }
  function drawDl(s) {
    $$(`[data-dl="${s}"]`).forEach(el => { el.outerHTML = dlBtnHtml(s); });
    const st = $(`#dlState[data-s="${s}"]`);
    if (st) openDlSheet(s);
  }
  function startDl(s) {
    if (!N.downloadSurah) { toast('Download is available in the app'); return; }
    DLING[s] = { state: 'wait', done: 0, total: ASIZE[s] || 0 };
    N.downloadSurah(s);
    drawDl(s);
  }

  /** What one surah's audio is doing, with download / cancel / play / delete. */
  function openDlSheet(s) {
    const m = sm(s), d = DLING[s], size = DLS[s] || ASIZE[s];
    let body;
    if (DLS[s]) {
      body = `<p class="na-p">${L(`આ સૂરહનો અવાજ ફોનમાં છે (${mb(DLS[s])}). ઇન્ટરનેટ વગર પણ સાંભળી શકાશે.`, `This surah's recitation is on your phone (${mb(DLS[s])}). You can listen without internet.`)}</p>
        <button class="btn block" data-a="play">${ICON.playO} ${L('સાંભળો', 'Listen')}</button>
        <button class="btn ghost block" data-a="del" style="margin-top:10px">${ICON.trash} ${L('ફોનમાંથી ડિલીટ કરો', 'Delete from phone')}</button>`;
    } else if (d && (d.state === 'run' || d.state === 'wait')) {
      const pct = dlPct(d);
      body = `<div class="dl-prog"><span style="width:${pct}%"></span></div>
        <div class="dl-txt">${d.state === 'wait' ? L('રાહ જુઓ…', 'Waiting…') : `${mb(d.done)} / ${d.total > 0 ? mb(d.total) : '…'} · ${pct}%`}</div>
        <button class="btn ghost block" data-a="cancel">${ICON.close} ${L('ડાઉનલોડ બંધ કરો', 'Stop download')}</button>`;
    } else {
      body = `<p class="na-p">${L('કારી મુઅતઝ આગાઈ (તહદીર) ની આ સૂરહની તિલાવત Google Drive પરથી ફોનમાં ડાઉનલોડ કરો', 'Download this surah\'s recitation by Qari Mutazz Aghaei (Tahdir) from Google Drive to your phone')}${size ? ` (${mb(size)})` : ''}. ${L('એક વાર ડાઉનલોડ થયા પછી ઇન્ટરનેટ વગર સાંભળી શકાશે.', 'Once downloaded, you can listen without internet.')}</p>
        <button class="btn block" data-a="dl">${ICON.down} ${L('ડાઉનલોડ કરો', 'Download')}</button>`;
    }
    openSheet(`<h3 id="dlState" data-s="${s}">${esc(m.en)} · ${L('ઓડિયો', 'Audio')}</h3>
      <div class="sub">${EN() ? '' : esc(m.gu) + ' · '}${m.a} Ayahs</div>${body}`, sh => {
      sh.onclick = e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'dl') startDl(s);
        else if (a === 'cancel') { N.cancelSurah(s); }
        else if (a === 'play') { closeSheet(); playAyah(s, 1); }
        else if (a === 'del') {
          if (P.s === s) closePlayer();
          N.deleteSurah(s); refreshDls(); closeSheet(); drawDl(s); toast(L('ડિલીટ થઈ ગયું', 'Deleted'));
        }
      };
    });
  }
  // a tap on the download button beside a surah does not open the surah
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-dl]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const s = Number(b.dataset.dl), d = DLING[s];
    if (DLS[s] || (d && (d.state === 'run' || d.state === 'wait'))) openDlSheet(s); else startDl(s);
  }, true);

  /** Progress from the Android side (Bridge.downloadSurah). */
  function onDl(s, state, done, total) {
    DLING[s] = { state, done, total: total || ASIZE[s] || 0 };
    if (state === 'ok') { delete DLING[s]; refreshDls(); toast(`${sm(s).en} — ${L('ડાઉનલોડ થઈ ગયું', 'downloaded')}`); }
    else if (state === 'err') { delete DLING[s]; toast(`${sm(s).en}: ${L('ડાઉનલોડ ન થયું — ઇન્ટરનેટ તપાસો અથવા Drive પર હજી નથી', 'download failed — check the internet, or it is not on Drive yet')}`); }
    else if (state === 'cancel') delete DLING[s];
    else if (state === 'moved') { delete DLING[s]; refreshDls(); } // a v4.0 download, now cut into ayah files
    drawDl(s);
  }

  function playAyah(s, n, keepRange) {
    // a dua's ayahs are downloaded on their own (Lite), so they play without the whole surah
    const single = keepRange && P.range && P.range.single && P.range.s === s;
    if (!haveSurah(s) && !single) {
      // moving on by itself into a surah that is not on the phone: just stop there
      if (keepRange && P.s) { stopPlayer(`${sm(s).en} — Download Audio`); return; }
      if (P.s) stopPlayer();
      openDlSheet(s);
      return;
    }
    if (!keepRange) { P.range = null; P.rangeRep = 0; }
    P.s = s; P.n = n; P.rep = 0;
    P.phase = needsBism(s, n) ? 'bism' : 'ayah';
    loadAudio();
  }

  function loadAudio() {
    const want = new URL(curSrc(), location.href).href;
    if (spare.src === want && spare.readyState >= 2) {
      audio.pause();
      [audio, spare] = [spare, audio];
      audio.currentTime = 0;
    } else {
      audio.src = want;
    }
    audio.defaultPlaybackRate = S.speed;
    audio.playbackRate = S.speed;
    const pr = audio.play();
    if (pr && pr.catch) pr.catch(() => { });
    P.playing = true;
    highlight();
    drawPlayer();
    preloadNext();
  }

  /** Loads whatever will most likely play after the current clip into the spare element. */
  function preloadNext() {
    let src;
    const each = Number(S.repeatEach);
    const first = (s, n) => ayahSrc(s, needsBism(s, n) ? 0 : n);
    if (P.phase === 'bism') src = ayahSrc(P.s, P.n);
    else if (each === 0 || P.rep + 1 < each) return;
    else if (P.range && (P.n + 1 > P.range.to)) src = first(P.range.s, P.range.from);
    else if (P.n < sm(P.s).a) src = ayahSrc(P.s, P.n + 1);
    else if (S.contNext && P.s < 114) src = first(P.s + 1, 1);
    if (!src) return;
    const url = new URL(src, location.href).href;
    if (spare.src !== url) { spare.src = url; spare.load(); }
  }

  function togglePlay() {
    if (!P.s) return;
    if (audio.paused) {
      audio.playbackRate = S.speed;
      audio.play(); P.playing = true;
    } else {
      audio.pause(); P.playing = false;
    }
    drawPlayer();
  }

  function stopPlayer(msg) {
    audio.pause();
    P.playing = false;
    drawPlayer();
    if (msg) toast(msg);
  }

  function closePlayer() {
    audio.pause();
    P.s = 0; P.playing = false; P.range = null;
    clearSleep();
    $$('.playing').forEach(e => e.classList.remove('playing'));
    drawPlayer();
  }

  function onEnded(e) {
    if (e.target !== audio) return;
    if (P.phase === 'bism') { P.phase = 'ayah'; loadAudio(); return; }
    P.rep++;
    const each = Number(S.repeatEach);
    if (each === 0 || P.rep < each) {
      audio.currentTime = 0; audio.play(); preloadNext();
      return;
    }
    advance(1);
  }
  function onTime(e) {
    if (e.target !== audio) return;
    const bar = $('#plProg');
    if (bar && audio.duration) bar.style.width = (100 * audio.currentTime / audio.duration) + '%';
    if (audio.duration) $('#player').style.setProperty('--p', (100 * audio.currentTime / audio.duration) + '%');
    if (audio.duration && audio.currentTime / audio.duration >= 0.2) longAyahDown();
  }
  /**
   * Only an ayah whose Arabic is taller than the screen: it stays at the top until 20% of its audio; from there
   * the page follows the audio's own position (never a set speed, so it cannot fall behind), and the end of
   * the Arabic reaches the player at 88%. A hand on the page stops it. Once per ayah.
   */
  let longDone = '', longRaf = 0;
  function longAyahDown() {
    const key = `${P.s}:${P.n}:${P.rep}`;
    if (longDone === key || P.phase === 'bism' || !S.autoScroll || document.hidden || AS.on || FS) return;
    longDone = key;
    const el = document.getElementById(`a-${P.s}-${P.n}`), box = el && $('.ar-text', el);
    if (!box) return;
    const pl = $('#player'), floor = (pl && !pl.hidden ? pl.getBoundingClientRect().top : window.innerHeight) - 12;
    const r = box.getBoundingClientRect();
    if (r.height <= floor - stickTop() - 8 || !(r.bottom > floor && r.top < floor)) return;
    const y0 = window.scrollY, dist = r.bottom - floor, a = audio;
    cancelAnimationFrame(longRaf);
    // the audio clock moves in steps of a few hundred ms, so the time is carried on smoothly between
    // its updates, and the page eases towards its place instead of jumping there
    let ct = a.currentTime, at = performance.now(), y = y0, last = y0;
    const step = now => {
      if (a !== audio || `${P.s}:${P.n}:${P.rep}` !== key || !a.duration) return;
      if (a.currentTime !== ct) { ct = a.currentTime; at = now; }
      const t = a.paused ? ct : ct + Math.min(0.6, (now - at) / 1000) * (a.playbackRate || 1);
      const k = Math.min(1, Math.max(0, (t / a.duration - 0.2) / 0.68));
      if (Math.abs(window.scrollY - last) > 30) return; // the reader moved the page
      y += (y0 + dist * k - y) * 0.12;
      window.scrollTo(0, y);
      last = window.scrollY;
      if (k < 1 || Math.abs(y0 + dist - y) > 0.5) longRaf = requestAnimationFrame(step);
    };
    longRaf = requestAnimationFrame(step);
  }
  function onError(e) {
    if (e.target === audio && P.s && P.playing) stopPlayer('Audio could not be played');
  }
  for (const el of [audio, spare]) {
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('error', onError);
  }

  /** Moves to the next (dir=1) or previous (dir=-1) ayah, honouring range repeat and surah end. */
  function advance(dir) {
    let s = P.s, n = P.n + dir;
    if (P.range && dir > 0 && (s !== P.range.s || n > P.range.to)) {
      P.rangeRep++;
      const times = Number(P.range.times);
      if (times !== 0 && P.rangeRep >= times) { stopPlayer('Repeat finished'); return; }
      playAyah(P.range.s, P.range.from, true);
      return;
    }
    if (n < 1) {
      if (s === 1) n = 1; else { s--; n = sm(s).a; }
    } else if (n > sm(s).a) {
      if (P.sleepEnd) { clearSleep(); stopPlayer('Surah finished'); return; }
      if (!S.contNext || s === 114) { stopPlayer('Surah finished'); return; }
      s++; n = 1;
    }
    playAyah(s, n, true);
  }

  /**
   * Brings an ayah up to just under the top bar so its box shows from the top.
   * Where a new sipara starts, its "Sipara N starts here" banner stays in view; where a new
   * page starts, its "Page N" line stays in view; where a new ruku starts, the ع of the one before stays in view.
   */
  /** Height covered at the top of the reader: the bar and the toolbar that stays under it. */
  const stickTop = () => {
    const t = $('.reader-tools');
    // full screen: only the Noor-e-Quran heading, while it is shown
    if (FS) { const h = $('#fsHead'); return document.body.classList.contains('fs-head') && h ? h.offsetHeight : 0; }
    return $('#bar').offsetHeight + (t && t.offsetHeight ? t.offsetHeight : 0);
  };
  function scrollToAyah(el, smooth = true) {
    let top = el;
    while (top.previousElementSibling && /page-mark|juz-mark|ruku-mark/.test(top.previousElementSibling.className)) top = top.previousElementSibling;
    const y = top.getBoundingClientRect().top + window.scrollY - (stickTop() + 8);
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
  }

  function highlight() {
    $$('.playing').forEach(e => e.classList.remove('playing'));
    const el = document.getElementById(`a-${P.s}-${P.n}`);
    if (el) {
      el.classList.add('playing');
      // Bismillah + ayah 1 play under the surah heading; scrolling starts with ayah 2 (the 3rd audio).
      const still = P.n < 2 && !FS;
      // full screen: every ayah that starts playing comes to the top of the screen (even while auto scroll runs,
      // which carries on from there); outside full screen, as set in Settings › Auto scroll
      if (!document.hidden && !still && (FS || (S.autoScroll && !AS.on))) {
        scrollToAyah(el, !FS || !AS.on);
        if (AS.on) setTimeout(() => { AS.pos = window.scrollY; AS.last = 0; }, 30);
      }
      return;
    }
    // Follow the recitation into the next surah / sipara when the reader is open.
    if (!S.autoScroll || !route) return;
    if (route.name === 'surah' && route.s !== P.s) go(`#/s/${P.s}?a=${P.n}&f=1`, true);
    else if (route.name === 'juz' && juzOf(P.s, P.n) !== route.j) go(`#/j/${juzOf(P.s, P.n)}?a=${P.s}:${P.n}&f=1`, true);
  }

  const SLEEP_CHOICES = [[0, 'Off'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [25, '25 min'], [30, '30 min'], ['end', 'End of surah']];
  function setSleep(min) {
    clearSleep();
    if (min === 'end') { P.sleepEnd = true; toast('Will stop at the end of the surah'); drawSleepBtn(); return; }
    min = Number(min);
    if (!min) { toast('Sleep timer off'); drawSleepBtn(); return; }
    P.sleepAt = Date.now() + min * 60000;
    sleepTimer = setTimeout(() => { clearSleep(); stopPlayer('Sleep timer: audio stopped'); drawSleepBtn(); }, min * 60000);
    toast(`Will stop in ${mmss(min * 60000)}`);
    drawSleepBtn();
  }
  /** The moon button counts the time left down, second by second, while a sleep timer runs. */
  let sleepTick = null;
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  function drawSleepBtn() {
    clearInterval(sleepTick);
    const paint = () => {
      const b = $('#slBtn');
      if (!b) return;
      const on = !!(P.sleepAt || P.sleepEnd);
      b.classList.toggle('on', on);
      b.classList.toggle('timer', !!P.sleepAt);
      b.innerHTML = P.sleepAt ? `<span class="tm">${mmss(P.sleepAt - Date.now())}</span>` : ICON.moon;
    };
    paint();
    if (P.sleepAt) sleepTick = setInterval(paint, 1000);
  }
  function openSleepSheet() {
    const left = P.sleepAt ? mmss(P.sleepAt - Date.now()) : '';
    openSheet(`
      <h3>Sleep timer</h3>
      <div class="sub">${left ? `Audio stops in ${left}` : P.sleepEnd ? 'Audio stops at the end of the surah' : 'Stop the recitation after'}</div>
      ${chips('sleep', SLEEP_CHOICES, P.sleepEnd ? 'end' : '')}
      <div class="sec">Custom time</div>
      <div class="custom-time">
        <label><input type="number" id="ctMin" inputmode="numeric" min="0" max="300" placeholder="0"><span>min</span></label>
        <label><input type="number" id="ctSec" inputmode="numeric" min="0" max="59" placeholder="0"><span>sec</span></label>
        <button class="btn" id="ctGo">Start</button>
      </div>`, sh => {
      bindChips(sh, 'sleep', v => { setSleep(v); drawPlayer(); closeSheet(); });
      $('#ctGo', sh).onclick = () => {
        const m = Math.max(0, Number($('#ctMin', sh).value) || 0), s = Math.max(0, Math.min(59, Number($('#ctSec', sh).value) || 0));
        if (!m && !s) { toast('Type minutes or seconds'); return; }
        setSleep(m + s / 60); drawPlayer(); closeSheet();
      };
    });
  }
  function clearSleep() {
    clearTimeout(sleepTimer); sleepTimer = null; P.sleepAt = 0; P.sleepEnd = false;
  }

  /**
   * The player is one capsule with the play button first. It opens out of that button, and 2 s after the
   * recitation starts it folds back into it, so it never covers the ayahs; the folded button's gold ring follows
   * the ayah's audio and it moves while it plays. A tap opens it again, and it folds once more 3 s after the
   * last touch on it.
   */
  let miniTimer = 0;
  function setMini(v) {
    clearTimeout(miniTimer); miniTimer = 0;
    P.mini = !!(v && P.s);
    $('#player').classList.toggle('mini', P.mini);
    document.body.classList.toggle('pl-mini', P.mini);
  }
  function autoMini(ms = 2000) {
    clearTimeout(miniTimer); miniTimer = 0;
    if (P.s && P.playing && !P.mini) miniTimer = setTimeout(() => setMini(true), ms);
  }
  $('#player').addEventListener('pointerdown', () => { if (miniTimer) autoMini(3000); });

  function drawPlayer() {
    const el = $('#player');
    const on = !!P.s, opening = on && el.hidden;
    const fp = $('#fsHeadPlay');
    if (fp) fp.innerHTML = P.playing ? ICON.pause : ICON.play;
    el.hidden = !on;
    document.body.classList.toggle('has-player', on);
    mediaSync();
    if (!on) { setMini(false); return; }
    if (opening) {
      // the play button comes first, then the capsule slides out of it
      setMini(true);
      el.classList.add('pop');
      setTimeout(() => { el.classList.remove('pop'); setMini(false); autoMini(); }, 450);
    } else if (!P.playing) { clearTimeout(miniTimer); miniTimer = 0; } else if (!miniTimer && !P.mini) autoMini();
    el.classList.toggle('on-air', !!P.playing);
    const m = sm(P.s);
    const bits = [];
    if (Number(S.repeatEach) !== 1) bits.push('Each ' + repLabel(S.repeatEach) + 'x');
    if (P.range) bits.push(`${P.range.from}–${P.range.to}`);
    if (P.sleepAt || P.sleepEnd) bits.push('Sleep');
    const sub = [P.phase === 'bism' ? 'Bismillah' : 'Ayah ' + P.n, ...bits].join(' · ');
    const rTag = Number(S.repeatEach) !== 1 ? repLabel(S.repeatEach) : (P.range ? '↻' : '');
    el.innerHTML = `
      <i class="pl-cm"></i><i class="pl-cm bt"></i>
      <div class="pl-row">
        <span class="pl-ring"><button class="pl-btn pl-main" id="plPlay" aria-label="Play"><span class="ic">${P.playing ? ICON.pause : ICON.play}</span><span class="fx"><i></i><i></i><i></i><i></i></span></button></span>
        <button class="pl-info" id="plInfo"><div class="t">${esc(m.en)}</div><div class="d">${esc(sub)}</div></button>
        <button class="pl-btn" id="plPrev" aria-label="Previous ayah">${ICON.prev}</button>
        <button class="pl-btn" id="plNext" aria-label="Next ayah">${ICON.next}</button>
        <button class="pl-btn" id="plRep" aria-label="Repeat">${ICON.repeat}${rTag ? `<span class="tag">${esc(rTag)}</span>` : ''}</button>
        <button class="pl-btn pl-speed" id="plSpeed">${speedLabel(S.speed)}</button>
        <button class="pl-btn" id="plClose" aria-label="Close">${ICON.close}</button>
      </div>`;
    $('#plPlay').onclick = () => { if (P.mini) { setMini(false); autoMini(3000); } else togglePlay(); };
    $('#plPrev').onclick = () => advance(-1);
    $('#plNext').onclick = () => { P.rep = 0; advance(1); };
    $('#plClose').onclick = closePlayer;
    $('#plRep').onclick = openPlayerSheet;
    $('#plInfo').onclick = () => {
      const el = document.getElementById(`a-${P.s}-${P.n}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else go(`#/s/${P.s}?a=${P.n}`);
    };
    $('#plSpeed').onclick = () => {
      const i = SPEEDS.indexOf(S.speed);
      setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
      toast('Speed ' + speedLabel(S.speed));
    };
  }

  function setSpeed(v) {
    S.speed = Number(v);
    for (const el of [audio, spare]) { el.playbackRate = S.speed; el.defaultPlaybackRate = S.speed; }
    saveSettings(); drawPlayer();
  }

  function openPlayerSheet() {
    const cnt = P.s ? sm(P.s).a : 1;
    const r = P.range || { from: P.n || 1, to: Math.min(cnt, (P.n || 1) + 4), times: 3 };
    const left = P.sleepAt ? Math.max(1, Math.round((P.sleepAt - Date.now()) / 60000)) : 0;
    openSheet(`
      <h3>Audio settings</h3>
      <div class="sub">${P.s ? esc(sm(P.s).en) + ' · ' : ''}Qari: Mutazz Aghaei (Tahdir)</div>
      <div class="sec">Repeat each ayah</div>
      ${chips('rep', REPEATS.map(v => [v, v === 0 ? '∞ Loop' : v + 'x']), S.repeatEach)}
      <div class="sec">Repeat a range of ayahs</div>
      <div class="s-card"><div class="s-row"><div class="main">
        <div class="stepper"><span>Ayah</span><input type="number" id="rFrom" min="1" max="${cnt}" value="${r.from}"><span>to</span><input type="number" id="rTo" min="1" max="${cnt}" value="${r.to}"></div>
        <div style="margin-top:10px">${chips('rtimes', [[1, '1x'], [2, '2x'], [3, '3x'], [5, '5x'], [10, '10x'], [0, '∞']], r.times)}</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn" id="rStart">${ICON.repeat} Start repeat</button>
          ${P.range ? '<button class="btn ghost" id="rStop">Stop repeat</button>' : ''}
        </div></div></div></div>
      <div class="sec">Speed</div>
      ${chips('speed', SPEEDS.map(v => [v, speedLabel(v)]), S.speed)}
      <div class="sec">Sleep timer ${left ? `· ${left} min left` : P.sleepEnd ? '· end of surah' : ''}</div>
      ${chips('sleep', SLEEP_CHOICES, P.sleepEnd ? 'end' : '')}
      <div class="sec">More</div>
      <div class="s-card">
        <div class="s-row"><div class="main"><div class="t">Auto scroll</div><div class="d">Page follows the ayah being recited</div></div>${sw('oAuto', S.autoScroll)}</div>
        <div class="s-row"><div class="main"><div class="t">Continue to next surah</div></div>${sw('oNext', S.contNext)}</div>
      </div>`, sh => {
      bindChips(sh, 'rep', v => { S.repeatEach = Number(v); P.rep = 0; saveSettings(); drawPlayer(); preloadNext(); });
      let rTimes = r.times;
      bindChips(sh, 'rtimes', v => { rTimes = Number(v); });
      bindChips(sh, 'speed', setSpeed);
      bindChips(sh, 'sleep', v => { setSleep(v); drawPlayer(); });
      $('#rStart', sh).onclick = () => {
        const s = P.s || (route && route.s) || 1;
        const max = sm(s).a;
        let from = Math.max(1, Math.min(max, Number($('#rFrom', sh).value) || 1));
        let to = Math.max(1, Math.min(max, Number($('#rTo', sh).value) || from));
        if (to < from) [from, to] = [to, from];
        P.range = { s, from, to, times: rTimes };
        P.rangeRep = 0;
        closeSheet();
        playAyah(s, from, true);
        toast(`Ayah ${from}–${to}, ${repLabel(rTimes)} times`);
      };
      const stop = $('#rStop', sh);
      if (stop) stop.onclick = () => { P.range = null; closeSheet(); drawPlayer(); };
      $('#oAuto', sh).onchange = e => { S.autoScroll = e.target.checked; saveSettings(); };
      $('#oNext', sh).onchange = e => { S.contNext = e.target.checked; saveSettings(); };
    });
  }

  // ---------------------------------------------------------------- router
  let route = null;
  function go(hash, replace) {
    if (replace) location.replace(hash); else location.hash = hash;
  }
  function parse() {
    const h = location.hash.slice(1) || '/';
    const [path, qs] = h.split('?');
    const q = new URLSearchParams(qs || '');
    const p = path.split('/').filter(Boolean);
    if (p[0] === 's') return { name: 'surah', s: Math.max(1, Math.min(114, Number(p[1]) || 1)), q };
    if (p[0] === 'j') return { name: 'juz', j: Math.max(1, Math.min(30, Number(p[1]) || 1)), q };
    if (p[0] === 'search') return { name: 'search', q };
    if (p[0] === 'saved') return { name: 'saved', q };
    if (p[0] === 'settings') return { name: 'settings', q };
    if (p[0] === 'isal') return { name: 'isal', q };
    if (p[0] === 'duas') return { name: 'duas', q };
    if (p[0] === 'words') return { name: 'words', q };
    if (p[0] === 'root' && p[1]) return { name: 'root', r: decodeURIComponent(p[1]), q };
    if (p[0] === 'topic') return { name: 'topic', t: Math.max(0, Math.min(TOPICS.length - 1, Number(p[1]) || 0)), q };
    return { name: 'home', q };
  }
  function render() {
    if (!META) return; // the first render comes once meta.json is in
    closeSheet();
    if (AS.on) asStop();
    setFs(false);
    hideJuzBar(true);
    const was = route;
    route = parse();
    // a new reading starts the clock for "Bookmark karvu che?" (not when the recitation moves on to the next surah)
    if ((route.name === 'surah' || route.name === 'juz') && !(was && was.name === route.name && route.q.get('f'))) { readerSince = Date.now(); askedLeave = false; }
    view.classList.remove('fade-in'); void view.offsetWidth; view.classList.add('fade-in');
    window.onscroll = null;
    ({ home: renderHome, surah: renderSurah, juz: renderJuz, search: renderSearch, saved: renderSaved, settings: renderSettings, isal: renderIsal, duas: renderDuas, topic: renderTopic, words: renderWords, root: renderRoot })[route.name]();
  }
  window.addEventListener('hashchange', render);

  // ---------------------------------------------------------------- home
  let homeTab = load('qm.homeTab', 's');
  if (homeTab === 'sj') homeTab = 'f'; // the Sajdah tab became Favorite (v8.1)
  /** Favourite surahs (Home › Favorite): surah numbers, newest first. */
  let FAV = load('qm.fav', []);
  const isFav = s => FAV.includes(s);
  function toggleFav(s) {
    FAV = isFav(s) ? FAV.filter(x => x !== s) : [s, ...FAV];
    store('qm.fav', FAV);
    toast(isFav(s) ? L(`${sm(s).en} Favorite માં ઉમેરાઈ`, `${sm(s).en} added to Favorite`) : L(`${sm(s).en} Favorite માંથી કાઢી`, `${sm(s).en} removed from Favorite`));
  }
  const favBtn = s => `<button class="fav-b ${isFav(s) ? 'on' : ''}" data-fav="${s}" aria-label="Favorite">${ICON.heart}</button>`;
  function renderHome() {
    setBar({ title: 'Noor-e-Quran', sub: L('with Gujarati Translation & Tafseer', 'with English Translation & Tafseer'), tabs: 'home', icon: ICON.quran3d,
      actions: `<a class="icon-btn" href="#/search" aria-label="Search">${ICON.search}</a>` });
    const last = load('qm.last', null);
    view.innerHTML = `
      <div class="hero">
        <div class="bism">${BISM[0].replace(/ۡ/g, 'ْ').replace(/ہ/g, 'ه')}</div>
        <div class="hello">Read, understand and listen to the Quran</div>
        ${last ? `<a class="continue" href="#/s/${last.s}?a=${last.n}">
          <span class="ic">${ICON.book}</span>
          <div class="main"><div class="k">CONTINUE READING</div><div class="v">${esc(sm(last.s).en)} · Ayah ${last.n}</div></div>
          ${ICON.chev}</a>` : `<a class="continue" href="#/s/1">
          <span class="ic">${ICON.book}</span>
          <div class="main"><div class="k">START READING</div><div class="v">Al-Fatihah</div></div>${ICON.chev}</a>`}
      </div>
      ${S.feat.khatam && S.feat.words ? `<div class="home-pair">${khatamCardHtml(true)}
        <a class="kh-card half lx-card" href="#/words">
          <div class="hc-top"><span class="kh-ic lx-ic"><bdi>ع</bdi></span><div><b class="hc-t">Quran Words</b><span class="hc-v">Top 300 · Roots</span></div></div>
          <span class="hc-s">${L('શબ્દો શીખો · મૂળથી શોધો', 'Learn words · Find by root')}</span></a></div>`
        : S.feat.khatam ? khatamCardHtml() : S.feat.words ? `<a class="kh-card lx-card" href="#/words">
        <span class="kh-ic lx-ic"><bdi>ع</bdi></span>
        <div class="main"><div class="kh-l"><b>Quran Words</b><span>Top 300 · Roots</span></div>
          <div class="kh-l sm"><span>${L('વધારે આવતા શબ્દો શીખો · મૂળથી શોધો', 'Learn the most frequent words · Find by root')}</span></div></div>${ICON.chev}</a>` : ''}
      <div class="col-strip"><span class="col-h">${ICON.bm}<b>My Collections</b></span>
        ${TABS.map(t => `<button class="col-chip" data-col="${t.id}" style="--c:${TAB_COLORS[t.c % TAB_COLORS.length]}">${esc(t.name)}<small>${BM.filter(b => b.t === t.id).length}</small></button>`).join('')}
        <button class="col-chip add" data-col="+">${ICON.plus}New</button></div>
      <div class="home-seg">${seg('ht', [['s', 'Surah'], ['j', 'Sipara'], ['f', 'Favorite'], ['m', 'Mash\'hur']].concat(S.feat.topics ? [['v', 'Subject']] : []), homeTab)}</div>
      <div class="list" id="homeList"></div>`;
    $('[data-seg="ht"]').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      homeTab = b.dataset.v; store('qm.homeTab', homeTab);
      $$('[data-seg="ht"] button').forEach(x => x.classList.toggle('on', x === b));
      drawHomeList();
    };
    const kc = $('#khCard');
    if (kc) kc.onclick = openKhatamSheet;
    $$('[data-col]').forEach(b => b.onclick = () => {
      const open = id => { bmTab = id; store('qm.bmTab', id); closeSheet(); go('#/saved'); };
      if (b.dataset.col === '+') newTabPrompt(open); else open(b.dataset.col);
    });
    drawHomeList();
  }

  // well-known ayahs: [Gujarati name, Arabic name, surah, first ayah, last ayah]
  const FAMOUS = [
    ['આયતુલ કુર્સી', 'آيَةُ الْكُرْسِيّ', 2, 255, 257],
    ['આયએ બલ્લિગ (તબ્લીગ)', 'آيَةُ التَّبْلِيغ', 5, 67, 67],
    ['આયએ શહાદત', 'آيَةُ الشَّهَادَة', 3, 18, 18],
    ['આયએ મુલ્ક', 'آيَةُ الْمُلْك', 3, 26, 27],
    ['આયએ તત્હીર', 'آيَةُ التَّطْهِير', 33, 33, 33],
    ['આયએ વિલાયત', 'آيَةُ الْوِلَايَة', 5, 55, 55],
    ['આયએ ઇકમાલે દીન', 'آيَةُ إِكْمَالِ الدِّين', 5, 3, 3],
    ['આયએ મુબાહેલા', 'آيَةُ الْمُبَاهَلَة', 3, 61, 61],
    ['આયએ મવદ્દત', 'آيَةُ الْمَوَدَّة', 42, 23, 23],
    ['આયએ ઉલિલ અમ્ર', 'آيَةُ أُولِي الْأَمْر', 4, 59, 59],
    ['આયએ ઇજાબતે દુઆ (અમ્મંય્ યુજીબુ)', 'آيَةُ إِجَابَةِ الدُّعَاء', 27, 62, 62]
  ];

  function drawHomeList() {
    const box = $('#homeList');
    if (homeTab === 'v' && !S.feat.topics) homeTab = 's';
    if (homeTab === 'v') {
      box.innerHTML = TOPICS.map(([gu, ar, refs], i) => `
        <a class="row" href="#/topic/${i}">
          <span class="star">${ICON.star}<b>${i + 1}</b></span>
          <div class="main"><div class="t fam-t">${esc(nameL(gu))}</div>
            <div class="d">${refs.length} Ayat</div></div>
          <span class="ar sm">${esc(ar)}</span></a>`).join('');
    } else if (homeTab === 'm') {
      box.innerHTML = FAMOUS.map(([gu, ar, s, a, b], i) => `
        <a class="row" href="${onlyLink(s, a, b, nameL(gu), ar)}">
          <span class="star">${ICON.star}<b>${i + 1}</b></span>
          <div class="main"><div class="t fam-t">${esc(nameL(gu))}</div>
            <div class="d">${esc(EN() ? sm(s).en : sm(s).gu)} <span class="dot"></span>${s}:${a}${b > a ? '–' + b : ''}</div></div>
          <span class="ar sm">${esc(ar)}</span></a>`).join('');
    } else if (homeTab === 'j') {
      box.innerHTML = META.juz.map(z => `
        <a class="row" href="#/j/${z.n}">
          <span class="star">${ICON.star}<b>${z.n}</b></span>
          <div class="main"><div class="t">Sipara ${z.n}</div>
            <div class="d">From ${esc(sm(z.s).en)}</div>
            <div class="d">Ayah ${z.a} <span class="dot"></span>Page ${z.p}</div></div>
          <span class="ar sm">${esc(z.name)}</span></a>`).join('');
    } else if (homeTab === 'f') {
      // favourite surahs: the ♡ on any surah in the Surah list puts it here
      box.innerHTML = FAV.length ? FAV.map(n => surahRow(sm(n))).join('')
        : `<div class="empty fav-empty">${ICON.heart}<div><b>${L('હજી કોઈ Favorite સૂરહ નથી', 'No favourite surahs yet')}</b></div>
            <div style="margin-top:6px;font-size:13.5px">${L(`Surah યાદીમાં કોઈ પણ સૂરહની બાજુનું ${ICON.heart} દબાવો — તે અહીં આવી જશે.`, `Press the ${ICON.heart} next to any surah in the Surah list and it comes here.`)}</div></div>`;
    } else {
      box.innerHTML = META.surahs.map(surahRow).join('');
    }
    box.onclick = e => {
      const b = e.target.closest('[data-fav]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      toggleFav(Number(b.dataset.fav));
      if (homeTab === 'f') drawHomeList(); else b.classList.toggle('on', isFav(Number(b.dataset.fav)));
    };
  }
  const surahRow = m => `
        <a class="row" href="#/s/${m.n}">
          <span class="lead"><span class="star">${ICON.star}<b>${m.n}</b></span>${favBtn(m.n)}</span>
          <div class="main"><div class="t">${esc(m.en)}</div>
            <div class="d">${EN() ? (m.m ? 'Meccan' : 'Medinan') : `${esc(m.gu)} – ${m.m ? 'મક્કી' : 'મદની'}`}</div>
            <div class="d">${m.a} Ayahs${m.intro && !EN() ? ' <span class="badge">Fazilat</span>' : ''}</div></div>
          <span class="ar">${esc(m.ar)}</span>${HAS_AUDIO ? '' : dlBtnHtml(m.n)}</a>`;

  // ---------------------------------------------------------------- reader
  /**
   * Rukus (data/ruku.json, from Tanzil: the first ayah of each). Like the ع in a printed Mushaf's margin,
   * the last ayah of each ruku carries: its ruku number in the surah, how many ayahs it has, and its
   * ruku number in the sipara where it ends.
   */
  let RUKU_END = {};
  function setRukus(list) {
    RUKU_END = {};
    const perJuz = {};
    list.forEach(([s, a], i) => {
      const next = list[i + 1];
      const lastA = next && next[0] === s ? next[1] - 1 : sm(s).a;
      const sr = list.slice(0, i + 1).filter(x => x[0] === s).length;
      const j = juzOf(s, lastA);
      perJuz[j] = (perJuz[j] || 0) + 1;
      RUKU_END[`${s}:${lastA}`] = { sr, n: lastA - a + 1, jr: perJuz[j] };
    });
  }
  /** Page, sipara and ruku marks: a gold light runs round their border a few times each time one comes on screen. */
  const markIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('glint', e.isIntersecting)), { rootMargin: '0px 0px -10% 0px' });
  new MutationObserver(() => $$('#view .page-mark span:not(.io), #view .juz-mark:not(.io), #view .rk-ain:not(.io)')
    .forEach(el => { el.classList.add('io'); markIO.observe(el); })).observe($('#view'), { childList: true, subtree: true });
  const rukuHtml = (s, n) => {
    const r = RUKU_END[`${s}:${n}`];
    return r ? `<div class="ruku-mark"><span class="rk-l">Ruku ${r.sr}<small>${L('સૂરહમાં', 'in surah')}</small></span>
      <span class="rk-c"><span class="rk-ain"><b>ع</b></span><i>${r.n} ${L('આયત', 'ayahs')}</i></span><span class="rk-r">Ruku ${r.jr}<small>${L(`સિપારા ${juzOf(s, n)} માં`, `in Sipara ${juzOf(s, n)}`)}</small></span></div>` : '';
  };

  /** Ayahs from..to of one surah, with a "Page N" line wherever a new Mushaf page begins. */
  function withPages(s, d, from, to) {
    let html = '', prev = 0;
    for (let n = from; n <= to; n++) {
      const z = META.juz.find(x => x.s === s && x.a === n);
      if (z) html += `<div class="juz-mark"><span class="jm-n">${z.n}</span><div><b>Sipara ${z.n} starts here</b><bdi>${esc(z.name)}</bdi></div></div>`;
      const pg = d.pg ? d.pg[n - 1] : 0;
      if (pg && pg !== prev) html += `<div class="page-mark"><span>Page ${pg}</span></div>`;
      prev = pg;
      html += ayahHtml(s, n, d.ayahs[n - 1], pg) + rukuHtml(s, n);
    }
    return html;
  }

  const PLAY_LABEL = 'Play';
  /** When the reader stays on an ayah for a moment, a shine runs over its play button so it is noticed. */
  let dwellT = 0;
  const dwell = () => {
    clearTimeout(dwellT);
    dwellT = setTimeout(() => {
      const y = innerHeight / 2;
      const el = [...$$('#view .ayah')].find(a => { const r = a.getBoundingClientRect(); return r.top < y && r.bottom > y; });
      $$('.ayah-top .shine').forEach(b => b.classList.remove('shine'));
      const b = el && !el.classList.contains('playing') && $('[data-act="play"]', el);
      if (b) { void b.offsetWidth; b.classList.add('shine'); }
    }, 1800);
  };
  addEventListener('scroll', dwell, { passive: true });
  addEventListener('hashchange', dwell);

  function ayahHtml(s, n, a, pg) {
    const text = a[arFont().script] || a[0];
    const bms = bmsOf(s, n);
    const sj = a[4] || 0;
    return `<article class="ayah ${sj === 1 ? 'sajda-wajib' : sj === 2 ? 'sajda-mustahab' : ''}${bms.length ? ' bmk' : ''}" id="a-${s}-${n}" data-s="${s}" data-n="${n}" data-pg="${pg || ''}">
      ${sajdaHtml(sj)}
      <div class="ayah-top">
        <span class="ayah-no">${s}:${n}</span>
        <span class="sp"></span>
        <button class="mini" data-act="play" aria-label="Play">${ICON.playO}<span>${PLAY_LABEL}</span></button>
        <button class="mini ${bms.length ? 'on' : ''}" data-act="bm" aria-label="Bookmark" ${bms.length ? `style="color:${tabColor(bms[0].t)}"` : ''}>${ICON.bm}</button>
        <button class="mini" data-act="more" aria-label="More">${ICON.more}</button>
      </div>
      ${n === 1 && s !== 1 && s !== 9 ? `<div class="ayah-bism">${esc(arT(BISM[arFont().script]))}</div>` : ''}
      <div class="ar-text">${esc(arT(text))}<span class="aya-end"><b>${an(n)}</b></span></div>
      ${a[3] ? `<div class="tr-text">${esc(a[3])}</div>` : ''}
      <div class="gu-text">${esc(a[2])}</div>
      ${noteHtml(s, n)}
      <div class="ayah-tools">
        <button data-act="hifz" class="hz-only">${ICON.mic} ${L('યાદ તપાસો', 'Check memory')}</button>
        <button data-act="tafs">${ICON.note} Tafseer</button>
        <button data-act="wbw">${ICON.words} Word by word</button>
        <button data-act="gc" class="${S.gramColor ? 'on' : ''}">${ICON.paint} Grammar</button>
      </div>
    </article>`;
  }

  function surahHeadHtml(m) {
    return `<div class="surah-head">
      <div class="ar">${esc(m.ar)}</div>
      <div class="gu">${esc(m.en)}${EN() ? '' : ` <span style="opacity:.75;font-weight:400">· ${esc(m.gu)}</span>`}</div>
      <div class="meta">${m.m ? 'Meccan' : 'Medinan'} <span class="dot"></span>${m.a} Ayahs <span class="dot"></span>Sipara ${m.j}</div>
    </div>`;
  }

  function introHtml(d) {
    if (!d.intro || !d.intro.length) return '';
    return `<details class="intro"><summary>${ICON.note} Fazilat & Tafseer (Gujarati) ${ICON.chev}</summary>
      <div class="body">${d.intro.map(x => x.ar
        ? `<div class="ar">${esc(arT(x.ar))}</div>${x.gu ? `<div>${esc(x.gu)}</div>` : ''}`
        : `<div>${esc(x.t)}</div>`).join('<br>')}</div></details>`;
  }

  // stays under the bar while the ayahs scroll; each icon in a green round with gold
  const HZ_MODES = () => [['word', L('શબ્દ', 'Word')], ['line', L('લાઇન', 'Line')], ['ayah', L('આખી આયત', 'Whole ayah')]];
  const togglesHtml = () => `<div class="reader-tools"><div class="view-toggles">
    <button class="vt ${S.showTr ? 'on' : ''}" data-vt="tr" aria-label="Transliteration"><span class="vi"><i>Aa</i></span>Translit</button>
    <button class="vt ${S.showGu ? 'on' : ''}" data-vt="gu" aria-label="Translation"><span class="vi"><i>${L('ગુ', 'En')}</i></span>Translation</button>
    <button class="vt ${S.gramColor ? 'on' : ''}" data-vt="gc" aria-label="Grammar"><span class="vi">${ICON.paint}</span>Grammar</button>
    ${S.feat.hifz ? `<button class="vt ${S.hifz ? 'on' : ''}" data-vt="hz" aria-label="Hifz"><span class="vi">${ICON.mic}</span>Hifz</button>` : ''}</div>
    <div class="gc-legend" ${S.gramColor ? '' : 'hidden'}><span class="gc-fel">${L('ફેલ', 'Fe\'l')}</span><span class="gc-baab">${L('બાબ', 'Baab')}</span><span class="gc-rule">${L('નિયમ', 'Rule')}</span><small>${L('શબ્દ પર ટચ કરો', 'Tap a word')}</small></div>
    <div class="hz-modes" ${S.hifz && S.feat.hifz ? '' : 'hidden'}><span>${L('ટચ કરો તો ખુલે:', 'Tap to show:')}</span>${HZ_MODES().map(([k, l]) =>
      `<button data-hzm="${k}" class="${(S.hzMode || 'ayah') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;

  // ---------------------------------------------------------------- grammar colours on the Arabic text
  const GC_RANK = { 'gc-fel': 1, 'gc-baab': 2, 'gc-rule': 3 };
  /** The colour of one word: i'lal rule › derived baab › verb. */
  function gramClass(link) {
    let best = '';
    if (!link || link.p === 'pre') return best;
    for (const segs of link.w) {
      const m = segs.find(x => x.k === 'x');
      if (!m) continue;
      let c = '';
      const d = m.r && window.Sarf ? window.Sarf.derive(m, segs) : null;
      if (d && d.steps) c = 'gc-rule';
      else if (/^(II|III|IV|V|VI|VII|VIII|IX|X)$/.test(m.b || '')) c = 'gc-baab';
      else if (m.t === 'V') c = 'gc-fel';
      if (c && (!best || GC_RANK[c] > GC_RANK[best])) best = c;
    }
    return best;
  }
  // same words as the word-by-word view: tokens with an Arabic letter in them (not the waqf signs)
  const isWordTok = t => /[ء-يٱیکہۃۀےۓڪ]/.test(t);

  async function colorAyah(el) {
    const box = $('.ar-text', el);
    if (!box || box.dataset.gc) return;
    const s = Number(el.dataset.s), n = Number(el.dataset.n);
    const a = (await loadSurah(s)).ayahs[n - 1];
    if ((a[arFont().script] || a[0]) !== a[0]) return; // the links follow the Indo-Pak text
    const g = await loadGram(s);
    const links = g[n - 1] || [];
    let i = 0;
    const html = a[0].split(' ').map(t => {
      if (!isWordTok(t)) return esc(arT(t));
      const k = i++, c = gramClass(links[k]);
      return c ? `<span class="${c}" data-gi="${k}">${esc(arT(t))}</span>` : esc(arT(t));
    }).join(' ');
    if (!S.gramColor || box.dataset.gc) return;
    box.dataset.plain = box.innerHTML;
    box.dataset.gc = '1';
    const end = $('.aya-end', box);
    box.innerHTML = html;
    if (end) box.appendChild(end);
  }
  function uncolorAyah(el) {
    const box = $('.ar-text', el);
    if (!box || !box.dataset.gc) return;
    box.innerHTML = box.dataset.plain;
    delete box.dataset.gc;
  }
  // colour the ayahs as they come near the screen, so long surahs stay quick
  let gcObs = null;
  function applyGramColors() {
    if (gcObs) { gcObs.disconnect(); gcObs = null; }
    const leg = $('.gc-legend');
    if (leg) leg.hidden = !S.gramColor;
    if (!S.gramColor) { $$('.ayah').forEach(uncolorAyah); return; }
    gcObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { colorAyah(e.target); gcObs.unobserve(e.target); } }), { rootMargin: '800px 0px' });
    $$('.ayah').forEach(el => gcObs.observe(el));
  }
  view.addEventListener('click', async e => {
    const w = e.target.closest('.ar-text [data-gi]');
    if (!w) return;
    const card = w.closest('.ayah');
    const s = Number(card.dataset.s), n = Number(card.dataset.n), i = Number(w.dataset.gi);
    const wb = (await loadWbw(s))[n - 1] || [];
    const [ar, gu] = wb[i] || [w.textContent, ''];
    // English mode: the word's English from data/en, not the Gujarati word-by-word
    const hint = EN() ? (((await loadEn(s)).w[n - 1] || [])[i] || '') : gu;
    openAnalysis(ar, hint, null, { s, n, i });
  });

  function readerActions() {
    return `<button class="icon-btn bar-aa" id="aaBtn" aria-label="Font">Aa</button>
      <button class="icon-btn" id="asBtn" aria-label="Auto scroll">${ICON.scroll}</button>
      <button class="icon-btn ${P.sleepAt || P.sleepEnd ? 'on' : ''}" id="slBtn" aria-label="Sleep timer">${ICON.moon}</button>
      <button class="icon-btn" id="fsBtn" aria-label="Full screen">${ICON.expand}</button>
      <a class="icon-btn" href="#/search" aria-label="Search">${ICON.search}</a>`;
  }

  // ---------------------------------------------------------------- auto scroll (like Noor Quraan): the page moves by itself
  const AS = { on: false, paused: false, raf: 0, pos: 0, last: 0, hold: 0 };
  const AS_SPEEDS = [8, 14, 20, 28, 38, 50, 65, 85, 110, 140]; // px per second, 1 = slowest … 10 = fastest
  if (!S.asSpeed) S.asSpeed = 3;

  function asStep(t) {
    if (!AS.on) return;
    if (!AS.paused && !AS.hold) {
      const dt = AS.last ? Math.min(100, t - AS.last) : 0;
      AS.pos += AS_SPEEDS[S.asSpeed - 1] * dt / 1000;
      if (Math.abs(AS.pos - window.scrollY) > 40) AS.pos = window.scrollY; // the reader moved the page by hand
      window.scrollTo(0, AS.pos);
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) { asStop(); toast('Auto scroll finished'); return; }
    }
    AS.last = t;
    AS.raf = requestAnimationFrame(asStep);
  }
  function asStart() {
    AS.on = true; AS.paused = false; AS.pos = window.scrollY; AS.last = 0;
    N.keepScreenOn(true);
    cancelAnimationFrame(AS.raf);
    AS.raf = requestAnimationFrame(asStep);
    drawAsPanel();
  }
  function asStop() {
    AS.on = false;
    cancelAnimationFrame(AS.raf);
    N.keepScreenOn(!!S.keepOn);
    drawAsPanel();
  }
  function drawAsPanel() {
    const p = $('#asPanel');
    p.hidden = !AS.on;
    document.body.classList.toggle('has-as', AS.on);
    const btn = $('#asBtn');
    if (btn) btn.classList.toggle('on', AS.on);
    if (FS) drawFsCtl();
    if (!AS.on) return;
    p.innerHTML = `
      <button class="as-b" id="asPlay" aria-label="Pause">${AS.paused ? ICON.play : ICON.pause}</button>
      <span class="as-l">Slow</span>
      <button class="as-b" id="asMinus" aria-label="Slower">−</button>
      <input type="range" id="asRange" min="1" max="10" step="1" value="${S.asSpeed}">
      <button class="as-b" id="asPlus" aria-label="Faster">+</button>
      <span class="as-l">Fast</span>
      <b class="as-v">${S.asSpeed}</b>
      <button class="as-b" id="asClose" aria-label="Stop">${ICON.close}</button>`;
    const set = v => { S.asSpeed = Math.max(1, Math.min(10, v)); saveSettings(); $('#asRange').value = S.asSpeed; $('.as-v', p).textContent = S.asSpeed; };
    $('#asRange').oninput = e => set(Number(e.target.value));
    $('#asMinus').onclick = () => set(S.asSpeed - 1);
    $('#asPlus').onclick = () => set(S.asSpeed + 1);
    $('#asPlay').onclick = () => { AS.paused = !AS.paused; AS.pos = window.scrollY; AS.last = 0; drawAsPanel(); };
    $('#asClose').onclick = asStop;
  }
  // ---------------------------------------------------------------- full screen: only the Quran text (in the languages switched on)
  // with two buttons left, one to leave full screen and one for auto scroll
  let FS = false;
  function setFs(on) {
    if (FS === on) return;
    // keep the ayah being read in the same place while the bars come and go
    const f = firstVisibleAyah(), el = f && document.getElementById(`a-${f[0]}-${f[1]}`);
    const top = el ? el.getBoundingClientRect().top : 0;
    FS = on;
    document.body.classList.toggle('fs', on);
    document.body.classList.toggle('fs-ar', on && !!S.fsArOnly);
    if (N.fullScreen) N.fullScreen(on);
    drawFsCtl();
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - top);
  }
  /** Full screen: a tap on the page (not on a grammar word or a button) shows the Noor-e-Quran heading with search; a second tap hides it. */
  function fsHead(show) {
    let h = $('#fsHead');
    if (!FS) show = false;
    if (show && !h) {
      h = document.createElement('header');
      h.id = 'fsHead';
      h.className = 'bar';
      h.innerHTML = `<div class="bar-titles branded"><div class="bar-title brand">${ICON.quran3d}<span>Noor-e-Quran</span></div>
          <div class="bar-sub">${L('with Gujarati Translation & Tafseer', 'with English Translation & Tafseer')}</div></div>
        <div class="bar-actions"><button class="icon-btn" id="fsHeadPlay" aria-label="Play"></button>
          <a class="icon-btn" href="#/search" aria-label="Search">${ICON.search}</a>
          <button class="icon-btn" id="fsHeadExit" aria-label="Full screen off">${ICON.shrink}</button></div>`;
      document.body.appendChild(h);
      $('#fsHeadExit').onclick = () => setFs(false);
      $('#fsHeadPlay').onclick = fsPlay;
    }
    if (h) $('#fsHeadPlay').innerHTML = P.playing ? ICON.pause : ICON.play;
    document.body.classList.toggle('fs-head', !!show);
    // the ayah being recited stays in sight, just under the heading
    const pl = show && $('#view .ayah.playing');
    if (pl) {
      const r = pl.getBoundingClientRect(), hh = h.offsetHeight + 8;
      if (r.top < hh && r.bottom > 0) window.scrollBy(0, r.top - hh);
    }
  }

  /**
   * Search boxes: a long press on the keyboard's space bar is the keyboard's own (its language menu). The app does
   * nothing with it: no space at the start and no second space in a row, so the text and the results stay as they are.
   */
  document.addEventListener('beforeinput', e => {
    const el = e.target;
    if (!el.matches || !el.matches('input[enterkeyhint="search"]')) return;
    if (!e.data || !/^\s+$/.test(e.data)) return;
    const before = el.value.slice(0, el.selectionStart == null ? el.value.length : el.selectionStart);
    if (!before || /\s$/.test(before)) e.preventDefault();
  });

  /** Full screen: a long press on an ayah offers to play it (the phone's long press fires "contextmenu"). */
  view.addEventListener('contextmenu', e => {
    if (!FS) return;
    const card = e.target.closest('.ayah');
    if (!card) return;
    e.preventDefault();
    const s = Number(card.dataset.s), n = Number(card.dataset.n), only = onlyRange();
    const play = from => { closeSheet(); fsHead(false); if (only) playDua(s, from, only[1]); else playAyah(s, from); };
    openSheet(`<h3>${esc(sm(s).en)} · Ayah ${n}</h3>
      <div class="pick-ayah">
        <button class="btn" id="lpPlay">${ICON.play} ${L('આ આયત play કરો', 'Play this ayah')}</button>
        <button class="btn ghost" id="lpBm">${ICON.bm} ${L('Bookmark કરો', 'Bookmark')}</button>
        <button class="btn ghost" id="lpTafs">${ICON.note} Tafseer</button></div>`, sh => {
      $('#lpPlay', sh).onclick = () => play(n);
      $('#lpBm', sh).onclick = () => openBmSheet(s, n, () => refreshBm(card, s, n));
      $('#lpTafs', sh).onclick = () => openTafseer(s, n);
    });
  });

  /** The ayahs that can be seen on the screen now, top first. */
  function ayahsOnScreen() {
    const top = stickTop(), bottom = innerHeight;
    return [...$$('#view .ayah')].filter(el => {
      const r = el.getBoundingClientRect();
      const seen = Math.min(r.bottom, bottom) - Math.max(r.top, top);
      return seen > Math.min(60, r.height * .4);
    }).map(el => [Number(el.dataset.s), Number(el.dataset.n)]);
  }
  /** Full screen ▶: plays the ayah on the screen; with two or more on the screen it asks which one. */
  function fsPlay() {
    if (P.playing) { togglePlay(); fsHead(true); return; }
    const list = ayahsOnScreen();
    const start = ([s, n]) => {
      closeSheet();
      const only = onlyRange();
      if (only) playDua(s, n, only[1]); else playAyah(s, n);
      fsHead(false);
    };
    if (!list.length) return;
    if (list.length === 1) { start(list[0]); return; }
    openSheet(`<h3>${L('કઈ આયત play કરવી છે?', 'Which ayah to play?')}</h3>
      <div class="sub">${L('સ્ક્રીન પર આ આયતો છે — જ્યાંથી સાંભળવું હોય તે પસંદ કરો', 'These ayahs are on the screen — choose where to start')}</div>
      <div class="pick-ayah">${list.map(([s, n], i) => `<button class="btn ${i ? 'ghost' : ''}" data-pa="${i}">${ICON.play} ${esc(sm(s).en)} · Ayah ${n}</button>`).join('')}</div>`, sh => {
      $$('[data-pa]', sh).forEach(b => b.onclick = () => start(list[Number(b.dataset.pa)]));
    });
  }
  document.addEventListener('click', e => {
    if (!FS || sheetOpen) return;
    if (e.target.closest('button, a, input, textarea, label, #fsHead, #fsCtl, #asPanel, #player, #sheet, .sheet-backdrop, .ar-text [data-gi]')) return;
    // Hifz: a tap on an ayah opens its words, not the heading
    if (document.body.classList.contains('hifz') && e.target.closest('.ayah')) return;
    if (String(getSelection()).length) return;
    fsHead(!document.body.classList.contains('fs-head'));
  });

  function drawFsCtl() {
    let c = $('#fsCtl');
    if (!FS) { if (c) c.remove(); fsHead(false); return; }
    if (!c) { c = document.createElement('div'); c.id = 'fsCtl'; document.body.appendChild(c); }
    c.innerHTML = `<button class="fs-b fs-exit" id="fsExit" aria-label="Full screen off">${ICON.shrink}</button>
      <button class="fs-b fs-gu ${S.fsArOnly ? '' : 'on'}" id="fsGu" aria-label="Translation">${L('ગુ', 'En')}</button>
      <button class="fs-b fs-scroll ${AS.on ? 'on' : ''}" id="fsScroll" aria-label="Auto scroll">${ICON.scroll}</button>`;
    $('#fsExit').onclick = () => setFs(false);
    // Arabic alone, or Arabic with the Gujarati lines (translation / transliteration as set outside full screen)
    $('#fsGu').onclick = () => {
      const f = firstVisibleAyah(), el = f && document.getElementById(`a-${f[0]}-${f[1]}`);
      const top = el ? el.getBoundingClientRect().top : 0;
      S.fsArOnly = !S.fsArOnly; saveSettings();
      document.body.classList.toggle('fs-ar', S.fsArOnly);
      if (el) window.scrollBy(0, el.getBoundingClientRect().top - top);
      drawFsCtl();
      toast(S.fsArOnly ? L('ફક્ત અરબી', 'Arabic only') : L('અરબી સાથે ગુજરાતી', 'Arabic with English'));
    };
    $('#fsScroll').onclick = () => AS.on ? asStop() : asStart();
  }

  // a finger on the page holds the scrolling; it carries on from there when the finger lifts
  window.addEventListener('touchstart', e => { if (AS.on && !e.target.closest('#asPanel')) AS.hold = 1; }, { passive: true });
  window.addEventListener('touchend', () => { if (AS.on) setTimeout(() => { AS.hold = 0; AS.pos = window.scrollY; AS.last = 0; }, 600); }, { passive: true });

  /** [first, last] when the reader shows only some ayahs (#/s/2?a=255&to=257&only=1), else null. */
  function onlyRange() {
    if (!route || route.name !== 'surah' || !route.q.get('only')) return null;
    const max = sm(route.s).a, a = Math.max(1, Math.min(max, Number(route.q.get('a')) || 1));
    return [a, Math.max(a, Math.min(max, Number(route.q.get('to')) || a))];
  }
  const onlyLink = (s, a, b, name, ar) => `#/s/${s}?a=${a}&to=${b}&only=1&t=${encodeURIComponent(name)}${ar ? '&ar=' + encodeURIComponent(ar) : ''}`;

  async function renderSurah() {
    const s = route.s, m = sm(s);
    setBar({ title: m.en, sub: `${m.a} Ayahs`, back: true, actions: readerActions() });
    view.innerHTML = '<div class="hint">Loading…</div>';
    const d = await loadSurah(s);
    if (!route || route.name !== 'surah' || route.s !== s) return;
    const only = onlyRange();
    if (only) {
      // Mash'hur / Subject: just those ayahs, without the rest of the surah after them
      const [a, b] = only, name = route.q.get('t') || '';
      view.innerHTML = `<div class="only-head">${route.q.get('ar') ? `<div class="ar">${esc(route.q.get('ar'))}</div>` : ''}
          ${name ? `<b>${esc(name)}</b>` : ''}<small>${esc(m.en)} · ${s}:${a}${b > a ? '–' + b : ''}</small></div>`
        + togglesHtml() + withPages(s, d, a, b)
        + `<a class="only-more" href="#/s/${s}?a=${a}">${L(`આખી ${esc(m.en)} વાંચો ›`, `Read the whole of ${esc(m.en)} ›`)}</a>`;
      readerCommon(() => playDua(s, a, b));
      return;
    }
    view.innerHTML = surahHeadHtml(m) + togglesHtml() + introHtml(d)
      + withPages(s, d, 1, d.ayahs.length)
      + `<div class="reader-nav">
          ${s > 1 ? `<a href="#/s/${s - 1}">‹ ${esc(sm(s - 1).en)}</a>` : ''}
          ${s < 114 ? `<a href="#/s/${s + 1}">${esc(sm(s + 1).en)} ›</a>` : ''}</div>`;
    readerCommon(() => playAyah(s, 1));
  }

  async function renderJuz() {
    const j = route.j, z = META.juz[j - 1], end = juzEnd(j);
    setBar({ title: `Sipara ${j}`, sub: '', back: true, actions: readerActions() });
    view.innerHTML = '<div class="hint">Loading…</div>';
    const lastS = end ? (end[1] === 1 ? end[0] - 1 : end[0]) : 114;
    const nums = [];
    for (let s = z.s; s <= lastS; s++) nums.push(s);
    const parts = await Promise.all(nums.map(s => loadSurah(s).then(d => [s, d])));
    if (!route || route.name !== 'juz' || route.j !== j) return;
    let html = togglesHtml();
    for (const [s, d] of parts) {
      const from = s === z.s ? z.a : 1;
      const to = end && s === end[0] ? end[1] - 1 : d.ayahs.length;
      if (from === 1) html += surahHeadHtml(sm(s)) + introHtml(d);
      else html += `<div class="juz-surah-label">${esc(sm(s).en)}</div>`;
      html += withPages(s, d, from, to);
    }
    html += `<div class="reader-nav">
      ${j > 1 ? `<a href="#/j/${j - 1}">‹ Sipara ${j - 1}</a>` : ''}
      ${j < 30 ? `<a href="#/j/${j + 1}">Sipara ${j + 1} ›</a>` : ''}</div>`;
    view.innerHTML = html;
    readerCommon(() => playAyah(z.s, z.a));
  }

  /** Scroll target, play highlight, last-read tracking and toolbar for both readers. */
  function readerCommon(playAll) {
    // the toolbar sticks just under the bar, whatever the bar's height
    document.documentElement.style.setProperty('--bar-h', $('#bar').offsetHeight + 'px');
    $('#fsBtn').onclick = () => setFs(true);
    $('#aaBtn').onclick = openDisplaySheet;
    $('#asBtn').onclick = () => AS.on ? asStop() : asStart();
    $('#slBtn').onclick = openSleepSheet;
    drawSleepBtn();
    $$('[data-hzm]').forEach(b => b.onclick = () => {
      S.hzMode = b.dataset.hzm; saveSettings();
      $$('[data-hzm]').forEach(x => x.classList.toggle('on', x === b));
      hzReset();
      toast(EN() ? { word: 'Tap to show one word at a time', line: 'Tap to show one line at a time', ayah: 'Tap to show the whole ayah' }[S.hzMode]
        : { word: 'ટચ કરો તો એક એક શબ્દ ખુલશે', line: 'ટચ કરો તો એક એક લાઇન ખુલશે', ayah: 'ટચ કરો તો આખી આયત ખુલશે' }[S.hzMode]);
    });
    $$('[data-vt]').forEach(b => b.onclick = () => {
      if (b.dataset.vt === 'hz') {
        S.hifz = !S.hifz; saveSettings(); applyTheme();
        b.classList.toggle('on', S.hifz);
        hzReset();
        const m = $('.hz-modes');
        if (m) m.hidden = !S.hifz;
        toast(S.hifz ? L('Hifz: અરબી છુપાયું — આયત પર ટચ કરી જુઓ', 'Hifz: Arabic hidden — tap an ayah') : L('Hifz બંધ', 'Hifz off'));
        return;
      }
      const k = { tr: 'showTr', gu: 'showGu', gc: 'gramColor' }[b.dataset.vt];
      S[k] = !S[k]; saveSettings();
      if (k === 'gramColor') { applyGramColors(); $$('[data-act="gc"]').forEach(x => x.classList.toggle('on', S[k])); } else applyTheme();
      b.classList.toggle('on', S[k]);
    });
    applyGramColors();
    const target = onlyRange() ? null : route.q.get('a');
    let el = null;
    if (target) {
      const [ts, tn] = target.includes(':') ? target.split(':').map(Number) : [route.s, Number(target)];
      el = document.getElementById(`a-${ts}-${tn}`);
    }
    if (el) {
      // Arabic fonts finish loading after the first layout and push the ayah down, so aim again once they are in.
      const center = !!route.q.get('f'), r0 = route;
      const aim = () => {
        if (route !== r0) return;
        // same rule everywhere: the ayah box from its top, with a new sipara / page heading above it
        scrollToAyah(el, false);
      };
      aim();
      if (!center) el.classList.add('flash');
      document.fonts.ready.then(aim);
      setTimeout(aim, 350);
    } else window.scrollTo(0, 0);
    if (P.s) highlight();
    let t;
    // the bar shows where the reader is: the sipara as the heading, the surah and the Mushaf page under it
    const showPage = () => {
      const f = firstVisibleAyah();
      const el = f && document.getElementById(`a-${f[0]}-${f[1]}`);
      if (!el) return;
      const t = $('#barTitle span');
      if (t) t.textContent = `Sipara ${juzOf(f[0], f[1])}`;
      $('#barSub').textContent = sm(f[0]).en + (el.dataset.pg ? ` · Page ${el.dataset.pg}` : '');
    };
    showPage();
    window.onscroll = () => {
      clearTimeout(t);
      t = setTimeout(() => { const f = firstVisibleAyah(); if (f) setLast(f[0], f[1]); markRead(); }, 400);
      showPage();
      if (JB.on) drawJuzBar();
    };
    const f = firstVisibleAyah();
    if (f) setLast(f[0], f[1]);
    setTimeout(markRead, 1500);
  }

  function firstVisibleAyah() {
    const top = stickTop() + 30;
    for (const el of $$('.ayah')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > top) return [Number(el.dataset.s), Number(el.dataset.n)];
    }
    return null;
  }

  view.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const card = b.closest('.ayah');
    if (!card) return;
    const s = Number(card.dataset.s), n = Number(card.dataset.n);
    const act = b.dataset.act;
    if (act === 'play') {
      const only = onlyRange();
      if (P.s === s && P.n === n && P.phase === 'ayah') togglePlay();
      else if (only) playDua(s, n, only[1]); // stops at the end of the Mash'hur / Subject ayahs
      else playAyah(s, n);
    } else if (act === 'bm') openBmSheet(s, n, () => refreshBm(card, s, n));
    else if (act === 'more') openAyahSheet(s, n);
    else if (act === 'tafs') openTafseer(s, n);
    else if (act === 'note') openNoteSheet(s, n);
    else if (act === 'hifz') hifzCheck(s, n);
    else if (act === 'wbw') openWbw(s, n);
    else if (act === 'gc') {
      // the same switch as the one above the surah: every ayah gets (or loses) its colours
      S.gramColor = !S.gramColor; saveSettings();
      $$('[data-act="gc"], [data-vt="gc"]').forEach(x => x.classList.toggle('on', S.gramColor));
      const top = card.getBoundingClientRect().top;
      applyGramColors();
      colorAyah(card).then(() => window.scrollBy(0, card.getBoundingClientRect().top - top));
    }
  });

  // ---------------------------------------------------------------- tafseer & word by word
  const pending = {};
  let reqSeq = 0;
  const nativeCall = (fn, ...args) => new Promise(res => {
    const id = 'r' + (++reqSeq);
    pending[id] = res;
    N[fn](id, ...args);
  });
  const wbwCache = {};
  const loadWbw = s => wbwCache[s] || (wbwCache[s] = getJSON(`data/w/${p3(s)}.json`));
  let showTafsAr = load('qm.tafsAr', true);

  /** Tafsir Ahl al-Bayt narrations for one ayah, the same as under each ayah in Duao no Majmuo. */
  async function openTafseer(s, n) {
    const d = await loadSurah(s), a = d.ayahs[n - 1];
    const fazilat = n === 1 && d.intro && d.intro.length;
    openSheet(`
      <h3>${esc(sm(s).en)} · Ayah ${n}</h3>
      <div class="tafs-ayah">
        <div class="ar">${esc(arT(a[arFont().script] || a[0]))}</div>
        <div class="gu">${esc(a[2])}</div>
      </div>
      ${fazilat ? `<details class="intro"><summary>${ICON.note} Fazilat ${ICON.chev}</summary>
        <div class="body">${d.intro.map(x => x.ar ? `<div class="ar">${esc(arT(x.ar))}</div>${x.gu ? `<div>${esc(x.gu)}</div>` : ''}` : `<div>${esc(x.t)}</div>`).join('<br>')}</div></details>` : ''}
      <div id="tafsBody"><div class="hint">Loading tafseer…</div></div>`, async sh => {
      const body = $('#tafsBody', sh);
      // Tafsir Ahl al-Bayt (Gujarati) from Duao no Majmuo's tafseer service, kept on the phone after the first time
      const r = N.tafsir ? await nativeCall('tafsir', s, n) : null;
      if (!body || !sh.classList.contains('on')) return;
      // the same service in the app's language: ?lang=ar,gu or ?lang=ar,en (Bridge.setLang)
      const lg = EN() ? 'en' : 'gu';
      const hs = r && r.ok && r.data ? (r.data.hadiths || []).map(h => ({
        by: h.narrator && (h.narrator[lg] || h.narrator.original), ar: h.text && h.text.ar, gu: h.text && h.text[lg],
        ref: h.reference && (h.reference[lg] || h.reference.original), sec: h.section && h.section[lg],
        oth: h.other_references && (h.other_references[lg] || h.other_references.original) })) : null;
      if (!hs) {
        const offline = r && r.status === 0;
        body.innerHTML = `<div class="pack-card"><div class="t">${offline ? 'No internet' : 'Tafseer not available here'}</div>
          <div class="d">${offline
            ? 'The tafseer of an ayah is downloaded from Duao no Majmuo the first time it is opened. Connect to the internet and try again; after that it opens without internet.'
            : 'majmuo.com did not send the tafseer to this app. You can read it on their website.'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${offline ? '<button class="btn" id="tafsRetry">Try again</button>' : ''}
          <a class="btn ${offline ? 'ghost' : ''}" href="https://www.majmuo.com/">Open majmuo.com</a></div></div>`;
        const rt = $('#tafsRetry', body);
        if (rt) rt.onclick = () => openTafseer(s, n);
        return;
      }
      const draw = () => {
        body.innerHTML = `
          <div class="tafs-meta"><span>${hs.length} narration${hs.length === 1 ? '' : 's'}</span>
            <label class="tafs-ar-toggle"><input type="checkbox" id="tafsAr" ${showTafsAr ? 'checked' : ''}> Arabic</label></div>
          ${hs.length ? '' : '<div class="hint">No narrations for this ayah.</div>'}
          ${hs.map(h => `<article class="hadith">
            ${h.sec ? `<div class="h-sec">${esc(h.sec)}</div>` : ''}
            ${h.by ? `<span class="h-by">${esc(h.by)}</span>` : ''}
            ${showTafsAr && h.ar ? `<div class="h-ar">${esc(h.ar)}</div>` : ''}
            ${h.gu ? `<div class="h-gu">${esc(h.gu)}</div>` : ''}
            ${h.ref ? `<div class="h-ref">${esc(h.ref)}</div>` : ''}${h.oth ? `<div class="h-ref h-oth">${L('બીજા હવાલા', 'Also in')}: ${esc(h.oth)}</div>` : ''}
          </article>`).join('')}
          <div class="mt-note">Tafsir Ahl al-Bayt · ${L('Gujarati', 'English')}: Duao no Majmuo (majmuo.com)</div>`;
        $('#tafsAr', body).onchange = e => { showTafsAr = e.target.checked; store('qm.tafsAr', showTafsAr); draw(); };
      };
      draw();
    });
  }

  /** Each Arabic word with the Gujarati word(s) the app's own translation uses for it. */
  let wbTab = 'w'; // the word-by-word sheet's last tab: words or ayah analysis
  // Gujarati word list from the "SEC QL" lessons (tools/build_secql.py): {bare arabic: gujarati}
  let secP = null;
  const loadSec = () => secP || (secP = getJSON('data/secql.json').catch(() => ({})));
  const bareAr = s => String(s || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآ]/g, 'ا')
    .replace(/[ىی]/g, 'ي').replace(/ک/g, 'ك').replace(/[ھہ]/g, 'ه').replace(/ۃ/g, 'ة').replace(/[^ء-ي]/g, '');
  const PRE_WORD = { 'w:CONJ+': 'અને', 'f:CONJ+': 'પછી', 'f:REM+': 'તો', 'bi+': 'થી', 'l:P+': 'માટે', 'ka+': 'જેમ' };

  // small words the dictionaries leave out (keyed by the corpus lemma)
  const PART_GU = new Map(Object.entries({
    'فِي': 'માં', 'مِنْ': 'થી', 'إِلَى': 'તરફ', 'عَلَى': 'ઉપર', 'عَنْ': 'થી / વિશે', 'مَعَ': 'સાથે', 'حَتَّى': 'ત્યાં સુધી',
    'لَا': 'ના / નહિ', 'مَا': 'જે / નહિ', 'لَمْ': 'નહિ', 'لَنْ': 'હરગિઝ નહિ', 'لَيْسَ': 'નથી', 'إِنَّ': 'બેશક', 'أَنَّ': 'કે',
    'إِنْ': 'જો', 'أَنْ': 'કે', 'إِلَّا': 'સિવાય', 'قَدْ': 'ચોક્કસ', 'ثُمَّ': 'પછી', 'أَوْ': 'અથવા', 'أَمْ': 'અથવા / કે',
    'بَلْ': 'બલ્કે', 'لَكِنَّ': 'પરંતુ', 'لَكِنْ': 'પરંતુ', 'لَعَلَّ': 'કદાચ', 'إِنَّمَا': 'ફક્ત', 'إِذَا': 'જ્યારે', 'إِذْ': 'જ્યારે',
    'لَوْ': 'જો', 'لَوْلَا': 'જો ન હોત', 'لَمَّا': 'જ્યારે', 'هَلْ': 'શું', 'يَا': 'અય', 'كَلَّا': 'હરગિઝ નહિ', 'بَلَى': 'કેમ નહિ',
    'سَوْفَ': 'જલ્દી', 'كَيْفَ': 'કેવી રીતે', 'أَيْنَ': 'ક્યાં', 'مَتَى': 'ક્યારે', 'أَنَّى': 'ક્યાંથી / કેવી રીતે', 'كَمْ': 'કેટલા',
    'هُوَ': 'તે', 'هِيَ': 'તે (સ્ત્રી)', 'هُمْ': 'તેઓ', 'هُمَا': 'તે બંને', 'هُنَّ': 'તેઓ (સ્ત્રીઓ)', 'أَنْتَ': 'તું', 'أَنْتُمْ': 'તમે',
    'أَنْتُمَا': 'તમે બંને', 'نَحْنُ': 'અમે', 'أَنَا': 'હું', 'إِيَّا': 'ફક્ત', 'الَّذِي': 'જે', 'الَّذِينَ': 'જેઓ', 'الَّتِي': 'જે (સ્ત્રી)',
    'اللَّاتِي': 'જે (સ્ત્રીઓ)', 'مَنْ': 'જે / કોણ', 'ذَلِكَ': 'તે', 'ذَلِكُمْ': 'તે', 'هَذَا': 'આ', 'هَذِهِ': 'આ', 'هَؤُلَاءِ': 'આ લોકો',
    'أُولَئِكَ': 'તેઓ', 'تِلْكَ': 'તે', 'كُلّ': 'દરેક / બધા', 'بَعْض': 'કેટલાક', 'عِنْدَ': 'પાસે', 'لَدَى': 'પાસે', 'بَيْنَ': 'વચ્ચે',
    'قَبْلَ': 'પહેલાં', 'بَعْدَ': 'પછી', 'دُون': 'સિવાય', 'فَوْقَ': 'ઉપર', 'تَحْتَ': 'નીચે', 'غَيْر': 'સિવાય / બીજું', 'حَيْثُ': 'જ્યાં',
    'إِذَن': 'ત્યારે', 'الْآنَ': 'હવે', 'كَذَلِكَ': 'આ રીતે', 'ثَمَّ': 'ત્યાં', 'هُنَالِكَ': 'ત્યાં', 'نَعَمْ': 'હા', 'لَدُن': 'પાસેથી',
    'أَيّ': 'કયું', 'مِثْل': 'જેવું', 'أَمَّا': 'પરંતુ / જ્યાં સુધી', 'كَأَنَّ': 'જાણે કે', 'لَيْتَ': 'કાશ'
  }));
  // مِنْ / مَنْ , إِنْ / أَنْ share their letters, so the first letter's vowel is part of the key
  const partKey = s => bareAr(s) + ((String(s).match(/^.ّ?([َُِ])/) || [])[1] || '') + (/ّ/.test(s) ? 'ّ' : '');
  const PART_V = new Map(), PART_B = new Map();
  for (const [k, v] of PART_GU) { PART_V.set(partKey(k), v); if (!PART_B.has(bareAr(k))) PART_B.set(bareAr(k), v); }
  const partGu = s => s ? PART_V.get(partKey(s)) || PART_B.get(bareAr(s)) : '';

  /** Meaning of one corpus word: the SEC QL lessons, the small-word list, Al-Miftah, else its kind of particle. */
  function segGu(segs, SEC, M) {
    const st = segs.find(x => x.k === 'x');
    if (!st) return '';
    const form = bareAr(st.f), lem = st.l ? bareAr(st.l) : '';
    // the curated small words first: the lessons' bare spelling cannot tell مِنْ (from) from مَنْ (who)
    let gu = (st.t !== 'V' && (partGu(st.l) || partGu(st.f))) || SEC[form] || (st.t !== 'V' && SEC[lem]) || '';
    if (!gu && M && st.l) {
      const dict = (M.HEAD.get(M.normAr(st.l).replace(/\s/g, '')) || [])[0];
      if (dict) gu = st.t === 'V' && SIGAH_NO[st.g] ? sigahGu(dict.gu, { PERF: 'madi', IMPF: 'mudari', IMPV: 'amr' }[st.a], SIGAH_NO[st.g] - 1) || dict.gu : dict.gu;
    }
    if (!gu && KIND[st.t] && KIND[st.t][2] !== 'fel') { const m = KIND[st.t][0].match(/\(([^)]+)\)/); if (m) gu = m[1]; }
    if (!gu) return '';
    gu = String(gu).split(/\s*[\/;]\s*/).slice(0, 2).join(' / ');
    const pre = segs.filter(x => x.k === 'p').map(x => PRE_WORD[x.c]).filter(Boolean);
    return [...pre, gu].join(' ');
  }

  /** A Gujarati meaning for a word the translation gave none. */
  function dictGu(ar, link, SEC, M) {
    const b = bareAr(ar);
    for (const k of [b, b.replace(/^[وف]/, ''), b.replace(/^[وف]?(?:ال|بال|لل|وال)/, '')]) if (k.length > 1 && SEC[k]) return SEC[k];
    if (!link) return '';
    if (link.p === 'pre') { // a lone وَ / فَ written apart
      const p = link.w[0].filter(x => x.k === 'p').pop();
      return p ? PRE_WORD[p.c] || ((KIND[p.t] || [''])[0].match(/\(([^)]+)\)/) || [])[1] || '' : '';
    }
    return link.w.map(segs => segGu(link.p === 'rest' ? segs.filter(x => x.k !== 'p') : segs, SEC, M)).filter(Boolean).join(' ');
  }

  async function openWbw(s, n) {
    const [w, d, , g, SEC, M] = await Promise.all([loadWbw(s), loadSurah(s), loadWords(), loadGram(s).catch(() => null),
      loadSec(), loadMiftah().catch(() => null)]);
    // English mode: each word's English from data/en (the Quranic word-by-word glosses)
    const enW = EN() ? ((await loadEn(s)).w[n - 1] || []) : null;
    const words = (w[n - 1] || []).map(([ar, gu], i) => enW ? [ar, enW[i] || '', '']
      : [ar, gu, gu ? '' : dictGu(ar, g && g[n - 1] && g[n - 1][i], SEC, M)]);
    const irab = g && g[n - 1] && window.Irab ? window.Irab.html(g[n - 1], arT, g[n - 2]) : '';
    const en = x => { const m = WORD_BY_AR.get(normAr(x)); return m ? m.en : ''; };
    const tab = irab ? wbTab : 'w';
    openSheet(`
      <h3>Word by word · ${esc(sm(s).en)} ${s}:${n}</h3>
      ${irab ? `<div class="wb-tabs"><button data-wt="w" class="${tab === 'w' ? 'on' : ''}">Word by word</button><button data-wt="a" class="${tab === 'a' ? 'on' : ''}">Ayah Analysis</button></div>` : ''}
      <div data-wp="w" ${tab === 'w' ? '' : 'hidden'}>
      <div class="sub">${L('Tap a word for its full grammar. Gujarati words are taken from this ayah\'s translation.', 'Tap a word for its full grammar.')}</div>
      <div class="wbw-grid">${words.map(([ar, gu, dg], i) => `<button class="wbw" data-wi="${i}">
        <div class="wa">${esc(arT(ar))}</div>
        ${gu ? `<div class="wg">${esc(gu)}</div>` : dg ? `<div class="wg">${esc(dg)}</div>` : `<div class="we">${esc(en(ar)) || '—'}</div>`}</button>`).join('')}</div>
      <div class="sec">Full ayah (${L('Gujarati', 'English')})</div>
      <div class="gu-text" style="border:0;padding:0;margin:0">${esc(d.ayahs[n - 1][2])}</div>
      <div class="mt-note">${L('Where the translation has no single word for it, the meaning is from the dictionary (SEC QL lessons / Al-Miftah).', 'Word meanings: Quranic word-by-word English. Translation: Ali Quli Qarai.')}</div></div>
      ${irab ? `<div data-wp="a" ${tab === 'a' ? '' : 'hidden'}><div class="sub">${L('એ\'અરાબ', 'I\'rab')} <bdi>إِعْرَاب</bdi> — ${L('દરેક શબ્દ વાક્યમાં શું છે અને મરફૂઅ / મન્સૂબ / મજરૂર કેમ છે', 'what each word is in the sentence, and why it is marfu\' / mansub / majrur')}</div>
      <div class="ir-legend"><span class="ir-case nom">${L('મરફૂઅ', 'Marfu\'')}</span><span class="ir-case acc">${L('મન્સૂબ', 'Mansub')}</span><span class="ir-case gen">${L('મજરૂર', 'Majrur')}</span><span class="ir-case jus">${L('મજઝૂમ', 'Majzum')}</span></div>${irab}</div>` : ''}`, sh => {
      $$('[data-wt]', sh).forEach(b => b.onclick = () => {
        wbTab = b.dataset.wt;
        $$('[data-wt]', sh).forEach(x => x.classList.toggle('on', x === b));
        $$('[data-wp]', sh).forEach(p => p.hidden = p.dataset.wp !== wbTab);
        sh.scrollTop = 0;
      });
      $$('[data-wi]', sh).forEach(b => b.onclick = () => {
        const [ar, gu, dg] = words[Number(b.dataset.wi)];
        openAnalysis(ar, gu || dg || en(ar), () => openWbw(s, n), { s, n, i: Number(b.dataset.wi) });
      });
    });
  }

  // Control Panel: the meaning the app fills in for each word the translation gave none ('' where it gave one),
  // so the panel can show it as a grey hint in the empty box instead of a blank
  window.wbwFill = async (s, n) => {
    const [w, , g, SEC, M] = await Promise.all([loadWbw(s), loadWords(), loadGram(s).catch(() => null), loadSec(), loadMiftah().catch(() => null)]);
    return (w[n - 1] || []).map(([ar, gu], i) => gu ? '' : dictGu(ar, g && g[n - 1] && g[n - 1][i], SEC, M));
  };

  // ---------------------------------------------------------------- Quran words: how often each word comes, and its root family
  // data/lex.json (tools/build_lex.py): L = [[lemma, root, tag, count, occ]], most frequent first;
  // occ = surah*1000000 + ayah*1000 + word index of the word-by-word view
  // data/verbgu.json (tools/build_verb_gu.py): {"lemma|root": Gujarati meaning} for every verb, as "...વું"
  // data/lexen.json (tools/build_lex_en.py, English mode): {"lemma|TAG": meaning}, verbs {"lemma|V": [base, past]}
  let lexP = null, LEX = null, VERB_GU = {}, LEX_EN = {};
  const verbGu = e => VERB_GU[e[0] + '|' + e[1]] || '';
  const lexEnOf = (l, t) => LEX_EN[l + '|' + t];
  const loadLex = () => lexP || (lexP = Promise.all([getJSON('data/lex.json'), getJSON('data/verbgu.json').catch(() => ({})),
    EN() ? getJSON('data/lexen.json').catch(() => ({})) : {}]).then(([d, vg, le]) => {
    VERB_GU = vg; LEX_EN = le || {};
    const byRoot = new Map(), byLemma = new Map();
    let total = 0;
    d.L.forEach((e, i) => {
      e.rank = i + 1; total += e[3];
      byLemma.set(e[0] + '|' + e[1], e);
      if (e[1]) { if (!byRoot.has(e[1])) byRoot.set(e[1], []); byRoot.get(e[1]).push(e); }
    });
    return (LEX = { L: d.L, byRoot, byLemma, total, rootCount: r => (byRoot.get(r) || []).reduce((t, e) => t + e[3], 0) });
  }).catch(() => null));
  const num = n => Number(n).toLocaleString('en-IN');
  // the corpus writes the sun-letter shadda of الـ on some lemmas (رَّحِيم)
  const lemAr = l => arT(String(l).replace(/^(.)ّ/, '$1'));
  const rootAr = r => [...r].join(' ');
  /** Meaning of a lemma: the small-word list, the SEC QL lessons, Al-Miftah (a verb entry only for a verb),
   *  then the word the app's translation uses most for it. */
  // frequent words the dictionaries give a wrong or no meaning for (keyed by the corpus lemma)
  const LEX_FIX = {
    'ءَامَنَ': 'ઈમાન લાવવું', 'رَءَا': 'જોવું', 'آتَى': 'આપવું', 'جَعَلَ': 'બનાવવું', 'كَذَّبَ': 'જૂઠલાવવું', 'أَمْر': 'હુકમ / કામ',
    'عَمَل': 'અમલ / કામ', 'ذِكْر': 'ઝિક્ર / યાદ', 'خَلْق': 'સર્જન', 'مَلَك': 'ફરિશ્તો', 'مُلْك': 'બાદશાહી', 'آخَر': 'બીજું',
    'جَزَىٰ': 'બદલો આપવો', 'أَلْقَىٰٓ': 'નાખવું', 'تَلَىٰ': 'પઢવું', 'قَضَىٰٓ': 'ફેંસલો કરવો', 'جَرَيْ': 'વહેવું', 'ٱفْتَرَىٰ': 'જૂઠું ઘડવું',
    'يَذَرَ': 'છોડી દેવું', 'نَادَىٰ': 'પોકારવું', 'مَلَكَتْ': 'માલિક હોવું', 'أُدْخِلَ': 'દાખલ કરવું', 'عَذَّبَ': 'અઝાબ આપવો',
    'أَرَيْ': 'બતાવવું', 'أَحْبَبْ': 'મોહબ્બત કરવી', 'وَعَدَ': 'વાયદો કરવો', 'نَبَّأَ': 'ખબર આપવી', 'رَزَقَ': 'રોઝી આપવી',
    'أُولِى': 'વાળા', 'أَضَلَّ': 'ગુમરાહ કરવું', 'أَلَآ': 'સાંભળો! / ખબરદાર', 'إِذْن': 'પરવાનગી / હુકમ', 'عَلَّمَ': 'શીખવવું',
    'نَزَّلَ': 'નાઝિલ કરવું', 'يَوْمَئِذ': 'તે દિવસે', 'أَصَابَ': 'પહોંચવું', 'أَقَامَ': 'કાયમ કરવું', 'مَسَّ': 'અડકવું / પહોંચવું',
    'أَنزَلَ': 'નાઝિલ કરવું', 'خَلَقَ': 'પૈદા કરવું', 'كَفَرَ': 'ઇન્કાર કરવો', 'جَآءَ': 'આવવું', 'أَرْسَلَ': 'મોકલવું', 'بَعَثَ': 'મોકલવું / ઉઠાડવું',
    'ٱتَّبَعَ': 'પાછળ ચાલવું / અનુસરણ', 'ضَلَّ': 'ભટકી જવું', 'زَادَ': 'વધારવું', 'أَنذَرَ': 'ડરાવવું', 'ٱسْتَغْفَرَ': 'માફી માંગવી',
    'تَوَكَّلْ': 'ભરોસો કરવો', 'قَالَ': 'કહેવું', 'كَانَ': 'હોવું / હતું', 'عَلِمَ': 'જાણવું', 'رَحْمَٰن': 'રહમાન / ખૂબ મહેરબાન'
  };
  function lexGu(e, SEC, M) {
    if (EN()) {
      // English mode: the Quranic word-by-word English for this lemma ("to believe" for a verb)
      const v = lexEnOf(e[0], e[2]);
      return Array.isArray(v) ? (v[0] ? 'to ' + v[0] : v[1] || '') : v || (((KIND[e[2]] || [''])[0].match(/\(([^)]+)\)/) || [])[1]) || '';
    }
    if (LEX_FIX[e[0]]) return LEX_FIX[e[0]];
    const [l, , t, , , tr] = e, fel = t === 'V';
    // كِتَٰب is كتاب in the dictionaries, but هَٰذَا is هذا
    const al = l.replace(/ٰ(?![ىيۦ])/g, 'ا');
    let gu = (!fel && partGu(l)) || SEC[bareAr(al)] || '';
    if (!gu && M) {
      const ds = M.HEAD.get(M.normAr(al).replace(/\s/g, '')) || [];
      const d = ds.find(x => fel ? x.pos === 'v' : x.pos !== 'v');
      if (d) gu = d.gu;
    }
    if (!gu && fel) gu = verbGu(e);
    gu = gu || tr || (((KIND[t] || [''])[0].match(/\(([^)]+)\)/) || [])[1]) || '';
    return String(gu).split(/\s*[\/;]\s*/).slice(0, 2).join(' / ');
  }
  const lexKind = t => EN() ? ({ fel: 'Fi\'l (verb)', harf: 'Harf (particle)' })[(KIND[t] || [])[2]] || 'Ism (noun)'
    : ({ fel: 'Fe\'l · ફેલ', harf: 'Harf · હર્ફ' })[(KIND[t] || [])[2]] || 'Ism · ઇસ્મ';
  const rootHref = (r, l) => `#/root/${encodeURIComponent(r)}${l ? '?l=' + encodeURIComponent(l) : ''}`;

  let wordsKind = 'all';
  async function renderWords() {
    setBar({ title: 'Quran Words', sub: 'Most frequent words · Search by root', back: true, tabs: 'home' });
    view.innerHTML = '<div class="hint">Loading…</div>';
    const [X, SEC, M] = await Promise.all([loadLex(), loadSec(), loadMiftah().catch(() => null)]);
    if (!route || route.name !== 'words') return;
    if (!X) { view.innerHTML = '<div class="hint">Word list not found.</div>'; return; }
    const top = n => X.L.slice(0, n).reduce((t, e) => t + e[3], 0);
    const pct = n => Math.round(100 * top(n) / X.total);
    view.innerHTML = `
      <div class="lx-hero">
        <div class="lx-top"><div class="lx-big">${pct(300)}<small>%</small></div>
          <div><b>${L('ફક્ત 300 શબ્દો શીખો', 'Learn just 300 words')}</b><span>${L(`કુરઆનના ${num(X.total)} શબ્દોમાંથી ${num(top(300))} આ 300 શબ્દો જ છે`, `${num(top(300))} of the Quran's ${num(X.total)} words are these 300 words`)}</span></div></div>
        <div class="lx-steps">${[50, 100, 300, 1000].map(n => `<div><i style="height:${pct(n)}%"></i><b>${pct(n)}%</b><small>Top ${n}</small></div>`).join('')}</div>
      </div>
      <div class="s-title">SEARCH BY ROOT${L(' · મૂળ', '')}</div>
      <div class="search-box">${ICON.search}<input id="rootQ" type="text" enterkeyhint="search" placeholder="${L('Root કે શબ્દ — દા.ત. علم ، رحم ، كتاب', 'Root or word — e.g. علم ، رحم ، كتاب')}"></div>
      <div id="rootRes" class="lx-roots"></div>
      <div class="s-title" style="margin-top:16px">MOST FREQUENT WORDS</div>
      <div class="seg lx-seg" data-seg="lk">${[['all', 'All'], ['ism', 'Ism'], ['fel', 'Fe\'l'], ['harf', 'Harf']].map(([v, t]) =>
        `<button data-v="${v}" class="${v === wordsKind ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="list lx-list" id="lxList"></div>
      <button class="btn ghost block" id="lxMore" style="margin-top:12px">Show 300 more</button>`;
    let shown = 300;
    const draw = () => {
      const list = X.L.filter(e => wordsKind === 'all' || ((KIND[e[2]] || [])[2] || 'ism') === wordsKind);
      $('#lxList').innerHTML = list.slice(0, shown).map(e => {
        const gu = lexGu(e, SEC, M);
        const inner = `<span class="lx-rank">${e.rank}</span>
          <div class="main"><div class="lx-gu">${esc(gu) || '—'}</div>
            <div class="d">${lexKind(e[2])}${e[1] ? ` · ${L('મૂળ', 'root')} <bdi class="lx-r">${esc(rootAr(e[1]))}</bdi>` : ''}</div></div>
          <div class="lx-right"><bdi class="lx-ar">${esc(lemAr(e[0]))}</bdi><span class="lx-n">${num(e[3])} ${L('વાર', 'times')}</span></div>`;
        return e[1] ? `<a class="row lx-row" href="${rootHref(e[1], e[0])}">${inner}</a>` : `<div class="row lx-row">${inner}</div>`;
      }).join('');
      $('#lxMore').hidden = shown >= list.length;
    };
    $('[data-seg="lk"]').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      wordsKind = b.dataset.v; shown = 300;
      $$('[data-seg="lk"] button').forEach(x => x.classList.toggle('on', x === b));
      draw();
    };
    $('#lxMore').onclick = () => { shown += 300; draw(); };
    draw();

    // a root (علم) or any word of it (عَلِيم ، العلماء): roots whose letters start so, then roots of lemmas spelt so
    let t;
    $('#rootQ').oninput = e => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = bareAr(e.target.value);
        const box = $('#rootRes');
        if (!q) { box.innerHTML = ''; return; }
        const hits = new Map();
        for (const r of X.byRoot.keys()) if (bareAr(r).startsWith(q)) hits.set(r, bareAr(r) === q ? 2 : 1);
        const qw = q.replace(/^(?:وال|فال|بال|ال|و|ف)/, '');
        for (const x of X.L) if (x[1] && !hits.has(x[1]) && [q, qw].includes(bareAr(x[0]))) hits.set(x[1], 3);
        const rs = [...hits].sort((a, b) => b[1] - a[1] || X.rootCount(b[0]) - X.rootCount(a[0])).slice(0, 24).map(x => x[0]);
        box.innerHTML = rs.length ? rs.map(r => `<a class="lx-rchip" href="${rootHref(r)}"><bdi>${esc(rootAr(r))}</bdi>
          <small>${num(X.rootCount(r))} ${L('વાર', 'times')} · ${X.byRoot.get(r).length} ${L('શબ્દો', 'words')}</small></a>`).join('')
          : `<div class="hint" style="text-align:left">${L('આ મૂળ મળ્યું નહિ. અરબી અક્ષરોમાં લખો — દા.ત. علم', 'Root not found. Type it in Arabic letters — e.g. علم')}</div>`;
      }, 150);
    };
  }

  /** Every word of one root, each with every ayah it comes in. */
  async function renderRoot() {
    const r = route.r, open = route.q.get('l');
    setBar({ title: `Root · ${rootAr(r)}`, sub: 'All words of this root in the Quran', back: true, tabs: 'home' });
    view.innerHTML = '<div class="hint">Loading…</div>';
    const [X, SEC, M] = await Promise.all([loadLex(), loadSec(), loadMiftah().catch(() => null)]);
    if (!route || route.name !== 'root') return;
    const es = (X && X.byRoot.get(r)) || [];
    if (!es.length) { view.innerHTML = '<div class="hint">No words found for this root.</div>'; return; }
    view.innerHTML = `
      <div class="lx-rhead">
        <div class="lx-rl">${[...r].map(c => `<span>${esc(c)}</span>`).join('')}</div>
        <div class="lx-rs">${L(`<b>${num(X.rootCount(r))} વાર</b> કુરઆનમાં <span class="dot"></span> <b>${es.length}</b> અલગ શબ્દો`, `<b>${num(X.rootCount(r))} times</b> in the Quran <span class="dot"></span> <b>${es.length}</b> different words`)}</div>
        <div class="lx-rn">${L('એક જ મૂળ (ધાતુ)માંથી બનેલા શબ્દો — અર્થ સરખો, રૂપ અલગ', 'Words made from one root — related meaning, different forms')}</div>
      </div>
      <div class="gc-legend lx-legend"><span class="gc-fel">${L('ફેલ', 'Fi\'l')}</span><span class="gc-baab">${L('બાબ', 'Baab')}</span><span class="gc-rule">${L('નિયમ (એઅલાલ)', 'Rule (i\'lal)')}</span></div>
      <div class="lx-fams">${es.map((e, i) => `<div class="lx-fam" id="fam-${i}">
        <button class="lx-fh" data-f="${i}">
          <div class="main"><div class="lx-gu">${esc(lexGu(e, SEC, M)) || '—'}</div><div class="d">${lexKind(e[2])} · ${num(e[3])} ${L('વાર', 'times')}</div></div>
          <bdi class="lx-ar">${esc(lemAr(e[0]))}</bdi>${ICON.chev}</button>
        <div class="lx-occ" hidden></div></div>`).join('')}</div>`;

    const PAGE = 25;
    const more = async (box, e) => {
      const from = Number(box.dataset.n || 0), part = e[4].slice(from, from + PAGE);
      box.dataset.n = from + part.length;
      const W = {}, G = {};
      await Promise.all([...new Set(part.map(o => Math.floor(o / 1e6)))].map(async s => {
        [W[s], G[s]] = await Promise.all([loadWbw(s).catch(() => []), loadGram(s).catch(() => [])]);
      }));
      const html = part.map(o => {
        const s = Math.floor(o / 1e6), a = Math.floor(o / 1000) % 1000, wi = o % 1000;
        const ws = (W[s] && W[s][a - 1]) || [], gs = (G[s] && G[s][a - 1]) || [];
        const lo = Math.max(0, wi - 3), hi = Math.min(ws.length, wi + 4);
        // the same fe'l / baab / i'lal colours as the reader's "Colours"
        const word = (ar, i) => { const c = gramClass(gs[i]); return c ? `<span class="${c}">${esc(arT(ar))}</span>` : esc(arT(ar)); };
        const snip = ws.slice(lo, hi).map(([ar], k) => lo + k === wi ? `<mark>${word(ar, wi)}</mark>` : word(ar, lo + k)).join(' ');
        const gu = ws[wi] && ws[wi][1];
        return `<a class="lx-oc" href="#/s/${s}?a=${a}">
          <div class="lx-ref"><b>${esc(sm(s).en)} ${s}:${a}</b>${gu ? `<span>${esc(gu)}</span>` : ''}</div>
          <div class="lx-snip">${lo ? '… ' : ''}${snip}${hi < ws.length ? ' …' : ''}</div></a>`;
      }).join('');
      const btn = $('.lx-omore', box);
      if (btn) btn.remove();
      box.insertAdjacentHTML('beforeend', html + (box.dataset.n < e[4].length
        ? `<button class="btn ghost block lx-omore">Show more (${num(e[4].length - box.dataset.n)} left)</button>` : ''));
      const b2 = $('.lx-omore', box);
      if (b2) b2.onclick = () => more(box, e);
    };
    const toggle = async i => {
      const fam = $('#fam-' + i), box = $('.lx-occ', fam);
      const on = box.hidden;
      box.hidden = !on; fam.classList.toggle('on', on);
      if (on && !box.dataset.n) { box.innerHTML = ''; await more(box, es[i]); }
    };
    $$('[data-f]').forEach(b => b.onclick = () => toggle(Number(b.dataset.f)));
    // each word's heading takes the colour of its first place in the Quran
    es.forEach(async (e, i) => {
      const o = e[4][0];
      if (!o) return;
      const g = await loadGram(Math.floor(o / 1e6)).catch(() => null);
      const c = g && gramClass((g[Math.floor(o / 1000) % 1000 - 1] || [])[o % 1000]);
      const h = c && $(`#fam-${i} .lx-ar`);
      if (h) h.classList.add(c);
    });
    const oi = open ? es.findIndex(e => e[0] === open) : -1;
    if (oi >= 0) { await toggle(oi); $('#fam-' + oi).scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }
  }

  // ---------------------------------------------------------------- word analysis (Al-Miftah engine)
  let miftahP = null;
  const loadMiftah = () => miftahP || (miftahP = new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = 'miftah.js';
    el.onload = () => res(window.Miftah);
    el.onerror = rej;
    document.head.appendChild(el);
  }));

  /**
   * Finds a Quran word in the Al-Miftah dictionary: as a headword, as one of the 14 sigah of a verb,
   * or after peeling attached parts (وَ بِ لِ الـ … ـهُ ـهُمْ ـنَا).
   */
  function analyzeWord(M, word) {
    // Quran spelling: a small alif (ٰ) is sometimes written as a real alif (عٰلَمِیۡنَ = عالمين), sometimes not (هٰذَا = هذا)
    // the real-alif reading wins when it is found (رَزَقۡنٰہُمۡ = رزقناهم); the plain one covers هٰذَا ، اللّٰہ
    const tries = [word.replace(/ٰ(?=[یىيے])/g, '').replace(/ٰ/g, 'ا'), word];
    // a verb never takes الـ, and a bare verb entry with no sigah found is a weak guess
    const weak = r => !r || (r.e.pos === 'v' && (!r.form || r.pre.includes('ال')) && !(r.form && /fail|mafl/.test(r.form.t)));
    const rs = tries.map(v => analyzeOne(M, v));
    const best = rs.find(r => r && !weak(r)) || rs.find(Boolean);
    if (best && !(best.e.pos === 'v' && best.pre.includes('ال') && !(best.form && /fail|mafl/.test(best.form.t)))) return best;
    // short particles the dictionary peeling skips: وَ ، لَکُمۡ ، فِیۡہَا ، فَاِنۡ ، مِنۡہُمۡ
    const n = M.normAr(tries[0]).replace(/\s/g, '');
    const harf = s => (M.HEAD.get(s) || []).find(e => e.pos === 'p' || s.length <= 3);
    if (M.PRE_GLOSS[n]) return { e: { ar: n, pos: 'p', gu: M.PRE_GLOSS[n], en: '', tr: '' }, pre: [], suf: '' };
    for (const pre of ['', 'و', 'ف']) {
      if (pre && !n.startsWith(pre)) continue;
      const rest = n.slice(pre.length);
      for (const suf of ['', ...Object.keys(M.SUF_GLOSS)]) {
        if (!rest.endsWith(suf) || (!pre && !suf)) continue;
        const stem = rest.slice(0, rest.length - suf.length);
        const e = stem && harf(stem);
        if (e) return { e, pre: pre ? [pre] : [], suf };
        if (pre && !suf && stem) { const r = analyzeOne(M, stem); if (r) return { ...r, pre: [pre, ...r.pre] }; }
      }
    }
    // madi of hollow / weak verbs the tables do not build (قَالُوۡا ، کَانُوۡا): headword + sigah ending
    for (const [end, k] of [['وا', 2], ['تم', 8], ['نا', 13], ['ت', 3], ['ا', 1]]) {
      if (!n.endsWith(end)) continue;
      const stem = n.slice(0, -end.length);
      const e = (M.HEAD.get(stem) || []).find(x => x.pos === 'v');
      if (e) return { e, pre: [], suf: '', form: { t: 'madi', k, f: word } };
    }
    return null;
  }

  // Indo-Pak marks -> standard ones, so the typed vowels can pick the right sigah (اَنۡعَمۡتَ = sigah 7, not 4)
  const stdAr = w => w.replace(/ۡ/g, 'ْ').replace(/ی/g, 'ي').replace(/ک/g, 'ك')
    .replace(/ہ/g, 'ه').replace(/ٖ/g, 'ِ').replace(/ٗ/g, 'ُ');

  function analyzeOne(M, v) {
    {
      const n = M.normAr(v).replace(/\s/g, '');
      if (!n) return null;
      const sv = stdAr(v);
      const byVowels = list => list.slice().sort((a, b) => M.compat(sv, b.f) - M.compat(sv, a.f));
      M = Object.assign({}, M, { formHits: s => byVowels(window.Miftah.formHits(s)) });
      const heads = M.byCompat(v, M.HEAD.get(n) || []);
      if (heads.length) {
        const e = heads[0];
        // a listed verb form (نَعْبُدُ) is its sigah, not the madi headword
        const form = e.pos === 'v' && e.c ? (M.formHits(n).find(y => y.e === e) || (M.normAr(e.c.madi[0]) === n ? { t: 'madi', k: 0, f: e.c.madi[0] } : null)) : null;
        return { e, pre: [], suf: '', plural: (e.pl || []).some(p => M.normAr(p) === n), form };
      }
      const fh = M.formHits(n);
      if (fh.length) return { e: fh[0].e, pre: [], suf: '', form: fh[0] };
      const ax = M.affixHits(n);
      if (ax.length) {
        const x = ax[0];
        const preS = x.pre.includes('ل') && x.pre.includes('ال') ? x.pre.filter(p => p !== 'ل' && p !== 'ال').join('') + 'لل' : x.pre.join('');
        const stem = n.slice(preS.length, n.length - x.suf.length);
        const f = M.formHits(stem).find(y => y.e === x.e) || M.formHits(stem.endsWith('و') ? stem + 'ا' : stem).find(y => y.e === x.e);
        const plural = (x.e.pl || []).some(p => M.normAr(p) === stem);
        return { e: x.e, pre: x.pre, suf: x.suf, plural,
          form: f || (x.e.pos === 'v' && x.e.c && M.normAr(x.e.ar) === stem ? { t: 'madi', k: 0, f: x.e.c.madi[0] } : null) };
      }
    }
    return null;
  }

  // Gujarati meaning of one sigah, built from the verb's meaning ("જાણવું" → "તેઓ જાણે છે")
  const PRON = ['તે', 'તે બંને', 'તેઓ', 'તે (સ્ત્રી)', 'તે બંને (સ્ત્રીઓ)', 'તેઓ (સ્ત્રીઓ)', 'તું', 'તમે બંને', 'તમે સૌ', 'તું (સ્ત્રી)', 'તમે બંને (સ્ત્રીઓ)', 'તમે સૌ (સ્ત્રીઓ)', 'હું', 'અમે'];
  const ERG = ['તેણે', 'તે બંનેએ', 'તેઓએ', 'તેણીએ', 'તે બંનેએ', 'તેઓએ', 'તેં', 'તમે બંનેએ', 'તમે', 'તેં', 'તમે બંનેએ', 'તમે', 'મેં', 'અમે'];
  const PAST = { 'જ': 'ગયું', 'કર': 'કર્યું', 'લે': 'લીધું', 'દે': 'દીધું', 'કહે': 'કહ્યું', 'હો': 'હતું', 'થ': 'થયું', 'જો': 'જોયું', 'પી': 'પીધું', 'ખા': 'ખાધું' };
  function sigahGu(gu, t, k) {
    const v = String(gu || '').split(/\s*[\/,;]\s*/)[0].trim();
    const m = v.match(/^(.*)વ([ુીોા])ં?$/); // કરવું / કરવી / કરવો / કરવા
    if (!m || !m[1]) return '';
    // the past agrees with the noun of "ઇન્કાર કરવો": ઇન્કાર કર્યો, દુઆ કરી, નિકાહ કર્યા
    const agree = s => m[2] === 'ુ' ? s : m[2] === 'ી' ? s.replace(/્યું$/, 'ી').replace(/યું$/, 'ઈ').replace(/ું$/, 'ી')
      : s.replace(/ું$/, m[2]);
    const base = m[1];
    const last = base.split(' ').pop();
    const matra = /[ા-ૌ]$/.test(base);
    if (t === 'mudari') {
      const end = k === 12 ? 'ું છું' : k === 13 ? 'ીએ છીએ' : [7, 8, 10, 11].includes(k) ? 'ો છો' : 'ે છે';
      // a stem ending in a vowel sign (કહે) takes only the helper word: તે કહે છે
      return `${PRON[k]} ${matra ? base + ' ' + end.trim().replace(/^\S+\s+/, '') : base + end}`;
    }
    if (t === 'amr') {
      if (k === 6 || k === 9) return `(${PRON[k]}) ${base}`;
      if (k >= 7 && k <= 11) return `(${PRON[k]}) ${base}${matra ? '' : 'ો'}`;
      return `${PRON[k]} ${base}${k === 12 ? 'ું' : k === 13 ? 'ીએ' : 'ે'}`;
    }
    const past = PAST[last] ? base.slice(0, base.length - last.length) + PAST[last] : base + (matra ? 'યું' : '્યું');
    return `${ERG[k]} ${agree(past)}`;
  }

  // ---------------------------------------------------------------- full grammar (Quranic Arabic Corpus)
  // data/g/NNN.json: per ayah, per word of the word-by-word view: {p: 'all'|'pre'|'rest', w: [[segment, …], …]}
  // segment: f form, t tag, k p/x/s (prefix / stem / suffix), c code or case, r root, l lemma, a PERF/IMPF/IMPV,
  //          v PASS, pc ACT/PASS participle, vn masdar, m mood, nd indefinite, g person-gender-number, b baab, ms masdar
  const gramCache = {};
  const loadGram = s => gramCache[s] || (gramCache[s] = getJSON(`data/g/${p3(s)}.json`));

  const KIND = { // tag -> [Gujarati, Arabic, ism | fel | harf]
    N: ['ઇસ્મ (નામ)', 'اِسْم', 'ism'], PN: ['ઇસ્મે અલમ (ખાસ નામ)', 'اِسْم عَلَم', 'ism'], ADJ: ['સિફત (વિશેષણ)', 'صِفَة', 'ism'],
    PRON: ['ઝમીર (સર્વનામ)', 'ضَمِير', 'ism'], DEM: ['ઇસ્મે ઇશારહ (ઇશારો)', 'اِسْم إِشَارَة', 'ism'], REL: ['ઇસ્મે મવસૂલ (જે / જેઓ)', 'اِسْم مَوْصُول', 'ism'],
    T: ['ઝર્ફે ઝમાન (સમય)', 'ظَرْف زَمَان', 'ism'], LOC: ['ઝર્ફે મકાન (જગ્યા)', 'ظَرْف مَكَان', 'ism'], IMPN: ['ઇસ્મે ફેલ', 'اِسْم فِعْل', 'ism'],
    V: ['ફેલ (ક્રિયાપદ)', 'فِعْل', 'fel'],
    P: ['હર્ફે જર', 'حَرْف جَرّ', 'harf'], CONJ: ['હર્ફે અત્ફ (અને / પછી)', 'حَرْف عَطْف', 'harf'], REM: ['હર્ફે ઇસ્તેનાફ (નવી વાત)', 'حَرْف اِسْتِئْنَاف', 'harf'],
    NEG: ['હર્ફે નફી (ના)', 'حَرْف نَفْي', 'harf'], ACC: ['હર્ફે નસ્બ', 'حَرْف نَصْب', 'harf'], EMPH: ['લામે તાકીદ (બેશક)', 'لَام التَّوْكِيد', 'harf'],
    DET: ['અલિફ-લામ (ચોક્કસ)', 'أَل التَّعْرِيف', 'harf'], COND: ['હર્ફે શર્ત (જો)', 'حَرْف شَرْط', 'harf'], INTG: ['હર્ફે ઇસ્તિફહામ (સવાલ)', 'حَرْف اِسْتِفْهَام', 'harf'],
    SUB: ['હર્ફે મસ્દરી', 'حَرْف مَصْدَرِيّ', 'harf'], RES: ['અદાતે હસ્ર (ફક્ત)', 'أَدَاة حَصْر', 'harf'], CERT: ['હર્ફે તહકીક (ખરેખર)', 'حَرْف تَحْقِيق', 'harf'],
    VOC: ['હર્ફે નિદા (અય)', 'حَرْف نِدَاء', 'harf'], RSLT: ['જવાબે શર્ત (તો)', 'حَرْف جَوَاب الشَّرْط', 'harf'], PRO: ['હર્ફે નહી (મના)', 'حَرْف نَهْي', 'harf'],
    PRP: ['લામે તઅલીલ (માટે)', 'لَام التَّعْلِيل', 'harf'], CIRC: ['વાવે હાલિયહ', 'وَاو الْحَال', 'harf'], SUP: ['હર્ફે ઝાએદ (વધારાનો)', 'حَرْف زَائِد', 'harf'],
    PREV: ['હર્ફે કાફ્ફ', 'حَرْف كَافّ', 'harf'], FUT: ['હર્ફે ઇસ્તિકબાલ (ભવિષ્ય)', 'حَرْف اِسْتِقْبَال', 'harf'], RET: ['હર્ફે ઇઝરાબ (બલ્કે)', 'حَرْف إِضْرَاب', 'harf'],
    EXP: ['અદાતે ઇસ્તિસ્ના (સિવાય)', 'أَدَاة اِسْتِثْنَاء', 'harf'], INC: ['હર્ફે ઇબ્તિદા', 'حَرْف اِبْتِدَاء', 'harf'], CAUS: ['હર્ફે સબબ', 'حَرْف سَبَبِيَّة', 'harf'],
    IMPV: ['લામે અમ્ર', 'لَام الْأَمْر', 'harf'], EXL: ['હર્ફે તફસીલ', 'حَرْف تَفْصِيل', 'harf'], AMD: ['હર્ફે ઇસ્તિદરાક (પરંતુ)', 'حَرْف اِسْتِدْرَاك', 'harf'],
    INT: ['હર્ફે તફસીર', 'حَرْف تَفْسِير', 'harf'], ANS: ['હર્ફે જવાબ', 'حَرْف جَوَاب', 'harf'], EXH: ['હર્ફે તહઝીઝ', 'حَرْف تَحْضِيض', 'harf'],
    SUR: ['હર્ફે ફુજાઅહ (અચાનક)', 'حَرْف فُجَاءَة', 'harf'], AVR: ['હર્ફે રદઅ (હરગિઝ નહીં)', 'حَرْف رَدْع', 'harf'], INL: ['હુરૂફે મુકત્તઆત', 'حُرُوف مُقَطَّعَة', 'harf'],
    EQ: ['હર્ફે તસ્વિયહ', 'حَرْف تَسْوِيَة', 'harf'], COM: ['વાવે મઇય્યત (સાથે)', 'وَاو الْمَعِيَّة', 'harf']
  };
  const PREFIX_GU = { 'bi+': 'થી / માં / વડે', 'ka+': 'જેમ', 'ta+': 'કસમ', 'Al+': 'ચોક્કસ (the)', 'sa+': 'જલ્દી (ભવિષ્ય)', 'ya+': 'અય', 'ha+': 'અય',
    'w:CONJ+': 'અને', 'w:REM+': 'અને', 'w:CIRC+': 'એ હાલતમાં કે', 'w:COM+': 'સાથે', 'w:P+': 'કસમ', 'w:SUP+': '',
    'f:CONJ+': 'પછી', 'f:REM+': 'તો / પછી', 'f:RSLT+': 'તો', 'f:CAUS+': 'કારણ કે', 'f:SUP+': '',
    'l:P+': 'માટે', 'l:EMPH+': 'બેશક', 'l:PRP+': 'જેથી', 'l:IMPV+': 'જોઈએ (હુકમ)', 'A:EQ+': 'ચાહે', 'A:INTG+': 'શું?' };
  const BAB = { // baab -> [Gujarati, Arabic]
    nasara: ['નસર', 'نَصَرَ يَنْصُرُ'], daraba: ['ઝરબ', 'ضَرَبَ يَضْرِبُ'], fataha: ['ફતહ', 'فَتَحَ يَفْتَحُ'], samia: ['સમિઅ', 'سَمِعَ يَسْمَعُ'],
    karuma: ['કરુમ', 'كَرُمَ يَكْرُمُ'], hasiba: ['હસિબ', 'حَسِبَ يَحْسِبُ'], I: ['સુલાસી મુજર્રદ', 'ثُلَاثِيّ مُجَرَّد'],
    II: ['તફઈલ', 'تَفْعِيل'], III: ['મુફાઅલહ', 'مُفَاعَلَة'], IV: ['ઇફ્આલ', 'إِفْعَال'], V: ['તફઅ્ઉલ', 'تَفَعُّل'], VI: ['તફાઉલ', 'تَفَاعُل'],
    VII: ['ઇન્ફિઆલ', 'اِنْفِعَال'], VIII: ['ઇફ્તિઆલ', 'اِفْتِعَال'], IX: ['ઇફ્ઇલાલ', 'اِفْعِلَال'], X: ['ઇસ્તિફ્આલ', 'اِسْتِفْعَال'],
    XI: ['ઇફ્ઈલાલ', 'اِفْعِيلَال'], XII: ['ઇફ્ઈઆલ', 'اِفْعِيعَال']
  };
  const PERSON = { 1: ['મુતકલ્લિમ (હું / અમે)', 'مُتَكَلِّم'], 2: ['હાઝિર (તું / તમે)', 'حَاضِر'], 3: ['ગાઇબ (તે / તેઓ)', 'غَائِب'] };
  const GENDER = { M: ['મુઝક્કર (પુરુષ)', 'مُذَكَّر'], F: ['મુઅન્નસ (સ્ત્રી)', 'مُؤَنَّث'] };
  const NUMBER = { S: ['વાહિદ (એક)', 'وَاحِد'], D: ['તસ્નિયા (બે)', 'تَثْنِيَة'], P: ['જમા (બહુ)', 'جَمْع'] };
  const SIGAH_NO = { '3MS': 1, '3MD': 2, '3D': 2, '3MP': 3, '3FS': 4, '3FD': 5, '3FP': 6, '2MS': 7, '2MD': 8, '2D': 8, '2MP': 9, '2FS': 10, '2FD': 11, '2FP': 12, '1S': 13, '1P': 14 };
  const ZAMIR_GU = { '3MS': 'તેનું / તેને', '3FS': 'તેણીનું', '3MD': 'તે બંનેનું', '3FD': 'તે બંનેનું', '3D': 'તે બંનેનું', '3MP': 'તેઓનું / તેઓને', '3FP': 'તેઓ (સ્ત્રીઓ)નું',
    '2MS': 'તારું / તને', '2FS': 'તારું (સ્ત્રી)', '2MD': 'તમ બંનેનું', '2FD': 'તમ બંનેનું', '2D': 'તમ બંનેનું', '2MP': 'તમારું / તમને', '2FP': 'તમારું (સ્ત્રીઓ)', '1S': 'મારું / મને', '1P': 'અમારું / અમને' };

  // English mode: the grammar names in English (the page reloads when the language changes, so once is enough)
  if (EN()) {
    const K = { N: 'Ism (noun)', PN: 'Proper noun', ADJ: 'Sifat (adjective)', PRON: 'Damir (pronoun)', DEM: 'Demonstrative (this / that)',
      REL: 'Relative pronoun (who / which)', T: 'Zarf of time', LOC: 'Zarf of place', IMPN: 'Verbal noun (ism fi\'l)', V: 'Fi\'l (verb)',
      P: 'Harf al-jarr (preposition)', CONJ: 'Conjunction (and / then)', REM: 'Resumption (new sentence)', NEG: 'Negation (not)',
      ACC: 'Harf al-nasb', EMPH: 'Lam of emphasis (surely)', DET: 'Al- (the)', COND: 'Condition (if)', INTG: 'Question',
      SUB: 'Masdar particle (that)', RES: 'Restriction (only)', CERT: 'Certainty (indeed)', VOC: 'Vocative (O)', RSLT: 'Answer of condition (then)',
      PRO: 'Prohibition (do not)', PRP: 'Lam of purpose (so that)', CIRC: 'Waw of state (while)', SUP: 'Extra particle',
      PREV: 'Preventive particle', FUT: 'Future (will)', RET: 'Retraction (rather)', EXP: 'Exception (except)', INC: 'Inceptive particle',
      CAUS: 'Cause (because)', IMPV: 'Lam of command', EXL: 'Explanation particle', AMD: 'Amendment (but)', INT: 'Interpretation particle',
      ANS: 'Answer particle', EXH: 'Exhortation', SUR: 'Surprise (suddenly)', AVR: 'Aversion (nay)', INL: 'Disconnected letters (muqatta\'at)',
      EQ: 'Equalisation particle', COM: 'Waw of company (with)' };
    for (const k in K) if (KIND[k]) KIND[k][0] = K[k];
    Object.assign(PREFIX_GU, { 'bi+': 'with / in / by', 'ka+': 'like', 'ta+': 'by (oath)', 'Al+': 'the', 'sa+': 'will (soon)', 'ya+': 'O', 'ha+': 'O',
      'w:CONJ+': 'and', 'w:REM+': 'and', 'w:CIRC+': 'while', 'w:COM+': 'with', 'w:P+': 'by (oath)', 'f:CONJ+': 'then', 'f:REM+': 'so / then',
      'f:RSLT+': 'then', 'f:CAUS+': 'because', 'l:P+': 'for', 'l:EMPH+': 'surely', 'l:PRP+': 'so that', 'l:IMPV+': 'let (command)', 'A:EQ+': 'whether', 'A:INTG+': 'is it?' });
    const B = { nasara: 'Nasara', daraba: 'Daraba', fataha: 'Fataha', samia: 'Sami\'a', karuma: 'Karuma', hasiba: 'Hasiba', I: 'Thulathi mujarrad',
      II: 'Taf\'il', III: 'Mufa\'ala', IV: 'If\'al', V: 'Tafa\'\'ul', VI: 'Tafa\'ul', VII: 'Infi\'al', VIII: 'Ifti\'al', IX: 'If\'ilal', X: 'Istif\'al', XI: 'If\'ilal', XII: 'If\'i\'al' };
    for (const k in B) if (BAB[k]) BAB[k][0] = B[k];
    PERSON[1][0] = 'First person (I / we)'; PERSON[2][0] = 'Second person (you)'; PERSON[3][0] = 'Third person (he / they)';
    GENDER.M[0] = 'Masculine'; GENDER.F[0] = 'Feminine';
    NUMBER.S[0] = 'Singular'; NUMBER.D[0] = 'Dual (two)'; NUMBER.P[0] = 'Plural';
    Object.assign(ZAMIR_GU, { '3MS': 'his / him', '3FS': 'her', '3MD': 'of them both', '3FD': 'of them both', '3D': 'of them both', '3MP': 'their / them',
      '3FP': 'their (women)', '2MS': 'your / you', '2FS': 'your (woman)', '2MD': 'of you both', '2FD': 'of you both', '2D': 'of you both',
      '2MP': 'your / you (all)', '2FP': 'your (women)', '1S': 'my / me', '1P': 'our / us' });
  }

  const IRAB_EN = { NOM: ['Marfu\'','مَرْفُوع', 'with damma ( ـُـ )'], ACC: ['Mansub', 'مَنْصُوب', 'with fatha ( ـَـ )'], GEN: ['Majrur', 'مَجْرُور', 'with kasra ( ـِـ )'],
    SUBJ: ['Mansub', 'مَنْصُوب', 'with fatha ( ـَـ )'], JUS: ['Majzum', 'مَجْزُوم', 'with sukun ( ـْـ )'] };

  // English meaning of one sigah from the verb's [base, past] (data/lexen.json): "they believe", "she believed", "believe! (you)"
  const PRON_EN = ['he', 'they both', 'they', 'she', 'they both (f)', 'they (f)', 'you', 'you both', 'you all', 'you (f)', 'you both (f)', 'you all (f)', 'I', 'we'];
  function sigahEn(v, t, k) {
    if (!Array.isArray(v) || !v[0]) return '';
    const [base, past] = v, w = base.split(' '), w0 = w[0], rest = w.slice(1).join(' ');
    if (t === 'madi') return `${PRON_EN[k]} ${w0 === 'be' ? (k === 0 || k === 3 || k === 12 ? 'was' : 'were') + (rest ? ' ' + rest : '') : past || base}`;
    if (t === 'amr') return k >= 6 && k <= 11 ? `${base}! (${PRON_EN[k].replace(' (f)', ', f')})` : `let ${k === 12 ? 'me' : k === 13 ? 'us' : PRON_EN[k] === 'he' ? 'him' : PRON_EN[k] === 'she' ? 'her' : 'them'} ${base}`;
    // mudari': he / she take the -s form
    if (w0 === 'be') return `${PRON_EN[k]} ${k === 12 ? 'am' : k === 0 || k === 3 ? 'is' : 'are'}${rest ? ' ' + rest : ''}`;
    if (k !== 0 && k !== 3) return `${PRON_EN[k]} ${base}`;
    const s = w0 === 'have' ? 'has' : w0 === 'do' ? 'does' : w0 === 'go' ? 'goes' : /(?:s|sh|ch|x|z|o)$/.test(w0) ? w0 + 'es' : /[^aeiou]y$/.test(w0) ? w0.slice(0, -1) + 'ies' : w0 + 's';
    return `${PRON_EN[k]} ${s}${rest ? ' ' + rest : ''}`;
  }

  function pgnText(g) {
    const m = String(g || '').match(/^([123])?([MF])?([SDP])?$/);
    if (!m) return [];
    return [m[1] && PERSON[m[1]], m[2] && GENDER[m[2]], m[3] && NUMBER[m[3]]].filter(Boolean);
  }

  const tile = (label, ar, value, sub) => `<div class="gt"><span class="gl">${label}${ar ? ` <bdi>${esc(ar)}</bdi>` : ''}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

  /** One corpus word: its parts and every grammar point, laid out as tiles. */
  function gramWordHtml(segs, part, M, guHint) {
    const pre = segs.filter(x => x.k === 'p'), stem = segs.find(x => x.k === 'x') || segs[0], suf = segs.filter(x => x.k === 's');
    // on a verb, an ending that is not ـه / ـك / ـي / ـنِي is the doer (یَعۡلَمُ + ونَ = they), the rest are objects (رَزَقۡنٰ + هُمۡ = them)
    const isDoer = x => stem.t === 'V' && x.k === 's' && /^PRON:/.test(x.c || '') && !/^[هكي]|^ن[ِي]/.test(M.normAr(x.f));
    const chip = (x, cls) => {
      const code = x.c || '';
      const p = code.replace('PRON:', '');
      const gu = x.k === 'p' ? (PREFIX_GU[code] || (KIND[x.t] || [''])[0])
        : x.k === 's' ? (isDoer(x) ? L('કર્તા: ', 'doer: ') + (pgnText(p).map(y => y[0].split(' (')[0]).join(' ') || p) : (ZAMIR_GU[p] || (code === '+n:EMPH' ? L('તાકીદ (ચોક્કસ)', 'emphasis (surely)') : ''))) : '';
      return `<span class="gp ${cls}"><bdi>${esc(x.f)}</bdi><small>${esc(gu)}</small></span>`;
    };
    // a lone وَ / فَ written apart in this mushaf: explain that particle only
    const main = part === 'pre' && pre.length ? pre[pre.length - 1] : stem;
    const kind = KIND[main.t] || ['', '', 'ism'];
    const kindName = EN() ? (kind[2] === 'fel' ? 'Fi\'l · Verb' : kind[2] === 'harf' ? 'Harf · Particle' : 'Ism · Noun')
      : kind[2] === 'fel' ? 'ફેલ · Fe\'l' : kind[2] === 'harf' ? 'હર્ફ · Harf' : 'ઇસ્મ · Ism';
    const kindAr = kind[2] === 'fel' ? 'فِعْل' : kind[2] === 'harf' ? 'حَرْف' : 'اِسْم';
    let sub = kind[0];
    let subAr0 = kind[1];
    if (main.t === 'V' && main.a) {
      sub = (EN() ? { PERF: 'Fi\'l mazi (past: done)', IMPF: 'Fi\'l muzare (present / future)', IMPV: 'Fi\'l amr (command)' }
        : { PERF: 'ફેલે માઝી (થઈ ગયેલું કામ)', IMPF: 'ફેલે મુઝારેઅ (થાય છે / થશે)', IMPV: 'ફેલે અમ્ર (હુકમ)' })[main.a];
      subAr0 = { PERF: 'فِعْل مَاضٍ', IMPF: 'فِعْل مُضَارِع', IMPV: 'فِعْل أَمْر' }[main.a];
    }
    if (main.pc === 'ACT') sub = L('ઇસ્મે ફાઇલ (કરનાર)', 'Ism fa\'il (active participle: the doer)');
    if (main.pc === 'PASS') sub = L('ઇસ્મે મફઊલ (જેના પર કામ થયું)', 'Ism maf\'ul (passive participle: the one acted on)');
    if (main.vn) sub = L('મસ્દર (ક્રિયાનું નામ)', 'Masdar (verbal noun)');
    const subAr = main.pc === 'ACT' ? 'اِسْم فَاعِل' : main.pc === 'PASS' ? 'اِسْم مَفْعُول' : main.vn ? 'مَصْدَر' : subAr0;

    const tiles = [];
    if (main.r) tiles.push(tile(L('મૂળ · Root', 'Root'), 'جَذْر', `<bdi class="arv">${esc([...main.r].join(' '))}</bdi>`));
    // only when the word's baab is known (a derived form, or a sulasi verb whose vowels show nasara / daraba …)
    if (main.b && main.b !== 'I' && BAB[main.b]) tiles.push(tile(L('બાબ · Baab', 'Baab (verb form)'), 'بَاب', esc(BAB[main.b][0]), `<bdi>${esc(BAB[main.b][1])}</bdi>`));
    if (main.ms) tiles.push(tile(L('મસ્દર · Masdar', 'Masdar'), 'مَصْدَر', `<bdi class="arv">${esc(main.ms)}</bdi>`));
    if (main.a) {
      const T = (EN() ? { PERF: ['Mazi (past)', 'اَلْمَاضِي'], IMPF: ['Muzare (present / future)', 'اَلْمُضَارِع'], IMPV: ['Amr (command)', 'اَلْأَمْر'] }
        : { PERF: ['માઝી (ભૂતકાળ)', 'اَلْمَاضِي'], IMPF: ['મુઝારેઅ (વર્તમાન / ભવિષ્ય)', 'اَلْمُضَارِع'], IMPV: ['અમ્ર (હુકમ)', 'اَلْأَمْر'] })[main.a];
      tiles.push(tile(L('ઝમાનો · Tense', 'Tense'), '', esc(T[0]), `<bdi>${T[1]}</bdi>`));
      tiles.push(tile(L('મઅલૂમ / મજહૂલ', 'Active / Passive'), '', main.v === 'PASS' ? L('મજહૂલ (કર્તા છુપો)', 'Majhul (passive: doer hidden)') : L('મઅલૂમ (કર્તા જાહેર)', 'Ma\'lum (active: doer known)'), `<bdi>${main.v === 'PASS' ? 'مَجْهُول' : 'مَعْلُوم'}</bdi>`));
    }
    if (main.t === 'V' && SIGAH_NO[main.g]) {
      const pg = pgnText(main.g);
      tiles.push(tile(L('સીગો · Sigah', 'Sigah'), 'صِيغَة', `${L('નંબર', 'No.')} ${SIGAH_NO[main.g]}`, esc(pg.map(x => x[0].split(' (')[0]).join(' · '))));
    } else if (main.g && kind[2] !== 'harf') {
      const pg = pgnText(main.g);
      if (pg.length) tiles.push(tile(L('લિંગ / વચન', 'Gender / Number'), '', esc(pg.map(x => x[0]).join(' · ')), `<bdi>${pg.map(x => x[1]).join(' · ')}</bdi>`));
    }
    // i'rab: case of a noun, mood of a present-tense verb
    let irab = null;
    if (main.c && /NOM|ACC|GEN/.test(main.c) && main.k === 'x') irab = EN() ? IRAB_EN[main.c] : { NOM: ['મરફૂઅ', 'مَرْفُوع', 'પેશ ( ـُـ ) વાળું'], ACC: ['મન્સૂબ', 'مَنْصُوب', 'ઝબર ( ـَـ ) વાળું'], GEN: ['મજરૂર', 'مَجْرُور', 'ઝેર ( ـِـ ) વાળું'] }[main.c];
    if (main.a === 'IMPF') irab = EN() ? IRAB_EN[main.m] || IRAB_EN.NOM : { SUBJ: ['મન્સૂબ', 'مَنْصُوب', 'ઝબર ( ـَـ ) વાળું'], JUS: ['મજઝૂમ', 'مَجْزُوم', 'જઝમ ( ـْـ ) વાળું'] }[main.m] || ['મરફૂઅ', 'مَرْفُوع', 'પેશ ( ـُـ ) વાળું'];
    if (irab) tiles.push(tile(L('એ\'અરાબ · E\'rab', 'I\'rab (case)'), 'إِعْرَاب', esc(irab[0]), `<bdi>${irab[1]}</bdi> · ${irab[2].replace(/ـ[ًٌٍَُِّْ]ـ/, '<bdi>$&</bdi>')}`));
    if (kind[2] === 'ism' && main.t !== 'PRON' && main.t !== 'DEM' && main.t !== 'REL') {
      const def = pre.some(x => x.t === 'DET') || main.t === 'PN';
      if (main.k === 'x' && (def || main.nd)) tiles.push(tile(L('મઅરિફા / નકિરહ', 'Definite / Indefinite'), '', def ? L('મઅરિફા (ચોક્કસ)', 'Ma\'rifa (definite)') : L('નકિરહ (સામાન્ય)', 'Nakira (indefinite)'), `<bdi>${def ? 'مَعْرِفَة' : 'نَكِرَة'}</bdi>`));
    }
    if (main.sp) tiles.push(tile(L('સમૂહ', 'Family'), '', `<bdi class="arv">${esc(main.sp)}</bdi>`, L('અખવાત (એ જ પ્રકારના શબ્દો)', 'Sisters (words of the same kind)')));
    // how often the word comes, and a way to every word of its root
    const lx = LEX && main.l && LEX.byLemma.get(main.l + '|' + (main.r || ''));
    if (lx) tiles.push(tile(L('કુરઆનમાં · Count', 'In the Quran'), '', `${num(lx[3])} ${L('વાર', 'times')}`, L(`વધારે આવતા શબ્દોમાં નંબર ${lx.rank}`, `No. ${lx.rank} among the most frequent words`)));
    const fam = main.r && LEX && LEX.byRoot.get(main.r);
    const verbs = fam ? fam.filter(e => e[2] === 'V') : [];
    const sigahBtn = verbs.length && [...main.r].length === 3 && window.Sarf && window.Sarf.conj
      ? `<button class="g-rootlink g-sigah" data-sigah="${esc(main.r)}|${esc(main.t === 'V' ? main.l : '')}|${main.t === 'V' ? main.a || '' : ''}|${main.t === 'V' ? SIGAH_NO[main.g] || '' : ''}">
        <span class="sg-ic">14</span><span><b>Sigah Table${L(' · સીગા ટેબલ', '')}</b><small>${L('માઝી · મુઝારેઅ · અમ્ર — ગુજરાતી અર્થ સાથે', 'Mazi · Muzare · Amr — with English meaning')}${verbs.length > 1 ? ` · ${verbs.length} ${L('બાબ', 'forms')}` : ''}</small></span>${ICON.chev}</button>` : '';
    const rootLink = (fam ? `<a class="g-rootlink" href="${rootHref(main.r, main.l)}"><bdi>${esc(rootAr(main.r))}</bdi>
      <span><b>${L('આ મૂળના બધા શબ્દો જુઓ', 'See all words of this root')}</b><small>${L(`${fam.length} શબ્દો · કુરઆનમાં ${num(LEX.rootCount(main.r))} વાર`, `${fam.length} words · ${num(LEX.rootCount(main.r))} times in the Quran`)}</small></span>${ICON.chev}</a>` : '') + sigahBtn;

    // meaning: the ayah's own translation, the dictionary, and the sigah built from it
    const lem = main.l ? M.normAr(main.l).replace(/\s/g, '') : '';
    const dict = lem ? (M.HEAD.get(lem) || [])[0] : null;
    const vBase = main.t === 'V' ? LEX_FIX[main.l] || (dict && dict.pos === 'v' && dict.gu) || VERB_GU[main.l + '|' + (main.r || '')] || (dict && dict.gu) : '';
    const tns = { PERF: 'madi', IMPF: 'mudari', IMPV: 'amr' }[main.a];
    // English mode: the lemma's English, and the sigah built from its [base, past]
    const enL = EN() && main.l ? lexEnOf(main.l, main.t) : null;
    const sg = EN() ? (main.t === 'V' && SIGAH_NO[main.g] && main.v !== 'PASS' ? sigahEn(enL, tns, SIGAH_NO[main.g] - 1) : '')
      : vBase && SIGAH_NO[main.g] ? sigahGu(vBase, tns, SIGAH_NO[main.g] - 1) : '';
    const meaning = [
      guHint ? `<div class="gm"><span>${L('આ આયતમાં અર્થ', 'Meaning in this ayah')}</span><b>${esc(guHint)}</b></div>` : '',
      EN() ? (enL ? `<div class="gm"><span>Dictionary meaning</span><b>${esc(Array.isArray(enL) ? (enL[0] ? 'to ' + enL[0] : enL[1]) : enL)}</b></div>` : '')
        : dict ? `<div class="gm"><span>શબ્દકોશ (Al-Miftah)</span><b>${esc(dict.gu)}</b></div>` : '',
      sg ? `<div class="gm hl"><span>${L('આ સીગાનો અર્થ', 'Meaning of this sigah')}</span><b>${esc(sg)}</b></div>` : ''
    ].join('');

    return `
      <div class="g-parts">${[...pre.map(x => chip(x, part === 'rest' ? 'dim' : 'pre')), part === 'pre' ? '' : chip(stem, 'stem'), ...suf.map(x => chip(x, 'suf'))].filter(Boolean).join('<span class="plus">+</span>')}</div>
      <div class="g-kind ${kind[2]}"><div><b>${kindName}</b> <bdi>${kindAr}</bdi></div><span>${esc(sub)} · <bdi>${esc(subAr)}</bdi></span>
        ${main.l && kind[2] !== 'harf' ? `<small>${L('મૂળ શબ્દ (લેમ્મા)', 'Base word (lemma)')}: <bdi>${esc(main.l)}</bdi></small>` : ''}</div>
      ${tiles.length ? `<div class="g-tiles">${tiles.join('')}</div>` : ''}
      ${rootLink}
      ${main === stem && main.t !== 'PN' && window.Sarf ? window.Sarf.html(main, segs) : ''}
      ${meaning ? `<div class="g-mean">${meaning}</div>` : ''}`;
  }

  async function openAnalysis(word, guHint, back, at) {
    openSheet(`<div class="hint">Loading grammar…</div>`);
    let M = null, g = null;
    try { [M, g] = await Promise.all([loadMiftah(), at ? loadGram(at.s) : null, loadLex()]); } catch (e) { }
    const link = g && g[at.n - 1] && g[at.n - 1][at.i];
    let body;
    if (link) {
      const place = window.Irab ? window.Irab.html(g[at.n - 1], arT, g[at.n - 2], at.i) : '';
      body = link.w.map(segs => gramWordHtml(segs, link.p, M, guHint)).join('<div class="g-sep"></div>') +
        (place ? `<div class="sec">${L('વાક્યમાં સ્થાન · એ\'અરાબ', 'Place in the sentence · I\'rab')} <bdi>إِعْرَاب</bdi></div>${place}` : '');
    } else body = '<div class="hint">No grammar for this word.</div>';
    const pron = WORD_BY_AR && WORD_BY_AR.get(normAr(word));
    openSheet(`
      ${back ? `<button class="an-back" id="anBack">${ICON.chev} Word by word</button>` : ''}
      <div class="an-word"><bdi>${esc(arT(word))}</bdi></div>
      ${pron ? `<div class="an-head"><span>${esc(pron.lat)}</span></div>` : ''}
      ${body}
      <div class="mt-note">Grammar: Quranic Arabic Corpus (corpus.quran.com) · Sarf: Arabic Sarf Lessons 18–29 · Meaning: ${L('Al-Miftah & this app\'s Gujarati translation', 'Quranic word-by-word English')}</div>`, sh => {
      const b = $('#anBack', sh);
      if (b) b.onclick = back;
      $$('[data-sigah]', sh).forEach(x => x.onclick = () => {
        const [r, l, a, k] = x.dataset.sigah.split('|');
        openSigah(r, l, a || 'PERF', Number(k) || 0, () => openAnalysis(word, guHint, back, at), M);
      });
    });
  }

  // ---------------------------------------------------------------- sigah table (gardaan) of a verb, in each baab its root has in the Quran
  const PRON_AR = ['هُوَ', 'هُمَا', 'هُمْ', 'هِيَ', 'هُمَا', 'هُنَّ', 'أَنْتَ', 'أَنْتُمَا', 'أَنْتُمْ', 'أَنْتِ', 'أَنْتُمَا', 'أَنْتُنَّ', 'أَنَا', 'نَحْنُ'];
  const SIGAH_G = ['3MS', '3MD', '3MP', '3FS', '3FD', '3FP', '2MS', '2MD', '2MP', '2FS', '2FD', '2FP', '1S', '1P'];
  const TENSES = [['PERF', L('માઝી', 'Mazi'), 'اَلْمَاضِي', 'madi'], ['IMPF', L('મુઝારેઅ', 'Muzare'), 'اَلْمُضَارِع', 'mudari'], ['IMPV', L('અમ્ર', 'Amr'), 'اَلْأَمْر', 'amr']];
  function openSigah(root, lemma, tense, sig, back, M) {
    const verbs = ((LEX && LEX.byRoot.get(root)) || []).filter(e => e[2] === 'V');
    if (!verbs.length) return;
    let cur = verbs.find(e => e[0] === lemma) || verbs[0], t = tense;
    // Al-Miftah's verb entry: its meaning, and its baab / masdar where the Quran data has none
    const dictOf = e => {
      const ds = M ? M.HEAD.get(M.normAr(e[0].replace(/ٰ(?![ىيۦ])/g, 'ا')).replace(/\s/g, '')) || [] : [];
      // أَمِنَ and ءَامَنَ look the same without harakat: take the entry of the same kind of baab
      const sulasi = x => !x.bab || ['nasara', 'daraba', 'fataha', 'samia', 'karuma', 'hasiba'].includes(x.bab);
      const one = /^(I|nasara|daraba|fataha|samia|karuma|hasiba)$/.test(e[6] || 'I');
      return ds.find(x => x.pos === 'v' && sulasi(x) === one) || null;
    };
    // the dictionary's meaning, else the word the app's translation uses most for it
    const meanOf = e => EN() ? lexGu(e) : LEX_FIX[e[0]] || (dictOf(e) || {}).gu || verbGu(e) || e[5] || '';
    const babOf = e => {
      const b = e[6] || 'I', d = dictOf(e);
      return b === 'I' && d && ['nasara', 'daraba', 'fataha', 'samia', 'karuma', 'hasiba'].includes(d.bab) ? d.bab : b;
    };
    const masdarOf = e => (dictOf(e) || {}).masdar || e[7] || window.Sarf.masdar(root, babOf(e)) || '';
    const babName = e => { const b = babOf(e); return BAB[b] ? BAB[b][0] : b; };
    const draw = sh => {
      const T = TENSES.find(x => x[0] === t), gu = meanOf(cur), mine = cur[0] === lemma, b = babOf(cur);
      const ms = masdarOf(cur);
      const line = [[window.Sarf.conj(root, b, 'PERF', 1, cur[0]), L('માઝી', 'Mazi')], [window.Sarf.conj(root, b, 'IMPF', 1, cur[0]), L('મુઝારેઅ', 'Muzare')],
        [ms, L('મસ્દર', 'Masdar')], [window.Sarf.conj(root, b, 'IMPV', 7, cur[0]), L('અમ્ર', 'Amr')]];
      const rows = SIGAH_G.map((g, k) => {
        const ar = window.Sarf.conj(root, b, t, k + 1, cur[0]);
        if (!ar) return '';
        const pg = pgnText(g).map(x => `<i>${esc(x[0].split(' (')[0])}</i>`).join('');
        const m = EN() ? sigahEn(lexEnOf(cur[0], 'V'), T[3], k) : gu ? sigahGu(gu, T[3], k) : '';
        return `<div class="sgt-row${mine && t === tense && k + 1 === sig ? ' on' : ''}">
          <span class="sgt-n">${k + 1}</span>
          <div class="sgt-p"><span class="sgt-pg">${pg}</span><bdi>${PRON_AR[k]}</bdi></div>
          <div class="sgt-w"><bdi class="sgt-ar">${esc(ar)}</bdi></div>${m ? `<div class="sgt-m">${esc(m)}</div>` : ''}</div>`;
      }).join('');
      sh.innerHTML = `<div class="grip"></div>
        <button class="an-back" id="sgBack">${ICON.chev} Grammar</button>
        <h3>Sigah Table${L(' · સીગા ટેબલ', '')} <bdi class="sgt-root">${esc(rootAr(root))}</bdi></h3>
        ${verbs.length > 1 ? `<div class="sec">${L(`આ મૂળ કુરઆનમાં ${verbs.length} બાબમાં આવે છે — બાબ પર ટચ કરો`, `This root comes in ${verbs.length} verb forms (baab) in the Quran — tap one`)}</div>` : ''}
        <div class="sgt-babs">${verbs.map((e, i) => `<button data-bi="${i}" class="${e === cur ? 'on' : ''}"><bdi>${esc(lemAr(e[0]))}</bdi>${meanOf(e) ? `<span class="sgt-bm">${esc(String(meanOf(e)).split(/\s*[\/,;]\s*/)[0])}</span>` : ''}<small>${esc(babName(e))} · ${num(e[3])} ${L('વાર', 'times')}</small></button>`).join('')}</div>
        <div class="sgt-line">
          <div class="sgt-lh"><b>${L('બાબ', 'Baab')} ${esc(babName(cur))}</b>${BAB[b] ? ` <bdi>${esc(BAB[b][1])}</bdi>` : ''}${gu ? `<span>${L('અર્થ', 'Meaning')}: <b>${esc(gu)}</b></span>` : ''}</div>
          <div class="sgt-lw">${line.filter(x => x[0]).map(([ar, l]) => `<div><bdi>${esc(arT(ar))}</bdi><small>${l}</small></div>`).join('')}</div>
          ${ms ? '' : `<div class="sgt-ln">${L('આ બાબનો મસ્દર કુરઆન / શબ્દકોશમાં મળ્યો નથી', 'The masdar of this form is not in the Quran / dictionary')}</div>`}
        </div>
        <div class="seg sgt-seg">${TENSES.map(x => `<button data-t="${x[0]}" class="${x[0] === t ? 'on' : ''}"><b>${x[1]}</b> <bdi>${x[2]}</bdi></button>`).join('')}</div>
        ${t === 'IMPV' ? `<div class="sub">${L('હાઝિર (7 – 12) માં સીધો અમ્ર; ગાઇબ અને મુતકલ્લિમ માં શરૂઆતમાં <bdi>لِ</bdi> (લામે અમ્ર) લાગે છે', 'Direct command for “you” (7 – 12); for he / they / I / we the command takes <bdi>لِ</bdi> (lam of command) in front')}</div>` : t === 'IMPF' ? `<div class="sub">${L('મરફૂઅ (સામાન્ય) રૂપ — لَنْ પછી મન્સૂબ અને لَمْ પછી મજઝૂમ થાય', 'The marfu\' (normal) form — after لَنْ it becomes mansub, after لَمْ majzum')}</div>` : ''}
        <div class="sgt">${rows}</div>
        <div class="mt-note">${L('આ રૂપ બાબ અને સર્ફના નિયમોથી બનાવ્યાં છે — કુરઆનમાં બધા સીગા આવતા નથી.', 'These forms are built from the baab and the rules of sarf — not every sigah comes in the Quran.')} ${mine && t === tense && sig ? L('લીલી લાઇન = આયતમાંનો શબ્દ.', 'Green line = the word in the ayah.') : ''}</div>`;
      $('#sgBack', sh).onclick = back;
      $$('[data-bi]', sh).forEach(b => b.onclick = () => { cur = verbs[Number(b.dataset.bi)]; draw(sh); });
      $$('[data-t]', sh).forEach(b => b.onclick = () => { t = b.dataset.t; draw(sh); });
      // each meaning stays on one line: a long one gets a slightly smaller font
      requestAnimationFrame(() => $$('.sgt-m', sh).forEach(el => {
        for (let fs = 15; fs > 11 && el.scrollWidth > el.clientWidth; fs -= .5) el.style.fontSize = fs - .5 + 'px';
      }));
      const on = $('.sgt-row.on', sh);
      if (on) setTimeout(() => on.scrollIntoView({ block: 'center' }), 50);
    };
    openSheet('', draw);
  }

  function refreshBm(card, s, n) {
    if (!card) return;
    const b = $('[data-act="bm"]', card), bms = bmsOf(s, n);
    b.classList.toggle('on', bms.length > 0);
    b.style.color = bms.length ? tabColor(bms[0].t) : '';
    card.classList.toggle('bmk', bms.length > 0);
  }

  async function ayahText(s, n) {
    const d = await loadSurah(s), a = d.ayahs[n - 1];
    return { ar: a[arFont().script] || a[0], gu: a[2], tr: a[3] };
  }
  async function shareText(s, n) {
    const t = await ayahText(s, n);
    return `${t.ar}\n\n${t.gu}\n\n— ${sm(s).en} (${s}:${n})`;
  }

  function openAyahSheet(s, n) {
    openSheet(`
      <h3>${esc(sm(s).en)} · Ayah ${n}</h3>
      <div class="sub">${EN() ? '' : esc(sm(s).gu) + ' '}${s}:${n}</div>
      <div class="act-list">
        <button data-a="play">${ICON.playO} Play from here</button>
        <button data-a="loop">${ICON.repeat} Repeat this ayah</button>
        <button data-a="bm">${ICON.bm} Save to Collection</button>
        <button data-a="copy">${ICON.copy} Copy</button>
        <button data-a="share">${ICON.share} Share Ayat Text</button>
        <button data-a="shareAudio">${ICON.head} Share Ayat Audio</button>
        <button data-a="shareImg">${ICON.image} Share Ayat Image</button>
        <button data-a="note">${ICON.edit} ${NOTES[`${s}:${n}`] ? 'Edit my note' : 'Add my note'}</button>
        <button data-a="report">${ICON.flag} Report a mistake in this ayah</button>
      </div>`, sh => {
      sh.onclick = async e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'play') { closeSheet(); playAyah(s, n); }
        else if (a === 'loop') openLoopSheet(s, n);
        else if (a === 'bm') openBmSheet(s, n, () => refreshBm(document.getElementById(`a-${s}-${n}`), s, n));
        else if (a === 'copy') { N.copy(await shareText(s, n), 'Copied'); closeSheet(); }
        else if (a === 'share') { N.share(await shareText(s, n)); closeSheet(); }
        else if (a === 'shareImg') shareImage(s, n);
        else if (a === 'note') openNoteSheet(s, n);
        else if (a === 'report') openReport({ s, n });
        else if (a === 'shareAudio') {
          const name = sm(s).en.replace(/[^\w -]/g, '');
          // the MP3 of the ayah itself (the Bismillah before ayah 1 is a file of its own);
          // the Lite APK downloads just this ayah first when its surah is not on the phone
          const caption = `${sm(s).en} (${s}:${n}) — Noor-e-Quran`;
          closeSheet();
          if (!N.shareAyah) { N.shareAudio(`${p3(s)}${p3(n)}`, `${name} ${s}-${n}`, caption); return; }
          if (!HAS_AUDIO && !DLS[s]) toast(L(`Ayah ${n} નો અવાજ ડાઉનલોડ થાય છે…`, `Downloading the audio of Ayah ${n}…`));
          const r = await nativeCall('shareAyah', s, n, `${name} ${s}-${n}`, caption);
          if (!r || !r.ok) toast(L('અવાજ ડાઉનલોડ ન થયો — ઇન્ટરનેટ તપાસો', 'Audio did not download — check the internet'));
        }
      };
    });
  }

  function openLoopSheet(s, n) {
    openSheet(`
      <h3>How many times to hear Ayah ${n}?</h3>
      <div class="sub">${esc(sm(s).en)} — starts as soon as you choose</div>
      ${chips('loop', [[1, '1x'], [2, '2x'], [3, '3x'], [5, '5x'], [7, '7x'], [10, '10x'], [20, '20x'], [0, '∞ Loop']], '')}`, sh => {
      bindChips(sh, 'loop', v => {
        closeSheet();
        P.range = { s, from: n, to: n, times: Number(v) };
        P.rangeRep = 0;
        playAyah(s, n, true);
        toast(`Ayah ${n} — ${repLabel(v)} times`);
      });
    });
  }

  /** "Do you want to delete this bookmark?" (with the Gujarati) before a bookmark goes. */
  function askDeleteBm(b, yes, no) {
    const t = tabOf(b.t);
    openSheet(`<h3>Do you want to delete this bookmark?</h3>
      ${EN() ? '' : '<div class="sub gu" style="font-size:15px">શું તમે આ બુકમાર્ક ડિલીટ કરવા માંગો છો?</div>'}
      <div class="sub">${esc(sm(b.s).en)} · Ayah ${b.n}${t ? ' · ' + esc(t.name) : ''}${b.name ? ' · ' + esc(b.name) : ''}</div>
      <div style="display:flex;gap:8px"><button class="btn" id="yes" style="flex:1;background:#B4432C">${ICON.trash} ${L('હા, ડિલીટ', 'Yes, delete')}</button>
        <button class="btn ghost" id="no" style="flex:1">${L('ના', 'No')}</button></div>`, sh => {
      $('#yes', sh).onclick = yes;
      $('#no', sh).onclick = no;
    });
  }

  /** Lets the reader put one ayah into any of their bookmark tabs (Home, Class, ...). */
  function openBmSheet(s, n, after, done) {
    const draw = sh => {
      const mine = bmsOf(s, n);
      const note = (mine[0] && mine[0].note) || '';
      sh.innerHTML = `<div class="grip"></div>
        <h3>Save to Collection · ${esc(sm(s).en)} ${s}:${n}</h3>
        <div class="sub">${L('આ આયત કયા Collection માં સાચવવી છે? (એક કરતાં વધારે પણ પસંદ કરી શકો)', 'Which Collection to save this ayah in? (you can pick more than one)')}</div>
        <div class="tab-pick">${TABS.map(t => {
          const on = mine.some(b => b.t === t.id);
          return `<button class="tp ${on ? 'on' : ''}" data-t="${t.id}" style="--c:${TAB_COLORS[t.c % TAB_COLORS.length]}">
            <span class="box">${on ? ICON.check : ''}</span><span class="nm">${esc(t.name)}</span>
            <span class="cnt">${BM.filter(b => b.t === t.id).length}</span></button>`;
        }).join('')}
          <button class="tp add" data-new>${ICON.plus}<span class="nm">New Collection</span></button></div>
        <div class="sec">Note (optional)</div>
        <textarea class="note-input" id="bmNote" rows="2" placeholder="e.g. taught on Friday">${esc(note)}</textarea>
        <button class="btn block" id="bmDone" style="margin-top:12px">Done</button>`;
      $$('[data-t]', sh).forEach(b => b.onclick = () => {
        const id = b.dataset.t, has = BM.find(x => x.s === s && x.n === n && x.t === id);
        if (has) {
          // taking a bookmark out asks first; either way the Collection list comes back
          askDeleteBm(has, () => { BM = BM.filter(x => x !== has); saveBm(); after && after(); openSheet('', draw); }, () => openSheet('', draw));
          return;
        }
        BM.unshift({ s, n, t: id, at: Date.now(), note: $('#bmNote', sh).value.trim() });
        saveBm(); after && after(); draw(sh);
      });
      $('[data-new]', sh).onclick = () => newTabPrompt(id => {
        BM.unshift({ s, n, t: id, at: Date.now(), note: '' }); saveBm(); after && after(); openSheet('', draw);
      });
      $('#bmDone', sh).onclick = () => {
        const v = $('#bmNote', sh).value.trim();
        BM.forEach(x => { if (x.s === s && x.n === n) x.note = v; });
        saveBm(); closeSheet(); after && after();
        if (bmsOf(s, n).length) toast(L('Collection માં સચવાઈ ગઈ', 'Saved to Collection'));
        if (done) done();
      };
    };
    openSheet('', draw);
  }

  function newTabPrompt(done, existing) {
    openSheet(`
      <h3>${existing ? 'Rename Collection' : 'New Collection'}</h3>
      <div class="sub">${L('દા.ત. Sabr ni Aayat, Dua, Bachcha mate, Ramadan', 'e.g. Ayahs of Sabr, Dua, For Children, Ramadan')}</div>
      <input class="note-input" id="tabName" maxlength="24" placeholder="Collection name" value="${esc(existing ? existing.name : '')}">
      <div class="sec">Colour</div>
      <div class="colors">${TAB_COLORS.map((c, i) => `<button data-c="${i}" class="${(existing ? existing.c : TABS.length) % TAB_COLORS.length === i ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      <button class="btn block" id="tabSave" style="margin-top:16px">${existing ? 'Save' : 'Create Collection'}</button>`, sh => {
      let c = (existing ? existing.c : TABS.length) % TAB_COLORS.length;
      $('.colors', sh).onclick = e => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        c = Number(b.dataset.c);
        $$('.colors button', sh).forEach(x => x.classList.toggle('on', x === b));
      };
      setTimeout(() => $('#tabName', sh).focus(), 250);
      $('#tabSave', sh).onclick = () => {
        const name = $('#tabName', sh).value.trim();
        if (!name) { toast('Please type a name'); return; }
        if (existing) { existing.name = name; existing.c = c; saveTabs(); done(existing.id); return; }
        const id = 't' + Date.now().toString(36);
        TABS.push({ id, name, c }); saveTabs();
        done(id);
      };
    });
  }

  function fontRows() {
    const label = EN() ? { ar: 'Arabic', gu: 'English translation', tr: 'English transliteration' }
      : { ar: 'Arabic', gu: 'Gujarati translation', tr: 'Gujarati transliteration' };
    const sample = {
      ar: `<div class="ar-text" style="padding:0">${esc(arT(BISM[arFont().script]))}</div>`,
      gu: `<div class="gu-text" style="margin:0;padding:0;border:0;display:block">${L('અલ્લાહના નામથી જે ઘણો મહેરબાન, બહુજ રહેમ કરવાવાળો છે.', 'In the Name of Allah, the All-beneficent, the All-merciful.')}</div>`,
      tr: `<div class="tr-text" style="margin:0;display:block">${L('બિસ્મિલ્લાહિર રહ૽્માનિર રહ૽ીમ', 'Bismi Allahi alrrahmani alrraheemi')}</div>`
    };
    return ['ar', 'gu', 'tr'].map(k => {
      const [min, max] = FS_RANGE[k];
      return `<div class="font-row" data-fs="${k}">
        <div class="hd"><b>${label[k]}</b><span>${S.fs[k]}px</span></div>
        <div class="ctl"><button data-d="-1">A−</button><input type="range" min="${min}" max="${max}" step="1" value="${S.fs[k]}"><button data-d="1">A+</button></div>
        <div class="pv">${sample[k]}</div></div>`;
    }).join('');
  }

  function bindFontRows(root) {
    $$('.font-row', root).forEach(row => {
      const k = row.dataset.fs, input = $('input', row), label = $('.hd span', row);
      const set = v => {
        const [min, max] = FS_RANGE[k];
        S.fs[k] = Math.max(min, Math.min(max, v));
        input.value = S.fs[k]; label.textContent = S.fs[k] + 'px';
        document.documentElement.style.setProperty('--fs-' + k, S.fs[k] + 'px');
        saveSettings();
      };
      input.oninput = () => set(Number(input.value));
      $$('button[data-d]', row).forEach(b => b.onclick = () => set(S.fs[k] + Number(b.dataset.d)));
    });
  }

  const showRows = () => `
    <div class="s-row"><div class="main"><div class="t">Gujarati transliteration</div><div class="d">Arabic pronunciation in Gujarati letters</div></div>${sw('dTr', S.showTr)}</div>
    <div class="s-row"><div class="main"><div class="t">Gujarati translation</div><div class="d">Meaning of the ayah</div></div>${sw('dGu', S.showGu)}</div>
    <div class="s-row"><div class="main"><div class="t">Keep screen on</div><div class="d">Screen won't switch off while the app is open</div></div>${sw('dKeep', S.keepOn)}</div>`;

  function openDisplaySheet() {
    openSheet(`
      <h3>Font & display</h3>
      <div class="sub">Changes apply instantly</div>
      <div class="s-card">${fontRows()}</div>
      <div class="sec">Arabic font</div>
      <div class="s-card">${arFontGrid()}</div>
      <div class="sec">Show</div>
      <div class="s-card">${showRows()}</div>
      <div class="sec">Theme</div>
      ${themeGrid()}`, sh => {
      bindFontRows(sh);
      bindArFontGrid(sh, true);
      bindDisplayToggles(sh);
    });
  }

  function bindDisplayToggles(root) {
    const sync = () => $$('[data-vt]').forEach(b => b.classList.toggle('on', b.dataset.vt === 'tr' ? S.showTr : S.showGu));
    const tr = $('#dTr', root), gu = $('#dGu', root), keep = $('#dKeep', root);
    if (tr) tr.onchange = e => { S.showTr = e.target.checked; saveSettings(); applyTheme(); sync(); };
    if (gu) gu.onchange = e => { S.showGu = e.target.checked; saveSettings(); applyTheme(); sync(); };
    if (keep) keep.onchange = e => { S.keepOn = e.target.checked; saveSettings(); applyTheme(); toast(S.keepOn ? 'Screen will stay on' : 'Screen will switch off normally'); };
    $$('[data-tp]', root).forEach(b => b.onclick = () => {
      S.theme = b.dataset.tp; saveSettings(); applyTheme();
      $$('[data-tp]', root).forEach(x => x.classList.toggle('on', x === b));
    });
  }

  function arFontGrid() {
    const card = f => `<button class="font-card ${f.id === S.arFont ? 'on' : ''}" data-font="${f.id}">
      <div class="pv" style="font-family:'${f.fam}'">${esc((f.std ? BISM[f.script].replace(/ۡ/g, 'ْ').replace(/ہ/g, 'ه') : BISM[f.script]).split(' ').slice(0, 2).join(' '))}</div><div class="nm">${esc(f.name)}</div></button>`;
    return `<div class="font-grid">${AR_FONTS.map(card).join('')}</div>`;
  }

  function bindArFontGrid(root, rerender) {
    $$('[data-font]', root).forEach(b => b.onclick = () => {
      const before = arFont().script;
      S.arFont = b.dataset.font; saveSettings(); applyTheme();
      $$('[data-font]', root).forEach(x => x.classList.toggle('on', x === b));
      // The other script needs the ayah text swapped, not just the font.
      if (rerender && before !== arFont().script && route && (route.name === 'surah' || route.name === 'juz')) {
        const f = firstVisibleAyah();
        go(`#/${route.name === 'surah' ? 's/' + route.s : 'j/' + route.j}?a=${f ? f[0] + ':' + f[1] : ''}&f=1`, true);
        render();
      }
    });
  }

  // ---------------------------------------------------------------- search
  // search.json rows: [surah, ayah, gujarati, arabic (as the reader shows it), gujarati transliteration, english-letter keys]
  // words.json rows:  [arabic word, pronunciation, keys "a|b", count, normalised arabic, english, gujarati]
  // guar.json:        gujarati word -> the arabic word it most often stands for
  let SEARCH = null, WORDS = null, WORD_BY_AR = null, GUAR = null, GUWORDS = null, wordsP = null;
  const loadWords = () => wordsP || (wordsP = Promise.all([getJSON('data/words.json'), getJSON('data/guar.json')]).then(([w, g]) => {
    WORDS = w.map(r => ({ ar: r[0], lat: r[1], keys: r[2].split('|'), cnt: r[3], arN: r[4], en: r[5] || '', gu: r[6] || '' }));
    WORD_BY_AR = new Map(WORDS.map(x => [x.arN, x]));
    GUAR = g;
  }));
  const loadSearch = () => SEARCH ? Promise.resolve() : Promise.all([getJSON('data/search.json'), loadWords(),
    EN() ? getJSON('data/search_en.json') : null]).then(([s, , en]) => {
    SEARCH = s.map((r, i) => ({ s: r[0], n: r[1], gu: r[2], ar: r[3], tr: r[4],
      arN: ' ' + normAr(r[3]) + ' ', guN: normGu(r[2]), trN: normGu(r[4]),
      lat: r[5].split(' ').map(w => w.split('|')) }));
    // English mode: results show the English translation, and English letters also search it
    if (en) SEARCH.forEach((r, i) => { r.gu = en[i] || ''; r.enN = ' ' + r.gu.toLowerCase().replace(/[^a-z0-9']+/g, ' ') + ' '; });
    // Gujarati words of the translation, most used first, for Gujarati suggestions
    const cnt = new Map();
    for (const r of SEARCH) for (const x of r.gu.split(/[\s,.;:!?()"'“”‘’\-–*]+/)) if (x.length > 1) cnt.set(x, (cnt.get(x) || 0) + 1);
    GUWORDS = [...cnt].sort((a, b) => b[1] - a[1]).map(([w, c]) => ({ w, c, n: normGu(w) }));
  });

  const normAr = s => String(s || '')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱءؤئ]/g, 'ا').replace(/[ىیےۓ]/g, 'ي')
    .replace(/[کڪ]/g, 'ك').replace(/[ہھۃةۀ]/g, 'ه')
    .replace(/\s+/g, ' ').trim();
  // Gujarati typed without the special Arabic-sound marks, halant or long/short vowel care still matches
  const normGu = s => String(s || '').toLowerCase()
    .replace(/[઼્ૺ-૿ઁ-ઃ]/g, '')
    .replace(/ી/g, 'િ').replace(/ૂ/g, 'ુ').replace(/ૈ/g, 'ે').replace(/ૌ/g, 'ો')
    .replace(/ઈ/g, 'ઇ').replace(/ઊ/g, 'ઉ')
    .replace(/[.,;:!?()"'“”‘’]/g, ' ').replace(/\s+/g, ' ').trim();
  // loose English spelling: kitaab / kitab / ketab all become "kitab" (same rules as Al-Miftah)
  const normLat = s => s.toLowerCase().replace(/ā/g, 'a').replace(/ī/g, 'i').replace(/ū/g, 'u')
    .replace(/['`’ʿʾ3\-\s]/g, '').replace(/ph/g, 'f').replace(/th/g, 's').replace(/dh|zh/g, 'z').replace(/kh/g, 'x')
    .replace(/gh/g, 'g').replace(/sh/g, 'c').replace(/q/g, 'k').replace(/v/g, 'w').replace(/e/g, 'i').replace(/o/g, 'u')
    .replace(/aw|au/g, 'u').replace(/ay|ai/g, 'i').replace(/(.)\1+/g, '$1').replace(/([aiu])h$/, '$1');
  // while typing, a final "h" is still being typed ("rah" -> rahman), so keep it for prefix matching
  const latPrefix = q => { const k = normLat(q + 'a'); return k.endsWith('a') ? k.slice(0, -1) : k; };
  const latHit = (key, qw) => key.startsWith(qw) || (qw.length >= 4 && key.length >= 3 && qw.startsWith(key));
  const scriptOf = q => /[؀-ۿ]/.test(q) ? 'ar' : /[઀-૿]/.test(q) ? 'gu' : 'lat';
  // English letters typed: also offer the Arabic letters they may stand for (from Al-Miftah)
  const LETTERS = [
    ['ا', 'alif', ['a', 'alif', 'alef']], ['ب', 'ba', ['b', 'ba', 'be']], ['ت', 'ta', ['t', 'ta', 'te']], ['ث', 'tha', ['th', 's', 'se', 'tha']],
    ['ج', 'jim', ['j', 'jim', 'jeem', 'g']], ['ح', 'ḥa', ['h', 'ha', 'he']], ['خ', 'kha', ['kh', 'kha', 'khe', 'x']], ['د', 'dal', ['d', 'dal']],
    ['ذ', 'dhal', ['dh', 'z', 'zal', 'dhal']], ['ر', 'ra', ['r', 'ra', 're']], ['ز', 'zay', ['z', 'za', 'ze']], ['س', 'sin', ['s', 'sin', 'seen']],
    ['ش', 'shin', ['sh', 'shin', 'sheen']], ['ص', 'ṣad', ['s', 'sad', 'swad']], ['ض', 'ḍad', ['d', 'z', 'dad', 'zad']], ['ط', 'ṭa', ['t', 'ta', 'toe']],
    ['ظ', 'ẓa', ['z', 'za', 'zoe']], ['ع', 'ain', ['a', 'ai', 'ain', 'e', '3']], ['غ', 'ghain', ['g', 'gh', 'ghain']], ['ف', 'fa', ['f', 'fa', 'fe', 'p']],
    ['ق', 'qaf', ['q', 'k', 'qaf']], ['ك', 'kaf', ['k', 'kaf']], ['ل', 'lam', ['l', 'lam']], ['م', 'mim', ['m', 'mim', 'meem']],
    ['ن', 'nun', ['n', 'nun', 'noon']], ['ه', 'ha', ['h', 'ha', 'he']], ['و', 'waw', ['w', 'v', 'o', 'u', 'waw']], ['ي', 'ya', ['y', 'i', 'e', 'ya']]
  ];
  let wordFilter = null;

  function renderSearch() {
    setBar({ title: 'Search', sub: 'Go to an ayah, or search the text', back: true, tabs: 'home' });
    const q0 = route.q.get('q') || '';
    view.innerHTML = `
      <div class="s-title">GO TO AYAH</div>
      <div class="goto">
        <label class="gbox"><span>Surah</span><input id="gS" type="number" inputmode="numeric" min="1" max="114" placeholder="1 – 114"></label>
        <label class="gbox"><span>Ayah</span><input id="gA" type="number" inputmode="numeric" min="1" placeholder="Ayah" disabled></label>
        <button class="gbtn" id="gGo" aria-label="Go">${ICON.go}</button>
      </div>
      <div class="goto-name" id="gName">Type a surah number (1 – 114)</div>
      <a class="kh-card lx-card" href="#/words" style="margin-top:14px">
        <span class="kh-ic lx-ic"><bdi>ع</bdi></span>
        <div class="main"><div class="kh-l"><b>Search by Root</b><span>Quran Words</span></div>
          <div class="kh-l sm"><span>${L('મૂળ (Root) થી બધા શબ્દો · વધારે આવતા શબ્દો', 'All words of a root · Most frequent words')}</span></div></div>${ICON.chev}</a>
      <div class="s-title" style="margin-top:18px">SEARCH WORD</div>
      <div class="search-wrap">
        <div class="search-box">${ICON.search}<input id="q" type="text" enterkeyhint="search" placeholder="${L('English letters, ગુજરાતી or عربي', 'English or عربي')}" value="${esc(q0)}">
          <button class="mic-btn" id="micBtn" aria-label="Voice search">${ICON.mic}</button></div>
        <div class="voice-row"><span>${ICON.mic} ${L('બોલીને શોધો:', 'Search by voice:')}</span>${voiceLangs().map(([k, label]) =>
          `<button class="chip${k === voiceLang() ? ' on' : ''}" data-vl="${k}">${label}</button>`).join('')}</div>
        <div class="sugg-drop" id="sugg" hidden></div>
      </div>
      <div class="try-row" id="tryRow">${(EN() ? [['mercy', 'English'], ['rahman', 'roman'], ['جنة', 'عربي'], ['kursi', 'roman'], ['patience', 'English']] : [['rahman', 'roman'], ['રહેમત', 'ગુજરાતી'], ['جنة', 'عربي'], ['kursi', 'roman'], ['ઇબાદત', 'ગુજરાતી']])
        .map(([w, l]) => `<button class="chip" data-try="${esc(w)}">${esc(w)} <small>${l}</small></button>`).join('')}</div>
      <div id="results"></div>`;
    const gS = $('#gS'), gA = $('#gA'), gName = $('#gName');
    const goNow = () => {
      const s = Number(gS.value);
      if (!(s >= 1 && s <= 114)) { toast('Surah number must be 1 – 114'); gS.focus(); return; }
      const max = sm(s).a, n = Number(gA.value);
      if (gA.value && !(n >= 1 && n <= max)) { toast(`${sm(s).en} has ${max} ayahs`); gA.focus(); return; }
      go(`#/s/${s}${n ? '?a=' + n : ''}`);
    };
    gS.oninput = () => {
      const s = Number(gS.value);
      if (s >= 1 && s <= 114) {
        const m = sm(s);
        gA.disabled = false; gA.max = m.a; gA.placeholder = `1 – ${m.a}`;
        gName.innerHTML = `<b>${esc(m.en)}</b>${EN() ? '' : ' · ' + esc(m.gu)} · ${m.a} ayahs · <bdi class="ar-inline">${esc(m.ar)}</bdi>`;
        gName.classList.add('ok');
      } else {
        gA.disabled = true; gA.value = ''; gA.placeholder = 'Ayah';
        gName.textContent = gS.value ? 'No such surah — type 1 to 114' : 'Type a surah number (1 – 114)';
        gName.classList.remove('ok');
      }
    };
    gS.onkeydown = e => { if (e.key === 'Enter') { if (!gA.disabled) gA.focus(); else goNow(); } };
    gA.onkeydown = e => { if (e.key === 'Enter') goNow(); };
    $('#gGo').onclick = goNow;

    const input = $('#q'), drop = $('#sugg');
    let t, lastQ = null;
    input.oninput = () => {
      // holding the space bar (the keyboard's own language menu) adds only spaces: nothing to search again
      const k = input.value.replace(/\s+/g, ' ').trim();
      if (k === lastQ) return;
      lastQ = k;
      clearTimeout(t); wordFilter = null; rootFilter = null;
      $('#tryRow').hidden = !!input.value.trim();
      t = setTimeout(() => { drawSugg(input.value); doSearch(input.value); }, 180);
    };
    input.onfocus = () => { if (input.value.trim()) drawSugg(input.value); };
    input.onkeydown = e => { if (e.key === 'Enter') { drop.hidden = true; input.blur(); } };
    $$('[data-try]').forEach(b => b.onclick = () => { input.value = b.dataset.try; input.oninput(); input.focus(); });
    $('#micBtn').onclick = () => listenSearch(voiceLang());    $$('[data-vl]').forEach(b => b.onclick = () => {
      try { localStorage.setItem('voiceLang', b.dataset.vl); } catch (e) { }
      $$('[data-vl]').forEach(x => x.classList.toggle('on', x === b));
      listenSearch(b.dataset.vl);
    });
    $('#tryRow').hidden = !!q0;
    if (q0) doSearch(q0); else setTimeout(() => gS.focus(), 150);
  }

  // ---- roots in the search: typed in Arabic (علم), English letters (ilm, rahm) or Gujarati (ઇલ્મ, રહમત), or by meaning (જ્ઞાન)
  // the sounds each root letter may be typed with; '' = may be left out (ع, ا), و / ي may be a vowel
  const ROOT_SND = { 'ا': '', 'ء': '', 'أ': '', 'ع': '', 'ب': 'b', 'ت': 't', 'ث': 'st', 'ج': 'jg', 'ح': 'h', 'خ': 'xkh', 'د': 'd', 'ذ': 'zd',
    'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'c', 'ص': 's', 'ض': 'dz', 'ط': 't', 'ظ': 'z', 'غ': 'g', 'ف': 'f', 'ق': 'k', 'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y' };
  const GU_SND = { 'ક': 'k', 'ખ': 'x', 'ગ': 'g', 'ઘ': 'g', 'ચ': 'c', 'છ': 'c', 'જ': 'j', 'ઝ': 'z', 'ટ': 't', 'ઠ': 't', 'ડ': 'd', 'ઢ': 'd',
    'ણ': 'n', 'ઞ': 'n', 'ત': 't', 'થ': 's', 'દ': 'd', 'ધ': 'd', 'ન': 'n', 'પ': 'f', 'ફ': 'f', 'બ': 'b', 'ભ': 'b', 'મ': 'm', 'ય': 'y', 'ર': 'r',
    'લ': 'l', 'ળ': 'l', 'વ': 'w', 'શ': 'c', 'ષ': 'c', 'સ': 's', 'હ': 'h' };
  /** The consonants of a word typed in English or Gujarati letters: rahmat / રહેમત → rhmt */
  const sndOf = q => scriptOf(q) === 'gu' ? [...q].map(c => GU_SND[c] || '').join('')
    : normLat(q).replace(/[aiu]/g, '');
  /** 3 = the whole root, 2 = the start of a root (still typing), 1 = the root and an ending -at / -an (rahm-at), 0 = no */
  function sndMatch(root, q) {
    const L = [...root].map(c => ROOT_SND[c] === undefined ? c : ROOT_SND[c]);
    const go = (i, j) => {
      if (j === q.length) return i === L.length ? 3 : i >= 2 ? 2 : 0;
      if (i === L.length) return /^[tn]{1,2}$/.test(q.slice(j)) ? 1 : 0;
      let best = L[i].includes(q[j]) ? go(i + 1, j + 1) : 0;
      if (best < 3 && (L[i] === '' || L[i] === 'w' || L[i] === 'y')) best = Math.max(best, go(i + 1, j));
      return best;
    };
    return go(0, 0);
  }
  const lexMeaning = e => LEX_FIX[e[0]] || partGu(e[0]) || e[5] || '';
  /** Roots for what was typed, best first: [[root, why]] */
  function rootHits(q) {
    if (!LEX) return [];
    const X = LEX, hits = new Map(), add = (r, sc) => { if ((hits.get(r) || 0) < sc) hits.set(r, sc); };
    const script = scriptOf(q);
    if (script === 'ar') {
      const b = bareAr(q.split(/\s+/).join(''));
      if (!b) return [];
      for (const r of X.byRoot.keys()) if (bareAr(r).startsWith(b)) add(r, bareAr(r) === b ? 6 : 3);
      const bw = b.replace(/^(?:وال|فال|بال|ال|و|ف)/, '');
      for (const x of X.L) if (x[1] && [b, bw].includes(bareAr(x[0]))) add(x[1], 5);
    } else {
      const w = q.trim().split(/\s+/).pop(), k = sndOf(w);
      if (k.length >= 2) for (const r of X.byRoot.keys()) { const m = sndMatch(r, k); if (m) add(r, m + (k.length >= 3 ? 1 : 0)); }
      if (script === 'gu' && normGu(w).length >= 3) {
        const ng = normGu(w);
        for (const x of X.L) if (x[1] && normGu(lexMeaning(x)).split(/[\s\/,]+/).some(t => t.startsWith(ng))) add(x[1], 4);
      }
    }
    return [...hits].sort((a, b) => b[1] - a[1] || X.rootCount(b[0]) - X.rootCount(a[0])).map(x => x[0]);
  }
  const sgRoot = r => {
    const es = LEX.byRoot.get(r), mean = [...new Set(es.slice(0, 3).map(lexMeaning).filter(Boolean))].slice(0, 2).join(' · ');
    return `<button class="sugg-row sg-root" data-root="${esc(r)}">
      <span class="sg-l"><b><span class="sg-tag">${L('મૂળ', 'Root')}</span>${esc(mean || rootAr(r))}</b><small>${num(LEX.rootCount(r))} ${L('વાર', 'times')} · ${es.length} ${L('શબ્દો', 'words')} · ${es.slice(0, 3).map(e => esc(lemAr(e[0]))).join('، ')}</small></span>
      <bdi class="sg-ar">${esc(rootAr(r))}</bdi></button>`;
  };
  let rootFilter = null;
  // Gujarati with its vowel signs dropped, so રેહમત, રહેમત and રહમત are the same
  const guSkel = s => normGu(s).replace(/[ઁ-ઃ઼-્]/g, '');

  /** Matching words for one query: [key, row html], in the order they are shown. */
  function suggItems(q) {
    const script = scriptOf(q);
    if (script === 'lat') {
      const k = latPrefix(q.split(/\s+/)[0]);
      if (!k) return [];
      // words that start so first, then (3+ letters) words that have it inside
      let hits = WORDS.filter(w => w.keys.some(x => x.startsWith(k)));
      if (hits.length < 8 && k.length >= 3) hits = hits.concat(WORDS.filter(w => !hits.includes(w) && w.keys.some(x => x.includes(k))));
      return hits.slice(0, 8).map(w => ['w' + w.arN, sgWord(w)]);
    }
    if (script === 'ar') {
      const na = normAr(q).split(' ')[0];
      const bare = w => w.arN.replace(/^(و|ف|ب|ل)?ال/, '');
      // the exact word first (spoken Arabic has no harakat), then words that start with it
      const hits = WORDS.filter(w => w.arN === na || bare(w) === na).concat(WORDS.filter(w => w.arN.startsWith(na) || bare(w).startsWith(na)));
      return [...new Set(hits)].slice(0, 8).map(w => ['w' + w.arN, sgWord(w)]);
    }
    const lastW = q.split(/\s+/).pop(), ng = normGu(lastW), sk = guSkel(lastW);
    if (!ng) return [];
    // Gujarati words that start so, then words that have it inside, then words that sound the same (રેહમત → રહેમત)
    const seen = new Set(), list = [];
    const take = f => { for (const x of GUWORDS) { if (list.length >= 8) return; if (!seen.has(x.w) && f(x)) { seen.add(x.w); list.push(x); } } };
    take(x => x.n.startsWith(ng));
    if (ng.length >= 2) take(x => x.n.includes(ng));
    if (sk.length >= 2) take(x => (x.k || (x.k = guSkel(x.w))).startsWith(sk));
    const rows = list.map(x => {
      const ar = GUAR[x.w];
      return ['g' + x.w, `<button class="sugg-row" data-gw="${esc(x.w)}"><span class="sg-l"><b>${esc(x.w)}</b><small>in ${x.c} ${x.c === 1 ? 'ayah' : 'places'}</small></span>${ar ? `<bdi class="sg-ar">${esc(arT(ar))}</bdi>` : ''}</button>`];
    });
    // Arabic words whose Gujarati meaning has it
    if (ng.length >= 3) WORDS.filter(w => w.gu && normGu(w.gu).includes(ng)).slice(0, 4).forEach(w => rows.push(['w' + w.arN, sgWord(w)]));
    return rows;
  }

  /** The Al-Miftah style list under the search box: Gujarati meaning · sound · Arabic word.
      After voice search, `heard` holds everything the recognizer thought it heard. */
  async function drawSugg(q, heard) {
    const drop = $('#sugg'); if (!drop) return;
    q = q.trim();
    if (!q || /^\d+$/.test(q)) { drop.hidden = true; return; }
    await Promise.all([loadSearch(), loadLex()]);
    if (!$('#q') || $('#q').value.trim() !== q) return;
    let rows = '';
    if (heard) {
      rows += `<div class="sg-voice"><span>${ICON.mic} ${L('સાંભળ્યું:', 'Heard:')}</span>${heard.map(t =>
        `<button data-alt="${esc(t)}" class="${t === q ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`;
      // matches for every word of every guess, the chosen guess first
      const seen = new Set(), items = [];
      for (const t of [q, ...heard.filter(x => x !== q)])
        for (const w of t.split(/\s+/).filter(Boolean).slice(0, 4))
          for (const [k, h] of suggItems(w)) if (!seen.has(k)) { seen.add(k); items.push(h); }
      rows += items.slice(0, 12).join('') || `<div class="sg-none">${L('આ અવાજ સાથે મળતો શબ્દ ન મળ્યો — બીજી ભાષા પસંદ કરી ફરી બોલો.', 'No word matched what was heard — pick another language and speak again.')}</div>`;
    } else {
      const lq = q.toLowerCase();
      const letters = scriptOf(q) === 'lat' && lq.length <= 4 && /^[a-z3']+$/.test(lq) ? LETTERS.filter(L => L[2].some(x => x.startsWith(lq))).slice(0, 8) : [];
      if (letters.length) rows += `<div class="sg-letters"><span>Arabic letter:</span>${letters.map(L => `<button data-letter="${L[0]}"><b>${L[0]}</b><small>${L[1]}</small></button>`).join('')}</div>`;
      const words = suggItems(q).map(x => x[1]).join('');
      const roots = rootHits(q).slice(0, 3);
      if (roots.length) rows += `<div class="sg-head">${L('મૂળ · ROOT', 'ROOT')}</div>${roots.map(sgRoot).join('')}`;
      if (words) rows += `${roots.length ? `<div class="sg-head">${L('શબ્દો · WORDS', 'WORDS')}</div>` : ''}${words}`;
      if (!rows && q.length >= 2) rows = `<div class="sg-none">${L('આ શબ્દ સાથે મળતું કંઈ નથી — થોડું ઓછું લખી જુઓ.', 'Nothing matches this — try typing less.')}</div>`;
    }
    drop.innerHTML = rows;
    drop.hidden = !rows;
    $$('[data-root]', drop).forEach(b => b.onclick = () => { rootFilter = b.dataset.root; wordFilter = null; drop.hidden = true; doSearch($('#q').value); });
    $$('[data-w]', drop).forEach(b => b.onclick = () => { wordFilter = b.dataset.w; rootFilter = null; drop.hidden = true; doSearch($('#q').value); });
    $$('[data-gw]', drop).forEach(b => b.onclick = () => { $('#q').value = b.dataset.gw; wordFilter = null; rootFilter = null; drop.hidden = true; doSearch(b.dataset.gw); });
    $$('[data-letter]', drop).forEach(b => b.onclick = () => { const i = $('#q'); i.value = b.dataset.letter; i.oninput(); i.focus(); });
    $$('[data-alt]', drop).forEach(b => b.onclick = () => { $('#q').value = b.dataset.alt; wordFilter = null; drawSugg(b.dataset.alt, heard); doSearch(b.dataset.alt); });
  }

  // ---------------------------------------------------------------- voice search (the phone's speech recognizer)
  const VOICE_LANGS = [['ar-SA', 'عربي'], ['gu-IN', 'ગુજરાતી'], ['en-IN', 'English']];
  const voiceLangs = () => EN() ? VOICE_LANGS.filter(v => v[0] !== 'gu-IN') : VOICE_LANGS;
  const voiceLang = () => { try { return localStorage.getItem('voiceLang') || 'ar-SA'; } catch (e) { return 'ar-SA'; } };
  async function listenSearch(lang) {
    const mic = $('#micBtn');
    if (!N.listen) { toast('Voice search works in the app on the phone'); return; }
    if (mic) mic.classList.add('listening');
    const r = await nativeCall('listen', lang);
    if (mic) mic.classList.remove('listening');
    const input = $('#q'); if (!input) return;
    if (r && r.none) { toast(L('આ ફોનમાં Voice (Google) ઉપલબ્ધ નથી', 'Voice (Google) is not available on this phone')); return; }
    const heard = r && r.ok ? r.texts.map(t => String(t).trim()).filter(Boolean) : [];
    if (!heard.length) { toast(L('કંઈ સંભળાયું નહીં — ફરી બોલો', 'Nothing was heard — speak again')); return; }
    input.value = heard[0];
    wordFilter = null;
    $('#tryRow').hidden = true;
    drawSugg(heard[0], heard);
    doSearch(heard[0]);
  }
  document.addEventListener('click', e => {
    const drop = $('#sugg');
    if (drop && !e.target.closest('.search-wrap')) drop.hidden = true;
  });
  const sgWord = w => `<button class="sugg-row" data-w="${esc(w.arN)}">
      <span class="sg-l"><b>${esc((EN() ? w.en : w.gu) || w.en || w.lat)}</b><small>${esc(w.lat)}${!EN() && w.gu && w.en ? ' · ' + esc(w.en) : ''} · ${w.cnt}×</small></span>
      <bdi class="sg-ar">${esc(arT(w.ar))}</bdi></button>`;

  /** Ayahs for the typed text, or for the Arabic word picked from the suggestions. */
  async function doSearch(q) {
    const box = $('#results'); if (!box) return;
    q = q.trim();
    history.replaceState(null, '', '#/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
    if (!q) { box.innerHTML = ''; wordFilter = null; return; }
    const script = scriptOf(q);
    const lq = q.toLowerCase(), nq = normLat(q);
    let html = '';
    const names = META.surahs.filter(m => String(m.n) === q || m.gu.includes(q) || m.en.toLowerCase().includes(lq)
      || (script === 'lat' && nq.length >= 3 && normLat(m.en).includes(nq)) || (script === 'ar' && normAr(m.ar).includes(normAr(q))));
    html += names.slice(0, 6).map(m => `<a class="row" href="#/s/${m.n}" style="margin-bottom:8px">
      <span class="star">${ICON.star}<b>${m.n}</b></span>
      <div class="main"><div class="t">${esc(m.en)}</div><div class="d">${EN() ? '' : esc(m.gu) + ' · '}${m.a} Ayahs</div></div>
      <span class="ar">${esc(m.ar)}</span></a>`).join('');
    if (q.length < 2 || /^\d+$/.test(q)) { box.innerHTML = html; return; }
    if (!SEARCH) { box.innerHTML = html + '<div class="hint">Preparing search…</div>'; await loadSearch(); }
    if (!$('#q') || $('#q').value.trim() !== q) return;

    let match, chosen = null, note = '';
    if (rootFilter && LEX && LEX.byRoot.has(rootFilter)) {
      // every ayah with a word of this root
      const es = LEX.byRoot.get(rootFilter), keys = new Set();
      for (const e of es) for (const o of e[4]) keys.add(Math.floor(o / 1000));
      match = r => keys.has(r.s * 1000 + r.n);
      html += `<a class="chosen root-chosen" href="${rootHref(rootFilter)}"><bdi class="sg-ar">${esc(rootAr(rootFilter))}</bdi>
        <span><b>${L('મૂળ (Root)', 'Root')} · ${num(LEX.rootCount(rootFilter))} ${L('વાર', 'times')}</b><small>${es.slice(0, 5).map(e => esc(lemAr(e[0]))).join('، ')} — ${L('બધા શબ્દો જુઓ', 'see all words')} ›</small></span>
        <button id="clearWord">${ICON.close}</button></a>`;
    } else if (wordFilter) {
      chosen = WORD_BY_AR.get(wordFilter);
      const needle = ' ' + wordFilter + ' ';
      match = r => r.arN.includes(needle);
    } else if (script === 'ar') {
      const needle = normAr(q);
      match = r => r.arN.includes(needle);
    } else if (script === 'gu') {
      const needle = normGu(q);
      match = r => r.guN.includes(needle) ? 'gu' : r.trN.includes(needle) ? 'tr' : false;
    } else {
      const qws = q.split(/\s+/).map(latPrefix).filter(w => w.length >= 2);
      // English mode: the English translation first (whole words), else the Arabic sound
      const enQ = EN() && q.trim().length >= 3 ? ' ' + q.toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim() : '';
      match = r => (enQ && r.enN.includes(enQ) && 'en') || (qws.length && qws.every(qw => r.lat.some(keys => keys.some(k => latHit(k, qw)))));
    }
    const run = f => { const out = []; for (const r of SEARCH) { const m = f(r); if (m) { out.push([r, m]); if (out.length >= 200) break; } } return out; };
    let hits = run(match);
    const plainGu = script === 'gu' && !wordFilter && !rootFilter;
    if (plainGu && !hits.length) {
      // not as one phrase: every word somewhere in the ayah, then words that sound the same (રેહમત → રહેમત)
      const ws = normGu(q).split(' ').filter(w => w.length > 1);
      if (ws.length > 1) { hits = run(r => ws.every(w => r.guN.includes(w)) && 'gu'); if (hits.length) note = L('આખું વાક્ય ન મળ્યું — બધા શબ્દો હોય એવી આયતો', 'Exact phrase not found — ayahs with all the words'); }
      if (!hits.length) {
        const ks = ws.map(guSkel).filter(k => k.length >= 2);
        if (ks.length) {
          hits = run(r => ks.every(k => (r.guK || (r.guK = guSkel(r.gu))).includes(k)) && 'gu');
          if (hits.length) note = L('આ જ જોડણી ન મળી — મળતા શબ્દો વાળી આયતો', 'This spelling not found — ayahs with similar words');
        }
      }
    }
    const reGu = (plainGu && !note) || (EN() && script === 'lat' && hits.some(h => h[1] === 'en')) ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    if (note) html += `<div class="hint s-note">${note}</div>`;
    if (chosen) html += `<div class="chosen"><bdi class="sg-ar">${esc(arT(chosen.ar))}</bdi><span><b>${esc((EN() ? chosen.en : chosen.gu) || chosen.en || chosen.gu)}</b><small>${esc(chosen.lat)}</small></span>
      <button id="clearWord">${ICON.close}</button></div>`;
    html += `<div class="s-title" style="margin-top:8px">${hits.length >= 200 ? '200+' : hits.length} AYAHS FOUND</div>`;
    html += hits.map(([r, m]) => `<a class="res" href="#/s/${r.s}?a=${r.n}">
      <div class="hd">${esc(sm(r.s).en)} · ${r.s}:${r.n}<button class="res-save ${bmsOf(r.s, r.n).length ? 'on' : ''}" data-save="${r.s}:${r.n}" aria-label="Save to collection">${ICON.bm}</button></div>
      <div class="ar-snip">${esc(arT(r.ar))}</div>
      ${m === 'tr' ? `<div class="tr-snip">${esc(r.tr)}</div>` : ''}
      <div class="tx clamp2">${reGu ? esc(r.gu).replace(reGu, x => `<mark>${x}</mark>`) : esc(r.gu)}</div></a>`).join('');
    if (!hits.length && !names.length) html += `<div class="hint">Nothing found${script === 'lat' ? '<br>Try the Arabic sound, e.g. <b>rahman</b>, <b>kursi</b>, <b>jannat</b>' : ''}</div>`;
    box.innerHTML = html;
    const cw = $('#clearWord', box);
    $$('[data-save]', box).forEach(b => b.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const [s, n] = b.dataset.save.split(':').map(Number);
      openBmSheet(s, n, () => b.classList.toggle('on', bmsOf(s, n).length > 0));
    });
    if (cw) cw.onclick = e => { e.preventDefault(); wordFilter = null; rootFilter = null; doSearch($('#q').value); };
  }

  // ---------------------------------------------------------------- bookmarks
  let bmTab = load('qm.bmTab', 'all');
  async function renderSaved() {
    if (bmTab !== 'all' && bmTab !== 'notes' && !tabOf(bmTab)) bmTab = 'all';
    const live = BM.filter(b => tabOf(b.t));
    setBar({ title: 'My Collections', sub: live.length ? plural(live.length, 'saved ayah') : L('પસંદગીની આયતો સાચવો', 'Save your favourite ayahs'), tabs: 'saved' });
    const last = load('qm.last', null);
    const list = live.filter(b => bmTab === 'all' || b.t === bmTab);
    const noteKeys = Object.keys(NOTES).sort((a, b) => NOTES[b].at - NOTES[a].at);
    const texts = await Promise.all(list.map(b => ayahText(b.s, b.n)));
    const noteTexts = bmTab === 'notes' ? await Promise.all(noteKeys.map(k => ayahText(...k.split(':').map(Number)))) : [];
    if (!route || route.name !== 'saved') return;
    const cur = tabOf(bmTab);
    const notesHtml = () => noteKeys.length ? `<div class="list">${noteKeys.map((k, i) => {
      const [s, n] = k.split(':').map(Number);
      return `<div class="res bm" data-note="${k}">
        <span class="stripe" style="background:var(--gold)"></span>
        <a class="main" href="#/s/${s}?a=${n}">
          <div class="hd">${esc(sm(s).en)} · Ayah ${n}</div>
          <div class="ar-snip">${esc(arT(noteTexts[i].ar))}</div>
          <div class="note" style="font-style:normal">${esc(NOTES[k].t)}</div>
          <div class="bm-when">${ICON.clock}${esc(new Date(NOTES[k].at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))}</div>
        </a>
        <div class="bm-acts"><button class="del" data-nedit aria-label="Edit">${ICON.edit}</button></div></div>`;
    }).join('')}</div>`
      : `<div class="empty">${ICON.edit}<div><b>${L('હજી કોઈ નોટ નથી', 'No notes yet')}</b></div>
          <div style="margin-top:6px;font-size:13.5px">${L('કોઈ પણ આયતના ⋮ મેનુમાં “Add my note” દબાવો.', 'Press “Add my note” in any ayah\'s ⋮ menu.')}</div></div>`;
    view.innerHTML = `
      ${last ? `<div class="s-title">LAST READ</div>
        <a class="row" href="#/s/${last.s}?a=${last.n}" style="margin-bottom:16px">
          <span class="star">${ICON.star}<b>${last.s}</b></span>
          <div class="main"><div class="t">${esc(sm(last.s).en)} · Ayah ${last.n}</div><div class="d">${new Date(last.at).toLocaleString('en-IN')}</div></div>${ICON.chev}</a>` : ''}
      <div class="bm-layout">
      <nav class="bm-rail">
        <button class="rail-tab ${bmTab === 'all' ? 'on' : ''}" data-f="all" style="--c:var(--accent)"><b>All</b><span>${live.length}</span></button>
        ${TABS.map(t => `<button class="rail-tab ${bmTab === t.id ? 'on' : ''}" data-f="${t.id}" style="--c:${TAB_COLORS[t.c % TAB_COLORS.length]}"><b>${esc(t.name)}</b><span>${live.filter(b => b.t === t.id).length}</span></button>`).join('')}
        <button class="rail-tab ${bmTab === 'notes' ? 'on' : ''}" data-f="notes" style="--c:var(--gold)"><b>Notes</b><span>${noteKeys.length}</span></button>
        <button class="rail-tab add" id="addTab">${ICON.plus}<b>New</b></button>
      </nav>
      <div class="bm-main">
      ${cur ? `<div class="tab-tools"><button id="renTab">${ICON.edit} Rename</button>${list.length ? `<button id="shareTab">${ICON.share} Share</button>` : ''}<button id="delTab">${ICON.trash} Delete</button></div>` : ''}
      ${bmTab !== 'notes' && list.length > 4 ? `<div class="search-box col-find">${ICON.search}<input id="colQ" type="text" enterkeyhint="search" placeholder="${L('આ યાદીમાં શોધો — સૂરહ કે શબ્દ', 'Find in this list — surah or word')}"></div>` : ''}
      ${bmTab === 'notes' ? notesHtml() : list.length ? `<div class="list">${list.map((b, i) => `
        <div class="res bm" data-i="${BM.indexOf(b)}">
          <span class="stripe" style="background:${tabColor(b.t)}"></span>
          <a class="main" href="#/s/${b.s}?a=${b.n}">
            ${b.name ? `<div class="bm-name">${esc(b.name)}</div>` : ''}
            <div class="hd">${esc(sm(b.s).en)} · Ayah ${b.n} <span class="tabname" style="color:${tabColor(b.t)}">${esc(tabOf(b.t).name)}</span></div>
            <div class="ar-snip">${esc(arT(texts[i].ar))}</div>
            <div class="tx" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(texts[i].gu)}</div>
            ${b.note ? `<div class="note">“${esc(b.note)}”</div>` : ''}
            ${b.at ? `<div class="bm-when">${ICON.clock}${esc(new Date(b.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }))}</div>` : ''}
          </a>
          <div class="bm-acts">
            <button class="del" data-ren aria-label="Rename">${ICON.edit}</button>
            <button class="del" data-del aria-label="Remove">${ICON.trash}</button>
          </div>
        </div>`).join('')}</div>`
        : `<div class="empty">${ICON.bm}<div><b>${cur ? L(esc(cur.name) + ' માં હજી કોઈ આયત નથી', 'No ayahs in ' + esc(cur.name) + ' yet') : L('હજી કોઈ આયત સાચવી નથી', 'No ayahs saved yet')}</b></div>
            <div style="margin-top:6px;font-size:13.5px">${L(`કોઈ પણ આયત પર ${ICON.bm} દબાવો (કે Search ના પરિણામમાં) અને Collection પસંદ કરો.`, `Press ${ICON.bm} on any ayah (or in Search results) and pick a Collection.`)}</div></div>`}
      </div></div>`;
    $$('.bm-rail [data-f]').forEach(c => c.onclick = () => { bmTab = c.dataset.f; store('qm.bmTab', bmTab); renderSaved(); });
    $('#addTab').onclick = () => newTabPrompt(id => { closeSheet(); bmTab = id; store('qm.bmTab', bmTab); renderSaved(); });
    const cq = $('#colQ');
    if (cq) cq.oninput = () => {
      const q = cq.value.trim().toLowerCase(), ng = normGu(q), na = normAr(q);
      $$('.bm-main [data-i]').forEach((el, i) => {
        const b = list[i], t = texts[i], m = sm(b.s);
        el.hidden = !!q && !(m.en.toLowerCase().includes(q) || m.gu.includes(q) || String(b.s) === q || normGu(t.gu).includes(ng)
          || (scriptOf(q) === 'ar' && normAr(t.ar).includes(na)) || (b.name || '').toLowerCase().includes(q) || (b.note || '').toLowerCase().includes(q));
      });
    };
    const st = $('#shareTab');
    if (st) st.onclick = () => {
      const txt = `📖 ${cur.name} — Noor-e-Quran\n\n` + list.map((b, i) =>
        `${sm(b.s).en} ${b.s}:${b.n}${b.name ? ' · ' + b.name : ''}\n${arT(texts[i].ar)}\n${texts[i].gu}`).join('\n\n');
      if (N.share) N.share(txt); else if (navigator.share) navigator.share({ text: txt }).catch(() => { }); else toast('Share works in the app');
    };
    if (cur) {
      $('#renTab').onclick = () => newTabPrompt(() => { closeSheet(); renderSaved(); }, cur);
      $('#delTab').onclick = () => {
        const n = BM.filter(b => b.t === cur.id).length;
        openSheet(`<h3>Delete “${esc(cur.name)}”?</h3>
          <div class="sub">${n ? `Its ${plural(n, 'bookmark')} will be removed too.` : 'This tab is empty.'}</div>
          <div style="display:flex;gap:8px"><button class="btn" id="yes" style="flex:1;background:#B4432C">Delete</button><button class="btn ghost" id="no" style="flex:1">Cancel</button></div>`, sh => {
          $('#no', sh).onclick = closeSheet;
          $('#yes', sh).onclick = () => {
            TABS = TABS.filter(t => t !== cur); BM = BM.filter(b => b.t !== cur.id);
            saveTabs(); saveBm(); bmTab = 'all'; closeSheet(); renderSaved();
          };
        });
      };
    }
    $$('[data-ren]').forEach(btn => btn.onclick = () => {
      const b = BM[Number(btn.closest('[data-i]').dataset.i)];
      openSheet(`
        <h3>Rename bookmark</h3>
        <div class="sub">${esc(sm(b.s).en)} · Ayah ${b.n} · ${esc(tabOf(b.t).name)}</div>
        <div class="sec">Name</div>
        <input class="note-input" id="bmName" maxlength="40" placeholder="e.g. Ayat-ul-Kursi" value="${esc(b.name || '')}">
        <div class="sec">Note</div>
        <textarea class="note-input" id="bmNote2" rows="2" placeholder="Optional">${esc(b.note || '')}</textarea>
        <button class="btn block" id="bmSave2" style="margin-top:14px">Save</button>`, sh => {
        setTimeout(() => $('#bmName', sh).focus(), 250);
        $('#bmSave2', sh).onclick = () => {
          b.name = $('#bmName', sh).value.trim();
          b.note = $('#bmNote2', sh).value.trim();
          saveBm(); closeSheet(); toast('Saved'); renderSaved();
        };
      });
    });
    $$('[data-nedit]').forEach(b => b.onclick = () => {
      const [s, n] = b.closest('[data-note]').dataset.note.split(':').map(Number);
      openNoteSheet(s, n);
    });
    $$('[data-del]').forEach(b => b.onclick = () => {
      const bm = BM[Number(b.closest('[data-i]').dataset.i)];
      askDeleteBm(bm, () => { BM = BM.filter(x => x !== bm); saveBm(); closeSheet(); toast('Bookmark removed'); renderSaved(); }, closeSheet);
    });
  }

  // ---------------------------------------------------------------- controls outside the app (notification, lock screen, headphones)
  function mediaSync() {
    if (!N.mediaState) return;
    const m = P.s ? sm(P.s) : null;
    N.mediaState(!!m && S.feat.lock,
      m ? `${m.en} · ${P.phase === 'bism' ? 'Bismillah' : 'Ayah ' + P.n}` : '',
      m ? `${EN() ? m.en : m.gu} · Mutazz Aghaei (Tahdir)` : '', !!P.playing);
  }
  function onMedia(cmd) {
    if (!P.s) return;
    if (cmd === 'play' && audio.paused) togglePlay();
    else if (cmd === 'pause' && !audio.paused) togglePlay();
    else if (cmd === 'next') { P.rep = 0; advance(1); }
    else if (cmd === 'prev') advance(-1);
    else if (cmd === 'close') closePlayer();
  }

  // ---------------------------------------------------------------- an ayah as a picture to share (WhatsApp status etc.)
  /** Breaks text into lines that fit width w with the canvas's current font. */
  function wrapLines(x, text, w) {
    const out = [];
    let line = '';
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + word : word;
      if (line && x.measureText(t).width > w) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
  async function ayahImage(s, n) {
    const t = await ayahText(s, n), m = sm(s);
    const arF = `"${arFont().fam}", "QalamMajeed", serif`, guF = `"${guFont().fam}", "NotoGuj", sans-serif`;
    const arSize = t.ar.length < 160 ? 62 : t.ar.length < 420 ? 50 : 40;
    const guSize = t.gu.length < 260 ? 40 : t.gu.length < 700 ? 34 : 29;
    await Promise.all([document.fonts.load(`${arSize}px ${arF}`), document.fonts.load(`${guSize}px ${guF}`), document.fonts.load(`40px "QalamMajeed"`)]).catch(() => { });
    const W = 1080, P0 = 64, inner = W - 2 * P0 - 2 * 56;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    // the ayah number is drawn as a gold ring after the last word
    const D = arSize * 0.95, gap = arSize * 0.3;
    x.font = `${arSize}px ${arF}`; x.direction = 'rtl';
    const arLines = wrapLines(x, arT(t.ar), inner);
    if (x.measureText(arLines[arLines.length - 1]).width + gap + D > inner) arLines.push('');
    x.font = `${guSize}px ${guF}`; x.direction = 'ltr';
    const guLines = wrapLines(x, t.gu, inner);
    const arLH = arSize * 1.95, guLH = guSize * 1.6;
    const cardH = 56 + 110 + 30 + arLines.length * arLH + 40 + guLines.length * guLH + 56;
    const H = P0 + cardH + 120;
    c.width = W; c.height = H;
    // background and card
    const bg = x.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0E5C51'); bg.addColorStop(1, '#06352F');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    rr(P0, P0, W - 2 * P0, cardH, 36); x.fillStyle = '#FFFDF8'; x.fill();
    x.lineWidth = 4; x.strokeStyle = '#D9B25C'; x.stroke();
    rr(P0 + 14, P0 + 14, W - 2 * P0 - 28, cardH - 28, 26); x.lineWidth = 1.5; x.strokeStyle = 'rgba(184,137,43,.45)'; x.stroke();
    // surah heading
    let y = P0 + 56;
    x.textAlign = 'center'; x.direction = 'rtl';
    x.fillStyle = '#B8892B'; x.font = `56px "QalamMajeed", serif`;
    x.fillText(m.ar, W / 2, y + 50);
    x.direction = 'ltr'; x.fillStyle = '#0A4D44'; x.font = `600 30px ${guF}`;
    x.fillText(EN() ? `${m.en} · ${s}:${n}` : `${m.en} · ${m.gu} · ${s}:${n}`, W / 2, y + 100);
    y += 110 + 30;
    // Arabic, right to left
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#0D2622'; x.font = `${arSize}px ${arF}`;
    arLines.forEach((l, i) => {
      const base = y + arSize * 1.25;
      if (i < arLines.length - 1) { x.fillText(l, W / 2, base); y += arLH; return; }
      const w = l ? x.measureText(l).width + gap : 0, left = W / 2 - (w + D) / 2;
      if (l) { x.textAlign = 'right'; x.fillText(l, left + w + D, base); x.textAlign = 'center'; }
      const cx = left + D / 2, cy = base - arSize * 0.32;
      x.beginPath(); x.arc(cx, cy, D / 2, 0, Math.PI * 2);
      x.fillStyle = '#FBF3DE'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#B8892B'; x.stroke();
      x.fillStyle = '#7A5A14'; x.direction = 'ltr'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${Math.round(D * 0.5)}px "NotoGuj", sans-serif`;
      x.fillText(String(n), cx, cy + 1);
      x.textBaseline = 'alphabetic'; x.fillStyle = '#0D2622'; x.font = `${arSize}px ${arF}`; x.direction = 'rtl';
      y += arLH;
    });
    // gold line, then the Gujarati meaning
    y += 10;
    x.fillStyle = '#D9B25C'; x.fillRect(W / 2 - 120, y, 240, 3);
    y += 30;
    x.direction = 'ltr'; x.textAlign = 'center'; x.fillStyle = '#1C2826'; x.font = `${guSize}px ${guF}`;
    for (const l of guLines) { x.fillText(l, W / 2, y + guSize * 1.1); y += guLH; }
    // footer
    x.fillStyle = '#F3E7C8'; x.font = `600 34px "NotoGuj", sans-serif`;
    x.fillText('Noor-e-Quran', W / 2, H - 66);
    x.fillStyle = 'rgba(243,231,200,.7)'; x.font = `24px "NotoGuj", sans-serif`;
    x.fillText('Gujarati Translation & Tafseer', W / 2, H - 30);
    return c.toDataURL('image/png');
  }
  async function shareImage(s, n) {
    openSheet(`<h3>Share Ayat Image</h3><div class="sub">${esc(sm(s).en)} ${s}:${n}</div><div class="hint">Photo bane che…</div>`);
    const url = await ayahImage(s, n);
    const name = `${sm(s).en.replace(/[^\w -]/g, '')} ${s}-${n}`;
    openSheet(`<h3>Share Ayat Image</h3><div class="sub">${esc(sm(s).en)} ${s}:${n} · WhatsApp, status vagere ma mokli shako</div>
      <img class="share-prev" src="${url}" alt="">
      <button class="btn block" id="imgGo" style="margin-top:12px">${ICON.share} Share Image</button>`, sh => {
      $('#imgGo', sh).onclick = () => {
        closeSheet();
        if (N.shareImage) N.shareImage(url.split(',')[1], name, `${sm(s).en} (${s}:${n}) — Noor-e-Quran`);
        else { const a = document.createElement('a'); a.href = url; a.download = name + '.png'; a.click(); }
      };
    });
  }

  // ---------------------------------------------------------------- my notes on an ayah
  let NOTES = load('qm.notes', {});
  const noteHtml = (s, n) => {
    const v = NOTES[`${s}:${n}`];
    return v ? `<div class="my-note" data-act="note">${ICON.edit}<span>${esc(v.t)}</span></div>` : '';
  };
  function openNoteSheet(s, n) {
    const k = `${s}:${n}`, cur = NOTES[k];
    openSheet(`<h3>My note · ${esc(sm(s).en)} ${s}:${n}</h3>
      <div class="sub">Aa ayat vishe tamaro vichar, dars ni vaat ke yaad rakhvani vaat lakho</div>
      <textarea class="note-input" id="noteT" rows="5" placeholder="Ahi lakho…">${esc(cur ? cur.t : '')}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" id="noteSave" style="flex:1">${ICON.check} Save</button>
        ${cur ? `<button class="btn ghost" id="noteDel">${ICON.trash} Delete</button>` : ''}</div>`, sh => {
      setTimeout(() => $('#noteT', sh).focus(), 250);
      const done = () => {
        store('qm.notes', NOTES); closeSheet();
        const card = document.getElementById(`a-${s}-${n}`);
        if (card) {
          const old = $('.my-note', card);
          if (old) old.remove();
          $('.gu-text', card).insertAdjacentHTML('afterend', noteHtml(s, n));
        }
        if (route && route.name === 'saved') renderSaved();
      };
      $('#noteSave', sh).onclick = () => {
        const t = $('#noteT', sh).value.trim();
        if (t) NOTES[k] = { t, at: Date.now() }; else delete NOTES[k];
        done(); toast(t ? 'Note save thai' : 'Note kadhi nakhi');
      };
      const del = $('#noteDel', sh);
      if (del) del.onclick = () => { delete NOTES[k]; done(); toast('Note kadhi nakhi'); };
    });
  }

  // ---------------------------------------------------------------- hifz: Arabic hidden until tapped, and a check by voice
  // a tap on hidden Arabic shows it (before the grammar-word tap sees it)
  // S.hzMode: each tap shows the next word, the next line, or the whole ayah
  view.addEventListener('click', e => {
    if (!document.body.classList.contains('hifz')) return;
    const box = e.target.closest('.ar-text');
    const card = box && box.closest('.ayah');
    if (!card || card.classList.contains('reveal')) return;
    e.stopPropagation();
    const mode = S.hzMode || 'ayah';
    if (mode === 'ayah') { card.classList.add('reveal'); return; }
    const all = hzWords(box), ws = all.filter(w => !w.classList.contains('mk'));
    const hidden = ws.filter(w => !w.classList.contains('shown'));
    if (!hidden.length) { card.classList.add('reveal'); return; }
    if (mode === 'word') hidden[0].classList.add('shown');
    else { // every word on the same line as the next hidden one
      const top = hidden[0].offsetTop, h = hidden[0].offsetHeight / 2;
      hidden.filter(w => Math.abs(w.offsetTop - top) < h).forEach(w => w.classList.add('shown'));
    }
    // a waqf sign standing on its own shows with the word before it
    let prev = false;
    for (const w of all) {
      if (w.classList.contains('mk')) w.classList.toggle('shown', prev);
      else prev = w.classList.contains('shown');
    }
    if (ws.every(w => w.classList.contains('shown'))) card.classList.add('reveal');
  }, true);
  /** The ayah's words, each wrapped once in <span class="hw"> (inside grammar colour spans too); a token
   *  without letters (a waqf sign on its own) is <span class="hw mk">. */
  function hzWords(box) {
    if (!$('.hw', box)) { // (grammar colours on/off rewrite the text, so look for the spans themselves)
      const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, { acceptNode: t => t.parentNode.closest('.aya-end') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      for (const t of nodes) {
        const frag = document.createDocumentFragment();
        for (const part of t.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          const sp = document.createElement('span'), word = isWordTok(part);
          sp.className = word ? 'hw' : 'hw mk';
          // a lone waqf sign is drawn on the space before it, so that space goes inside its span too
          const ws = !word && frag.lastChild && frag.lastChild.nodeType === 3 ? frag.lastChild : null;
          if (ws) ws.remove();
          sp.textContent = (ws ? ws.textContent : '') + part;
          frag.appendChild(sp);
        }
        t.replaceWith(frag);
      }
      box.classList.add('hz-split');
    }
    return $$('.hw', box);
  }
  function hzReset() {
    $$('.ayah.reveal').forEach(x => x.classList.remove('reveal'));
    $$('.hw.shown').forEach(x => x.classList.remove('shown'));
  }

  async function hifzCheck(s, n) {
    if (!N.listen) { toast('Aa phone ma app ma j chalshe'); return; }
    const a = (await loadSurah(s)).ayahs[n - 1];
    const words = a[0].split(' ').filter(isWordTok);
    const want = words.map(w => normAr(w).replace(/\s/g, ''));
    const r = await nativeCall('listen', 'ar-SA');
    if (r && r.none) { toast(L('આ ફોનમાં Voice (Google) ઉપલબ્ધ નથી', 'Voice (Google) is not available on this phone')); return; }
    const heard = r && r.ok ? r.texts.map(t => String(t).trim()).filter(Boolean) : [];
    if (!heard.length) { toast(L('કંઈ સંભળાયું નહીં — ફરી બોલો', 'Nothing was heard — speak again')); return; }
    // the recognizer's best guess that matches the most words
    const loose = w => w.replace(/[اويى]/g, '');
    let best = null;
    for (const h of heard) {
      const got = normAr(h).split(' ').map(w => w.replace(/\s/g, ''));
      const gotL = got.map(loose);
      const ok = want.map(w => got.includes(w) || gotL.includes(loose(w)) || (w.startsWith('ال') && got.includes(w.slice(2))));
      const score = ok.filter(Boolean).length;
      if (!best || score > best.score) best = { ok, score, text: h };
    }
    const pct = Math.round(100 * best.score / Math.max(1, want.length));
    openSheet(`<h3>Hifz · ${esc(sm(s).en)} ${s}:${n}</h3>
      <div class="hz-score ${pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low'}"><b>${pct}%</b><span>${pct >= 80 ? L('માશાઅલ્લાહ! બરાબર યાદ છે', 'MashaAllah! Well memorised') : pct >= 50 ? L('સરસ, થોડું બાકી છે', 'Good, a little more to go') : L('ફરીથી પ્રયત્ન કરો', 'Try again')}</span></div>
      <div class="sub">${L('લીલા શબ્દો બરાબર સંભળાયા · લાલ શબ્દો રહી ગયા અથવા સ્પષ્ટ ન સંભળાયા', 'Green words were heard right · red words were missed or unclear')}</div>
      <div class="hz-words">${words.map((w, i) => `<span class="${best.ok[i] ? 'ok' : 'miss'}">${esc(arT(w))}</span>`).join(' ')}</div>
      <div class="mt-note">${L('સંભળાયું', 'Heard')}: ${esc(best.text)}</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" id="hzAgain" style="flex:1">${ICON.mic} ${L('ફરી બોલો', 'Speak again')}</button>
        <button class="btn ghost" id="hzListen" style="flex:1">${ICON.playO} ${L('આયત સાંભળો', 'Listen to ayah')}</button></div>`, sh => {
      $('#hzAgain', sh).onclick = () => { closeSheet(); hifzCheck(s, n); };
      $('#hzListen', sh).onclick = () => { closeSheet(); playAyah(s, n); };
    });
  }

  // ---------------------------------------------------------------- khatam tracker: pages read, a daily goal, khatams done
  const KH = Object.assign({ done: 0, pages: [], goal: 20, days: {}, start: Date.now() }, load('qm.khatam', {}));
  const saveKh = () => store('qm.khatam', KH);
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayPages = () => (KH.days[dayKey()] || []).length;
  /** Every Mushaf page with an ayah on the screen counts as read (once per khatam, and once per day). */
  function markRead() {
    if (!S.feat.khatam || !route || (route.name !== 'surah' && route.name !== 'juz')) return;
    const vh = window.innerHeight, seen = new Set();
    for (const el of $$('.ayah')) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 90) continue;
      if (r.top > vh) break;
      if (el.dataset.pg) seen.add(Number(el.dataset.pg));
    }
    if (!seen.size) return;
    const all = new Set(KH.pages), k = dayKey(), today = new Set(KH.days[k] || []);
    let changed = false;
    for (const p of seen) {
      if (!all.has(p)) { all.add(p); changed = true; }
      if (!today.has(p)) { today.add(p); changed = true; }
    }
    if (!changed) return;
    const before = (KH.days[k] || []).length;
    KH.pages = [...all]; KH.days[k] = [...today];
    // keep 60 days of history
    const keys = Object.keys(KH.days).sort();
    while (keys.length > 60) delete KH.days[keys.shift()];
    if (before < KH.goal && today.size >= KH.goal) toast(`MashaAllah! Today's target done (${KH.goal} pages)`);
    if (KH.pages.length >= 604) {
      KH.done++; KH.pages = []; KH.start = Date.now();
      saveKh();
      openSheet(`<div class="kh-done">${ICON.star}<h3>Mubarak! Khatam Completed 🌙</h3>
        <p>You have completed the whole Quran — this is your Khatam no. ${KH.done}.</p>
        <p class="sub">May Allah accept it. A new Khatam has now started.</p></div>`);
      return;
    }
    saveKh();
  }
  const GOALS = [[5, '5 pages'], [10, '10 pages'], [20, '1 Sipara (20)'], [40, '2 Sipara (40)'], [60, '3 Sipara (60)']];
  function khatamCardHtml(half) {
    const t = todayPages(), g = KH.goal, pct = Math.round(100 * KH.pages.length / 604);
    // half: beside the Quran Words card on Home
    if (half) return `<button class="kh-card half" id="khCard">
      <div class="hc-top"><span class="kh-ic">${ICON.target}</span><div><b class="hc-t">Today</b><span class="hc-v">${t} / ${g} pages</span></div></div>
      <div class="kh-bar"><i style="width:${Math.min(100, 100 * t / g)}%"></i></div>
      <span class="hc-s">Khatam ${pct}%${KH.done ? ` · ${KH.done}×` : ''}</span></button>`;
    return `<button class="kh-card" id="khCard">
      <span class="kh-ic">${ICON.target}</span>
      <div class="main">
        <div class="kh-l"><b>Today</b><span>${t} / ${g} pages</span></div>
        <div class="kh-bar"><i style="width:${Math.min(100, 100 * t / g)}%"></i></div>
        <div class="kh-l sm"><span>Khatam: ${pct}% · ${KH.pages.length}/604 pages</span><span>${KH.done ? `Completed ${KH.done}×` : ''}</span></div>
      </div>${ICON.chev}</button>`;
  }
  function openKhatamSheet() {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const max = Math.max(KH.goal, ...days.map(d => (KH.days[dayKey(d)] || []).length));
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const custom = !GOALS.some(([v]) => v === KH.goal);
    openSheet(`<h3>Khatam & Daily Target</h3>
      <div class="sub">Every page you read on the screen is counted automatically</div>
      <div class="kh-week">${days.map((d, i) => {
        const c = (KH.days[dayKey(d)] || []).length;
        return `<div class="kh-day ${c >= KH.goal ? 'hit' : ''}"><small>${c || ''}</small><i style="height:${Math.round(100 * c / max)}%"></i><span>${i === 6 ? 'Today' : names[d.getDay()]}</span></div>`;
      }).join('')}</div>
      <div class="sec">Daily Target (pages per day)</div>
      ${chips('khGoal', GOALS.concat(custom ? [[KH.goal, `${KH.goal} pages`]] : []), KH.goal)}
      <div class="custom-time" style="margin-top:10px">
        <label><input type="number" id="khCustom" inputmode="numeric" min="1" max="604" placeholder="15"><span>pages</span></label>
        <button class="btn" id="khSet">Set Custom Target</button>
      </div>
      <div class="s-card" style="margin-top:14px">
        <div class="s-row"><div class="main"><div class="t">Current (in progress)</div><div class="d">${KH.pages.length} of 604 pages read (${Math.round(100 * KH.pages.length / 604)}%) · Started on ${new Date(KH.start).toLocaleDateString('en-IN')}</div></div></div>
        <div class="s-row"><div class="main"><div class="t">Completed</div><div class="d">${KH.done ? `${KH.done} time${KH.done === 1 ? '' : 's'} — the whole Quran read` : 'None yet'}</div></div></div>
      </div>
      <button class="btn ghost block" id="khReset" style="margin-top:12px">Start a New Khatam (count from 0)</button>`, sh => {
      const setGoal = v => { KH.goal = v; saveKh(); if (route.name === 'home') renderHome(); openKhatamSheet(); toast(`Daily target: ${v} pages`); };
      bindChips(sh, 'khGoal', v => setGoal(Number(v)));
      $('#khSet', sh).onclick = () => {
        const v = Math.round(Number($('#khCustom', sh).value));
        if (!(v >= 1 && v <= 604)) { toast('Type pages between 1 and 604'); return; }
        setGoal(v);
      };
      $('#khReset', sh).onclick = () => {
        if (!confirm('Start a new Khatam? The current count goes back to 0.')) return;
        KH.pages = []; KH.start = Date.now(); saveKh(); closeSheet();
        if (route.name === 'home') renderHome();
        toast('New Khatam started');
      };
    });
  }

  // ---------------------------------------------------------------- sipara progress: a see-through bar at the side, shown on a tap
  const JB = { on: false, timer: 0 };
  let CUM = null; // ayahs before each surah
  const gIdx = (s, n) => {
    if (!CUM) { CUM = [0]; META.surahs.forEach(m => CUM.push(CUM[CUM.length - 1] + m.a)); }
    return CUM[s - 1] + n - 1;
  };
  function drawJuzBar() {
    const f = firstVisibleAyah();
    if (!f) return;
    const j = juzOf(f[0], f[1]), z = META.juz[j - 1], nx = META.juz[j];
    const a = gIdx(z.s, z.a), b = nx ? gIdx(nx.s, nx.a) : 6236;
    const pct = Math.max(0, Math.min(100, Math.round(100 * (gIdx(f[0], f[1]) - a) / (b - a))));
    const el = document.getElementById(`a-${f[0]}-${f[1]}`), pg = el ? Number(el.dataset.pg) : 0;
    const left = pg ? Math.max(0, (nx ? nx.p - 1 : 604) - pg) : null;
    let bar = $('#juzBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'juzBar'; document.body.appendChild(bar); }
    bar.innerHTML = `<div class="jb-track"><i style="height:${pct}%"></i><b style="top:${pct}%"></b></div>
      <div class="jb-tip" style="top:${pct}%"><b>Sipara ${j}</b><span>${pct}%${left != null ? ` · ${left} ${L('પેજ બાકી', 'pages left')}` : ''}</span></div>`;
    requestAnimationFrame(() => bar.classList.add('on'));
  }
  function showJuzBar() {
    if (!S.feat.juzBar) return;
    JB.on = true;
    drawJuzBar();
    clearTimeout(JB.timer);
    JB.timer = setTimeout(() => hideJuzBar(), 2600);
  }
  function hideJuzBar(now) {
    JB.on = false;
    clearTimeout(JB.timer);
    const bar = $('#juzBar');
    if (!bar) return;
    bar.classList.remove('on');
    if (now) bar.remove();
  }
  // a tap on the text (not on a button or word) shows where we are in the sipara
  view.addEventListener('click', e => {
    if (!route || (route.name !== 'surah' && route.name !== 'juz')) return;
    if (e.target.closest('button, a, input, [data-act], [data-gi], details, .my-note')) return;
    if (!e.target.closest('.ayah, .surah-head, .juz-mark, .page-mark')) return;
    showJuzBar();
  });

  // ---------------------------------------------------------------- duas of the Quran (own tab) and ayahs by topic
  // [Gujarati title, surah, first ayah, last ayah]
  const DUAS = [
    ['હિદાયત (સીધા રસ્તા) માટેની દુઆ', 1, 5, 7],
    ['અમલ કબૂલ થવાની દુઆ', 2, 127, 127],
    ['ફરમાંબરદાર બનવા અને તૌબા કબૂલ થવાની દુઆ', 2, 128, 128],
    ['દુનિયા અને આખેરતની ભલાઈની દુઆ', 2, 201, 201],
    ['સબ્ર અને મજબૂત કદમની દુઆ', 2, 250, 250],
    ['બોજ ન નાખવા, માફી અને મદદની દુઆ', 2, 286, 286],
    ['હિદાયત પછી દિલ ન ફરે તે માટેની દુઆ', 3, 8, 9],
    ['ગુનાહની માફી અને જહન્નમથી બચાવ', 3, 16, 16],
    ['નેક ઓલાદની દુઆ (હ. ઝકરીયા અ.)', 3, 38, 38],
    ['હકની ગવાહી આપનારાઓમાં લખી લેવાની દુઆ', 3, 53, 53],
    ['ગુનાહની માફી અને કાફિરો સામે મદદ', 3, 147, 147],
    ['અલ્લાહની ખિલકત પર વિચારનારાઓની દુઆ', 3, 191, 194],
    ['હ. આદમ (અ.) ની તૌબા', 7, 23, 23],
    ['ઝાલિમો સાથે ન રાખવાની દુઆ', 7, 47, 47],
    ['ઝાલિમ લોકોથી નજાતની દુઆ', 10, 85, 86],
    ['મુસલમાન તરીકે મૌત અને નેક લોકોનો સાથ (હ. યુસુફ અ.)', 12, 101, 101],
    ['નમાઝ કાયમ કરવા અને વાલેદૈનની માફીની દુઆ', 14, 40, 41],
    ['માં-બાપ પર રહેમની દુઆ', 17, 24, 24],
    ['સચ્ચાઈ સાથે દાખલ થવા અને નીકળવાની દુઆ', 17, 80, 80],
    ['રહેમત અને સાચી હિદાયતની દુઆ (અસ્હાબે કહફ)', 18, 10, 10],
    ['દિલ ખુલવા અને કામ આસાન થવાની દુઆ (હ. મૂસા અ.)', 20, 25, 28],
    ['ઇલ્મ વધવાની દુઆ', 20, 114, 114],
    ['બીમારી અને તકલીફમાં દુઆ (હ. ઐયુબ અ.)', 21, 83, 83],
    ['મુસીબતમાંથી નજાતની દુઆ (હ. યુનુસ અ.)', 21, 87, 87],
    ['ઓલાદ માટેની દુઆ (હ. ઝકરીયા અ.)', 21, 89, 89],
    ['બરકતવાળી જગ્યાએ ઉતરવાની દુઆ', 23, 29, 29],
    ['શેતાનના વસવસાથી પનાહ', 23, 97, 98],
    ['ઈમાન, માફી અને રહેમતની દુઆ', 23, 109, 109],
    ['માફી અને રહેમતની દુઆ', 23, 118, 118],
    ['જહન્નમના અઝાબથી બચાવની દુઆ', 25, 65, 66],
    ['નેક પત્ની અને ઓલાદ (આંખોની ઠંડક)', 25, 74, 74],
    ['ઇલ્મ, હિકમત અને નેક લોકોનો સાથ (હ. ઇબ્રાહીમ અ.)', 26, 83, 83],
    ['શુક્ર અને નેક અમલની તૌફીક (હ. સુલયમાન અ.)', 27, 19, 19],
    ['ગુનાહની માફીની દુઆ (હ. મૂસા અ.)', 28, 16, 16],
    ['રોઝી અને ભલાઈની દુઆ (હ. મૂસા અ.)', 28, 24, 24],
    ['ફસાદ કરનારાઓ સામે મદદ (હ. લૂત અ.)', 29, 30, 30],
    ['નેક ફરઝંદની દુઆ (હ. ઇબ્રાહીમ અ.)', 37, 100, 100],
    ['શુક્ર, નેક ઓલાદ અને તૌબાની દુઆ', 46, 15, 15],
    ['મોઅમીન ભાઈઓ માટે દુઆ અને દિલની સફાઈ', 59, 10, 10],
    ['અલ્લાહ પર ભરોસાની દુઆ', 60, 4, 5],
    ['નૂર પૂરું થવા અને માફીની દુઆ', 66, 8, 8],
    ['જન્નતમાં ઘરની દુઆ (જ. આસિયા)', 66, 11, 11],
    ['વાલેદૈન અને મોઅમીનો માટે માફી (હ. નૂહ અ.)', 71, 28, 28]
  ];
  // [Gujarati topic, Arabic, [[surah, ayah], ...]]
  const TOPICS = [
    ['નમાઝ', 'الصَّلَاة', [[2, 43], [2, 45], [2, 238], [4, 103], [11, 114], [17, 78], [20, 14], [29, 45], [62, 9]]],
    ['સબ્ર (ધીરજ)', 'الصَّبْر', [[2, 153], [2, 155], [2, 156], [2, 157], [3, 200], [94, 5], [94, 6], [103, 3]]],
    ['માં-બાપ (વાલેદૈન)', 'الْوَالِدَيْن', [[2, 83], [4, 36], [6, 151], [17, 23], [17, 24], [29, 8], [31, 14], [31, 15], [46, 15]]],
    ['અહલેબૈત (અ.સ.)', 'أَهْلُ الْبَيْت', [[3, 61], [4, 59], [5, 55], [5, 67], [33, 33], [42, 23], [76, 8]]],
    ['જન્નત', 'الْجَنَّة', [[3, 133], [9, 72], [13, 35], [47, 15], [55, 46], [98, 8]]],
    ['તૌબા અને ઇસ્તગફાર', 'التَّوْبَة', [[4, 17], [4, 110], [11, 3], [25, 70], [39, 53], [66, 8]]],
    ['દુઆ', 'الدُّعَاء', [[2, 186], [7, 55], [27, 62], [40, 60]]],
    ['રોઝા', 'الصِّيَام', [[2, 183], [2, 184], [2, 185]]],
    ['હજ', 'الْحَجّ', [[2, 197], [3, 97], [22, 27]]],
    ['સદકો અને અલ્લાહની રાહમાં ખર્ચ', 'الْإِنْفَاق', [[2, 261], [2, 262], [2, 274], [3, 134], [9, 60], [57, 18]]],
    ['ઇલ્મ', 'الْعِلْم', [[20, 114], [35, 28], [39, 9], [58, 11], [96, 1]]],
    ['શુક્ર', 'الشُّكْر', [[2, 152], [14, 7], [31, 12]]],
    ['તકવા (પરહેઝગારી)', 'التَّقْوَى', [[3, 102], [9, 119], [49, 13], [65, 3]]],
    ['ઇન્સાફ અને સચ્ચાઈ', 'الْعَدْل', [[4, 135], [5, 8], [33, 70], [9, 119]]],
    ['અલ્લાહ પર ભરોસો (તવક્કુલ)', 'التَّوَكُّل', [[3, 159], [8, 2], [9, 51], [65, 3]]],
    ['અલ્લાહની યાદ (ઝિક્ર)', 'الذِّكْر', [[2, 152], [3, 191], [13, 28], [33, 41]]],
    ['મૌત અને આખેરત', 'الْمَوْت', [[3, 185], [4, 78], [21, 35], [29, 57], [62, 8]]],
    ['યતીમ અને ગરીબ', 'الْيَتِيم', [[2, 220], [4, 10], [76, 8], [93, 9], [107, 2]]],
    ['હલાલ રોઝી અને વ્યાજ', 'الْحَلَال', [[2, 172], [5, 88], [2, 275], [2, 278]]],
    ['સારા અખ્લાક (ગુસ્સો, માફી)', 'الْأَخْلَاق', [[3, 134], [24, 22], [41, 34], [42, 37], [42, 40], [49, 11], [49, 12]]],
    ['કુરઆન', 'الْقُرْآن', [[2, 2], [15, 9], [17, 9], [17, 82], [54, 17]]],
    // Ayat al-Kursi as the Shia read it: 2:255 to 2:257
    ['તૌહીદ (અલ્લાહ એક છે)', 'التَّوْحِيد', [[112, 1], [2, 255, 257], [59, 22], [59, 23], [59, 24]]]
  ];

  /** One ayah (or a few) as a card: Arabic, Gujarati, and a link into the Quran. */
  async function ayahCards(s, from, to) {
    const d = await loadSurah(s);
    let ar = '', gu = '';
    for (let n = from; n <= to; n++) {
      const a = d.ayahs[n - 1];
      ar += `${esc(arT(a[arFont().script] || a[0]))} <span class="aya-end"><b>${an(n)}</b></span> `;
      gu += (gu ? ' ' : '') + `(${n}) ${esc(a[2])}`;
    }
    return { ar, gu };
  }

  async function renderDuas() {
    setBar({ title: L('Quran ni Duao', 'Duas of the Quran'), sub: `${DUAS.length} ${L('દુઆ', 'duas')}`, tabs: 'duas' });
    view.innerHTML = '<div class="hint">Loading…</div>';
    const cards = await Promise.all(DUAS.map(([, s, a, b]) => ayahCards(s, a, b)));
    if (!route || route.name !== 'duas') return;
    view.innerHTML = `<div class="hint" style="padding:2px 6px 12px;text-align:left">${L('કુરઆન મજીદની દુઆઓ — અરબી, ગુજરાતી અર્થ અને કારીના અવાજ સાથે.', 'Duas of the Holy Quran — with Arabic, English meaning and the qari\'s recitation.')}</div>
      ${DUAS.map(([t, s, a, b], i) => `<article class="dua" data-i="${i}">
        <div class="dua-h"><span class="dua-n">${i + 1}</span><div class="main"><b>${esc(nameL(t))}</b>
          <small>${esc(sm(s).en)} · ${s}:${a}${b > a ? '–' + b : ''}</small></div></div>
        <div class="ar-text dua-ar">${cards[i].ar}</div>
        <div class="gu-text dua-gu">${cards[i].gu}</div>
        <div class="dua-acts">
          <button data-d="play">${ICON.playO} ${L('સાંભળો', 'Listen')}</button>
          <button data-d="open">${ICON.book} ${L('કુરઆનમાં જુઓ', 'See in Quran')}</button>
          <button data-d="img">${ICON.image} Photo</button>
        </div></article>`).join('')}`;
    view.onclick = e => {
      const b = e.target.closest('[data-d]'); if (!b || !route || route.name !== 'duas') return;
      const [, s, a, z] = DUAS[Number(b.closest('[data-i]').dataset.i)];
      if (b.dataset.d === 'open') go(`#/s/${s}?a=${a}`);
      else if (b.dataset.d === 'img') shareImage(s, a);
      else playDua(s, a, z);
    };
  }

  /** Plays ayahs from..to once; the Lite APK first downloads just those ayahs when the surah is not on the phone. */
  async function playDua(s, from, to) {
    if (!HAS_AUDIO && !DLS[s]) {
      if (!N.fetchAyahs) { toast('Download is available in the app'); return; }
      toast(L('દુઆનો અવાજ ડાઉનલોડ થાય છે…', 'Downloading the dua\'s audio…'));
      const r = await nativeCall('fetchAyahs', s, needsBism(s, from) ? 0 : from, to);
      if (!r || !r.ok) { toast(L('અવાજ ડાઉનલોડ ન થયો — ઇન્ટરનેટ તપાસો', 'Audio did not download — check the internet')); return; }
    }
    P.range = { s, from, to, times: 1, single: true };
    P.rangeRep = 0;
    playAyah(s, from, true);
  }

  async function renderTopic() {
    const [gu, ar, refs] = TOPICS[route.t];
    setBar({ title: nameL(gu), sub: `${refs.length} Ayat · ${L('Vishay', 'Subject')}`, back: true });
    view.innerHTML = '<div class="hint">Loading…</div>';
    const cards = await Promise.all(refs.map(([s, n, to]) => ayahCards(s, n, to || n)));
    if (!route || route.name !== 'topic') return;
    view.innerHTML = `<div class="topic-head"><div class="ar">${esc(ar)}</div><b>${esc(nameL(gu))}</b></div>
      ${refs.map(([s, n, to], i) => `<a class="res topic-ayah" href="${onlyLink(s, n, to || n, nameL(gu), ar)}">
        <div class="hd">${esc(sm(s).en)} · ${s}:${n}${to > n ? '–' + to : ''}</div>
        <div class="ar-text dua-ar">${cards[i].ar}</div>
        <div class="tx">${esc(cards[i].gu.replace(/^\(\d+\) /, ''))}</div></a>`).join('')}`;
  }

  // ---------------------------------------------------------------- today's ayah (a notification every day)
  /** Ayahs for the daily notification: the duas, the topics and the famous ayahs, in a mixed but fixed order. */
  async function dailyList() {
    const refs = [];
    const add = (s, n) => { if (!refs.some(r => r[0] === s && r[1] === n)) refs.push([s, n]); };
    TOPICS.forEach(t => t[2].forEach(([s, n]) => add(s, n)));
    DUAS.forEach(([, s, a]) => add(s, a));
    FAMOUS.forEach(f => add(f[2], f[3]));
    // fixed shuffle so the same ayah does not come two days running
    let seed = 7;
    for (let i = refs.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = seed % (i + 1); [refs[i], refs[j]] = [refs[j], refs[i]]; }
    const ds = await Promise.all(refs.map(([s]) => loadSurah(s)));
    // the Arabic (5th) is for the home-screen widget, in the script and spelling of the chosen font
    const sc = arFont().script;
    return refs.map(([s, n], i) => { const a = ds[i].ayahs[n - 1]; return [s, n, sm(s).en, a[2].replace(/^\(\d+\)\s*/, ''), arT(a[sc] || a[0])]; });
  }

  /** Sends the widget its list, fonts and colours, only when one of them changed since the last time. */
  let widgetT = 0;
  function saveWidget() {
    if (!N.widgetData || !META) return;
    clearTimeout(widgetT);
    widgetT = setTimeout(async () => {
      const css = getComputedStyle(document.documentElement), v = k => css.getPropertyValue(k).trim();
      const col = [v('--hero-1') || '#0E5C51', v('--primary-2') || '#06352F', v('--gold-2') || '#D9B25C'];
      const key = [1, arFont().file, guFont().file, ...col, S.lang || 'gu'].join('|');
      if (load('qm.widgetKey', '') === key) return;
      const list = JSON.stringify(await dailyList());
      N.widgetData(list, arFont().file, guFont().file, ...col);
      store('qm.widgetKey', key);
    }, 1500);
  }
  async function saveDaily() {
    if (!N.dailyAyah) return;
    const on = !!S.daily, list = on ? JSON.stringify(await dailyList()) : '';
    if (on !== !!S.daily) return; // switched again while the list was being made
    const [h, m] = String(S.dailyAt || '07:00').split(':').map(Number);
    N.dailyAyah(on, h || 0, m || 0, list);
  }

  // ---------------------------------------------------------------- backup of bookmarks, notes, khatam and settings
  // which localStorage keys belong to which choice (the rest, like the widget's key, is not kept)
  const BK_KEYS = { marks: ['qm.bm', 'qm.tabs', 'qm.bmTab', 'qm.notes', 'qm.khatam', 'qm.last', 'qm.fav'], set: ['qm.settings', 'qm.homeTab', 'qm.tafsAr'] };
  const backupInfo = () => { try { return JSON.parse(N.backupInfo()); } catch (e) { return { tafsir: 0, audio: 0, audioBytes: 0 }; } };
  const bkRow = (id, t, d, on, off) => `<div class="s-row"><div class="main"><div class="t">${t}</div><div class="d">${d}</div></div>
    <label class="switch"><input type="checkbox" id="${id}" ${on && !off ? 'checked' : ''} ${off ? 'disabled' : ''}><i></i></label></div>`;
  const bkTafsD = n => n ? L(`${num(n)} આયતની તફસીર`, `Tafseer of ${num(n)} ayahs`) : L('હજી કોઈ તફસીર સાચવી નથી', 'No tafseer saved yet');
  const bkAudioD = (n, b) => n ? L(`${n} સૂરહનો અવાજ · ${mb(b)}`, `Recitation of ${n} surahs · ${mb(b)}`) : L('હજી કોઈ અવાજ ડાઉનલોડ નથી કર્યો', 'No audio downloaded yet');
  // the progress of a long backup or restore, in place of the choices
  const bkBusy = (sh, t) => {
    sh.innerHTML = `<div class="grip"></div><h3>${t}</h3>
      <div class="sub">${L('App ખુલ્લી રાખો — અવાજ હોય તો થોડી વાર લાગશે.', 'Keep the app open — with audio it takes a while.')}</div>
      <div class="tf-bar"><i id="bkBar" style="width:0"></i></div><div class="hint" id="bkPct">0%</div>`;
  };
  function onBkp(done, total) {
    const pct = total > 0 ? Math.min(100, Math.floor(100 * done / total)) : 0;
    const bar = $('#bkBar'), t = $('#bkPct');
    if (bar) bar.style.width = pct + '%';
    if (t) t.textContent = pct + '%';
  }

  function makeBackup() {
    const info = backupInfo();
    openSheet(`<h3>Create Backup</h3>
      <div class="sub">${L('બેકઅપમાં શું લેવું છે તે પસંદ કરો', 'Choose what goes in the backup')}</div>
      <div class="s-card bk-list">
        ${bkRow('bkMarks', 'Bookmarks & Notes', L('Collections, notes, ખતમ અને વાંચવાની જગ્યા', 'Collections, notes, khatam and reading place'), true)}
        ${bkRow('bkSet', 'Settings', L('Fonts, theme, ભાષા અને બાકીના settings', 'Fonts, theme, language and other settings'), true)}
        ${bkRow('bkTafs', 'Tafseer', bkTafsD(info.tafsir), true, !info.tafsir)}
        ${HAS_AUDIO ? '' : bkRow('bkAudio', 'Audio', bkAudioD(info.audio, info.audioBytes), false, !info.audio)}
      </div>
      <button class="btn block" id="bkGo" style="margin-top:14px">${ICON.down} Save Backup</button>`, sh => {
      $('#bkGo', sh).onclick = async () => {
        const on = id => { const x = $('#' + id, sh); return !!(x && x.checked); };
        const o = { marks: on('bkMarks'), set: on('bkSet'), tafsir: on('bkTafs'), audio: on('bkAudio') };
        if (!o.marks && !o.set && !o.tafsir && !o.audio) { toast(L('કંઈક તો પસંદ કરો', 'Choose at least one')); return; }
        const keys = [...(o.marks ? BK_KEYS.marks : []), ...(o.set ? BK_KEYS.set : [])], data = {};
        for (const k of keys) { const v = localStorage.getItem(k); if (v != null) data[k] = v; }
        const json = JSON.stringify({ app: 'Noor-e-Quran', v: 2, at: new Date().toISOString(), data,
          has: { tafsir: o.tafsir ? info.tafsir : 0, audio: o.audio ? info.audio : 0, audioBytes: o.audio ? info.audioBytes : 0 } }, null, 1);
        const zip = o.tafsir || o.audio, name = `Noor-e-Quran backup ${dayKey()}.${zip ? 'zip' : 'json'}`;
        if (!N.saveBackup) {
          if (zip) { toast(L('આ ફોનની app માં જ ચાલશે', 'Works only in the phone app')); return; }
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          a.download = name; a.click();
          closeSheet();
          return;
        }
        if (zip) bkBusy(sh, 'Create Backup');
        const r = zip ? await nativeCall('saveBackupZip', name, json, o.tafsir, o.audio) : await nativeCall('saveBackup', name, json);
        closeSheet();
        if (!r || !r.cancel) toast(r && r.ok ? L('બેકઅપ સચવાઈ ગયો', 'Backup saved') : L('બેકઅપ સચવાયો નહીં', 'Backup was not saved'));
      };
    });
  }

  async function restoreBackup() {
    if (!N.openBackup) { toast(L('આ ફોનની app માં જ ચાલશે', 'Works only in the phone app')); return; }
    const r = await nativeCall('openBackup');
    if (!r || r.cancel) return;
    let b = null;
    try { b = r.ok ? JSON.parse(r.text) : null; } catch (e) { b = null; }
    if (!b || b.app !== 'Noor-e-Quran' || !b.data) { toast(L('આ Noor-e-Quran ની બેકઅપ ફાઇલ નથી', 'This is not a Noor-e-Quran backup file')); return; }
    const has = (r.zip && b.has) || { tafsir: 0, audio: 0, audioBytes: 0 };
    const inFile = g => Object.keys(b.data).some(k => BK_KEYS[g].includes(k));
    const when = b.at ? new Date(b.at).toLocaleString('en-IN') : '';
    openSheet(`<h3>Restore Backup</h3>
      <div class="sub">${esc(when)} · ${L('શું પાછું લાવવું છે તે પસંદ કરો. પસંદ કરેલું અત્યારનું બદલાઈ જશે.', 'Choose what to bring back. What you choose replaces what is here now.')}</div>
      <div class="s-card bk-list">
        ${inFile('marks') ? bkRow('bkMarks', 'Bookmarks & Notes', L('Collections, notes, ખતમ અને વાંચવાની જગ્યા', 'Collections, notes, khatam and reading place'), true) : ''}
        ${inFile('set') ? bkRow('bkSet', 'Settings', L('Fonts, theme, ભાષા અને બાકીના settings', 'Fonts, theme, language and other settings'), true) : ''}
        ${has.tafsir ? bkRow('bkTafs', 'Tafseer', bkTafsD(has.tafsir), true) : ''}
        ${has.audio && !HAS_AUDIO ? bkRow('bkAudio', 'Audio', bkAudioD(has.audio, has.audioBytes), true) : ''}
      </div>
      <button class="btn block" id="bkGo" style="margin-top:14px">${ICON.check} Restore</button>`, sh => {
      $('#bkGo', sh).onclick = async () => {
        const on = id => { const x = $('#' + id, sh); return !!(x && x.checked); };
        const o = { marks: on('bkMarks'), set: on('bkSet'), tafsir: on('bkTafs'), audio: on('bkAudio') };
        if (!o.marks && !o.set && !o.tafsir && !o.audio) { toast(L('કંઈક તો પસંદ કરો', 'Choose at least one')); return; }
        if (o.tafsir || o.audio) {
          bkBusy(sh, 'Restore Backup');
          const total = (o.tafsir ? has.tafsir * 4096 : 0) + (o.audio ? has.audioBytes : 0);
          const z = await nativeCall('restoreZip', o.tafsir, o.audio, total);
          if (!z || !z.ok) { closeSheet(); toast(L('બેકઅપ પાછો ન આવ્યો', 'The backup could not be restored')); return; }
        }
        for (const g of ['marks', 'set']) if (o[g]) for (const k of BK_KEYS[g]) if (b.data[k] != null) localStorage.setItem(k, b.data[k]);
        closeSheet();
        toast(L('બેકઅપ પાછો આવી ગયો', 'Backup restored'));
        setTimeout(() => location.reload(), 600);
      };
    });
  }

  // ---------------------------------------------------------------- "What's New": shown once on Home after an update
  const WHATS_NEW = {
    ver: '8.8',
    // [icon, title, Gujarati text, English text (English mode; older items show the title only)]
    items: [
      ['paint', 'New Pattern & Logo', 'ઉપરના heading, Home અને સૂરહના લીલા box માં નવી હળવી pattern. Heading અને Settings માં app icon જેવો જ logo. ઉપરના 5 icon ની કિનાર સોનેરી',
        'A new light pattern in the top heading, on Home and in the surah heading. The same logo as the app icon in the heading and in Settings. The five icons at the top have gold rims'],
      ['book', 'Sipara List in 3 Lines', 'Sipara યાદી: પહેલી લાઇનમાં Sipara નંબર, બીજીમાં કઈ સૂરહથી, ત્રીજીમાં આયત અને પેજ',
        'Sipara list: the Sipara number, then the surah it starts in, then the ayah and page'],
      ['paint', 'Full App Icon & Softer Bar', 'App નું icon હવે આખું ઘેરા લીલા રંગનું — આસપાસ સફેદ ભાગ નહીં. નીચેના bar ના ખૂણા સીધા અને ઉપર પેજ ધીમે ધીમે fade થાય',
        'The app icon now fills its whole tile — no white around it. The bottom bar has straight corners and the page fades softly into it'],
      ['paint', 'New Bottom Bar & Gold Icon', 'નીચેનો નવો bar: પસંદ કરેલા icon ઉપર ટપકું. App નું icon હવે ઘેરા લીલા રંગમાં સોનેરી logo સાથે, અને એ જ logo ઉપર heading માં',
        'A new bottom bar with a dot over the chosen icon. The app icon is now dark green with a gold logo, and the same logo is in the heading'],
      ['globe', 'Change Keyboard Language', 'Space bar પર long press કરો તો keyboard ખુલ્લું રહે અને ભાષા બદલવાનું મેનુ આવે',
        'Long press the space bar: the keyboard stays open and the language menu comes up'],
      ['heart', 'Favorite Surahs', 'Home માં Sajdah ની જગ્યાએ Favorite: Surah યાદીમાં ♡ દબાવો અને સૂરહ સીધી ત્યાંથી ખોલો',
        'Favorite in place of Sajdah on Home: press ♡ in the Surah list and open the surah straight from there'],
      ['star', 'Only the Famous Ayahs', 'Mash\'hur અને Subject માં હવે ફક્ત તે જ આયત — પાછળ આખી સૂરહ નહીં. આયતુલ કુર્સી 255–257',
        'Mash\'hur and Subject now show only those ayahs — not the rest of the surah. Ayat al-Kursi is 255–257'],
      ['play', 'Full Screen Follows the Recitation', 'Full screen માં તિલાવત થતી આયત ચમકે અને સ્ક્રીન તેની સાથે ચાલે. પેજ પર ટચ કરો તો ▶ Play, Search અને Noor-e-Quran; આયત પર long press કરો તો તે આયત Play',
        'In full screen the ayah being recited glows and the page follows it. Tap the page for ▶ Play and Search; long press an ayah to play it'],
      ['bm', 'Bookmark Before Leaving', '30 સેકન્ડથી વધારે વાંચીને પાછા જાઓ ત્યારે પૂછે: Bookmark કરવું છે? (Settings માં બંધ કરી શકો). બુકમાર્ક ડિલીટ પહેલાં પણ પૂછે',
        'After reading 30 seconds or more, going back asks: Bookmark this ayah? (can be turned off in Settings). Deleting a bookmark asks first too'],
      ['check', 'Corrections Come by Themselves', 'હવે કોઈ ભૂલ સુધરે તો તે સુધારો internet થી app માં પોતાની જાતે આવી જશે — આખી app ફરી update કરવાની જરૂર નહીં',
        'When a mistake is corrected, the correction now reaches the app by itself over the internet — no full app update needed'],
      ['flower', 'Isal-e-Sawab Page', 'Isal-e-Sawab પેજની ગોઠવણી સુધારી અને નીચે ZK Graphics નો logo',
        'A tidier Isal-e-Sawab page, with the ZK Graphics logo at the bottom'],
      ['paint', 'New Icon & Opening Screen', 'App નું નવું icon અને નવી Flash Screen — દિવસમાં પહેલી વાર ખોલો ત્યારે 2 સેકન્ડ માટે',
        'A new app icon and opening screen — for 2 seconds, the first time you open the app each day'],
      ['down', 'Choose What to Back Up', 'Settings → Backup: Bookmarks, Settings, તફસીર અને અવાજ — જે જોઈએ તે પસંદ કરો. Restore માં પણ પસંદ કરી શકો',
        'Settings → Backup: Bookmarks, Settings, Tafseer and Audio — choose what you want. Restore lets you choose too'],
      ['paint', 'Cleaner Settings', 'ભાષાના બે સરળ બોક્સ, Speed અને Repeat એક લાઇનમાં, નવું App કાર્ડ. Frost અને Periwinkle theme કાઢી નાખી',
        'Two simple language boxes, Speed and Repeat on one line, a new app card. The Frost and Periwinkle themes are removed'],
      ['words', 'Grammar Meanings in English', 'English mode: આયતમાં રંગીન શબ્દ પર ટચ કરો તો "Meaning in this ayah" પણ English માં; Mazi / Muzare નામ',
        'English mode: tapping a coloured word in the ayah now shows "Meaning in this ayah" in English; tenses are named Mazi / Muzare'],
      ['globe', 'English Mode', 'હવે Arabic + English પણ: Ali Quli Qarai નો અંગ્રેજી તરજુમો, English transliteration, Word by word અને તફસીર English માં. Settings → Language માંથી ગમે ત્યારે બદલો',
        'Arabic + English: the English translation of Ali Quli Qarai, English transliteration, word by word, tafseer, grammar, Sigah Table, Sarf rules and I\'rab in English. Change it any time in Settings → Language'],
      ['flag', 'Report a Problem', 'કોઈ ભૂલ દેખાય તો Settings → Report a Problem (કે આયતના ⋮ મેનુમાં) — screenshot અને વિગત સીધી developer ના email માં',
        'Seen a mistake? Settings → Report a Problem (or the ayah ⋮ menu) — a screenshot and a few words go straight to the developer\'s e-mail'],
      ['play', 'Play Button on Every Ayah', 'દરેક આયત પર લીલું "Play" બટન — આયત પર થોડી વાર રોકાઓ તો તે ચમકે; બુકમાર્ક અને મેનુ હવે ગોળ બટનમાં', 'A green “Play” button on every ayah — it shines when you stay on an ayah; bookmark and menu are now round buttons'],
      ['book', 'Bookmarked Ayahs Stand Out', 'બુકમાર્ક કરેલી આયત પણ તિલાવત ચાલતી આયત જેવા સોનેરી રંગમાં દેખાય', 'Bookmarked ayahs show in the same gold colour as the ayah being recited'],
      ['book', 'New Ayah End Mark', 'આયતના અંતે સોનેરી કૌંસ અને વચ્ચે આયત નંબર — મોટો અને સાફ વંચાય', 'Gold brackets at the end of each ayah with the ayah number in the middle — bigger and clearer'],
      ['scroll', 'Page · Sipara · Ruku Shine', 'પેજ, સિપારા અને રુકૂઅની નિશાની સ્ક્રીન પર આવે ત્યારે ચમકે — વાંચતા વાંચતા ધ્યાન જાય કે અહીં પૂરું થયું', 'Page, sipara and ruku marks shine when they come on screen — so you notice where one ends'],
      ['play', 'Player Glow', 'તિલાવત ચાલે ત્યારે પ્લેયરની કિનાર પર સોનેરી રોશની દોડે; સિપારાનું બોક્સ પણ હવે કેપ્સૂલ આકારમાં', 'A gold light runs round the player while it recites; the sipara box is now a capsule too'],
      ['play', 'New Capsule Player', 'તિલાવતનું પ્લેયર હવે એક લાઇનની કેપ્સૂલ — 2 સેકન્ડ પછી ગોળ બટનમાં સમાઈ જાય જેથી આયત ઢંકાય નહીં; ટચ કરો તો ફરી ખુલે', 'The recitation player is now a one-line capsule — after 2 seconds it folds into a round button so the ayah is not covered; tap to open it again'],
      ['mic', 'Hifz: Clean Word by Word', 'Hifz માં એક એક શબ્દ ખોલો ત્યારે શબ્દ અને તેની નિશાનીઓ (ط ج لا) આયતની જેમ જ પોતાની જગ્યાએ — કોઈ ઓવરલેપ નહીં, અને નિશાની તેના શબ્દ સાથે જ ખુલે', 'In Hifz, opening one word at a time shows the word and its marks (ط ج لا) in place, like the ayah — no overlap'],
      ['book', 'Ruku Marks (ع)', 'દરેક રુકૂઅના અંતે ع ની નિશાની — સૂરહમાં કયો રુકૂઅ, કેટલી આયત, અને સિપારામાં કયો રુકૂઅ (છાપેલા કુરઆન મુજબ)', 'An ع mark at the end of every ruku — which ruku of the surah, how many ayahs, and which ruku of the sipara (as in the printed Quran)'],
      ['scroll', 'Smooth Scrolling', 'મોટી આયતમાં અવાજ સાથે સ્ક્રોલ હવે એકદમ સ્મૂધ', 'Scrolling with the audio in long ayahs is now very smooth'],
      ['mic', 'Better Hifz', 'સંભળાતી આયત પણ છુપાયેલી રહે; વકફની નિશાની અને આયતના અંતની નિશાની તેના શબ્દ સાથે જ ખુલે', 'The ayah being recited stays hidden too; waqf marks and the ayah end mark open with their word'],
      ['scroll', 'Long Ayahs Follow the Audio', 'સ્ક્રીન કરતાં મોટી આયત શરૂઆતમાં ઉપર જ રહે, અને 20% અવાજ પછી અવાજ સાથે ધીમે ધીમે નીચે સરકે — નીચેની લાઇનો પણ તિલાવત સાથે દેખાય', 'An ayah taller than the screen stays at the top at first, then after 20% of the audio slowly moves down with it'],
      ['mic', 'Hifz: Word · Line · Whole Ayah', 'Hifz માં પસંદ કરો: ટચ કરો તો એક શબ્દ, એક લાઇન કે આખી આયત ખુલે', 'Choose in Hifz: a tap shows one word, one line or the whole ayah'],
      ['check', 'Toolbar Stays on Top', 'Translit / Translation / Colours / Hifz ની પટ્ટી સૂરહમાં નીચે જાઓ તો પણ ઉપર જ રહે', 'The Translit / Translation / Colours / Hifz bar stays on top while you scroll the surah'],
      ['book', 'Ayah · Sipara · Page on Top', 'ઉપર સૂરહના નામ નીચે: કઈ આયત, કયો સિપારો અને કયું પાનું', 'Under the surah name at the top: which ayah, which sipara and which page'],
      ['words', 'Meaning for Every Verb', 'કુરઆનના બધા 1475 ફેલનો ગુજરાતી અર્થ — Sigah Table ના દરેક સીગામાં, બાબના બટનમાં અને શબ્દના ગ્રામરમાં. કોઈ અર્થ ખોટો લાગે તો જણાવો', 'A meaning for the Quran\'s verbs — in every sigah of the Sigah Table, on the baab buttons and in the word\'s grammar'],
      ['search', 'Smarter Search', 'લખતાં જ નીચે options આવે — મૂળ (Root) પણ: rahm, ilm, રહમત કે علم લખો. જોડણી થોડી ખોટી હોય (રેહમત) તો પણ મળે', 'Suggestions appear as you type — roots too: type rahm, ilm or علم. Small spelling mistakes are still found'],
      ['words', 'Sigah Table (સીગા ટેબલ)', 'ફેલ પર ટચ કરો → "Sigah Table": માઝી, મુઝારેઅ, અમ્રના 14-14 સીગા ગુજરાતી અર્થ સાથે, બાબની લાઇન મસ્દર સાથે, અને એ મૂળ બીજા બાબમાં આવે તો તે પણ', 'Tap a verb → “Sigah Table”: 14 sigahs each of mazi, muzare and amr with their meaning, the baab line with its masdar, and the root\'s other forms'],
      ['bm', 'My Collections', 'ગમતી આયતો પોતાની યાદીમાં સાચવો (Search ના પરિણામમાંથી પણ) — Home પર અને નીચે "Collections" ટેબમાં. યાદી Share પણ કરી શકો', 'Save the ayahs you like in your own lists (from Search results too) — on Home and in the “Collections” tab. Lists can be shared'],
      ['down', 'Offline Tafsir', 'Settings → Offline Tafsir: આખી તફસીર ફોનમાં સાચવો, પછી internet વગર ખુલશે', 'Settings → Offline Tafsir: save the whole tafsir on the phone, then it opens without internet'],
      ['paint', 'Colours in Root Words', 'મૂળ (Root) ના શબ્દોમાં પણ ફેલ, બાબ અને નિયમ (એઅલાલ) પ્રમાણે રંગ', 'Words of a root are coloured by verb, baab and rule (i\'lal) too'],
      ['check', 'Clearer Home Tabs', 'Surah / Sipara / Sajdah / Mash\'hur / Subject માં પસંદ કરેલું ટેબ હવે લીલા રંગમાં', 'The chosen tab of Surah / Sipara / Sajdah / Mash\'hur / Subject is now green'],
      ['target', 'Today & Quran Words Side by Side', 'Home પર બંને કાર્ડ એક લાઇનમાં', 'Both cards side by side on Home'],
      ['clock', 'Home Screen Widget', 'ફોનની Home Screen પર "Today\'s Ayah" — તમારા fonts અને theme ના રંગમાં. Home Screen પર લાંબું દબાવો → Widgets → Noor-e-Quran', '“Today\'s Ayah” on the phone\'s Home Screen — in your fonts and theme colours. Long-press the Home Screen → Widgets → Noor-e-Quran'],
      ['words', 'Search by Root (મૂળ)', 'કોઈ પણ શબ્દના મૂળ (દા.ત. علم) ના બધા શબ્દો અને કુરઆનમાં તે ક્યાં ક્યાં આવે છે — Home પર "Quran Words" અથવા શબ્દ પર ટચ કરો', 'All words of any root (e.g. علم) and where each comes in the Quran — “Quran Words” on Home, or tap a word'],
      ['book', 'Top 300 Quran Words', 'સૌથી વધારે આવતા શબ્દો — આ 300 શીખો તો કુરઆનના આશરે 74% શબ્દો સમજાય', 'The most frequent words — learn these 300 and you understand about 74% of the Quran\'s words'],
      ['check', 'How Often a Word Comes', 'શબ્દ પર ટચ કરો: કુરઆનમાં કેટલી વાર આવે છે', 'Tap a word: how many times it comes in the Quran'],
    ]
  };
  function showWhatsNew(again) {
    if (!again && load('qm.seenNew', '') === WHATS_NEW.ver) return;
    store('qm.seenNew', WHATS_NEW.ver); // only once
    openSheet(`<div class="wn-head"><span class="wn-badge">Version ${WHATS_NEW.ver}</span><h3>What's New in Noor-e-Quran</h3>
        <div class="sub">${L('આ update માં આવેલી નવી સુવિધાઓ', 'New in this update')}</div></div>
      <div class="wn-list">${WHATS_NEW.items.map(([ic, t, d, en]) => `<div class="wn-row">
        <span class="wn-ic">${ic === 'dua' ? '<i class="tab-ic"></i>' : ICON[ic]}</span>
        <div class="main"><b>${esc(EN() ? t.replace(/\s*\([^)]*[઀-૿][^)]*\)/, '') : t)}</b>${EN() ? (en ? `<span>${esc(en)}</span>` : '') : `<span>${esc(d)}</span>`}</div></div>`).join('')}</div>
      <button class="btn block" id="wnOk" style="margin-top:14px">${ICON.check} OK, Shukriya</button>`, sh => {
      $('#wnOk', sh).onclick = closeSheet;
    });
  }

  // ---------------------------------------------------------------- isal-e-sawab (same page as the Meezan app)
  function renderIsal() {
    setBar({ title: 'Isal-e-Sawab', tabs: 'isal' });
    const person = (img, name, date) => `
      <figure class="memorial">
        <div class="frame"><img src="${img}" alt=""></div>
        <figcaption><b>${name}</b><span>Wafat Date: ${date}</span></figcaption>
      </figure>`;
    view.innerHTML = `
      <section class="isal">
        <div class="isal-head">
          <h2>Isal-e-Sawab</h2>
          <span class="isal-star">${ICON.flower}</span>
          <div class="ar-line">إِيصَالُ الثَّوَاب</div>
        </div>
        <div class="memorials">
          ${person('mom.jpg', 'Marhuma Najmabanu<br>Binte Jusabali Merchant', '17-06-2024<br>10 Zilhajj 1445')}
          ${person('dad.jpg', 'Marhum MasumAli<br>HabibAli Keshwani', '15-01-2025<br>15 Rajab ul Murajjab 1446')}
        </div>
        <div class="ornament gold-rule isal-rule">${ICON.flower}</div>
        <p class="fatiha">Please recite Sura-e-Fatiha for the marhumeen.</p>
        ${EN() ? '' : `<p class="fatiha gu">મરહૂમીન માટે સૂરએ ફાતિહાની દરખાસ્ત છે.</p>`}
      </section>
      <section class="dev-card">
        <div class="dev-label">Developed by</div>
        <img class="dev-logo" src="zk-logo.png" alt="ZK Graphics">
        <div class="dev-text">
          <div class="dev-name">ZK Graphics</div>
          <div class="dev-person">Zaheer Keshwani</div>
          <div class="dev-place">Bhavnagar (Gujarat) India</div>
          <a class="btn ghost dev-phone" href="tel:+919824610233">Mo. +91-9824610233</a>
        </div>
      </section>`;
  }

  // ---------------------------------------------------------------- language choice (first open, and Settings › Language)
  const LANGS = [['gu', 'Arabic + Gujarati'], ['en', 'Arabic + English']];
  const langCards = () => `<div class="lang-grid">${LANGS.map(([k, t]) => `
    <button class="lang-card ${(S.lang || 'gu') === k && S.lang ? 'on' : ''}" data-lang="${k}" role="radio" aria-checked="${S.lang === k}">
      <span class="lc-radio">${ICON.check}</span><b>${t}</b></button>`).join('')}</div>`;
  function setLang(k) {
    const was = S.lang;
    S.lang = k; saveSettings();
    // everything already loaded (ayahs, search) is in the old language, so the page starts again
    if ((was || 'gu') !== k) { closeSheet(); setTimeout(() => location.reload(), 150); return true; }
    return false;
  }
  function bindLangCards(root, after) {
    $$('[data-lang]', root).forEach(b => b.onclick = () => {
      $$('[data-lang]', root).forEach(x => x.classList.toggle('on', x === b));
      if (!setLang(b.dataset.lang) && after) after();
    });
  }
  /** Asked once, the first time the app opens (also after updating from a version without English). */
  function showLangChooser() {
    openSheet(`<div class="wn-head"><h3>Choose Language</h3></div>
      ${langCards()}`, sh => bindLangCards(sh, () => { closeSheet(); setTimeout(() => showWhatsNew(), 350); }));
  }

  // ---------------------------------------------------------------- report a problem: screenshots + a few words, by e-mail to the developer
  async function openReport(ctx) {
    const files = []; // [{file, src}] in the phone's cache (Bridge.reportScreen / reportPick)
    if (N.reportReset) N.reportReset();
    if (ctx && N.reportScreen) {
      // a picture of the reading screen as it was, before the report sheet covers it
      closeSheet();
      await new Promise(r => setTimeout(r, 380));
      const r = await nativeCall('reportScreen');
      if (r && r.ok) files.push(r);
    }
    const where = ctx ? `${sm(ctx.s).en} ${ctx.s}:${ctx.n}` : '';
    openSheet(`<h3>Report a Problem</h3>
      <div class="sub">${L('શું ખોટું દેખાયું તે લખો. Screenshot ઉમેરો તો સમજવામાં સરળ પડે.', 'Write what looks wrong. A screenshot makes it easier to understand.')}</div>
      ${where ? `<div class="rep-where">${ICON.book} ${esc(where)}</div>` : ''}
      <textarea id="repTx" class="rep-tx" rows="5" placeholder="${L('દા.ત. આ આયતનો અર્થ ખોટો છે / બટન કામ નથી કરતું…', 'e.g. the meaning of this ayah is wrong / a button does not work…')}"></textarea>
      <div class="rep-pics" id="repPics"></div>
      <div class="rep-btns">
        <button class="btn ghost" id="repPick">${ICON.image} ${L('Screenshot ઉમેરો', 'Add Screenshot')}</button>
        <button class="btn" id="repSend">${ICON.share} ${L('Email મોકલો', 'Send Email')}</button></div>
      <div class="mt-note">${L('તમારી mail app ખુલશે — ત્યાં Send દબાવો. Email: ', 'Your mail app opens — press Send there. E-mail: ')}zaheer.keshwani@gmail.com</div>`, sh => {
      const pics = $('#repPics', sh);
      const draw = () => {
        pics.innerHTML = files.map((f, i) => `<span class="rep-pic"><img src="${esc(f.src)}" alt=""><button data-rm="${i}" aria-label="Remove">${ICON.close}</button></span>`).join('');
        $$('[data-rm]', pics).forEach(b => b.onclick = () => { files.splice(Number(b.dataset.rm), 1); draw(); });
      };
      draw();
      $('#repPick', sh).onclick = async () => {
        if (!N.reportPick) { toast(L('આ ફોનની app માં જ ચાલશે', 'Works only in the phone app')); return; }
        const r = await nativeCall('reportPick');
        if (r && r.ok) { files.push(...r.files.slice(0, 5 - files.length)); draw(); }
      };
      $('#repSend', sh).onclick = () => {
        const tx = $('#repTx', sh).value.trim();
        if (!tx && !files.length) { toast(L('થોડું લખો અથવા screenshot ઉમેરો', 'Write a few words or add a screenshot')); return; }
        const subject = `Noor-e-Quran ${N.version()} — Problem${where ? ' · ' + where : ''}`;
        const body = `${tx}${where ? `\n\nAyah: ${where}` : ''}\nLanguage: ${EN() ? 'English' : 'Gujarati'} · Screen: ${location.hash || '#/'}`;
        if (N.reportSend) N.reportSend(subject, body, JSON.stringify(files.map(f => f.file)));
        else location.href = `mailto:zaheer.keshwani@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        closeSheet();
      };
    });
  }

  // ---------------------------------------------------------------- settings
  function renderSettings() {
    setBar({ title: 'Settings', tabs: 'settings' });
    view.innerHTML = `
      <div class="s-group"><div class="s-title">LANGUAGE</div><div class="s-card">${langCards()}</div></div>
      <div class="s-group"><div class="s-title">ARABIC FONT</div><div class="s-card">${arFontGrid()}</div></div>
      <div class="s-group" ${EN() ? 'hidden' : ''}><div class="s-title">GUJARATI FONT</div><div class="s-card"><div class="font-grid">
        ${GU_FONTS.map(f => `<button class="font-card ${f.id === S.guFont ? 'on' : ''}" data-gfont="${f.id}">
          <div class="pv gu" style="font-family:'${f.fam}'">અલ્લાહના નામથી</div><div class="nm">${esc(f.name)}</div></button>`).join('')}
      </div></div></div>
      <div class="s-group"><div class="s-title">FONT SIZE</div>
        <div class="s-card">${fontRows()}
          <div class="s-row"><div class="main"></div><button class="btn ghost" id="resetFs">Reset sizes</button></div></div></div>
      <div class="s-group"><div class="s-title">DISPLAY</div><div class="s-card">${showRows()}
        <div class="s-row"><div class="main"><div class="t" style="margin-bottom:8px">Theme</div>${themeGrid()}</div></div>
      </div></div>
      <div class="s-group"><div class="s-title">AUDIO</div><div class="s-card">
        ${HAS_AUDIO
          ? `<div class="s-row"><div class="main"><div class="t">Qari</div><div class="d">Mutazz Aghaei — Tahdir (offline, inside the app)</div></div></div>`
          : `<div class="s-row"><div class="main"><div class="t">Qari — Mutazz Aghaei (Tahdir)</div>
              <div class="d" id="dlSum"></div></div>
              <button class="btn ghost" id="dlClear" hidden>${ICON.trash} ${L('બધું ડિલીટ', 'Delete all')}</button></div>`}
        <div class="s-row"><div class="main"><div class="t" style="margin-bottom:8px">Speed</div>${chips('speed', SPEEDS.map(v => [v, speedLabel(v)]), S.speed)}</div></div>
        <div class="s-row"><div class="main"><div class="t" style="margin-bottom:8px">Repeat each ayah</div>${chips('rep', REPEATS.map(v => [v, v === 0 ? '∞' : v + 'x']), S.repeatEach)}</div></div>
        <div class="s-row"><div class="main"><div class="t">Auto scroll</div><div class="d">Page follows the ayah being recited</div></div>${sw('oAuto', S.autoScroll)}</div>
        <div class="s-row"><div class="main"><div class="t">Continue to next surah</div></div>${sw('oNext', S.contNext)}</div>
      </div></div>
      <div class="s-group"><div class="s-title">DAILY AYAH (NOTIFICATION)</div><div class="s-card">
        <div class="s-row"><div class="main"><div class="t">Daily Ayah</div><div class="d">${L('રોજ નક્કી સમયે એક આયત અને તેનો ગુજરાતી અર્થ notification માં આવશે', 'An ayah and its English meaning in a notification every day at the set time')}</div></div>${sw('oDaily', S.daily)}</div>
        <div class="s-row" id="dailyRow" ${S.daily ? '' : 'hidden'}><div class="main"><div class="t">Time</div></div>
          <input type="time" id="dailyAt" class="time-in" value="${esc(S.dailyAt || '07:00')}">
          <button class="btn ghost" id="dailyTest">Test</button></div>
        <div class="s-row" id="dailyHelp" ${S.daily && N.appSettings ? '' : 'hidden'}><div class="main"><div class="t">Not coming on time?</div>
          <div class="d" id="dailyWarn">${N.notifOk && !N.notifOk() ? `<b style="color:#c0392b">${L('આ ફોનમાં app ની notification બંધ છે.', 'Notifications for this app are off on this phone.')}</b> ` : ''}${L('App Info માં Notifications ચાલુ કરો અને Battery માં “Unrestricted / No restrictions” પસંદ કરો.', 'In App Info turn on Notifications, and under Battery choose “Unrestricted / No restrictions”.')}</div></div>
          <button class="btn ghost" id="appSet">Open</button></div>
      </div></div>
      <div class="s-group"><div class="s-title">OFFLINE TAFSIR</div><div class="s-card">
        <div class="s-row tf-row"><div class="main"><div class="t">Save Whole Tafsir on Phone</div>
          <div class="d" id="tfSum"></div>
          <div class="tf-bar" id="tfBar" hidden><i></i></div></div>
          <button class="btn" id="tfGo">${ICON.down} Save</button></div>
        <div class="s-row" id="tfDelRow" hidden><div class="main"><div class="t">Delete Saved Tafsir</div><div class="d">${L('જગ્યા ખાલી કરવા — પછી આયત ખોલશો ત્યારે ફરી ડાઉનલોડ થશે', 'Frees space — it downloads again when you open an ayah')}</div></div>
          <button class="btn ghost" id="tfDel">${ICON.trash} Delete</button></div>
      </div></div>
      <div class="s-group"><div class="s-title">BACKUP</div><div class="s-card">
        <div class="s-row"><div class="main"><div class="t">Create Backup File</div><div class="d">${L('Bookmarks, settings, તફસીર અને અવાજ — જે જોઈએ તે પસંદ કરો અને એક file માં સાચવો', 'Bookmarks, settings, tafseer and audio — choose what you want and keep it in one file')}</div></div>
          <button class="btn ghost" id="bkSave">${ICON.down} Save</button></div>
        <div class="s-row"><div class="main"><div class="t">Restore Backup</div><div class="d">${L('નવા ફોનમાં backup file પસંદ કરો, પછી જે પાછું લાવવું હોય તે પસંદ કરો', 'Pick the backup file on a new phone, then choose what to bring back')}</div></div>
          <button class="btn ghost" id="bkOpen">Open</button></div>
      </div></div>
      <div class="s-group"><div class="s-title">NEW FEATURES — TURN ON / OFF</div><div class="s-card">
        ${[['khatam', 'Khatam Tracker', 'Shows today\'s pages and Khatam progress on Home'],
          ['juzBar', 'Sipara Progress Bar', L('વાંચતી વખતે પેજ પર ટચ કરો તો બાજુમાં સિપારો કેટલો બાકી તે દેખાય', 'Tap the page while reading to see how much of the sipara is left')],
          ['hifz', 'Hifz (Memorize) Mode', L('અરબી છુપાવો અને બોલીને તપાસો', 'Hide the Arabic and check by reciting')],
          ['duas', 'Duas Tab', L('નીચે કુરઆનની દુઆઓનું ટેબ', 'A tab with the duas of the Quran')],
          ['topics', 'Subject List', L('Home માં વિષય (Subject) પ્રમાણે આયતો', 'Ayahs by subject on Home')],
          ['words', 'Quran Words (Top 300 · Roots) on Home', L('Home પર “Quran Words — Top 300 · Roots” નું બોક્સ: બંધ કરો તો Home પરથી નીકળી જાય', 'The “Quran Words — Top 300 · Roots” box on Home: turn off to remove it from Home')],
          ['askBm', 'Ask to Bookmark when Leaving', L('30 સેકન્ડથી વધારે વાંચીને પાછા જાઓ અને તે આયત બુકમાર્ક ન હોય તો પૂછે: “Bookmark કરવું છે?”', 'After reading 30 seconds or more, going back asks “Bookmark this ayah?” when it is not bookmarked')],
          ['lock', 'Recitation on Lock Screen', L('સ્ક્રીન બંધ હોય ત્યારે પણ અવાજ ચાલુ અને notification માં બટન', 'Recitation keeps playing with the screen off, with buttons in the notification')]]
          .map(([k, t, d]) => `<div class="s-row"><div class="main"><div class="t">${t}</div><div class="d">${d}</div></div>${sw('ft-' + k, S.feat[k])}</div>`).join('')}
      </div></div>
      <div class="s-group"><div class="s-title">HELP</div><div class="s-card">
        <div class="s-row"><div class="main"><div class="t">Report a Problem</div><div class="d">${L('કોઈ ભૂલ દેખાય તો screenshot અને વિગત લખીને મોકલો — સીધું developer ના email માં જશે', 'Seen a mistake? Send a screenshot and a few words — it goes straight to the developer\'s e-mail')}</div></div>
          <button class="btn ghost" id="repOpen">${ICON.flag} Report</button></div>
      </div></div>
      <div class="s-group"><div class="s-card"><div class="about">
        <div class="ab-top"><img class="logo" src="app-icon.png" alt=""><!-- the same picture as the phone's app icon -->
          <div class="ab-t"><div class="nm">Noor-e-Quran</div>
            <div class="d">${L('Gujarati', 'English')} translation, transliteration & tafseer</div>
            <span class="ab-v">Version ${esc(N.version())}</span></div></div>
        <button class="ab-new" id="wnOpen">${ICON.star}<span>What's New in this Version</span>${ICON.chev}</button>
      </div></div></div>`;
    bindArFontGrid(view, false);
    bindLangCards(view);
    $('#repOpen').onclick = () => openReport();
    $$('[data-gfont]').forEach(b => b.onclick = () => {
      S.guFont = b.dataset.gfont; saveSettings(); applyTheme();
      $$('[data-gfont]').forEach(x => x.classList.toggle('on', x === b));
    });
    bindFontRows(view);
    $('#resetFs').onclick = () => { S.fs = Object.assign({}, DEFAULTS.fs); saveSettings(); applyTheme(); render(); };
    bindDisplayToggles(view);
    bindChips(view, 'speed', setSpeed);
    bindChips(view, 'rep', v => { S.repeatEach = Number(v); saveSettings(); drawPlayer(); });
    $('#oAuto').onchange = e => { S.autoScroll = e.target.checked; saveSettings(); };
    $('#oNext').onchange = e => { S.contNext = e.target.checked; saveSettings(); };
    $('#oDaily').onchange = e => {
      S.daily = e.target.checked; saveSettings(); saveDaily();
      $('#dailyRow').hidden = !S.daily;
      $('#dailyHelp').hidden = !S.daily || !N.appSettings;
      toast(S.daily ? `Daily Ayah at ${S.dailyAt || '07:00'}` : 'Daily Ayah off');
    };
    $('#dailyAt').onchange = e => { S.dailyAt = e.target.value || '07:00'; saveSettings(); saveDaily(); toast(`Time: ${S.dailyAt}`); };
    $('#dailyTest').onclick = async () => { await saveDaily(); if (N.dailyAyahTest) N.dailyAyahTest(); else toast('Phone ma notification aavshe'); };
    $('#appSet').onclick = () => N.appSettings && N.appSettings();
    $('#wnOpen').onclick = () => showWhatsNew(true);
    $('#bkSave').onclick = makeBackup;
    $('#bkOpen').onclick = restoreBackup;
    drawTafs();
    $('#tfGo').onclick = () => {
      if (!N.tafsirAll) { toast(L('આ ફોનની app માં જ ચાલશે', 'Works only in the phone app')); return; }
      if (N.tafsirBusy()) { N.tafsirCancel(); toast('Stopping…'); return; }
      N.tafsirAll(JSON.stringify(META.surahs.map(m => m.a)));
      TF.state = 'run'; drawTafs();
    };
    $('#tfDel').onclick = () => {
      if (!confirm(L('ફોનમાં સાચવેલી બધી તફસીર ડિલીટ કરવી છે?', 'Delete all the tafsir saved on the phone?'))) return;
      N.tafsirClear(); TF.saved = 0; TF.state = ''; drawTafs(); toast(L('ડિલીટ થઈ ગયું', 'Deleted'));
    };
    Object.keys(S.feat).forEach(k => {
      const box = $('#ft-' + k);
      if (box) box.onchange = e => {
        S.feat[k] = e.target.checked; saveSettings(); applyTheme();
        if (k === 'lock') mediaSync();
        if (k === 'juzBar' && !S.feat.juzBar) hideJuzBar(true);
        toast(e.target.checked ? 'Turned on' : 'Turned off');
      };
    });
    if (!HAS_AUDIO) {
      // Lite: how much surah audio is on the phone, and a way to free the space
      const sum = () => {
        const k = Object.keys(DLS), total = k.reduce((t, s) => t + DLS[s], 0);
        $('#dlSum').textContent = k.length
          ? L(`${k.length} સૂરહનો અવાજ ફોનમાં છે (${mb(total)}). નવી સૂરહ માટે Quran ની યાદીમાં સૂરહની બાજુનું ⬇ બટન દબાવો.`, `Recitation of ${k.length} surahs is on the phone (${mb(total)}). For another surah press the ⬇ button beside it in the Quran list.`)
          : L('કોઈ સૂરહનો અવાજ હજી ડાઉનલોડ નથી કર્યો. Quran ની યાદીમાં દરેક સૂરહની બાજુનું ⬇ બટન દબાવી ડાઉનલોડ કરો.', 'No surah\'s recitation is downloaded yet. Press the ⬇ button beside a surah in the Quran list.');
        $('#dlClear').hidden = !k.length;
      };
      sum();
      $('#dlClear').onclick = () => {
        if (!confirm(L('બધી સૂરહનો ડાઉનલોડ કરેલો અવાજ ફોનમાંથી ડિલીટ કરવો છે?', 'Delete the downloaded recitation of all surahs from the phone?'))) return;
        closePlayer();
        Object.keys(DLS).forEach(s => N.deleteSurah(Number(s)));
        refreshDls(); sum(); toast(L('ડિલીટ થઈ ગયું', 'Deleted'));
      };
    }
  }

  // ---------------------------------------------------------------- offline tafsir (the whole tafseer saved on the phone)
  const TF = { saved: -1, total: 6236, state: '' };
  function drawTafs() {
    const sum = $('#tfSum'); if (!sum) return;
    if (TF.saved < 0 || !TF.state) TF.saved = N.tafsirSaved ? N.tafsirSaved() : 0;
    const busy = N.tafsirBusy ? N.tafsirBusy() : false;
    if (busy) TF.state = 'run';
    const pct = Math.min(100, Math.floor(100 * TF.saved / TF.total));
    const all = TF.saved >= TF.total;
    sum.innerHTML = busy
      ? `<b>${num(TF.saved)} / ${num(TF.total)}</b> ${L(`આયત સચવાઈ (${pct}%) — app ખુલ્લી રાખો, બંધ કરશો તો પછી ત્યાંથી જ આગળ ચાલશે.`, `ayahs saved (${pct}%) — keep the app open; if you close it, it carries on from there next time.`)}`
      : (TF.state === 'offline' ? `<b style="color:#c0392b">${L('Internet નથી.', 'No internet.')}</b> ` : TF.state === 'refused' ? `<b style="color:#c0392b">${L('majmuo.com એ હમણાં આપવાની ના પાડી — થોડી વાર પછી ફરી દબાવો.', 'majmuo.com declined for now — press again after a while.')}</b> ` : '')
        + (all ? L(`<b>આખી તફસીર ફોનમાં છે</b> — internet વગર ખુલશે.`, `<b>The whole tafsir is on the phone</b> — it opens without internet.`)
          : `${L('દરેક આયતની તફસીર (Tafsir Ahl al-Bayt) ફોનમાં સાચવો, પછી internet વગર ખુલશે.', 'Save every ayah\'s tafsir (Tafsir Ahl al-Bayt, English) on the phone; then it opens without internet.')} ${TF.saved ? `<b>${num(TF.saved)} / ${num(TF.total)}</b> ${L('આયત સચવાયેલી છે.', 'ayahs saved.')}` : ''}`);
    const bar = $('#tfBar'); bar.hidden = !busy && (!TF.saved || all); $('i', bar).style.width = pct + '%';
    const go = $('#tfGo');
    go.innerHTML = busy ? `${ICON.close} Stop` : all ? `${ICON.check} Saved` : `${ICON.down} ${TF.saved ? 'Continue' : 'Save'}`;
    go.classList.toggle('ghost', busy || all); go.disabled = all && !busy;
    $('#tfDelRow').hidden = busy || !TF.saved;
  }
  function onTafs(saved, total, state) {
    TF.saved = saved; TF.total = total; TF.state = state;
    if (state === 'done') toast(L('આખી તફસીર ફોનમાં સચવાઈ ગઈ', 'The whole tafsir is saved on the phone'));
    if (state === 'offline') toast(L('Internet નથી — તફસીર સાચવવાનું અટક્યું', 'No internet — saving the tafsir stopped'));
    drawTafs();
  }

  // ---------------------------------------------------------------- boot
  window.App = {
    /** Progress of saving the whole tafseer (Settings › Offline Tafsir). */
    tafs: onTafs,
    /** Progress of a backup or restore with tafseer or audio. */
    bkp: onBkp,
    back() {
      if (sheetOpen) { closeSheet(); return true; }
      if (FS) { setFs(false); return true; }
      if (leaveReader()) return true;
      if (route && route.name !== 'home') { history.back(); return true; }
      return false;
    },
    /** Called by the activity when headphones are unplugged. */
    pause() { if (P.playing) { audio.pause(); P.playing = false; drawPlayer(); } },
    /** Results of asynchronous Native calls (tafseer). */
    cb(id, data) { const f = pending[id]; delete pending[id]; if (f) f(data); },
    /** Download progress of one surah's audio (Lite APK). */
    dl: onDl,
    /** Buttons pressed in the notification, on the lock screen or on headphones. */
    media: onMedia,
    /** Opens a screen asked for by a notification (today's ayah). */
    open: h => { if (h && META) go(h); },
    /** Grammar of one Arabic word (Al-Miftah); also handy for checking coverage. */
    analyze: w => loadMiftah().then(M => analyzeWord(M, w))
  };

  applyTheme();
  Promise.all([getJSON('data/meta.json'), getJSON('data/ruku.json').catch(() => [])]).then(([m, rk]) => {
    META = m;
    setRukus(rk);
    const h = N.takeOpen ? N.takeOpen() : '';
    if (h) go(h, true);
    render();
    // after an update: its highlights, once, on Home (the splash picture covers the first 2 seconds)
    // the very first time: which language (Arabic + Gujarati / Arabic + English), then What's New
    if (!h) setTimeout(() => { if (route && route.name === 'home' && !sheetOpen) (S.lang ? showWhatsNew() : showLangChooser()); }, 900);
    // after the phone has the list once, it keeps it (a new list only when the list itself changes)
    // (v4.6: set again so the exact alarm replaces the old inexact one)
    if (S.daily && S.dailyVer !== 2) { S.dailyVer = 2; saveSettings(); saveDaily(); }
    // the daily ayah's meaning follows the language (v7.2)
    if (S.daily && (S.dailyLang || 'gu') !== (S.lang || 'gu')) { S.dailyLang = S.lang || 'gu'; saveSettings(); saveDaily(); }
    saveWidget();
  }).catch(e => {
    view.innerHTML = `<div class="hint">Could not load data: ${esc(e.message)}</div>`;
  });
})();
