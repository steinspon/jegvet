(function () {
  'use strict';

  function parseDecimalInput(value) {
    var normalized = String(value == null ? '' : value)
      .trim()
      .replace(/\s+/g, '');

    if (!normalized) {
      return NaN;
    }

    if (normalized.indexOf(',') !== -1 && normalized.indexOf('.') !== -1) {
      return NaN;
    }

    return Number(normalized.replace(',', '.'));
  }

  window.JegVetCalc = {
    parseDecimalInput: parseDecimalInput
  };
})();
