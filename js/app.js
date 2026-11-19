/**
 * KartaFlash - Main Application Controller & Hash Router
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});
  var currentView = 'dashboard';
  var currentDeckId = null;

  function updateThemeUi() {
    var isDark = document.documentElement.classList.contains('dark');
    var label = document.getElementById('theme-label');
    if (label) {
      label.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
    }
  }

  function toggleTheme() {
    var html = document.documentElement;
    var isDark = html.classList.toggle('dark');
    KF.storage.saveTheme(isDark ? 'dark' : 'light');
    updateThemeUi();
  }

  function updateBreadcrumb(view, deckId) {
    var crumbWrap = document.getElementById('header-breadcrumb');
    var crumbText = document.getElementById('header-breadcrumb-text');
    if (!crumbWrap || !crumbText) return;

    if (view === 'dashboard') {
      crumbWrap.classList.add('is-hidden');
      return;
    }

    var labels = {
      manage: 'Kelola Kartu',
      flashcard: 'Flashcard',
      quiz: 'Kuis'
    };
    var deck = deckId ? KF.storage.getDeckById(deckId) : null;
    var prefix = labels[view] || '';
    crumbText.textContent = deck ? prefix + ': ' + deck.title : prefix;
    crumbWrap.classList.remove('is-hidden');
  }

  function syncUrlHash(view, deckId) {
    if (!global.location) return;
    var targetHash = view === 'dashboard'
      ? '#dashboard'
      : '#' + view + (deckId ? '/' + encodeURIComponent(deckId) : '');

    if (global.location.hash !== targetHash) {
      if (global.history && global.history.pushState) {
        global.history.pushState(null, '', targetHash);
      } else {
        global.location.hash = targetHash;
      }
    }
  }

  function parseHashRoute() {
    var raw = (global.location && global.location.hash) ? global.location.hash.replace(/^#/, '') : '';
    if (!raw) return { view: 'dashboard', deckId: null };

    var parts = raw.split('/');
    var view = parts[0];
    var deckId = parts[1] ? decodeURIComponent(parts[1]) : null;

    if (view !== 'dashboard' && view !== 'manage' && view !== 'flashcard' && view !== 'quiz') {
      return { view: 'dashboard', deckId: null };
    }
    if (view !== 'dashboard' && (!deckId || !KF.storage.getDeckById(deckId))) {
      return { view: 'dashboard', deckId: null };
    }
    return { view: view, deckId: deckId };
  }

  function navigate(view, deckId, skipHashSync) {
    if (currentView === 'quiz' && view !== 'quiz') {
      KF.quiz.cleanup();
    }

    if (KF.dashboard && KF.dashboard.closeAllDeckMenus) {
      KF.dashboard.closeAllDeckMenus();
    }

    currentView = view;
    currentDeckId = deckId || null;

    var isFocusMode = view === 'flashcard' || view === 'quiz';
    document.body.classList.toggle('focus-mode', isFocusMode);

    var views = ['dashboard', 'manage', 'flashcard', 'quiz'];
    for (var i = 0; i < views.length; i++) {
      var el = document.getElementById('view-' + views[i]);
      if (!el) continue;
      el.classList.toggle('is-hidden', views[i] !== view);
    }

    updateBreadcrumb(view, deckId);

    if (!skipHashSync) {
      syncUrlHash(view, deckId);
    }

    if (view === 'dashboard') {
      KF.dashboard.render();
    } else if (view === 'manage') {
      KF.manage.render(deckId);
    } else if (view === 'flashcard') {
      KF.flashcard.start(deckId);
    } else if (view === 'quiz') {
      KF.quiz.start(deckId);
    }

    if (global.scrollTo) {
      global.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function bindGlobalUi() {
    var homeBtn = document.getElementById('btn-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', function () {
        navigate('dashboard');
      });
    }

    var themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    var dataModalBtn = document.getElementById('btn-data-modal');
    if (dataModalBtn) {
      dataModalBtn.addEventListener('click', function () {
        KF.utils.openModal('modal-data');
      });
    }

    var shortcutsBtn = document.getElementById('btn-shortcuts');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', function () {
        KF.utils.openModal('modal-shortcuts');
      });
    }

    var resetSamplesBtn = document.getElementById('btn-reset-samples');
    if (resetSamplesBtn) {
      resetSamplesBtn.addEventListener('click', function () {
        KF.utils.closeModal('modal-data');
        KF.utils.confirmAction({
          title: 'Muat Ulang Deck Contoh?',
          message: 'Tindakan ini akan mengganti seluruh daftar deck saat ini dengan 3 deck contoh bawaan.',
          confirmText: 'Ya, Muat Ulang',
          variant: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          KF.storage.resetToDefaultDecks();
          navigate('dashboard');
          KF.utils.showToast('Deck contoh bawaan dimuat ulang.', 'success');
        });
      });
    }

    // Modal close buttons & backdrop clicks
    var closeBtns = document.querySelectorAll('[data-close-modal]');
    for (var i = 0; i < closeBtns.length; i++) {
      closeBtns[i].addEventListener('click', function (e) {
        var modalId = e.currentTarget.getAttribute('data-close-modal');
        KF.utils.closeModal(modalId);
      });
    }

    var closableModals = ['modal-deck', 'modal-card', 'modal-shortcuts', 'modal-data'];
    for (var j = 0; j < closableModals.length; j++) {
      (function (mId) {
        var modalEl = document.getElementById(mId);
        if (!modalEl) return;
        modalEl.addEventListener('click', function (e) {
          if (e.target === modalEl) {
            KF.utils.closeModal(mId);
          }
        });
      })(closableModals[j]);
    }

    // Hash routing synchronization (browser Back/Forward)
    global.addEventListener('hashchange', function () {
      var parsed = parseHashRoute();
      if (parsed.view !== currentView || parsed.deckId !== currentDeckId) {
        navigate(parsed.view, parsed.deckId, true);
      }
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (KF.dashboard && KF.dashboard.closeAllDeckMenus) {
          KF.dashboard.closeAllDeckMenus();
        }
        if (KF.utils.isAnyModalOpen()) {
          KF.utils.resolvePendingConfirm(false);
          KF.utils.closeModal('modal-deck');
          KF.utils.closeModal('modal-card');
          KF.utils.closeModal('modal-shortcuts');
          KF.utils.closeModal('modal-data');
        }
        return;
      }

      if (KF.utils.isAnyModalOpen()) return;

      var active = document.activeElement;
      var tag = active ? active.tagName : '';
      var isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (active && active.isContentEditable);

      if (isEditable) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        KF.utils.openModal('modal-shortcuts');
        return;
      }

      if (currentView === 'flashcard') {
        if ((e.code === 'Space' || e.key === ' ') && active && active.tagName === 'BUTTON') {
          active.blur();
        }
        KF.flashcard.handleKeydown(e);
      } else if (currentView === 'quiz') {
        KF.quiz.handleKeydown(e);
      }
    });
  }

  function init() {
    updateThemeUi();
    KF.dashboard.bindEvents();
    KF.manage.bindEvents();
    bindGlobalUi();

    var initial = parseHashRoute();
    navigate(initial.view, initial.deckId, true);
  }

  KF.app = {
    navigate: navigate,
    getCurrentView: function () { return currentView; },
    init: init
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
