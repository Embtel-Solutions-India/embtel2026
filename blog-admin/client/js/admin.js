// Shared chrome behavior for every page rendered inside layouts/admin.ejs:
// sidebar toggle, dark/light theme, logout, toast notifications, notification
// bell, and a confirm-before-destructive-action modal. Pure Tailwind + vanilla
// JS — no Bootstrap. Individual pages layer their own <page>.js on top of the
// helpers exposed here (window.apiFetch, showToast, confirmAction, openModal/closeModal).

(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('light', saved === 'light');
})();

// --- Generic modal show/hide (Tailwind: toggle the `hidden` class) ---
window.openModal = function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
};
window.closeModal = function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
};

document.addEventListener('click', (e) => {
  const closeTrigger = e.target.closest('[data-modal-close]');
  if (closeTrigger) closeModal(closeTrigger.dataset.modalClose);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('[id$="Modal"]:not(.hidden)').forEach((m) => m.classList.add('hidden'));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // --- Sidebar toggle (mobile) ---
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const sidebarToggle = document.getElementById('sidebarToggle');
  function openSidebar() {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
  }
  function closeSidebar() {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  }
  sidebarToggle?.addEventListener('click', () => {
    sidebar?.classList.contains('-translate-x-full') ? openSidebar() : closeSidebar();
  });
  backdrop?.addEventListener('click', closeSidebar);

  // --- Highlight active nav link ---
  const path = window.location.pathname;
  let activePage = 'dashboard';
  if (path.startsWith('/admin/blogs/new')) activePage = 'blogs-new';
  else if (path.startsWith('/admin/blogs/trash')) activePage = 'trash';
  else if (path.startsWith('/admin/blogs')) activePage = 'blogs';
  else if (path.startsWith('/admin/categories')) activePage = 'categories';
  else if (path.startsWith('/admin/tags')) activePage = 'tags';
  else if (path.startsWith('/admin/comments')) activePage = 'comments';
  else if (path.startsWith('/admin/media')) activePage = 'media';
  else if (path.startsWith('/admin/users')) activePage = 'users';
  else if (path.startsWith('/admin/settings')) activePage = 'settings';
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.dataset.page === activePage) {
      link.classList.add('bg-brand-teal/10', 'text-white');
      link.classList.remove('text-m2');
    }
  });

  // --- Theme toggle ---
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });

  // --- Dropdowns (notifications + user menu) ---
  function setupDropdown(btnId, panelId) {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = panel.classList.contains('hidden');
      document.querySelectorAll('.dropdown-panel-open').forEach((p) => p.classList.add('hidden'));
      panel.classList.toggle('hidden', !willOpen);
      panel.classList.toggle('dropdown-panel-open', willOpen);
    });
  }
  setupDropdown('notifBtn', 'notifPanel');
  setupDropdown('userMenuBtn', 'userMenuPanel');
  document.addEventListener('click', (e) => {
    ['notifPanel', 'userMenuPanel'].forEach((id) => {
      const panel = document.getElementById(id);
      if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target.id !== 'notifBtn' && e.target.id !== 'userMenuBtn') {
        panel.classList.add('hidden');
      }
    });
  });

  // --- Notifications: pending comments ---
  loadNotifications();

  // --- Logout ---
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.href = '/admin/login';
    }
  });
});

async function loadNotifications() {
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notifList');
  if (!list) return;
  try {
    const res = await apiFetch('/api/comments?status=pending&limit=5');
    const comments = res.data.comments;
    if (badge) badge.classList.toggle('hidden', comments.length === 0);
    list.innerHTML = comments.length
      ? comments
          .map(
            (c) => `
        <a href="/admin/comments" class="block px-4 py-3 hover:bg-white/5 transition">
          <div class="text-sm text-white font-medium">${escapeHtml(c.name)}</div>
          <div class="text-xs text-m2 truncate">${escapeHtml(c.content)}</div>
          <div class="text-[11px] text-m1 mt-1">${formatDate(c.createdAt)}</div>
        </a>`
          )
          .join('')
      : '<div class="px-4 py-6 text-center text-m2 text-sm">No pending comments.</div>';
  } catch (err) {
    list.innerHTML = '<div class="px-4 py-6 text-center text-m2 text-sm">Couldn\'t load notifications.</div>';
  }
}

// --- Toast notifications ---
const TOAST_STYLES = {
  success: 'bg-brand-teal text-ink',
  danger: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-ink',
  info: 'bg-brand-blue text-white',
};
window.showToast = function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `${TOAST_STYLES[type] || TOAST_STYLES.success} rounded-r14 shadow-2xl px-4 py-3 text-sm font-medium flex items-start justify-between gap-3 animate-fadeUp`;
  el.innerHTML = `<span>${escapeHtml(message)}</span><button class="opacity-70 hover:opacity-100 leading-none">&times;</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
};

// --- Confirm modal ---
window.confirmAction = function confirmAction({ title = 'Are you sure?', body = 'This action cannot be undone.', confirmText = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById('confirmModal');
    if (!modalEl) return resolve(window.confirm(body));

    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalBody').textContent = body;
    const okBtn = document.getElementById('confirmModalOkBtn');
    okBtn.textContent = confirmText;

    const onOk = () => {
      cleanup();
      resolve(true);
      closeModal('confirmModal');
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    function cleanup() {
      okBtn.removeEventListener('click', onOk);
      modalEl.removeEventListener('click', onOverlayClick);
    }
    function onOverlayClick(e) {
      if (e.target.closest('[data-modal-close]')) onCancel();
    }

    okBtn.addEventListener('click', onOk);
    modalEl.addEventListener('click', onOverlayClick);
    openModal('confirmModal');
  });
};

// --- Fetch wrapper: JSON in/out, CSRF header, redirect to login on 401 ---
window.apiFetch = async function apiFetch(url, options = {}) {
  const headers = withCsrfHeaders({ ...(options.headers || {}) });
  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  } else if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, { credentials: 'include', ...options, headers });

  if (res.status === 401) {
    window.location.href = `/admin/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    throw new Error('Session expired');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
};

// --- Formats an ISO date string for compact display in admin tables ---
window.formatDate = function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

window.escapeHtml = function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

// Builds a link to the published post on the public marketing site (this app has no public blog UI of its own).
window.publicBlogUrl = function publicBlogUrl(slug) {
  return `${window.MAIN_SITE_URL}/blog-details.html?slug=${encodeURIComponent(slug)}`;
};
