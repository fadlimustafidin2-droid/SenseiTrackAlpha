/* =========================================================
   SenseiTrack — app.js  (v2 — role-aware)
   Shared across every page: auth guard, theme, sidebar/topbar
   wiring, toast system, confirm modal, date helpers, i18n,
   sound effects, and the admin/guru mode switch.
   Load order on every protected page: storage.js -> app.js -> page script.
   ========================================================= */

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const I18N = {
  id: {
    'nav.dashboard': 'Dashboard', 'nav.assessment': 'Self Assessment', 'nav.history': 'Riwayat',
    'nav.profile': 'Profil', 'nav.settings': 'Pengaturan', 'nav.about': 'Tentang',
    'nav.admindash': 'Dashboard Admin', 'nav.manageindicators': 'Kelola Indikator',
    'topbar.logout': 'Keluar', 'topbar.myprofile': 'Profil Saya',
    'settings.theme.title': 'Tampilan', 'settings.theme.desc': 'Atur mode terang atau gelap untuk seluruh aplikasi.',
    'settings.language.title': 'Bahasa', 'settings.language.desc': 'Pilih bahasa antarmuka SenseiTrack.',
    'settings.password.title': 'Ubah Kata Sandi', 'settings.account.title': 'Akun',
    'common.save': 'Simpan', 'common.cancel': 'Batal', 'common.light': 'Terang', 'common.dark': 'Gelap',
  },
  en: {
    'nav.dashboard': 'Dashboard', 'nav.assessment': 'Self Assessment', 'nav.history': 'History',
    'nav.profile': 'Profile', 'nav.settings': 'Settings', 'nav.about': 'About',
    'nav.admindash': 'Admin Dashboard', 'nav.manageindicators': 'Manage Indicators',
    'topbar.logout': 'Log out', 'topbar.myprofile': 'My Profile',
    'settings.theme.title': 'Appearance', 'settings.theme.desc': 'Set light or dark mode for the whole app.',
    'settings.language.title': 'Language', 'settings.language.desc': 'Choose the SenseiTrack interface language.',
    'settings.password.title': 'Change Password', 'settings.account.title': 'Account',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.light': 'Light', 'common.dark': 'Dark',
  },
};

const App = (() => {
  /* ---- Runs immediately, before paint: theme + auth guard ---- */
  function initTheme() {
    const theme = ST.getTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  function requireAuth() {
    const session = ST.getSession();
    if (!session) {
      window.location.replace('index.html');
      return false;
    }
    return true;
  }

  function requireAdmin() {
    const session = ST.getSession();
    if (!session) { window.location.replace('index.html'); return false; }
    if (session.role !== 'admin') { window.location.replace('dashboard.html'); return false; }
    return true;
  }

  function redirectIfAuthed() {
    const session = ST.getSession();
    if (session) window.location.replace(session.activeView === 'admin' ? 'admin-dashboard.html' : 'dashboard.html');
  }

  /* ---- Date / greeting helpers ---- */
  function formatDate(iso, lang) {
    lang = lang || ST.getLanguage();
    const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
    const months = lang === 'en' ? MONTHS_EN : MONTHS_ID;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatDateShort(iso) {
    const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function timeGreeting(lang) {
    lang = lang || ST.getLanguage();
    const h = new Date().getHours();
    if (lang === 'en') {
      if (h < 11) return 'Good morning';
      if (h < 15) return 'Good afternoon';
      if (h < 18) return 'Good evening';
      return 'Good night';
    }
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  function initials(name) {
    if (!name) return 'G';
    return name.replace(/,.*$/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  /* ---- i18n ---- */
  function applyLanguage() {
    const lang = ST.getLanguage();
    document.documentElement.lang = lang;
    const dict = I18N[lang] || I18N.id;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
  }

  /* ---- Sound effects (synthesized, no audio files needed) ---- */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function playTone(freq, duration, type, gainPeak, delay) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + (delay || 0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(gainPeak || 0.06, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch (e) { /* autoplay-restricted or unsupported, fail silently */ }
  }
  function playSound(name) {
    if (!ST.getSoundEnabled()) return;
    if (name === 'click') playTone(520, 0.05, 'sine', 0.05);
    else if (name === 'select') playTone(660, 0.06, 'sine', 0.06);
    else if (name === 'success') { playTone(523.25, 0.12, 'sine', 0.07); playTone(783.99, 0.2, 'sine', 0.07, 0.1); }
    else if (name === 'error') playTone(180, 0.18, 'sawtooth', 0.05);
    else if (name === 'nav') playTone(440, 0.045, 'triangle', 0.035);
  }

  /* ---- Small celebratory confetti burst on meaningful wins ---- */
  function celebrate() {
    const colors = ['#2563EB', '#14B8A6', '#F59E0B', '#8B5CF6', '#EC4899'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden;';
    document.body.appendChild(container);
    for (let i = 0; i < 26; i++) {
      const piece = document.createElement('div');
      const size = 6 + Math.random() * 6;
      const left = Math.random() * 100;
      const duration = (1.1 + Math.random() * 0.8).toFixed(2);
      const delay = (Math.random() * 0.15).toFixed(2);
      const color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.cssText = `position:absolute; top:-5%; left:${left}%; width:${size}px; height:${size * 0.5}px; background:${color}; opacity:0.9; border-radius:2px; animation: confettiFall ${duration}s ease-in ${delay}s forwards;`;
      container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 2300);
  }

  /* ---- Toast ---- */
  function ensureToastContainer() {
    let c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toastContainer';
      document.body.appendChild(c);
    }
    return c;
  }

  const TOAST_ICON = { success: 'check_circle', error: 'error', info: 'info' };

  function showToast(message, type = 'info', title = null) {
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="material-symbols-rounded" style="font-size:20px; color:${type === 'success' ? 'var(--color-success)' : type === 'error' ? 'var(--color-danger)' : 'var(--color-secondary)'}">${TOAST_ICON[type] || 'info'}</span>
      <div class="flex-1 min-w-0">
        ${title ? `<p class="font-semibold text-sm mb-0.5">${title}</p>` : ''}
        <p class="text-sm opacity-90 leading-snug">${message}</p>
      </div>
      <button class="js-toast-close text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0" aria-label="Tutup notifikasi">
        <span class="material-symbols-rounded" style="font-size:18px">close</span>
      </button>`;
    container.appendChild(el);
    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 240);
    };
    el.querySelector('.js-toast-close').addEventListener('click', remove);
    setTimeout(remove, 4200);
  }

  /* ---- Confirm modal (built on demand, no static markup needed per page) ---- */
  function confirmDialog({ title = 'Konfirmasi', message = '', confirmText = 'Ya, lanjutkan', cancelText = 'Batal', danger = false, icon = 'help' } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-panel" role="dialog" aria-modal="true">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-blue-100 text-primary dark:bg-blue-500/15'}">
            <span class="material-symbols-rounded" style="font-size:26px">${icon}</span>
          </div>
          <h3 class="text-lg font-semibold mb-1.5">${title}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">${message}</p>
          <div class="flex gap-3">
            <button class="btn btn-outline flex-1 js-cancel">${cancelText}</button>
            <button class="btn flex-1 js-confirm ${danger ? '' : 'btn-primary'}" style="${danger ? 'background:var(--color-danger); color:white;' : ''}">${confirmText}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('open'));

      function close(result) {
        backdrop.classList.remove('open');
        setTimeout(() => backdrop.remove(), 220);
        resolve(result);
      }
      backdrop.querySelector('.js-cancel').addEventListener('click', () => close(false));
      backdrop.querySelector('.js-confirm').addEventListener('click', () => close(true));
      backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', esc); }
      });
    });
  }

  /* ---- Logout ---- */
  async function logout() {
    const ok = await confirmDialog({
      title: 'Keluar dari akun?',
      message: 'Kamu akan keluar dari SenseiTrack. Data yang sudah tersimpan tidak akan hilang.',
      confirmText: 'Ya, keluar',
      icon: 'logout',
    });
    if (!ok) return;
    ST.clearSession();
    window.location.replace('index.html');
  }

  /* ---- Switch between Admin and Guru view (admin-capable accounts only) ---- */
  function switchView(view) {
    ST.setActiveView(view);
    playSound('nav');
    window.location.href = view === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
  }

  /* ---- Shell wiring: sidebar, topbar, user menu ---- */
  function initShell() {
    const session = ST.getSession();
    const account = session ? ST.getAccountById(session.accountId) : null;

    document.querySelectorAll('.js-user-name').forEach((el) => { el.textContent = account?.name || 'Guru'; });
    document.querySelectorAll('.js-user-role').forEach((el) => { el.textContent = account?.subject || account?.school || ''; });
    document.querySelectorAll('.js-user-initials').forEach((el) => { el.textContent = initials(account?.name); });
    document.querySelectorAll('.js-user-avatar-img').forEach((img) => {
      if (account?.avatar) { img.src = account.avatar; img.classList.remove('hidden'); }
    });
    document.querySelectorAll('.js-user-avatar-fallback').forEach((el) => {
      if (account?.avatar) el.classList.add('hidden');
    });

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openBtn = document.getElementById('sidebarOpenBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    function openSidebar() { sidebar?.classList.remove('-translate-x-full'); overlay?.classList.remove('hidden'); }
    function closeSidebar() { sidebar?.classList.add('-translate-x-full'); overlay?.classList.add('hidden'); }
    openBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    const menuBtn = document.getElementById('userMenuBtn');
    const menuPanel = document.getElementById('userMenuPanel');
    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      menuPanel?.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (menuPanel && !menuPanel.classList.contains('hidden') && !menuPanel.contains(e.target) && e.target !== menuBtn) {
        menuPanel.classList.add('hidden');
      }
    });

    // Admin-capable accounts get a quick mode switcher injected into the dropdown,
    // above whatever links already live there — works on every page without
    // needing bespoke sidebar markup per file.
    if (menuPanel && account?.role === 'admin') {
      const switcher = document.createElement('div');
      switcher.className = 'pb-2 mb-2 border-b border-slate-100 dark:border-slate-800';
      switcher.innerHTML = `
        <p class="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Mode Tampilan</p>
        <button class="sidebar-link w-full js-switch-guru"><span class="material-symbols-rounded" style="font-size:19px">person</span>Dashboard Guru</button>
        <button class="sidebar-link w-full js-switch-admin"><span class="material-symbols-rounded" style="font-size:19px">admin_panel_settings</span>Dashboard Admin</button>`;
      menuPanel.prepend(switcher);
      switcher.querySelector('.js-switch-guru').addEventListener('click', () => switchView('guru'));
      switcher.querySelector('.js-switch-admin').addEventListener('click', () => switchView('admin'));
    }

    document.querySelectorAll('.js-logout').forEach((btn) => btn.addEventListener('click', logout));

    document.querySelectorAll('.js-theme-toggle').forEach((track) => {
      const isDark = ST.getTheme() === 'dark';
      track.classList.toggle('on', isDark);
      track.addEventListener('click', () => {
        const nowDark = !document.documentElement.classList.contains('dark');
        document.documentElement.classList.toggle('dark', nowDark);
        ST.setTheme(nowDark ? 'dark' : 'light');
        document.querySelectorAll('.js-theme-toggle').forEach((t) => t.classList.toggle('on', nowDark));
      });
    });

    // Likert pills, step navigation, etc. play tiny sounds; wire a light
    // global delegate so every current & future button click gets a soft
    // click cue except on inputs/links where it'd be noisy.
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('click', () => playSound('click'));
    });

    applyLanguage();
  }

  return {
    initTheme, requireAuth, requireAdmin, redirectIfAuthed, initShell, switchView,
    formatDate, formatDateShort, timeGreeting, initials,
    showToast, confirmDialog, logout, applyLanguage,
    playSound, celebrate,
  };
})();

/* Apply theme the instant this script runs, before first paint. */
App.initTheme();
