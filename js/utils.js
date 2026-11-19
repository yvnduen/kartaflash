/**
 * KartaFlash - Utility Helpers
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});

  var ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  var COLOR_THEMES = {
    emerald: { themeClass: 'deck-theme-emerald', label: 'Hijau Zamrud' },
    indigo: { themeClass: 'deck-theme-indigo', label: 'Biru Tinta' },
    sky: { themeClass: 'deck-theme-sky', label: 'Biru Arsip' },
    amber: { themeClass: 'deck-theme-amber', label: 'Kuning Okra' },
    rose: { themeClass: 'deck-theme-rose', label: 'Terakota' },
    violet: { themeClass: 'deck-theme-violet', label: 'Ungu Anggur' }
  };

  var modalReturnFocus = {};
  var activeFocusTrapHandler = null;

  function generateId(prefix) {
    var p = prefix || 'id';
    var rand = Math.random().toString(36).slice(2, 8);
    return p + '_' + Date.now().toString(36) + '_' + rand;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hasArabic(str) {
    if (!str) return false;
    return ARABIC_REGEX.test(String(str));
  }

  function getTextDir(str) {
    return hasArabic(str) ? 'rtl' : 'ltr';
  }

  function getArabicClass(str, large) {
    if (!hasArabic(str)) return '';
    return large ? 'arabic-text' : 'arabic-inline';
  }

  function shuffleArray(arr) {
    var copy = Array.isArray(arr) ? arr.slice() : [];
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function slugify(str) {
    var slug = String(str || 'deck')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return slug || 'deck';
  }

  function getDeckStats(deck) {
    var cards = (deck && Array.isArray(deck.cards)) ? deck.cards : [];
    var total = cards.length;
    var mastered = 0;
    for (var i = 0; i < total; i++) {
      if (cards[i] && cards[i].mastered) {
        mastered++;
      }
    }
    var percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { total: total, mastered: mastered, percentage: percentage };
  }

  function getColorTheme(colorKey) {
    return COLOR_THEMES[colorKey] || COLOR_THEMES.emerald;
  }

  function downloadJson(filename, data) {
    var jsonStr = JSON.stringify(data, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    while (container.children.length >= 3) {
      container.removeChild(container.firstElementChild);
    }

    var typeClass = {
      success: 'toast-success',
      error: 'toast-error',
      warning: 'toast-warning',
      info: 'toast-info'
    };

    var iconSvg = {
      success: '<polyline points="20 6 9 17 4 12"></polyline>',
      error: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
      info: '<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
    };

    var t = type && typeClass[type] ? type : 'info';
    var toast = document.createElement('div');
    toast.className = 'toast-item ' + typeClass[t];
    toast.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        iconSvg[t] +
      '</svg>' +
      '<span>' + escapeHtml(message) + '</span>';

    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 2800);
  }

  function getFocusableElements(container) {
    var nodes = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    var visible = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].offsetParent !== null) {
        visible.push(nodes[i]);
      }
    }
    return visible;
  }

  function attachFocusTrap(modal) {
    detachFocusTrap();
    activeFocusTrapHandler = function (e) {
      if (e.key !== 'Tab') return;
      var focusables = getFocusableElements(modal);
      if (focusables.length === 0) return;

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !modal.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !modal.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', activeFocusTrapHandler);
  }

  function detachFocusTrap() {
    if (activeFocusTrapHandler) {
      document.removeEventListener('keydown', activeFocusTrapHandler);
      activeFocusTrapHandler = null;
    }
  }

  function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    modalReturnFocus[modalId] = document.activeElement;
    modal.classList.remove('is-hidden');
    attachFocusTrap(modal);

    var focusables = getFocusableElements(modal);
    if (focusables.length > 0) {
      setTimeout(function () {
        focusables[0].focus();
      }, 20);
    }
  }

  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal || modal.classList.contains('is-hidden')) return;
    modal.classList.add('is-hidden');
    detachFocusTrap();

    var prev = modalReturnFocus[modalId];
    delete modalReturnFocus[modalId];
    if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
      prev.focus();
    }
  }

  function isAnyModalOpen() {
    var modals = document.querySelectorAll('[role="dialog"]');
    for (var i = 0; i < modals.length; i++) {
      if (!modals[i].classList.contains('is-hidden')) {
        return true;
      }
    }
    return false;
  }

  var confirmResolver = null;

  function confirmAction(options) {
    var opts = options || {};
    var modal = document.getElementById('modal-confirm');
    var titleEl = document.getElementById('modal-confirm-title');
    var msgEl = document.getElementById('modal-confirm-message');
    var okBtn = document.getElementById('btn-confirm-ok');
    var cancelBtn = document.getElementById('btn-confirm-cancel');
    var iconBox = document.getElementById('modal-confirm-icon');

    if (!modal || !titleEl || !msgEl || !okBtn || !cancelBtn) {
      return Promise.resolve(false);
    }

    titleEl.textContent = opts.title || 'Konfirmasi';
    msgEl.textContent = opts.message || 'Apakah kamu yakin ingin melanjutkan?';
    okBtn.textContent = opts.confirmText || 'Ya, Lanjutkan';

    if (opts.variant === 'primary') {
      okBtn.className = 'btn btn-primary';
      iconBox.className = 'confirm-icon confirm-icon-primary';
    } else {
      okBtn.className = 'btn btn-danger';
      iconBox.className = 'confirm-icon confirm-icon-danger';
    }

    openModal('modal-confirm');
    setTimeout(function () {
      okBtn.focus();
    }, 30);

    return new Promise(function (resolve) {
      confirmResolver = resolve;

      function finish(result) {
        closeModal('modal-confirm');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        confirmResolver = null;
        resolve(result);
      }

      function onOk() { finish(true); }
      function onCancel() { finish(false); }
      function onBackdrop(e) {
        if (e.target === modal) finish(false);
      }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
    });
  }

  function resolvePendingConfirm(result) {
    if (confirmResolver) {
      var cancelBtn = document.getElementById('btn-confirm-cancel');
      if (cancelBtn && !result) cancelBtn.click();
    }
  }

  KF.utils = {
    generateId: generateId,
    escapeHtml: escapeHtml,
    hasArabic: hasArabic,
    getTextDir: getTextDir,
    getArabicClass: getArabicClass,
    shuffleArray: shuffleArray,
    slugify: slugify,
    getDeckStats: getDeckStats,
    getColorTheme: getColorTheme,
    downloadJson: downloadJson,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    isAnyModalOpen: isAnyModalOpen,
    confirmAction: confirmAction,
    resolvePendingConfirm: resolvePendingConfirm
  };
})(typeof window !== 'undefined' ? window : globalThis);
