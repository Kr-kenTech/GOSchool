/* ============================================================
   GoSchool — Mecanismo de Tema
   Suporta: 'claro' | 'escuro' | 'sistema'
   Persistido em localStorage (chave: gs_theme)
   Aplicado antes do DOM para evitar FOUC
   ============================================================ */

(function () {
  var THEME_KEY = 'gs_theme';
  var THEMES = ['claro', 'escuro', 'sistema'];
  var DEFAULT_THEME = 'claro';

  var html = document.documentElement;
  var storedTheme = null;

  try {
    storedTheme = localStorage.getItem(THEME_KEY);
  } catch (e) {
    // localStorage indisponível (modo privado etc.)
    storedTheme = null;
  }

  function resolveTheme(userTheme) {
    if (userTheme === 'sistema' || !userTheme) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'escuro'
        : 'claro';
    }
    return userTheme;
  }

  function applyTheme(theme) {
    if (theme === 'escuro') {
      html.setAttribute('data-theme', 'escuro');
      html.classList.remove('light-theme');
      html.classList.add('dark-theme');
    } else {
      html.setAttribute('data-theme', 'claro');
      html.classList.remove('dark-theme');
      html.classList.add('light-theme');
    }
  }

  // Aplica imediatamente, antes do DOM carregar (sem FOUC)
  var resolved = resolveTheme(storedTheme);
  if (THEMES.indexOf(storedTheme) === -1) {
    resolved = resolveTheme(DEFAULT_THEME);
    try {
      localStorage.setItem(THEME_KEY, DEFAULT_THEME);
    } catch (e) {}
  }
  applyTheme(resolved);

  // Expõe API global
  window.GoSchoolTheme = {
    get: function () {
      try {
        return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
      } catch (e) {
        return DEFAULT_THEME;
      }
    },
    set: function (value) {
      if (THEMES.indexOf(value) === -1) return;
      try {
        localStorage.setItem(THEME_KEY, value);
      } catch (e) {}
      applyTheme(resolveTheme(value));
    },
    toggle: function () {
      var current = this.get();
      var next = current === 'claro' ? 'escuro' : 'claro';
      this.set(next);
    },
    isDark: function () {
      return html.getAttribute('data-theme') === 'escuro';
    },
  };

  // Escuta mudanças na preferência do sistema quando modo é 'sistema'
  if (window.matchMedia) {
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function (e) {
      if (window.GoSchoolTheme.get() === 'sistema') {
        applyTheme(e.matches ? 'escuro' : 'claro');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
    }
  }
})();