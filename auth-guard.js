(function () {
  'use strict';

  var STORAGE_KEY = 'jegvet_authenticated';
  var PASSWORD = 'jegvet1987';

  function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function setAuthenticated() {
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML =
      '<div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">' +
      '<h2 id="auth-title">Enter Password</h2>' +
      '<form id="auth-form" novalidate>' +
      '<label for="auth-password" class="sr-only">Password</label>' +
      '<input id="auth-password" type="password" autocomplete="current-password" placeholder="Password" required />' +
      '<button type="submit">Unlock</button>' +
      '<p id="auth-error" class="auth-error" aria-live="polite"></p>' +
      '</form>' +
      '</div>';

    return overlay;
  }

  function lockPage() {
    document.body.classList.add('is-locked');
    var overlay = buildOverlay();
    document.body.appendChild(overlay);

    var form = document.getElementById('auth-form');
    var passwordInput = document.getElementById('auth-password');
    var errorEl = document.getElementById('auth-error');

    setTimeout(function () {
      passwordInput.focus();
    }, 0);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (passwordInput.value === PASSWORD) {
        setAuthenticated();
        document.body.classList.remove('is-locked');
        overlay.remove();
        return;
      }

      errorEl.textContent = 'Incorrect password.';
      passwordInput.value = '';
      passwordInput.focus();
    });
  }

  function init() {
    if (!isAuthenticated()) {
      lockPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
