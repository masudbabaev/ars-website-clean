/* Animated sucker-rod pump for the Pump–Well–Reservoir Simulator project page.
   Figures come from the simulator's results for well 1220, Bibiheybat field (2024). */
(function () {
  const root = document.querySelector(".rodpump");
  if (!root) return;
  const $ = (selector) => root.querySelector(selector);
  const svg = $("[data-rp-svg]");
  const el = {
    beam: $("[data-rp-beam]"), crank: $("[data-rp-crank]"), pitman: $("[data-rp-pitman]"),
    bridle: $("[data-rp-bridle]"), rod: $("[data-rp-rod]"), tv: $("[data-rp-tv]"), sv: $("[data-rp-sv]"),
    chamber: $("[data-rp-chamber]"), liquid: $("[data-rp-liquid]"), above: $("[data-rp-above]"),
    annulus: $("[data-rp-annulus]"), levelLabel: $("[data-rp-level-label]"), flow: $("[data-rp-flow]"),
    inflow: $("[data-rp-inflow]"), phase: $("[data-rp-phase]"), phaseText: $("[data-rp-phase-text]"),
    fill: $("[data-rp-fill]"), prod: $("[data-rp-prod]"), run: $("[data-rp-run]"), insight: $("[data-rp-insight]"),
    timeline: $("[data-rp-timeline]"), marker: $("[data-rp-marker]"), speedRow: $("[data-rp-speed-row]"),
    play: $("[data-rp-play]"), playLabel: $("[data-rp-play-label]")
  };

  // Simulated results for well 1220 (stroke length 1.5 m, 32 mm pump).
  const SPEEDS = { 3: { fill: 9.32, prod: 0.4787 }, 3.5: { fill: 8.02, prod: 0.4798 }, 4: { fill: 7.01, prod: 0.4810 }, 5: { fill: 5.59, prod: 0.4817 } };
  const INTERMITTENT = { fillStart: 23.5, fillEnd: 20.6, prod: 0.469, run: 30, strokes: 4, idleSeconds: 4.5 };
  const TIME_SCALE = 10; // animation runs ~10x faster than the real well

  const TEXT = {
    az: {
      up: ["Yuxarı gediş", "Plunjer qalxır. Üst klapan bağlıdır və plunjerin üstündəki maye boru ilə yuxarı qaldırılır. Alt klapan açılır, silindr quyudan gələn maye ilə dolur."],
      down: ["Aşağı gediş", "Plunjer enir və alt klapan bağlanır. Silindr az dolubsa, plunjer əvvəlcə qazın içindən keçir; üst klapan yalnız mayeyə çatanda açılır və maye plunjerin üstünə keçir."],
      idle: ["Dayanma", "Nasos dayanıb, lakin lay mayeni verməyə davam edir. Həlqəvi fəzada səviyyə qalxır və növbəti gedişlərdə silindr daha yaxşı dolur."],
      continuous: "Yırğalanma sayını 3-dən 5-ə qədər dəyişmək hasilatı 1%-dən az dəyişir, nasos isə zəif dolmuş qalır. Yalnız sürəti dəyişməklə rejimi yaxşılaşdırmaq olmur.",
      intermittent: "Nasos günün təxminən 30%-ində işləyir, hasilat isə fasiləsiz rejimin ~97%-i qədər qalır və silindr təxminən 3 dəfə yaxşı dolur. Demək olar ki, eyni neft daha az enerji və aşınma ilə alınır.",
      unit: "m³/gün", pause: "Dayandır", play: "Davam et"
    },
    en: {
      up: ["Upstroke", "The plunger rises. The travelling valve is closed, so the fluid above the plunger is lifted up the tubing. The standing valve opens and the barrel fills from the well."],
      down: ["Downstroke", "The plunger descends and the standing valve closes. In a poorly filled barrel the plunger first falls through gas; the travelling valve opens only when it reaches liquid, letting the fluid pass above the plunger."],
      idle: ["Idle", "The pump is stopped, but the reservoir keeps flowing. The level in the annulus rises, so the next strokes fill the barrel better."],
      continuous: "Changing the stroke speed between 3 and 5 per minute moves production by less than 1%, and the pump stays poorly filled. Speed alone cannot fix the regime.",
      intermittent: "The pump runs about 30% of the day, yet production stays at about 97% of continuous pumping and the barrel fills about three times better. Nearly the same oil, with far less energy and wear.",
      unit: "m³/day", pause: "Pause", play: "Play"
    }
  };
  const lang = () => (document.documentElement.lang === "en" ? "en" : "az");

  // Geometry (SVG units)
  const PIVOT = { x: 220, y: 86 }, HEAD = 100, TAIL = 85, CRANK = { x: 305, y: 192 }, CRANK_R = 24;
  const SEAT = 664, PLUNGER_BOTTOM = 618, LEVEL_LOW = 515, LEVEL_HIGH = 452;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    mode: "continuous", speed: 4, theta: -Math.PI / 2, playing: !reduced, visible: true,
    phase: "up", wasUp: false, strokeIndex: 0, idleLeft: 0, liquid: 18, startChamber: 18, startLiquid: 18,
    strokeFill: SPEEDS[4].fill, level: LEVEL_LOW, flowOffset: 0, inflowOffset: 0, tvLift: 0, svLift: 0, last: 0
  };

  const fmt = (n, d) => n.toFixed(d);

  function fillForStroke() {
    if (state.mode === "continuous") return SPEEDS[state.speed].fill;
    const k = Math.min(state.strokeIndex, INTERMITTENT.strokes - 1) / (INTERMITTENT.strokes - 1);
    return INTERMITTENT.fillStart + (INTERMITTENT.fillEnd - INTERMITTENT.fillStart) * k;
  }

  function step(dt) {
    const prevDy = rodDy(state.theta);
    if (state.mode === "intermittent" && state.phase === "idle") {
      state.idleLeft -= dt;
      const q = 1 - Math.max(state.idleLeft, 0) / INTERMITTENT.idleSeconds;
      state.level = LEVEL_LOW - (LEVEL_LOW - LEVEL_HIGH) * (1 - Math.pow(1 - q, 2));
      if (state.idleLeft <= 0) { state.phase = "up"; state.strokeIndex = 0; state.wasUp = false; }
    } else {
      state.theta += 2 * Math.PI * (state.speed / 60) * TIME_SCALE * dt;
      const up = Math.cos(state.theta) > 0;
      if (up && !state.wasUp) { // bottom dead centre: new stroke starts
        if (state.mode === "intermittent" && state.strokeIndex >= INTERMITTENT.strokes) {
          state.phase = "idle"; state.idleLeft = INTERMITTENT.idleSeconds;
          state.theta = -Math.PI / 2; state.wasUp = false; render(); return;
        }
        state.strokeFill = fillForStroke();
        state.startChamber = chamber(); state.startLiquid = state.liquid;
      }
      if (!up && state.wasUp) state.strokeIndex += 1;
      state.wasUp = up; state.phase = up ? "up" : "down";
      if (state.mode === "intermittent") {
        const p = Math.min(Math.max(state.strokeIndex + (up ? 0 : -0.5), 0) / INTERMITTENT.strokes, 1);
        state.level = LEVEL_HIGH + (LEVEL_LOW - LEVEL_HIGH) * p;
      } else {
        state.level += (LEVEL_LOW - state.level) * Math.min(dt * 2, 1);
      }
    }
    const dy = rodDy(state.theta);
    // Fluid above the plunger moves up only while the plunger rises.
    if (dy < prevDy) state.flowOffset -= (prevDy - dy);
    state.inflowOffset -= dt * 18;
    updateBarrel();
    render();
  }

  const rodDy = (theta) => -HEAD * Math.asin(CRANK_R * Math.sin(theta) / TAIL); // arc length off the horsehead
  const chamber = () => SEAT - (PLUNGER_BOTTOM + rodDy(state.theta));

  function updateBarrel() {
    const c = chamber();
    if (state.phase === "up") {
      state.liquid = Math.min(c, state.startLiquid + (state.strokeFill / 100) * Math.max(c - state.startChamber, 0));
    } else if (state.phase === "down") {
      if (c <= state.liquid + 0.3) state.liquid = c;
    }
  }

  function render() {
    const s = CRANK_R * Math.sin(state.theta) / TAIL;
    const phi = Math.asin(s);
    const dy = rodDy(state.theta);
    el.beam.setAttribute("transform", `rotate(${(phi * 180 / Math.PI).toFixed(3)} ${PIVOT.x} ${PIVOT.y})`);
    el.crank.setAttribute("transform", `rotate(${(state.theta * 180 / Math.PI).toFixed(3)} ${CRANK.x} ${CRANK.y})`);
    const end = { x: PIVOT.x + TAIL * Math.cos(phi), y: PIVOT.y + TAIL * s };
    const pin = { x: CRANK.x + CRANK_R * Math.cos(state.theta), y: CRANK.y + CRANK_R * Math.sin(state.theta) };
    el.pitman.setAttribute("d", `M${end.x.toFixed(2)} ${end.y.toFixed(2)}L${pin.x.toFixed(2)} ${pin.y.toFixed(2)}`);
    el.bridle.setAttribute("d", `M120 ${PIVOT.y}V${(118 + dy).toFixed(2)}`);
    el.rod.setAttribute("transform", `translate(0 ${dy.toFixed(2)})`);

    const bottom = PLUNGER_BOTTOM + dy;
    el.chamber.setAttribute("y", bottom.toFixed(2));
    el.chamber.setAttribute("height", Math.max(SEAT - bottom, 0).toFixed(2));
    el.liquid.setAttribute("y", (SEAT - state.liquid).toFixed(2));
    el.liquid.setAttribute("height", state.liquid.toFixed(2));
    el.above.setAttribute("height", Math.max(bottom - 24 - 556, 0).toFixed(2));

    const tvOpen = state.phase === "down" && chamber() <= state.liquid + 0.3;
    const svOpen = state.phase === "up" && state.strokeFill > 0;
    state.tvLift += ((tvOpen ? 1 : 0) - state.tvLift) * 0.35;
    state.svLift += ((svOpen ? 1 : 0) - state.svLift) * 0.35;
    el.tv.setAttribute("cy", (bottom - 6 - 6 * state.tvLift).toFixed(2));
    el.sv.setAttribute("cy", (SEAT - 6 - 7 * state.svLift).toFixed(2));

    el.annulus.setAttribute("y", state.level.toFixed(2));
    el.annulus.setAttribute("height", (746 - state.level).toFixed(2));
    el.levelLabel.setAttribute("transform", `translate(0 ${(state.level - LEVEL_LOW).toFixed(2)})`);
    el.flow.style.strokeDashoffset = state.flowOffset.toFixed(2);
    el.inflow.style.strokeDashoffset = state.inflowOffset.toFixed(2);
    el.inflow.style.opacity = state.mode === "intermittent" && state.phase === "idle" ? "1" : ".75";

    if (state.mode === "intermittent") {
      const pos = state.phase === "idle"
        ? 30 + 70 * (1 - Math.max(state.idleLeft, 0) / INTERMITTENT.idleSeconds)
        : 30 * Math.min((state.strokeIndex + ((state.theta + Math.PI / 2) % (2 * Math.PI)) / (2 * Math.PI)) / INTERMITTENT.strokes, 1);
      el.marker.style.left = `${pos.toFixed(2)}%`;
    }
    renderText();
  }

  let lastPhase = "", lastFill = "";
  function renderText() {
    const t = TEXT[lang()];
    if (lastPhase !== state.phase + lang()) {
      lastPhase = state.phase + lang();
      el.phase.textContent = t[state.phase][0];
      el.phaseText.textContent = t[state.phase][1];
    }
    const fill = `${fmt(state.mode === "continuous" ? SPEEDS[state.speed].fill : state.strokeFill, 1)}%`;
    if (fill !== lastFill) { lastFill = fill; el.fill.textContent = fill; }
  }

  function renderStatic() {
    const t = TEXT[lang()];
    const prod = state.mode === "continuous" ? SPEEDS[state.speed].prod : INTERMITTENT.prod;
    el.prod.textContent = `${fmt(prod, 3)} ${t.unit}`;
    el.run.textContent = state.mode === "continuous" ? "100%" : `~${INTERMITTENT.run}%`;
    el.insight.textContent = t[state.mode];
    el.playLabel.textContent = state.playing ? t.pause : t.play;
    el.play.setAttribute("aria-pressed", String(!state.playing));
    el.speedRow.hidden = state.mode !== "continuous";
    el.timeline.hidden = state.mode !== "intermittent";
    lastPhase = ""; lastFill = "";
    renderText();
  }

  function reset() {
    state.theta = reduced && !state.playing ? 0.4 : -Math.PI / 2;
    state.phase = "up"; state.wasUp = false; state.strokeIndex = 0; state.liquid = 18;
    state.startLiquid = 18; state.startChamber = 18; state.strokeFill = fillForStroke();
    if (state.mode === "intermittent") state.level = LEVEL_HIGH;
    updateBarrel(); render(); renderStatic();
  }

  root.querySelectorAll("[data-rp-mode]").forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.rpMode;
    root.querySelectorAll("[data-rp-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    reset();
  }));
  root.querySelectorAll("[data-rp-speed]").forEach((button) => button.addEventListener("click", () => {
    state.speed = Number(button.dataset.rpSpeed);
    root.querySelectorAll("[data-rp-speed]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    state.strokeFill = fillForStroke(); renderStatic();
  }));
  el.play.addEventListener("click", () => { state.playing = !state.playing; state.last = 0; renderStatic(); if (state.playing) loop(); });
  document.addEventListener("ars:language", renderStatic);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting; state.last = 0;
      if (state.visible && state.playing) loop();
    }).observe(svg);
  }

  let frame = 0;
  function loop() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function tick(now) {
      if (!state.playing || !state.visible) return;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0;
      state.last = now;
      step(dt);
      frame = requestAnimationFrame(tick);
    });
  }

  reset();
  if (state.playing) loop();
})();
