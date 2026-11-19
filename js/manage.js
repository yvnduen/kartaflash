/**
 * KartaFlash - Card Management (CRUD) View Module
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});

  var currentDeckId = null;
  var cardSearchQuery = '';
  var statusFilter = 'all'; // 'all' | 'unmastered' | 'mastered'

  function getFilteredCards(cards) {
    var q = cardSearchQuery.trim().toLowerCase();
    return cards.filter(function (c) {
      if (statusFilter === 'mastered' && !c.mastered) return false;
      if (statusFilter === 'unmastered' && c.mastered) return false;
      if (!q) return true;
      return (
        c.front.toLowerCase().indexOf(q) !== -1 ||
        c.back.toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function renderCardRow(card, index) {
    var frontDir = KF.utils.getTextDir(card.front);
    var backDir = KF.utils.getTextDir(card.back);
    var frontArabic = KF.utils.getArabicClass(card.front, false);
    var backArabic = KF.utils.getArabicClass(card.back, false);

    return (
      '<article data-card-id="' + KF.utils.escapeHtml(card.id) + '" class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:border-indigo-200 dark:hover:border-slate-700 transition-colors">' +
        '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">' +
          '<div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">' +
            '<!-- Front Side -->' +
            '<div class="min-w-0">' +
              '<span class="inline-block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">' +
                '#' + (index + 1) + ' • Sisi Depan' +
              '</span>' +
              '<p dir="' + frontDir + '" class="text-base font-semibold text-slate-900 dark:text-white break-words whitespace-pre-line ' + (frontArabic ? frontArabic + ' text-xl' : '') + '">' +
                KF.utils.escapeHtml(card.front) +
              '</p>' +
            '</div>' +

            '<!-- Back Side -->' +
            '<div class="min-w-0 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-4">' +
              '<span class="inline-block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">' +
                'Sisi Belakang' +
              '</span>' +
              '<p dir="' + backDir + '" class="text-sm sm:text-base text-slate-700 dark:text-slate-300 break-words whitespace-pre-line ' + (backArabic ? backArabic + ' text-lg' : '') + '">' +
                KF.utils.escapeHtml(card.back) +
              '</p>' +
            '</div>' +
          '</div>' +

          '<!-- Row Actions -->' +
          '<div class="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">' +
            '<button type="button" data-card-action="toggle-mastered" data-card-id="' + KF.utils.escapeHtml(card.id) + '" title="Klik untuk ubah status hafalan" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ' +
              (card.mastered
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/25') + '">' +
              '<span class="w-1.5 h-1.5 rounded-full ' + (card.mastered ? 'bg-emerald-500' : 'bg-amber-500') + '"></span>' +
              (card.mastered ? 'Sudah Hafal' : 'Belum Hafal') +
            '</button>' +

            '<div class="flex items-center gap-1">' +
              '<button type="button" data-card-action="edit" data-card-id="' + KF.utils.escapeHtml(card.id) + '" title="Edit Kartu" aria-label="Edit Kartu" class="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">' +
                '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />' +
                '</svg>' +
              '</button>' +
              '<button type="button" data-card-action="delete" data-card-id="' + KF.utils.escapeHtml(card.id) + '" title="Hapus Kartu" aria-label="Hapus Kartu" class="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">' +
                '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />' +
                '</svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function render(deckId) {
    if (deckId) {
      currentDeckId = deckId;
      cardSearchQuery = '';
      statusFilter = 'all';
    }

    var container = document.getElementById('manage-container');
    if (!container) return;

    var deck = KF.storage.getDeckById(currentDeckId);
    if (!deck) {
      KF.app.navigate('dashboard');
      return;
    }

    var stats = KF.utils.getDeckStats(deck);
    var filtered = getFilteredCards(deck.cards);
    var titleDir = KF.utils.getTextDir(deck.title);
    var titleArabic = KF.utils.getArabicClass(deck.title, false);

    container.innerHTML =
      '<!-- Top Header Bar -->' +
      '<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">' +
        '<div>' +
          '<button type="button" id="btn-manage-back" class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2">' +
            '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
            '</svg>' +
            'Kembali ke Dashboard' +
          '</button>' +
          '<h1 id="manage-heading" dir="' + titleDir + '" class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white ' + titleArabic + '">' +
            KF.utils.escapeHtml(deck.title) +
          '</h1>' +
          '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">' +
            stats.total + ' kartu total • ' + stats.mastered + ' dikuasai (' + stats.percentage + '%)' +
          '</p>' +
        '</div>' +

        '<div class="flex flex-wrap items-center gap-2.5">' +
          (stats.mastered > 0
            ? '<button type="button" id="btn-reset-deck-progress" class="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors">Reset Hafalan</button>'
            : '') +
          '<button type="button" id="btn-manage-flashcard" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-colors">' +
            'Mulai Flashcard' +
          '</button>' +
          '<button type="button" id="btn-manage-quiz" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-semibold transition-colors">' +
            'Mulai Kuis' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<!-- Add New Card Form -->' +
      '<section aria-label="Tambah kartu baru" class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">' +
        '<div class="flex flex-wrap items-center justify-between gap-2 mb-4">' +
          '<h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">' +
            '<span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">+</span>' +
            'Tambah Kartu Baru' +
          '</h2>' +
          '<span class="text-xs text-slate-400 dark:text-slate-500">Mendukung teks Arab (RTL) &amp; Latin • Tekan Ctrl+Enter untuk simpan</span>' +
        '</div>' +

        '<form id="form-add-card" class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
          '<div>' +
            '<label for="add-card-front" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Sisi Depan (Pertanyaan / Istilah)</label>' +
            '<textarea id="add-card-front" rows="2" required dir="auto" placeholder="Contoh: كِتَابٌ atau Semantic HTML" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"></textarea>' +
          '</div>' +

          '<div>' +
            '<label for="add-card-back" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Sisi Belakang (Jawaban / Arti)</label>' +
            '<textarea id="add-card-back" rows="2" required dir="auto" placeholder="Contoh: Buku atau Tag HTML bermakna jelas" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"></textarea>' +
          '</div>' +

          '<div class="md:col-span-2 flex justify-end">' +
            '<button type="submit" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-colors">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />' +
              '</svg>' +
              'Tambahkan Kartu' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</section>' +

      '<!-- Filter & Search Controls -->' +
      '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
        '<div class="relative flex-1 max-w-md">' +
          '<svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />' +
          '</svg>' +
          '<input id="input-search-cards" type="search" value="' + KF.utils.escapeHtml(cardSearchQuery) + '" placeholder="Cari istilah atau arti di deck ini..." class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />' +
        '</div>' +

        '<div class="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 text-xs font-semibold">' +
          renderFilterTab('all', 'Semua (' + deck.cards.length + ')') +
          renderFilterTab('unmastered', 'Belum Hafal (' + (stats.total - stats.mastered) + ')') +
          renderFilterTab('mastered', 'Sudah Hafal (' + stats.mastered + ')') +
        '</div>' +
      '</div>' +

      '<!-- Card List -->' +
      '<div id="manage-card-list" class="space-y-3">' +
        renderCardListHtml(deck, filtered) +
      '</div>';

    bindDynamicEvents();
  }

  function renderFilterTab(key, label) {
    var active = statusFilter === key;
    return (
      '<button type="button" data-filter-status="' + key + '" class="px-3 py-1.5 rounded-lg transition-colors ' +
        (active
          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white') + '">' +
        label +
      '</button>'
    );
  }

  function renderCardListHtml(deck, filtered) {
    if (deck.cards.length === 0) {
      return (
        '<div class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-10 text-center">' +
          '<p class="text-base font-bold text-slate-900 dark:text-white">Deck ini belum memiliki kartu</p>' +
          '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Gunakan formulir di atas untuk menambahkan kartu pertama Anda.</p>' +
        '</div>'
      );
    }

    if (filtered.length === 0) {
      return (
        '<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">' +
          '<p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada kartu yang cocok dengan filter atau pencarian saat ini.</p>' +
        '</div>'
      );
    }

    return filtered.map(function (card, idx) {
      return renderCardRow(card, idx);
    }).join('');
  }

  function refreshListOnly() {
    var deck = KF.storage.getDeckById(currentDeckId);
    if (!deck) return;
    var listEl = document.getElementById('manage-card-list');
    if (listEl) {
      listEl.innerHTML = renderCardListHtml(deck, getFilteredCards(deck.cards));
    }
  }

  function openEditCardModal(cardId) {
    var deck = KF.storage.getDeckById(currentDeckId);
    if (!deck) return;
    var card = deck.cards.find(function (c) { return c.id === cardId; });
    if (!card) return;

    document.getElementById('edit-card-id').value = card.id;
    var frontInput = document.getElementById('edit-card-front');
    var backInput = document.getElementById('edit-card-back');
    var masteredCheck = document.getElementById('edit-card-mastered');

    frontInput.value = card.front;
    backInput.value = card.back;
    masteredCheck.checked = Boolean(card.mastered);

    applyArabicInputStyle(frontInput);
    applyArabicInputStyle(backInput);

    KF.utils.openModal('modal-card');
    setTimeout(function () {
      frontInput.focus();
    }, 40);
  }

  function applyArabicInputStyle(el) {
    if (!el) return;
    if (KF.utils.hasArabic(el.value)) {
      el.classList.add('arabic-inline', 'text-base');
    } else {
      el.classList.remove('arabic-inline', 'text-base');
    }
  }

  function bindDynamicEvents() {
    var backBtn = document.getElementById('btn-manage-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        KF.app.navigate('dashboard');
      });
    }

    var flashBtn = document.getElementById('btn-manage-flashcard');
    if (flashBtn) {
      flashBtn.addEventListener('click', function () {
        KF.app.navigate('flashcard', currentDeckId);
      });
    }

    var quizBtn = document.getElementById('btn-manage-quiz');
    if (quizBtn) {
      quizBtn.addEventListener('click', function () {
        KF.app.navigate('quiz', currentDeckId);
      });
    }

    var resetBtn = document.getElementById('btn-reset-deck-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        KF.utils.confirmAction({
          title: 'Reset Progres Hafalan?',
          message: 'Semua kartu di deck ini akan ditandai kembali sebagai "Belum Hafal".',
          confirmText: 'Ya, Reset',
          variant: 'primary'
        }).then(function (ok) {
          if (!ok) return;
          KF.storage.resetDeckProgress(currentDeckId);
          render();
          KF.utils.showToast('Progres hafalan deck berhasil di-reset.', 'info');
        });
      });
    }

    var addForm = document.getElementById('form-add-card');
    var frontInput = document.getElementById('add-card-front');
    var backInput = document.getElementById('add-card-back');

    if (frontInput) {
      frontInput.addEventListener('input', function () { applyArabicInputStyle(frontInput); });
      frontInput.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && addForm) {
          e.preventDefault();
          addForm.requestSubmit();
        }
      });
    }
    if (backInput) {
      backInput.addEventListener('input', function () { applyArabicInputStyle(backInput); });
      backInput.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && addForm) {
          e.preventDefault();
          addForm.requestSubmit();
        }
      });
    }

    if (addForm) {
      addForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var front = frontInput.value.trim();
        var back = backInput.value.trim();
        if (!front || !back) {
          KF.utils.showToast('Sisi depan dan sisi belakang wajib diisi.', 'warning');
          return;
        }
        KF.storage.addCard(currentDeckId, front, back);
        KF.utils.showToast('Kartu baru berhasil ditambahkan.', 'success');
        render();
        var newFront = document.getElementById('add-card-front');
        if (newFront) newFront.focus();
      });
    }

    var searchInput = document.getElementById('input-search-cards');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        cardSearchQuery = e.target.value || '';
        refreshListOnly();
      });
    }

    var filterBtns = document.querySelectorAll('[data-filter-status]');
    for (var i = 0; i < filterBtns.length; i++) {
      filterBtns[i].addEventListener('click', function (e) {
        statusFilter = e.currentTarget.getAttribute('data-filter-status');
        render();
      });
    }

    var listEl = document.getElementById('manage-card-list');
    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-card-action]');
        if (!btn) return;

        var action = btn.getAttribute('data-card-action');
        var cardId = btn.getAttribute('data-card-id');
        var deck = KF.storage.getDeckById(currentDeckId);
        if (!deck) return;
        var card = deck.cards.find(function (c) { return c.id === cardId; });
        if (!card) return;

        if (action === 'toggle-mastered') {
          KF.storage.setCardMastered(currentDeckId, cardId, !card.mastered);
          render();
        } else if (action === 'edit') {
          openEditCardModal(cardId);
        } else if (action === 'delete') {
          KF.utils.confirmAction({
            title: 'Hapus Kartu?',
            message: 'Kartu "' + card.front + '" akan dihapus dari deck ini.',
            confirmText: 'Hapus Kartu',
            variant: 'danger'
          }).then(function (ok) {
            if (!ok) return;
            KF.storage.deleteCard(currentDeckId, cardId);
            render();
            KF.utils.showToast('Kartu telah dihapus.', 'info');
          });
        }
      });
    }
  }

  function bindGlobalModalEvents() {
    var editForm = document.getElementById('form-edit-card');
    var editFront = document.getElementById('edit-card-front');
    var editBack = document.getElementById('edit-card-back');

    if (editFront) editFront.addEventListener('input', function () { applyArabicInputStyle(editFront); });
    if (editBack) editBack.addEventListener('input', function () { applyArabicInputStyle(editBack); });

    if (editForm) {
      editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var cardId = document.getElementById('edit-card-id').value;
        var front = editFront.value.trim();
        var back = editBack.value.trim();
        var mastered = document.getElementById('edit-card-mastered').checked;

        if (!front || !back) {
          KF.utils.showToast('Sisi depan dan sisi belakang tidak boleh kosong.', 'warning');
          return;
        }

        KF.storage.updateCard(currentDeckId, cardId, {
          front: front,
          back: back,
          mastered: mastered
        });
        KF.utils.closeModal('modal-card');
        render();
        KF.utils.showToast('Perubahan kartu disimpan.', 'success');
      });
    }
  }

  KF.manage = {
    render: render,
    bindEvents: bindGlobalModalEvents
  };
})(typeof window !== 'undefined' ? window : globalThis);
