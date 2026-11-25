import { store, MODE, ROOM, PHASE, QUESTIONS, subscribeRoom, joinRoom, markOnline, buzz, ranking, uid, cleanName, esc } from "./game.js";
import { vibrate } from "./sfx.js";

const $ = (id) => document.getElementById(id);
const app = $("app");
const views = { join: $("vJoin"), game: $("vGame"), final: $("vFinal"), kicked: $("vKicked") };

// Identidad:
//  - sessionStorage → cada pestaña es un jugador distinto (útil para probar con varias pestañas).
//  - localStorage   → recuerda al último jugador de este celular; si cierra la pestaña por error,
//                     al volver se le ofrece "Continuar como X" y conserva sus puntos.
const PID_KEY = `rmd-pid-${ROOM}`;
const LAST_KEY = `rmd-last-${ROOM}`;
let pid = sessionStorage.getItem(PID_KEY);
let candidate = pid ? null : localStorage.getItem(LAST_KEY);
let myName = "";
let joined = false;
let room = {};
let lastSig = "";

if (MODE === "local") $("modeBadge").classList.remove("hidden");
$("nameInput").value = localStorage.getItem("rmd-name") || "";

function show(v) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("hidden", k !== v));
}

$("joinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = cleanName($("nameInput").value);
  if (!name) return;
  $("joinBtn").disabled = true;
  if (!pid) { pid = uid(); sessionStorage.setItem(PID_KEY, pid); }
  localStorage.setItem("rmd-name", name);
  localStorage.setItem(LAST_KEY, pid);
  candidate = null;
  try {
    await joinRoom(pid, name);
    joined = true;
    render();
  } catch (err) {
    alert("No se pudo entrar. Revisa tu conexión e intenta de nuevo.");
    console.error(err);
  } finally {
    $("joinBtn").disabled = false;
  }
});

$("resumeBtn").addEventListener("click", () => {
  if (!candidate || !room.players?.[candidate]) return;
  pid = candidate;
  candidate = null;
  sessionStorage.setItem(PID_KEY, pid);
  joined = true;
  markOnline(pid);
  render();
});

$("rejoinBtn").addEventListener("click", () => {
  sessionStorage.removeItem(PID_KEY);
  localStorage.removeItem(LAST_KEY);
  candidate = null;
  pid = null;
  joined = false;
  render();
});

// Botón: pointerdown es más rápido que click en móviles.
let pressing = false;
$("buzzer").addEventListener("pointerdown", async (e) => {
  e.preventDefault();
  if (pressing || app.dataset.state !== "ready") return;
  pressing = true;
  vibrate(30);
  try {
    const won = await buzz(pid, myName);
    if (!won) vibrate([20, 40, 20]);
  } finally {
    pressing = false;
  }
});

// Si el celular pierde la conexión (pantalla bloqueada, cambio de red) y vuelve,
// se marca otra vez en línea.
store.onConnected((c) => { if (c && joined && pid && room.players?.[pid]) markOnline(pid); });

subscribeRoom((r) => {
  room = r;
  // Reanudar sesión si la pestaña ya estaba dentro.
  if (!joined && pid && r.players?.[pid]) {
    joined = true;
    markOnline(pid);
  }
  render();
});

// ───────────── Misión final: plan de 5 minutos ─────────────
const MISSION = [
  ["Permisos de apps", "Ubicación y micrófono solo «mientras usas la app»."],
  ["ID de publicidad", "Elimínalo o desactiva el rastreo entre apps."],
  ["Cookies de terceros", "Bloquéalas en el navegador que más usas."],
  ["Verificación en dos pasos", "Actívala en tu correo principal."],
  ["Tu actividad en la cuenta", "Borra el historial y los anuncios personalizados."],
];
const MKEY = "rmd-mission";
const loadDone = () => { try { return JSON.parse(localStorage.getItem(MKEY)) || []; } catch { return []; } };
function renderMission() {
  const done = loadDone();
  $("checklist").innerHTML = MISSION.map(([t, d], i) => `
    <li><label class="check ${done[i] ? "on" : ""}">
      <input type="checkbox" data-i="${i}" ${done[i] ? "checked" : ""} />
      <span class="box" aria-hidden="true"></span>
      <span><b>${t}</b><small>${d}</small></span>
    </label></li>`).join("");
  $("missionCount").textContent = `${done.filter(Boolean).length}/5`;
}
$("checklist").addEventListener("change", (e) => {
  const i = +e.target.dataset.i;
  const done = loadDone();
  done[i] = e.target.checked;
  try { localStorage.setItem(MKEY, JSON.stringify(done)); } catch {}
  if (e.target.checked) vibrate(20);
  renderMission();
});
renderMission();

function render() {
  const players = room.players || {};
  const me = pid ? players[pid] : null;

  if (!joined) {
    app.dataset.state = "join";
    $("meChip").classList.add("hidden");
    const prevMe = candidate ? players[candidate] : null;
    $("resumeBox").classList.toggle("hidden", !prevMe);
    $("nameLabel").textContent = prevMe ? "¿No eres tú? Entra con tu nombre" : "Escribe tu nombre";
    if (prevMe) {
      $("resumeName").textContent = prevMe.name;
      $("resumePts").textContent = `${prevMe.score || 0} puntos guardados`;
    }
    return show("join");
  }
  if (!me) { app.dataset.state = "join"; return show("kicked"); }

  myName = me.name;
  $("meName").textContent = me.name;
  $("meScore").textContent = me.score || 0;
  $("meChip").classList.remove("hidden");

  const st = room.state || { phase: PHASE.LOBBY };
  const q = QUESTIONS[st.q] || null;

  if (st.phase === PHASE.FINAL) {
    const rk = ranking(players);
    const pos = rk.findIndex((p) => p.id === pid) + 1;
    $("finalPlace").textContent = `#${pos}`;
    $("finalMsg").innerHTML = pos === 1 ? "¡Eres el <em>campeón</em>!" : pos <= 3 ? "¡Llegaste al <em>podio</em>!" : "¡Bien <em>jugado</em>!";
    $("finalScore").textContent = `${me.score || 0} puntos`;
    app.dataset.state = pos === 1 ? "ok" : "wait";
    return show("final");
  }

  show("game");
  const locked = !!st.locked?.[pid];
  const res = st.result;
  let state, label, status = "";

  $("qMeta").textContent = q && st.phase !== PHASE.LOBBY ? `Pregunta ${st.q + 1} de ${QUESTIONS.length} · ${q.pts} pts` : "Sala de espera";
  $("qText").textContent = q && st.phase !== PHASE.LOBBY ? q.q : "En un momento empieza el concurso. Mira el proyector 👀";
  $("answerBox").classList.add("hidden");
  const showOpts = q?.opts && st.phase !== PHASE.LOBBY;
  $("qOpts").classList.toggle("hidden", !showOpts);
  if (showOpts) $("qOpts").innerHTML = q.opts.map((o, i) => `<li><b>${"ABCD"[i]}</b> ${esc(o)}</li>`).join("");

  switch (st.phase) {
    case PHASE.LOBBY:
      state = "wait"; label = "ESPERA";
      status = `Ya estás dentro, <strong>${esc(me.name)}</strong>. Espera la primera pregunta.`;
      break;
    case PHASE.QUESTION:
      if (locked) { state = "bad"; label = "✖"; status = "<strong>Incorrecto.</strong> Quedas fuera de esta pregunta; espera la siguiente."; }
      else {
        state = "ready"; label = "¡PRESIONA!";
        status = res && !res.ok ? `${esc(res.name)} falló… <strong>¡el turno está libre!</strong>` : "Presiona para pedir la palabra";
      }
      break;
    case PHASE.BUZZED:
      if (st.buzz?.pid === pid) { state = "mine"; label = "¡TIENES LA<br/>PALABRA!"; status = "<strong>Responde en voz alta</strong> 🎤"; }
      else if (locked) { state = "bad"; label = "✖"; status = "Quedas fuera de esta pregunta."; }
      else { state = "other"; label = "ESPERA"; status = `<strong>${esc(st.buzz?.name ?? "Alguien")}</strong> tiene la palabra`; }
      break;
    case PHASE.REVEAL:
      if (res?.ok && res.pid === pid) { state = "ok"; label = `+${res.pts}`; status = "<strong>¡Correcto!</strong> Sumaste puntos 🎉"; }
      else if (locked) { state = "bad"; label = "✖"; status = "Esta no fue. ¡Vas por la siguiente!"; }
      else { state = "reveal"; label = "ESPERA"; status = res?.ok ? `<strong>${esc(res.name)}</strong> acertó` : "Nadie acertó esta vez"; }
      if (q) { $("answerText").textContent = q.a; $("answerBox").classList.remove("hidden"); }
      break;
    default:
      state = "wait"; label = "ESPERA";
  }

  const sig = `${st.phase}|${st.q}|${state}`;
  if (sig !== lastSig) {
    if (state === "mine") vibrate([80, 60, 80]);
    if (state === "ok") vibrate([60, 40, 60, 40, 160]);
    if (state === "bad" && !lastSig.endsWith("|bad")) vibrate(400);
    lastSig = sig;
  }

  app.dataset.state = state;
  $("buzzLabel").innerHTML = label;
  $("status").innerHTML = status;
}
