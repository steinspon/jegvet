'use strict';

var test = require('node:test');
var assert = require('node:assert');
var search = require('../search-engine.js');

// A small representative corpus mirroring how search.html builds documents:
// curated tool entries (some duplicated as "fetched" pages), plus wiki content.
function buildTestIndex() {
  var docs = [
    { kind: 'tool', title: 'Kitty Magic Calculator', body: 'kitty magic cat feline sedation im bcs. Norwegian: Kitty Magic kalkulator katt sedasjon', url: 'kitty-magic-calculator.html' },
    { kind: 'tool', title: 'Kitty Magic calculator | JegVet', body: 'kitty magic kalkulator katt sedasjon bcs tools calculator cat', url: 'kitty-magic-calculator.html' },
    { kind: 'tool', title: 'Dog Premed Calculator', body: 'dog premed premedication hund medetomidine dexmedetomidine methadone im', url: 'dog-premed-calculator.html' },
    { kind: 'tool', title: 'Dog/Cat Euthanasia Calculator', body: 'euthanasia zoletil mix euthasol exagon dog cat. Norwegian: Avliving hund katt', url: 'euthanasia-calculator.html' },
    { kind: 'tool', title: 'Anaesthetic Calculator, Rabbit', body: 'anaesthetic anesthesia rabbit kanin midazolam medetomidine atipamezole', url: 'anaesthetic-rabbit-calculator.html' },
    { kind: 'tool', title: 'Cat Heart Protocol Sedation Calculator', body: 'cat heart protocol sedation midazolam methadone iv feline', url: 'cat-heart-protocol-sedation-calculator.html' },
    { kind: 'tool', title: 'Seagull Sedation', body: 'seagull maake sedation bird avian midazolam butorphanol', url: 'seagull-sedation-calculator.html' },
    { kind: 'page', title: 'Rabbit Reference - GI stasis', body: 'rabbit kanin gi stasis critical care force feeding tvangsforing', url: 'wiki.html?page=rabbit.md#gi' }
  ];
  return search.buildIndex(docs);
}

function topUrl(index, query) {
  var results = search.search(index, query);
  return results.length ? results[0].url : null;
}

test('normalize folds Norwegian characters and strips accents', function () {
  assert.strictEqual(search.normalize('Søk Måke Æra café'), 'sok maake aera cafe');
});

test('tokenize splits on non-alphanumeric and lowercases', function () {
  assert.deepStrictEqual(search.tokenize('Kitty-Magic (IM)!'), ['kitty', 'magic', 'im']);
});

test('exact multi-word query returns the right page', function () {
  var index = buildTestIndex();
  assert.strictEqual(topUrl(index, 'kitty magic'), 'kitty-magic-calculator.html');
  assert.strictEqual(topUrl(index, 'dog premed'), 'dog-premed-calculator.html');
});

test('results are de-duplicated by destination URL', function () {
  var index = buildTestIndex();
  var results = search.search(index, 'kitty magic');
  var urls = results.map(function (r) { return r.url; });
  var unique = urls.filter(function (u, i) { return urls.indexOf(u) === i; });
  assert.strictEqual(urls.length, unique.length, 'no duplicate URLs');
});

test('bilingual synonyms match across English and Norwegian', function () {
  var index = buildTestIndex();
  // "avliving" (NO) should find the euthanasia tool.
  assert.strictEqual(topUrl(index, 'avliving'), 'euthanasia-calculator.html');
  // "kanin" (NO) should find rabbit content.
  assert.ok(['anaesthetic-rabbit-calculator.html', 'wiki.html?page=rabbit.md#gi'].indexOf(topUrl(index, 'kanin')) !== -1);
});

test('typos still find results (bounded fuzzy matching)', function () {
  var index = buildTestIndex();
  assert.strictEqual(topUrl(index, 'euthanaisa'), 'euthanasia-calculator.html');
  var sedationResults = search.search(index, 'sedaton');
  assert.ok(sedationResults.length > 0, 'typo "sedaton" returns sedation results');
});

test('prefix matching supports partial words', function () {
  var index = buildTestIndex();
  assert.strictEqual(topUrl(index, 'anaes'), 'anaesthetic-rabbit-calculator.html');
});

test('folded Norwegian query input matches', function () {
  var index = buildTestIndex();
  assert.strictEqual(topUrl(index, 'måke'), 'seagull-sedation-calculator.html');
});

test('unrelated queries return nothing', function () {
  var index = buildTestIndex();
  assert.strictEqual(search.search(index, 'helicopter mortgage').length, 0);
});

test('title matches outrank body-only matches', function () {
  var index = search.buildIndex([
    { title: 'Ketofol Mixing Calculator', body: 'propofol ketamine syringe', url: 'a.html' },
    { title: 'Some Other Page', body: 'mentions ketofol once in passing', url: 'b.html' }
  ]);
  assert.strictEqual(topUrl(index, 'ketofol'), 'a.html');
});

test('editDistanceWithin respects the budget', function () {
  assert.strictEqual(search.editDistanceWithin('cat', 'cat', 2), 0);
  assert.strictEqual(search.editDistanceWithin('cat', 'cap', 2), 1);
  assert.ok(search.editDistanceWithin('cat', 'helicopter', 2) > 2);
});
