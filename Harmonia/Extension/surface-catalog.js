(function attachSurfaceCatalog(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HarmoniaSurfaceCatalog = api;
})(typeof globalThis === 'object' ? globalThis : this, function createSurfaceCatalog() {
  'use strict';

  const SCHEMA = 'harmonia.auxiliary-ui-surfaces.v1';
  const MAX_SAMPLES_PER_KIND = 8;
  const TOKEN = /^[A-Za-z0-9_.:-]{1,80}$/;
  const ROLE_ALLOWLIST = new Set([
    'navigation', 'banner', 'menu', 'menuitem', 'menubar', 'listbox', 'option',
    'dialog', 'combobox', 'button', 'tab', 'tablist', 'tree', 'treeitem',
    'list', 'listitem', 'group', 'region', 'toolbar', 'search', 'presentation'
  ]);
  const POPUP_ALLOWLIST = new Set(['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog']);
  const AUXILIARY_ATTRIBUTES = new Set([
    'class', 'role', 'data-testid', 'aria-expanded', 'aria-haspopup',
    'aria-modal', 'hidden', 'data-state'
  ]);
  const AUXILIARY_SELECTOR = [
    'nav', 'aside', 'header', '[role="navigation"]', '[role="banner"]',
    '[role="menu"]', '[role="listbox"]', '[role="dialog"]', '[aria-modal="true"]',
    '[data-radix-popper-content-wrapper]', '[data-testid*="tool-picker"]',
    '[data-testid*="tools-menu"]', '[role="combobox"]', '[aria-haspopup="listbox"]',
    '[aria-haspopup="menu"]', '[data-testid*="model-switcher"]', '[data-testid*="model-selector"]'
  ].join(',');

  const CATEGORIES = Object.freeze([
    { kind: 'navigation', selector: 'nav,[role="navigation"]', features: ['navigation.primary-region'] },
    { kind: 'sidebar', selector: 'aside,[data-testid*="sidebar"]', features: ['navigation.sidebar-region'] },
    { kind: 'global-header', selector: 'header,[role="banner"]', features: ['surface.global-header'] },
    { kind: 'menu', selector: '[role="menu"]', features: ['surface.menu'] },
    { kind: 'listbox', selector: '[role="listbox"]', features: ['surface.listbox', 'surface.selector'] },
    { kind: 'dialog', selector: '[role="dialog"],[aria-modal="true"]', features: ['surface.dialog'] },
    { kind: 'popover', selector: '[data-radix-popper-content-wrapper]', features: ['surface.popover'] },
    { kind: 'tool-picker', selector: '[data-testid*="tool-picker"],[data-testid*="tools-menu"]', features: ['composer.tool-picker-surface'] },
    { kind: 'selector', selector: '[role="combobox"],[aria-haspopup="listbox"],[aria-haspopup="menu"]', features: ['surface.selector'] },
    { kind: 'model-selector', selector: '[data-testid*="model-switcher"],[data-testid*="model-selector"]', features: ['composer.model-selector'] }
  ]);

  function boundedToken(value, max = 80) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length <= max && TOKEN.test(trimmed) ? trimmed : null;
  }

  function allowedRole(element) {
    const value = element?.getAttribute?.('role');
    return typeof value === 'string' && ROLE_ALLOWLIST.has(value) ? value : null;
  }

  function allowedPopup(element) {
    const value = element?.getAttribute?.('aria-haspopup');
    return typeof value === 'string' && POPUP_ALLOWLIST.has(value) ? value : null;
  }

  function isVisible(documentRef, element) {
    if (!element || element.isConnected === false || element.hidden === true) return false;
    let style = null;
    try {
      style = documentRef?.defaultView?.getComputedStyle?.(element) || null;
    } catch {}
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) {
      return false;
    }
    let rect = null;
    try {
      rect = element.getBoundingClientRect?.() || null;
    } catch {}
    if (!rect) return true;
    return Number(rect.width) > 0 && Number(rect.height) > 0;
  }

  function structuralSample(documentRef, element) {
    const classes = [];
    try {
      for (const token of Array.from(element.classList || [])) {
        const safe = boundedToken(token, 40);
        if (safe && classes.length < 4) classes.push(safe);
      }
    } catch {}
    const expandedRaw = element.getAttribute?.('aria-expanded');
    const modalRaw = element.getAttribute?.('aria-modal');
    const testId = boundedToken(element.getAttribute?.('data-testid'), 80);
    const hasPopup = allowedPopup(element);
    return {
      tag: typeof element.tagName === 'string' ? element.tagName.toLowerCase().slice(0, 24) : 'unknown',
      role: allowedRole(element),
      testId,
      classes,
      childCount: Array.isArray(element.children) || element.children ? Number(element.children.length || 0) : 0,
      visible: isVisible(documentRef, element),
      expanded: expandedRaw === 'true' ? true : expandedRaw === 'false' ? false : null,
      hasPopup,
      modal: modalRaw === 'true',
      disabled: element.disabled === true
    };
  }

  function inspect(documentRef, options = {}) {
    const requested = Number(options.maxSamplesPerKind);
    const maxSamples = Number.isInteger(requested)
      ? Math.max(1, Math.min(12, requested))
      : MAX_SAMPLES_PER_KIND;
    const features = new Set();
    const regions = [];

    if (!documentRef || typeof documentRef.querySelectorAll !== 'function') {
      return {
        schema: SCHEMA,
        features: [],
        regions: [],
        privacy: {
          textCaptured: false,
          labelsCaptured: false,
          fieldValuesCaptured: false,
          hrefsCaptured: false,
          contentCaptured: false
        }
      };
    }

    for (const category of CATEGORIES) {
      let elements = [];
      try {
        elements = Array.from(documentRef.querySelectorAll(category.selector) || []);
      } catch {}
      const unique = [...new Set(elements)].filter(Boolean);
      if (!unique.length) continue;
      for (const feature of category.features) features.add(feature);
      const samples = unique.slice(0, maxSamples).map(element => structuralSample(documentRef, element));
      regions.push({
        kind: category.kind,
        count: unique.length,
        visibleCount: unique.reduce((count, element) => count + (isVisible(documentRef, element) ? 1 : 0), 0),
        samples,
        truncated: unique.length > samples.length
      });
    }

    return {
      schema: SCHEMA,
      features: [...features].sort(),
      regions,
      privacy: {
        textCaptured: false,
        labelsCaptured: false,
        fieldValuesCaptured: false,
        hrefsCaptured: false,
        contentCaptured: false
      }
    };
  }

  function isAuxiliarySurfaceTarget(element) {
    if (!element || element.nodeType !== 1) return false;
    try {
      if (typeof element.closest === 'function' && element.closest(AUXILIARY_SELECTOR)) return true;
      return typeof element.matches === 'function' && element.matches(AUXILIARY_SELECTOR);
    } catch {
      return false;
    }
  }

  function containsAuxiliarySurface(node) {
    if (!node || node.nodeType !== 1) return false;
    try {
      if (typeof node.matches === 'function' && node.matches(AUXILIARY_SELECTOR)) return true;
      return typeof node.querySelector === 'function' && !!node.querySelector(AUXILIARY_SELECTOR);
    } catch {
      return false;
    }
  }

  function isAuxiliaryAttribute(attributeName) {
    return AUXILIARY_ATTRIBUTES.has(String(attributeName || ''));
  }

  return Object.freeze({
    schema: SCHEMA,
    categories: CATEGORIES,
    inspect,
    isAuxiliarySurfaceTarget,
    containsAuxiliarySurface,
    isAuxiliaryAttribute
  });
});
