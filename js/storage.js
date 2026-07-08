/* =========================================================
   SenseiTrack — storage.js  (v2 — multi-account & role-based)
   Single source of truth for all persisted data. Every other
   script reads/writes through the ST namespace defined here,
   nothing else touches localStorage directly.

   v2 CHANGES FROM v1:
   - Single global "profile" -> multiple accounts (senseitrack_accounts),
     each with its own role: 'guru' or 'admin'.
   - Assessments now carry an accountId so each teacher's history is
     scoped to them; admins can read across every account.
   - Indicator/question bank is no longer a hardcoded constant only —
     it lives in localStorage (DEFAULT_INDICATOR_BANK is just the seed)
     so an admin can add/edit/delete categories and questions at runtime.
   - migrateIfNeeded() upgrades anyone who still has v1-format data
     (single profile/credentials) into the new accounts array, so
     nobody's existing local data is lost by this update.

   NOTE ON data/dummy.json: mirrored there for documentation only; the
   app always seeds itself from the constants in this file, never via
   fetch(), because file:// blocks fetch() of local files in most
   browsers.
   ========================================================= */

const ST = (() => {
  const KEYS = {
    SESSION: 'senseitrack_session',
    ACCOUNTS: 'senseitrack_accounts',
    ASSESSMENTS: 'senseitrack_assessments',
    INDICATOR_BANK: 'senseitrack_indicator_bank',
    THEME: 'senseitrack_theme',
    LANGUAGE: 'senseitrack_language',
    SOUND: 'senseitrack_sound',
    SEEDED_V2: 'senseitrack_seeded_v2',
    // v1 (legacy) keys, read only during migration then left alone
    LEGACY_SEEDED: 'senseitrack_seeded_v1',
    LEGACY_CREDENTIALS: 'senseitrack_credentials',
    LEGACY_PROFILE: 'senseitrack_profile',
  };

  /* Anyone registering with this code becomes an Admin (Kepsek/Pengawas).
     Kept out of the UI on purpose — share it only with people who should
     actually have oversight access. */
  const ADMIN_INVITE_CODE = 'SENSEI-ADMIN-2026';

  /* ---------------- Question bank (4 kompetensi guru) — factory default ---------------- */
  const DEFAULT_INDICATOR_BANK = [
    {
      category: 'pedagogik',
      label: 'Kompetensi Pedagogik',
      icon: 'school',
      items: [
        { id: 'PED-1', text: 'Saya menyusun rencana pembelajaran (RPP/modul ajar) yang sesuai dengan karakteristik peserta didik.' },
        { id: 'PED-2', text: 'Saya menggunakan media dan metode pembelajaran yang variatif sesuai materi yang diajarkan.' },
        { id: 'PED-3', text: 'Saya melakukan penilaian dan evaluasi pembelajaran secara berkala untuk mengukur pemahaman siswa.' },
        { id: 'PED-4', text: 'Saya memberikan umpan balik yang membangun terhadap hasil belajar peserta didik.' },
      ],
    },
    {
      category: 'profesional',
      label: 'Kompetensi Profesional',
      icon: 'workspace_premium',
      items: [
        { id: 'PRO-1', text: 'Saya menguasai materi pelajaran yang saya ajarkan secara mendalam.' },
        { id: 'PRO-2', text: 'Saya mengikuti pelatihan, seminar, atau workshop untuk mengembangkan kompetensi keprofesian.' },
        { id: 'PRO-3', text: 'Saya memanfaatkan teknologi digital untuk mendukung proses pembelajaran.' },
        { id: 'PRO-4', text: 'Saya melakukan refleksi dan perbaikan berkelanjutan terhadap praktik mengajar saya.' },
      ],
    },
    {
      category: 'kepribadian',
      label: 'Kompetensi Kepribadian',
      icon: 'self_improvement',
      items: [
        { id: 'KEP-1', text: 'Saya bertindak sesuai dengan norma agama, hukum, sosial, dan kebudayaan nasional.' },
        { id: 'KEP-2', text: 'Saya menunjukkan etos kerja, tanggung jawab, dan kedisiplinan sebagai pendidik.' },
        { id: 'KEP-3', text: 'Saya menjadi teladan yang baik bagi peserta didik dalam sikap dan perilaku sehari-hari.' },
      ],
    },
    {
      category: 'sosial',
      label: 'Kompetensi Sosial',
      icon: 'diversity_3',
      items: [
        { id: 'SOS-1', text: 'Saya berkomunikasi secara efektif dan santun dengan peserta didik, sesama guru, dan orang tua.' },
        { id: 'SOS-2', text: 'Saya berpartisipasi aktif dalam kegiatan sekolah dan komunitas profesi guru.' },
        { id: 'SOS-3', text: 'Saya bersikap inklusif dan tidak membeda-bedakan peserta didik dengan latar belakang berbeda.' },
      ],
    },
  ];

  const LIKERT_LABELS = ['Tidak Pernah', 'Jarang', 'Kadang-kadang', 'Sering', 'Selalu'];

  /* ---------------- Generic storage helpers ---------------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('ST.read failed for', key, e);
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('ST.write failed for', key, e);
      return false;
    }
  }

  function generateId(prefix) {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const time = Date.now().toString(36).slice(-4).toUpperCase();
    return `${prefix}-${time}${rand}`;
  }

  function slugify(text) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'kategori';
  }

  /* ---------------- Indicator bank (editable) ---------------- */
  function getIndicatorBank() {
    return read(KEYS.INDICATOR_BANK, null) || DEFAULT_INDICATOR_BANK;
  }
  function saveIndicatorBank(bank) { return write(KEYS.INDICATOR_BANK, bank); }
  function resetIndicatorBankToDefault() { return write(KEYS.INDICATOR_BANK, DEFAULT_INDICATOR_BANK); }

  function flattenBank() {
    return getIndicatorBank().flatMap((cat) =>
      cat.items.map((it) => ({ ...it, category: cat.category, categoryLabel: cat.label }))
    );
  }

  function addCategory({ label, icon }) {
    const bank = getIndicatorBank();
    let key = slugify(label);
    if (bank.some((c) => c.category === key)) key = `${key}-${Math.random().toString(36).slice(2, 5)}`;
    const newCat = { category: key, label, icon: icon || 'category', items: [] };
    bank.push(newCat);
    saveIndicatorBank(bank);
    return newCat;
  }
  function updateCategory(categoryKey, { label, icon }) {
    const bank = getIndicatorBank();
    const cat = bank.find((c) => c.category === categoryKey);
    if (!cat) return null;
    if (label) cat.label = label;
    if (icon) cat.icon = icon;
    saveIndicatorBank(bank);
    return cat;
  }
  function deleteCategory(categoryKey) {
    const bank = getIndicatorBank().filter((c) => c.category !== categoryKey);
    saveIndicatorBank(bank);
  }
  function addQuestion(categoryKey, text) {
    const bank = getIndicatorBank();
    const cat = bank.find((c) => c.category === categoryKey);
    if (!cat) return null;
    const newItem = { id: generateId(categoryKey.slice(0, 3).toUpperCase()), text };
    cat.items.push(newItem);
    saveIndicatorBank(bank);
    return newItem;
  }
  function updateQuestion(questionId, text) {
    const bank = getIndicatorBank();
    for (const cat of bank) {
      const item = cat.items.find((it) => it.id === questionId);
      if (item) { item.text = text; saveIndicatorBank(bank); return item; }
    }
    return null;
  }
  function deleteQuestion(questionId) {
    const bank = getIndicatorBank();
    bank.forEach((cat) => { cat.items = cat.items.filter((it) => it.id !== questionId); });
    saveIndicatorBank(bank);
  }

  /* ---------------- Seed content builders ---------------- */
  function buildSeedAssessmentsFor(accountId, samples, reflections, followUps) {
    const bank = flattenBank();
    return samples.map((s, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - s.daysAgo);
      const answers = bank.map((q, i) => {
        const wiggle = ((i * 7 + idx * 3) % (s.spread * 2 + 1)) - s.spread;
        const score = Math.min(5, Math.max(1, s.base + wiggle));
        return {
          id: q.id, category: q.category, categoryLabel: q.categoryLabel, question: q.text, score,
          evidenceType: 'text',
          evidenceValue: 'Dokumentasi dicatat pada jurnal mengajar harian.',
        };
      });
      const overallScore = +(answers.reduce((a, b) => a + b.score, 0) / answers.length).toFixed(2);
      return {
        id: generateId('AST'),
        accountId,
        date: date.toISOString().slice(0, 10),
        className: s.className,
        material: s.material,
        answers,
        overallScore,
        categoryScores: computeCategoryScores(answers),
        tier: getScoreTier(overallScore),
        reflection: reflections[idx % reflections.length],
        followUp: followUps[idx % followUps.length],
        createdAt: date.toISOString(),
      };
    });
  }

  function freshSeed() {
    saveIndicatorBank(DEFAULT_INDICATOR_BANK);

    const accAdmin = {
      id: generateId('ACC'), role: 'admin',
      name: 'Ahmad Fauzan, S.Pd.', email: 'admin@senseitrack.id', password: '123456',
      phone: '0812-3456-7890', birthDate: '1990-04-12', gender: 'Laki-laki',
      school: 'SMP Negeri 5 Kutawaringin', nip: '198904122015031004',
      subject: 'Matematika & IPA', level: 'SMP / Sederajat', joinDate: '2015-03-01', avatar: null,
      createdAt: new Date().toISOString(),
    };
    const accSiti = {
      id: generateId('ACC'), role: 'guru',
      name: 'Siti Nurhaliza, S.Pd.', email: 'siti@senseitrack.id', password: '123456',
      phone: '0813-2222-1111', birthDate: '1992-08-20', gender: 'Perempuan',
      school: 'SMP Negeri 5 Kutawaringin', nip: '199208202016032002',
      subject: 'Bahasa Indonesia', level: 'SMP / Sederajat', joinDate: '2016-07-01', avatar: null,
      createdAt: new Date().toISOString(),
    };
    const accBudi = {
      id: generateId('ACC'), role: 'guru',
      name: 'Budi Santoso, S.Pd.', email: 'budi@senseitrack.id', password: '123456',
      phone: '0813-5555-4444', birthDate: '1988-01-15', gender: 'Laki-laki',
      school: 'SMP Negeri 5 Kutawaringin', nip: '198801152014031001',
      subject: 'Pendidikan Jasmani (PJOK)', level: 'SMP / Sederajat', joinDate: '2014-01-10', avatar: null,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.ACCOUNTS, [accAdmin, accSiti, accBudi]);

    const assessments = [
      ...buildSeedAssessmentsFor(accAdmin.id,
        [
          { daysAgo: 42, className: 'VII A', material: 'Matematika — Bilangan Bulat', base: 3, spread: 1 },
          { daysAgo: 30, className: 'VIII B', material: 'Bahasa Indonesia — Teks Argumentasi', base: 4, spread: 1 },
          { daysAgo: 18, className: 'IX A', material: 'IPA — Sistem Pencernaan', base: 3, spread: 2 },
          { daysAgo: 7, className: 'VII A', material: 'Matematika — Pecahan', base: 4, spread: 1 },
          { daysAgo: 2, className: 'IX A', material: 'IPA — Zat Aditif Makanan', base: 5, spread: 1 },
        ],
        [
          'Peserta didik cukup antusias, tapi saya perlu memperbanyak contoh soal kontekstual agar lebih mudah dipahami.',
          'Diskusi kelompok berjalan lancar. Beberapa siswa masih ragu bertanya di depan kelas, perlu pendekatan personal.',
          'Alokasi waktu praktikum kurang, materi lanjutan harus disesuaikan di pertemuan berikutnya.',
          'Penggunaan media visual cukup membantu, respons siswa terhadap kuis interaktif sangat positif.',
          'Secara umum pembelajaran berjalan sesuai rencana, evaluasi akhir menunjukkan pemahaman yang merata.',
        ],
        [
          'Menyiapkan bank soal kontekstual tambahan dan mengadakan sesi tanya-jawab kecil di awal pertemuan.',
          'Membentuk kelompok diskusi lebih kecil agar siswa yang pendiam lebih percaya diri berpartisipasi.',
          'Mengatur ulang jadwal praktikum menjadi dua sesi agar tidak terburu-buru.',
          'Menambah variasi kuis interaktif berbasis gambar untuk topik berikutnya.',
          'Mempertahankan strategi yang sudah berjalan baik dan mendokumentasikannya sebagai catatan mengajar.',
        ]),
      ...buildSeedAssessmentsFor(accSiti.id,
        [
          { daysAgo: 20, className: 'VII C', material: 'Bahasa Indonesia — Teks Argumentasi', base: 4, spread: 1 },
          { daysAgo: 10, className: 'VIII A', material: 'Bahasa Indonesia — Membaca Nyaring', base: 3, spread: 1 },
          { daysAgo: 3, className: 'IX B', material: 'Bahasa Indonesia — Menulis Puisi', base: 4, spread: 1 },
        ],
        [
          'Siswa antusias saat diskusi teks argumentasi, namun beberapa masih kesulitan menyusun kalimat opini yang runtut.',
          'Kegiatan membaca nyaring berjalan lancar, perlu variasi lebih untuk menjaga fokus siswa di menit-menit akhir.',
          'Latihan menulis puisi mendapat respons positif, banyak siswa ingin membacakan karyanya di depan kelas.',
        ],
        [
          'Menyediakan kerangka kalimat opini sebagai panduan awal sebelum menulis teks lengkap.',
          'Menyisipkan ice breaking singkat di pertengahan sesi membaca.',
          'Menjadwalkan sesi apresiasi karya siswa secara rutin tiap akhir bulan.',
        ]),
      ...buildSeedAssessmentsFor(accBudi.id,
        [
          { daysAgo: 15, className: 'VIII C', material: 'PJOK — Permainan Bola Voli', base: 3, spread: 2 },
          { daysAgo: 5, className: 'VII B', material: 'PJOK — Kebugaran Jasmani', base: 4, spread: 1 },
        ],
        [
          'Siswa sangat aktif dalam praktik permainan bola voli, namun pemahaman aturan permainan masih perlu penguatan.',
          'Sesi pemanasan dan peregangan berjalan tertib, kesadaran siswa akan pentingnya pemanasan mulai meningkat.',
        ],
        [
          'Menyisipkan penjelasan singkat aturan permainan sebelum praktik dimulai.',
          'Membuat checklist pemanasan mandiri yang bisa diisi siswa sebelum kelas dimulai.',
        ]),
    ];
    write(KEYS.ASSESSMENTS, assessments);
    write(KEYS.THEME, 'light');
    write(KEYS.LANGUAGE, 'id');
    write(KEYS.SOUND, true);
  }

  /* Upgrade path for anyone who already used the single-profile v1 app. */
  function migrateLegacyIfNeeded() {
    const alreadyV2 = read(KEYS.SEEDED_V2, false);
    if (alreadyV2) return false;

    const hadV1 = read(KEYS.LEGACY_SEEDED, false);
    if (!hadV1) return false; // nothing to migrate, fresh install

    const legacyProfile = read(KEYS.LEGACY_PROFILE, null);
    const legacyCreds = read(KEYS.LEGACY_CREDENTIALS, null);
    const legacyAssessments = read(KEYS.ASSESSMENTS, []);

    saveIndicatorBank(DEFAULT_INDICATOR_BANK);

    const migratedAccount = {
      id: generateId('ACC'),
      role: 'admin', // promoted so nothing they could do before is lost, plus unlocks the new admin tools
      name: legacyProfile?.name || 'Guru',
      email: legacyCreds?.email || 'admin@senseitrack.id',
      password: legacyCreds?.password || '123456',
      phone: legacyProfile?.phone || '',
      birthDate: legacyProfile?.birthDate || '',
      gender: legacyProfile?.gender || 'Laki-laki',
      school: legacyProfile?.school || '',
      nip: legacyProfile?.nip || '',
      subject: legacyProfile?.subject || '',
      level: legacyProfile?.level || 'SMP / Sederajat',
      joinDate: legacyProfile?.joinDate || '',
      avatar: legacyProfile?.avatar || null,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.ACCOUNTS, [migratedAccount]);

    const migratedAssessments = legacyAssessments.map((a) => ({ ...a, accountId: migratedAccount.id }));
    write(KEYS.ASSESSMENTS, migratedAssessments);

    if (read(KEYS.SOUND, null) === null) write(KEYS.SOUND, true);
    write(KEYS.SEEDED_V2, true);
    return true;
  }

  function seedIfNeeded() {
    if (read(KEYS.SEEDED_V2, false)) return;
    const migrated = migrateLegacyIfNeeded();
    if (migrated) return;
    freshSeed();
    write(KEYS.SEEDED_V2, true);
  }

  /* ---------------- Domain helpers ---------------- */
  function computeCategoryScores(answers) {
    const groups = {};
    answers.forEach((a) => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a.score);
    });
    const out = {};
    Object.keys(groups).forEach((cat) => {
      const arr = groups[cat];
      out[cat] = +(arr.reduce((x, y) => x + y, 0) / arr.length).toFixed(2);
    });
    return out;
  }

  function getScoreTier(score) {
    if (score >= 4.5) return { label: 'Sangat Baik', tone: 'success' };
    if (score >= 3.5) return { label: 'Baik', tone: 'info' };
    if (score >= 2.5) return { label: 'Cukup', tone: 'warning' };
    return { label: 'Perlu Ditingkatkan', tone: 'danger' };
  }

  /* Simple rule-based "insight" — not real AI, just pattern checks over
     the account's own history. Framed honestly in the UI as an automatic
     tip, never labelled as AI-generated. */
  function generateInsight(accountId) {
    const list = publicApi.getAssessments(accountId);
    if (list.length < 2) {
      return { icon: 'auto_awesome', text: 'Isi beberapa penilaian lagi supaya SenseiTrack bisa mulai kasih insight tentang pola mengajarmu.' };
    }
    const chrono = [...list].reverse();
    const catLabelMap = {};
    getIndicatorBank().forEach((c) => { catLabelMap[c.category] = c.label.replace('Kompetensi ', ''); });

    const totals = {}; const counts = {};
    chrono.forEach((a) => Object.entries(a.categoryScores || {}).forEach(([c, s]) => {
      totals[c] = (totals[c] || 0) + s; counts[c] = (counts[c] || 0) + 1;
    }));
    const averages = Object.keys(totals).map((c) => ({ c, avg: totals[c] / counts[c] }));
    averages.sort((a, b) => a.avg - b.avg);

    const last = chrono[chrono.length - 1].overallScore;
    const prevAvg = chrono.slice(0, -1).reduce((s, a) => s + a.overallScore, 0) / (chrono.length - 1);

    if (last > prevAvg + 0.3) {
      return { icon: 'trending_up', text: `Skor terakhirmu (${last.toFixed(2)}) naik dibanding rata-rata sebelumnya. Pertahankan momentum ini!` };
    }
    if (last < prevAvg - 0.3 && averages[0]) {
      return { icon: 'lightbulb', text: `Skor sedikit menurun akhir-akhir ini. ${catLabelMap[averages[0].c]} punya rata-rata paling rendah — mungkin bisa jadi fokus perbaikan berikutnya.` };
    }
    if (averages[0] && averages[averages.length - 1] && averages[averages.length - 1].avg - averages[0].avg > 0.6) {
      return { icon: 'target', text: `${catLabelMap[averages[0].c]} punya skor rata-rata paling rendah dibanding kompetensi lainnya. Coba jadikan fokus refleksi minggu ini.` };
    }
    return { icon: 'auto_awesome', text: 'Perkembanganmu cukup stabil di semua kompetensi. Terus konsisten mengisi refleksi supaya polanya makin terlihat jelas.' };
  }

  /* ---------------- Public API ---------------- */
  const publicApi = {
    KEYS, ADMIN_INVITE_CODE, LIKERT_LABELS,
    generateId, seedIfNeeded,
    computeCategoryScores, getScoreTier, generateInsight,

    /* Indicator bank */
    getIndicatorBank, saveIndicatorBank, resetIndicatorBankToDefault, flattenBank,
    addCategory, updateCategory, deleteCategory, addQuestion, updateQuestion, deleteQuestion,

    /* Session */
    getSession() {
      return read(KEYS.SESSION, null) || JSON.parse(sessionStorage.getItem(KEYS.SESSION) || 'null');
    },
    setSession(session, remember) {
      if (remember) {
        localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        sessionStorage.removeItem(KEYS.SESSION);
      } else {
        sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        localStorage.removeItem(KEYS.SESSION);
      }
    },
    clearSession() {
      localStorage.removeItem(KEYS.SESSION);
      sessionStorage.removeItem(KEYS.SESSION);
    },
    setActiveView(view) {
      const inLocal = localStorage.getItem(KEYS.SESSION);
      const area = inLocal ? localStorage : sessionStorage;
      const session = JSON.parse(area.getItem(KEYS.SESSION) || 'null');
      if (!session) return;
      session.activeView = view;
      area.setItem(KEYS.SESSION, JSON.stringify(session));
    },

    /* Accounts */
    getAccounts() { return read(KEYS.ACCOUNTS, []); },
    saveAccounts(arr) { return write(KEYS.ACCOUNTS, arr); },
    getAccountById(id) { return read(KEYS.ACCOUNTS, []).find((a) => a.id === id) || null; },
    getAccountByEmail(email) {
      const e = (email || '').toLowerCase();
      return read(KEYS.ACCOUNTS, []).find((a) => a.email.toLowerCase() === e) || null;
    },
    isEmailTaken(email, excludeId) {
      const e = (email || '').toLowerCase();
      return read(KEYS.ACCOUNTS, []).some((a) => a.email.toLowerCase() === e && a.id !== excludeId);
    },
    addAccount(obj) {
      const arr = read(KEYS.ACCOUNTS, []);
      arr.push(obj);
      write(KEYS.ACCOUNTS, arr);
      return obj;
    },
    updateAccount(id, patch) {
      const arr = read(KEYS.ACCOUNTS, []);
      const acc = arr.find((a) => a.id === id);
      if (!acc) return null;
      Object.assign(acc, patch);
      write(KEYS.ACCOUNTS, arr);
      return acc;
    },

    /* Assessments */
    getAssessments(accountId) {
      return read(KEYS.ASSESSMENTS, [])
        .filter((a) => a.accountId === accountId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    getAllAssessments() {
      return read(KEYS.ASSESSMENTS, []).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    saveAllAssessments(arr) { return write(KEYS.ASSESSMENTS, arr); },
    addAssessment(record) {
      const arr = read(KEYS.ASSESSMENTS, []);
      arr.push(record);
      return write(KEYS.ASSESSMENTS, arr);
    },
    getAssessmentById(id) {
      return read(KEYS.ASSESSMENTS, []).find((a) => a.id === id) || null;
    },

    /* Prefs */
    getTheme() { return read(KEYS.THEME, 'light'); },
    setTheme(t) { return write(KEYS.THEME, t); },
    getLanguage() { return read(KEYS.LANGUAGE, 'id'); },
    setLanguage(l) { return write(KEYS.LANGUAGE, l); },
    getSoundEnabled() { const v = read(KEYS.SOUND, null); return v === null ? true : v; },
    setSoundEnabled(v) { return write(KEYS.SOUND, v); },
  };
  return publicApi;
})();

/* Seed / migrate once, on every page, before anything else runs. */
ST.seedIfNeeded();
