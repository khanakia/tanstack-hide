// Popup: edit settings and show what is happening on the active tab.
const $ = (id) => document.getElementById(id);

const SOURCE_TEXT = {
  [TSH.SOURCE.PAUSED]: 'extension paused',
  [TSH.SOURCE.SITE]: 'site rule',
  [TSH.SOURCE.GLOBAL]: 'global setting',
};
const MODE_TEXT = { [TSH.SITE_MODE.HIDE]: 'hide', [TSH.SITE_MODE.SHOW]: 'show' };

let settings;
let tab;
let host;
let pageState = null; // reply from content.js, or null if it is not running

async function queryPage() {
  if (!tab || !host) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'get-state' }, { frameId: 0 });
  } catch {
    return null; // tab was open before the extension loaded, or a restricted page
  }
}

function renderStatus() {
  const el = $('status');
  el.className = 'status';
  if (!host) {
    el.textContent = 'Not available on this page';
    return;
  }
  const d = TSH.resolve(settings, host);
  const why = SOURCE_TEXT[d.source];
  if (!pageState) {
    el.textContent = `Reload the page to apply · would be ${d.hidden ? 'hidden' : 'shown'} (${why})`;
    return;
  }
  if (!pageState.found) {
    el.textContent = `No TanStack Devtools on this page · ${d.hidden ? 'hide' : 'show'} (${why})`;
    return;
  }
  el.classList.add(d.hidden ? 'hidden' : 'shown');
  el.textContent = `Trigger ${d.hidden ? 'hidden' : 'visible'} on this page (${why})`;
}

function render() {
  $('enabled').checked = settings.enabled;
  $('globalHide').checked = settings.globalHide;
  $('globalHide').disabled = !settings.enabled;

  $('host').textContent = host || '—';
  $('siteSection').hidden = !host;
  const mode = (host && settings.sites[host]) || '';
  for (const b of $('siteMode').querySelectorAll('button')) {
    b.setAttribute('aria-checked', String(b.dataset.mode === mode));
    if (!b.dataset.mode) b.textContent = `Global (${settings.globalHide ? 'hide' : 'show'})`;
  }

  const hosts = Object.keys(settings.sites).sort();
  $('ruleCount').textContent = hosts.length ? `(${hosts.length})` : '';
  const list = $('rules');
  list.replaceChildren();
  if (!hosts.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No site rules — every site follows the global setting';
    list.append(li);
  }
  for (const h of hosts) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'mono';
    name.textContent = h;
    name.title = h;
    const tag = document.createElement('span');
    tag.className = `tag ${settings.sites[h]}`;
    tag.textContent = MODE_TEXT[settings.sites[h]];
    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.title = `Remove rule for ${h}`;
    rm.addEventListener('click', () => update((s) => delete s.sites[h]));
    li.append(name, tag, rm);
    list.append(li);
  }
  renderStatus();
}

async function update(mutate) {
  mutate(settings);
  await TSH.save(settings);
  render();
  // Give content.js a moment to apply, then refresh the live status.
  setTimeout(async () => {
    pageState = await queryPage();
    renderStatus();
  }, 150);
}

$('enabled').addEventListener('change', (e) => update((s) => (s.enabled = e.target.checked)));
$('globalHide').addEventListener('change', (e) => update((s) => (s.globalHide = e.target.checked)));
$('siteMode').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !host) return;
  update((s) => {
    if (b.dataset.mode) s.sites[host] = b.dataset.mode;
    else delete s.sites[host];
  });
});

(async () => {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  host = tab ? TSH.hostOf(tab.url || '') : null;
  settings = await TSH.load();
  pageState = await queryPage();
  render();
})();
