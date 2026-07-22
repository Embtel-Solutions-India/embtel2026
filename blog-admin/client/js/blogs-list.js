(function blogsListPage() {
  const tableBody = document.getElementById('blogsTableBody');
  const filterForm = document.getElementById('filterForm');
  const categoryFilter = document.getElementById('categoryFilter');
  const limitSelect = document.getElementById('limitSelect');
  const paginationControls = document.getElementById('paginationControls');
  const selectAll = document.getElementById('selectAll');
  const bulkBar = document.getElementById('bulkBar');
  const bulkCount = document.getElementById('bulkCount');

  let state = { page: 1, limit: 10 };

  function statusBadge(status) {
    const map = {
      published: 'bg-brand-tealDim text-brand-teal',
      draft: 'bg-white/10 text-m2',
      scheduled: 'bg-brand-blueDim text-brand-blue',
    };
    return `<span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || map.draft}">${status}</span>`;
  }

  function iconBtn(icon, action, extraClass = 'text-m2 hover:text-white hover:bg-white/10') {
    return `<button class="w-8 h-8 rounded-r8 flex items-center justify-center transition ${extraClass}" data-action="${action}"><i class="fa-solid ${icon} text-xs"></i></button>`;
  }

  function renderRows(blogs) {
    if (!blogs.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-m2 py-10">No blogs found.</td></tr>';
      return;
    }
    tableBody.innerHTML = blogs
      .map(
        (b) => `
      <tr class="hover:bg-white/[0.03] transition" data-id="${b._id}">
        <td class="px-4 py-3.5"><input type="checkbox" class="row-check rounded border-white/20 bg-s2 text-brand-teal" value="${b._id}" /></td>
        <td class="px-4 py-3.5 max-w-xs">
          <a href="/admin/blogs/${b._id}/edit" class="font-medium text-white hover:text-brand-teal transition truncate block">${escapeHtml(b.title)}</a>
          <div class="flex items-center gap-1.5 mt-0.5">
            ${b.pinned ? '<i class="fa-solid fa-thumbtack text-amber-400 text-[10px]" title="Pinned"></i>' : ''}
            ${b.featured ? '<span class="text-[10px] font-bold uppercase text-brand-blue">Featured</span>' : ''}
          </div>
        </td>
        <td class="px-4 py-3.5 text-m2">${b.category ? escapeHtml(b.category.name) : '—'}</td>
        <td class="px-4 py-3.5 text-m2">${b.author ? escapeHtml(b.author.name) : '—'}</td>
        <td class="px-4 py-3.5">${statusBadge(b.status)}</td>
        <td class="px-4 py-3.5 text-m2 whitespace-nowrap">${formatDate(b.createdAt)}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center justify-end gap-1">
            <a class="w-8 h-8 rounded-r8 flex items-center justify-center text-m2 hover:text-white hover:bg-white/10 transition" href="/admin/blogs/${b._id}/edit" title="Edit"><i class="fa-solid fa-pen text-xs"></i></a>
            <a class="w-8 h-8 rounded-r8 flex items-center justify-center text-m2 hover:text-white hover:bg-white/10 transition" href="${publicBlogUrl(b.slug)}" target="_blank" title="Preview"><i class="fa-solid fa-eye text-xs"></i></a>
            ${iconBtn('fa-copy', 'duplicate')}
            ${iconBtn('fa-thumbtack', 'pin')}
            ${iconBtn('fa-trash', 'delete', 'text-red-400 hover:text-red-300 hover:bg-red-500/10')}
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  function renderPagination(pagination) {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) {
      paginationControls.innerHTML = '';
      return;
    }
    let html = '';
    for (let i = 1; i <= totalPages; i += 1) {
      const active = i === page;
      html += `<button class="w-7 h-7 rounded-r8 text-xs font-semibold transition ${active ? 'bg-brand-teal text-ink' : 'text-m2 hover:bg-white/10 hover:text-white'}" data-page="${i}">${i}</button>`;
    }
    paginationControls.innerHTML = html;
  }

  async function loadCategories() {
    try {
      const res = await apiFetch('/api/categories');
      categoryFilter.innerHTML =
        '<option value="">All</option>' + res.data.categories.map((c) => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('');
    } catch (err) {
      // non-fatal — filter just stays empty
    }
  }

  async function loadBlogs() {
    tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-4"><div class="skeleton h-4 w-full rounded animate-shimmer"></div></td></tr>';
    const formData = new FormData(filterForm);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (value) params.set(key, value);
    }
    params.set('page', state.page);
    params.set('limit', state.limit);

    try {
      const res = await apiFetch(`/api/blogs?${params.toString()}`);
      renderRows(res.items);
      renderPagination(res.pagination);
      selectAll.checked = false;
      updateBulkBar();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-400 py-10">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function updateBulkBar() {
    const checked = tableBody.querySelectorAll('.row-check:checked');
    bulkCount.textContent = checked.length;
    bulkBar.classList.toggle('hidden', checked.length === 0);
  }

  filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.page = 1;
    loadBlogs();
  });

  limitSelect.addEventListener('change', () => {
    state.limit = Number(limitSelect.value);
    state.page = 1;
    loadBlogs();
  });

  paginationControls.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (!btn) return;
    state.page = Number(btn.dataset.page);
    loadBlogs();
  });

  selectAll.addEventListener('change', () => {
    tableBody.querySelectorAll('.row-check').forEach((cb) => {
      cb.checked = selectAll.checked;
    });
    updateBulkBar();
  });

  tableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('row-check')) updateBulkBar();
  });

  bulkBar.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-bulk]');
    if (!btn) return;
    const action = btn.dataset.bulk;
    const ids = [...tableBody.querySelectorAll('.row-check:checked')].map((cb) => cb.value);
    if (!ids.length) return;

    if (action === 'trash') {
      const ok = await confirmAction({ title: `Move ${ids.length} blog(s) to trash?`, confirmText: 'Move to Trash' });
      if (!ok) return;
    }

    try {
      const res = await apiFetch('/api/blogs/bulk', { method: 'POST', body: { ids, action } });
      showToast(res.message || 'Updated.');
      loadBlogs();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr');
    const id = row.dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === 'duplicate') {
        await apiFetch(`/api/blog/${id}/duplicate`, { method: 'POST' });
        showToast('Blog duplicated as a draft.');
        loadBlogs();
      } else if (action === 'pin') {
        await apiFetch(`/api/blog/${id}/pin`, { method: 'PATCH' });
        loadBlogs();
      } else if (action === 'delete') {
        const ok = await confirmAction({ title: 'Move to trash?', body: 'The blog can be restored later from Trash.', confirmText: 'Move to Trash' });
        if (!ok) return;
        await apiFetch(`/api/blog/${id}`, { method: 'DELETE' });
        showToast('Blog moved to trash.');
        loadBlogs();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  loadCategories();
  loadBlogs();
})();
