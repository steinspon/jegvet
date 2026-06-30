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

  function trimTrailingZeros(value) {
    return value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  }

  function formatFixed(value, decimals) {
    return Number(value).toFixed(decimals);
  }

  function formatTrimmed(value, decimals) {
    return trimTrailingZeros(formatFixed(value, decimals));
  }

  function formatMl(value) {
    return formatFixed(value, 2);
  }

  function formatMgMl(value) {
    return formatTrimmed(value, 3);
  }

  function formatDoseMgKg(value) {
    var numericValue = Number(value);
    var precisions = [1, 2, 3, 4];
    var i;

    for (i = 0; i < precisions.length; i += 1) {
      if (Math.abs(Number(numericValue.toFixed(precisions[i])) - numericValue) < 0.0000001) {
        return numericValue.toFixed(precisions[i]);
      }
    }

    return formatTrimmed(numericValue, 4);
  }

  function formatRange(minValue, maxValue, formatter) {
    return formatter(minValue) + ' - ' + formatter(maxValue);
  }

  window.JegVetCalc = {
    parseDecimalInput: parseDecimalInput,
    formatDoseMgKg: formatDoseMgKg,
    formatFixed: formatFixed,
    formatMgMl: formatMgMl,
    formatMl: formatMl,
    formatRange: formatRange,
    formatTrimmed: formatTrimmed
  };
})();
