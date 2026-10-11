const ANALYTICS_ID = 'G-29LLY9P226';
const DEBUG_PARAM = 'analytics';
const DEBUG_VALUE = 'debug';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const BOOT_FALLBACK_MS = 1500;

function nodeRuntime() {
  return typeof process !== 'undefined' && Boolean(process.versions && process.versions.node);
}
function browserEnv() {
  const win = typeof window === 'undefined' ? null : window;
  return { win, doc: win && win.document, nav: win && win.navigator, loc: win && win.location, node: nodeRuntime() };
}
function isLocalHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return LOCAL_HOSTS.has(host) || host.endsWith('.local');
}
function debugRequested(loc) {
  try {
    return new URLSearchParams(loc.search).get(DEBUG_PARAM) === DEBUG_VALUE;
  } catch {
    return false;
  }
}
function noBrowser(env) {
  return Boolean(env.node || !env.win || !env.doc || !env.loc);
}
function notWeb(loc) {
  return loc.protocol !== 'http:' && loc.protocol !== 'https:';
}
function analyticsOff(env, id = ANALYTICS_ID) {
  if (!id) return 'no-id';
  if (noBrowser(env)) return 'no-browser';
  if (notWeb(env.loc)) return 'protocol';
  if (isLocalHost(env.loc.hostname) && !debugRequested(env.loc)) return 'local-host';
  return null;
}
function startClient(state, opened, client) {
  const found = state.readEnv();
  if (state.send || analyticsOff(found, state.id) !== null) return false;
  try {
    state.send = client.launch(found, { id: state.id, debug: debugRequested(found.loc), opened });
    return true;
  } catch {
    return false;
  }
}
function runWhenIdle(win, task) {
  if (!win) return;
  if (typeof win.requestIdleCallback === 'function') win.requestIdleCallback(task, { timeout: BOOT_FALLBACK_MS });
  else win.setTimeout(task, BOOT_FALLBACK_MS);
}
function createAnalytics(readEnv = browserEnv, id = ANALYTICS_ID) {
  const state = { readEnv, id, send: null };
  return {
    wanted: () => analyticsOff(readEnv(), id) === null,
    start: (opened, client) => startClient(state, opened, client),
    track: (name, params) => { if (state.send) state.send(name, params); },
    whenIdle: (task) => runWhenIdle(readEnv().win, task),
  };
}

const analytics = createAnalytics();

export { ANALYTICS_ID, analytics, analyticsOff, createAnalytics };
