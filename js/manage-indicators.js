/* =========================================================
   SenseiTrack — manage-indicators.js
   ========================================================= */

(function () {
  App.initShell();

  const listEl = document.getElementById('categoryList');
  let editingQuestionId = null;
  let editingCategoryKey = null;
  let addingQuestionForCat = null;

  function questionRowHTML(cat, q, idx) {
    if (q.id === editingQuestionId) {
      return `
        <div class="flex items-center gap-2 py-1">
          <input type="text" class="field-input text-sm flex-1 edit-question-input" data-qid="${q.id}" value="${q.text.replace(/"/g, '&quot;')}" />
          <button class="save-question-btn text-secondary-dark flex-shrink-0" data-qid="${q.id}"><span class="material-symbols-rounded">check</span></button>
          <button class="cancel-edit-question-btn text-slate-400 flex-shrink-0"><span class="material-symbols-rounded">close</span></button>
        </div>`;
    }
    return `
      <div class="flex items-start gap-2 group py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <span class="text-xs text-slate-400 mt-1 flex-shrink-0 w-4">${idx + 1}.</span>
        <p class="text-sm flex-1">${q.text}</p>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button class="edit-question-btn text-slate-400 hover:text-primary" data-qid="${q.id}"><span class="material-symbols-rounded" style="font-size:17px">edit</span></button>
          <button class="delete-question-btn text-slate-400 hover:text-red-500" data-qid="${q.id}" data-text="${q.text.replace(/"/g, '&quot;')}"><span class="material-symbols-rounded" style="font-size:17px">delete</span></button>
        </div>
      </div>`;
  }

  function categoryHeaderHTML(cat) {
    if (editingCategoryKey === cat.category) {
      return `
        <div class="flex items-center gap-3 mb-4">
          <input type="text" class="field-input text-sm flex-1 edit-category-input" value="${cat.label.replace(/"/g, '&quot;')}" />
          <button class="save-category-btn text-secondary-dark flex-shrink-0" data-cat="${cat.category}"><span class="material-symbols-rounded">check</span></button>
          <button class="cancel-edit-category-btn text-slate-400 flex-shrink-0"><span class="material-symbols-rounded">close</span></button>
        </div>`;
    }
    return `
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-rounded">${cat.icon || 'category'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold">${cat.label}</p>
          <p class="text-xs text-slate-400">${cat.items.length} indikator</p>
        </div>
        <button class="edit-category-btn text-slate-400 hover:text-primary flex-shrink-0" data-cat="${cat.category}"><span class="material-symbols-rounded" style="font-size:19px">edit</span></button>
        <button class="delete-category-btn text-slate-400 hover:text-red-500 flex-shrink-0" data-cat="${cat.category}" data-label="${cat.label.replace(/"/g, '&quot;')}" data-count="${cat.items.length}"><span class="material-symbols-rounded" style="font-size:19px">delete</span></button>
      </div>`;
  }

  function addQuestionRowHTML(cat) {
    if (addingQuestionForCat === cat.category) {
      return `
        <div class="flex items-center gap-2 py-1 mt-1">
          <input type="text" class="field-input text-sm flex-1 new-question-input" placeholder="Tulis pernyataan indikator..." />
          <button class="save-new-question-btn text-secondary-dark flex-shrink-0" data-cat="${cat.category}"><span class="material-symbols-rounded">check</span></button>
          <button class="cancel-new-question-btn text-slate-400 flex-shrink-0"><span class="material-symbols-rounded">close</span></button>
        </div>`;
    }
    return `<button class="btn btn-ghost text-xs mt-1 add-question-btn" data-cat="${cat.category}"><span class="material-symbols-rounded" style="font-size:16px">add</span>Tambah Butir Soal</button>`;
  }

  function render() {
    const bank = ST.getIndicatorBank();
    listEl.innerHTML = bank.map((cat) => `
      <div class="surface-card p-5">
        ${categoryHeaderHTML(cat)}
        <div class="space-y-1 mb-1">${cat.items.map((q, idx) => questionRowHTML(cat.category, q, idx)).join('') || '<p class="text-xs text-slate-400 italic px-2">Belum ada butir soal di kategori ini.</p>'}</div>
        ${addQuestionRowHTML(cat)}
      </div>`).join('');
    wireEvents();
  }

  function wireEvents() {
    listEl.querySelectorAll('.edit-question-btn').forEach((btn) => btn.addEventListener('click', () => {
      editingQuestionId = btn.dataset.qid; render();
    }));
    listEl.querySelectorAll('.cancel-edit-question-btn').forEach((btn) => btn.addEventListener('click', () => {
      editingQuestionId = null; render();
    }));
    listEl.querySelectorAll('.save-question-btn').forEach((btn) => btn.addEventListener('click', () => {
      const input = listEl.querySelector(`.edit-question-input[data-qid="${btn.dataset.qid}"]`);
      if (!input.value.trim()) { App.showToast('Teks butir soal tidak boleh kosong.', 'error'); return; }
      ST.updateQuestion(btn.dataset.qid, input.value.trim());
      editingQuestionId = null;
      App.playSound('success');
      App.showToast('Butir soal diperbarui.', 'success');
      render();
    }));
    listEl.querySelectorAll('.delete-question-btn').forEach((btn) => btn.addEventListener('click', async () => {
      const ok = await App.confirmDialog({
        title: 'Hapus butir soal ini?',
        message: `"${btn.dataset.text}" akan dihapus dari bank soal. Riwayat penilaian yang sudah ada tidak berubah.`,
        confirmText: 'Ya, Hapus', danger: true, icon: 'delete',
      });
      if (!ok) return;
      ST.deleteQuestion(btn.dataset.qid);
      App.showToast('Butir soal dihapus.', 'success');
      render();
    }));

    listEl.querySelectorAll('.edit-category-btn').forEach((btn) => btn.addEventListener('click', () => {
      editingCategoryKey = btn.dataset.cat; render();
    }));
    listEl.querySelectorAll('.cancel-edit-category-btn').forEach((btn) => btn.addEventListener('click', () => {
      editingCategoryKey = null; render();
    }));
    listEl.querySelectorAll('.save-category-btn').forEach((btn) => btn.addEventListener('click', () => {
      const input = listEl.querySelector('.edit-category-input');
      if (!input.value.trim()) { App.showToast('Nama kategori tidak boleh kosong.', 'error'); return; }
      ST.updateCategory(btn.dataset.cat, { label: input.value.trim() });
      editingCategoryKey = null;
      App.playSound('success');
      App.showToast('Kategori diperbarui.', 'success');
      render();
    }));
    listEl.querySelectorAll('.delete-category-btn').forEach((btn) => btn.addEventListener('click', async () => {
      const ok = await App.confirmDialog({
        title: `Hapus kategori "${btn.dataset.label}"?`,
        message: `Kategori ini beserta ${btn.dataset.count} butir soal di dalamnya akan dihapus dari bank soal aktif. Riwayat penilaian yang sudah ada tidak terpengaruh.`,
        confirmText: 'Ya, Hapus Kategori', danger: true, icon: 'delete',
      });
      if (!ok) return;
      ST.deleteCategory(btn.dataset.cat);
      App.showToast('Kategori dihapus.', 'success');
      render();
    }));

    listEl.querySelectorAll('.add-question-btn').forEach((btn) => btn.addEventListener('click', () => {
      addingQuestionForCat = btn.dataset.cat; render();
      const input = listEl.querySelector('.new-question-input');
      input?.focus();
    }));
    listEl.querySelectorAll('.cancel-new-question-btn').forEach((btn) => btn.addEventListener('click', () => {
      addingQuestionForCat = null; render();
    }));
    listEl.querySelectorAll('.save-new-question-btn').forEach((btn) => btn.addEventListener('click', () => {
      const input = listEl.querySelector('.new-question-input');
      if (!input.value.trim()) { App.showToast('Teks butir soal tidak boleh kosong.', 'error'); return; }
      ST.addQuestion(btn.dataset.cat, input.value.trim());
      addingQuestionForCat = null;
      App.playSound('success');
      App.showToast('Butir soal ditambahkan.', 'success');
      render();
    }));
  }

  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const labelInput = document.getElementById('newCategoryLabel');
    const iconInput = document.getElementById('newCategoryIcon');
    if (!labelInput.value.trim()) { App.showToast('Nama kategori wajib diisi.', 'error'); return; }
    ST.addCategory({ label: labelInput.value.trim(), icon: iconInput.value.trim() || 'category' });
    labelInput.value = ''; iconInput.value = '';
    App.playSound('success');
    App.showToast('Kategori baru ditambahkan.', 'success');
    render();
  });

  document.getElementById('resetDefaultBtn').addEventListener('click', async () => {
    const ok = await App.confirmDialog({
      title: 'Kembalikan bank soal ke default?',
      message: 'Semua kategori dan butir soal kustom akan diganti dengan 14 indikator bawaan SenseiTrack. Riwayat penilaian yang sudah ada tidak akan berubah.',
      confirmText: 'Ya, Kembalikan', danger: true, icon: 'restart_alt',
    });
    if (!ok) return;
    ST.resetIndicatorBankToDefault();
    App.showToast('Bank soal dikembalikan ke default.', 'success');
    render();
  });

  render();
})();
