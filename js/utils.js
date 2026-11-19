/**
 * KartaFlash - Utility Helpers
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});

  var ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  var COLOR_THEMES = {
    indigo: {
      bar: 'from-indigo-500 to-violet-500',
      badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      progress: 'bg-indigo-600 dark:bg-indigo-500',
      iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
      borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-500/50'
    },
    emerald: {
      bar: 'from-emerald-500 to-teal-500',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      progress: 'bg-emerald-600 dark:bg-emerald-500',
      iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-500/50'
    },
    sky: {
      bar: 'from-sky-500 to-cyan-500',
      badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
      progress: 'bg-sky-600 dark:bg-sky-500',
      iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
      borderHover: 'hover:border-sky-300 dark:hover:border-sky-500/50'
    },
    amber: {
      bar: 'from-amber-500 to-orange-500',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      progress: 'bg-amber-500 dark:bg-amber-400',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      borderHover: 'hover:border-amber-300 dark:hover:border-amber-500/50'
    },
    rose: {
      bar: 'from-rose-500 to-pink-500',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      progress: 'bg-rose-600 dark:bg-rose-500',
      iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
      borderHover: 'hover:border-rose-300 dark:hover:border-rose-500/50'
    },
    violet: {
      bar: 'from-violet-500 to-purple-500',
      badge: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
      progress: 'bg-violet-600 dark:bg-violet-500',
      iconBg: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
      borderHover: 'hover:border-violet-300 dark:hover:border-violet-500/50'
    }
  };

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
    return COLOR_THEMES[colorKey] || COLOR_THEMES.indigo;
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

    var palette = {
      success: 'bg-emerald-600 text-white border-emerald-500',
      error: 'bg-rose-600 text-white border-rose-500',
      warning: 'bg-amber-500 text-slate-950 border-amber-400',
      info: 'bg-slate-900 text-white dark:bg-slate-800 border-slate-700'
    };

    var iconSvg = {
      success: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />',
      error: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />',
      warning: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />',
      info: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
    };

    var t = type && palette[type] ? type : 'info';
    var toast = document.createElement('div');
    toast.className = 'toast-item pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ' + palette[t];
    toast.innerHTML =
      '<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
      iconSvg[t] +
      '</svg>' +
      '<span class="flex-1">' + escapeHtml(message) + '</span>';

    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 3000);
  }

  function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function isAnyModalOpen() {
    var modals = document.querySelectorAll('[role="dialog"]');
    for (var i = 0; i < modals.length; i++) {
      if (!modals[i].classList.contains('hidden')) {
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
    msgEl.textContent = opts.message || 'Apakah Anda yakin ingin melanjutkan?';
    okBtn.textContent = opts.confirmText || 'Ya, Lanjutkan';

    if (opts.variant === 'primary') {
      okBtn.className = 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors';
      iconBox.className = 'w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0';
    } else {
      okBtn.className = 'px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm transition-colors';
      iconBox.className = 'w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0';
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
