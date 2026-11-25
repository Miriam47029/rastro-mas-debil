// Capa de datos con dos implementaciones intercambiables:
//  - firebase: Realtime Database (producción, varios dispositivos)
//  - local:    localStorage + evento "storage" (demo entre pestañas)
// API común:
//   subscribe(path, cb) -> unsubscribe
//   update({ "ruta/a": valor, "ruta/b": null })   (multi-path, null borra)
//   transact(path, fn)  -> { committed, value }    (fn devuelve undefined para abortar)
//   onDisconnectUpdate(path, obj)
import { firebaseConfig } from "./firebase-config.js";

const configured =
  firebaseConfig?.databaseURL && !firebaseConfig.databaseURL.includes("TU_PROYECTO");

export const MODE = configured ? "firebase" : "local";

const FB = "https://www.gstatic.com/firebasejs/10.12.2";

async function createFirebaseStore() {
  const { initializeApp } = await import(`${FB}/firebase-app.js`);
  const d = await import(`${FB}/firebase-database.js`);
  const app = initializeApp(firebaseConfig);
  const db = d.getDatabase(app);
  return {
    subscribe: (path, cb) => d.onValue(d.ref(db, path), (s) => cb(s.val())),
    update: (updates) => d.update(d.ref(db), updates),
    transact: async (path, fn) => {
      const r = await d.runTransaction(d.ref(db, path), fn, { applyLocally: false });
      return { committed: r.committed, value: r.snapshot.val() };
    },
    onDisconnectUpdate: (path, obj) => d.onDisconnect(d.ref(db, path)).update(obj),
    onConnected: (cb) => d.onValue(d.ref(db, ".info/connected"), (s) => cb(!!s.val())),
  };
}

function createLocalStore() {
  const KEY = "rmd-local-db";
  const subs = new Set();
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const parts = (p) => p.split("/").filter(Boolean);
  const getAt = (tree, p) => parts(p).reduce((n, k) => (n == null ? null : n[k] ?? null), tree);
  const prune = (o) => {
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        o[k] = prune(o[k]);
        if (o[k] === null || (typeof o[k] === "object" && !Object.keys(o[k]).length)) delete o[k];
      }
    }
    return o;
  };
  const setAt = (tree, p, val) => {
    const ks = parts(p);
    let n = tree;
    ks.slice(0, -1).forEach((k) => {
      if (typeof n[k] !== "object" || n[k] === null) n[k] = {};
      n = n[k];
    });
    n[ks.at(-1)] = val === undefined ? null : JSON.parse(JSON.stringify(val));
  };
  const write = (tree) => {
    localStorage.setItem(KEY, JSON.stringify(prune(tree)));
    emit();
  };
  const emit = () => {
    const tree = read();
    subs.forEach((s) => s.cb(structuredClone(getAt(tree, s.path))));
  };
  addEventListener("storage", (e) => e.key === KEY && emit());

  return {
    subscribe(path, cb) {
      const s = { path, cb };
      subs.add(s);
      queueMicrotask(() => cb(structuredClone(getAt(read(), path))));
      return () => subs.delete(s);
    },
    async update(updates) {
      const tree = read();
      for (const [p, v] of Object.entries(updates)) setAt(tree, p, v);
      write(tree);
    },
    async transact(path, fn) {
      const tree = read();
      const next = fn(structuredClone(getAt(tree, path)));
      if (next === undefined) return { committed: false, value: getAt(tree, path) };
      setAt(tree, path, next);
      write(tree);
      return { committed: true, value: next };
    },
    onDisconnectUpdate() {},
    onConnected(cb) { cb(true); return () => {}; },
  };
}

export const store = MODE === "firebase" ? await createFirebaseStore() : createLocalStore();
