(function trashPage() {
  const tableBody = document.getElementById('trashTableBody');

  function render(blogs) {
    if (!blogs.length) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-m2 py-10">Trash is empty.</td></tr>';
      return;
    }
    tableBody.innerHTML = blogs
      .map(
        (b) => `
      <tr class="hover:bg-white/[0.03] transition" data-id="${b._id}">
        <td class="px-4 py-3.5 text-white font-medium">${escapeHtml(b.title)}</td>
        <td class="px-4 py-3.5 text-m2">${b.author ? escapeHtml(b.author.name) : '—'}</td>
        <td class="px-4 py-3.5 text-m2">${formatDate(b.deletedAt)}</td>
        <td class="px-4 py-3.5">
          <div class="flex justify-end gap-2">
            <button data-action="restore" class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-r8 bg-brand-tealDim text-brand-teal hover:brightness-110 transition"><i class="fa-solid fa-rotate-left"></i>Restore</button>
            <button data-action="delete-permanent" class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-r8 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"><i class="fa-solid fa-trash-can"></i>Delete Forever</button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  async function load() {
    tableBody.innerHTML = '<tr><td colspan="4" class="px-4 py-4"><div class="skeleton h-4 w-full rounded animate-shimmer"></div></td></tr>';
    try {
      const res = await apiFetch('/api/blogs/trash');
      render(res.data.blogs);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-red-400 py-10">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;

    try {
      if (btn.dataset.action === 'restore') {
        await apiFetch(`/api/blog/${id}/restore`, { method: 'PATCH' });
        showToast('Blog restored.');
        load();
      } else if (btn.dataset.action === 'delete-permanent') {
        const ok = await confirmAction({ title: 'Delete permanently?', body: 'This cannot be undone.', confirmText: 'Delete Forever' });
        if (!ok) return;
        await apiFetch(`/api/blog/${id}/permanent`, { method: 'DELETE' });
        showToast('Blog permanently deleted.');
        load();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
