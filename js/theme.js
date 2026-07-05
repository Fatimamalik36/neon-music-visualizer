/* ==========================================================================
   THEME.JS — neon color theme + light/dark mode switching
   Persists to localStorage so the choice survives navigation & reloads.
   ========================================================================== */
(function () {
  const THEME_KEY = 'neon-viz-theme';
  const MODE_KEY = 'neon-viz-mode';

  const savedTheme = localStorage.getItem(THEME_KEY) || 'blue';
  const savedMode = localStorage.getItem(MODE_KEY) || 'dark';

  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-mode', savedMode);

  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem(THEME_KEY, name);
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.t === name);
    });
    window.dispatchEvent(new CustomEvent('neon-theme-change', { detail: { theme: name } }));
  }

  function applyMode(mode) {
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem(MODE_KEY, mode);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.t === savedTheme);
      dot.addEventListener('click', () => {
        applyTheme(dot.dataset.t);
        if (window.showToast) showToast(`Theme set to ${dot.dataset.t[0].toUpperCase()}${dot.dataset.t.slice(1)} Neon`);
      });
    });

    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
        applyMode(next);
        if (window.showToast) showToast(next === 'light' ? 'Light mode on' : 'Dark mode on');
      });
    }
  });

  window.NeonTheme = { applyTheme, applyMode };
})();
