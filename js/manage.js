/**
 * KartaFlash - Card Management (CRUD & Bulk Authoring) View Module
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});

  var currentDeckId = null;
  var cardSearchQuery = '';
  var statusFilter = 'all'; // 'all' | 'unmastered' | 'mastered'
  var authorMode = 'single'; // 'single' | 'bulk'
  var lastHighlightedCardId = null;

  function parseBulkLines(rawText) {
    var lines = String(rawText || '').split(/\r?\n/);
    var pairs = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var parts = null;
      if (line.indexOf('\t') !== -1) {
        parts = line.split('\t');
      } else if (line.indexOf(' = ') !== -1) {
        parts = line.split(' = ');
      } else if (line.indexOf(' | ') !== -1) {
        parts = line.split(' | ');
      } else if (line.indexOf(' - ') !== -1) {
        parts = line.split(' - ');
      } else if (line.indexOf('=') !== -1) {
        parts = line.split('=');
      } else if (line.indexOf('|') !== -1) {
        parts = line.split('|');
      }

      if (parts && parts.length >= 2) {
        var front = parts[0].trim();
        var back = parts.slice(1).join(' ').trim();
        if (front && back) {
          pairs.push({ front: front, back: back });
        }
      }
    }
    return pairs;
  }

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
    var cardIdEsc = KF.utils.escapeHtml(card.id);
    var highlightClass = card.id === lastHighlightedCardId ? ' is-highlighted' : '';

    return (
      '<article data-card-id="' + cardIdEsc + '" class="card-row' + highlightClass + '">' +
        '<div class="card-row-sides">' +
          '<div class="card-side">' +
            '<span class="card-side-label">#' + (index + 1) + ' · Sisi Depan</span>' +
            '<p dir="' + frontDir + '" class="card-side-text card-side-front ' + frontArabic + '">' +
              KF.utils.escapeHtml(card.front) +
            '</p>' +
          '</div>' +

          '<div class="card-side">' +
            '<span class="card-side-label">Sisi Belakang</span>' +
            '<p dir="' + backDir + '" class="card-side-text ' + backArabic + '">' +
              KF.utils.escapeHtml(card.back) +
            '</p>' +
          '</div>' +
        '</div>' +

        '<div class="card-row-actions">' +
          '<button type="button" data-card-action="toggle-mastered" data-card-id="' + cardIdEsc + '" title="Klik untuk ubah status hafalan" class="status-pill ' +
            (card.mastered ? 'status-pill-mastered' : 'status-pill-learning') + '" style="border:none;">' +
            '<span class="status-pill-dot"></span>' +
            (card.mastered ? 'Sudah Hafal' : 'Belum Hafal') +
          '</button>' +

          '<div class="card-row-btns">' +
            '<button type="button" data-card-action="edit" data-card-id="' + cardIdEsc + '" title="Edit Kartu" aria-label="Edit Kartu" class="btn btn-icon btn-ghost">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M12 20h9"></path>' +
                '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
              '</svg>' +
            '</button>' +
            '<button type="button" data-card-action="delete" data-card-id="' + cardIdEsc + '" title="Hapus Kartu" aria-label="Hapus Kartu" class="btn btn-icon btn-ghost">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="3 6 5 6 21 6"></polyline>' +
                '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
                '<path d="M10 11v6M14 11v6"></path>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderFilterTab(key, label) {
    var active = statusFilter === key;
    return (
      '<button type="button" data-filter-status="' + key + '" class="segmented-tab ' + (active ? 'is-active' : '') + '">' +
        label +
      '</button>'
    );
  }

  function renderCardListHtml(deck, filtered) {
    if (deck.cards.length === 0) {
      return (
        '<div class="empty-paper-state" style="max-width:none;margin:0;padding:2.25rem 1.25rem;">' +
          '<h3 class="empty-title" style="font-size:1.15rem;">Deck ini belum memiliki kartu</h3>' +
          '<p class="empty-desc">Gunakan formulir di atas untuk menulis kartu pertama atau tempel daftar kosakata sekaligus.</p>' +
        '</div>'
      );
    }

    if (filtered.length === 0) {
      return (
        '<div class="empty-paper-state" style="max-width:none;margin:0;padding:2rem 1.25rem;">' +
          '<p class="empty-desc" style="margin-top:0;">Tidak ada kartu yang cocok dengan filter atau pencarian saat ini.</p>' +
        '</div>'
      );
    }

    return filtered.map(function (card, idx) {
      return renderCardRow(card, idx);
    }).join('');
  }

  function render(deckId) {
    if (deckId) {
      currentDeckId = deckId;
      cardSearchQuery = '';
      statusFilter = 'all';
      lastHighlightedCardId = null;
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
      '<!-- Header -->' +
      '<div class="manage-header">' +
        '<div>' +
          '<button type="button" id="btn-manage-back" class="back-link">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="15 18 9 12 15 6"></polyline>' +
            '</svg>' +
            'Kembali ke Meja Belajar' +
          '</button>' +
          '<h1 id="manage-heading" dir="' + titleDir + '" class="page-title ' + titleArabic + '">' +
            KF.utils.escapeHtml(deck.title) +
          '</h1>' +
          '<p id="manage-stats-sub" class="manage-sub">' +
            '<span class="font-mono">' + stats.total + '</span> kartu · <span class="font-mono">' + stats.mastered + '</span> sudah hafal (<span class="font-mono">' + stats.percentage + '%</span>)' +
          '</p>' +
        '</div>' +

        '<div class="manage-header-actions">' +
          (stats.mastered > 0
            ? '<button type="button" id="btn-reset-deck-progress" class="btn btn-secondary btn-sm">Reset Hafalan</button>'
            : '') +
          '<button type="button" id="btn-manage-flashcard" class="btn btn-primary btn-sm">Mulai Flashcard</button>' +
          '<button type="button" id="btn-manage-quiz" class="btn btn-secondary btn-sm">Mulai Kuis</button>' +
        '</div>' +
      '</div>' +

      '<!-- Authoring Card (Single + Bulk Tabs) -->' +
      '<section aria-label="Tambah kartu baru" class="author-panel">' +
        '<div class="author-panel-top">' +
          '<h2 class="author-panel-title">Tambah Kartu ke Deck</h2>' +
          '<div class="segmented-tabs" role="tablist" aria-label="Mode input kartu">' +
            '<button type="button" role="tab" aria-selected="' + (authorMode === 'single' ? 'true' : 'false') + '" data-author-mode="single" class="segmented-tab ' + (authorMode === 'single' ? 'is-active' : '') + '">Tambah Satu</button>' +
            '<button type="button" role="tab" aria-selected="' + (authorMode === 'bulk' ? 'true' : 'false') + '" data-author-mode="bulk" class="segmented-tab ' + (authorMode === 'bulk' ? 'is-active' : '') + '">Tambah Banyak</button>' +
          '</div>' +
        '</div>' +

        (authorMode === 'single'
          ? '<form id="form-add-card">' +
              '<div class="author-grid">' +
                '<div class="field-group">' +
                  '<label for="add-card-front" class="field-label">Sisi Depan (Pertanyaan / Istilah)</label>' +
                  '<textarea id="add-card-front" rows="2" required dir="auto" placeholder="Contoh: كِتَابٌ atau Semantic HTML" class="text-input"></textarea>' +
                '</div>' +
                '<div class="field-group">' +
                  '<label for="add-card-back" class="field-label">Sisi Belakang (Jawaban / Arti)</label>' +
                  '<textarea id="add-card-back" rows="2" required dir="auto" placeholder="Contoh: Buku atau Tag HTML bermakna jelas" class="text-input"></textarea>' +
                '</div>' +
              '</div>' +
              '<div class="author-submit-row">' +
                '<span class="author-hint">Mendukung teks Arab (RTL) &amp; Latin · Tekan <kbd class="kbd-badge">Ctrl</kbd>+<kbd class="kbd-badge">Enter</kbd> untuk cepat simpan</span>' +
                '<button type="submit" class="btn btn-primary btn-sm">+ Tambahkan Kartu</button>' +
              '</div>' +
            '</form>'
          : '<form id="form-bulk-cards">' +
              '<div class="field-group">' +
                '<label for="bulk-cards-input" class="field-label">Tempel beberapa baris sekaligus (pisahkan dengan <code>=</code>, <code>-</code>, <code>|</code>, atau Tab dari Excel)</label>' +
                '<textarea id="bulk-cards-input" rows="5" dir="ltr" placeholder="كِتَابٌ = Buku&#10;مَدْرَسَةٌ = Sekolah&#10;Debounce = Teknik menunda eksekusi fungsi sampai jeda selesai" class="text-input textarea-mono"></textarea>' +
              '</div>' +
              '<div class="author-submit-row">' +
                '<span id="bulk-preview-count" class="author-hint">0 kartu valid terdeteksi</span>' +
                '<button type="submit" id="btn-bulk-submit" disabled class="btn btn-primary btn-sm">+ Tambahkan Semua</button>' +
              '</div>' +
            '</form>') +
      '</section>' +

      '<!-- Search & Status Filter Toolbar -->' +
      '<div class="manage-toolbar">' +
        '<div class="search-field">' +
          '<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="8"></circle>' +
            '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
          '</svg>' +
          '<input id="input-search-cards" type="search" value="' + KF.utils.escapeHtml(cardSearchQuery) + '" placeholder="Cari istilah atau arti di deck ini..." class="input-search" />' +
        '</div>' +

        '<div id="manage-filter-tabs" class="segmented-tabs">' +
          renderFilterTab('all', 'Semua (' + deck.cards.length + ')') +
          renderFilterTab('unmastered', 'Belum Hafal (' + (stats.total - stats.mastered) + ')') +
          renderFilterTab('mastered', 'Sudah Hafal (' + stats.mastered + ')') +
        '</div>' +
      '</div>' +

      '<!-- Card List -->' +
      '<div id="manage-card-list" class="manage-card-list">' +
        renderCardListHtml(deck, filtered) +
      '</div>';

    bindDynamicEvents();

    if (lastHighlightedCardId) {
      var targetRow = container.querySelector('[data-card-id="' + lastHighlightedCardId + '"]');
      if (targetRow && typeof targetRow.scrollIntoView === 'function') {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      setTimeout(function () {
        lastHighlightedCardId = null;
        if (targetRow) targetRow.classList.remove('is-highlighted');
      }, 1400);
    }
  }

  function refreshListAndCounters() {
    var deck = KF.storage.getDeckById(currentDeckId);
    if (!deck) return;
    var stats = KF.utils.getDeckStats(deck);

    var subEl = document.getElementById('manage-stats-sub');
    if (subEl) {
      subEl.innerHTML =
        '<span class="font-mono">' + stats.total + '</span> kartu · <span class="font-mono">' + stats.mastered + '</span> sudah hafal (<span class="font-mono">' + stats.percentage + '%</span>)';
    }

    var tabsWrap = document.getElementById('manage-filter-tabs');
    if (tabsWrap) {
      tabsWrap.innerHTML =
        renderFilterTab('all', 'Semua (' + deck.cards.length + ')') +
        renderFilterTab('unmastered', 'Belum Hafal (' + (stats.total - stats.mastered) + ')') +
        renderFilterTab('mastered', 'Sudah Hafal (' + stats.mastered + ')');
      bindFilterTabClicks();
    }

    var listEl = document.getElementById('manage-card-list');
    if (listEl) {
      listEl.innerHTML = renderCardListHtml(deck, getFilteredCards(deck.cards));
    }
  }

  function bindFilterTabClicks() {
    var filterBtns = document.querySelectorAll('[data-filter-status]');
    for (var i = 0; i < filterBtns.length; i++) {
      filterBtns[i].addEventListener('click', function (e) {
        statusFilter = e.currentTarget.getAttribute('data-filter-status');
        refreshListAndCounters();
      });
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
      el.classList.add('arabic-inline');
    } else {
      el.classList.remove('arabic-inline');
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
          KF.utils.showToast('Progres hafalan deck di-reset.', 'info');
        });
      });
    }

    var modeTabs = document.querySelectorAll('[data-author-mode]');
    for (var m = 0; m < modeTabs.length; m++) {
      modeTabs[m].addEventListener('click', function (e) {
        var nextMode = e.currentTarget.getAttribute('data-author-mode');
        if (nextMode !== authorMode) {
          authorMode = nextMode;
          render();
        }
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
        var created = KF.storage.addCard(currentDeckId, front, back);
        lastHighlightedCardId = created ? created.id : null;
        KF.utils.showToast('Kartu baru ditambahkan.', 'success');
        render();
        var newFront = document.getElementById('add-card-front');
        if (newFront) newFront.focus();
      });
    }

    var bulkForm = document.getElementById('form-bulk-cards');
    var bulkInput = document.getElementById('bulk-cards-input');
    var bulkPreview = document.getElementById('bulk-preview-count');
    var bulkSubmit = document.getElementById('btn-bulk-submit');

    if (bulkInput && bulkPreview && bulkSubmit) {
      bulkInput.addEventListener('input', function () {
        var parsed = parseBulkLines(bulkInput.value);
        bulkPreview.textContent = parsed.length + ' kartu valid terdeteksi';
        bulkSubmit.disabled = parsed.length === 0;
      });
    }

    if (bulkForm && bulkInput) {
      bulkForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var pairs = parseBulkLines(bulkInput.value);
        if (pairs.length === 0) {
          KF.utils.showToast('Belum ada baris valid (gunakan pemisah =, -, |, atau Tab).', 'warning');
          return;
        }
        var added = KF.storage.addCardsBulk(currentDeckId, pairs);
        lastHighlightedCardId = added.length > 0 ? added[added.length - 1].id : null;
        KF.utils.showToast(added.length + ' kartu berhasil ditambahkan.', 'success');
        render();
      });
    }

    var searchInput = document.getElementById('input-search-cards');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        cardSearchQuery = e.target.value || '';
        refreshListAndCounters();
      });
    }

    bindFilterTabClicks();

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
          refreshListAndCounters();
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
            refreshListAndCounters();
            KF.utils.showToast('Kartu dihapus.', 'info');
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
        refreshListAndCounters();
        KF.utils.showToast('Perubahan kartu disimpan.', 'success');
      });
    }
  }

  KF.manage = {
    render: render,
    bindEvents: bindGlobalModalEvents
  };
})(typeof window !== 'undefined' ? window : globalThis);
