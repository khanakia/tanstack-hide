// Settings model shared by content.js, background.js and popup.js.
// Loaded as a classic script everywhere (content scripts cannot be modules),
// so it exposes a single global, TSH.

/** Per-site rule. A host with no entry follows the global setting. */
const SITE_MODE = Object.freeze({ HIDE: 'hide', SHOW: 'show' });

/** Why the trigger is hidden or shown, so the popup can explain it. */
const SOURCE = Object.freeze({ PAUSED: 'paused', SITE: 'site', GLOBAL: 'global' });

const TSH = Object.freeze({
  SITE_MODE,
  SOURCE,
  STORAGE_KEY: 'settings',
  // Selector of the corner button; must match hide.css.
  TRIGGER_SELECTOR: '[data-testid="tanstack_devtools"] > button[aria-label="Open TanStack Devtools"]',
  // Class on <html> that lets the trigger show; see hide.css.
  SHOW_CLASS: 'tsh-show',
  /**
   * enabled: master switch; when false nothing is hidden anywhere.
   * globalHide: what sites without their own rule do.
   * sites: host -> SITE_MODE, overriding globalHide for that host.
   */
  DEFAULTS: Object.freeze({ enabled: true, globalHide: true, sites: {} }),

  async load() {
    const got = await chrome.storage.sync.get(TSH.STORAGE_KEY);
    const s = got[TSH.STORAGE_KEY] || {};
    return { ...TSH.DEFAULTS, ...s, sites: { ...(s.sites || {}) } };
  },

  save(settings) {
    return chrome.storage.sync.set({ [TSH.STORAGE_KEY]: settings });
  },

  /** Decide whether the trigger is hidden on `host`, and why. */
  resolve(settings, host) {
    if (!settings.enabled) return { hidden: false, source: SOURCE.PAUSED };
    const rule = settings.sites[host];
    if (rule === SITE_MODE.HIDE || rule === SITE_MODE.SHOW) {
      return { hidden: rule === SITE_MODE.HIDE, source: SOURCE.SITE };
    }
    return { hidden: settings.globalHide, source: SOURCE.GLOBAL };
  },

  /** Host key for a URL, or null for pages content scripts cannot run on. */
  hostOf(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'file:' ? u.host || 'file' : null;
    } catch {
      return null;
    }
  },
});
