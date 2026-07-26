// needle/tokenizer.js — Pure-JS SentencePiece BPE tokenizer
// Loads vocabulary from /data/needle-tokenizer.json
// Provides encode(text) → tokenIds[] and decode(tokenIds[]) → text
//
// Architecture: greedy longest-prefix-match BPE.
// Works in both Web Workers and main thread (no DOM dependencies).

var NeedleTokenizer = (function() {
  'use strict';

  var vocab = null;     // { idToPiece, pieceToId, maxId, specials }
  var ready = false;
  var MAX_SEQ = 1024;   // encoder max sequence length
  var PAD = 0, EOS = 1, BOS = 2;

  // ─── Load vocabulary ──────────────────────────────────────
  async function init(fetchFn) {
    var _fetch = fetchFn || fetch;
    try {
      var resp = await _fetch('/data/needle-tokenizer.json');
      vocab = await resp.json();
      ready = true;
      return true;
    } catch(e) {
      console.warn('[tokenizer] Failed to load vocab:', e.message);
      return false;
    }
  }

  function isReady() { return ready && vocab !== null; }

  // ─── Encode: text → token IDs ─────────────────────────────
  // Greedy longest-prefix-match BPE tokenization.
  // Includes byte_fallback: if no BPE token matches, falls back to
  // byte-level encoding (bytes are encoded as SPM byte tokens).
  function encode(text) {
    if (!ready) return [];

    var ids = [];
    var i = 0;
    var len = text.length;

    while (i < len && ids.length < MAX_SEQ) {
      // Try to find the longest matching token starting at position i
      var longestMatch = null;
      var longestLen = 0;

      // Build candidate substrings — check up to 32 chars ahead
      var maxLookahead = Math.min(32, len - i);
      for (var look = maxLookahead; look >= 1; look--) {
        var candidate = text.slice(i, i + look);
        if (vocab.pieceToId.hasOwnProperty(candidate)) {
          longestMatch = candidate;
          longestLen = look;
          break;
        }
      }

      if (longestMatch !== null) {
        ids.push(vocab.pieceToId[longestMatch]);
        i += longestLen;
      } else {
        // Byte fallback: encode the individual byte
        var byteVal = text.charCodeAt(i) & 0xFF;
        // SPM byte tokens for bytes 0-255 are typically at IDs 3-258
        // (pad=0, eos=1, bos=2, then byte tokens)
        ids.push(3 + byteVal);
        i++;
      }
    }

    return ids;
  }

  // ─── Decode: token IDs → text ─────────────────────────────
  function decode(ids) {
    if (!ready) return '';
    var result = '';
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (id === EOS) break;
      if (id === PAD) continue;
      var piece = vocab.idToPiece[id];
      if (piece !== undefined && piece !== '') {
        result += piece;
      } else if (id >= 3 && id <= 258) {
        // Byte fallback token
        result += String.fromCharCode(id - 3);
      }
      // else: unknown token, skip
    }
    return result;
  }

  // ─── Build padded encoder input ───────────────────────────
  // Returns a 1024-length array: [BOS, ...tokenIds, PAD, PAD, ...]
  function buildEncoderInput(text) {
    var ids = encode(text);
    var input = new Array(MAX_SEQ).fill(PAD);
    input[0] = BOS;
    for (var i = 0; i < Math.min(ids.length, MAX_SEQ - 1); i++) {
      input[i + 1] = ids[i];
    }
    return input;
  }

  // ─── Vocab size ───────────────────────────────────────────
  function vocabSize() {
    return vocab ? Object.keys(vocab.idToPiece).length : 0;
  }

  return {
    init: init,
    isReady: isReady,
    encode: encode,
    decode: decode,
    buildEncoderInput: buildEncoderInput,
    vocabSize: vocabSize,
    PAD: PAD,
    EOS: EOS,
    BOS: BOS,
    MAX_SEQ: MAX_SEQ
  };
})();
