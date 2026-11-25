import { MODE, PHASE, QUESTIONS, subscribeRoom, ranking, playerUrl, esc } from "./game.js";
import { sfx } from "./sfx.js";

const ANSWER_SECONDS = 10;      // cuenta regresiva visual para responder
const RESULT_OVERLAY_MS = 1900; // duración del flash verde/rojo

const $ = (id) => document.getElementById(id);
const main = $("main"), board = $("board"), stage = $("stage");
const overlay = $("overlay"), overlayBox = $("overlayBox");

if (MODE === "local") $("modeBadge").classList.remove("hidden");

$("gateBtn").addEventListener("click", () => {
  sfx.unlock();
  $("gate").remove();
});
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "f") {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  }
});

let prev = { phase: null, q: null, buzzT: null, resT: null, count: 0 };
let room = {};
let countdown = null;
let resultTimer = null;
let qrDrawnFor = null;

subscribeRoom((r) => {
  room = r;
  const st = r.state || { phase: PHASE.LOBBY, q: 0 };
  effects(st, r.players || {});
  render(st, r.players || {});
});

// ───────────── Sonidos y overlays según transición ─────────────
function effects(st, players) {
  const online = Object.values(players).filter((p) => p.online !== false).length;

  if (st.phase === PHASE.LOBBY && online > prev.count && prev.phase !== null) sfx.join();

  if (st.phase === PHASE.QUESTION && (prev.phase !== PHASE.QUESTION || prev.q !== st.q) && prev.phase !== PHASE.BUZZED) sfx.open();

  const buzzT = st.buzz?.t ?? null;
  if (st.phase === PHASE.BUZZED && buzzT && buzzT !== prev.buzzT) {
    sfx.buzz();
    showBuzz(st.buzz.name);
  }
  if (st.phase !== PHASE.BUZZED) stopCountdown();

  const res = st.result;
  if (res?.t && res.t !== prev.resT && prev.phase !== null) {
    if (res.ok) { sfx.correct(); burst(0.5); }
    else sfx.wrong();
    showResult(res);
  }

  if (st.phase === PHASE.FINAL && prev.phase !== PHASE.FINAL && prev.phase !== null) {
    sfx.fanfare();
    celebrate();
  }

  prev = { phase: st.phase, q: st.q, buzzT, resT: res?.t ?? prev.resT, count: online };
}

function showBuzz(name) {
  clearTimeout(resultTimer);
  overlay.className = "overlay";
  const C = 2 * Math.PI * 52;
  overlayBox.innerHTML = `
    <p class="eyebrow">Tiene la palabra</p>
    <div class="who">${esc(name)}</div>
    <p class="sub">responde en voz alta…</p>
    <div class="ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="ringFg" cx="60" cy="60" r="52" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><span id="ringNum">${ANSWER_SECONDS}</span></div>`;
  let left = ANSWER_SECONDS;
  stopCountdown(false);
  countdown = setInterval(() => {
    left -= 1;
    const fg = $("ringFg"), num = $("ringNum");
    if (!fg) return stopCountdown();
    fg.style.strokeDashoffset = String(C * (1 - left / ANSWER_SECONDS));
    num.textContent = left > 0 ? left : "⏰";
    if (left <= 3 && left > 0) sfx.tick();
    if (left <= 0) stopCountdown(false);
  }, 1000);
}

function stopCountdown(hide = true) {
  clearInterval(countdown);
  countdown = null;
  if (hide && overlay.className === "overlay") overlay.classList.add("hidden");
}

function showResult(res) {
  stopCountdown(false);
  clearTimeout(resultTimer);
  overlay.className = `overlay ${res.ok ? "ok" : "bad"}`;
  overlayBox.innerHTML = res.ok
    ? `<p class="eyebrow">Correcto</p><div class="who">✔ ${esc(res.name)}</div><p class="sub">+${res.pts} puntos</p>`
    : `<p class="eyebrow">Incorrecto</p><div class="who">✖ ${esc(res.name)}</div><p class="sub">¡El turno queda libre para los demás!</p>`;
  resultTimer = setTimeout(() => overlay.classList.add("hidden"), RESULT_OVERLAY_MS);
}

function burst(scale = 1) {
  window.confetti?.({ particleCount: Math.round(160 * scale), spread: 90, origin: { y: 0.6 },
    colors: ["#7c5cff", "#c4b5fd", "#f08bd6", "#4f6bff", "#ffffff"] });
}
function celebrate() {
  const end = Date.now() + 4000;
  (function frame() {
    window.confetti?.({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors: ["#7c5cff", "#c4b5fd", "#f08bd6", "#fbbf24"] });
    window.confetti?.({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors: ["#7c5cff", "#c4b5fd", "#f08bd6", "#fbbf24"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  setTimeout(() => burst(1.4), 900);
}

// ───────────── Render ─────────────
const L = "ABCD";
const optsHtml = (q, reveal = false) => q?.opts ? `<div class="opts">${q.opts.map((o, i) =>
  `<div class="opt glass ${reveal ? (i === q.ok ? "right" : "dim") : ""}"><span class="lt">${L[i]}</span><span>${esc(o)}</span></div>`).join("")}</div>` : "";

function render(st, players) {
  const rk = ranking(players);
  const online = rk.filter((p) => p.online !== false);
  $("hdrCount").textContent = online.length;

  const q = QUESTIONS[st.q];
  const full = st.phase === PHASE.LOBBY || st.phase === PHASE.FINAL;
  stage.classList.toggle("full", full);
  board.classList.toggle("hidden", full);
  board.innerHTML = `<h3>Marcador</h3>` + (rk.length
    ? rk.slice(0, 6).map((p, i) => `<div class="row ${i === 0 && p.score > 0 ? "lead" : ""}"><span class="pos">${i + 1}</span><span class="nm">${esc(p.name)}</span><span class="pt">${p.score}</span></div>`).join("")
    : `<p class="muted">Aún sin jugadores</p>`);

  if (st.phase === PHASE.LOBBY) return renderLobby(online);
  if (st.phase === PHASE.FINAL) return renderFinal(rk);
  qrDrawnFor = null;

  const lockedNames = Object.keys(st.locked || {}).map((id) => players[id]?.name).filter(Boolean);
  const meta = `<div class="qmeta"><span class="chip">Pregunta ${st.q + 1} de ${QUESTIONS.length}</span><span class="chip">${q?.pts ?? 100} pts</span></div>`;

  if (st.phase === PHASE.REVEAL) {
    const res = st.result;
    main.innerHTML = `${meta}
      <p class="qtext" style="font-size:clamp(1.4rem,2.6vw,2.6rem);opacity:.85">${esc(q?.q)}</p>
      ${optsHtml(q, true)}
      <div class="glass reveal-card">
        <p class="eyebrow">Respuesta</p>
        <p class="ans">${esc(q?.a)}</p>
        <p class="tip">${esc(q?.tip)}</p>
      </div>
      <p class="winner-line">${res?.ok ? `✔ <b>${esc(res.name)}</b> ganó ${res.pts} puntos` : `<span class="muted">Nadie acertó esta vez</span>`}</p>`;
    return;
  }

  main.innerHTML = `${meta}
    <p class="qtext"${q?.opts ? ' style="font-size:clamp(1.6rem,3vw,3rem)"' : ""}>${esc(q?.q)}</p>
    ${optsHtml(q)}
    <p class="press-cta"><span class="dot"></span> ${st.phase === PHASE.BUZZED ? `<b>${esc(st.buzz?.name)}</b>&nbsp;tiene la palabra` : st.result && !st.result.ok ? "¡Rebote! Turno libre: <b>&nbsp;presiona tu botón</b>" : "¡Presiona tu botón para responder!"}</p>
    ${lockedNames.length ? `<p class="locked-list muted">Fuera en esta pregunta: ${lockedNames.map(esc).join(", ")}</p>` : ""}`;
}

function renderLobby(online) {
  const url = playerUrl();
  if (qrDrawnFor !== url || !main.querySelector(".lobby-grid")) {
    main.innerHTML = `
      <div class="lobby-grid">
        <div class="glass qr-card">
          <p class="eyebrow">Escanea para jugar</p>
          <div class="qr" id="qr"></div>
          <a class="url" href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ""))}</a>
        </div>
        <div style="display:flex;flex-direction:column;gap:3vh;min-width:0">
          <div>
            <p class="eyebrow">Cierre · Concurso final</p>
            <h1 class="title">El rastro<br/>más <em>débil</em></h1>
          </div>
          <p class="count"><b id="cnt">0</b> jugadores conectados</p>
          <div class="names" id="names"></div>
        </div>
      </div>`;
    drawQR(url);
    qrDrawnFor = url;
  }
  $("cnt").textContent = online.length;
  const namesEl = $("names");
  const have = new Set([...namesEl.children].map((c) => c.dataset.id));
  const want = new Set(online.map((p) => p.id));
  [...namesEl.children].forEach((c) => !want.has(c.dataset.id) && c.remove());
  online.forEach((p) => {
    if (!have.has(p.id)) {
      const el = document.createElement("span");
      el.className = "chip"; el.dataset.id = p.id; el.textContent = p.name;
      namesEl.appendChild(el);
    }
  });
}

function drawQR(url, tries = 0) {
  const el = $("qr");
  if (!el) return;
  if (!window.qrcode) return tries < 40 && setTimeout(() => drawQR(url, tries + 1), 150);
  const qr = window.qrcode(0, "M");
  qr.addData(url);
  qr.make();
  el.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
}

function renderFinal(rk) {
  const [a, b, c] = rk;
  const step = (p, cls, n) => p ? `
    <div class="step ${cls}">
      ${n === 1 ? `<div class="crown">👑</div>` : ""}
      <div class="nm">${esc(p.name)}</div>
      <div class="pt">${p.score} pts</div>
      <div class="block">${n}</div>
    </div>` : `<div class="step ${cls}"></div>`;
  main.innerHTML = `
    <div class="congrats">
      <p class="eyebrow">Fin del concurso</p>
      <h1 class="title">¡Felicidades, <em>${esc(a?.name ?? "equipo")}</em>!</h1>
      <p class="muted hint" style="margin-top:1vh">Ya sabes cómo borrar tu rastro. Ahora, a aplicarlo.</p>
    </div>
    <div class="podium">${step(a, "p1", 1)}${step(b, "p2", 2)}${step(c, "p3", 3)}</div>`;
}
