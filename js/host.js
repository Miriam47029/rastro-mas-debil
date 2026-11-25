import { MODE, ROOM, PHASE, QUESTIONS, subscribeRoom, host, ranking, esc, playerUrl } from "./game.js";
import { HOST_PIN } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
if (MODE === "local") $("modeBadge").classList.remove("hidden");

let room = {};
let busy = false;

// ───────────── PIN ─────────────
const unlocked = () => sessionStorage.getItem("rmd-host") === "1";
$("pinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("pinInput").value.trim() === HOST_PIN) {
    sessionStorage.setItem("rmd-host", "1");
    boot();
  } else {
    $("pinErr").textContent = "PIN incorrecto";
  }
});
if (unlocked()) boot();

function boot() {
  $("pinForm").classList.add("hidden");
  $("panel").classList.remove("hidden");
  $("roomName").textContent = ROOM;
  const qs = location.search;
  $("lnkScreen").href = `pantalla.html${qs}`;
  $("lnkPlayer").href = playerUrl();
  subscribeRoom((r) => { room = r; render(); });
}

// Evita dobles toques mientras se escribe en la base de datos.
const act = (fn) => async () => {
  if (busy) return;
  busy = true;
  try { await fn(); } catch (e) { console.error(e); alert("Error de conexión: " + e.message); }
  finally { busy = false; }
};
const st = () => room.state || { phase: PHASE.LOBBY, q: 0 };

$("btnOk").onclick = act(() => host.correct(st()));
$("btnBad").onclick = act(() => host.wrong(st()));
$("btnReopen").onclick = act(() => host.reopen());
$("btnReset").onclick = act(async () => { if (confirm("¿Poner todos los puntos en 0 y volver a la sala de espera?")) await host.resetScores(room.players); });
$("btnWipe").onclick = act(async () => { if (confirm("¿Vaciar la sala? Se borran jugadores y puntos.")) await host.wipe(); });

function flowButtons(s) {
  const last = (s.q ?? 0) >= QUESTIONS.length - 1;
  const B = (id, label, cls = "") => `<button class="btn ${cls}" data-act="${id}">${label}</button>`;
  switch (s.phase) {
    case PHASE.LOBBY:
      return B("start", "▶ Iniciar · Pregunta 1", "wide");
    case PHASE.QUESTION:
      return B("reveal", "Nadie sabe · revelar respuesta", "ghost wide");
    case PHASE.BUZZED:
      return "";
    case PHASE.REVEAL:
      return (last ? B("finish", "🏆 Mostrar podio", "wide") : B("next", `Siguiente → Pregunta ${s.q + 2}`, "wide"))
        + B("prev", "↺ Repetir esta", "ghost sm") + B("finish", "Terminar ya", "ghost sm");
    case PHASE.FINAL:
      return B("reset", "Nueva partida", "ghost wide");
  }
  return "";
}

$("flow").addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (!a) return;
  const s = st();
  const map = {
    start: () => host.start(),
    reveal: () => host.reveal(),
    next: () => host.next(s),
    prev: () => host.prev({ q: s.q + 1 }),
    finish: () => host.finish(),
    reset: () => host.resetScores(room.players),
  };
  act(map[a])();
});

$("plist").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pid]");
  if (!b) return;
  const { pid, op } = b.dataset;
  if (op === "plus") act(() => host.adjust(pid, 100))();
  if (op === "minus") act(() => host.adjust(pid, -100))();
  if (op === "kick") {
    const name = room.players?.[pid]?.name ?? "";
    if (confirm(`¿Sacar a "${name}" de la sala?`)) act(() => host.kick(pid))();
  }
});

function render() {
  const s = st();
  const players = room.players || {};
  const rk = ranking(players);
  const q = QUESTIONS[s.q];
  const inGame = s.phase !== PHASE.LOBBY && s.phase !== PHASE.FINAL;

  $("onlineCount").textContent = rk.filter((p) => p.online !== false).length;
  $("phaseChip").textContent = { lobby: "Sala de espera", question: "Botón abierto", buzzed: "Respondiendo", reveal: "Respuesta", final: "Podio" }[s.phase] || s.phase;

  // Juez
  const judging = s.phase === PHASE.BUZZED && s.buzz;
  $("judge").classList.toggle("hidden", !judging);
  if (judging) $("judgeName").textContent = s.buzz.name;

  // Pregunta actual (el conductor siempre ve la respuesta)
  $("qMeta").textContent = inGame ? `Pregunta ${s.q + 1} de ${QUESTIONS.length} · ${q?.pts} pts` : s.phase === PHASE.FINAL ? "Juego terminado" : "Sala de espera";
  $("qText").textContent = inGame ? q?.q : s.phase === PHASE.FINAL ? "El podio se está mostrando en el proyector." : "Cuando estén todos conectados, inicia el juego.";
  $("qAns").classList.toggle("hidden", !inGame);
  if (inGame) $("qAns").innerHTML = `<b>Respuesta:</b> ${esc(q?.a)}`;

  const locked = Object.keys(s.locked || {}).map((id) => players[id]?.name).filter(Boolean);
  $("lockedInfo").classList.toggle("hidden", !(inGame && locked.length));
  $("lockedInfo").textContent = `Ya fallaron: ${locked.join(", ")}`;

  $("flow").innerHTML = flowButtons(s);

  $("plist").innerHTML = rk.length ? rk.map((p, i) => `
    <div class="prow">
      <span class="nm ${p.online === false ? "off" : ""}">${i + 1}. ${esc(p.name)}${p.online === false ? " · desconectado" : ""}</span>
      <b>${p.score}</b>
      <span class="tools">
        <button class="btn ghost sm" data-pid="${p.id}" data-op="minus" aria-label="Quitar 100">−</button>
        <button class="btn ghost sm" data-pid="${p.id}" data-op="plus" aria-label="Sumar 100">+</button>
        <button class="btn ghost sm" data-pid="${p.id}" data-op="kick" aria-label="Sacar">✕</button>
      </span>
    </div>`).join("") : `<p class="muted">Nadie se ha conectado todavía.</p>`;
}
