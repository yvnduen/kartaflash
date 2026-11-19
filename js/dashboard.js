/**
 * KartaFlash - Dashboard View Module
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});
  var searchQuery = '';

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

    var items = [
      {
        label: 'Total Deck',
        value: totalDecks,
        accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />'
      },
      {
        label: 'Total Kartu',
        value: totalCards,
        accent: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/15',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />'
      },
      {
        label: 'Kartu Dikuasai',
        value: totalMastered,
        accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
      },
      {
        label: 'Progres Global',
        value: globalPct + '%',
        accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />'
      }
    ];

    statsEl.innerHTML = items
      .map(function (item) {
        return (
          '<div class="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3.5 shadow-sm">' +
            '<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + item.accent + '">' +
              '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                item.icon +
              '</svg>' +
            '</div>' +
            '<div class="min-w-0">' +
              '<p class="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">' + item.label + '</p>' +
              '<p class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">' + item.value + '</p>' +
            '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderDeckCard(deck) {
    var stats = KF.utils.getDeckStats(deck);
    var theme = KF.utils.getColorTheme(deck.color);
    var titleEsc = KF.utils.escapeHtml(deck.title);
    var descEsc = KF.utils.escapeHtml(deck.description || 'Belum ada deskripsi untuk deck ini.');
    var titleDir = KF.utils.getTextDir(deck.title);
    var titleArabicClass = KF.utils.getArabicClass(deck.title, false);
    var quizReady = stats.total >= 4;

    return (
      '<article data-deck-id="' + KF.utils.escapeHtml(deck.id) + '" class="group flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-card dark:hover:shadow-card-dark ' + theme.borderHover + ' overflow-hidden transition-all duration-200">' +
        '<div class="h-1.5 w-full bg-gradient-to-r ' + theme.bar + '"></div>' +

        '<div class="p-5 flex-1 flex flex-col">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<h2 dir="' + titleDir + '" class="text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 ' + titleArabicClass + '">' +
              titleEsc +
            '</h2>' +
            '<span class="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ' + theme.badge + '">' +
              stats.total + ' Kartu' +
            '</span>' +
          '</div>' +

          '<p dir="auto" class="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">' +
            descEsc +
          '</p>' +

          '<!-- Mastery Progress -->' +
          '<div class="mt-5">' +
            '<div class="flex items-center justify-between text-xs font-semibold mb-1.5">' +
              '<span class="text-slate-500 dark:text-slate-400">' + stats.mastered + ' / ' + stats.total + ' dikuasai</span>' +
              '<span class="' + (stats.percentage === 100 && stats.total > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300') + '">' +
                stats.percentage + '%' +
              '</span>' +
            '</div>' +
            '<div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">' +
              '<div class="h-full rounded-full transition-all duration-500 ' + (stats.percentage === 100 && stats.total > 0 ? 'bg-emerald-500' : theme.progress) + '" style="width: ' + stats.percentage + '%"></div>' +
            '</div>' +
          '</div>' +

          '<!-- Primary Study Modes -->' +
          '<div class="mt-5 grid grid-cols-2 gap-2.5">' +
            '<button type="button" data-action="study-flashcard" data-id="' + KF.utils.escapeHtml(deck.id) + '" class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-colors">' +
              '<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2" />' +
              '</svg>' +
              'Flashcard' +
            '</button>' +

            '<button type="button" data-action="start-quiz" data-id="' + KF.utils.escapeHtml(deck.id) + '" title="' + (quizReady ? 'Mulai Kuis Pilihan Ganda' : 'Minimal 4 kartu untuk kuis') + '" class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ' +
              (quizReady
                ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' +
              '<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />' +
              '</svg>' +
              'Kuis' + (quizReady ? '' : ' (Min.4)') +
            '</button>' +
          '</div>' +
        '</div>' +

        '<!-- Card Footer Actions -->' +
        '<div class="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">' +
          '<button type="button" data-action="manage-cards" data-id="' + KF.utils.escapeHtml(deck.id) + '" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1">' +
            '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />' +
            '</svg>' +
            'Kelola Kartu' +
          '</button>' +

          '<div class="flex items-center gap-1">' +
            '<button type="button" data-action="export-deck" data-id="' + KF.utils.escapeHtml(deck.id) + '" title="Export Deck ke JSON" aria-label="Export Deck ' + titleEsc + ' ke JSON" class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />' +
              '</svg>' +
            '</button>' +

            '<button type="button" data-action="edit-deck" data-id="' + KF.utils.escapeHtml(deck.id) + '" title="Edit Info Deck" aria-label="Edit Deck ' + titleEsc + '" class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />' +
              '</svg>' +
            '</button>' +

            '<button type="button" data-action="delete-deck" data-id="' + KF.utils.escapeHtml(deck.id) + '" title="Hapus Deck" aria-label="Hapus Deck ' + titleEsc + '" class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var decks = KF.storage.loadDecks();
    renderStats(decks);

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

    if (countLabel) {
      countLabel.textContent = q
        ? 'Menampilkan ' + filtered.length + ' dari ' + decks.length + ' deck'
        : 'Total ' + decks.length + ' deck tersedia';
    }

    if (decks.length === 0) {
      grid.innerHTML =
        '<div class="col-span-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-10 text-center">' +
          '<div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">' +
            '<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2" />' +
            '</svg>' +
          '</div>' +
          '<h3 class="text-lg font-bold text-slate-900 dark:text-white">Belum ada deck belajar</h3>' +
          '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Buat deck pertama Anda, impor dari file JSON, atau muat ulang deck contoh bawaan untuk mulai belajar.</p>' +
          '<div class="mt-5 flex flex-wrap items-center justify-center gap-3">' +
            '<button type="button" id="btn-empty-new-deck" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">+ Buat Deck Baru</button>' +
            '<button type="button" id="btn-empty-load-samples" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors">Muat Deck Contoh</button>' +
          '</div>' +
        '</div>';
      return;
    }

    if (filtered.length === 0) {
      grid.innerHTML =
        '<div class="col-span-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">' +
          '<p class="text-base font-bold text-slate-900 dark:text-white">Deck tidak ditemukan</p>' +
          '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Tidak ada deck yang cocok dengan kata kunci "' + KF.utils.escapeHtml(searchQuery) + '".</p>' +
          '<button type="button" id="btn-clear-deck-search" class="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">Reset Pencarian</button>' +
        '</div>';
      return;
    }

    grid.innerHTML = filtered.map(renderDeckCard).join('');
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
      modalTitle.textContent = 'Edit Deck';
      editIdInput.value = deck.id;
      titleInput.value = deck.title;
      descInput.value = deck.description || '';
      setSelectedColor(deck.color || 'indigo');
    } else {
      modalTitle.textContent = 'Buat Deck Baru';
      editIdInput.value = '';
      titleInput.value = '';
      descInput.value = '';
      setSelectedColor('indigo');
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

    var newDeckBtn = document.getElementById('btn-new-deck');
    if (newDeckBtn) {
      newDeckBtn.addEventListener('click', function () {
        openDeckModal(null);
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
          KF.utils.showToast('Deck berhasil diperbarui.', 'success');
        } else {
          var created = KF.storage.createDeck({ title: title, description: description, color: color });
          KF.utils.showToast('Deck "' + created.title + '" berhasil dibuat.', 'success');
        }

        KF.utils.closeModal('modal-deck');
        render();
      });
    }

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
          KF.utils.showToast('Deck contoh bawaan berhasil dimuat.', 'success');
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
            KF.utils.showToast('Deck "' + deck.title + '" telah dihapus.', 'info');
          });
        }
      });
    }
  }

  KF.dashboard = {
    render: render,
    bindEvents: bindEvents,
    openDeckModal: openDeckModal
  };
})(typeof window !== 'undefined' ? window : globalThis);
