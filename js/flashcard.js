/**
 * KartaFlash - Mode 1: Interactive 3D Flashcard Study Module
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});

  var state = {
    deckId: null,
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    isShuffled: false,
    onlyUnmastered: false,
    sessionCompleted: false
  };

  function syncSessionCards(preserveOrder) {
    var deck = KF.storage.getDeckById(state.deckId);
    if (!deck) return null;

    var pool = state.onlyUnmastered
      ? deck.cards.filter(function (c) { return !c.mastered; })
      : deck.cards.slice();

    if (preserveOrder && state.cards.length > 0) {
      var idMap = {};
      for (var i = 0; i < pool.length; i++) {
        idMap[pool[i].id] = pool[i];
      }
      var updated = [];
      for (var j = 0; j < state.cards.length; j++) {
        if (idMap[state.cards[j].id]) {
          updated.push(idMap[state.cards[j].id]);
          delete idMap[state.cards[j].id];
        }
      }
      for (var key in idMap) {
        if (Object.prototype.hasOwnProperty.call(idMap, key)) {
          updated.push(idMap[key]);
        }
      }
      state.cards = updated;
    } else {
      state.cards = state.isShuffled ? KF.utils.shuffleArray(pool) : pool;
    }

    if (state.currentIndex >= state.cards.length) {
      state.currentIndex = Math.max(0, state.cards.length - 1);
    }
    return deck;
  }

  function start(deckId) {
    state.deckId = deckId;
    state.currentIndex = 0;
    state.isFlipped = false;
    state.isShuffled = false;
    state.onlyUnmastered = false;
    state.sessionCompleted = false;
    syncSessionCards(false);
    render();
  }

  function flipCard() {
    if (state.sessionCompleted || state.cards.length === 0) return;
    state.isFlipped = !state.isFlipped;

    var inner = document.getElementById('flashcard-inner');
    if (inner) {
      inner.classList.toggle('is-flipped', state.isFlipped);
    }
    var cardStage = document.getElementById('flashcard-stage');
    if (cardStage) {
      cardStage.setAttribute('aria-pressed', state.isFlipped ? 'true' : 'false');
    }
  }

  function goToCard(nextIndex, direction) {
    if (state.cards.length === 0) return;
    if (nextIndex < 0 || nextIndex >= state.cards.length) return;

    state.currentIndex = nextIndex;
    state.isFlipped = false;
    updateCardView(direction);
  }

  function prevCard() {
    if (state.sessionCompleted) {
      state.sessionCompleted = false;
      render();
      return;
    }
    if (state.currentIndex > 0) {
      goToCard(state.currentIndex - 1, 'prev');
    }
  }

  function nextCard() {
    if (state.sessionCompleted) return;
    if (state.currentIndex < state.cards.length - 1) {
      goToCard(state.currentIndex + 1, 'next');
    } else {
      state.sessionCompleted = true;
      render();
    }
  }

  function gradeCurrentCard(mastered) {
    if (state.sessionCompleted || state.cards.length === 0) return;
    var currentCard = state.cards[state.currentIndex];
    if (!currentCard) return;

    KF.storage.setCardMastered(state.deckId, currentCard.id, mastered);
    currentCard.mastered = Boolean(mastered);

    KF.utils.showToast(
      mastered ? 'Ditandai: Sudah Hafal' : 'Ditandai: Belum Paham',
      mastered ? 'success' : 'info'
    );

    if (state.currentIndex < state.cards.length - 1) {
      goToCard(state.currentIndex + 1, 'next');
    } else {
      state.sessionCompleted = true;
      render();
    }
  }

  function shuffleDeck() {
    if (state.cards.length <= 1) return;
    state.isShuffled = true;
    state.sessionCompleted = false;
    state.currentIndex = 0;
    state.isFlipped = false;
    state.cards = KF.utils.shuffleArray(state.cards);
    render();
    KF.utils.showToast('Urutan kartu berhasil diacak!', 'info');
  }

  function toggleFilterUnmastered() {
    state.onlyUnmastered = !state.onlyUnmastered;
    state.currentIndex = 0;
    state.isFlipped = false;
    state.sessionCompleted = false;
    syncSessionCards(false);
    render();
  }

  function updateCardView(direction) {
    var deck = KF.storage.getDeckById(state.deckId);
    if (!deck) return;
    var card = state.cards[state.currentIndex];
    if (!card) return;

    var inner = document.getElementById('flashcard-inner');
    var stage = document.getElementById('flashcard-stage');
    if (!inner || !stage) {
      render();
      return;
    }

    // Reset flip without leaking the next card's back side during transition
    inner.classList.add('no-transition');
    inner.classList.remove('is-flipped');

    var frontTextEl = document.getElementById('fc-front-text');
    var backTextEl = document.getElementById('fc-back-text');
    var frontStatusEl = document.getElementById('fc-front-status');
    var backStatusEl = document.getElementById('fc-back-status');
    var counterEl = document.getElementById('fc-counter');
    var sessionBarEl = document.getElementById('fc-session-bar');
    var masteryBadgeEl = document.getElementById('fc-mastery-badge');
    var prevBtn = document.getElementById('btn-fc-prev');
    var nextBtn = document.getElementById('btn-fc-next');

    applyCardFaceContent(frontTextEl, card.front);
    applyCardFaceContent(backTextEl, card.back);

    updateStatusBadge(frontStatusEl, card.mastered);
    updateStatusBadge(backStatusEl, card.mastered);

    var stats = KF.utils.getDeckStats(deck);
    var posPct = Math.round(((state.currentIndex + 1) / state.cards.length) * 100);

    if (counterEl) counterEl.textContent = (state.currentIndex + 1) + ' / ' + state.cards.length;
    if (sessionBarEl) sessionBarEl.style.width = posPct + '%';
    if (masteryBadgeEl) masteryBadgeEl.textContent = stats.mastered + ' / ' + stats.total + ' dikuasai (' + stats.percentage + '%)';

    if (prevBtn) prevBtn.disabled = state.currentIndex === 0;
    if (nextBtn) {
      var isLast = state.currentIndex === state.cards.length - 1;
      nextBtn.querySelector('span').textContent = isLast ? 'Selesai' : 'Berikutnya';
    }

    stage.setAttribute('aria-pressed', 'false');

    // Force reflow then restore flip transition & slide animation
    void inner.offsetWidth;
    inner.classList.remove('no-transition');

    stage.classList.remove('card-slide-next', 'card-slide-prev');
    void stage.offsetWidth;
    if (direction === 'next') stage.classList.add('card-slide-next');
    if (direction === 'prev') stage.classList.add('card-slide-prev');
  }

  function applyCardFaceContent(el, text) {
    if (!el) return;
    var isArab = KF.utils.hasArabic(text);
    el.setAttribute('dir', KF.utils.getTextDir(text));
    el.textContent = text;
    el.className = 'my-auto w-full text-center break-words whitespace-pre-line font-bold leading-relaxed ' +
      (isArab
        ? 'arabic-text text-3xl sm:text-4xl md:text-5xl text-slate-900 dark:text-white'
        : 'text-xl sm:text-2xl md:text-3xl text-slate-900 dark:text-white');
  }

  function updateStatusBadge(el, mastered) {
    if (!el) return;
    if (mastered) {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
      el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Sudah Hafal';
    } else {
      el.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
      el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Belum Paham';
    }
  }

  function render() {
    var container = document.getElementById('flashcard-container');
    if (!container) return;

    var deck = KF.storage.getDeckById(state.deckId);
    if (!deck) {
      KF.app.navigate('dashboard');
      return;
    }

    var stats = KF.utils.getDeckStats(deck);
    var titleDir = KF.utils.getTextDir(deck.title);
    var titleArabic = KF.utils.getArabicClass(deck.title, false);

    // Header strip shared across states
    var headerHtml =
      '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
        '<div>' +
          '<button type="button" id="btn-fc-back" class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-1">' +
            '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
            '</svg>' +
            'Kembali ke Dashboard' +
          '</button>' +
          '<h1 id="flashcard-heading" dir="' + titleDir + '" class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white ' + titleArabic + '">' +
            KF.utils.escapeHtml(deck.title) +
          '</h1>' +
        '</div>' +

        '<div class="flex flex-wrap items-center gap-2">' +
          '<span id="fc-mastery-badge" class="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">' +
            stats.mastered + ' / ' + stats.total + ' dikuasai (' + stats.percentage + '%)' +
          '</span>' +
          '<button type="button" id="btn-fc-manage" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors">' +
            'Kelola Kartu' +
          '</button>' +
        '</div>' +
      '</div>';

    // Empty Deck Guard
    if (deck.cards.length === 0) {
      container.innerHTML =
        headerHtml +
        '<div class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center max-w-xl mx-auto mt-6">' +
          '<p class="text-lg font-bold text-slate-900 dark:text-white">Deck ini masih kosong</p>' +
          '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Tambahkan minimal 1 kartu terlebih dahulu untuk mulai belajar dengan Flashcard 3D.</p>' +
          '<button type="button" id="btn-fc-empty-add" class="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">+ Tambah Kartu Sekarang</button>' +
        '</div>';
      bindEvents();
      return;
    }

    // All cards mastered while filtering unmastered
    if (state.onlyUnmastered && state.cards.length === 0) {
      container.innerHTML =
        headerHtml +
        '<div class="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900 p-10 text-center max-w-xl mx-auto mt-6 shadow-sm">' +
          '<div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">' +
            '<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />' +
            '</svg>' +
          '</div>' +
          '<h2 class="text-xl font-extrabold text-slate-900 dark:text-white">Semua Kartu Sudah Dikuasai!</h2>' +
          '<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Tidak ada lagi kartu dengan status "Belum Paham" di deck ini.</p>' +
          '<div class="mt-6 flex flex-wrap justify-center gap-3">' +
            '<button type="button" id="btn-fc-show-all" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">Tampilkan Semua Kartu</button>' +
            '<button type="button" id="btn-fc-try-quiz" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">Uji dengan Kuis</button>' +
          '</div>' +
        '</div>';
      bindEvents();
      return;
    }

    // Session Complete Screen
    if (state.sessionCompleted) {
      var unmasteredCount = stats.total - stats.mastered;
      container.innerHTML =
        headerHtml +
        '<div class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center max-w-xl mx-auto shadow-card dark:shadow-card-dark">' +
          '<div class="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">' +
            '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />' +
            '</svg>' +
          '</div>' +
          '<h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">Sesi Flashcard Selesai!</h2>' +
          '<p class="mt-1.5 text-sm text-slate-600 dark:text-slate-400">Anda telah meninjau ' + state.cards.length + ' kartu dalam sesi ini.</p>' +

          '<div class="mt-6 grid grid-cols-2 gap-3 text-left">' +
            '<div class="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 p-4">' +
              '<p class="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Sudah Hafal</p>' +
              '<p class="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">' + stats.mastered + ' kartu</p>' +
            '</div>' +
            '<div class="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 p-4">' +
              '<p class="text-xs font-semibold text-amber-700 dark:text-amber-300">Belum Paham</p>' +
              '<p class="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">' + unmasteredCount + ' kartu</p>' +
            '</div>' +
          '</div>' +

          '<div class="mt-6 flex flex-wrap items-center justify-center gap-2.5">' +
            (unmasteredCount > 0
              ? '<button type="button" id="btn-fc-review-unmastered" class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold shadow-sm transition-colors">Ulangi yang Belum Paham (' + unmasteredCount + ')</button>'
              : '') +
            '<button type="button" id="btn-fc-restart" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">Ulangi Semua Kartu</button>' +
            '<button type="button" id="btn-fc-try-quiz" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">Lanjut Mode Kuis</button>' +
          '</div>' +
        '</div>';
      bindEvents();
      return;
    }

    var card = state.cards[state.currentIndex];
    var posPct = Math.round(((state.currentIndex + 1) / state.cards.length) * 100);
    var frontIsArab = KF.utils.hasArabic(card.front);
    var backIsArab = KF.utils.hasArabic(card.back);

    container.innerHTML =
      headerHtml +

      '<!-- Session Controls & Progress Bar -->' +
      '<div class="max-w-2xl mx-auto space-y-3">' +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<div class="flex items-center gap-2">' +
            '<span id="fc-counter" class="text-sm font-bold text-slate-700 dark:text-slate-200">' +
              (state.currentIndex + 1) + ' / ' + state.cards.length +
            '</span>' +
            '<button type="button" id="btn-fc-filter-unmastered" class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ' +
              (state.onlyUnmastered
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800') + '">' +
              (state.onlyUnmastered ? 'Filter: Belum Paham ✓' : 'Semua Kartu') +
            '</button>' +
          '</div>' +

          '<button type="button" id="btn-fc-shuffle" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors">' +
            '<svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />' +
            '</svg>' +
            'Acak Kartu' +
          '</button>' +
        '</div>' +

        '<!-- Progress Bar -->' +
        '<div class="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">' +
          '<div id="fc-session-bar" class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" style="width: ' + posPct + '%"></div>' +
        '</div>' +
      '</div>' +

      '<!-- 3D Flip Card Stage -->' +
      '<div class="max-w-2xl mx-auto">' +
        '<div id="flashcard-stage" role="button" tabindex="0" aria-pressed="' + (state.isFlipped ? 'true' : 'false') + '" aria-label="Kartu flashcard. Klik atau tekan Spasi untuk membalik kartu." class="flip-perspective w-full h-72 sm:h-80 md:h-[360px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-3xl">' +
          '<div id="flashcard-inner" class="flip-card-inner ' + (state.isFlipped ? 'is-flipped' : '') + '">' +

            '<!-- FRONT FACE -->' +
            '<div class="flip-card-face rounded-3xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-card dark:shadow-card-dark p-6 sm:p-8 flex flex-col justify-between">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<span class="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Pertanyaan / Istilah</span>' +
                '<span id="fc-front-status" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ' +
                  (card.mastered
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300') + '">' +
                  '<span class="w-1.5 h-1.5 rounded-full ' + (card.mastered ? 'bg-emerald-500' : 'bg-amber-500') + '"></span>' +
                  (card.mastered ? 'Sudah Hafal' : 'Belum Paham') +
                '</span>' +
              '</div>' +

              '<div class="flex-1 flex items-center justify-center overflow-y-auto my-3 px-2">' +
                '<p id="fc-front-text" dir="' + KF.utils.getTextDir(card.front) + '" class="my-auto w-full text-center break-words whitespace-pre-line font-bold leading-relaxed ' +
                  (frontIsArab ? 'arabic-text text-3xl sm:text-4xl md:text-5xl text-slate-900 dark:text-white' : 'text-xl sm:text-2xl md:text-3xl text-slate-900 dark:text-white') + '">' +
                  KF.utils.escapeHtml(card.front) +
                '</p>' +
              '</div>' +

              '<div class="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">' +
                '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                  '<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />' +
                '</svg>' +
                '<span>Klik kartu atau tekan <kbd class="kbd-badge mx-0.5">Spasi</kbd> untuk balik</span>' +
              '</div>' +
            '</div>' +

            '<!-- BACK FACE -->' +
            '<div class="flip-card-face flip-card-back rounded-3xl border-2 border-indigo-200 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/60 shadow-card dark:shadow-card-dark p-6 sm:p-8 flex flex-col justify-between">' +
              '<div class="flex items-center justify-between gap-2">' +
                '<span class="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Jawaban / Arti</span>' +
                '<span id="fc-back-status" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ' +
                  (card.mastered
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300') + '">' +
                  '<span class="w-1.5 h-1.5 rounded-full ' + (card.mastered ? 'bg-emerald-500' : 'bg-amber-500') + '"></span>' +
                  (card.mastered ? 'Sudah Hafal' : 'Belum Paham') +
                '</span>' +
              '</div>' +

              '<div class="flex-1 flex items-center justify-center overflow-y-auto my-3 px-2">' +
                '<p id="fc-back-text" dir="' + KF.utils.getTextDir(card.back) + '" class="my-auto w-full text-center break-words whitespace-pre-line font-bold leading-relaxed ' +
                  (backIsArab ? 'arabic-text text-3xl sm:text-4xl md:text-5xl text-slate-900 dark:text-white' : 'text-xl sm:text-2xl md:text-3xl text-slate-900 dark:text-white') + '">' +
                  KF.utils.escapeHtml(card.back) +
                '</p>' +
              '</div>' +

              '<div class="flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">' +
                '<span>Klik kartu atau tekan <kbd class="kbd-badge mx-0.5">Spasi</kbd> untuk kembali ke depan</span>' +
              '</div>' +
            '</div>' +

          '</div>' +
        '</div>' +

        '<!-- Self-Grading & Navigation Controls -->' +
        '<div class="mt-5 space-y-3">' +
          '<!-- Self-grading row -->' +
          '<div class="grid grid-cols-2 gap-3">' +
            '<button type="button" id="btn-fc-unmastered" class="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold text-sm shadow-sm active:scale-[0.99] transition-all">' +
              '<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' +
              '</svg>' +
              '<span>Belum Paham</span>' +
              '<kbd class="hidden sm:inline-flex kbd-badge text-[10px] ml-1">1</kbd>' +
            '</button>' +

            '<button type="button" id="btn-fc-mastered" class="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-emerald-400 dark:border-emerald-500/50 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all">' +
              '<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />' +
              '</svg>' +
              '<span>Sudah Hafal</span>' +
              '<kbd class="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-emerald-700/60 text-emerald-100 font-mono text-[10px] ml-1">2</kbd>' +
            '</button>' +
          '</div>' +

          '<!-- Prev / Flip / Next Row -->' +
          '<div class="flex items-center justify-between gap-3 pt-1">' +
            '<button type="button" id="btn-fc-prev" ' + (state.currentIndex === 0 ? 'disabled' : '') + ' class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
              '</svg>' +
              '<span>Sebelumnya</span>' +
            '</button>' +

            '<button type="button" id="btn-fc-flip" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">' +
              'Balik Kartu' +
            '</button>' +

            '<button type="button" id="btn-fc-next" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">' +
              '<span>' + (state.currentIndex === state.cards.length - 1 ? 'Selesai' : 'Berikutnya') + '</span>' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindEvents();
  }

  function bindEvents() {
    var backBtn = document.getElementById('btn-fc-back');
    if (backBtn) backBtn.addEventListener('click', function () { KF.app.navigate('dashboard'); });

    var manageBtn = document.getElementById('btn-fc-manage');
    if (manageBtn) manageBtn.addEventListener('click', function () { KF.app.navigate('manage', state.deckId); });

    var emptyAddBtn = document.getElementById('btn-fc-empty-add');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', function () { KF.app.navigate('manage', state.deckId); });

    var showAllBtn = document.getElementById('btn-fc-show-all');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', function () {
        state.onlyUnmastered = false;
        state.currentIndex = 0;
        syncSessionCards(false);
        render();
      });
    }

    var tryQuizBtn = document.getElementById('btn-fc-try-quiz');
    if (tryQuizBtn) tryQuizBtn.addEventListener('click', function () { KF.app.navigate('quiz', state.deckId); });

    var reviewUnmasteredBtn = document.getElementById('btn-fc-review-unmastered');
    if (reviewUnmasteredBtn) {
      reviewUnmasteredBtn.addEventListener('click', function () {
        state.onlyUnmastered = true;
        state.sessionCompleted = false;
        state.currentIndex = 0;
        state.isFlipped = false;
        syncSessionCards(false);
        render();
      });
    }

    var restartBtn = document.getElementById('btn-fc-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        state.onlyUnmastered = false;
        state.sessionCompleted = false;
        state.currentIndex = 0;
        state.isFlipped = false;
        syncSessionCards(false);
        render();
      });
    }

    var filterBtn = document.getElementById('btn-fc-filter-unmastered');
    if (filterBtn) filterBtn.addEventListener('click', toggleFilterUnmastered);

    var shuffleBtn = document.getElementById('btn-fc-shuffle');
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleDeck);

    var stage = document.getElementById('flashcard-stage');
    if (stage) {
      stage.addEventListener('click', function () {
        var sel = global.getSelection ? global.getSelection().toString() : '';
        if (sel && sel.length > 0) return;
        flipCard();
      });
    }

    var flipBtn = document.getElementById('btn-fc-flip');
    if (flipBtn) flipBtn.addEventListener('click', flipCard);

    var prevBtn = document.getElementById('btn-fc-prev');
    if (prevBtn) prevBtn.addEventListener('click', prevCard);

    var nextBtn = document.getElementById('btn-fc-next');
    if (nextBtn) nextBtn.addEventListener('click', nextCard);

    var unmasteredBtn = document.getElementById('btn-fc-unmastered');
    if (unmasteredBtn) unmasteredBtn.addEventListener('click', function () { gradeCurrentCard(false); });

    var masteredBtn = document.getElementById('btn-fc-mastered');
    if (masteredBtn) masteredBtn.addEventListener('click', function () { gradeCurrentCard(true); });
  }

  function handleKeydown(e) {
    if (state.sessionCompleted || state.cards.length === 0) return;

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      flipCard();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevCard();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextCard();
    } else if (e.key === '1') {
      e.preventDefault();
      gradeCurrentCard(false);
    } else if (e.key === '2') {
      e.preventDefault();
      gradeCurrentCard(true);
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      shuffleDeck();
    }
  }

  KF.flashcard = {
    start: start,
    render: render,
    flipCard: flipCard,
    prevCard: prevCard,
    nextCard: nextCard,
    shuffleDeck: shuffleDeck,
    handleKeydown: handleKeydown
  };
})(typeof window !== 'undefined' ? window : globalThis);
