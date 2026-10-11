const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=';
const PAGE_TITLE = 'HACK://OVERFLOW';
const DEBUG_PARAM = 'analytics';
const MAX_ENUM_LENGTH = 24;
const MAX_COUNT = 9999;

const asBool = (value) => value === true;
const asCount = (value) => (Number.isFinite(value) ? Math.min(MAX_COUNT, Math.max(0, Math.trunc(value))) : 0);
const asEnum = (value) => String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, MAX_ENUM_LENGTH);
const RESULTS = new Set(['pass', 'fail', 'error']);
const asResult = (value) => (RESULTS.has(value) ? value : 'error');

const EVENTS = {
  game_open: { embedded: asBool, returning: asBool, locks_cleared: asCount, map_rev: asCount },
  opening_done: {},
  room_enter: { room: asEnum },
  lock_open: { lock: asEnum, hall: asEnum },
  breach_attempt: { lock: asEnum, result: asResult, attempt_no: asCount },
  lock_cleared: { lock: asEnum, attempts: asCount },
  zap: { lane: asEnum },
  hearts_zero: {},
  level_up: { level: asCount },
  map_open: {},
};

function eventPayload(name, params = {}) {
  if (!Object.hasOwn(EVENTS, name)) return null;
  const clean = {};
  for (const [key, cleaner] of Object.entries(EVENTS[name])) clean[key] = cleaner(params[key]);
  return { name, params: clean };
}
function pageLocation(loc) {
  const url = new URL(loc.href);
  url.searchParams.delete(DEBUG_PARAM);
  url.hash = '';
  return url.href;
}
function installGtag(env, { id, debug }) {
  const win = env.win;
  win.dataLayer = win.dataLayer || [];
  win.gtag = function gtag() { win.dataLayer.push(arguments); };
  win.gtag('js', new Date());
  const config = { page_location: pageLocation(env.loc), page_title: PAGE_TITLE, send_page_view: true };
  if (debug) config.debug_mode = true;
  win.gtag('config', id, config);
}
function loadGtag(doc, id) {
  const script = doc.createElement('script');
  script.async = true;
  script.src = GTAG_SRC + encodeURIComponent(id);
  doc.head.appendChild(script);
}
function senderFor(win) {
  return function send(name, params) {
    const payload = eventPayload(name, params);
    if (!payload) return;
    try {
      win.gtag('event', payload.name, payload.params);
    } catch {
    }
  };
}
function launch(env, config) {
  installGtag(env, config);
  loadGtag(env.doc, config.id);
  const send = senderFor(env.win);
  send('game_open', { embedded: env.win.self !== env.win.top, ...config.opened });
  return send;
}

export { EVENTS, MAX_ENUM_LENGTH, eventPayload, launch };
