/* =========================================================
   SenseiTrack — history.js
   ========================================================= */

(function () {
  App.initShell();

  const session = ST.getSession();
  const viewAccountId = new URLSearchParams(window.location.search).get('accountId');
  const isAdminViewingOther = !!viewAccountId && session.role === 'admin' && viewAccountId !== session.accountId;
  const targetAccountId = isAdminViewingOther ? viewAccountId : session.accountId;
  const targetAccount = isAdminViewingOther ? ST.getAccountById(viewAccountId) : null;

  if (isAdminViewingOther && targetAccount) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', `
      <div class="surface-card !shadow-none border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <span class="material-symbols-rounded text-primary">visibility</span>
          <p class="text-sm">Menampilkan riwayat milik <strong>${targetAccount.name}</strong></p>
        </div>
        <a href="admin-dashboard.html" class="btn btn-ghost text-xs px-3 py-1.5"><span class="material-symbols-rounded" style="font-size:16px">arrow_back</span>Kembali ke Admin</a>
      </div>`);
  }

  const all = ST.getAssessments(targetAccountId);
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const tableBody = document.getElementById('tableBody');
  const tableWrapper = tableBody.closest('table').parentElement;
  const emptyState = document.getElementById('emptyState');
  const emptyStateImg = document.getElementById('emptyStateImg');
  const emptyStateTitle = document.getElementById('emptyStateTitle');
  const emptyStateDesc = document.getElementById('emptyStateDesc');
  const paginationBar = document.getElementById('paginationBar');
  const paginationInfo = document.getElementById('paginationInfo');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  const PAGE_SIZE = 5;
  let page = 1;

  function getFiltered() {
    const q = searchInput.value.trim().toLowerCase();
    const tier = filterSelect.value;
    return all.filter((a) => {
      const matchesQuery = !q || a.className.toLowerCase().includes(q) || a.material.toLowerCase().includes(q);
      const matchesTier = tier === 'all' || (a.tier && a.tier.tone === tier);
      return matchesQuery && matchesTier;
    });
  }

  function rowHTML(a) {
    const tier = a.tier || ST.getScoreTier(a.overallScore);
    return `
      <tr class="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <td class="px-5 py-3.5 font-tabular whitespace-nowrap">${App.formatDateShort(a.date)}</td>
        <td class="px-5 py-3.5">${a.className}</td>
        <td class="px-5 py-3.5 max-w-[220px] truncate" title="${a.material}">${a.material}</td>
        <td class="px-5 py-3.5 font-semibold font-tabular">${a.overallScore.toFixed(2)}</td>
        <td class="px-5 py-3.5"><span class="badge badge-${tier.tone}"><span class="badge-dot"></span>${tier.label}</span></td>
        <td class="px-5 py-3.5 text-right">
          <a href="detail.html?id=${a.id}" class="btn btn-ghost px-3 py-1.5 text-xs">Lihat<span class="material-symbols-rounded" style="font-size:15px">chevron_right</span></a>
        </td>
      </tr>`;
  }

  function render() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (!all.length) {
      tableWrapper.classList.add('hidden');
      paginationBar.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyStateImg.src = 'assets/illustrations/nohistory.svg';
      emptyStateTitle.textContent = 'Belum ada riwayat';
      emptyStateDesc.textContent = 'Mulai penilaian pertamamu untuk melihatnya di sini.';
      return;
    }
    if (!filtered.length) {
      tableWrapper.classList.add('hidden');
      paginationBar.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyStateImg.src = 'assets/illustrations/nohistory.svg';
      emptyStateTitle.textContent = 'Tidak ada hasil';
      emptyStateDesc.textContent = 'Coba ubah kata kunci pencarian atau filter status.';
      return;
    }

    emptyState.classList.add('hidden');
    tableWrapper.classList.remove('hidden');
    tableBody.innerHTML = pageItems.map(rowHTML).join('');

    paginationBar.classList.remove('hidden');
    paginationBar.classList.add('flex');
    paginationInfo.textContent = `Menampilkan ${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)} dari ${filtered.length}`;
    pageIndicator.textContent = `Halaman ${page} dari ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  searchInput.addEventListener('input', () => { page = 1; render(); });
  filterSelect.addEventListener('change', () => { page = 1; render(); });
  prevBtn.addEventListener('click', () => { if (page > 1) { page--; render(); } });
  nextBtn.addEventListener('click', () => { page++; render(); });

  render();
})();
