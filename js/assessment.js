/* =========================================================
   SenseiTrack — assessment.js
   ========================================================= */

(function () {
  App.initShell();

  const session = ST.getSession();
  const bank = ST.getIndicatorBank();
  const steps = [{ type: 'info' }, ...bank.map((c) => ({ type: 'category', data: c })), { type: 'final' }];
  const totalSteps = steps.length;
  let currentStep = 0;

  const state = {
    date: new Date().toISOString().slice(0, 10),
    className: '',
    material: '',
    answers: {},
    reflection: '',
    followUp: '',
  };
  ST.flattenBank().forEach((q) => { state.answers[q.id] = { score: null, evidenceType: 'text', evidenceValue: '' }; });

  const stepperEl = document.getElementById('stepperContainer');
  const panelEl = document.getElementById('stepPanel');
  const progressFill = document.getElementById('progressBarFill');
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const stepCounter = document.getElementById('stepCounter');
  const mainEl = document.querySelector('main');

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function resizeImageToDataURL(file, maxDim, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; } else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function stepLabel(step) {
    if (step.type === 'info') return 'Info';
    if (step.type === 'final') return 'Refleksi';
    return step.data.label.replace('Kompetensi ', '');
  }

  function renderStepper() {
    stepperEl.innerHTML = steps.map((s, i) => {
      const dotClass = i < currentStep ? 'done' : i === currentStep ? 'active' : '';
      const lineClass = i < currentStep ? 'done' : '';
      const dot = `<div class="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div class="step-dot ${dotClass}">${i < currentStep ? '<span class="material-symbols-rounded" style="font-size:16px">check</span>' : i + 1}</div>
          <span class="text-[10px] font-medium text-slate-400 whitespace-nowrap hidden sm:block">${stepLabel(s)}</span>
        </div>`;
      const line = i < steps.length - 1 ? `<div class="step-line ${lineClass} mx-1 sm:mx-2 mb-5"></div>` : '';
      return dot + line;
    }).join('');
    progressFill.style.width = `${(currentStep / (totalSteps - 1)) * 100}%`;
    stepCounter.textContent = `Langkah ${currentStep + 1} dari ${totalSteps}`;
    backBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    const isLast = currentStep === totalSteps - 1;
    nextBtn.innerHTML = isLast
      ? '<span class="material-symbols-rounded" style="font-size:19px">save</span>Simpan Penilaian'
      : 'Lanjut<span class="material-symbols-rounded" style="font-size:19px">arrow_forward</span>';
  }

  function evidenceSlotHTML(qid, current) {
    if (current.evidenceType === 'text') {
      return `<textarea class="field-input text-sm evidence-text-input" data-qid="${qid}" rows="2" placeholder="Tuliskan catatan atau bukti singkat...">${current.evidenceValue || ''}</textarea>`;
    }
    if (current.evidenceType === 'image') {
      const preview = current.evidenceValue
        ? `<div class="flex items-center gap-3 mt-2"><img src="${current.evidenceValue}" class="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700" alt="Pratinjau bukti" /><button type="button" class="text-xs text-red-500 font-medium evidence-remove" data-qid="${qid}">Hapus</button></div>`
        : '';
      return `<input type="file" accept="image/*" class="field-input text-xs evidence-file-input" data-qid="${qid}" />${preview}`;
    }
    const accept = current.evidenceType === 'video' ? 'video/*' : current.evidenceType === 'audio' ? 'audio/*' : '.pdf,.doc,.docx,.xlsx,.ppt,.pptx';
    const chip = current.evidenceValue
      ? `<div class="flex items-center gap-2 mt-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 w-fit"><span class="material-symbols-rounded" style="font-size:16px">draft</span>${current.evidenceValue}<button type="button" class="text-red-500 ml-2 font-medium evidence-remove" data-qid="${qid}">Hapus</button></div>`
      : '';
    return `<input type="file" accept="${accept}" class="field-input text-xs evidence-file-input" data-qid="${qid}" />${chip}`;
  }

  function questionRowHTML(q, idx, current) {
    return `
      <div class="pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 last:border-0 last:mb-0 last:pb-0">
        <p class="font-medium text-sm mb-3">${idx + 1}. ${q.text}</p>
        <div class="likert-group mb-3" data-likert-for="${q.id}">
          ${[1, 2, 3, 4, 5].map((n) => `
            <div class="likert-pill ${current.score === n ? 'selected' : ''}" data-score="${n}">
              <span class="likert-num">${n}</span>${ST.LIKERT_LABELS[n - 1]}
            </div>`).join('')}
        </div>
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="material-symbols-rounded text-slate-400" style="font-size:18px">attach_file</span>
          <select class="field-input py-1.5 text-xs w-auto evidence-type-select" data-qid="${q.id}">
            <option value="text" ${current.evidenceType === 'text' ? 'selected' : ''}>Catatan Teks</option>
            <option value="image" ${current.evidenceType === 'image' ? 'selected' : ''}>Gambar</option>
            <option value="file" ${current.evidenceType === 'file' ? 'selected' : ''}>Dokumen</option>
            <option value="video" ${current.evidenceType === 'video' ? 'selected' : ''}>Video</option>
            <option value="audio" ${current.evidenceType === 'audio' ? 'selected' : ''}>Audio</option>
          </select>
          <span class="text-xs text-slate-400">sebagai bukti</span>
        </div>
        <div class="evidence-slot" id="evidence-slot-${q.id}">${evidenceSlotHTML(q.id, current)}</div>
      </div>`;
  }

  function wireEvidenceSlot(qid) {
    const slot = document.getElementById(`evidence-slot-${qid}`);
    if (!slot) return;
    const textarea = slot.querySelector('.evidence-text-input');
    if (textarea) textarea.addEventListener('input', () => { state.answers[qid].evidenceValue = textarea.value; });

    const fileInput = slot.querySelector('.evidence-file-input');
    if (fileInput) fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const type = state.answers[qid].evidenceType;
      if (type === 'image') {
        resizeImageToDataURL(file, 480, (dataUrl) => {
          state.answers[qid].evidenceValue = dataUrl;
          slot.innerHTML = evidenceSlotHTML(qid, state.answers[qid]);
          wireEvidenceSlot(qid);
        });
      } else {
        state.answers[qid].evidenceValue = `${file.name} (${formatBytes(file.size)})`;
        slot.innerHTML = evidenceSlotHTML(qid, state.answers[qid]);
        wireEvidenceSlot(qid);
      }
    });

    const removeBtn = slot.querySelector('.evidence-remove');
    if (removeBtn) removeBtn.addEventListener('click', () => {
      state.answers[qid].evidenceValue = '';
      slot.innerHTML = evidenceSlotHTML(qid, state.answers[qid]);
      wireEvidenceSlot(qid);
    });
  }

  function wireCategoryStep(cat) {
    panelEl.querySelectorAll('.likert-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const group = pill.closest('[data-likert-for]');
        const qid = group.getAttribute('data-likert-for');
        state.answers[qid].score = +pill.getAttribute('data-score');
        group.querySelectorAll('.likert-pill').forEach((p) => p.classList.remove('selected'));
        pill.classList.add('selected');
        App.playSound('select');
      });
    });
    panelEl.querySelectorAll('.evidence-type-select').forEach((sel) => {
      sel.addEventListener('change', () => {
        const qid = sel.getAttribute('data-qid');
        state.answers[qid].evidenceType = sel.value;
        state.answers[qid].evidenceValue = '';
        document.getElementById(`evidence-slot-${qid}`).innerHTML = evidenceSlotHTML(qid, state.answers[qid]);
        wireEvidenceSlot(qid);
      });
    });
    cat.items.forEach((q) => wireEvidenceSlot(q.id));
  }

  function clearFieldError(input, errorEl) {
    input.classList.remove('field-error');
    errorEl.classList.remove('show');
  }

  function renderInfoStep() {
    panelEl.innerHTML = `
      <h3 class="font-semibold text-lg mb-1">Informasi Umum</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Lengkapi konteks kelas sebelum mengisi indikator penilaian.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class="field-label">Tanggal Pelaksanaan</label>
          <input type="date" id="fieldDate" class="field-input" value="${state.date}" />
        </div>
        <div>
          <label class="field-label">Kelas</label>
          <input type="text" id="fieldClass" class="field-input" placeholder="Contoh: VIII B" value="${state.className}" />
          <p class="field-error-text" id="fieldClassError">Kelas wajib diisi.</p>
        </div>
        <div>
          <label class="field-label">Mata Pelajaran / Materi</label>
          <input type="text" id="fieldMaterial" class="field-input" placeholder="Contoh: Matematika — Pecahan" value="${state.material}" />
          <p class="field-error-text" id="fieldMaterialError">Materi wajib diisi.</p>
        </div>
      </div>`;
    const dateEl = document.getElementById('fieldDate');
    const classEl = document.getElementById('fieldClass');
    const matEl = document.getElementById('fieldMaterial');
    dateEl.addEventListener('input', () => { state.date = dateEl.value; });
    classEl.addEventListener('input', () => { state.className = classEl.value; clearFieldError(classEl, document.getElementById('fieldClassError')); });
    matEl.addEventListener('input', () => { state.material = matEl.value; clearFieldError(matEl, document.getElementById('fieldMaterialError')); });
  }

  function renderCategoryStep(cat) {
    panelEl.innerHTML = `
      <div class="flex items-center gap-3 mb-1">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><span class="material-symbols-rounded">${cat.icon}</span></div>
        <div><h3 class="font-semibold text-lg">${cat.label}</h3><p class="text-xs text-slate-400">${cat.items.length} indikator</p></div>
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Pilih frekuensi yang paling menggambarkan praktik mengajarmu, lalu lampirkan bukti singkat bila ada.</p>
      <div>${cat.items.map((q, idx) => questionRowHTML(q, idx, state.answers[q.id])).join('')}</div>`;
    wireCategoryStep(cat);
  }

  function renderSummaryList() {
    const summaryEl = document.getElementById('summaryList');
    if (!summaryEl) return;
    const rows = bank.map((cat) => {
      const scores = cat.items.map((q) => state.answers[q.id].score).filter((s) => s !== null);
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-';
      return `<div class="flex items-center justify-between text-sm"><span class="text-slate-500 dark:text-slate-400">${cat.label}</span><span class="font-semibold font-tabular">${avg}</span></div>`;
    }).join('');
    const allScores = ST.flattenBank().map((q) => state.answers[q.id].score).filter((s) => s !== null);
    const overall = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : '-';
    summaryEl.innerHTML = rows + `<div class="flex items-center justify-between text-sm pt-2 mt-2 border-t border-slate-200 dark:border-slate-700"><span class="font-semibold">Skor Keseluruhan</span><span class="font-bold text-primary font-tabular">${overall} / 5</span></div>`;
  }

  function renderFinalStep() {
    panelEl.innerHTML = `
      <h3 class="font-semibold text-lg mb-1">Refleksi & Tindak Lanjut</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Langkah terakhir sebelum penilaian ini tersimpan.</p>
      <div class="mb-5">
        <label class="field-label">Catatan Refleksi</label>
        <textarea id="fieldReflection" rows="3" class="field-input" placeholder="Bagaimana proses pembelajaran hari ini berjalan?">${state.reflection}</textarea>
        <p class="field-error-text" id="reflectionError">Catatan refleksi wajib diisi.</p>
      </div>
      <div class="mb-6">
        <label class="field-label">Rencana Tindak Lanjut</label>
        <textarea id="fieldFollowUp" rows="3" class="field-input" placeholder="Apa yang akan kamu perbaiki atau lanjutkan?">${state.followUp}</textarea>
        <p class="field-error-text" id="followUpError">Rencana tindak lanjut wajib diisi.</p>
      </div>
      <div class="surface-card !shadow-none border border-slate-100 dark:border-slate-800 p-4">
        <p class="divider-label mb-3">Ringkasan Sementara</p>
        <div id="summaryList" class="space-y-2"></div>
      </div>`;
    const reflEl = document.getElementById('fieldReflection');
    const fuEl = document.getElementById('fieldFollowUp');
    reflEl.addEventListener('input', () => { state.reflection = reflEl.value; clearFieldError(reflEl, document.getElementById('reflectionError')); });
    fuEl.addEventListener('input', () => { state.followUp = fuEl.value; clearFieldError(fuEl, document.getElementById('followUpError')); });
    renderSummaryList();
  }

  function renderStep() {
    const step = steps[currentStep];
    if (step.type === 'info') renderInfoStep();
    else if (step.type === 'category') renderCategoryStep(step.data);
    else renderFinalStep();
    renderStepper();
    panelEl.classList.remove('page-enter');
    void panelEl.offsetWidth;
    panelEl.classList.add('page-enter');
  }

  function validateCurrentStep() {
    const step = steps[currentStep];
    if (step.type === 'info') {
      let ok = true;
      const cls = document.getElementById('fieldClass');
      const mat = document.getElementById('fieldMaterial');
      if (!cls.value.trim()) { cls.classList.add('field-error'); document.getElementById('fieldClassError').classList.add('show'); ok = false; }
      if (!mat.value.trim()) { mat.classList.add('field-error'); document.getElementById('fieldMaterialError').classList.add('show'); ok = false; }
      if (!ok) App.showToast('Lengkapi kelas dan materi terlebih dahulu.', 'error');
      return ok;
    }
    if (step.type === 'category') {
      const unanswered = step.data.items.filter((q) => state.answers[q.id].score === null);
      if (unanswered.length) {
        App.showToast(`Masih ada ${unanswered.length} indikator yang belum dinilai.`, 'error');
        return false;
      }
      return true;
    }
    if (step.type === 'final') {
      let ok = true;
      const refl = document.getElementById('fieldReflection');
      const fu = document.getElementById('fieldFollowUp');
      if (!refl.value.trim()) { refl.classList.add('field-error'); document.getElementById('reflectionError').classList.add('show'); ok = false; }
      if (!fu.value.trim()) { fu.classList.add('field-error'); document.getElementById('followUpError').classList.add('show'); ok = false; }
      if (!ok) App.showToast('Lengkapi refleksi dan tindak lanjut terlebih dahulu.', 'error');
      return ok;
    }
    return true;
  }

  async function submitAssessment() {
    const answersArr = ST.flattenBank().map((q) => ({
      id: q.id, category: q.category, categoryLabel: q.categoryLabel, question: q.text,
      score: state.answers[q.id].score,
      evidenceType: state.answers[q.id].evidenceType,
      evidenceValue: state.answers[q.id].evidenceValue || '',
    }));
    const overallScore = +(answersArr.reduce((a, b) => a + b.score, 0) / answersArr.length).toFixed(2);
    const categoryScores = ST.computeCategoryScores(answersArr);
    const tier = ST.getScoreTier(overallScore);

    const ok = await App.confirmDialog({
      title: 'Simpan penilaian ini?',
      message: `Skor rata-rata kamu <strong>${overallScore.toFixed(2)} / 5</strong> (${tier.label}). Data akan disimpan secara lokal di perangkat ini dan bisa dilihat kembali di halaman Riwayat.`,
      confirmText: 'Ya, Simpan',
      icon: 'save',
    });
    if (!ok) return;

    const record = {
      id: ST.generateId('AST'),
      accountId: session.accountId,
      date: state.date,
      className: state.className.trim(),
      material: state.material.trim(),
      answers: answersArr,
      overallScore, categoryScores, tier,
      reflection: state.reflection.trim(),
      followUp: state.followUp.trim(),
      createdAt: new Date().toISOString(),
    };
    ST.addAssessment(record);
    App.playSound('success');
    App.celebrate();
    App.showToast('Penilaian berhasil disimpan.', 'success', 'Tersimpan');
    nextBtn.disabled = true;
    setTimeout(() => { window.location.href = `detail.html?id=${record.id}`; }, 900);
  }

  backBtn.addEventListener('click', () => {
    if (currentStep === 0) return;
    currentStep--;
    renderStep();
    mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', async () => {
    if (!validateCurrentStep()) return;
    if (currentStep === steps.length - 1) { await submitAssessment(); return; }
    currentStep++;
    renderStep();
    mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('cancelWizardBtn').addEventListener('click', async () => {
    const ok = await App.confirmDialog({
      title: 'Batalkan penilaian ini?',
      message: 'Data yang sudah kamu isi pada sesi ini tidak akan disimpan.',
      confirmText: 'Ya, Batalkan',
      cancelText: 'Lanjutkan Mengisi',
      danger: true,
      icon: 'warning',
    });
    if (ok) window.location.href = 'dashboard.html';
  });

  renderStep();
})();
