/* =========================================================
   SenseiTrack — storage.js
   Single source of truth for all persisted data. Every other
   script reads/writes through the ST namespace defined here,
   nothing else touches localStorage directly.

   NOTE ON data/dummy.json: the same seed content below is also
   mirrored in data/dummy.json for documentation/reference, but
   the app seeds itself from the constants in this file instead
   of fetching that json. Opening the app straight from disk
   (file://) blocks fetch() of local files in most browsers, so
   keeping the seed inline keeps the app working with zero setup.
   ========================================================= */

const ST = (() => {
  const KEYS = {
    SESSION: 'senseitrack_session',
    CREDENTIALS: 'senseitrack_credentials',
    PROFILE: 'senseitrack_profile',
    ASSESSMENTS: 'senseitrack_assessments',
    THEME: 'senseitrack_theme',
    LANGUAGE: 'senseitrack_language',
    SEEDED: 'senseitrack_seeded_v1',
  };

  /* ---------------- Question bank (4 kompetensi guru) ---------------- */
  const INDICATOR_BANK = [
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

  function flattenBank() {
    return INDICATOR_BANK.flatMap((cat) =>
      cat.items.map((it) => ({ ...it, category: cat.category, categoryLabel: cat.label }))
    );
  }

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

  /* ---------------- Seed ---------------- */
  function buildSeedAssessments() {
    const bank = flattenBank();
    const samples = [
      { daysAgo: 42, className: 'VII A', material: 'Matematika — Bilangan Bulat', base: 3, spread: 1 },
      { daysAgo: 30, className: 'VIII B', material: 'Bahasa Indonesia — Teks Argumentasi', base: 4, spread: 1 },
      { daysAgo: 18, className: 'IX A', material: 'IPA — Sistem Pencernaan', base: 3, spread: 2 },
      { daysAgo: 7, className: 'VII A', material: 'Matematika — Pecahan', base: 4, spread: 1 },
      { daysAgo: 2, className: 'IX A', material: 'IPA — Zat Aditif Makanan', base: 5, spread: 1 },
    ];
    const reflections = [
      'Peserta didik cukup antusias, tapi saya perlu memperbanyak contoh soal kontekstual agar lebih mudah dipahami.',
      'Diskusi kelompok berjalan lancar. Beberapa siswa masih ragu bertanya di depan kelas, perlu pendekatan personal.',
      'Alokasi waktu praktikum kurang, materi lanjutan harus disesuaikan di pertemuan berikutnya.',
      'Penggunaan media visual cukup membantu, respons siswa terhadap kuis interaktif sangat positif.',
      'Secara umum pembelajaran berjalan sesuai rencana, evaluasi akhir menunjukkan pemahaman yang merata.',
    ];
    const followUps = [
      'Menyiapkan bank soal kontekstual tambahan dan mengadakan sesi tanya-jawab kecil di awal pertemuan.',
      'Membentuk kelompok diskusi lebih kecil agar siswa yang pendiam lebih percaya diri berpartisipasi.',
      'Mengatur ulang jadwal praktikum menjadi dua sesi agar tidak terburu-buru.',
      'Menambah variasi kuis interaktif berbasis gambar untuk topik berikutnya.',
      'Mempertahankan strategi yang sudah berjalan baik dan mendokumentasikannya sebagai catatan mengajar.',
    ];

    return samples.map((s, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - s.daysAgo);
      const answers = bank.map((q, i) => {
        const wiggle = ((i * 7 + idx * 3) % (s.spread * 2 + 1)) - s.spread;
        const score = Math.min(5, Math.max(1, s.base + wiggle));
        return {
          id: q.id,
          category: q.category,
          categoryLabel: q.categoryLabel,
          question: q.text,
          score,
          evidenceType: 'text',
          evidenceValue: 'Dokumentasi dicatat pada jurnal mengajar harian.',
        };
      });
      const overallScore = +(answers.reduce((a, b) => a + b.score, 0) / answers.length).toFixed(2);
      const categoryScores = computeCategoryScores(answers);
      return {
        id: generateId('AST'),
        date: date.toISOString().slice(0, 10),
        className: s.className,
        material: s.material,
        answers,
        overallScore,
        categoryScores,
        tier: getScoreTier(overallScore),
        reflection: reflections[idx],
        followUp: followUps[idx],
        createdAt: date.toISOString(),
      };
    });
  }

  function seedIfNeeded() {
    if (read(KEYS.SEEDED, false)) return;

    write(KEYS.CREDENTIALS, { email: 'admin@senseitrack.id', password: '123456' });

    write(KEYS.PROFILE, {
      name: 'Ahmad Fauzan, S.Pd.',
      email: 'admin@senseitrack.id',
      phone: '0812-3456-7890',
      birthDate: '1990-04-12',
      gender: 'Laki-laki',
      school: 'SMP Negeri 5 Kutawaringin',
      nip: '198904122015031004',
      subject: 'Matematika & IPA',
      level: 'SMP / Sederajat',
      joinDate: '2015-03-01',
      avatar: null,
    });

    write(KEYS.ASSESSMENTS, buildSeedAssessments());
    write(KEYS.THEME, 'light');
    write(KEYS.LANGUAGE, 'id');
    write(KEYS.SEEDED, true);
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

  /* ---------------- Public API ---------------- */
  return {
    KEYS,
    INDICATOR_BANK,
    LIKERT_LABELS,
    flattenBank,
    generateId,
    seedIfNeeded,
    computeCategoryScores,
    getScoreTier,

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

    getCredentials() { return read(KEYS.CREDENTIALS, { email: 'admin@senseitrack.id', password: '123456' }); },
    setCredentials(obj) { return write(KEYS.CREDENTIALS, obj); },

    getProfile() { return read(KEYS.PROFILE, {}); },
    setProfile(obj) { return write(KEYS.PROFILE, obj); },

    getAssessments() {
      return read(KEYS.ASSESSMENTS, []).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    saveAssessments(arr) { return write(KEYS.ASSESSMENTS, arr); },
    addAssessment(record) {
      const arr = read(KEYS.ASSESSMENTS, []);
      arr.push(record);
      return write(KEYS.ASSESSMENTS, arr);
    },
    getAssessmentById(id) {
      return read(KEYS.ASSESSMENTS, []).find((a) => a.id === id) || null;
    },

    getTheme() { return read(KEYS.THEME, 'light'); },
    setTheme(t) { return write(KEYS.THEME, t); },

    getLanguage() { return read(KEYS.LANGUAGE, 'id'); },
    setLanguage(l) { return write(KEYS.LANGUAGE, l); },
  };
})();

/* Seed demo data once, on every page, before anything else runs. */
ST.seedIfNeeded();
