/* =========================================================
   SenseiTrack — admin-dashboard.js
   ========================================================= */

(function () {
  App.initShell();

  const session = ST.getSession();
  const me = ST.getAccountById(session.accountId);
  document.getElementById('greetingText').textContent = `${App.timeGreeting()}, ${(me.name || 'Admin').split(',')[0].split(' ')[0]} 👋`;
  if (me.school) document.getElementById('greetingSub').textContent = `Ringkasan aktivitas guru di ${me.school}.`;

  const accounts = ST.getAccounts();
  const allAssessments = ST.getAllAssessments();

  const emptyState = document.getElementById('emptyState');
  const content = document.getElementById('adminContent');

  if (!allAssessments.length) {
    emptyState.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  content.classList.remove('hidden');

  /* ---- Stat cards ---- */
  const overall = +(allAssessments.reduce((a, b) => a + b.overallScore, 0) / allAssessments.length).toFixed(2);
  document.getElementById('statSchoolScore').textContent = overall.toFixed(1);
  document.getElementById('statTeacherCount').textContent = accounts.length;
  document.getElementById('statTotalAssessments').textContent = allAssessments.length;

  const now = new Date();
  const monthCount = allAssessments.filter((a) => {
    const d = new Date(a.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('statMonthAssessments').textContent = monthCount;

  const ring = document.getElementById('schoolScoreRing');
  const r = +ring.getAttribute('r');
  const circumference = 2 * Math.PI * r;
  ring.setAttribute('stroke-dasharray', circumference.toFixed(2));
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = (circumference * (1 - Math.max(0, Math.min(1, overall / 5)))).toFixed(2);
  });

  /* ---- Teacher table (rendered before the chart so a Chart.js hiccup
     never blocks this more important content) ---- */
  const tbody = document.getElementById('teacherTableBody');
  tbody.innerHTML = accounts.map((acc) => {
    const own = ST.getAssessments(acc.id);
    const avg = own.length ? +(own.reduce((a, b) => a + b.overallScore, 0) / own.length).toFixed(2) : null;
    const lastDate = own.length ? App.formatDateShort(own[0].date) : '-';
    return `
      <tr class="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <td class="px-5 py-3.5">
          <p class="font-medium">${acc.name}${acc.id === me.id ? ' <span class=\'text-xs text-slate-400\'>(kamu)</span>' : ''}</p>
          <p class="text-xs text-slate-400">${acc.role === 'admin' ? 'Admin' : 'Guru'}</p>
        </td>
        <td class="px-5 py-3.5">${acc.subject || '-'}</td>
        <td class="px-5 py-3.5 font-tabular">${own.length}</td>
        <td class="px-5 py-3.5 font-semibold font-tabular">${avg !== null ? avg.toFixed(2) : '-'}</td>
        <td class="px-5 py-3.5 font-tabular whitespace-nowrap">${lastDate}</td>
        <td class="px-5 py-3.5 text-right">
          ${own.length
            ? `<a href="history.html?accountId=${acc.id}" class="btn btn-ghost px-3 py-1.5 text-xs">Lihat<span class="material-symbols-rounded" style="font-size:15px">chevron_right</span></a>`
            : `<span class="text-xs text-slate-300 dark:text-slate-600">Belum ada data</span>`}
        </td>
      </tr>`;
  }).join('');

  /* ---- Category bar chart (school-wide) ---- */
  try {
    const categoryLabelMap = {};
    ST.getIndicatorBank().forEach((c) => { categoryLabelMap[c.category] = c.label.replace('Kompetensi ', ''); });
    const catTotals = {}; const catCounts = {};
    allAssessments.forEach((a) => Object.entries(a.categoryScores || {}).forEach(([c, s]) => {
      catTotals[c] = (catTotals[c] || 0) + s; catCounts[c] = (catCounts[c] || 0) + 1;
    }));
    const cats = Object.keys(catTotals);
    new Chart(document.getElementById('schoolCategoryChart'), {
      type: 'bar',
      data: {
        labels: cats.map((c) => categoryLabelMap[c] || c),
        datasets: [{
          data: cats.map((c) => +(catTotals[c] / catCounts[c]).toFixed(2)),
          backgroundColor: ['#2563EB', '#14B8A6', '#F59E0B', '#8B5CF6', '#EC4899', '#22C55E'],
          borderRadius: 8,
          maxBarThickness: 48,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Rata-rata: ${ctx.parsed.y.toFixed(2)}` } } },
        scales: {
          y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(148,163,184,0.15)' } },
          x: { grid: { display: false } },
        },
      },
    });
  } catch (e) {
    console.error('Chart rendering failed (chart.js may not have loaded):', e);
    document.getElementById('schoolCategoryChart').closest('.surface-card').innerHTML =
      '<p class="text-sm text-slate-400 text-center py-10">Grafik tidak dapat dimuat. Periksa koneksi internet untuk memuat Chart.js.</p>';
  }
})();
