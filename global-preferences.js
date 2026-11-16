// global-preferences.js
(function () {
  const PREFS_KEY = 'amaralhub_prefs';

  const defaults = {
    theme: 'dark',      // 'dark' | 'light'
    font: 'default',    // 'default' | 'small' | 'large' | 'mono'
    lang: 'pt-BR'       // 'pt-BR' | 'en' | 'es'
  };

  function loadPrefs() {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  function savePrefs(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function applyPrefs(prefs) {
    const html = document.documentElement;

    // Tema
    html.classList.remove('dark-theme', 'light-theme');
    html.classList.add(prefs.theme === 'dark' ? 'dark-theme' : 'light-theme');

    // Fonte
    html.classList.remove('font-default', 'font-small', 'font-large', 'font-mono');
    html.classList.add(`font-${prefs.font}`);

    // Idioma
    html.setAttribute('lang', prefs.lang);
    html.classList.remove('lang-pt-BR', 'lang-en', 'lang-es');
    html.classList.add(`lang-${prefs.lang}`);

    // Body (evita flash)
    if (document.body) {
      document.body.classList.toggle('dark-theme', prefs.theme === 'dark');
      document.body.classList.toggle('light-theme', prefs.theme === 'light');
    }
  }

  // Aplica imediatamente (antes do DOM carregar)
  const prefs = loadPrefs();
  applyPrefs(prefs);

  // API global
  window.AmaralPrefs = {
    get: () => loadPrefs(),

    setTheme(theme) {
      const p = loadPrefs();
      p.theme = theme;
      savePrefs(p);
      applyPrefs(p);
    },

    toggleTheme() {
      const p = loadPrefs();
      this.setTheme(p.theme === 'dark' ? 'light' : 'dark');
    },

    setFont(font) {
      const p = loadPrefs();
      p.font = font;
      savePrefs(p);
      applyPrefs(p);
    },

    setLang(lang) {
      const p = loadPrefs();
      p.lang = lang;
      savePrefs(p);
      applyPrefs(p);

      // Integração com translate.js
      const map = {
        'pt-BR': 'portuguese',
        'en': 'english',
        'es': 'spanish'
      };

      if (window.translate && translate.changeLanguage) {
        translate.changeLanguage(map[lang] || 'portuguese');
      }

      window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    }
  };

  // Reaplica quando o body existir
  document.addEventListener('DOMContentLoaded', () => {
    applyPrefs(loadPrefs());
  });
})();