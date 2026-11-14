(() => {
  const root = document.documentElement;
  const button = document.getElementById('theme');
  const storageKey = 'theme'; // Shares Butterfly's expiring theme preference.
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    // Storage can be unavailable. The toggle still works on this page.
  }

  function apply(mode) {
    root.dataset.theme = mode;
    button.setAttribute('aria-pressed', String(mode === 'dark'));
  }

  const storedMode = saved && (!saved.expiry || saved.expiry > Date.now()) ? saved.value : null;
  apply(storedMode === 'dark' ? 'dark' : 'light');
  button.hidden = false;
  button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ value: next, expiry: Date.now() + 172800000 }));
    } catch {
      // The current page has already switched.
    }
  });
})();
