(function mediaPage() {
  const grid = document.getElementById('mediaGrid');
  const emptyState = document.getElementById('mediaEmptyState');
  const searchInput = document.getElementById('mediaSearch');
  const folderFilter = document.getElementById('mediaFolderFilter');
  const uploadFolderInput = document.getElementById('uploadFolderInput');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const renameForm = document.getElementById('renameForm');

  let debounceTimer;

  function card(m) {
    const preview =
      m.mimeType === 'image/svg+xml'
        ? `<div class="w-full h-28 bg-s2 flex items-center justify-center text-m1 text-2xl"><i class="fa-solid fa-file-code"></i></div>`
        : `<img src="${m.url}" loading="lazy" class="w-full h-28 object-cover" />`;
    return `
      <div class="bg-s1 border border-white/5 rounded-r14 overflow-hidden" data-id="${m._id}">
        <a href="${m.url}" target="_blank">${preview}</a>
        <div class="p-3">
          <div class="text-xs text-white truncate" title="${escapeHtml(m.originalName)}">${escapeHtml(m.originalName)}</div>
          <div class="text-[10px] text-m2 mt-0.5">${(m.size / 1024).toFixed(0)} KB · ${escapeHtml(m.folder)}</div>
          <div class="flex gap-1 mt-2">
            <button data-action="copy" data-url="${m.url}" class="flex-1 h-7 rounded-r8 bg-white/5 hover:bg-white/10 text-m2 hover:text-white transition text-xs"><i class="fa-solid fa-clipboard"></i></button>
            <button data-action="rename" class="flex-1 h-7 rounded-r8 bg-white/5 hover:bg-white/10 text-m2 hover:text-white transition text-xs"><i class="fa-solid fa-pen"></i></button>
            <button data-action="delete" class="flex-1 h-7 rounded-r8 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition text-xs"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
  }

  async function load() {
    const params = new URLSearchParams();
    if (searchInput.value) params.set('search', searchInput.value);
    if (folderFilter.value) params.set('folder', folderFilter.value);

    try {
      const res = await apiFetch(`/api/media?${params.toString()}`);
      const { media, folders } = res.data;

      const currentFolder = folderFilter.value;
      folderFilter.innerHTML = '<option value="">All folders</option>' + folders.map((f) => `<option value="${f}">${escapeHtml(f)}</option>`).join('');
      folderFilter.value = currentFolder;

      grid.innerHTML = media.map(card).join('');
      emptyState.classList.toggle('hidden', media.length > 0);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  async function uploadFiles(files) {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', uploadFolderInput.value || 'general');

      const progressEl = document.createElement('div');
      progressEl.className = 'text-xs text-m2 flex items-center gap-2';
      progressEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${escapeHtml(file.name)}…`;
      uploadProgress.appendChild(progressEl);

      try {
        await apiFetch('/api/media/upload', { method: 'POST', body: formData });
        progressEl.innerHTML = `<i class="fa-solid fa-circle-check text-brand-teal"></i> ${escapeHtml(file.name)} uploaded.`;
      } catch (err) {
        progressEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-400"></i> ${escapeHtml(file.name)}: ${escapeHtml(err.message)}`;
      } finally {
        setTimeout(() => progressEl.remove(), 4000);
      }
    }
    load();
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => uploadFiles([...fileInput.files]));

  ['dragenter', 'dragover'].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-brand-teal', 'bg-brand-tealDim');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brand-teal', 'bg-brand-tealDim');
    })
  );
  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) uploadFiles([...e.dataTransfer.files]);
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 350);
  });
  folderFilter.addEventListener('change', load);

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const wrapper = btn.closest('[data-id]');
    const id = wrapper.dataset.id;
    const action = btn.dataset.action;

    if (action === 'copy') {
      await navigator.clipboard.writeText(new URL(btn.dataset.url, window.location.origin).href);
      showToast('Image URL copied.');
    } else if (action === 'rename') {
      renameForm.mediaId.value = id;
      renameForm.originalName.value = wrapper.querySelector('[title]').getAttribute('title');
      openModal('renameModal');
    } else if (action === 'delete') {
      const ok = await confirmAction({ title: 'Delete this image?', body: 'This removes the file permanently.' });
      if (!ok) return;
      try {
        await apiFetch(`/api/media/${id}`, { method: 'DELETE' });
        showToast('Image deleted.');
        load();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  });

  renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = renameForm.mediaId.value;
    try {
      await apiFetch(`/api/media/${id}/rename`, { method: 'PATCH', body: { originalName: renameForm.originalName.value } });
      showToast('Renamed.');
      closeModal('renameModal');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
