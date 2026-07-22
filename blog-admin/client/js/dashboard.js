(async function loadDashboard() {
  const statusBadge = (status) => {
    const map = { published: 'bg-brand-tealDim text-brand-teal', scheduled: 'bg-brand-blueDim text-brand-blue', draft: 'bg-white/10 text-m2' };
    return `<span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || map.draft}">${status}</span>`;
  };

  try {
    const res = await apiFetch('/api/dashboard/stats');
    const stats = res.data;

    document.querySelectorAll('.stat-card').forEach((card) => {
      const key = card.dataset.stat;
      if (!(key in stats)) return;
      card.classList.remove('skeleton');
      card.querySelector('.stat-value').textContent = stats[key];
    });

    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed) {
      activityFeed.innerHTML = stats.recentPosts.length
        ? stats.recentPosts
            .map(
              (p) => `
        <li class="px-5 py-3.5 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <a href="/admin/blogs/${p._id}/edit" class="font-medium text-white text-sm hover:text-brand-teal transition truncate block">${escapeHtml(p.title)}</a>
            <div class="text-xs text-m2 truncate">${p.category ? escapeHtml(p.category.name) : ''}${p.author ? ' · ' + escapeHtml(p.author.name) : ''}</div>
          </div>
          ${statusBadge(p.status)}
        </li>`
            )
            .join('')
        : '<li class="px-5 py-6 text-center text-m2 text-sm">No posts yet.</li>';
    }

    const commentsList = document.getElementById('latestCommentsList');
    if (commentsList) {
      const cMap = { approved: 'bg-brand-tealDim text-brand-teal', pending: 'bg-amber-500/10 text-amber-400', rejected: 'bg-white/10 text-m2', spam: 'bg-red-500/10 text-red-400' };
      commentsList.innerHTML = stats.latestComments.length
        ? stats.latestComments
            .map(
              (c) => `
        <li class="px-5 py-3.5">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-white text-sm">${escapeHtml(c.name)}</span>
            <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cMap[c.status] || cMap.pending}">${c.status}</span>
          </div>
          <div class="text-xs text-m2 truncate mt-0.5">${escapeHtml(c.content)}</div>
          ${c.blog ? `<a href="${publicBlogUrl(c.blog.slug)}" target="_blank" class="text-[11px] text-brand-teal hover:text-white transition">on ${escapeHtml(c.blog.title)}</a>` : ''}
        </li>`
            )
            .join('')
        : '<li class="px-5 py-6 text-center text-m2 text-sm">No comments yet.</li>';
    }

    const canvas = document.getElementById('visitorsChart');
    if (canvas && window.Chart) {
      const labels = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
      // Placeholder series — swap for real analytics data once wired up.
      const placeholderData = [120, 190, 170, 220, 260, 210, 250];
      Chart.defaults.color = '#9898A6';
      Chart.defaults.font.family = 'Inter, sans-serif';
      // eslint-disable-next-line no-new
      new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Visitors (placeholder)',
              data: placeholderData,
              borderColor: '#00C896',
              backgroundColor: 'rgba(0,200,150,0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              borderWidth: 2,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }
  } catch (err) {
    showToast(err.message || 'Failed to load dashboard', 'danger');
  }
})();
