(function usersPage() {
  const tableBody = document.getElementById('usersTableBody');
  const form = document.getElementById('userForm');
  const newUserBtn = document.getElementById('newUserBtn');

  function render(users) {
    tableBody.innerHTML = users
      .map(
        (u) => `
      <tr class="hover:bg-white/[0.03] transition" data-id="${u._id}">
        <td class="px-4 py-3.5 text-white font-medium">${escapeHtml(u.name)}</td>
        <td class="px-4 py-3.5 text-m2">${escapeHtml(u.email)}</td>
        <td class="px-4 py-3.5"><span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-brand-blueDim text-brand-blue' : 'bg-white/10 text-m2'}">${u.role}</span></td>
        <td class="px-4 py-3.5"><span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${u.active ? 'bg-brand-tealDim text-brand-teal' : 'bg-white/10 text-m2'}">${u.active ? 'Active' : 'Inactive'}</span></td>
        <td class="px-4 py-3.5">
          <div class="flex justify-end gap-1">
            <button data-action="toggle-role" title="Toggle role" class="w-8 h-8 rounded-r8 flex items-center justify-center text-m2 hover:text-white hover:bg-white/10 transition"><i class="fa-solid fa-arrows-rotate text-xs"></i></button>
            <button data-action="toggle-active" title="Toggle active" class="w-8 h-8 rounded-r8 flex items-center justify-center transition ${u.active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-brand-teal hover:bg-brand-tealDim'}"><i class="fa-solid ${u.active ? 'fa-pause' : 'fa-play'} text-xs"></i></button>
            ${
              window.CURRENT_USER && window.CURRENT_USER.id === u._id
                ? ''
                : '<button data-action="delete" title="Delete" class="w-8 h-8 rounded-r8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"><i class="fa-solid fa-trash text-xs"></i></button>'
            }
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  async function load() {
    tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-4"><div class="skeleton h-4 w-full rounded animate-shimmer"></div></td></tr>';
    try {
      const res = await apiFetch('/api/users');
      render(res.data.users);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-400 py-10">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  newUserBtn.addEventListener('click', () => {
    form.reset();
    openModal('userModal');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      await apiFetch('/api/users', { method: 'POST', body: payload });
      showToast('User created.');
      form.reset();
      closeModal('userModal');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr');
    const id = row.dataset.id;

    try {
      if (btn.dataset.action === 'toggle-role') {
        const currentRole = row.querySelectorAll('span')[0].textContent.trim();
        await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: { role: currentRole === 'admin' ? 'editor' : 'admin' } });
      } else if (btn.dataset.action === 'toggle-active') {
        const isActive = row.querySelectorAll('span')[1].textContent.trim() === 'Active';
        await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: { active: !isActive } });
      } else if (btn.dataset.action === 'delete') {
        const name = row.querySelector('td').textContent.trim();
        const ok = await confirmAction({ title: 'Delete this user?', body: `${name}'s account will be permanently removed. This cannot be undone.`, confirmText: 'Delete' });
        if (!ok) return;
        await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
        showToast('User deleted.');
      }
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
