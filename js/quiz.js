/**
 * KartaFlash - Mode 2: Interactive Multiple-Choice Quiz Module (Focus Mode)
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});
  var QUESTION_SECONDS = 15;

  var state = {
    deckId: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    correctCardIds: [],
    wrongAnswers: [],
    wrongCards: [],
    currentOptions: [],
    isLocked: false,
    isFinished: false,
    timedMode: true,
    timerIntervalId: null,
    advanceTimeoutId: null,
    questionStartTime: 0,
    remainingMs: QUESTION_SECONDS * 1000
  };

  function cleanup() {
    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }
    if (state.advanceTimeoutId) {
      clearTimeout(state.advanceTimeoutId);
      state.advanceTimeoutId = null;
    }
  }

  function countUniqueAnswers(cards) {
    var seen = {};
    var count = 0;
    for (var i = 0; i < cards.length; i++) {
      var key = String(cards[i].back || '').trim().toLowerCase();
      if (key && !seen[key]) {
        seen[key] = true;
        count++;
      }
    }
    return count;
  }

  function generateQuestionOptions(targetCard, allCards) {
    var targetKey = String(targetCard.back || '').trim().toLowerCase();
    var seenKeys = {};
    seenKeys[targetKey] = true;

    var distractorPool = [];
    for (var i = 0; i < allCards.length; i++) {
      var c = allCards[i];
      if (!c || c.id === targetCard.id) continue;
      var norm = String(c.back || '').trim().toLowerCase();
      if (!norm || seenKeys[norm]) continue;
      seenKeys[norm] = true;
      distractorPool.push(c.back);
    }

    var pickedDistractors = KF.utils.shuffleArray(distractorPool).slice(0, 3);
    var options = [{ text: targetCard.back, isCorrect: true }];

    for (var j = 0; j < pickedDistractors.length; j++) {
      options.push({ text: pickedDistractors[j], isCorrect: false });
    }

    return KF.utils.shuffleArray(options);
  }

  function beginSession(deck, customQuestions) {
    cleanup();
    state.deckId = deck.id;
    state.currentIndex = 0;
    state.score = 0;
    state.correctCardIds = [];
    state.wrongAnswers = [];
    state.wrongCards = [];
    state.isLocked = false;
    state.isFinished = false;
    state.timedMode = KF.storage.getQuizTimedMode();

    KF.storage.saveLastSession(deck.id, 'quiz');

    if (deck.cards.length < 4 || countUniqueAnswers(deck.cards) < 4) {
      state.questions = [];
      renderPrerequisiteNotice(deck);
      return;
    }

    var source = Array.isArray(customQuestions) && customQuestions.length > 0
      ? customQuestions
      : deck.cards;

    state.questions = KF.utils.shuffleArray(source);
    loadCurrentQuestion();
  }

  function start(deckId) {
    var deck = KF.storage.getDeckById(deckId);
    if (!deck) {
      KF.app.navigate('dashboard');
      return;
    }
    beginSession(deck, null);
  }

  function renderPrerequisiteNotice(deck) {
    var container = document.getElementById('quiz-container');
    if (!container) return;

    var notEnoughCards = deck.cards.length < 4;
    container.innerHTML =
      '<div class="quiz-workspace">' +
        '<div class="focus-topbar">' +
          '<div class="focus-topbar-left">' +
            '<button type="button" id="btn-quiz-back" class="btn btn-secondary btn-sm">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="15 18 9 12 15 6"></polyline>' +
              '</svg>' +
              'Kembali' +
            '</button>' +
            '<h1 id="quiz-heading" class="focus-deck-title">' + KF.utils.escapeHtml(deck.title) + '</h1>' +
          '</div>' +
        '</div>' +

        '<div class="editorial-notice-card">' +
          '<div class="notice-seal notice-seal-warm">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' +
              '<line x1="12" y1="9" x2="12" y2="13"></line>' +
              '<line x1="12" y1="17" x2="12.01" y2="17"></line>' +
            '</svg>' +
          '</div>' +
          '<h2 class="notice-title">' + (notEnoughCards ? 'Minimal 4 Kartu Diperlukan' : 'Butuh Minimal 4 Jawaban Unik') + '</h2>' +
          '<p class="notice-desc">' +
            (notEnoughCards
              ? 'Deck "' + KF.utils.escapeHtml(deck.title) + '" baru memiliki ' + deck.cards.length + ' kartu. Tambahkan minimal ' + (4 - deck.cards.length) + ' kartu lagi agar Mode Kuis bisa menyusun 4 pilihan jawaban.'
              : 'Deck "' + KF.utils.escapeHtml(deck.title) + '" memiliki beberapa kartu dengan jawaban yang sama persis sehingga belum cukup untuk 4 pilihan unik.') +
          '</p>' +
          '<div class="notice-actions">' +
            '<button type="button" id="btn-quiz-go-manage" class="btn btn-primary">+ Kelola &amp; Tambah Kartu</button>' +
            '<button type="button" id="btn-quiz-go-flashcard" class="btn btn-secondary">Belajar Flashcard</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var backBtn = document.getElementById('btn-quiz-back');
    if (backBtn) backBtn.addEventListener('click', function () { KF.app.navigate('dashboard'); });

    var manageBtn = document.getElementById('btn-quiz-go-manage');
    if (manageBtn) manageBtn.addEventListener('click', function () { KF.app.navigate('manage', state.deckId); });

    var fcBtn = document.getElementById('btn-quiz-go-flashcard');
    if (fcBtn) fcBtn.addEventListener('click', function () { KF.app.navigate('flashcard', state.deckId); });
  }

  function loadCurrentQuestion() {
    cleanup();
    var deck = KF.storage.getDeckById(state.deckId);
    if (!deck) {
      KF.app.navigate('dashboard');
      return;
    }

    if (state.currentIndex >= state.questions.length) {
      state.isFinished = true;
      renderResults(deck);
      return;
    }

    state.isLocked = false;
    state.remainingMs = QUESTION_SECONDS * 1000;
    var qCard = state.questions[state.currentIndex];
    state.currentOptions = generateQuestionOptions(qCard, deck.cards);

    renderQuestion(deck, qCard);
    if (state.timedMode) {
      startTimer();
    }
  }

  function startTimer() {
    var totalMs = QUESTION_SECONDS * 1000;
    state.questionStartTime = Date.now();

    state.timerIntervalId = setInterval(function () {
      var elapsed = Date.now() - state.questionStartTime;
      state.remainingMs = Math.max(0, totalMs - elapsed);

      var secLeft = Math.ceil(state.remainingMs / 1000);
      var pct = Math.max(0, (state.remainingMs / totalMs) * 100);

      var timerText = document.getElementById('quiz-timer-text');
      var timerBar = document.getElementById('quiz-timer-bar');
      var timerPill = document.getElementById('quiz-timer-pill');

      if (timerText) timerText.textContent = secLeft + 'd';
      if (timerBar) {
        timerBar.style.width = pct + '%';
        if (secLeft <= 3) {
          timerBar.className = 'quiz-timer-strip-fill is-urgent';
        } else if (secLeft <= 6) {
          timerBar.className = 'quiz-timer-strip-fill is-warning';
        } else {
          timerBar.className = 'quiz-timer-strip-fill';
        }
      }

      if (timerPill) {
        if (secLeft <= 3) {
          timerPill.className = 'timer-pill is-urgent';
        } else if (secLeft <= 6) {
          timerPill.className = 'timer-pill is-warning';
        } else {
          timerPill.className = 'timer-pill';
        }
      }

      if (state.remainingMs <= 0) {
        clearInterval(state.timerIntervalId);
        state.timerIntervalId = null;
        handleTimeout();
      }
    }, 100);
  }

  function toggleTimedMode() {
    if (state.isLocked || state.isFinished) return;
    state.timedMode = !state.timedMode;
    KF.storage.saveQuizTimedMode(state.timedMode);

    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }

    var toggleBtn = document.getElementById('btn-quiz-toggle-timer');
    var timerStrip = document.getElementById('quiz-timer-strip');
    var timerPill = document.getElementById('quiz-timer-pill');
    var timerBar = document.getElementById('quiz-timer-bar');
    var timerText = document.getElementById('quiz-timer-text');

    if (toggleBtn) {
      toggleBtn.classList.toggle('is-active-primary', !state.timedMode);
      toggleBtn.textContent = state.timedMode ? 'Timer: 15d' : 'Mode Santai ✓';
    }

    if (state.timedMode) {
      state.remainingMs = QUESTION_SECONDS * 1000;
      if (timerStrip) timerStrip.classList.remove('is-hidden');
      if (timerBar) {
        timerBar.style.width = '100%';
        timerBar.className = 'quiz-timer-strip-fill';
      }
      if (timerPill) timerPill.className = 'timer-pill';
      if (timerText) timerText.textContent = QUESTION_SECONDS + 'd';
      startTimer();
    } else {
      if (timerStrip) timerStrip.classList.add('is-hidden');
      if (timerPill) timerPill.className = 'timer-pill';
      if (timerText) timerText.textContent = 'Santai';
    }
  }

  function handleTimeout() {
    if (state.isLocked) return;
    state.isLocked = true;

    var qCard = state.questions[state.currentIndex];
    state.wrongCards.push(qCard);
    state.wrongAnswers.push({
      front: qCard.front,
      correctAnswer: qCard.back,
      userAnswer: null,
      timedOut: true
    });

    revealOptionFeedback(-1, false, true);
  }

  function selectOption(optionIndex) {
    if (state.isLocked || state.isFinished) return;
    if (optionIndex < 0 || optionIndex >= state.currentOptions.length) return;

    state.isLocked = true;
    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }

    var qCard = state.questions[state.currentIndex];
    var chosen = state.currentOptions[optionIndex];
    var isCorrect = Boolean(chosen && chosen.isCorrect);

    if (isCorrect) {
      state.score++;
      state.correctCardIds.push(qCard.id);
    } else {
      state.wrongCards.push(qCard);
      state.wrongAnswers.push({
        front: qCard.front,
        correctAnswer: qCard.back,
        userAnswer: chosen ? chosen.text : '',
        timedOut: false
      });
    }

    revealOptionFeedback(optionIndex, isCorrect, false);

    // Only auto-advance when correct; wrong answers stay paused so user can study the correction
    if (isCorrect) {
      scheduleNextQuestion(1050);
    }
  }

  function revealOptionFeedback(selectedIdx, isCorrect, isTimeout) {
    var buttons = document.querySelectorAll('[data-quiz-option]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var opt = state.currentOptions[i];
      btn.disabled = true;

      if (opt.isCorrect) {
        btn.className = 'quiz-option is-correct';
        var badge = btn.querySelector('.opt-status-icon');
        if (badge) {
          badge.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="20 6 9 17 4 12"></polyline>' +
            '</svg>';
        }
      } else if (i === selectedIdx && !isCorrect) {
        btn.className = 'quiz-option is-wrong';
        var wrongBadge = btn.querySelector('.opt-status-icon');
        if (wrongBadge) {
          wrongBadge.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<line x1="18" y1="6" x2="6" y2="18"></line>' +
              '<line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>';
        }
      } else {
        btn.className = 'quiz-option is-muted';
      }
    }

    var feedbackBanner = document.getElementById('quiz-feedback-banner');
    if (feedbackBanner) {
      feedbackBanner.classList.remove('is-hidden');
      if (isTimeout) {
        feedbackBanner.className = 'quiz-feedback-banner is-wrong';
        feedbackBanner.innerHTML =
          '<span>Waktu habis — pelajari jawaban benar yang ditandai hijau.</span>' +
          '<button type="button" id="btn-quiz-skip-wait" class="btn btn-secondary btn-sm">Soal Berikutnya <kbd class="kbd-badge">Enter</kbd></button>';
      } else if (isCorrect) {
        feedbackBanner.className = 'quiz-feedback-banner is-correct';
        feedbackBanner.innerHTML =
          '<span>Tepat sekali!</span>' +
          '<button type="button" id="btn-quiz-skip-wait" class="btn btn-secondary btn-sm">Lanjut →</button>';
      } else {
        feedbackBanner.className = 'quiz-feedback-banner is-wrong';
        feedbackBanner.innerHTML =
          '<span>Kurang tepat — jawaban benar ditandai warna hijau.</span>' +
          '<button type="button" id="btn-quiz-skip-wait" class="btn btn-secondary btn-sm">Soal Berikutnya <kbd class="kbd-badge">Enter</kbd></button>';
      }

      var skipBtn = document.getElementById('btn-quiz-skip-wait');
      if (skipBtn) {
        skipBtn.addEventListener('click', advanceToNextQuestion);
      }
    }
  }

  function scheduleNextQuestion(delayMs) {
    if (state.advanceTimeoutId) clearTimeout(state.advanceTimeoutId);
    state.advanceTimeoutId = setTimeout(function () {
      advanceToNextQuestion();
    }, delayMs);
  }

  function advanceToNextQuestion() {
    if (state.advanceTimeoutId) {
      clearTimeout(state.advanceTimeoutId);
      state.advanceTimeoutId = null;
    }
    state.currentIndex++;
    loadCurrentQuestion();
  }

  function renderQuestion(deck, qCard) {
    var container = document.getElementById('quiz-container');
    if (!container) return;

    var letters = ['A', 'B', 'C', 'D'];
    var totalQ = state.questions.length;
    var progressPct = Math.round(((state.currentIndex + 1) / totalQ) * 100);
    var frontIsArab = KF.utils.hasArabic(qCard.front);

    container.innerHTML =
      '<div class="quiz-workspace">' +
        '<!-- Focus Topbar -->' +
        '<div class="focus-topbar">' +
          '<div class="focus-topbar-left">' +
            '<button type="button" id="btn-quiz-exit" class="btn btn-secondary btn-sm">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<polyline points="15 18 9 12 15 6"></polyline>' +
              '</svg>' +
              'Keluar' +
            '</button>' +
            '<h1 id="quiz-heading" dir="' + KF.utils.getTextDir(deck.title) + '" class="focus-deck-title ' + KF.utils.getArabicClass(deck.title, false) + '">' +
              KF.utils.escapeHtml(deck.title) +
            '</h1>' +
          '</div>' +

          '<div class="focus-topbar-right">' +
            '<span class="status-pill status-pill-neutral font-mono">Skor ' + state.score + '</span>' +
            '<button type="button" id="btn-quiz-toggle-timer" class="pill-toggle ' + (!state.timedMode ? 'is-active-primary' : '') + '" title="Ganti antara timer 15 detik atau mode santai tanpa batas waktu">' +
              (state.timedMode ? 'Timer: 15d' : 'Mode Santai ✓') +
            '</button>' +
          '</div>' +
        '</div>' +

        '<!-- Separated Question Progress Bar -->' +
        '<div class="quiz-progress-header">' +
          '<span>Soal <strong class="font-mono">' + (state.currentIndex + 1) + '</strong> dari <strong class="font-mono">' + totalQ + '</strong></span>' +
          '<span class="font-mono">' + progressPct + '%</span>' +
        '</div>' +
        '<div class="quiz-progress-track">' +
          '<div class="quiz-progress-fill" style="width: ' + progressPct + '%"></div>' +
        '</div>' +

        '<!-- Question Paper Card -->' +
        '<div class="quiz-question-card">' +
          '<div id="quiz-timer-strip" class="quiz-timer-strip ' + (state.timedMode ? '' : 'is-hidden') + '">' +
            '<div id="quiz-timer-bar" class="quiz-timer-strip-fill" style="width: 100%"></div>' +
          '</div>' +

          '<div class="quiz-card-inner">' +
            '<div class="quiz-card-meta">' +
              '<span class="quiz-prompt-label">Pilih arti atau jawaban yang tepat</span>' +
              '<span id="quiz-timer-pill" class="timer-pill">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<circle cx="12" cy="12" r="9"></circle>' +
                  '<polyline points="12 7 12 12 15 15"></polyline>' +
                '</svg>' +
                '<span id="quiz-timer-text">' + (state.timedMode ? QUESTION_SECONDS + 'd' : 'Santai') + '</span>' +
              '</span>' +
            '</div>' +

            '<p dir="' + KF.utils.getTextDir(qCard.front) + '" class="quiz-prompt-text ' + (frontIsArab ? 'quiz-prompt-arab' : 'quiz-prompt-latin') + '">' +
              KF.utils.escapeHtml(qCard.front) +
            '</p>' +

            '<div id="quiz-options-list" class="quiz-options-list">' +
              state.currentOptions.map(function (opt, idx) {
                var optIsArab = KF.utils.hasArabic(opt.text);
                return (
                  '<button type="button" data-quiz-option="' + idx + '" class="quiz-option">' +
                    '<span class="quiz-option-main">' +
                      '<span class="quiz-option-key">' + letters[idx] + '</span>' +
                      '<span dir="' + KF.utils.getTextDir(opt.text) + '" class="quiz-option-text ' + (optIsArab ? 'arabic-inline' : '') + '">' +
                        KF.utils.escapeHtml(opt.text) +
                      '</span>' +
                    '</span>' +
                    '<span class="opt-status-icon"></span>' +
                  '</button>'
                );
              }).join('') +
            '</div>' +

            '<div id="quiz-feedback-banner" class="is-hidden"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var exitBtn = document.getElementById('btn-quiz-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', function () {
        cleanup();
        KF.app.navigate('dashboard');
      });
    }

    var timerToggleBtn = document.getElementById('btn-quiz-toggle-timer');
    if (timerToggleBtn) {
      timerToggleBtn.addEventListener('click', toggleTimedMode);
    }

    var optsList = document.getElementById('quiz-options-list');
    if (optsList) {
      optsList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-quiz-option]');
        if (!btn) return;
        var idx = parseInt(btn.getAttribute('data-quiz-option'), 10);
        selectOption(idx);
      });
    }
  }

  function countUnmasteredCorrect(deck) {
    if (!deck || state.correctCardIds.length === 0) return 0;
    var lookup = {};
    for (var i = 0; i < state.correctCardIds.length; i++) {
      lookup[state.correctCardIds[i]] = true;
    }
    var count = 0;
    for (var j = 0; j < deck.cards.length; j++) {
      if (lookup[deck.cards[j].id] && !deck.cards[j].mastered) {
        count++;
      }
    }
    return count;
  }

  function renderResults(deck) {
    cleanup();
    var container = document.getElementById('quiz-container');
    if (!container) return;

    var total = state.questions.length;
    var accuracy = total > 0 ? Math.round((state.score / total) * 100) : 0;
    var wrongCount = state.wrongAnswers.length;
    var unmasteredCorrectCount = countUnmasteredCorrect(deck);

    var rating = { label: 'Terus Berlatih', badgeClass: 'status-pill-learning' };
    if (accuracy === 100) {
      rating = { label: 'Sempurna', badgeClass: 'status-pill-mastered' };
    } else if (accuracy >= 80) {
      rating = { label: 'Luar Biasa', badgeClass: 'status-pill-mastered' };
    } else if (accuracy >= 60) {
      rating = { label: 'Bagus Sekali', badgeClass: 'status-pill-neutral' };
    }

    var wrongListHtml = '';
    if (wrongCount === 0) {
      wrongListHtml =
        '<div class="editorial-notice-card" style="margin-top:0;max-width:none;padding:1.5rem;">' +
          '<h3 class="notice-title" style="font-size:1.2rem;">Tidak ada jawaban salah</h3>' +
          '<p class="notice-desc">Semua soal dalam sesi kuis ini dijawab dengan tepat (100%).</p>' +
        '</div>';
    } else {
      wrongListHtml =
        '<div class="wrong-review-list">' +
          state.wrongAnswers.map(function (item, idx) {
            var qArab = KF.utils.getArabicClass(item.front, false);
            var corrArab = KF.utils.getArabicClass(item.correctAnswer, false);
            var userArab = item.userAnswer ? KF.utils.getArabicClass(item.userAnswer, false) : '';

            return (
              '<article class="wrong-review-item">' +
                '<div class="wrong-review-top">' +
                  '<span class="font-mono" style="color:var(--ink-tertiary);">Soal #' + (idx + 1) + '</span>' +
                  '<span class="status-pill status-pill-learning">' +
                    (item.timedOut ? 'Waktu Habis' : 'Salah') +
                  '</span>' +
                '</div>' +

                '<p dir="' + KF.utils.getTextDir(item.front) + '" class="wrong-review-q ' + qArab + '">' +
                  KF.utils.escapeHtml(item.front) +
                '</p>' +

                '<div class="wrong-compare-grid">' +
                  '<div class="compare-box compare-box-wrong">' +
                    '<span class="compare-box-label">Jawaban Kamu</span>' +
                    '<span dir="' + (item.userAnswer ? KF.utils.getTextDir(item.userAnswer) : 'ltr') + '" class="' + userArab + '">' +
                      (item.timedOut ? 'Tidak dijawab (Waktu Habis)' : KF.utils.escapeHtml(item.userAnswer)) +
                    '</span>' +
                  '</div>' +

                  '<div class="compare-box compare-box-correct">' +
                    '<span class="compare-box-label">Jawaban Benar</span>' +
                    '<span dir="' + KF.utils.getTextDir(item.correctAnswer) + '" class="' + corrArab + '">' +
                      KF.utils.escapeHtml(item.correctAnswer) +
                    '</span>' +
                  '</div>' +
                '</div>' +
              '</article>'
            );
          }).join('') +
        '</div>';
    }

    container.innerHTML =
      '<div class="quiz-results-wrap">' +
        '<div class="editorial-notice-card" style="max-width:none;margin-top:0;">' +
          '<span class="status-pill ' + rating.badgeClass + '">' + rating.label + '</span>' +
          '<h1 id="quiz-heading" class="notice-title" style="margin-top:0.75rem;">' +
            'Hasil Kuis: ' + KF.utils.escapeHtml(deck.title) +
          '</h1>' +

          '<div class="quiz-score-grid">' +
            '<div class="quiz-score-tile">' +
              '<p class="quiz-score-label">Total Skor</p>' +
              '<p class="quiz-score-val">' + state.score + '/' + total + '</p>' +
            '</div>' +
            '<div class="quiz-score-tile">' +
              '<p class="quiz-score-label">Akurasi</p>' +
              '<p class="quiz-score-val">' + accuracy + '%</p>' +
            '</div>' +
            '<div class="quiz-score-tile">' +
              '<p class="quiz-score-label">Salah</p>' +
              '<p class="quiz-score-val">' + wrongCount + '</p>' +
            '</div>' +
          '</div>' +

          '<div class="notice-actions">' +
            (wrongCount > 0
              ? '<button type="button" id="btn-quiz-retry-wrong" class="btn btn-warm">Ulangi Soal yang Salah (' + wrongCount + ')</button>'
              : '') +
            '<button type="button" id="btn-quiz-retry" class="btn btn-primary">Ulangi Semua Soal</button>' +
            (unmasteredCorrectCount > 0
              ? '<button type="button" id="btn-quiz-sync-mastery" class="btn btn-secondary">Tandai ' + unmasteredCorrectCount + ' Benar sebagai Hafal</button>'
              : '') +
            '<button type="button" id="btn-quiz-flashcard" class="btn btn-secondary">Buka Flashcard</button>' +
            '<button type="button" id="btn-quiz-dashboard" class="btn btn-ghost">Kembali ke Meja</button>' +
          '</div>' +
        '</div>' +

        '<section aria-label="Review jawaban salah" class="wrong-review-section">' +
          '<h2>Ulasan Soal yang Salah (' + wrongCount + ')</h2>' +
          wrongListHtml +
        '</section>' +
      '</div>';

    var retryWrongBtn = document.getElementById('btn-quiz-retry-wrong');
    if (retryWrongBtn) {
      retryWrongBtn.addEventListener('click', function () {
        var freshDeck = KF.storage.getDeckById(state.deckId);
        if (!freshDeck) return;
        beginSession(freshDeck, state.wrongCards.slice());
      });
    }

    var retryBtn = document.getElementById('btn-quiz-retry');
    if (retryBtn) retryBtn.addEventListener('click', function () { start(state.deckId); });

    var syncBtn = document.getElementById('btn-quiz-sync-mastery');
    if (syncBtn) {
      syncBtn.addEventListener('click', function () {
        var updatedCount = KF.storage.markCardsMastered(state.deckId, state.correctCardIds, true);
        syncBtn.disabled = true;
        syncBtn.textContent = 'Sudah Ditandai Hafal ✓';
        KF.utils.showToast(updatedCount + ' kartu ditandai Sudah Hafal.', 'success');
      });
    }

    var fcBtn = document.getElementById('btn-quiz-flashcard');
    if (fcBtn) fcBtn.addEventListener('click', function () { KF.app.navigate('flashcard', state.deckId); });

    var dashBtn = document.getElementById('btn-quiz-dashboard');
    if (dashBtn) dashBtn.addEventListener('click', function () { KF.app.navigate('dashboard'); });
  }

  function handleKeydown(e) {
    if (state.isFinished || state.questions.length === 0) return;

    if (state.isLocked) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advanceToNextQuestion();
      }
      return;
    }

    var keyMap = {
      '1': 0, 'a': 0, 'A': 0,
      '2': 1, 'b': 1, 'B': 1,
      '3': 2, 'c': 2, 'C': 2,
      '4': 3, 'd': 3, 'D': 3
    };

    if (Object.prototype.hasOwnProperty.call(keyMap, e.key)) {
      e.preventDefault();
      selectOption(keyMap[e.key]);
    }
  }

  KF.quiz = {
    start: start,
    cleanup: cleanup,
    selectOption: selectOption,
    generateQuestionOptions: generateQuestionOptions,
    countUniqueAnswers: countUniqueAnswers,
    handleKeydown: handleKeydown
  };
})(typeof window !== 'undefined' ? window : globalThis);
