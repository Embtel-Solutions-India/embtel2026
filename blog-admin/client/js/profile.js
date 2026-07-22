(function profilePage() {
  const form = document.getElementById('passwordForm');
  const alertBox = document.getElementById('profileAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('hidden');
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await apiFetch('/api/users/me/password', { method: 'PATCH', body: payload });
      alertBox.className = 'mb-4 px-4 py-3 rounded-r8 text-sm bg-brand-tealDim border border-brand-teal/30 text-brand-teal';
      alertBox.textContent = res.message || 'Password updated. Please log in again.';
      form.reset();
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 1500);
    } catch (err) {
      alertBox.className = 'mb-4 px-4 py-3 rounded-r8 text-sm bg-red-500/10 border border-red-500/30 text-red-300';
      alertBox.textContent = err.message;
    }
  });
})();
