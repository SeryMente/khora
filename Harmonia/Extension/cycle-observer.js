'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HarmoniaCycleTelemetry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DISABLED_REASON = 'temporal-observation-disabled-by-metacanon-52';

  function createCycleObserver() {
    throw new Error(DISABLED_REASON);
  }

  return Object.freeze({
    DISABLED_REASON,
    createCycleObserver
  });
});
