/**
 * KartaFlash - Mode 1: Interactive 3D Flashcard Study Module (Focus Mode)
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
    isReversed: false,
    onlyUnmastered: false,
    sessionCompleted: false,
    historyStack: [],
    touchStartX: 0,
    touchStartY: 0,
    ignoreNextStageClick: false
  };

  function getFaceText(card, face) {
    if (!card) return '';
    if (face === 'front') {
      return state.isReversed ? card.back : card.front;
    }
    return state.isReversed ? card.front : card.back;
  }

  function getFaceLabel(face) {
    if (face === 'front') {
      return state.isReversed ? 'Jawaban / Arti (Dibalik)' : 'Pertanyaan / Istilah';
    }
    return state.isReversed ? 'Pertanyaan / Istilah' : 'Jawaban / Arti';
  }

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
    state.isReversed = false;
    state.onlyUnmastered = false;
    state.sessionCompleted = false;
    state.historyStack = [];
    KF.storage.saveLastSession(deckId, 'flashcard');
    syncSessionCards(false);
    render();
  }

  function syncActionDockVisibility() {
    var recallWrap = document.getElementById('fc-primary-recall');
    var gradeGrid = document.getElementById('fc-grade-grid');
    var flipBtn = document.getElementById('btn-fc-flip');
    if (recallWrap) {
      recallWrap.classList.toggle('is-hidden', state.isFlipped);
    }
    if (gradeGrid) {
      gradeGrid.classList.toggle('is-hidden', !state.isFlipped);
    }
    if (flipBtn) {
      flipBtn.classList.toggle('is-hidden', !state.isFlipped);
    }
  }

  function syncUndoButton() {
    var undoBtn = document.getElementById('btn-fc-undo');
    if (undoBtn) {
      undoBtn.disabled = state.historyStack.length === 0;
    }
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
    syncActionDockVisibility();
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

    state.historyStack.push({
      index: state.currentIndex,
      cardId: currentCard.id,
      prevMastered: Boolean(currentCard.mastered)
    });

    KF.storage.setCardMastered(state.deckId, currentCard.id, mastered);
    currentCard.mastered = Boolean(mastered);

    if (state.currentIndex < state.cards.length - 1) {
      goToCard(state.currentIndex + 1, 'next');
    } else {
      state.sessionCompleted = true;
      render();
    }
  }

  function undoLastGrade() {
    if (state.historyStack.length === 0) return;
    var last = state.historyStack.pop();
    KF.storage.setCardMastered(state.deckId, last.cardId, last.prevMastered);

    for (var i = 0; i < state.cards.length; i++) {
      if (state.cards[i].id === last.cardId) {
        state.cards[i].mastered = last.prevMastered;
        break;
      }
    }

    var wasComplete = state.sessionCompleted;
    state.sessionCompleted = false;
    state.currentIndex = Math.min(last.index, Math.max(0, state.cards.length - 1));
    state.isFlipped = true;

    if (wasComplete || !document.getElementById('flashcard-inner')) {
      render();
    } else {
      updateCardView('prev', true);
    }
    KF.utils.showToast('Penilaian terakhir dibatalkan.', 'info');
  }

  function shuffleDeck() {
    if (state.cards.length <= 1) return;
    state.isShuffled = true;
    state.sessionCompleted = false;
    state.currentIndex = 0;
    state.isFlipped = false;
    state.cards = KF.utils.shuffleArray(state.cards);
    render();
    KF.utils.showToast('Urutan kartu diacak.', 'info');
  }

  function toggleFilterUnmastered() {
    state.onlyUnmastered = !state.onlyUnmastered;
    state.currentIndex = 0;
    state.isFlipped = false;
    state.sessionCompleted = false;
    state.historyStack = [];
    syncSessionCards(false);
    render();
  }

  function toggleReverseMode() {
    state.isReversed = !state.isReversed;
    state.isFlipped = false;
    render();
  }

  function updateCardView(direction, keepFlipped) {
    var deck = KF.storage.getDeckById(state.deckId);
    if (!deck) return;
    var card = state.cards[state.currentIndex];
    if (!card) return;

    var inner = document.getElementById('flashcard-inner');
    var stage = document.getElementById('flashcard-stage');
    var stackWrap = document.getElementById('flashcard-stack');
    if (!inner || !stage) {
      render();
      return;
    }

    // Reset flip without leaking the next card's back side during transition
    inner.classList.add('no-transition');
    inner.classList.toggle('is-flipped', Boolean(keepFlipped));

    var frontTextEl = document.getElementById('fc-front-text');
    var backTextEl = document.getElementById('fc-back-text');
    var frontLabelEl = document.getElementById('fc-front-label');
    var backLabelEl = document.getElementById('fc-back-label');
    var frontStatusEl = document.getElementById('fc-front-status');
    var backStatusEl = document.getElementById('fc-back-status');
    var counterEl = document.getElementById('fc-counter');
    var sessionBarEl = document.getElementById('fc-session-bar');
    var masteryBadgeEl = document.getElementById('fc-mastery-badge');
    var prevBtn = document.getElementById('btn-fc-prev');
    var nextBtn = document.getElementById('btn-fc-next');

    applyCardFaceContent(frontTextEl, getFaceText(card, 'front'));
    applyCardFaceContent(backTextEl, getFaceText(card, 'back'));

    if (frontLabelEl) frontLabelEl.textContent = getFaceLabel('front');
    if (backLabelEl) backLabelEl.textContent = getFaceLabel('back');

    updateStatusBadge(frontStatusEl, card.mastered);
    updateStatusBadge(backStatusEl, card.mastered);

    var stats = KF.utils.getDeckStats(deck);
    var posPct = Math.round(((state.currentIndex + 1) / state.cards.length) * 100);

    if (counterEl) counterEl.textContent = (state.currentIndex + 1) + ' / ' + state.cards.length;
    if (sessionBarEl) sessionBarEl.style.width = posPct + '%';
    if (masteryBadgeEl) masteryBadgeEl.textContent = stats.mastered + ' / ' + stats.total + ' hafal (' + stats.percentage + '%)';

    if (stackWrap) {
      stackWrap.classList.toggle('has-stack', state.cards.length - state.currentIndex > 1);
    }

    if (prevBtn) prevBtn.disabled = state.currentIndex === 0;
    if (nextBtn) {
      var isLast = state.currentIndex === state.cards.length - 1;
      nextBtn.querySelector('span').textContent = isLast ? 'Selesai' : 'Berikutnya';
    }

    stage.setAttribute('aria-pressed', keepFlipped ? 'true' : 'false');
    syncActionDockVisibility();
    syncUndoButton();

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
    el.className = 'fc-card-text ' + (isArab ? 'fc-card-text-arab' : 'fc-card-text-latin');
  }

  function updateStatusBadge(el, mastered) {
    if (!el) return;
    if (mastered) {
      el.className = 'status-pill status-pill-mastered';
      el.innerHTML = '<span class="status-pill-dot"></span>Sudah Hafal';
    } else {
      el.className = 'status-pill status-pill-learning';
      el.innerHTML = '<span class="status-pill-dot"></span>Belum Hafal';
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

    // Distraction-free Focus Topbar
    var headerHtml =
      '<div class="focus-topbar">' +
        '<div class="focus-topbar-left">' +
          '<button type="button" id="btn-fc-back" class="btn btn-secondary btn-sm">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="15 18 9 12 15 6"></polyline>' +
            '</svg>' +
            'Kembali' +
          '</button>' +
          '<h1 id="flashcard-heading" dir="' + titleDir + '" class="focus-deck-title ' + titleArabic + '">' +
            KF.utils.escapeHtml(deck.title) +
          '</h1>' +
        '</div>' +

        '<div class="focus-topbar-right">' +
          '<span id="fc-mastery-badge" class="status-pill status-pill-mastered font-mono">' +
            stats.mastered + ' / ' + stats.total + ' hafal (' + stats.percentage + '%)' +
          '</span>' +
          '<button type="button" id="btn-fc-manage" class="btn btn-ghost btn-sm">Kelola Kartu</button>' +
          '<button type="button" id="btn-fc-shortcuts" title="Pintasan Keyboard (?)" aria-label="Pintasan Keyboard" class="btn btn-icon btn-ghost">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<circle cx="12" cy="12" r="9"></circle>' +
              '<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"></path>' +
              '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    // Empty Deck Guard
    if (deck.cards.length === 0) {
      container.innerHTML =
        headerHtml +
        '<div class="editorial-notice-card">' +
          '<h2 class="notice-title">Deck ini masih kosong</h2>' +
          '<p class="notice-desc">Tambahkan minimal 1 kartu terlebih dahulu untuk mulai belajar dengan kartu bolak-balik.</p>' +
          '<div class="notice-actions">' +
            '<button type="button" id="btn-fc-empty-add" class="btn btn-primary">+ Tambah Kartu Sekarang</button>' +
          '</div>' +
        '</div>';
      bindEvents();
      return;
    }

    // All cards mastered while filtering unmastered
    if (state.onlyUnmastered && state.cards.length === 0) {
      container.innerHTML =
        headerHtml +
        '<div class="editorial-notice-card">' +
          '<div class="notice-seal notice-seal-success">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="20 6 9 17 4 12"></polyline>' +
            '</svg>' +
          '</div>' +
          '<h2 class="notice-title">Semua Kartu Sudah Hafal</h2>' +
          '<p class="notice-desc">Tidak ada lagi kartu dengan status "Belum Hafal" di deck ini.</p>' +
          '<div class="notice-actions">' +
            '<button type="button" id="btn-fc-show-all" class="btn btn-primary">Tampilkan Semua Kartu</button>' +
            '<button type="button" id="btn-fc-try-quiz" class="btn btn-secondary">Uji dengan Kuis</button>' +
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
        '<div class="editorial-notice-card">' +
          '<div class="notice-seal notice-seal-primary">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="20 6 9 17 4 12"></polyline>' +
            '</svg>' +
          '</div>' +
          '<h2 class="notice-title">Sesi Belajar Selesai</h2>' +
          '<p class="notice-desc">Kamu telah meninjau ' + state.cards.length + ' kartu dalam sesi ini.</p>' +

          '<div class="tally-grid">' +
            '<div class="tally-box tally-box-success">' +
              '<p class="tally-label">Sudah Hafal</p>' +
              '<p class="tally-value">' + stats.mastered + ' kartu</p>' +
            '</div>' +
            '<div class="tally-box tally-box-warm">' +
              '<p class="tally-label">Belum Hafal</p>' +
              '<p class="tally-value">' + unmasteredCount + ' kartu</p>' +
            '</div>' +
          '</div>' +

          '<div class="notice-actions">' +
            (unmasteredCount > 0
              ? '<button type="button" id="btn-fc-review-unmastered" class="btn btn-warm">Ulangi yang Belum Hafal (' + unmasteredCount + ')</button>'
              : '') +
            '<button type="button" id="btn-fc-restart" class="btn btn-primary">Ulangi Semua Kartu</button>' +
            '<button type="button" id="btn-fc-try-quiz" class="btn btn-secondary">Lanjut ke Kuis</button>' +
          '</div>' +
        '</div>';
      bindEvents();
      return;
    }

    var card = state.cards[state.currentIndex];
    var posPct = Math.round(((state.currentIndex + 1) / state.cards.length) * 100);
    var frontText = getFaceText(card, 'front');
    var backText = getFaceText(card, 'back');
    var frontIsArab = KF.utils.hasArabic(frontText);
    var backIsArab = KF.utils.hasArabic(backText);
    var hasStack = state.cards.length - state.currentIndex > 1;

    container.innerHTML =
      '<div class="fc-workspace">' +
        headerHtml +

        '<div class="fc-controls-row">' +
          '<div class="fc-controls-left">' +
            '<span id="fc-counter" class="fc-counter">' + (state.currentIndex + 1) + ' / ' + state.cards.length + '</span>' +
            '<button type="button" id="btn-fc-filter-unmastered" class="pill-toggle ' + (state.onlyUnmastered ? 'is-active' : '') + '">' +
              (state.onlyUnmastered ? 'Filter: Belum Hafal ✓' : 'Semua Kartu') +
            '</button>' +
            '<button type="button" id="btn-fc-reverse" class="pill-toggle ' + (state.isReversed ? 'is-active-primary' : '') + '" title="Balik arah pertanyaan & jawaban">' +
              (state.isReversed ? 'Belakang → Depan' : 'Depan → Belakang') +
            '</button>' +
          '</div>' +

          '<div class="fc-controls-right">' +
            '<button type="button" id="btn-fc-undo" ' + (state.historyStack.length === 0 ? 'disabled' : '') + ' class="btn btn-secondary btn-sm" title="Batalkan penilaian terakhir (Z)">' +
              'Undo' +
            '</button>' +
            '<button type="button" id="btn-fc-shuffle" class="btn btn-secondary btn-sm" title="Acak urutan kartu (S)">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="16 3 21 3 21 8"></polyline>' +
                '<line x1="4" y1="20" x2="21" y2="3"></line>' +
                '<polyline points="21 16 21 21 16 21"></polyline>' +
                '<line x1="15" y1="15" x2="21" y2="21"></line>' +
                '<line x1="4" y1="4" x2="9" y2="9"></line>' +
              '</svg>' +
              'Acak' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<div class="fc-session-track">' +
          '<div id="fc-session-bar" class="fc-session-fill" style="width: ' + posPct + '%"></div>' +
        '</div>' +

        '<div id="flashcard-stack" class="flashcard-stack ' + (hasStack ? 'has-stack' : '') + '">' +
          '<div id="flashcard-stage" role="button" tabindex="0" aria-pressed="' + (state.isFlipped ? 'true' : 'false') + '" aria-label="Kartu belajar. Klik atau tekan Spasi untuk membalik kartu." class="flip-perspective">' +
            '<div id="flashcard-inner" class="flip-card-inner ' + (state.isFlipped ? 'is-flipped' : '') + '">' +

              '<!-- FRONT FACE -->' +
              '<div class="flip-card-face">' +
                '<div class="fc-face-header">' +
                  '<span id="fc-front-label" class="fc-face-label">' + getFaceLabel('front') + '</span>' +
                  '<span id="fc-front-status" class="status-pill ' + (card.mastered ? 'status-pill-mastered' : 'status-pill-learning') + '">' +
                    '<span class="status-pill-dot"></span>' +
                    (card.mastered ? 'Sudah Hafal' : 'Belum Hafal') +
                  '</span>' +
                '</div>' +

                '<div class="fc-face-body">' +
                  '<p id="fc-front-text" dir="' + KF.utils.getTextDir(frontText) + '" class="fc-card-text ' + (frontIsArab ? 'fc-card-text-arab' : 'fc-card-text-latin') + '">' +
                    KF.utils.escapeHtml(frontText) +
                  '</p>' +
                '</div>' +

                '<div class="fc-face-footer">' +
                  '<span>Ketuk kartu atau tekan <kbd class="kbd-badge">Spasi</kbd> untuk balik</span>' +
                '</div>' +
              '</div>' +

              '<!-- BACK FACE -->' +
              '<div class="flip-card-face flip-card-back">' +
                '<div class="fc-face-header">' +
                  '<span id="fc-back-label" class="fc-face-label">' + getFaceLabel('back') + '</span>' +
                  '<span id="fc-back-status" class="status-pill ' + (card.mastered ? 'status-pill-mastered' : 'status-pill-learning') + '">' +
                    '<span class="status-pill-dot"></span>' +
                    (card.mastered ? 'Sudah Hafal' : 'Belum Hafal') +
                  '</span>' +
                '</div>' +

                '<div class="fc-face-body">' +
                  '<p id="fc-back-text" dir="' + KF.utils.getTextDir(backText) + '" class="fc-card-text ' + (backIsArab ? 'fc-card-text-arab' : 'fc-card-text-latin') + '">' +
                    KF.utils.escapeHtml(backText) +
                  '</p>' +
                '</div>' +

                '<div class="fc-face-footer">' +
                  '<span>Nilai ingatanmu di bawah, atau tekan <kbd class="kbd-badge">1</kbd> / <kbd class="kbd-badge">2</kbd></span>' +
                '</div>' +
              '</div>' +

            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Progressive Active Recall & Grading Dock -->' +
        '<div class="fc-action-dock">' +
          '<div id="fc-primary-recall" class="fc-primary-recall ' + (state.isFlipped ? 'is-hidden' : '') + '">' +
            '<button type="button" id="btn-fc-reveal" class="btn btn-primary btn-lg fc-reveal-btn">' +
              '<span>Tampilkan Jawaban</span>' +
              '<kbd class="kbd-badge kbd-on-dark">Spasi</kbd>' +
            '</button>' +
          '</div>' +

          '<div id="fc-grade-grid" class="fc-grade-grid ' + (state.isFlipped ? '' : 'is-hidden') + '">' +
            '<button type="button" id="btn-fc-unmastered" class="btn btn-warm fc-grade-btn">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="1 4 1 10 7 10"></polyline>' +
                '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>' +
              '</svg>' +
              '<span>Belum Hafal</span>' +
              '<kbd class="kbd-badge">1</kbd>' +
            '</button>' +

            '<button type="button" id="btn-fc-mastered" class="btn btn-success fc-grade-btn">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="20 6 9 17 4 12"></polyline>' +
              '</svg>' +
              '<span>Sudah Hafal</span>' +
              '<kbd class="kbd-badge kbd-on-dark">2</kbd>' +
            '</button>' +
          '</div>' +

          '<div class="fc-nav-row">' +
            '<button type="button" id="btn-fc-prev" ' + (state.currentIndex === 0 ? 'disabled' : '') + ' class="btn btn-secondary btn-sm">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="15 18 9 12 15 6"></polyline>' +
              '</svg>' +
              '<span>Sebelumnya</span>' +
            '</button>' +

            '<button type="button" id="btn-fc-flip" class="btn btn-ghost btn-sm ' + (state.isFlipped ? '' : 'is-hidden') + '">' +
              'Lihat Pertanyaan' +
            '</button>' +

            '<button type="button" id="btn-fc-next" class="btn btn-secondary btn-sm">' +
              '<span>' + (state.currentIndex === state.cards.length - 1 ? 'Selesai' : 'Berikutnya') + '</span>' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="9 18 15 12 9 6"></polyline>' +
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

    var shortcutsBtn = document.getElementById('btn-fc-shortcuts');
    if (shortcutsBtn) shortcutsBtn.addEventListener('click', function () { KF.utils.openModal('modal-shortcuts'); });

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
        state.historyStack = [];
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
        state.historyStack = [];
        syncSessionCards(false);
        render();
      });
    }

    var filterBtn = document.getElementById('btn-fc-filter-unmastered');
    if (filterBtn) filterBtn.addEventListener('click', toggleFilterUnmastered);

    var reverseBtn = document.getElementById('btn-fc-reverse');
    if (reverseBtn) reverseBtn.addEventListener('click', toggleReverseMode);

    var undoBtn = document.getElementById('btn-fc-undo');
    if (undoBtn) undoBtn.addEventListener('click', undoLastGrade);

    var shuffleBtn = document.getElementById('btn-fc-shuffle');
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleDeck);

    var stage = document.getElementById('flashcard-stage');
    if (stage) {
      stage.addEventListener('touchstart', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        state.touchStartX = e.touches[0].clientX;
        state.touchStartY = e.touches[0].clientY;
      }, { passive: true });

      stage.addEventListener('touchend', function (e) {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        var dx = e.changedTouches[0].clientX - state.touchStartX;
        var dy = e.changedTouches[0].clientY - state.touchStartY;
        if (Math.abs(dx) > 55 && Math.abs(dy) < 48) {
          state.ignoreNextStageClick = true;
          if (dx < 0) {
            nextCard();
          } else {
            prevCard();
          }
        }
      }, { passive: true });

      stage.addEventListener('click', function () {
        if (state.ignoreNextStageClick) {
          state.ignoreNextStageClick = false;
          return;
        }
        var sel = global.getSelection ? global.getSelection().toString() : '';
        if (sel && sel.length > 0) return;
        flipCard();
      });
    }

    var revealBtn = document.getElementById('btn-fc-reveal');
    if (revealBtn) revealBtn.addEventListener('click', flipCard);

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
    if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) {
      if (state.historyStack.length > 0) {
        e.preventDefault();
        undoLastGrade();
      }
      return;
    }

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
    undoLastGrade: undoLastGrade,
    handleKeydown: handleKeydown
  };
})(typeof window !== 'undefined' ? window : globalThis);
