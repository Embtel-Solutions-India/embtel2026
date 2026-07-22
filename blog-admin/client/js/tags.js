(function tagsPage() {
  const tableBody = document.getElementById('tagsTableBody');
  const form = document.getElementById('tagForm');
  const newBtn = document.getElementById('newTagBtn');
  const modalTitle = document.getElementById('tagModalTitle');

  function render(tags) {
    if (!tags.length) {
      tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-m2 py-10">No tags yet.</td></tr>';
      return;
    }
    tableBody.innerHTML = tags
      .map(
        (t) => `
      <tr class="hover:bg-white/[0.03] transition" data-id="${t._id}">
        <td class="px-4 py-3.5 text-white font-medium">${escapeHtml(t.name)}</td>
        <td class="px-4 py-3.5 text-m2"><code class="text-xs">${escapeHtml(t.slug)}</code></td>
        <td class="px-4 py-3.5">
          <div class="flex justify-end gap-1">
            <button data-action="edit" data-name="${escapeHtml(t.name)}" data-slug="${escapeHtml(t.slug)}" class="w-8 h-8 rounded-r8 flex items-center justify-center text-m2 hover:text-white hover:bg-white/10 transition"><i class="fa-solid fa-pen text-xs"></i></button>
            <button data-action="delete" class="w-8 h-8 rounded-r8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  async function load() {
    tableBody.innerHTML = '<tr><td colspan="3" class="px-4 py-4"><div class="skeleton h-4 w-full rounded animate-shimmer"></div></td></tr>';
    try {
      const res = await apiFetch('/api/tags');
      render(res.data.tags);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-red-400 py-10">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  newBtn.addEventListener('click', () => {
    form.reset();
    form.tagId.value = '';
    modalTitle.textContent = 'New Tag';
    openModal('tagModal');
  });

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;

    if (btn.dataset.action === 'edit') {
      form.reset();
      form.tagId.value = id;
      form.name.value = btn.dataset.name;
      form.slug.value = btn.dataset.slug;
      modalTitle.textContent = 'Edit Tag';
      openModal('tagModal');
    } else if (btn.dataset.action === 'delete') {
      const ok = await confirmAction({ title: 'Delete tag?' });
      if (!ok) return;
      try {
        await apiFetch(`/api/tag/${id}`, { method: 'DELETE' });
        showToast('Tag deleted.');
        load();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = payload.tagId;
    delete payload.tagId;

    try {
      if (id) {
        await apiFetch(`/api/tag/${id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/tag', { method: 'POST', body: payload });
      }
      showToast('Tag saved.');
      closeModal('tagModal');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
