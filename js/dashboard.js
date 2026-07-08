/* =========================================================
   SenseiTrack — dashboard.js  (v2 — per-account + insight card)
   ========================================================= */

(function () {
  App.initShell();

  const session = ST.getSession();
  const account = ST.getAccountById(session.accountId);

  document.getElementById('greetingText').textContent = `${App.timeGreeting()}, ${(account.name || 'Guru').split(',')[0].split(' ')[0]} 👋`;
  document.getElementById('greetingDate').textContent = App.formatDate(new Date().toISOString().slice(0, 10));

  const assessments = ST.getAssessments(account.id); // sorted desc by date already

  const emptyState = document.getElementById('emptyState');
  const content = document.getElementById('dashboardContent');

  if (!assessments.length) {
    emptyState.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  content.classList.remove('hidden');

  /* ---- Insight card ---- */
  const insight = ST.generateInsight(account.id);
  document.getElementById('insightIcon').textContent = insight.icon;
  document.getElementById('insightText').textContent = insight.text;

  /* ---- Stat numbers ---- */
  const overall = +(assessments.reduce((a, b) => a + b.overallScore, 0) / assessments.length).toFixed(2);
  document.getElementById('statOverallScore').textContent = overall.toFixed(1);
  document.getElementById('statTotal').textContent = assessments.length;

  const now = new Date();
  const thisMonthCount = assessments.filter((a) => {
    const d = new Date(a.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('statThisMonth').textContent = thisMonthCount;

  const categoryLabelMap = {};
  ST.getIndicatorBank().forEach((c) => { categoryLabelMap[c.category] = c.label; });
  const catTotals = {};
  const catCounts = {};
  assessments.forEach((a) => {
    Object.entries(a.categoryScores || {}).forEach(([cat, score]) => {
      catTotals[cat] = (catTotals[cat] || 0) + score;
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
  });
  const catAverages = Object.keys(catTotals).map((cat) => ({ cat, avg: catTotals[cat] / catCounts[cat] }));
  catAverages.sort((a, b) => b.avg - a.avg);
  document.getElementById('statBestCategory').textContent = catAverages[0] ? (categoryLabelMap[catAverages[0].cat] || catAverages[0].cat) : '-';

  /* ---- Ring gauge ---- */
  const ring = document.getElementById('scoreRing');
  const r = +ring.getAttribute('r');
  const circumference = 2 * Math.PI * r;
  ring.setAttribute('stroke-dasharray', circumference.toFixed(2));
  const pct = Math.max(0, Math.min(1, overall / 5));
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = (circumference * (1 - pct)).toFixed(2);
  });

  /* ---- Recent activity ---- */
  const listEl = document.getElementById('recentActivityList');
  const recent = assessments.slice(0, 5);
  listEl.innerHTML = recent.map((a) => {
    const tier = a.tier || ST.getScoreTier(a.overallScore);
    return `
      <a href="detail.html?id=${a.id}" class="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-rounded" style="font-size:20px">description</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold truncate">${a.material}</p>
          <p class="text-xs text-slate-400">${a.className} • ${App.formatDate(a.date)}</p>
        </div>
        <span class="badge badge-${tier.tone} flex-shrink-0"><span class="badge-dot"></span>${tier.label}</span>
      </a>`;
  }).join('');

  /* ---- Trend chart (last 5, chronological) ---- */
  try {
    const trendData = [...recent].reverse();
    new Chart(document.getElementById('trendChart'), {
      type: 'line',
      data: {
        labels: trendData.map((a) => App.formatDateShort(a.date)),
        datasets: [{
          label: 'Skor Rata-rata',
          data: trendData.map((a) => a.overallScore),
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,0.12)',
          pointBackgroundColor: '#2563EB',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Skor: ${ctx.parsed.y.toFixed(2)}` } } },
        scales: {
          y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(148,163,184,0.15)' } },
          x: { grid: { display: false } },
        },
      },
    });
  } catch (e) {
    console.error('Trend chart failed to render:', e);
    document.getElementById('trendChart').closest('.surface-card').querySelector('.h-64').innerHTML =
      '<p class="text-sm text-slate-400 text-center py-20">Grafik tidak dapat dimuat.</p>';
  }

  /* ---- Category doughnut (colors assigned dynamically so admin-added
     categories always render correctly, not just the original 4) ---- */
  try {
    const palette = ['#2563EB', '#14B8A6', '#F59E0B', '#8B5CF6', '#EC4899', '#22C55E', '#0EA5E9', '#F43F5E'];
    const presentCats = Object.keys(catTotals);
    new Chart(document.getElementById('categoryChart'), {
      type: 'doughnut',
      data: {
        labels: presentCats.map((c) => (categoryLabelMap[c] || c).replace('Kompetensi ', '')),
        datasets: [{
          data: presentCats.map((c) => +(catTotals[c] / catCounts[c]).toFixed(2)),
          backgroundColor: presentCats.map((c, i) => palette[i % palette.length]),
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 12, font: { size: 11, family: 'Poppins' } } } },
      },
    });
  } catch (e) {
    console.error('Category chart failed to render:', e);
    document.getElementById('categoryChart').closest('.surface-card').querySelector('.h-64').innerHTML =
      '<p class="text-sm text-slate-400 text-center py-20">Grafik tidak dapat dimuat.</p>';
  }
})();
