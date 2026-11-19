/**
 * KartaFlash - Mode 2: Interactive Multiple-Choice Quiz Module
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
    wrongAnswers: [],
    currentOptions: [],
    isLocked: false,
    isFinished: false,
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

  function start(deckId) {
    cleanup();
    var deck = KF.storage.getDeckById(deckId);
    if (!deck) {
      KF.app.navigate('dashboard');
      return;
    }

    state.deckId = deckId;
    state.currentIndex = 0;
    state.score = 0;
    state.wrongAnswers = [];
    state.isLocked = false;
    state.isFinished = false;

    if (deck.cards.length < 4 || countUniqueAnswers(deck.cards) < 4) {
      state.questions = [];
      renderPrerequisiteNotice(deck);
      return;
    }

    state.questions = KF.utils.shuffleArray(deck.cards);
    loadCurrentQuestion();
  }

  function renderPrerequisiteNotice(deck) {
    var container = document.getElementById('quiz-container');
    if (!container) return;

    var notEnoughCards = deck.cards.length < 4;
    container.innerHTML =
      '<div class="max-w-xl mx-auto mt-4">' +
        '<button type="button" id="btn-quiz-back" class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4">' +
          '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
          '</svg>' +
          'Kembali ke Dashboard' +
        '</button>' +

        '<div class="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 p-8 text-center shadow-card dark:shadow-card-dark">' +
          '<div class="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">' +
            '<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
              '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />' +
            '</svg>' +
          '</div>' +
          '<h1 id="quiz-heading" class="text-xl font-extrabold text-slate-900 dark:text-white">' +
            (notEnoughCards ? 'Minimal 4 Kartu Diperlukan' : 'Butuh Minimal 4 Jawaban Unik') +
          '</h1>' +
          '<p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">' +
            (notEnoughCards
              ? 'Deck "' + KF.utils.escapeHtml(deck.title) + '" saat ini baru memiliki ' + deck.cards.length + ' kartu. Tambahkan minimal ' + (4 - deck.cards.length) + ' kartu lagi agar Mode Kuis dapat membuat 4 pilihan jawaban.'
              : 'Deck "' + KF.utils.escapeHtml(deck.title) + '" memiliki beberapa kartu dengan arti/jawaban yang sama persis sehingga belum mencukupi 4 pilihan jawaban unik tanpa duplikat.') +
          '</p>' +
          '<div class="mt-6 flex flex-wrap justify-center gap-3">' +
            '<button type="button" id="btn-quiz-go-manage" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">+ Kelola &amp; Tambah Kartu</button>' +
            '<button type="button" id="btn-quiz-go-flashcard" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">Belajar Flashcard</button>' +
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
    startTimer();
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
          timerBar.className = 'h-full rounded-full bg-rose-500 transition-all duration-100';
        } else if (secLeft <= 6) {
          timerBar.className = 'h-full rounded-full bg-amber-500 transition-all duration-100';
        } else {
          timerBar.className = 'h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-100';
        }
      }

      if (timerPill) {
        if (secLeft <= 3) {
          timerPill.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 animate-pulse';
        } else if (secLeft <= 6) {
          timerPill.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
        }
      }

      if (state.remainingMs <= 0) {
        clearInterval(state.timerIntervalId);
        state.timerIntervalId = null;
        handleTimeout();
      }
    }, 100);
  }

  function handleTimeout() {
    if (state.isLocked) return;
    state.isLocked = true;

    var qCard = state.questions[state.currentIndex];
    state.wrongAnswers.push({
      front: qCard.front,
      correctAnswer: qCard.back,
      userAnswer: null,
      timedOut: true
    });

    revealOptionFeedback(-1, false, true);
    scheduleNextQuestion(1600);
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
    } else {
      state.wrongAnswers.push({
        front: qCard.front,
        correctAnswer: qCard.back,
        userAnswer: chosen ? chosen.text : '',
        timedOut: false
      });
    }

    revealOptionFeedback(optionIndex, isCorrect, false);
    scheduleNextQuestion(isCorrect ? 1050 : 1550);
  }

  function revealOptionFeedback(selectedIdx, isCorrect, isTimeout) {
    var buttons = document.querySelectorAll('[data-quiz-option]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var opt = state.currentOptions[i];
      btn.disabled = true;

      if (opt.isCorrect) {
        btn.className = 'quiz-option-btn w-full text-left p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 shadow-sm transition-all flex items-center justify-between gap-3';
        var badge = btn.querySelector('.opt-status-icon');
        if (badge) {
          badge.innerHTML = '<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
        }
      } else if (i === selectedIdx && !isCorrect) {
        btn.className = 'quiz-option-btn w-full text-left p-4 rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-500/20 text-rose-900 dark:text-rose-100 shadow-sm transition-all flex items-center justify-between gap-3';
        var wrongBadge = btn.querySelector('.opt-status-icon');
        if (wrongBadge) {
          wrongBadge.innerHTML = '<svg class="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>';
        }
      } else {
        btn.className = 'quiz-option-btn w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 opacity-60 transition-all flex items-center justify-between gap-3';
      }
    }

    var feedbackBanner = document.getElementById('quiz-feedback-banner');
    if (feedbackBanner) {
      feedbackBanner.classList.remove('hidden');
      if (isTimeout) {
        feedbackBanner.className = 'mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30';
        feedbackBanner.innerHTML = '<span>Waktu habis! Jawaban yang benar ditandai warna hijau.</span><button type="button" id="btn-quiz-skip-wait" class="text-xs underline font-bold shrink-0">Lanjut →</button>';
      } else if (isCorrect) {
        feedbackBanner.className = 'mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30';
        feedbackBanner.innerHTML = '<span>Benar! Jawaban tepat.</span><button type="button" id="btn-quiz-skip-wait" class="text-xs underline font-bold shrink-0">Lanjut →</button>';
      } else {
        feedbackBanner.className = 'mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30';
        feedbackBanner.innerHTML = '<span>Kurang tepat! Jawaban benar ditandai warna hijau.</span><button type="button" id="btn-quiz-skip-wait" class="text-xs underline font-bold shrink-0">Lanjut →</button>';
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
      '<div class="max-w-2xl mx-auto space-y-5">' +
        '<!-- Quiz Header -->' +
        '<div class="flex flex-wrap items-center justify-between gap-3">' +
          '<div>' +
            '<button type="button" id="btn-quiz-exit" class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-1">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />' +
              '</svg>' +
              'Keluar dari Kuis' +
            '</button>' +
            '<h1 id="quiz-heading" dir="' + KF.utils.getTextDir(deck.title) + '" class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white ' + KF.utils.getArabicClass(deck.title, false) + '">' +
              'Kuis: ' + KF.utils.escapeHtml(deck.title) +
            '</h1>' +
          '</div>' +

          '<div class="flex items-center gap-2.5">' +
            '<span class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">' +
              'Skor: ' + state.score +
            '</span>' +
            '<span id="quiz-timer-pill" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">' +
              '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />' +
              '</svg>' +
              '<span id="quiz-timer-text">' + QUESTION_SECONDS + 'd</span>' +
            '</span>' +
          '</div>' +
        '</div>' +

        '<!-- Question Counter & Timer Bar -->' +
        '<div class="space-y-2">' +
          '<div class="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">' +
            '<span>Soal ' + (state.currentIndex + 1) + ' dari ' + totalQ + '</span>' +
            '<span>' + progressPct + '% selesai</span>' +
          '</div>' +
          '<div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">' +
            '<div id="quiz-timer-bar" class="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-100" style="width: 100%"></div>' +
          '</div>' +
        '</div>' +

        '<!-- Question Card -->' +
        '<div class="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card dark:shadow-card-dark">' +
          '<span class="inline-block text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">Pilih arti atau jawaban yang tepat</span>' +
          '<div class="py-3">' +
            '<p dir="' + KF.utils.getTextDir(qCard.front) + '" class="font-bold text-slate-900 dark:text-white break-words whitespace-pre-line ' +
              (frontIsArab ? 'arabic-text text-3xl sm:text-4xl text-center' : 'text-xl sm:text-2xl') + '">' +
              KF.utils.escapeHtml(qCard.front) +
            '</p>' +
          '</div>' +

          '<!-- 4 Multiple Choice Options -->' +
          '<div id="quiz-options-list" class="mt-6 space-y-3">' +
            state.currentOptions.map(function (opt, idx) {
              var optIsArab = KF.utils.hasArabic(opt.text);
              return (
                '<button type="button" data-quiz-option="' + idx + '" class="quiz-option-btn w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 text-slate-800 dark:text-slate-100 transition-all flex items-center justify-between gap-3 group">' +
                  '<div class="flex items-center gap-3.5 min-w-0 flex-1">' +
                    '<span class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-indigo-300 dark:group-hover:border-indigo-500/50 flex items-center justify-center text-xs font-extrabold text-slate-600 dark:text-slate-300 shrink-0">' +
                      letters[idx] +
                    '</span>' +
                    '<span dir="' + KF.utils.getTextDir(opt.text) + '" class="font-semibold text-sm sm:text-base break-words flex-1 ' + (optIsArab ? 'arabic-inline text-xl' : '') + '">' +
                      KF.utils.escapeHtml(opt.text) +
                    '</span>' +
                  '</div>' +
                  '<span class="opt-status-icon shrink-0"></span>' +
                '</button>'
              );
            }).join('') +
          '</div>' +

          '<div id="quiz-feedback-banner" class="hidden"></div>' +
        '</div>' +
      '</div>';

    var exitBtn = document.getElementById('btn-quiz-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', function () {
        cleanup();
        KF.app.navigate('dashboard');
      });
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

  function renderResults(deck) {
    cleanup();
    var container = document.getElementById('quiz-container');
    if (!container) return;

    var total = state.questions.length;
    var accuracy = total > 0 ? Math.round((state.score / total) * 100) : 0;
    var wrongCount = state.wrongAnswers.length;

    var rating = { label: 'Terus Berlatih!', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-500/15' };
    if (accuracy === 100) {
      rating = { label: 'Sempurna!', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-500/15' };
    } else if (accuracy >= 80) {
      rating = { label: 'Luar Biasa!', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-500/15' };
    } else if (accuracy >= 60) {
      rating = { label: 'Bagus Sekali!', color: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-500/15' };
    }

    var wrongListHtml = '';
    if (wrongCount === 0) {
      wrongListHtml =
        '<div class="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 p-6 text-center">' +
          '<p class="text-base font-bold text-emerald-800 dark:text-emerald-300">Tidak ada jawaban yang salah!</p>' +
          '<p class="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400">Anda menguasai seluruh pertanyaan dalam kuis ini dengan akurasi 100%.</p>' +
        '</div>';
    } else {
      wrongListHtml =
        '<div class="space-y-3">' +
          state.wrongAnswers.map(function (item, idx) {
            var qArab = KF.utils.getArabicClass(item.front, false);
            var corrArab = KF.utils.getArabicClass(item.correctAnswer, false);
            var userArab = item.userAnswer ? KF.utils.getArabicClass(item.userAnswer, false) : '';

            return (
              '<div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">' +
                '<div class="flex items-start justify-between gap-3">' +
                  '<span class="text-xs font-bold text-slate-400">Soal #' + (idx + 1) + '</span>' +
                  '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">' +
                    (item.timedOut ? 'Waktu Habis' : 'Salah') +
                  '</span>' +
                '</div>' +

                '<p dir="' + KF.utils.getTextDir(item.front) + '" class="mt-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words ' + (qArab ? qArab + ' text-2xl' : '') + '">' +
                  KF.utils.escapeHtml(item.front) +
                '</p>' +

                '<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">' +
                  '<div class="rounded-xl bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200/70 dark:border-rose-500/20 px-3.5 py-2.5">' +
                    '<span class="block text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Jawaban Kamu</span>' +
                    '<span dir="' + (item.userAnswer ? KF.utils.getTextDir(item.userAnswer) : 'ltr') + '" class="mt-0.5 block font-semibold text-rose-900 dark:text-rose-200 break-words ' + userArab + '">' +
                      (item.timedOut ? 'Tidak dijawab (Waktu Habis)' : KF.utils.escapeHtml(item.userAnswer)) +
                    '</span>' +
                  '</div>' +

                  '<div class="rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/70 dark:border-emerald-500/20 px-3.5 py-2.5">' +
                    '<span class="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Jawaban Benar</span>' +
                    '<span dir="' + KF.utils.getTextDir(item.correctAnswer) + '" class="mt-0.5 block font-semibold text-emerald-900 dark:text-emerald-200 break-words ' + corrArab + '">' +
                      KF.utils.escapeHtml(item.correctAnswer) +
                    '</span>' +
                  '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>';
    }

    container.innerHTML =
      '<div class="max-w-3xl mx-auto space-y-6">' +
        '<!-- Result Summary Card -->' +
        '<div class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center shadow-card dark:shadow-card-dark">' +
          '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold ' + rating.badge + ' ' + rating.color + '">' +
            rating.label +
          '</span>' +
          '<h1 id="quiz-heading" class="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">' +
            'Hasil Kuis: ' + KF.utils.escapeHtml(deck.title) +
          '</h1>' +

          '<div class="mt-6 grid grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">' +
            '<div class="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4 border border-slate-100 dark:border-slate-800">' +
              '<p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Skor</p>' +
              '<p class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">' + state.score + '/' + total + '</p>' +
            '</div>' +
            '<div class="rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 p-4 border border-indigo-100 dark:border-indigo-500/20">' +
              '<p class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Akurasi</p>' +
              '<p class="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">' + accuracy + '%</p>' +
            '</div>' +
            '<div class="rounded-2xl bg-rose-50/70 dark:bg-rose-500/10 p-4 border border-rose-100 dark:border-rose-500/20">' +
              '<p class="text-xs font-semibold text-rose-600 dark:text-rose-400">Salah</p>' +
              '<p class="text-2xl sm:text-3xl font-extrabold text-rose-700 dark:text-rose-300 mt-1">' + wrongCount + '</p>' +
            '</div>' +
          '</div>' +

          '<div class="mt-6 flex flex-wrap items-center justify-center gap-3">' +
            '<button type="button" id="btn-quiz-retry" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-500/25 transition-colors">Ulangi Kuis</button>' +
            '<button type="button" id="btn-quiz-flashcard" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">Belajar Flashcard</button>' +
            '<button type="button" id="btn-quiz-dashboard" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors">Kembali ke Dashboard</button>' +
          '</div>' +
        '</div>' +

        '<!-- Wrong Answers Review Section -->' +
        '<section aria-label="Review jawaban salah" class="space-y-3">' +
          '<h2 class="text-lg font-extrabold text-slate-900 dark:text-white">' +
            'Review Soal yang Dijawab Salah (' + wrongCount + ')' +
          '</h2>' +
          wrongListHtml +
        '</section>' +
      '</div>';

    var retryBtn = document.getElementById('btn-quiz-retry');
    if (retryBtn) retryBtn.addEventListener('click', function () { start(state.deckId); });

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
