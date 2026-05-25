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
      nav_journal: 'Journal',
      nav_profile: 'Profile',
      nav_login: 'Sign In',
      nav_logout: 'Sign Out',
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
      nav_journal: 'Journal',
      nav_profile: 'Profil',
      nav_login: 'Logg inn',
      nav_logout: 'Logg ut',
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

  function getAutoTheme(now) {
    return isNightTime(now) ? THEME_NIGHT : THEME_DAY;
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
    if (kind === 'auth') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 12c4.4 0 8 2.2 8 5v1H4v-1c0-2.8 3.6-5 8-5z"/></svg>';
    }
    if (kind === 'profile') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 13c5.25 0 9.5 2.57 9.5 5.75V22h-19v-1.25C2.5 17.57 6.75 15 12 15z"/></svg>';
    }
    if (kind === 'journal') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a3 3 0 0 1 0-6h10V5H6a1 1 0 0 0-1 1v11.2A3 3 0 0 1 6 17h11v2H6a1 1 0 0 0 0 2h11V3H6z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 8a1 1 0 0 0-1 1v5h2v-5a1 1 0 0 0-1-1zm0-4a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 12 6z"/></svg>';
  }

  function updateAuthButton() {
    var btn = document.getElementById('app-auth-button');
    var profileBtn = document.getElementById('app-profile-button');
    var journalBtn = document.getElementById('app-journal-button');
    if (!btn) {
      return;
    }
    var state = window.JegVetAuth && typeof window.JegVetAuth.getState === 'function'
      ? window.JegVetAuth.getState()
      : { ready: false, user: null };
    var loggedIn = !!(state && state.user);
    btn.setAttribute('data-auth-mode', loggedIn ? 'logout' : 'login');
    btn.setAttribute('aria-label', loggedIn ? t('nav_logout', 'Sign Out') : t('nav_login', 'Sign In'));
    var label = btn.querySelector('span');
    if (label) {
      label.textContent = loggedIn ? t('nav_logout', 'Sign Out') : t('nav_login', 'Sign In');
    }
    if (profileBtn) {
      profileBtn.hidden = !loggedIn;
    }
    if (journalBtn) {
      journalBtn.hidden = !loggedIn;
    }
    if (btn) {
      btn.hidden = loggedIn;
    }
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
        '<a class="app-nav-button" href="journal.html" id="app-journal-button" data-i18n-aria-label="nav_journal" hidden>' + createIcon('journal') + '<span data-i18n="nav_journal">Journal</span></a>' +
        '<a class="app-nav-button" href="profile.html" id="app-profile-button" data-i18n-aria-label="nav_profile" hidden>' + createIcon('profile') + '<span data-i18n="nav_profile">Profile</span></a>' +
        '<a class="app-nav-button" href="login.html" id="app-auth-button" data-i18n-aria-label="nav_login">' + createIcon('auth') + '<span data-i18n="nav_login">Sign In</span></a>' +
        '<div class="app-topbar-switches">' +
          '<div class="switch switch-theme" data-switch-size="small" data-i18n-aria-label="switch_theme_aria" aria-label="Theme switch">' +
            '<input id="theme-toggle" class="check-toggle check-toggle-round-flat" type="checkbox" />' +
            '<label for="theme-toggle"></label>' +
            '<span class="on" data-i18n="switch_theme_on">DAY</span>' +
            '<span class="off" data-i18n="switch_theme_off">NIGHT</span>' +
          '</div>' +
          '<div class="switch switch-lang" data-switch-size="small" data-i18n-aria-label="switch_lang_aria" aria-label="Language switch">' +
            '<input id="lang-toggle" class="check-toggle check-toggle-round-flat" type="checkbox" />' +
            '<label for="lang-toggle"></label>' +
            '<span class="on" data-i18n="switch_on">EN</span>' +
            '<span class="off" data-i18n="switch_off">NO</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    var body = document.body;
    if (!body) {
      return;
    }
    body.classList.add('has-app-shell');
    body.insertBefore(wrap, body.firstChild);

    var langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('change', function () {
        setLang(langToggle.checked ? 'no' : 'en');
      });
    }

    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', function () {
        onThemeToggleChange(themeToggle.checked);
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

    document.addEventListener('jegvet:authchange', updateAuthButton);
    syncToggle();
    updateAuthButton();
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
    applyThemeFromClockAndOverride();
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
