/* =========================================================
   SenseiTrack — auth.js (index.html only)
   ========================================================= */

(function () {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const rememberMe = document.getElementById('rememberMe');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const submitLabel = document.getElementById('loginSubmitLabel');
  const spinner = document.getElementById('loginSpinner');
  const toggleBtn = document.getElementById('togglePassword');
  const demoBtn = document.getElementById('demoLoginBtn');
  const themeBtn = document.getElementById('themeToggleBtn');
  const themeIcon = themeBtn.querySelector('.icon-theme');

  function syncThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
  }
  syncThemeIcon();
  themeBtn.addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nowDark);
    ST.setTheme(nowDark ? 'dark' : 'light');
    syncThemeIcon();
  });

  toggleBtn.addEventListener('click', () => {
    const isPw = passwordInput.type === 'password';
    passwordInput.type = isPw ? 'text' : 'password';
    toggleBtn.querySelector('.material-symbols-rounded').textContent = isPw ? 'visibility_off' : 'visibility';
    toggleBtn.setAttribute('aria-label', isPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function setFieldError(input, errorEl, show) {
    input.classList.toggle('field-error', show);
    errorEl.classList.toggle('show', show);
  }

  function validate() {
    let ok = true;
    if (!isValidEmail(emailInput.value.trim())) { setFieldError(emailInput, emailError, true); ok = false; }
    else setFieldError(emailInput, emailError, false);

    if (passwordInput.value.length < 6) { setFieldError(passwordInput, passwordError, true); ok = false; }
    else setFieldError(passwordInput, passwordError, false);
    return ok;
  }

  [emailInput, passwordInput].forEach((el) => {
    el.addEventListener('input', validate);
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    spinner.classList.toggle('hidden', !loading);
    submitLabel.textContent = loading ? 'Memeriksa...' : 'Masuk';
  }

  function attemptLogin(email, password, remember) {
    setLoading(true);
    setTimeout(() => {
      const creds = ST.getCredentials();
      if (email.toLowerCase() === creds.email.toLowerCase() && password === creds.password) {
        const profile = ST.getProfile();
        ST.setSession({ email: creds.email, name: profile.name || 'Guru', loginAt: new Date().toISOString() }, remember);
        App.showToast('Selamat datang kembali!', 'success', 'Berhasil masuk');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 550);
      } else {
        setLoading(false);
        App.showToast('Periksa kembali email dan kata sandimu.', 'error', 'Email atau kata sandi salah');
        const card = form.closest('.max-w-sm');
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
    }, 750);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    attemptLogin(emailInput.value.trim(), passwordInput.value, rememberMe.checked);
  });

  demoBtn.addEventListener('click', () => {
    const creds = ST.getCredentials();
    emailInput.value = creds.email;
    passwordInput.value = creds.password;
    setFieldError(emailInput, emailError, false);
    setFieldError(passwordInput, passwordError, false);
    rememberMe.checked = true;
    attemptLogin(creds.email, creds.password, true);
  });
})();
