// download-tally.js — what one model load has fetched, and when it is stuck.
// chat-worker.js imports it; tests run it on its own.

// Adds up every file one load fetches. A file's count only grows, so the sum
// never falls when a file restarts or another one starts.
export function createTally() {
  const files = new Map();
  const entry = (file) => files.get(file) || { loaded: 0, total: 0 };
  return {
    set(file, loaded, total) {
      const seen = entry(file);
      files.set(file, { loaded: Math.max(seen.loaded, loaded), total: Math.max(seen.total, total) });
    },
    done(file) {
      const seen = entry(file);
      files.set(file, { loaded: seen.total, total: seen.total });
    },
    bytes() {
      return Array.from(files.values()).reduce((sum, file) => sum + file.loaded, 0);
    },
    // True once at least one file is known and every known file is in.
    complete() {
      const all = Array.from(files.values());
      return all.length > 0 && all.every((file) => file.loaded >= file.total);
    },
  };
}

// One clock for a load. While files arrive it allows `stallMs` between
// events; once every file is in it allows `initMs` for the model to start, so
// a slow download never counts against the start. onTimeout gets 'stall' or 'init'.
export function createLoadTimer(onTimeout, { stallMs, initMs, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer = null;
  const arm = (ms, kind) => {
    clearTimer(timer);
    timer = setTimer(() => onTimeout(kind), ms);
  };
  return {
    downloading: () => arm(stallMs, 'stall'),
    starting: () => arm(initMs, 'init'),
    stop: () => clearTimer(timer),
  };
}
