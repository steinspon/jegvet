(function () {
  'use strict';

  var FIREBASE_VERSION = '12.13.0';
  var LOGIN_PAGE = 'login.html';
  var firebaseConfig = {
    apiKey: 'AIzaSyAF-D7MsW4aXEJLPOMHWr-58tXm7BflvGw',
    authDomain: 'jegvet-fecaa.firebaseapp.com',
    projectId: 'jegvet-fecaa',
    storageBucket: 'jegvet-fecaa.firebasestorage.app',
    messagingSenderId: '682246319643',
    appId: '1:682246319643:web:94f779100c4ae3ee4152be',
    measurementId: 'G-2K5MF2PRM0'
  };

  var authState = {
    ready: false,
    user: null
  };

  function isLoginPage() {
    var path = (window.location.pathname || '').toLowerCase();
    return path.endsWith('/' + LOGIN_PAGE) || path.endsWith(LOGIN_PAGE);
  }

  function lockPage() {
    if (!document.body) {
      return;
    }
    document.body.classList.add('is-locked');
  }

  function unlockPage() {
    if (!document.body) {
      return;
    }
    document.body.classList.remove('is-locked');
  }

  function dispatchAuthChange() {
    document.dispatchEvent(new CustomEvent('jegvet:authchange', {
      detail: {
        ready: authState.ready,
        user: authState.user
      }
    }));
  }

  function exposeAuthApi(auth) {
    var firestore = null;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      firestore = window.firebase.firestore();
    }

    function getCurrentUser() {
      return auth.currentUser || null;
    }

    function settingsKeyFor(uid) {
      return 'jegvet:user:' + uid + ':settings';
    }

    function readUserSettings(uid) {
      try {
        var raw = window.localStorage.getItem(settingsKeyFor(uid));
        if (!raw) {
          return {};
        }
        var parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return {};
      }
    }

    function ensureAuthAndDb() {
      var user = getCurrentUser();
      if (!user) {
        return { error: 'No signed-in user.', user: null, db: null };
      }
      if (!firestore) {
        return { error: 'Firestore is not available.', user: null, db: null };
      }
      return { error: '', user: user, db: firestore };
    }

    function normalizeEmail(email) {
      return String(email || '').trim().toLowerCase();
    }

    function randomId() {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    window.JegVetAuth = {
      getState: function () {
        return {
          ready: authState.ready,
          user: authState.user
        };
      },
      getUser: function () {
        return getCurrentUser();
      },
      updateDisplayName: function (displayName) {
        var user = getCurrentUser();
        if (!user) {
          return Promise.reject(new Error('No signed-in user.'));
        }
        return user.updateProfile({ displayName: String(displayName || '').trim() })
          .then(function () {
            authState.user = getCurrentUser();
            dispatchAuthChange();
          });
      },
      getUserSetting: function (key, fallbackValue) {
        var user = getCurrentUser();
        if (!user || !user.uid) {
          return fallbackValue;
        }
        var settings = readUserSettings(user.uid);
        if (!Object.prototype.hasOwnProperty.call(settings, key)) {
          return fallbackValue;
        }
        return settings[key];
      },
      setUserSetting: function (key, value) {
        var user = getCurrentUser();
        if (!user || !user.uid) {
          return false;
        }
        try {
          var settings = readUserSettings(user.uid);
          settings[key] = value;
          window.localStorage.setItem(settingsKeyFor(user.uid), JSON.stringify(settings));
          return true;
        } catch (error) {
          return false;
        }
      },
      listJournalEntries: function () {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        return ctx.db.collection('journalEntries')
          .where('uid', '==', ctx.user.uid)
          .get()
          .then(function (snapshot) {
            var rows = [];
            snapshot.forEach(function (doc) {
              var data = doc.data() || {};
              rows.push({
                id: doc.id,
                title: data.title || '',
                content: data.content || '',
                createdAt: data.createdAt || null,
                updatedAt: data.updatedAt || null
              });
            });
            rows.sort(function (a, b) {
              var aSec = a.updatedAt && typeof a.updatedAt.seconds === 'number' ? a.updatedAt.seconds : 0;
              var bSec = b.updatedAt && typeof b.updatedAt.seconds === 'number' ? b.updatedAt.seconds : 0;
              return bSec - aSec;
            });
            return rows;
          });
      },
      createJournalEntry: function (title, content) {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        var now = window.firebase.firestore.FieldValue.serverTimestamp();
        return ctx.db.collection('journalEntries').add({
          uid: ctx.user.uid,
          title: String(title || '').trim() || 'Untitled',
          content: String(content || ''),
          createdAt: now,
          updatedAt: now
        });
      },
      updateJournalEntry: function (entryId, title, content) {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        if (!entryId) {
          return Promise.reject(new Error('Entry ID is required.'));
        }
        return ctx.db.collection('journalEntries').doc(entryId).update({
          title: String(title || '').trim() || 'Untitled',
          content: String(content || ''),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      },
      deleteJournalEntry: function (entryId) {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        if (!entryId) {
          return Promise.reject(new Error('Entry ID is required.'));
        }
        return ctx.db.collection('journalEntries').doc(entryId).delete();
      },
      createTeam: function (name) {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        var cleanName = String(name || '').trim();
        if (!cleanName) {
          return Promise.reject(new Error('Team name is required.'));
        }

        var teamRef = ctx.db.collection('teams').doc();
        var now = window.firebase.firestore.FieldValue.serverTimestamp();
        var batch = ctx.db.batch();
        batch.set(teamRef, {
          name: cleanName,
          ownerUid: ctx.user.uid,
          createdAt: now
        });
        batch.set(teamRef.collection('members').doc(ctx.user.uid), {
          uid: ctx.user.uid,
          role: 'owner',
          joinedAt: now
        });
        return batch.commit().then(function () {
          return { id: teamRef.id, name: cleanName };
        });
      },
      listTeams: function () {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        return ctx.db.collectionGroup('members')
          .where('uid', '==', ctx.user.uid)
          .get()
          .then(function (snapshot) {
            var refs = [];
            var roles = {};
            snapshot.forEach(function (doc) {
              var teamRef = doc.ref.parent.parent;
              if (teamRef) {
                refs.push(teamRef);
                roles[teamRef.id] = (doc.data() || {}).role || 'viewer';
              }
            });
            if (!refs.length) {
              return [];
            }
            return Promise.all(refs.map(function (teamRef) {
              return teamRef.get().then(function (teamDoc) {
                var data = teamDoc.data() || {};
                return {
                  id: teamDoc.id,
                  name: data.name || 'Unnamed team',
                  ownerUid: data.ownerUid || '',
                  role: roles[teamDoc.id] || 'viewer'
                };
              });
            }));
          });
      },
      createTeamInvite: function (teamId, inviteeEmail, role) {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        var cleanEmail = normalizeEmail(inviteeEmail);
        var cleanRole = role === 'viewer' ? 'viewer' : 'editor';
        if (!teamId) {
          return Promise.reject(new Error('Team ID is required.'));
        }
        if (!cleanEmail) {
          return Promise.reject(new Error('Invite email is required.'));
        }
        return ctx.db.collection('teamInvites').add({
          teamId: teamId,
          inviteeEmail: cleanEmail,
          role: cleanRole,
          status: 'pending',
          createdByUid: ctx.user.uid,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          token: randomId()
        });
      },
      listPendingInvites: function () {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        var email = normalizeEmail(ctx.user.email || '');
        if (!email) {
          return Promise.resolve([]);
        }
        return ctx.db.collection('teamInvites')
          .where('inviteeEmail', '==', email)
          .where('status', '==', 'pending')
          .get()
          .then(function (snapshot) {
            var rows = [];
            snapshot.forEach(function (doc) {
              var data = doc.data() || {};
              rows.push({
                id: doc.id,
                teamId: data.teamId || '',
                role: data.role || 'viewer',
                inviteeEmail: data.inviteeEmail || '',
                createdAt: data.createdAt || null
              });
            });
            return rows;
          });
      },
      acceptTeamInvite: function (inviteId) {
        var ctx = ensureAuthAndDb();
        if (ctx.error) {
          return Promise.reject(new Error(ctx.error));
        }
        if (!inviteId) {
          return Promise.reject(new Error('Invite ID is required.'));
        }
        var userEmail = normalizeEmail(ctx.user.email || '');
        var inviteRef = ctx.db.collection('teamInvites').doc(inviteId);
        return ctx.db.runTransaction(function (tx) {
          return tx.get(inviteRef).then(function (inviteDoc) {
            if (!inviteDoc.exists) {
              throw new Error('Invite does not exist.');
            }
            var invite = inviteDoc.data() || {};
            if (invite.status !== 'pending') {
              throw new Error('Invite is not pending.');
            }
            if (normalizeEmail(invite.inviteeEmail) !== userEmail) {
              throw new Error('This invite is for a different email.');
            }
            if (!invite.teamId) {
              throw new Error('Invite has no team.');
            }
            var memberRef = ctx.db.collection('teams').doc(invite.teamId).collection('members').doc(ctx.user.uid);
            tx.set(memberRef, {
              uid: ctx.user.uid,
              role: invite.role === 'owner' ? 'editor' : (invite.role || 'viewer'),
              joinedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            tx.update(inviteRef, {
              status: 'accepted',
              acceptedByUid: ctx.user.uid,
              acceptedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        });
      },
      signOut: function () {
        return auth.signOut();
      }
    };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.addEventListener('load', function () {
        script.setAttribute('data-loaded', 'true');
        resolve();
      }, { once: true });
      script.addEventListener('error', function () {
        reject(new Error('Failed to load ' + src));
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function getNextUrl() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    if (!next) {
      return 'index.html';
    }
    if (/^https?:\/\//i.test(next) || next.indexOf('//') === 0) {
      return 'index.html';
    }
    return next;
  }

  function redirectToLogin() {
    var current = window.location.pathname.split('/').pop() || 'index.html';
    var query = window.location.search || '';
    var hash = window.location.hash || '';
    var next = encodeURIComponent(current + query + hash);
    window.location.replace(LOGIN_PAGE + '?next=' + next);
  }

  function setMessage(text, isError) {
    var el = document.getElementById('login-message');
    if (!el) {
      return;
    }
    el.textContent = text || '';
    el.classList.toggle('auth-error', !!isError);
  }

  function attachLoginForm(auth) {
    var form = document.getElementById('login-form');
    if (!form) {
      return;
    }

    var emailInput = document.getElementById('login-email');
    var passwordInput = document.getElementById('login-password');
    var submitBtn = document.getElementById('login-submit');
    var googleBtn = document.getElementById('login-google');
    var modeBtn = document.getElementById('login-mode-toggle');
    var createMode = false;

    function applyModeUi() {
      submitBtn.textContent = createMode ? 'Create account' : 'Sign in with email';
      modeBtn.textContent = createMode ? 'I already have an account' : 'Create account';
    }

    function setFriendlyError(code) {
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setMessage('Invalid email or password.', true);
      } else if (code === 'auth/email-already-in-use') {
        setMessage('This email already has an account. Sign in instead.', true);
      } else if (code === 'auth/weak-password') {
        setMessage('Password is too weak. Use at least 6 characters.', true);
      } else if (code === 'auth/popup-closed-by-user') {
        setMessage('Google sign-in was cancelled.', true);
      } else if (code === 'auth/unauthorized-domain') {
        setMessage('This domain is not authorized in Firebase Auth settings.', true);
      } else if (code === 'auth/too-many-requests') {
        setMessage('Too many attempts. Try again later.', true);
      } else if (code === 'auth/network-request-failed') {
        setMessage('Network error. Check your connection.', true);
      } else {
        setMessage('Sign-in failed. ' + (code || 'unknown error'), true);
      }
    }

    applyModeUi();

    if (modeBtn) {
      modeBtn.addEventListener('click', function () {
        createMode = !createMode;
        applyModeUi();
        setMessage('', false);
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', function () {
        googleBtn.disabled = true;
        setMessage('Opening Google sign-in...', false);
        var provider = new window.firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
          .catch(function (error) {
            var code = error && error.code ? String(error.code) : '';
            setFriendlyError(code);
          })
          .finally(function () {
            googleBtn.disabled = false;
          });
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!emailInput || !passwordInput) {
        return;
      }

      var email = String(emailInput.value || '').trim();
      var password = String(passwordInput.value || '');
      if (!email || !password) {
        setMessage('Enter email and password.', true);
        return;
      }

      submitBtn.disabled = true;
      setMessage(createMode ? 'Creating account...' : 'Signing in...', false);

      var authPromise = createMode
        ? auth.createUserWithEmailAndPassword(email, password)
        : auth.signInWithEmailAndPassword(email, password);

      authPromise
        .then(function () {
          setMessage(createMode ? 'Account created.' : 'Signed in.', false);
        })
        .catch(function (error) {
          var code = error && error.code ? String(error.code) : '';
          setFriendlyError(code);
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }

  function handleAuthState(user) {
    authState.ready = true;
    authState.user = user || null;
    dispatchAuthChange();

    if (user) {
      unlockPage();
      if (isLoginPage()) {
        window.location.replace(getNextUrl());
      }
      return;
    }

    if (isLoginPage()) {
      unlockPage();
      return;
    }

    redirectToLogin();
  }

  function startAuth() {
    lockPage();

    Promise.all([
      loadScript('https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/firebase-app-compat.js'),
      loadScript('https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/firebase-auth-compat.js'),
      loadScript('https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/firebase-firestore-compat.js')
    ]).then(function () {
      if (!window.firebase || !window.firebase.initializeApp) {
        throw new Error('Firebase SDK not available');
      }

      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      }

      var auth = window.firebase.auth();
      exposeAuthApi(auth);
      attachLoginForm(auth);
      auth.onAuthStateChanged(handleAuthState);
    }).catch(function (error) {
      lockPage();
      setMessage('Auth setup failed. ' + (error && error.message ? error.message : ''), true);
      console.error(error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAuth);
  } else {
    startAuth();
  }
})();
