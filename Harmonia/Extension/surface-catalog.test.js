'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('./surface-catalog');

function makeElement(tagName, attributes = {}, options = {}) {
  const reads = [];
  const element = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    isConnected: options.connected !== false,
    hidden: options.hidden === true,
    disabled: options.disabled === true,
    children: new Array(options.childCount || 0).fill(null),
    classList: options.classes || [],
    getAttribute(name) {
      reads.push(name);
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    },
    getBoundingClientRect() {
      return { width: options.width ?? 120, height: options.height ?? 28 };
    },
    matches(selector) {
      return options.matches?.includes(selector) || false;
    },
    closest(selector) {
      return options.closest ? this : null;
    },
    querySelector(selector) {
      return options.contains?.includes(selector) ? {} : null;
    },
    get reads() { return reads; }
  };
  for (const forbidden of ['innerText', 'textContent', 'value', 'href', 'placeholder', 'ariaLabel']) {
    Object.defineProperty(element, forbidden, {
      configurable: false,
      get() { throw new Error('forbidden_property_read:' + forbidden); }
    });
  }
  return element;
}

function makeDocument(entries) {
  const selectorMap = new Map(entries);
  return {
    defaultView: {
      getComputedStyle(element) {
        return {
          display: element.hidden ? 'none' : 'block',
          visibility: 'visible',
          opacity: '1'
        };
      }
    },
    querySelectorAll(selector) {
      return selectorMap.get(selector) || [];
    }
  };
}

test('auxiliary surface catalog detects allowlisted navigation, sidebar, menu, dialog and selector types', () => {
  const elements = catalog.categories.map((category, index) => {
    const attrs = {
      role: category.kind === 'navigation' ? 'navigation'
        : category.kind === 'menu' ? 'menu'
        : category.kind === 'listbox' ? 'listbox'
        : category.kind === 'dialog' ? 'dialog'
        : category.kind === 'selector' ? 'combobox'
        : category.kind === 'global-header' ? 'banner' : null,
      'data-testid': category.kind + '-region',
      'aria-expanded': index % 2 === 0 ? 'true' : 'false',
      'aria-haspopup': category.kind === 'selector' ? 'listbox' : null,
      'aria-modal': category.kind === 'dialog' ? 'true' : null
    };
    return [category.selector, [makeElement('section', attrs, { classes: ['flex', 'gap-2', 'unsafe token'], childCount: 3 })]];
  });
  const documentRef = makeDocument(elements);
  const report = catalog.inspect(documentRef);
  assert.equal(report.schema, 'harmonia.auxiliary-ui-surfaces.v1');
  assert.equal(report.regions.length, catalog.categories.length);
  assert.ok(report.features.includes('navigation.primary-region'));
  assert.ok(report.features.includes('navigation.sidebar-region'));
  assert.ok(report.features.includes('surface.dialog'));
  assert.ok(report.features.includes('composer.tool-picker-surface'));
  assert.ok(report.features.includes('composer.model-selector'));
  assert.equal(report.privacy.textCaptured, false);
  assert.equal(report.privacy.labelsCaptured, false);
  assert.equal(report.privacy.fieldValuesCaptured, false);
  assert.equal(report.privacy.hrefsCaptured, false);
  assert.equal(report.privacy.contentCaptured, false);
  const serialized = JSON.stringify(report);
  for (const forbidden of ['innerText', 'textContent', 'placeholder', 'ariaLabel', '"href":', 'unsafe token']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('catalog stores only allowlisted structural tokens and bounds samples', () => {
  const category = catalog.categories.find(item => item.kind === 'sidebar');
  const nodes = Array.from({ length: 15 }, (_, index) =>
    makeElement('aside', {
      role: 'navigation',
      'data-testid': index === 0 ? 'sidebar.primary' : 'private path / account'
    }, { classes: ['flex', 'gap-2'], childCount: index })
  );
  const report = catalog.inspect(makeDocument([[category.selector, nodes]]));
  const sidebar = report.regions[0];
  assert.equal(sidebar.count, 15);
  assert.equal(sidebar.samples.length, 8);
  assert.equal(sidebar.truncated, true);
  assert.equal(sidebar.samples[0].testId, 'sidebar.primary');
  assert.equal(sidebar.samples[1].testId, null);
  assert.deepEqual(sidebar.samples[0].classes, ['flex', 'gap-2']);
  assert.equal(sidebar.samples[0].childCount, 0);
});

test('visibility and optional structural changes are measured without content access', () => {
  const nav = makeElement('nav', {}, { hidden: true, width: 0, height: 0, closest: true });
  const category = catalog.categories.find(item => item.kind === 'navigation');
  const report = catalog.inspect(makeDocument([[category.selector, [nav]]]));
  assert.equal(report.regions[0].count, 1);
  assert.equal(report.regions[0].visibleCount, 0);
  assert.equal(report.regions[0].samples[0].visible, false);
  assert.equal(catalog.isAuxiliaryAttribute('aria-expanded'), true);
  assert.equal(catalog.isAuxiliaryAttribute('aria-label'), false);
  assert.equal(catalog.isAuxiliaryAttribute('value'), false);
  assert.equal(catalog.isAuxiliarySurfaceTarget(nav), true);
  assert.equal(catalog.containsAuxiliarySurface(nav), false);
});

test('missing document returns an empty privacy-safe structural report', () => {
  const report = catalog.inspect(null);
  assert.deepEqual(report.features, []);
  assert.deepEqual(report.regions, []);
  assert.equal(report.privacy.textCaptured, false);
  assert.equal(catalog.isAuxiliaryAttribute('aria-label'), false);
});
