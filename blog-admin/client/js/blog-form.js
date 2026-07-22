(function blogFormPage() {
  const form = document.getElementById('blogForm');
  let blogId = form.blogId.value || null;

  const slugInput = form.slug;
  const titleInput = form.title;
  const statusBadge = document.getElementById('currentStatusBadge');
  const scheduleField = document.getElementById('scheduleField');
  const autosaveStatus = document.getElementById('autosaveStatus');

  const featuredImageInput = document.getElementById('featuredImageInput');
  const featuredImagePreview = document.getElementById('featuredImagePreview');
  const pickFeaturedImageBtn = document.getElementById('pickFeaturedImageBtn');
  const galleryContainer = document.getElementById('galleryContainer');
  const addGalleryImageBtn = document.getElementById('addGalleryImageBtn');
  const duplicateBtn = document.getElementById('duplicateBtn');
  const previewBtn = document.getElementById('previewBtn');
  const previewToggleBtn = document.getElementById('previewToggleBtn');

  let galleryImages = window.__INITIAL_GALLERY__ || [];

  if (previewBtn) {
    previewBtn.href = publicBlogUrl(slugInput.value);
    previewBtn.target = '_blank';
  }

  // --- Rich text editor ---
  if (window.tinymce) {
    tinymce.init({
      selector: '#contentEditor',
      height: 480,
      menubar: false,
      // Self-hosted under the GPL — required as of TinyMCE 6+ or the editor
      // stays locked read-only with a "license key" banner.
      license_key: 'gpl',
      skin: 'oxide-dark',
      content_css: 'dark',
      plugins: 'lists link image media table code codesample fullscreen autosave',
      toolbar:
        'undo redo | blocks | bold italic forecolor | bullist numlist | ' +
        'link image media table blockquote codesample hr | fullscreen | code',
      block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3',
      setup(editor) {
        editor.on('input change undo redo', markDirty);
      },
    });
  }

  function getContent() {
    return window.tinymce && tinymce.get('contentEditor') ? tinymce.get('contentEditor').getContent() : form.content?.value || '';
  }

  // --- Slug auto-generation from title (only while creating, or slug field left blank) ---
  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  let slugManuallyEdited = !!slugInput.value;
  slugInput.addEventListener('input', () => {
    slugManuallyEdited = true;
  });
  titleInput.addEventListener('input', () => {
    if (!slugManuallyEdited) slugInput.value = slugify(titleInput.value);
  });

  // --- Action buttons ---
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action));
  });

  function renderGallery() {
    galleryContainer.innerHTML = galleryImages
      .map(
        (g, i) => `
      <div class="relative group" data-index="${i}">
        <img src="${g.url}" class="w-full h-20 object-cover rounded-r8 border border-white/10" />
        <button type="button" class="remove-gallery-item absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
      </div>`
      )
      .join('');
  }
  renderGallery();

  galleryContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-gallery-item');
    if (!btn) return;
    galleryImages.splice(Number(btn.dataset.index), 1);
    renderGallery();
    markDirty();
  });

  // --- Lightweight media picker (shared by featured image + gallery) ---
  let pickerTarget = null;
  function ensurePickerModal() {
    if (document.getElementById('mediaPickerModal')) return;
    const div = document.createElement('div');
    div.innerHTML = `
      <div id="mediaPickerModal" class="hidden fixed inset-0 z-[85] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70" data-modal-close="mediaPickerModal"></div>
        <div class="relative bg-s1 border border-white/10 rounded-r20 w-full max-w-2xl max-h-[80vh] flex flex-col animate-fadeUp">
          <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <h3 class="font-heading font-bold text-white text-sm">Select Image</h3>
            <button data-modal-close="mediaPickerModal" class="w-8 h-8 rounded-r8 text-m2 hover:text-white hover:bg-white/10 transition"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="p-5 overflow-y-auto">
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-3" id="mediaPickerGrid"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
  }

  async function openPicker(target) {
    pickerTarget = target;
    ensurePickerModal();
    const grid = document.getElementById('mediaPickerGrid');
    grid.innerHTML = '<div class="col-span-full text-center py-8 text-m2"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    openModal('mediaPickerModal');

    try {
      const res = await apiFetch('/api/media?limit=60');
      const items = res.data.media;
      grid.innerHTML = items.length
        ? items
            .map(
              (m) => `
        <img src="${m.url}" data-url="${m.url}" data-alt="${escapeHtml(m.originalName)}" class="w-full h-24 object-cover rounded-r8 border border-white/10 cursor-pointer hover:border-brand-teal transition" />`
            )
            .join('')
        : '<div class="col-span-full text-center text-m2 py-8 text-sm">No media uploaded yet. Go to Media Manager to upload images.</div>';

      grid.querySelectorAll('img[data-url]').forEach((img) => {
        img.addEventListener('click', () => {
          if (pickerTarget === 'featured') {
            featuredImageInput.value = img.dataset.url;
            featuredImagePreview.src = img.dataset.url;
            featuredImagePreview.classList.remove('hidden');
          } else if (pickerTarget === 'gallery') {
            galleryImages.push({ url: img.dataset.url, alt: img.dataset.alt });
            renderGallery();
          }
          markDirty();
          closeModal('mediaPickerModal');
        });
      });
    } catch (err) {
      grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-8 text-sm">${escapeHtml(err.message)}</div>`;
    }
  }

  pickFeaturedImageBtn.addEventListener('click', () => openPicker('featured'));
  addGalleryImageBtn.addEventListener('click', () => openPicker('gallery'));

  featuredImageInput.addEventListener('input', () => {
    if (featuredImageInput.value) {
      featuredImagePreview.src = featuredImageInput.value;
      featuredImagePreview.classList.remove('hidden');
    } else {
      featuredImagePreview.classList.add('hidden');
    }
  });

  document.querySelector('[data-action="schedule"]')?.addEventListener('click', () => {
    scheduleField.classList.toggle('hidden');
  });

  // --- Live preview ---
  previewToggleBtn?.addEventListener('click', () => {
    document.getElementById('previewTitle').textContent = titleInput.value || 'Untitled';
    const img = document.getElementById('previewImage');
    if (featuredImageInput.value) {
      img.src = featuredImageInput.value;
      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
    }
    document.getElementById('previewContent').innerHTML = getContent() || '<p class="text-m2">Nothing to preview yet.</p>';
    openModal('previewPanel');
  });

  // --- Save actions ---
  function buildPayload(action) {
    const fd = new FormData(form);
    const tags = [...form.tags.selectedOptions].map((o) => o.value);

    return {
      title: fd.get('title'),
      slug: fd.get('slug'),
      shortDescription: fd.get('shortDescription'),
      content: getContent(),
      featuredImage: fd.get('featuredImage'),
      imageAltText: fd.get('imageAltText'),
      imageCaption: fd.get('imageCaption'),
      galleryImages,
      category: fd.get('category'),
      tags,
      author: fd.get('author'),
      featured: form.featuredSwitch.checked,
      pinned: form.pinnedSwitch.checked,
      metaTitle: fd.get('metaTitle'),
      metaDescription: fd.get('metaDescription'),
      keywords: fd.get('keywords'),
      canonicalUrl: fd.get('canonicalUrl'),
      ogImage: fd.get('ogImage'),
      schemaJson: fd.get('schemaJson'),
      scheduledAt: fd.get('scheduledAt'),
      action,
    };
  }

  async function handleAction(action) {
    if (!titleInput.value || !form.shortDescription.value || !getContent() || !form.category.value) {
      showToast('Please fill in title, short description, content, and category first.', 'danger');
      return;
    }
    if (action === 'schedule' && scheduleField.classList.contains('hidden')) {
      scheduleField.classList.remove('hidden');
      return;
    }

    const payload = buildPayload(action);
    try {
      let res;
      if (blogId) {
        res = await apiFetch(`/api/blog/${blogId}`, { method: 'PUT', body: payload });
      } else {
        res = await apiFetch('/api/blog', { method: 'POST', body: payload });
      }
      showToast('Blog saved.');
      statusBadge.textContent = res.data.blog.status;
      window.location.href = `/admin/blogs/${res.data.blog._id}/edit`;
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  if (duplicateBtn) {
    duplicateBtn.addEventListener('click', async () => {
      try {
        const res = await apiFetch(`/api/blog/${blogId}/duplicate`, { method: 'POST' });
        showToast('Duplicated as a new draft.');
        window.location.href = `/admin/blogs/${res.data.blog._id}/edit`;
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // --- Auto-save (draft only — never overrides a published/scheduled post's status) ---
  let dirty = false;
  let autosaveTimer = null;
  const AUTOSAVE_DEBOUNCE_MS = 4000;

  function markDirty() {
    dirty = true;
    if (autosaveStatus) autosaveStatus.innerHTML = '<i class="fa-solid fa-circle text-amber-400 text-[6px]"></i> Unsaved changes';
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosave, AUTOSAVE_DEBOUNCE_MS);
  }

  async function autosave() {
    if (!dirty || !titleInput.value.trim()) return;
    if (autosaveStatus) autosaveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
      const payload = buildPayload(blogId ? undefined : 'draft'); // no action on existing posts => status untouched
      let res;
      if (blogId) {
        res = await apiFetch(`/api/blog/${blogId}`, { method: 'PUT', body: payload });
      } else {
        res = await apiFetch('/api/blog', { method: 'POST', body: payload });
        blogId = res.data.blog._id;
        form.blogId.value = blogId;
        window.history.replaceState(null, '', `/admin/blogs/${blogId}/edit`);
        if (previewBtn) previewBtn.href = publicBlogUrl(res.data.blog.slug);
      }
      dirty = false;
      if (autosaveStatus) {
        const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        autosaveStatus.innerHTML = `<i class="fa-solid fa-circle-check text-brand-teal"></i> Saved at ${time}`;
      }
    } catch (err) {
      if (autosaveStatus) autosaveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-400"></i> Autosave failed';
    }
  }

  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);
  setInterval(() => {
    if (dirty) autosave();
  }, 25000);
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  form.addEventListener('submit', (e) => e.preventDefault());
})();
