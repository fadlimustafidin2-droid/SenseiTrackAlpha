/* =========================================================
   SenseiTrack — register.js (register.html only)
   ========================================================= */

(function () {
  const form = document.getElementById('registerForm');
  const nameInput = document.getElementById('regName');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');
  const confirmInput = document.getElementById('regConfirmPassword');
  const isAdminCheckbox = document.getElementById('regIsAdmin');
  const adminCodeWrap = document.getElementById('adminCodeWrap');
  const adminCodeInput = document.getElementById('regAdminCode');

  const nameError = document.getElementById('regNameError');
  const emailError = document.getElementById('regEmailError');
  const passwordError = document.getElementById('regPasswordError');
  const adminCodeError = document.getElementById('regAdminCodeError');

  const submitBtn = document.getElementById('registerSubmitBtn');
  const submitLabel = document.getElementById('registerSubmitLabel');
  const spinner = document.getElementById('registerSpinner');
  const themeBtn = document.getElementById('themeToggleBtn');
  const themeIcon = themeBtn.querySelector('.icon-theme');

  function syncThemeIcon() {
    themeIcon.textContent = document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode';
  }
  syncThemeIcon();
  themeBtn.addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nowDark);
    ST.setTheme(nowDark ? 'dark' : 'light');
    syncThemeIcon();
  });

  isAdminCheckbox.addEventListener('change', () => {
    adminCodeWrap.classList.toggle('hidden', !isAdminCheckbox.checked);
    if (!isAdminCheckbox.checked) {
      adminCodeInput.classList.remove('field-error');
      adminCodeError.classList.remove('show');
    }
  });

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function setFieldError(input, errorEl, show) {
    input.classList.toggle('field-error', show);
    if (errorEl) errorEl.classList.toggle('show', show);
  }

  function validate() {
    let ok = true;

    if (!nameInput.value.trim()) { setFieldError(nameInput, nameError, true); ok = false; }
    else setFieldError(nameInput, nameError, false);

    const email = emailInput.value.trim();
    if (!isValidEmail(email) || ST.isEmailTaken(email)) { setFieldError(emailInput, emailError, true); ok = false; }
    else setFieldError(emailInput, emailError, false);

    const pwOk = passwordInput.value.length >= 6 && passwordInput.value === confirmInput.value;
    setFieldError(passwordInput, null, !pwOk);
    setFieldError(confirmInput, passwordError, !pwOk);
    if (!pwOk) ok = false;

    if (isAdminCheckbox.checked && adminCodeInput.value.trim() !== ST.ADMIN_INVITE_CODE) {
      setFieldError(adminCodeInput, adminCodeError, true);
      ok = false;
    } else {
      setFieldError(adminCodeInput, adminCodeError, false);
    }

    return ok;
  }

  [nameInput, emailInput, passwordInput, confirmInput, adminCodeInput].forEach((el) => {
    el.addEventListener('input', validate);
  });

  function setLoading(loading) {
    submitBtn.disabled = loading;
    spinner.classList.toggle('hidden', !loading);
    submitLabel.textContent = loading ? 'Membuat akun...' : 'Daftar';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      App.showToast('Periksa lagi data yang kamu isi.', 'error');
      return;
    }
    setLoading(true);

    setTimeout(() => {
      const role = isAdminCheckbox.checked ? 'admin' : 'guru';
      const account = {
        id: ST.generateId('ACC'),
        role,
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        phone: '', birthDate: '', gender: 'Laki-laki',
        school: '', nip: '', subject: '', level: 'SMP / Sederajat', joinDate: '',
        avatar: null,
        createdAt: new Date().toISOString(),
      };
      ST.addAccount(account);
      ST.setSession({
        accountId: account.id, email: account.email, name: account.name,
        role: account.role, activeView: account.role, loginAt: new Date().toISOString(),
      }, true);

      App.playSound('success');
      App.showToast('Akun berhasil dibuat. Selamat datang di SenseiTrack!', 'success', 'Berhasil daftar');
      setTimeout(() => {
        window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
      }, 650);
    }, 650);
  });
})();
