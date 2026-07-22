(function categoriesPage() {
  const tableBody = document.getElementById('categoriesTableBody');
  const form = document.getElementById('categoryForm');
  const newBtn = document.getElementById('newCategoryBtn');
  const modalTitle = document.getElementById('categoryModalTitle');

  function render(categories) {
    if (!categories.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-m2 py-10">No categories yet.</td></tr>';
      return;
    }
    tableBody.innerHTML = categories
      .map(
        (c) => `
      <tr class="hover:bg-white/[0.03] transition" data-id="${c._id}">
        <td class="px-4 py-3.5">${c.image ? `<img src="${c.image}" class="w-9 h-9 object-cover rounded-r8" />` : '<div class="w-9 h-9 rounded-r8 bg-s2 flex items-center justify-center text-m1"><i class="fa-solid fa-image"></i></div>'}</td>
        <td class="px-4 py-3.5 text-white font-medium">${escapeHtml(c.name)}</td>
        <td class="px-4 py-3.5 text-m2"><code class="text-xs">${escapeHtml(c.slug)}</code></td>
        <td class="px-4 py-3.5 text-m2">${c.blogCount}</td>
        <td class="px-4 py-3.5">
          <div class="flex justify-end gap-1">
            <button data-action="edit" data-payload='${JSON.stringify(c).replace(/'/g, '&apos;')}' class="w-8 h-8 rounded-r8 flex items-center justify-center text-m2 hover:text-white hover:bg-white/10 transition"><i class="fa-solid fa-pen text-xs"></i></button>
            <button data-action="delete" class="w-8 h-8 rounded-r8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  async function load() {
    tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-4"><div class="skeleton h-4 w-full rounded animate-shimmer"></div></td></tr>';
    try {
      const res = await apiFetch('/api/categories');
      render(res.data.categories);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-400 py-10">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  newBtn.addEventListener('click', () => {
    form.reset();
    form.categoryId.value = '';
    modalTitle.textContent = 'New Category';
    openModal('categoryModal');
  });

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;

    if (btn.dataset.action === 'edit') {
      const cat = JSON.parse(btn.dataset.payload.replace(/&apos;/g, "'"));
      form.reset();
      form.categoryId.value = cat._id;
      form.name.value = cat.name;
      form.slug.value = cat.slug;
      form.description.value = cat.description || '';
      form.image.value = cat.image || '';
      form.metaTitle.value = cat.seo?.metaTitle || '';
      form.metaDescription.value = cat.seo?.metaDescription || '';
      modalTitle.textContent = 'Edit Category';
      openModal('categoryModal');
    } else if (btn.dataset.action === 'delete') {
      const ok = await confirmAction({ title: 'Delete category?', body: 'Categories in use by a blog cannot be deleted.' });
      if (!ok) return;
      try {
        await apiFetch(`/api/category/${id}`, { method: 'DELETE' });
        showToast('Category deleted.');
        load();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = payload.categoryId;
    delete payload.categoryId;

    try {
      if (id) {
        await apiFetch(`/api/category/${id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/category', { method: 'POST', body: payload });
      }
      showToast('Category saved.');
      closeModal('categoryModal');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
