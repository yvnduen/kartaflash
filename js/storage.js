/**
 * KartaFlash - LocalStorage Persistence & CRUD Layer
 */
(function (global) {
  'use strict';

  var KF = (global.KartaFlash = global.KartaFlash || {});
  var STORAGE_KEY = 'kartaflash_decks_v1';
  var THEME_KEY = 'kartaflash_theme_v1';
  var VALID_COLORS = ['indigo', 'emerald', 'sky', 'amber', 'rose', 'violet'];

  function sanitizeCard(rawCard) {
    if (!rawCard || typeof rawCard !== 'object') return null;
    var front = typeof rawCard.front === 'string' ? rawCard.front.trim() : '';
    var back = typeof rawCard.back === 'string' ? rawCard.back.trim() : '';
    if (!front || !back) return null;

    return {
      id: typeof rawCard.id === 'string' && rawCard.id.trim() ? rawCard.id.trim() : KF.utils.generateId('card'),
      front: front,
      back: back,
      mastered: Boolean(rawCard.mastered)
    };
  }

  function sanitizeDeck(rawDeck, forceNewIds) {
    if (!rawDeck || typeof rawDeck !== 'object') return null;
    var title = typeof rawDeck.title === 'string' ? rawDeck.title.trim() : '';
    if (!title) return null;

    var color = VALID_COLORS.indexOf(rawDeck.color) !== -1 ? rawDeck.color : 'indigo';
    var description = typeof rawDeck.description === 'string' ? rawDeck.description.trim() : '';
    var rawCards = Array.isArray(rawDeck.cards) ? rawDeck.cards : [];
    var cards = [];

    for (var i = 0; i < rawCards.length; i++) {
      var cleanCard = sanitizeCard(rawCards[i]);
      if (cleanCard) {
        if (forceNewIds) {
          cleanCard.id = KF.utils.generateId('card');
        }
        cards.push(cleanCard);
      }
    }

    return {
      id: (!forceNewIds && typeof rawDeck.id === 'string' && rawDeck.id.trim())
        ? rawDeck.id.trim()
        : KF.utils.generateId('deck'),
      title: title.slice(0, 80),
      description: description.slice(0, 200),
      color: color,
      createdAt: typeof rawDeck.createdAt === 'string' ? rawDeck.createdAt : new Date().toISOString(),
      cards: cards
    };
  }

  function loadDecks() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        var defaults = KF.data.getDefaultDecks();
        saveDecks(defaults);
        return defaults;
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        var fallback = KF.data.getDefaultDecks();
        saveDecks(fallback);
        return fallback;
      }
      var clean = [];
      for (var i = 0; i < parsed.length; i++) {
        var d = sanitizeDeck(parsed[i], false);
        if (d) clean.push(d);
      }
      return clean;
    } catch (err) {
      return KF.data.getDefaultDecks();
    }
  }

  function saveDecks(decks) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
      return true;
    } catch (err) {
      if (KF.utils && KF.utils.showToast) {
        KF.utils.showToast('Gagal menyimpan ke localStorage (kapasitas penuh atau diblokir).', 'error');
      }
      return false;
    }
  }

  function getDeckById(deckId) {
    var decks = loadDecks();
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) return decks[i];
    }
    return null;
  }

  function createDeck(payload) {
    var decks = loadDecks();
    var newDeck = sanitizeDeck({
      id: KF.utils.generateId('deck'),
      title: payload.title,
      description: payload.description || '',
      color: payload.color || 'indigo',
      createdAt: new Date().toISOString(),
      cards: []
    }, false);
    if (!newDeck) return null;
    decks.unshift(newDeck);
    saveDecks(decks);
    return newDeck;
  }

  function updateDeck(deckId, payload) {
    var decks = loadDecks();
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        decks[i].title = String(payload.title || '').trim().slice(0, 80) || decks[i].title;
        decks[i].description = String(payload.description || '').trim().slice(0, 200);
        decks[i].color = VALID_COLORS.indexOf(payload.color) !== -1 ? payload.color : decks[i].color;
        saveDecks(decks);
        return decks[i];
      }
    }
    return null;
  }

  function deleteDeck(deckId) {
    var decks = loadDecks();
    var filtered = decks.filter(function (d) { return d.id !== deckId; });
    saveDecks(filtered);
    return filtered;
  }

  function addCard(deckId, front, back) {
    var decks = loadDecks();
    var card = sanitizeCard({
      id: KF.utils.generateId('card'),
      front: front,
      back: back,
      mastered: false
    });
    if (!card) return null;

    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        decks[i].cards.push(card);
        saveDecks(decks);
        return card;
      }
    }
    return null;
  }

  function updateCard(deckId, cardId, payload) {
    var decks = loadDecks();
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        var cards = decks[i].cards;
        for (var j = 0; j < cards.length; j++) {
          if (cards[j].id === cardId) {
            if (typeof payload.front === 'string' && payload.front.trim()) {
              cards[j].front = payload.front.trim();
            }
            if (typeof payload.back === 'string' && payload.back.trim()) {
              cards[j].back = payload.back.trim();
            }
            if (typeof payload.mastered === 'boolean') {
              cards[j].mastered = payload.mastered;
            }
            saveDecks(decks);
            return cards[j];
          }
        }
      }
    }
    return null;
  }

  function setCardMastered(deckId, cardId, mastered) {
    return updateCard(deckId, cardId, { mastered: Boolean(mastered) });
  }

  function deleteCard(deckId, cardId) {
    var decks = loadDecks();
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        decks[i].cards = decks[i].cards.filter(function (c) { return c.id !== cardId; });
        saveDecks(decks);
        return true;
      }
    }
    return false;
  }

  function resetDeckProgress(deckId) {
    var decks = loadDecks();
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        for (var j = 0; j < decks[i].cards.length; j++) {
          decks[i].cards[j].mastered = false;
        }
        saveDecks(decks);
        return decks[i];
      }
    }
    return null;
  }

  function resetToDefaultDecks() {
    var defaults = KF.data.getDefaultDecks();
    saveDecks(defaults);
    return defaults;
  }

  function buildDeckExportPayload(deck) {
    return {
      app: 'KartaFlash',
      version: 1,
      exportedAt: new Date().toISOString(),
      deck: {
        title: deck.title,
        description: deck.description || '',
        color: deck.color || 'indigo',
        cards: deck.cards.map(function (c) {
          return {
            front: c.front,
            back: c.back,
            mastered: Boolean(c.mastered)
          };
        })
      }
    };
  }

  function buildAllExportPayload() {
    var decks = loadDecks();
    return {
      app: 'KartaFlash',
      version: 1,
      exportedAt: new Date().toISOString(),
      decks: decks.map(function (deck) {
        return {
          title: deck.title,
          description: deck.description || '',
          color: deck.color || 'indigo',
          cards: deck.cards.map(function (c) {
            return {
              front: c.front,
              back: c.back,
              mastered: Boolean(c.mastered)
            };
          })
        };
      })
    };
  }

  function importDecksFromJson(parsedData) {
    var candidates = [];
    if (Array.isArray(parsedData)) {
      candidates = parsedData;
    } else if (parsedData && typeof parsedData === 'object') {
      if (Array.isArray(parsedData.decks)) {
        candidates = parsedData.decks;
      } else if (parsedData.deck && typeof parsedData.deck === 'object') {
        candidates = [parsedData.deck];
      } else if (typeof parsedData.title === 'string') {
        candidates = [parsedData];
      }
    }

    if (candidates.length === 0) {
      throw new Error('Format JSON tidak dikenali. Pastikan berisi objek deck dengan properti "title" dan "cards".');
    }

    var existing = loadDecks();
    var imported = [];

    for (var i = 0; i < candidates.length; i++) {
      var clean = sanitizeDeck(candidates[i], true);
      if (clean) {
        imported.push(clean);
      }
    }

    if (imported.length === 0) {
      throw new Error('Tidak ada deck valid yang ditemukan di dalam file JSON.');
    }

    var merged = imported.concat(existing);
    saveDecks(merged);

    return {
      importedCount: imported.length,
      cardCount: imported.reduce(function (sum, d) { return sum + d.cards.length; }, 0)
    };
  }

  function getSavedTheme() {
    try {
      return global.localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      global.localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  KF.storage = {
    loadDecks: loadDecks,
    saveDecks: saveDecks,
    getDeckById: getDeckById,
    createDeck: createDeck,
    updateDeck: updateDeck,
    deleteDeck: deleteDeck,
    addCard: addCard,
    updateCard: updateCard,
    setCardMastered: setCardMastered,
    deleteCard: deleteCard,
    resetDeckProgress: resetDeckProgress,
    resetToDefaultDecks: resetToDefaultDecks,
    buildDeckExportPayload: buildDeckExportPayload,
    buildAllExportPayload: buildAllExportPayload,
    importDecksFromJson: importDecksFromJson,
    getSavedTheme: getSavedTheme,
    saveTheme: saveTheme
  };
})(typeof window !== 'undefined' ? window : globalThis);
