// Scenario library in localStorage. Every access is guarded: storage may be
// unavailable (private windows, blocked site data), and the app must still run.

const KEY = 'architecture-under-load.scenarios.v1';

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const lib = JSON.parse(raw);
    return lib && typeof lib === 'object' && lib.scenarios ? lib : null;
  } catch {
    return null;
  }
}

export function saveLibrary(lib) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lib));
    return true;
  } catch {
    return false;
  }
}
