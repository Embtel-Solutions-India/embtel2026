(function commentsPage() {
  const tableBody = document.getElementById('commentsTableBody');
  const filterForm = document.getElementById('commentFilterForm');

  function statusBadge(status) {
    const map = {
      approved: 'bg-brand-tealDim text-brand-teal',
      pending: 'bg-amber-500/10 text-amber-400',
      rejected: 'bg-white/10 text-m2',
      spam: 'bg-red-500/10 text-red-400',
    };
    return `<span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || map.pending}">${status}</span>`;
  }

  function render(comments) {
    if (!comments.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-m2 py-10">No comments found.</td></tr>';
      return;
    }
    tableBody.innerHTML = comments
      .map(
        (c) => `
      <tr class="hover:bg-white/[0.03] transition" data-id="${c._id}">
        <td class="px-4 py-3.5"><div class="font-medium text-white">${escapeHtml(c.name)}</div><div class="text-xs text-m2">${escapeHtml(c.email)}</div></td>
        <td class="px-4 py-3.5 text-m2 max-w-xs truncate">${escapeHtml(c.content)}</td>
        <td class="px-4 py-3.5">${c.blog ? `<a href="${publicBlogUrl(c.blog.slug)}" target="_blank" class="text-brand-teal hover:text-white transition">${escapeHtml(c.blog.title)}</a>` : '—'}</td>
        <td class="px-4 py-3.5">${statusBadge(c.status)}</td>
        <td class="px-4 py-3.5">
          <div class="flex justify-end gap-1">
            <button data-action="approve" title="Approve" class="w-8 h-8 rounded-r8 flex items-center justify-center text-brand-teal hover:bg-brand-tealDim transition"><i class="fa-solid fa-check text-xs"></i></button>
            <button data-action="reject" title="Reject" class="w-8 h-8 rounded-r8 flex items-center justify-center text-m2 hover:text-white hover:bg-white/10 transition"><i class="fa-solid fa-xmark text-xs"></i></button>
            <button data-action="spam" title="Mark as spam" class="w-8 h-8 rounded-r8 flex items-center justify-center text-amber-400 hover:bg-amber-500/10 transition"><i class="fa-solid fa-shield-halved text-xs"></i></button>
            <button data-action="delete" title="Delete" class="w-8 h-8 rounded-r8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  async function load() {
    tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-4"><div class="skeleton h-4 w-full rounded animate-shimmer"></div></td></tr>';
    const params = new URLSearchParams(new FormData(filterForm));
    for (const key of [...params.keys()]) {
      if (!params.get(key)) params.delete(key);
    }
    try {
      const res = await apiFetch(`/api/comments?${params.toString()}`);
      render(res.data.comments);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-400 py-10">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    load();
  });

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === 'delete') {
        const ok = await confirmAction({ title: 'Delete comment?' });
        if (!ok) return;
        await apiFetch(`/api/comment/${id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/comment/${id}/${action}`, { method: 'PATCH' });
      }
      showToast('Comment updated.');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
