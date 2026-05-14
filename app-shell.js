(function () {
  'use strict';

  var STORAGE_KEY = 'jegvet-lang';
  var SUPPORTED = { en: true, no: true };

  var common = {
    en: {
      nav_home: 'Home',
      nav_back: 'Back',
      nav_search: 'Search',
      nav_about: 'About',
      switch_on: 'EN',
      switch_off: 'NO'
    },
    no: {
      nav_home: 'Hjem',
      nav_back: 'Tilbake',
      nav_search: 'Søk',
      nav_about: 'Info',
      switch_on: 'EN',
      switch_off: 'NO'
    }
  };

  var currentLang = detectInitialLang();

  function detectInitialLang() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED[saved]) {
        return saved;
      }
    } catch (error) {
      // Ignore storage access issues and fall back to page language.
    }
    var htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    return htmlLang.indexOf('no') === 0 || htmlLang.indexOf('nb') === 0 ? 'no' : 'en';
  }

  function getPageDictionary() {
    if (!window.PAGE_I18N) {
      return {};
    }
    return window.PAGE_I18N[currentLang] || {};
  }

  function getDictionary() {
    var dict = {};
    var base = common[currentLang] || common.en;
    var page = getPageDictionary();
    var key;
    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        dict[key] = base[key];
      }
    }
    for (key in page) {
      if (Object.prototype.hasOwnProperty.call(page, key)) {
        dict[key] = page[key];
      }
    }
    return dict;
  }

  function t(key, fallback) {
    var dict = getDictionary();
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      return dict[key];
    }
    return typeof fallback === 'string' ? fallback : key;
  }

  function template(key, fallback, params) {
    var text = t(key, fallback);
    if (!params) {
      return text;
    }
    return text.replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, paramKey) {
      return Object.prototype.hasOwnProperty.call(params, paramKey) ? String(params[paramKey]) : '';
    });
  }

  function applyTranslations(root) {
    var scope = root || document;

    var textEls = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < textEls.length; i += 1) {
      var el = textEls[i];
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key, el.textContent);
    }

    var placeholderEls = scope.querySelectorAll('[data-i18n-placeholder]');
    for (var p = 0; p < placeholderEls.length; p += 1) {
      var pel = placeholderEls[p];
      var pKey = pel.getAttribute('data-i18n-placeholder');
      pel.setAttribute('placeholder', t(pKey, pel.getAttribute('placeholder') || ''));
    }

    var ariaEls = scope.querySelectorAll('[data-i18n-aria-label]');
    for (var a = 0; a < ariaEls.length; a += 1) {
      var ael = ariaEls[a];
      var aKey = ael.getAttribute('data-i18n-aria-label');
      ael.setAttribute('aria-label', t(aKey, ael.getAttribute('aria-label') || ''));
    }

    if (document.body) {
      var titleKey = document.body.getAttribute('data-i18n-title');
      if (titleKey) {
        document.title = t(titleKey, document.title);
      }
    }
  }

  function setLang(nextLang) {
    if (!SUPPORTED[nextLang]) {
      return;
    }
    currentLang = nextLang;
    try {
      window.localStorage.setItem(STORAGE_KEY, currentLang);
    } catch (error) {
      // Ignore storage write issues.
    }
    document.documentElement.setAttribute('lang', currentLang === 'no' ? 'nb' : 'en');
    document.body.setAttribute('data-lang', currentLang);
    syncToggle();
    applyTranslations(document);
    document.dispatchEvent(new CustomEvent('jegvet:langchange', { detail: { lang: currentLang } }));
  }

  function syncToggle() {
    var toggle = document.getElementById('lang-toggle');
    if (!toggle) {
      return;
    }
    toggle.checked = currentLang === 'no';
  }

  function createIcon(kind) {
    if (kind === 'home') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>';
    }
    if (kind === 'search') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.2 4.2-1.4 1.4-4.2-4.2A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>';
    }
    if (kind === 'back') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10.2 6.2-5.8 5.8 5.8 5.8 1.4-1.4-3.4-3.4H20v-2H8.2l3.4-3.4-1.4-1.4z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 8a1 1 0 0 0-1 1v5h2v-5a1 1 0 0 0-1-1zm0-4a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 12 6z"/></svg>';
  }

  function buildTopBar() {
    if (document.querySelector('.app-topbar-wrap')) {
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'app-topbar-wrap';
    wrap.innerHTML =
      '<div class="app-topbar">' +
        '<a class="app-topbar-brand" href="index.html" data-i18n-aria-label="nav_home">' +
          '<img src="logo_day_small_fixed.png" alt="JegVet logo" />' +
        '</a>' +
        '<a class="app-nav-button" href="index.html" data-i18n-aria-label="nav_home">' + createIcon('home') + '<span data-i18n="nav_home">Home</span></a>' +
        '<a class="app-nav-button" href="#" id="app-nav-back" data-i18n-aria-label="nav_back">' + createIcon('back') + '<span data-i18n="nav_back">Back</span></a>' +
        '<a class="app-nav-button" href="search.html" data-i18n-aria-label="nav_search">' + createIcon('search') + '<span data-i18n="nav_search">Search</span></a>' +
        '<a class="app-nav-button" href="about.html" data-i18n-aria-label="nav_about">' + createIcon('info') + '<span data-i18n="nav_about">About</span></a>' +
        '<div class="switch" aria-label="Language switch">' +
          '<input id="lang-toggle" class="check-toggle check-toggle-round-flat" type="checkbox" />' +
          '<label for="lang-toggle"></label>' +
          '<span class="on" data-i18n="switch_on">EN</span>' +
          '<span class="off" data-i18n="switch_off">NO</span>' +
        '</div>' +
      '</div>';

    var body = document.body;
    if (!body) {
      return;
    }
    body.classList.add('has-app-shell');
    body.insertBefore(wrap, body.firstChild);

    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('change', function () {
        setLang(toggle.checked ? 'no' : 'en');
      });
    }

    var backBtn = document.getElementById('app-nav-back');
    if (backBtn) {
      backBtn.addEventListener('click', function (event) {
        event.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    }
    syncToggle();
  }

  function syncTopBarWidthMode() {
    var body = document.body;
    if (!body) {
      return;
    }
    body.classList.remove('app-shell-wide');
    var firstLayoutCard = document.querySelector('.layout-card');
    if (firstLayoutCard && firstLayoutCard.classList.contains('layout-card-wide')) {
      body.classList.add('app-shell-wide');
    }
  }

  function init() {
    buildTopBar();
    syncTopBarWidthMode();
    setLang(currentLang);
  }

  window.JegVetLang = {
    getLang: function () {
      return currentLang;
    },
    setLang: setLang,
    t: t,
    template: template,
    applyTranslations: applyTranslations
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

