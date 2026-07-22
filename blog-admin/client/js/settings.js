(function settingsPage() {
  const form = document.getElementById('settingsForm');

  function setNestedValue(fieldName, value) {
    const input = form.elements[fieldName];
    if (input) input.value = value ?? '';
  }

  async function load() {
    try {
      const res = await apiFetch('/api/settings');
      const s = res.data.settings;
      ['siteName', 'logo', 'favicon', 'contactEmail', 'footerText', 'googleAnalyticsId', 'googleSearchConsoleVerification', 'facebookPixelId', 'metaVerification'].forEach(
        (f) => setNestedValue(f, s[f])
      );
      Object.entries(s.socialLinks || {}).forEach(([key, value]) => setNestedValue(`socialLinks.${key}`, value));
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = { socialLinks: {} };

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('socialLinks.')) {
        payload.socialLinks[key.split('.')[1]] = value;
      } else {
        payload[key] = value;
      }
    }

    try {
      await apiFetch('/api/settings', { method: 'PUT', body: payload });
      showToast('Settings saved.');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  load();
})();
