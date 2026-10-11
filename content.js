// Applies the hide/show decision to this frame and reports it to the
// toolbar badge (background.js) and the popup.
(() => {
  const host = TSH.hostOf(location.href);
  let state = { host, found: false, hidden: true, source: TSH.SOURCE.GLOBAL };

  const report = () => {
    // Top frame only: the badge and popup describe the page, not its iframes.
    if (window !== window.top) return;
    try {
      chrome.runtime.sendMessage({ type: 'state', state }).catch(() => {});
    } catch {
      // Extension was reloaded; this orphaned script can no longer talk to it.
    }
  };

  const apply = async () => {
    const decision = TSH.resolve(await TSH.load(), host);
    document.documentElement.classList.toggle(TSH.SHOW_CLASS, !decision.hidden);
    state = { ...state, ...decision };
    report();
  };

  // Devtools mount after the app boots, so watch until the trigger appears.
  const detect = () => {
    if (!document.querySelector(TSH.TRIGGER_SELECTOR)) return false;
    state = { ...state, found: true };
    report();
    return true;
  };
  if (!detect()) {
    const obs = new MutationObserver(() => detect() && obs.disconnect());
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[TSH.STORAGE_KEY]) apply();
  });
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'get-state') reply(state);
  });

  // Chrome resets per-tab toolbar icons while a navigation is loading, which
  // can wipe reports sent early; report again once the page is done, and when
  // it is restored from the back/forward cache.
  window.addEventListener('load', report);
  window.addEventListener('pageshow', (e) => e.persisted && report());

  apply();
})();
