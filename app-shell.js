(function () {
  'use strict';

  var LANG_STORAGE_KEY = 'jegvet-lang';
  var THEME_OVERRIDE_STORAGE_KEY = 'jegvet-theme-override';
  var THEME_DAY = 'day';
  var THEME_NIGHT = 'night';
  var SUPPORTED = { en: true, no: true };

  var common = {
    en: {
      nav_home: 'Home',
      nav_back: 'Back',
      nav_search: 'Search',
      nav_about: 'About',
      nav_settings: 'Settings',
      footer_disclaimer: 'For veterinary professionals. Always verify doses against current product information and clinical judgement. JegVet is provided "as is", without warranty.',
      footer_about: 'About',
      switch_lang_aria: 'Language switch',
      switch_on: 'EN',
      switch_off: 'NO',
      switch_theme_aria: 'Theme switch',
      switch_theme_on: 'DAY',
      switch_theme_off: 'NIGHT'
    },
    no: {
      nav_home: 'Hjem',
      nav_back: 'Tilbake',
      nav_search: 'S\u00F8k',
      nav_about: 'Info',
      nav_settings: 'Innstillinger',
      footer_disclaimer: 'Til bruk for veterin\u00E6rpersonell. Kontroller alltid doser mot oppdatert preparatomtale og klinisk skj\u00F8nn. JegVet leveres \u00ABsom det er\u00BB, uten garanti.',
      footer_about: 'Om',
      switch_lang_aria: 'Spr\u00E5kvelger',
      switch_on: 'EN',
      switch_off: 'NO',
      switch_theme_aria: 'Temavelger',
      switch_theme_on: 'DAG',
      switch_theme_off: 'NATT'
    }
  };

  var currentLang = detectInitialLang();
  var activeTheme = THEME_DAY;
  var themeTimerId = null;

  function detectInitialLang() {
    try {
      var saved = window.localStorage.getItem(LANG_STORAGE_KEY);
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
      window.localStorage.setItem(LANG_STORAGE_KEY, currentLang);
    } catch (error) {
      // Ignore storage write issues.
    }
    document.documentElement.setAttribute('lang', currentLang === 'no' ? 'nb' : 'en');
    if (document.body) {
      document.body.setAttribute('data-lang', currentLang);
    }
    syncToggle();
    applyTranslations(document);
    document.dispatchEvent(new CustomEvent('jegvet:langchange', { detail: { lang: currentLang } }));
  }

  function syncToggle() {
    var langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.checked = currentLang === 'no';
    }
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.checked = activeTheme === THEME_NIGHT;
    }
  }

  function isNightTime(now) {
    var hour = now.getHours();
    return hour >= 19 || hour < 6;
  }

  function getSystemThemePreference() {
    try {
      if (window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return THEME_NIGHT;
        }
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
          return THEME_DAY;
        }
      }
    } catch (error) {
      // matchMedia unavailable; fall back to the clock.
    }
    return null;
  }

  function getAutoTheme(now) {
    var systemPreference = getSystemThemePreference();
    if (systemPreference) {
      return systemPreference;
    }
    return isNightTime(now) ? THEME_NIGHT : THEME_DAY;
  }

  function watchSystemTheme() {
    try {
      var media = window.matchMedia('(prefers-color-scheme: dark)');
      var handler = function () {
        var now = new Date();
        if (!readThemeOverride(now)) {
          setTheme(getAutoTheme(now));
        }
      };
      if (media.addEventListener) {
        media.addEventListener('change', handler);
      } else if (media.addListener) {
        media.addListener(handler);
      }
    } catch (error) {
      // Ignore environments without matchMedia change events.
    }
  }

  function getNextAutoThemeTime(now) {
    var next = new Date(now.getTime());
    var hour = now.getHours();

    if (hour < 6) {
      next.setHours(6, 0, 0, 0);
      return next;
    }
    if (hour < 19) {
      next.setHours(19, 0, 0, 0);
      return next;
    }

    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
    return next;
  }

  function clearThemeOverrideStorage() {
    try {
      window.localStorage.removeItem(THEME_OVERRIDE_STORAGE_KEY);
    } catch (error) {
      // Ignore storage issues.
    }
  }

  function saveThemeOverride(mode, expiresAt) {
    try {
      window.localStorage.setItem(
        THEME_OVERRIDE_STORAGE_KEY,
        JSON.stringify({ mode: mode, expiresAt: expiresAt })
      );
    } catch (error) {
      // Ignore storage issues.
    }
  }

  function readThemeOverride(now) {
    try {
      var raw = window.localStorage.getItem(THEME_OVERRIDE_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      var parsed = JSON.parse(raw);
      if (!parsed || (parsed.mode !== THEME_DAY && parsed.mode !== THEME_NIGHT)) {
        clearThemeOverrideStorage();
        return null;
      }

      var expiresAt = Number(parsed.expiresAt);
      if (!Number.isFinite(expiresAt) || now.getTime() >= expiresAt) {
        clearThemeOverrideStorage();
        return null;
      }

      return parsed;
    } catch (error) {
      clearThemeOverrideStorage();
      return null;
    }
  }

  function updateMetaThemeColor() {
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      return;
    }
    metaTheme.setAttribute('content', activeTheme === THEME_NIGHT ? '#132432' : '#ffffff');
  }

  function setTheme(mode) {
    if (mode !== THEME_DAY && mode !== THEME_NIGHT) {
      return;
    }

    activeTheme = mode;
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', activeTheme);
    }

    syncToggle();
    updateMetaThemeColor();
    document.dispatchEvent(new CustomEvent('jegvet:themechange', { detail: { theme: activeTheme } }));
  }

  function scheduleNextThemeAutoSwitch() {
    if (themeTimerId !== null) {
      window.clearTimeout(themeTimerId);
      themeTimerId = null;
    }

    var now = new Date();
    var nextSwitchAt = getNextAutoThemeTime(now);
    var delay = Math.max(0, nextSwitchAt.getTime() - now.getTime());

    themeTimerId = window.setTimeout(function () {
      clearThemeOverrideStorage();
      setTheme(getAutoTheme(new Date()));
      scheduleNextThemeAutoSwitch();
    }, delay + 50);
  }

  function applyThemeFromClockAndOverride() {
    var now = new Date();
    var override = readThemeOverride(now);
    if (override) {
      setTheme(override.mode);
    } else {
      setTheme(getAutoTheme(now));
    }
    scheduleNextThemeAutoSwitch();
  }

  function onThemeToggleChange(isNightChecked) {
    var mode = isNightChecked ? THEME_NIGHT : THEME_DAY;
    var nextAutoSwitchAt = getNextAutoThemeTime(new Date());
    saveThemeOverride(mode, nextAutoSwitchAt.getTime());
    setTheme(mode);
    scheduleNextThemeAutoSwitch();
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
    if (kind === 'settings') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94a7.5 7.5 0 0 0 .05-.94 7.5 7.5 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54a7.2 7.2 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.5 7.5 0 0 0-.05.94c0 .32.02.63.05.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.58-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4z"/></svg>';
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
          '<img src="logo_day_small_fixed.png" alt="JegVet logo" width="38" height="38" />' +
        '</a>' +
        '<a class="app-nav-button" href="index.html" data-i18n-aria-label="nav_home">' + createIcon('home') + '<span data-i18n="nav_home">Home</span></a>' +
        '<a class="app-nav-button" href="#" id="app-nav-back" data-i18n-aria-label="nav_back">' + createIcon('back') + '<span data-i18n="nav_back">Back</span></a>' +
        '<a class="app-nav-button" href="search.html" data-i18n-aria-label="nav_search">' + createIcon('search') + '<span data-i18n="nav_search">Search</span></a>' +
        '<a class="app-nav-button" href="about.html" data-i18n-aria-label="nav_about">' + createIcon('info') + '<span data-i18n="nav_about">About</span></a>' +
        '<a class="app-nav-button" href="settings.html" data-i18n-aria-label="nav_settings">' + createIcon('settings') + '<span data-i18n="nav_settings">Settings</span></a>' +
      '</div>';

    var body = document.body;
    if (!body) {
      return;
    }
    body.classList.add('has-app-shell');
    body.insertBefore(wrap, body.firstChild);

    var backBtn = document.getElementById('app-nav-back');
    if (backBtn) {
      backBtn.addEventListener('click', function (event) {
        event.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        } else {
          var referrer = document.referrer || '';
          var canUseReferrer = false;
          if (referrer) {
            try {
              var referrerUrl = new URL(referrer, window.location.href);
              canUseReferrer = referrerUrl.origin === window.location.origin;
            } catch (error) {
              canUseReferrer = false;
            }
          }

          window.location.href = canUseReferrer ? referrer : 'index.html';
        }
      });
    }

    syncToggle();
  }

  function bindPreferenceControls() {
    var langToggle = document.getElementById('lang-toggle');
    if (langToggle && !langToggle.getAttribute('data-bound')) {
      langToggle.setAttribute('data-bound', 'true');
      langToggle.addEventListener('change', function () {
        setLang(langToggle.checked ? 'no' : 'en');
      });
    }

    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && !themeToggle.getAttribute('data-bound')) {
      themeToggle.setAttribute('data-bound', 'true');
      themeToggle.addEventListener('change', function () {
        onThemeToggleChange(themeToggle.checked);
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

  function buildFooter() {
    if (document.querySelector('.app-footer')) {
      return;
    }
    var body = document.body;
    if (!body) {
      return;
    }
    var footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML =
      '<p class="app-footer-disclaimer" data-i18n="footer_disclaimer"></p>' +
      '<p class="app-footer-links"><a href="about.html" data-i18n="footer_about">About</a></p>';
    body.appendChild(footer);
  }

  function ensureMetaTags() {
    var head = document.head;
    if (!head) {
      return;
    }
    var existingDesc = document.querySelector('meta[name="description"]');
    var description = existingDesc
      ? existingDesc.getAttribute('content')
      : 'JegVet - bilingual veterinary reference and dosing calculators for clinical use.';
    var title = document.title || 'JegVet';

    function addMeta(attr, key, value) {
      if (!value || document.querySelector('meta[' + attr + '="' + key + '"]')) {
        return;
      }
      var meta = document.createElement('meta');
      meta.setAttribute(attr, key);
      meta.setAttribute('content', value);
      head.appendChild(meta);
    }

    addMeta('name', 'description', description);
    addMeta('property', 'og:title', title);
    addMeta('property', 'og:description', description);
    addMeta('property', 'og:type', 'website');
    addMeta('property', 'og:site_name', 'JegVet');
    addMeta('name', 'twitter:card', 'summary');

    if (!document.querySelector('link[rel="canonical"]')) {
      var canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', window.location.href.split('#')[0].split('?')[0]);
      head.appendChild(canonical);
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {
      return;
    }
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {
        // Offline support is a progressive enhancement; ignore registration errors.
      });
    });
  }

  function bindSearchShortcut() {
    document.addEventListener('keydown', function (event) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      var target = event.target || {};
      var tag = target.tagName || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || target.isContentEditable) {
        return;
      }
      var input = document.querySelector('input[type="search"], input[name="q"]');
      if (input) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  function init() {
    ensureMetaTags();
    buildTopBar();
    buildFooter();
    syncTopBarWidthMode();
    applyThemeFromClockAndOverride();
    watchSystemTheme();
    setLang(currentLang);
    bindPreferenceControls();
    bindSearchShortcut();
    registerServiceWorker();
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
