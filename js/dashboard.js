/**
 * KartaFlash - Dashboard View Module (Meja Belajar)
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});
  var searchQuery = '';
  var sortMode = 'recent';

  function closeAllDeckMenus() {
    var menus = document.querySelectorAll('.deck-menu-popover');
    for (var i = 0; i < menus.length; i++) {
      menus[i].classList.add('is-hidden');
    }
    var toggles = document.querySelectorAll('[data-action="toggle-deck-menu"]');
    for (var j = 0; j < toggles.length; j++) {
      toggles[j].setAttribute('aria-expanded', 'false');
    }
  }

  function renderStats(decks) {
    var statsEl = document.getElementById('dashboard-stats');
    if (!statsEl) return;

    var totalDecks = decks.length;
    var totalCards = 0;
    var totalMastered = 0;

    for (var i = 0; i < decks.length; i++) {
      var st = KF.utils.getDeckStats(decks[i]);
      totalCards += st.total;
      totalMastered += st.mastered;
    }

    var globalPct = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

    statsEl.innerHTML =
      '<span class="summary-item"><span class="summary-value">' + totalDecks + '</span> deck</span>' +
      '<span class="summary-sep" aria-hidden="true">·</span>' +
      '<span class="summary-item"><span class="summary-value">' + totalCards + '</span> kartu</span>' +
      '<span class="summary-sep" aria-hidden="true">·</span>' +
      '<span class="summary-progress-pill">' +
        '<span class="summary-progress-dot" aria-hidden="true"></span>' +
        '<span><strong class="font-mono">' + totalMastered + '/' + totalCards + '</strong> sudah hafal (<strong class="font-mono">' + globalPct + '%</strong>)</span>' +
      '</span>';
  }

  function renderContinueStrip(decks) {
    var el = document.getElementById('dashboard-continue');
    if (!el) return;

    var last = KF.storage.getLastSession();
    if (!last) {
      el.classList.add('is-hidden');
      el.innerHTML = '';
      return;
    }

    var targetDeck = null;
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === last.deckId) {
        targetDeck = decks[i];
        break;
      }
    }

    if (!targetDeck || targetDeck.cards.length === 0) {
      el.classList.add('is-hidden');
      el.innerHTML = '';
      return;
    }

    var st = KF.utils.getDeckStats(targetDeck);
    var titleDir = KF.utils.getTextDir(targetDeck.title);
    var titleArabic = KF.utils.getArabicClass(targetDeck.title, false);
    var modeLabel = last.mode === 'quiz' ? 'Kuis' : 'Flashcard';

    el.classList.remove('is-hidden');
    el.innerHTML =
      '<div class="continue-strip-copy">' +
        '<p class="continue-kicker">Terakhir dipelajari (' + modeLabel + ') · ' + st.mastered + '/' + st.total + ' hafal</p>' +
        '<p dir="' + titleDir + '" class="continue-title ' + titleArabic + '">' + KF.utils.escapeHtml(targetDeck.title) + '</p>' +
      '</div>' +
      '<div class="continue-actions">' +
        '<button type="button" data-continue-mode="flashcard" data-id="' + KF.utils.escapeHtml(targetDeck.id) + '" class="btn btn-primary btn-sm">Lanjut Flashcard</button>' +
        (st.total >= 4
          ? '<button type="button" data-continue-mode="quiz" data-id="' + KF.utils.escapeHtml(targetDeck.id) + '" class="btn btn-secondary btn-sm">Uji Kuis</button>'
          : '') +
      '</div>';
  }

  function sortDecks(list) {
    var copy = list.slice();
    if (sortMode === 'title') {
      copy.sort(function (a, b) {
        return a.title.localeCompare(b.title, 'id');
      });
    } else if (sortMode === 'progress-asc') {
      copy.sort(function (a, b) {
        var sa = KF.utils.getDeckStats(a);
        var sb = KF.utils.getDeckStats(b);
        return sa.percentage - sb.percentage;
      });
    } else if (sortMode === 'cards-desc') {
      copy.sort(function (a, b) {
        return b.cards.length - a.cards.length;
      });
    }
    return copy;
  }

  function renderDeckCard(deck) {
    var stats = KF.utils.getDeckStats(deck);
    var theme = KF.utils.getColorTheme(deck.color);
    var deckIdEsc = KF.utils.escapeHtml(deck.id);
    var titleEsc = KF.utils.escapeHtml(deck.title);
    var descEsc = KF.utils.escapeHtml(deck.description || 'Belum ada catatan untuk deck ini.');
    var titleDir = KF.utils.getTextDir(deck.title);
    var titleArabicClass = KF.utils.getArabicClass(deck.title, false);
    var quizReady = stats.total >= 4;
    var isComplete = stats.percentage === 100 && stats.total > 0;

    return (
      '<article data-deck-id="' + deckIdEsc + '" class="deck-card ' + theme.themeClass + '">' +
        '<div class="deck-card-body">' +
          '<div class="deck-card-top">' +
            '<button type="button" data-action="study-flashcard" data-id="' + deckIdEsc + '" class="deck-title-link">' +
              '<h2 dir="' + titleDir + '" class="deck-title ' + titleArabicClass + '">' + titleEsc + '</h2>' +
            '</button>' +
            '<span class="deck-count-badge">' + stats.total + ' kartu</span>' +
          '</div>' +

          '<p dir="auto" class="deck-desc">' + descEsc + '</p>' +

          '<div class="deck-progress-block">' +
            '<div class="deck-progress-meta">' +
              '<span class="deck-progress-label">' + stats.mastered + ' dari ' + stats.total + ' sudah hafal</span>' +
              '<span class="deck-progress-pct ' + (isComplete ? 'is-complete' : '') + '">' + stats.percentage + '%</span>' +
            '</div>' +
            '<div class="progress-track">' +
              '<div class="progress-fill ' + (isComplete ? 'is-complete' : '') + '" style="width: ' + stats.percentage + '%"></div>' +
            '</div>' +
          '</div>' +

          '<div class="deck-primary-actions">' +
            '<button type="button" data-action="study-flashcard" data-id="' + deckIdEsc + '" class="btn btn-deck-primary btn-sm">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="3" y="6" width="14" height="14" rx="2"></rect>' +
                '<path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h10A1.5 1.5 0 0 1 20 4.5v10a1.5 1.5 0 0 1-1.5 1.5H17"></path>' +
              '</svg>' +
              'Belajar' +
            '</button>' +

            '<button type="button" data-action="start-quiz" data-id="' + deckIdEsc + '" title="' + (quizReady ? 'Mulai Kuis Pilihan Ganda' : 'Minimal 4 kartu untuk mode kuis') + '" class="btn btn-deck-outline btn-sm">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M9 11l3 3L22 4"></path>' +
                '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>' +
              '</svg>' +
              'Kuis' + (quizReady ? '' : ' (min. 4)') +
            '</button>' +
          '</div>' +
        '</div>' +

        '<div class="deck-card-footer">' +
          '<button type="button" data-action="manage-cards" data-id="' + deckIdEsc + '" class="deck-manage-link">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
              '<line x1="12" y1="5" x2="12" y2="19"></line>' +
              '<line x1="5" y1="12" x2="19" y2="12"></line>' +
            '</svg>' +
            'Kelola Kartu' +
          '</button>' +

          '<div class="deck-menu-wrap">' +
            '<button type="button" data-action="toggle-deck-menu" data-id="' + deckIdEsc + '" aria-haspopup="menu" aria-expanded="false" aria-label="Opsi lainnya untuk ' + titleEsc + '" class="btn btn-icon btn-ghost">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
                '<circle cx="6" cy="12" r="1.75"></circle>' +
                '<circle cx="12" cy="12" r="1.75"></circle>' +
                '<circle cx="18" cy="12" r="1.75"></circle>' +
              '</svg>' +
            '</button>' +

            '<div role="menu" class="deck-menu-popover is-hidden">' +
              '<button type="button" role="menuitem" data-action="edit-deck" data-id="' + deckIdEsc + '" class="popover-item">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<path d="M12 20h9"></path>' +
                  '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
                '</svg>' +
                'Edit Info Deck' +
              '</button>' +
              '<button type="button" role="menuitem" data-action="export-deck" data-id="' + deckIdEsc + '" class="popover-item">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>' +
                  '<polyline points="7 10 12 15 17 10"></polyline>' +
                  '<line x1="12" y1="15" x2="12" y2="3"></line>' +
                '</svg>' +
                'Export ke JSON' +
              '</button>' +
              '<div class="popover-divider"></div>' +
              '<button type="button" role="menuitem" data-action="delete-deck" data-id="' + deckIdEsc + '" class="popover-item popover-item-danger">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<polyline points="3 6 5 6 21 6"></polyline>' +
                  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
                  '<path d="M10 11v6M14 11v6"></path>' +
                '</svg>' +
                'Hapus Deck' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var decks = KF.storage.loadDecks();
    renderStats(decks);
    renderContinueStrip(decks);

    var grid = document.getElementById('deck-grid');
    var countLabel = document.getElementById('deck-count-label');
    if (!grid) return;

    var q = searchQuery.trim().toLowerCase();
    var filtered = decks.filter(function (d) {
      if (!q) return true;
      var inTitle = d.title.toLowerCase().indexOf(q) !== -1;
      var inDesc = (d.description || '').toLowerCase().indexOf(q) !== -1;
      return inTitle || inDesc;
    });

    var ordered = sortDecks(filtered);

    if (countLabel) {
      countLabel.textContent = q
        ? 'Menampilkan ' + ordered.length + ' dari ' + decks.length + ' deck'
        : ordered.length + ' deck di meja';
    }

    if (decks.length === 0) {
      grid.innerHTML =
        '<div class="empty-paper-state">' +
          '<svg class="empty-art" width="64" height="52" viewBox="0 0 64 52" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="10" y="12" width="38" height="30" rx="4" opacity="0.35"></rect>' +
            '<rect x="16" y="7" width="38" height="30" rx="4" fill="var(--bg-paper-elevated)"></rect>' +
            '<line x1="23" y1="16" x2="46" y2="16"></line>' +
            '<line x1="23" y1="22" x2="40" y2="22" opacity="0.65"></line>' +
            '<line x1="23" y1="28" x2="33" y2="28" opacity="0.45"></line>' +
          '</svg>' +
          '<h3 class="empty-title">Meja belajarmu masih kosong</h3>' +
          '<p class="empty-desc">Mulai dengan membuat deck baru, mengimpor cadangan JSON, atau memuat deck contoh bawaan.</p>' +
          '<div class="empty-actions">' +
            '<button type="button" id="btn-empty-new-deck" class="btn btn-primary">+ Buat Deck Baru</button>' +
            '<button type="button" id="btn-empty-load-samples" class="btn btn-secondary">Muat Deck Contoh</button>' +
          '</div>' +
        '</div>';
      return;
    }

    if (ordered.length === 0) {
      grid.innerHTML =
        '<div class="empty-paper-state">' +
          '<h3 class="empty-title">Deck tidak ditemukan</h3>' +
          '<p class="empty-desc">Tidak ada deck yang cocok dengan kata kunci "' + KF.utils.escapeHtml(searchQuery) + '".</p>' +
          '<div class="empty-actions">' +
            '<button type="button" id="btn-clear-deck-search" class="btn btn-secondary">Reset Pencarian</button>' +
          '</div>' +
        '</div>';
      return;
    }

    grid.innerHTML = ordered.map(renderDeckCard).join('');
  }

  function setSelectedColor(color) {
    var colorInput = document.getElementById('deck-color-input');
    if (colorInput) colorInput.value = color;

    var swatches = document.querySelectorAll('#deck-color-picker .color-swatch');
    for (var i = 0; i < swatches.length; i++) {
      var sw = swatches[i];
      if (sw.getAttribute('data-color') === color) {
        sw.classList.add('is-selected');
      } else {
        sw.classList.remove('is-selected');
      }
    }
  }

  function openDeckModal(deckId) {
    var modalTitle = document.getElementById('modal-deck-title');
    var editIdInput = document.getElementById('deck-edit-id');
    var titleInput = document.getElementById('deck-title-input');
    var descInput = document.getElementById('deck-desc-input');

    if (deckId) {
      var deck = KF.storage.getDeckById(deckId);
      if (!deck) return;
      modalTitle.textContent = 'Edit Info Deck';
      editIdInput.value = deck.id;
      titleInput.value = deck.title;
      descInput.value = deck.description || '';
      setSelectedColor(deck.color || 'emerald');
    } else {
      modalTitle.textContent = 'Buat Deck Baru';
      editIdInput.value = '';
      titleInput.value = '';
      descInput.value = '';
      setSelectedColor('emerald');
    }

    KF.utils.openModal('modal-deck');
    setTimeout(function () {
      titleInput.focus();
    }, 40);
  }

  function bindEvents() {
    var searchInput = document.getElementById('input-search-decks');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value || '';
        render();
      });
    }

    var sortSelect = document.getElementById('select-sort-decks');
    if (sortSelect) {
      sortSelect.addEventListener('change', function (e) {
        sortMode = e.target.value || 'recent';
        render();
      });
    }

    var newDeckBtn = document.getElementById('btn-new-deck');
    if (newDeckBtn) {
      newDeckBtn.addEventListener('click', function () {
        openDeckModal(null);
      });
    }

    var continueStrip = document.getElementById('dashboard-continue');
    if (continueStrip) {
      continueStrip.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-continue-mode]');
        if (!btn) return;
        var mode = btn.getAttribute('data-continue-mode');
        var id = btn.getAttribute('data-id');
        if (id && (mode === 'flashcard' || mode === 'quiz')) {
          KF.app.navigate(mode, id);
        }
      });
    }

    var exportAllBtn = document.getElementById('btn-export-all');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', function () {
        var decks = KF.storage.loadDecks();
        if (decks.length === 0) {
          KF.utils.showToast('Belum ada deck untuk di-export.', 'warning');
          return;
        }
        var payload = KF.storage.buildAllExportPayload();
        var dateTag = new Date().toISOString().slice(0, 10);
        KF.utils.downloadJson('kartaflash-backup-' + dateTag + '.json', payload);
        KF.utils.closeModal('modal-data');
        KF.utils.showToast('Berhasil meng-export ' + decks.length + ' deck ke JSON.', 'success');
      });
    }

    var importBtn = document.getElementById('btn-import-deck');
    var fileInput = document.getElementById('input-import-json');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', function () {
        fileInput.value = '';
        fileInput.click();
      });

      fileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var json = JSON.parse(ev.target.result);
            var res = KF.storage.importDecksFromJson(json);
            KF.utils.closeModal('modal-data');
            render();
            KF.utils.showToast(
              'Berhasil mengimpor ' + res.importedCount + ' deck (' + res.cardCount + ' kartu).',
              'success'
            );
          } catch (err) {
            KF.utils.showToast(err.message || 'File JSON tidak valid.', 'error');
          }
        };
        reader.onerror = function () {
          KF.utils.showToast('Gagal membaca file.', 'error');
        };
        reader.readAsText(file);
      });
    }

    var colorPicker = document.getElementById('deck-color-picker');
    if (colorPicker) {
      colorPicker.addEventListener('click', function (e) {
        var btn = e.target.closest('.color-swatch');
        if (!btn) return;
        setSelectedColor(btn.getAttribute('data-color'));
      });
    }

    var deckForm = document.getElementById('form-deck');
    if (deckForm) {
      deckForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = document.getElementById('deck-edit-id').value;
        var title = document.getElementById('deck-title-input').value.trim();
        var description = document.getElementById('deck-desc-input').value.trim();
        var color = document.getElementById('deck-color-input').value;

        if (!title) {
          KF.utils.showToast('Judul deck tidak boleh kosong.', 'warning');
          return;
        }

        if (id) {
          KF.storage.updateDeck(id, { title: title, description: description, color: color });
          KF.utils.showToast('Info deck diperbarui.', 'success');
        } else {
          var created = KF.storage.createDeck({ title: title, description: description, color: color });
          KF.utils.showToast('Deck "' + created.title + '" dibuat.', 'success');
        }

        KF.utils.closeModal('modal-deck');
        render();
      });
    }

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.deck-menu-wrap')) {
        closeAllDeckMenus();
      }
    });

    var grid = document.getElementById('deck-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        if (e.target.closest('#btn-empty-new-deck')) {
          openDeckModal(null);
          return;
        }
        if (e.target.closest('#btn-empty-load-samples')) {
          KF.storage.resetToDefaultDecks();
          render();
          KF.utils.showToast('Deck contoh bawaan dimuat.', 'success');
          return;
        }
        if (e.target.closest('#btn-clear-deck-search')) {
          searchQuery = '';
          if (searchInput) searchInput.value = '';
          render();
          return;
        }

        var actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        var action = actionBtn.getAttribute('data-action');
        var deckId = actionBtn.getAttribute('data-id');

        if (action === 'toggle-deck-menu') {
          var wrap = actionBtn.closest('.deck-menu-wrap');
          var popover = wrap ? wrap.querySelector('.deck-menu-popover') : null;
          var isCurrentlyOpen = popover && !popover.classList.contains('is-hidden');
          closeAllDeckMenus();
          if (popover && !isCurrentlyOpen) {
            popover.classList.remove('is-hidden');
            actionBtn.setAttribute('aria-expanded', 'true');
          }
          return;
        }

        closeAllDeckMenus();

        var deck = KF.storage.getDeckById(deckId);
        if (!deck) return;

        if (action === 'study-flashcard') {
          KF.app.navigate('flashcard', deckId);
        } else if (action === 'start-quiz') {
          KF.app.navigate('quiz', deckId);
        } else if (action === 'manage-cards') {
          KF.app.navigate('manage', deckId);
        } else if (action === 'edit-deck') {
          openDeckModal(deckId);
        } else if (action === 'export-deck') {
          var payload = KF.storage.buildDeckExportPayload(deck);
          var filename = KF.utils.slugify(deck.title) + '.json';
          KF.utils.downloadJson(filename, payload);
          KF.utils.showToast('Deck "' + deck.title + '" di-export ke ' + filename, 'success');
        } else if (action === 'delete-deck') {
          KF.utils.confirmAction({
            title: 'Hapus Deck?',
            message: 'Deck "' + deck.title + '" beserta seluruh ' + deck.cards.length + ' kartunya akan dihapus permanen.',
            confirmText: 'Hapus Deck',
            variant: 'danger'
          }).then(function (confirmed) {
            if (!confirmed) return;
            KF.storage.deleteDeck(deckId);
            render();
            KF.utils.showToast('Deck "' + deck.title + '" dihapus.', 'info');
          });
        }
      });
    }
  }

  KF.dashboard = {
    render: render,
    bindEvents: bindEvents,
    openDeckModal: openDeckModal,
    closeAllDeckMenus: closeAllDeckMenus
  };
})(typeof window !== 'undefined' ? window : globalThis);
