/* ===== storage.js — durable save persistence =====
   The game saves after every overworld step, so this layer keeps a
   synchronous API: values live in an in-memory cache and every write
   is mirrored to a durable backend in the background.

   On the web that backend is localStorage. Inside a Capacitor native
   shell it is the Preferences plugin — a webview's localStorage can be
   evicted by the OS under storage pressure, but Preferences is backed
   by native storage (UserDefaults / SharedPreferences) and survives.

   Call GameStorage.init() once at startup (it returns a Promise) to
   hydrate the cache before anything reads a save. */

(function () {
  const cache = {};
  let usingCapacitor = false;

  /* The Capacitor Preferences plugin, if we're running in a native shell. */
  function preferences() {
    const cap = window.Capacitor;
    if (cap && cap.Plugins && cap.Plugins.Preferences) return cap.Plugins.Preferences;
    return null;
  }

  /* Push one key's current cache value out to the durable backend.
     Fire-and-forget: the in-memory cache is the source of truth for the
     running session, and persistence catches up in the background. */
  function persist(key) {
    const prefs = preferences();
    if (prefs) {
      const op = (key in cache)
        ? prefs.set({ key: key, value: cache[key] })
        : prefs.remove({ key: key });
      if (op && op.catch) op.catch(function () {});
      return;
    }
    try {
      if (key in cache) localStorage.setItem(key, cache[key]);
      else localStorage.removeItem(key);
    } catch (e) { /* storage may be unavailable (private mode, quota) */ }
  }

  const GameStorage = {
    /* Load every stored key into the cache. Always resolves, even if the
       backend is unavailable — the game then simply runs without saves. */
    init: function () {
      const prefs = preferences();
      if (prefs) {
        usingCapacitor = true;
        return prefs.keys()
          .then(function (res) {
            const keys = (res && res.keys) || [];
            return Promise.all(keys.map(function (key) {
              return prefs.get({ key: key }).then(function (r) {
                if (r && r.value != null) cache[key] = r.value;
              });
            }));
          })
          .catch(function () { /* start with an empty cache */ });
      }
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          cache[key] = localStorage.getItem(key);
        }
      } catch (e) { /* storage unavailable — cache stays empty */ }
      return Promise.resolve();
    },

    getItem: function (key) {
      return (key in cache) ? cache[key] : null;
    },
    setItem: function (key, value) {
      cache[key] = String(value);
      persist(key);
    },
    removeItem: function (key) {
      delete cache[key];
      persist(key);
    },

    /* Which backend is active — handy for a debug readout. */
    backend: function () { return usingCapacitor ? "capacitor" : "localStorage"; },
  };

  window.GameStorage = GameStorage;
})();
