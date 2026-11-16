// global-preferences.js
// Delegatário de tema: GoSchoolTheme (theme.js) é a fonte da verdade para tema.
// Este arquivo mantém apenas fonte e idioma, e reexporta a API de tema via GoSchoolTheme.
(function () {
  const PREFS_KEY = 'goschool_prefs';

  const defaults = {
    theme: 'sistema',      // 'claro' | 'escuro' | 'sistema' — gerido por theme.js
    font: 'default',       // 'default' | 'small' | 'large' | 'mono'
    lang: 'pt-BR'          // 'pt-BR' | 'en' | 'es'
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

    // Tema: delegado ao theme.js (data-theme no html). Apenas garante classe de body se necessária.
    if (window.GoSchoolTheme) {
      const savedTheme = window.GoSchoolTheme.get();
      if (savedTheme !== prefs.theme) {
        window.GoSchoolTheme.set(savedTheme);
      }
    }

    // Fonte
    html.classList.remove('font-default', 'font-small', 'font-large', 'font-mono');
    html.classList.add(`font-${prefs.font}`);

    // Idioma
    html.setAttribute('lang', prefs.lang);
    html.classList.remove('lang-pt-BR', 'lang-en', 'lang-es');
    html.classList.add(`lang-${prefs.lang}`);
  }

  // Aplica imediatamente (antes do DOM carregar)
  const prefs = loadPrefs();
  applyPrefs(prefs);

  // API global
  window.GoSchoolPrefs = {
    get: () => loadPrefs(),

    setTheme(theme) {
      if (window.GoSchoolTheme) {
        window.GoSchoolTheme.set(theme);
      }
      const p = loadPrefs();
      p.theme = theme;
      savePrefs(p);
    },

    toggleTheme() {
      const p = loadPrefs();
      const current = window.GoSchoolTheme ? window.GoSchoolTheme.get() : p.theme;
      if (current === 'claro') {
        this.setTheme('escuro');
      } else if (current === 'escuro') {
        this.setTheme('claro');
      } else {
        // sistema → claro
        this.setTheme('claro');
      }
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

  // Reaplica quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    applyPrefs(loadPrefs());
  });
})();
