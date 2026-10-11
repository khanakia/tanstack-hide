importScripts('shared.js');

// Toolbar status: the brand icon with a coloured dot in its top-right corner.
// No dot = no TanStack Devtools on the page. popup.html shows the same legend.
const DOT = Object.freeze({
  HIDDEN: { color: '#16a34a', title: 'TanStack Devtools trigger hidden' },
  SHOWN: { color: '#f59e0b', title: 'TanStack Devtools trigger visible' },
  PAUSED: { color: '#a1a1aa', title: 'Paused: TanStack Devtools trigger visible' },
});
const ICON_SIZES = [16, 32];
const ICON_PATHS = Object.fromEntries(ICON_SIZES.map((s) => [s, `icons/icon-${s}.png`]));
const DEFAULT_TITLE = 'TanStack Devtools Trigger Hide';

// Decoded base icons, cached for the life of the service worker.
let baseIcons;
function loadBaseIcons() {
  baseIcons ??= Promise.all(
    ICON_SIZES.map(async (size) => {
      const blob = await (await fetch(chrome.runtime.getURL(ICON_PATHS[size]))).blob();
      return [size, await createImageBitmap(blob)];
    }),
  );
  return baseIcons;
}

async function iconWithDot(color) {
  const imageData = {};
  for (const [size, bmp] of await loadBaseIcons()) {
    const ctx = new OffscreenCanvas(size, size).getContext('2d');
    ctx.drawImage(bmp, 0, 0, size, size);
    // Dot radius ~22% of the icon, with a white ring so it reads on any tile.
    const r = size * 0.22;
    const cx = size - r - size * 0.04;
    const cy = r + size * 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r + size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  return imageData;
}

function dotFor(state) {
  if (!state.found) return null;
  if (state.hidden) return DOT.HIDDEN;
  return state.source === TSH.SOURCE.PAUSED ? DOT.PAUSED : DOT.SHOWN;
}

// Latest status request per tab. Drawing a dotted icon is async, so an older
// request could otherwise finish after a newer one and leave a stale dot.
const latest = new Map();

async function setStatus(tabId, state) {
  const token = Symbol();
  latest.set(tabId, token);
  const dot = dotFor(state);
  try {
    // v1.1 used a text badge ("HID"/"SHOW"); Chrome keeps per-tab badge text
    // across an extension reload, so wipe it or the old label covers the dot.
    await chrome.action.setBadgeText({ tabId, text: '' });
    if (dot) {
      const imageData = await iconWithDot(dot.color);
      if (latest.get(tabId) !== token) return;
      await chrome.action.setIcon({ tabId, imageData });
      await chrome.action.setTitle({ tabId, title: `${dot.title} (${state.host})` });
    } else {
      await chrome.action.setIcon({ tabId, path: ICON_PATHS });
      await chrome.action.setTitle({ tabId, title: DEFAULT_TITLE });
    }
  } catch {
    // Tab closed before the icon was set.
  }
}

// Same leftover-badge cleanup for every tab, once per install/update.
chrome.runtime.onInstalled.addListener(async () => {
  chrome.action.setBadgeText({ text: '' });
  for (const tab of await chrome.tabs.query({})) chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => latest.delete(tabId));

// Second path besides content.js's own reports: when a tab finishes loading,
// ask the page for its state, so a report wiped by the load reset is redone.
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return;
  try {
    const state = await chrome.tabs.sendMessage(tabId, { type: 'get-state' }, { frameId: 0 });
    if (state) setStatus(tabId, state);
  } catch {
    // No content script here (chrome:// pages, the Web Store, tabs opened before install).
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'state' && sender.tab && sender.frameId === 0) setStatus(sender.tab.id, msg.state);
});

// Alt+Shift+H: flip the current site to the opposite of what it shows now.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-site' || !tab) return;
  const host = TSH.hostOf(tab.url || '');
  if (!host) return;
  const settings = await TSH.load();
  const { hidden } = TSH.resolve(settings, host);
  // Hiding while paused would do nothing, so un-pause too.
  if (!hidden) settings.enabled = true;
  settings.sites[host] = hidden ? TSH.SITE_MODE.SHOW : TSH.SITE_MODE.HIDE;
  await TSH.save(settings);
});
