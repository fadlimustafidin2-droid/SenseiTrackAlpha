/* =========================================================
   SenseiTrack — profile.js
   ========================================================= */

(function () {
  App.initShell();

  let profile = ST.getProfile();

  const fields = {
    name: document.getElementById('fieldName'),
    email: document.getElementById('fieldEmail'),
    phone: document.getElementById('fieldPhone'),
    birthDate: document.getElementById('fieldBirthDate'),
    gender: document.getElementById('fieldGender'),
    school: document.getElementById('fieldSchool'),
    nip: document.getElementById('fieldNip'),
    subject: document.getElementById('fieldSubject'),
    level: document.getElementById('fieldLevel'),
    joinDate: document.getElementById('fieldJoinDate'),
  };

  const avatarImg = document.getElementById('avatarImg');
  const avatarDefaultImg = document.getElementById('avatarDefaultImg');
  const avatarUploadBtn = document.getElementById('avatarUploadBtn');
  const avatarInput = document.getElementById('avatarInput');
  const editBtn = document.getElementById('editProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const saveBtn = document.getElementById('saveProfileBtn');

  let stagedAvatar = null;
  let editing = false;

  function paintDisplay() {
    document.getElementById('profileNameDisplay').textContent = profile.name || '-';
    document.getElementById('profileSubjectDisplay').textContent = profile.subject || '-';
    document.getElementById('profileSchoolDisplay').textContent = profile.school || '-';
    if (profile.avatar) {
      avatarImg.src = profile.avatar;
      avatarImg.classList.remove('hidden');
      avatarDefaultImg.classList.add('hidden');
    } else {
      avatarImg.classList.add('hidden');
      avatarDefaultImg.classList.remove('hidden');
    }
  }

  function paintForm() {
    fields.name.value = profile.name || '';
    fields.email.value = profile.email || '';
    fields.phone.value = profile.phone || '';
    fields.birthDate.value = profile.birthDate || '';
    fields.gender.value = profile.gender || 'Laki-laki';
    fields.school.value = profile.school || '';
    fields.nip.value = profile.nip || '';
    fields.subject.value = profile.subject || '';
    fields.level.value = profile.level || 'SMP / Sederajat';
    fields.joinDate.value = profile.joinDate || '';
  }

  function setEditing(on) {
    editing = on;
    Object.values(fields).forEach((el) => { el.disabled = !on; });
    avatarUploadBtn.classList.toggle('hidden', !on);
    editBtn.classList.toggle('hidden', on);
    cancelBtn.classList.toggle('hidden', !on);
    saveBtn.classList.toggle('hidden', !on);
    if (!on) stagedAvatar = null;
  }

  function resizeAvatarToDataURL(file, size, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        canvas.getContext('2d').drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  avatarUploadBtn.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resizeAvatarToDataURL(file, 300, (dataUrl) => {
      stagedAvatar = dataUrl;
      avatarImg.src = dataUrl;
      avatarImg.classList.remove('hidden');
      avatarDefaultImg.classList.add('hidden');
    });
  });

  editBtn.addEventListener('click', () => setEditing(true));

  cancelBtn.addEventListener('click', () => {
    paintForm();
    paintDisplay();
    setEditing(false);
  });

  saveBtn.addEventListener('click', () => {
    if (!fields.name.value.trim()) {
      App.showToast('Nama lengkap wajib diisi.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim())) {
      App.showToast('Format email tidak valid.', 'error');
      return;
    }
    profile = {
      ...profile,
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      birthDate: fields.birthDate.value,
      gender: fields.gender.value,
      school: fields.school.value.trim(),
      nip: fields.nip.value.trim(),
      subject: fields.subject.value.trim(),
      level: fields.level.value,
      joinDate: fields.joinDate.value,
      avatar: stagedAvatar || profile.avatar || null,
    };
    ST.setProfile(profile);
    paintDisplay();
    setEditing(false);
    App.showToast('Profil berhasil diperbarui.', 'success', 'Tersimpan');

    document.querySelectorAll('.js-user-name').forEach((el) => { el.textContent = profile.name; });
    document.querySelectorAll('.js-user-initials').forEach((el) => { el.textContent = App.initials(profile.name); });
    document.querySelectorAll('.js-user-role').forEach((el) => { el.textContent = profile.subject || profile.school || ''; });
    if (profile.avatar) {
      document.querySelectorAll('.js-user-avatar-img').forEach((img) => { img.src = profile.avatar; img.classList.remove('hidden'); });
    }
  });

  paintDisplay();
  paintForm();
})();
