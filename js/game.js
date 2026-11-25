// Lógica compartida: sala, rutas, acciones del juego y utilidades.
import { store, MODE } from "./store.js";
import { DEFAULT_ROOM } from "./firebase-config.js";
import { QUESTIONS } from "./questions.js";

export { store, MODE, QUESTIONS };

const params = new URLSearchParams(location.search);
export const ROOM = (params.get("sala") || DEFAULT_ROOM).toLowerCase().replace(/[^a-z0-9-]/g, "");
export const ROOT = `rooms/${ROOM}`;
const S = `${ROOT}/state`;

export const PHASE = {
  LOBBY: "lobby",     // esperando jugadores
  QUESTION: "question", // botón abierto
  BUZZED: "buzzed",   // alguien tiene la palabra
  REVEAL: "reveal",   // se muestra la respuesta
  FINAL: "final",     // podio
};

export const now = () => Date.now();
export const uid = () =>
  (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + now().toString(36)).replace(/-/g, "").slice(0, 16);

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const cleanName = (s = "") => s.replace(/\s+/g, " ").trim().slice(0, 20);

/** Jugadores ordenados por puntaje (desc) y luego por hora de entrada. */
export const ranking = (players = {}) =>
  Object.entries(players || {})
    .map(([id, p]) => ({ id, ...p, score: p.score || 0 }))
    .sort((a, b) => b.score - a.score || (a.joined || 0) - (b.joined || 0));

export const playerUrl = () => {
  const u = new URL("./", location.href);
  if (ROOM !== DEFAULT_ROOM) u.searchParams.set("sala", ROOM);
  return u.href;
};

export const subscribeRoom = (cb) => store.subscribe(ROOT, (v) => cb(v || {}));

// ───────────── Acciones del jugador ─────────────
export async function joinRoom(pid, name) {
  await store.update({
    [`${ROOT}/players/${pid}/name`]: name,
    [`${ROOT}/players/${pid}/joined`]: now(),
    [`${ROOT}/players/${pid}/online`]: true,
  });
  store.onDisconnectUpdate(`${ROOT}/players/${pid}`, { online: false });
}

export async function markOnline(pid) {
  await store.update({ [`${ROOT}/players/${pid}/online`]: true });
  store.onDisconnectUpdate(`${ROOT}/players/${pid}`, { online: false });
}

/** Intento atómico de pedir la palabra. Gana el primero que llega al servidor. */
export async function buzz(pid, name) {
  const r = await store.transact(S, (s) => {
    if (!s || s.phase !== PHASE.QUESTION) return;     // abortar
    if (s.locked && s.locked[pid]) return;           // ya falló en esta pregunta
    s.phase = PHASE.BUZZED;
    s.buzz = { pid, name, t: now() };
    s.seq = (s.seq || 0) + 1;
    return s;
  });
  return r.committed && r.value?.buzz?.pid === pid;
}

// ───────────── Acciones del conductor ─────────────
const openQuestion = (q) => ({
  [`${S}/phase`]: PHASE.QUESTION,
  [`${S}/q`]: q,
  [`${S}/buzz`]: null,
  [`${S}/locked`]: null,
  [`${S}/result`]: null,
  [`${S}/openedAt`]: now(),
});

export const host = {
  start: () => store.update(openQuestion(0)),

  async correct(state) {
    const b = state?.buzz;
    if (!b) return;
    const pts = QUESTIONS[state.q]?.pts ?? 100;
    await store.transact(`${ROOT}/players/${b.pid}/score`, (v) => (v || 0) + pts);
    await store.update({
      [`${S}/phase`]: PHASE.REVEAL,
      [`${S}/buzz`]: null,
      [`${S}/result`]: { pid: b.pid, name: b.name, ok: true, pts, t: now() },
    });
  },

  async wrong(state) {
    const b = state?.buzz;
    if (!b) return;
    await store.update({
      [`${S}/phase`]: PHASE.QUESTION,
      [`${S}/buzz`]: null,
      [`${S}/locked/${b.pid}`]: true,
      [`${S}/result`]: { pid: b.pid, name: b.name, ok: false, t: now() },
    });
  },

  reveal: () => store.update({ [`${S}/phase`]: PHASE.REVEAL, [`${S}/buzz`]: null }),

  /** Reabre el botón sin castigar a nadie (por si alguien presionó por error). */
  reopen: () => store.update({ [`${S}/phase`]: PHASE.QUESTION, [`${S}/buzz`]: null }),

  next(state) {
    const q = (state?.q ?? -1) + 1;
    if (q >= QUESTIONS.length) return store.update({ [`${S}/phase`]: PHASE.FINAL, [`${S}/buzz`]: null });
    return store.update(openQuestion(q));
  },

  prev(state) {
    const q = Math.max(0, (state?.q ?? 0) - 1);
    return store.update(openQuestion(q));
  },

  finish: () => store.update({ [`${S}/phase`]: PHASE.FINAL, [`${S}/buzz`]: null }),

  adjust: (pid, delta) => store.transact(`${ROOT}/players/${pid}/score`, (v) => Math.max(0, (v || 0) + delta)),

  kick: (pid) => store.update({ [`${ROOT}/players/${pid}`]: null }),

  /** Nueva partida: puntos a cero, conserva jugadores. */
  async resetScores(players = {}) {
    const u = { [S]: { phase: PHASE.LOBBY, q: 0, seq: 0 } };
    Object.keys(players || {}).forEach((pid) => (u[`${ROOT}/players/${pid}/score`] = 0));
    await store.update(u);
  },

  /** Vacía la sala por completo. */
  wipe: () => store.update({ [ROOT]: { state: { phase: PHASE.LOBBY, q: 0, seq: 0 } } }),
};
