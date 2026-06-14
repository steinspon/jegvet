/*
 * JegVet search engine — a small, dependency-free full-text search core.
 *
 * Design goals:
 *  - Self-contained and pure: no DOM, no network. Build an index from an array
 *    of documents, then run queries against it. This keeps it unit-testable in
 *    Node and reusable from any page.
 *  - Relevance via BM25, with the document title weighted above the body.
 *  - Forgiving matching: Norwegian folding (æ/ø/å), accent stripping,
 *    prefix matching (as-you-type friendly) and bounded fuzzy matching so small
 *    typos still find results.
 *  - Bilingual query expansion through a curated synonym map (EN/NO).
 *
 * Public API (window.JegVetSearch / module.exports):
 *   normalize(text)            -> normalized, folded, lowercased string
 *   tokenize(text)             -> array of normalized tokens
 *   buildIndex(docs[, opts])   -> index object
 *   search(index, query[, opts]) -> ranked, de-duplicated result array
 */
(function () {
  'use strict';

  // BM25 tuning.
  var K1 = 1.2;
  var B = 0.75;
  // How much more a title term counts than a body term.
  var TITLE_WEIGHT = 2.5;
  // Score multipliers by how a query term matched an indexed term.
  var MATCH_EXACT = 1.0;
  var MATCH_PREFIX = 0.6;
  var MATCH_FUZZY = 0.45;

  // Curated synonym groups in *normalized* space (å->aa, ø->o, æ->ae).
  // Every member of a group expands to the others at query time.
  var SYNONYM_GROUPS = [
    ['cat', 'katt', 'feline', 'cats'],
    ['dog', 'hund', 'canine', 'dogs'],
    ['rabbit', 'kanin', 'bunny'],
    ['guinea', 'marsvin', 'cavy'],
    ['rat', 'rotte', 'rats'],
    ['bird', 'fugl', 'avian'],
    ['seagull', 'maake', 'gull'],
    ['euthanasia', 'avliving', 'eutanasi', 'euthanasic'],
    ['sedation', 'sedasjon', 'sedate'],
    ['anaesthetic', 'anaesthesia', 'anesthesia', 'anestesi', 'anaesthesic'],
    ['premed', 'premedication', 'premedikasjon'],
    ['dose', 'dosing', 'dosering', 'doser'],
    ['weight', 'vekt'],
    ['kidney', 'nyre', 'renal', 'ckd'],
    ['vomiting', 'oppkast', 'emesis'],
    ['chronic', 'kronisk'],
    ['syringe', 'sproyte'],
    ['airway', 'luftvei', 'luftveissykdom'],
    ['pain', 'smerte'],
    ['skin', 'hud'],
    ['water', 'vann'],
    ['suspension', 'suspensjon', 'mikstur']
  ];

  function buildSynonymLookup(groups) {
    var lookup = {};
    groups.forEach(function (group) {
      group.forEach(function (term) {
        if (!lookup[term]) {
          lookup[term] = {};
        }
        group.forEach(function (other) {
          lookup[term][other] = true;
        });
      });
    });
    return lookup;
  }

  var DEFAULT_SYNONYMS = buildSynonymLookup(SYNONYM_GROUPS);

  function normalize(text) {
    var value = String(text == null ? '' : text).toLowerCase();
    value = value
      .replace(/[æ]/g, 'ae')
      .replace(/[ø]/g, 'o')
      .replace(/[å]/g, 'aa');
    if (typeof value.normalize === 'function') {
      value = value.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    return value;
  }

  function tokenize(text) {
    return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  }

  // Bounded Levenshtein: returns the true distance, or max + 1 if it exceeds max.
  function editDistanceWithin(a, b, max) {
    var al = a.length;
    var bl = b.length;
    if (Math.abs(al - bl) > max) {
      return max + 1;
    }
    var prev = new Array(bl + 1);
    var curr = new Array(bl + 1);
    var i, j;
    for (j = 0; j <= bl; j += 1) {
      prev[j] = j;
    }
    for (i = 1; i <= al; i += 1) {
      curr[0] = i;
      var rowMin = curr[0];
      for (j = 1; j <= bl; j += 1) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        if (curr[j] < rowMin) {
          rowMin = curr[j];
        }
      }
      if (rowMin > max) {
        return max + 1;
      }
      var tmp = prev;
      prev = curr;
      curr = tmp;
    }
    return prev[bl];
  }

  function fuzzyBudget(token) {
    if (token.length >= 7) {
      return 2;
    }
    if (token.length >= 4) {
      return 1;
    }
    return 0;
  }

  function buildIndex(docs, opts) {
    opts = opts || {};
    var titleWeight = typeof opts.titleWeight === 'number' ? opts.titleWeight : TITLE_WEIGHT;
    var documents = Array.isArray(docs) ? docs : [];

    var bodyPostings = {}; // term -> { docId: termFrequency }
    var titlePostings = {}; // term -> { docId: termFrequency }
    var df = {}; // term -> number of docs containing it (title or body)
    var meta = [];
    var totalLen = 0;

    documents.forEach(function (doc, id) {
      var titleTokens = tokenize(doc.title || '');
      var bodyTokens = tokenize(doc.body || '');
      var seen = {};

      titleTokens.forEach(function (term) {
        if (!titlePostings[term]) {
          titlePostings[term] = {};
        }
        titlePostings[term][id] = (titlePostings[term][id] || 0) + 1;
        seen[term] = true;
      });

      bodyTokens.forEach(function (term) {
        if (!bodyPostings[term]) {
          bodyPostings[term] = {};
        }
        bodyPostings[term][id] = (bodyPostings[term][id] || 0) + 1;
        seen[term] = true;
      });

      Object.keys(seen).forEach(function (term) {
        df[term] = (df[term] || 0) + 1;
      });

      // BM25 length uses the (title-weighted) body length.
      var docLen = bodyTokens.length + titleWeight * titleTokens.length;
      totalLen += docLen;

      meta.push({
        title: doc.title || '',
        body: doc.body || '',
        url: doc.url,
        displayUrl: doc.displayUrl || doc.url,
        kind: doc.kind || '',
        boost: typeof doc.boost === 'number' ? doc.boost : 0,
        len: docLen,
        normTitle: normalize(doc.title || ''),
        normBody: normalize(doc.body || '')
      });
    });

    var n = documents.length || 1;
    var idf = {};
    Object.keys(df).forEach(function (term) {
      idf[term] = Math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5));
    });

    return {
      meta: meta,
      bodyPostings: bodyPostings,
      titlePostings: titlePostings,
      df: df,
      idf: idf,
      vocab: Object.keys(df),
      docCount: documents.length,
      avgLen: totalLen / n,
      titleWeight: titleWeight,
      synonyms: opts.synonyms || DEFAULT_SYNONYMS
    };
  }

  // For a single normalized query token, find candidate indexed terms with a
  // match weight: exact > prefix > fuzzy. Synonyms are treated as exact.
  function candidateTerms(index, token, synonymExpansion) {
    var candidates = {};

    function consider(term, weight) {
      if (candidates[term] === undefined || candidates[term] < weight) {
        candidates[term] = weight;
      }
    }

    // Exact (the token itself plus synonyms).
    var exacts = { };
    exacts[token] = true;
    (synonymExpansion || []).forEach(function (syn) { exacts[syn] = true; });
    Object.keys(exacts).forEach(function (term) {
      if (index.df[term]) {
        consider(term, MATCH_EXACT);
      }
    });

    var allowPrefix = token.length >= 3;
    var budget = fuzzyBudget(token);
    var hadExact = Object.keys(candidates).length > 0;

    if (allowPrefix || budget > 0) {
      for (var i = 0; i < index.vocab.length; i += 1) {
        var term = index.vocab[i];
        if (candidates[term] === MATCH_EXACT) {
          continue;
        }
        if (allowPrefix && term.length > token.length && term.indexOf(token) === 0) {
          consider(term, MATCH_PREFIX);
          continue;
        }
        // Only spend fuzzy effort when we have no exact hit, to keep precision.
        if (!hadExact && budget > 0 && Math.abs(term.length - token.length) <= budget) {
          if (editDistanceWithin(term, token, budget) <= budget) {
            consider(term, MATCH_FUZZY);
          }
        }
      }
    }

    return candidates;
  }

  function search(index, query, opts) {
    opts = opts || {};
    var limit = opts.limit || 20;
    var queryTokens = tokenize(query);
    if (!queryTokens.length || !index || !index.meta.length) {
      return [];
    }

    var normQuery = normalize(query);
    var scores = {}; // docId -> accumulated score
    var coverage = {}; // docId -> count of distinct query tokens matched

    queryTokens.forEach(function (qToken) {
      var synExpansion = index.synonyms[qToken] ? Object.keys(index.synonyms[qToken]) : [];
      var candidates = candidateTerms(index, qToken, synExpansion);
      var matchedDocsThisToken = {};

      Object.keys(candidates).forEach(function (term) {
        var matchWeight = candidates[term];
        var termIdf = index.idf[term] || 0;
        var bodyDocs = index.bodyPostings[term] || {};
        var titleDocs = index.titlePostings[term] || {};

        // Union of docs containing this term in body or title.
        var docIds = {};
        Object.keys(bodyDocs).forEach(function (id) { docIds[id] = true; });
        Object.keys(titleDocs).forEach(function (id) { docIds[id] = true; });

        Object.keys(docIds).forEach(function (id) {
          var m = index.meta[id];
          var bodyTf = bodyDocs[id] || 0;
          var bm25 = 0;
          if (bodyTf > 0) {
            var denom = bodyTf + K1 * (1 - B + B * (m.len / (index.avgLen || 1)));
            bm25 = termIdf * (bodyTf * (K1 + 1)) / (denom || 1);
          }
          var titleBonus = titleDocs[id] ? termIdf * index.titleWeight : 0;
          var contribution = (bm25 + titleBonus) * matchWeight;
          if (contribution > 0) {
            scores[id] = (scores[id] || 0) + contribution;
            matchedDocsThisToken[id] = true;
          }
        });
      });

      Object.keys(matchedDocsThisToken).forEach(function (id) {
        coverage[id] = (coverage[id] || 0) + 1;
      });
    });

    // A document must cover enough of the query to count, so unrelated
    // single-term hits don't surface. Short queries require every token.
    var required = queryTokens.length <= 3
      ? queryTokens.length
      : Math.ceil(queryTokens.length * 0.75);

    var results = [];
    Object.keys(scores).forEach(function (id) {
      if ((coverage[id] || 0) < required) {
        return;
      }
      var m = index.meta[id];
      var score = scores[id] + m.boost;
      // Whole-query phrase bonuses.
      if (queryTokens.length > 1) {
        if (m.normTitle.indexOf(normQuery) !== -1) {
          score += 12;
        } else if (m.normBody.indexOf(normQuery) !== -1) {
          score += 4;
        }
      }
      results.push({
        title: m.title,
        url: m.url,
        displayUrl: m.displayUrl,
        kind: m.kind,
        body: m.body,
        score: score
      });
    });

    results.sort(function (a, b) {
      return b.score - a.score;
    });

    // Collapse results that point at the same destination, keeping the best.
    var seenUrls = {};
    var deduped = results.filter(function (r) {
      if (seenUrls[r.url]) {
        return false;
      }
      seenUrls[r.url] = true;
      return true;
    });

    return deduped.slice(0, limit);
  }

  var api = {
    normalize: normalize,
    tokenize: tokenize,
    buildIndex: buildIndex,
    search: search,
    editDistanceWithin: editDistanceWithin
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.JegVetSearch = api;
  }
})();
