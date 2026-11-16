/**
 * Animated hero chart for the public Home page (ported from the
 * "Stock Protocall Home" design): a candlestick chart that draws itself as
 * the hero story is scrolled, with a moving average, a "sharp move" callout,
 * a momentum gauge, an order-depth ladder, a parallax skyline and drifting
 * dust. All data is a seeded illustration; no real prices are shown.
 *
 * createHeroChart(canvas, { reduceMotion, onStep }) returns
 * { setTarget(p), destroy() }. p is the scroll progress 0..1 through the
 * story; onStep(i) fires when the eased progress crosses into step 0/1/2.
 * Without a 2D context (old browsers, jsdom) it still reports steps and
 * draws nothing.
 */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;

export const STEP_AT = [0, 0.5, 0.84]; // scroll positions that land on each step
export const stepFor = (p) => (p < 0.34 ? 0 : p < 0.67 ? 1 : 2);

const N = 64;
const SHOCK = 40;
const UP = '#56E11B';
const DOWN = '#EF4444';
const LAV = '#9F71E0';
const CREAM = '#FCF9ED';
const SKY = '#14032E';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Seeded walk with one sharp drop and a rebound, plus scenery. */
function buildScene() {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const data = [];
  let px = 0;
  for (let i = 0; i < N; i++) {
    const o = px;
    let c; let hi; let lo; let v;
    if (i === SHOCK) { c = o - 8.5; hi = o + 0.6; lo = c - 1.6; v = 3.3; }
    else if (i > SHOCK && i <= SHOCK + 4) { c = o + 2.6 + rnd() * 1.4; hi = c + rnd() * 1.1; lo = o - rnd(); v = 1.9 - (i - SHOCK) * 0.2; }
    else { c = o + (rnd() - 0.43) * 3.4 + 0.34; hi = Math.max(o, c) + rnd() * 1.6; lo = Math.min(o, c) - rnd() * 1.6; v = 0.5 + rnd() * 0.9 + Math.abs(c - o) * 0.12; }
    data.push({ o, c, h: hi, l: lo, v });
    px = c;
  }
  let yMin = Infinity; let yMax = -Infinity; let vMax = 0;
  data.forEach((d) => { yMin = Math.min(yMin, d.l); yMax = Math.max(yMax, d.h); vMax = Math.max(vMax, d.v); });
  const ma = data.map((d, i) => {
    let s = 0; let n = 0;
    for (let k = Math.max(0, i - 5); k <= i; k++) { s += data[k].c; n++; }
    return s / n;
  });
  const sil = [[], []];
  for (let sl = 0; sl < 2; sl++) for (let j = 0; j < 46; j++) sil[sl].push({ x: rnd(), h: 0.12 + rnd() * (sl ? 0.5 : 0.38), w: sl ? 16 : 10 });
  const dust = [];
  for (let j = 0; j < 38; j++) dust.push({ x: rnd(), y: rnd(), s: 0.6 + rnd() * 1.4, v: 0.008 + rnd() * 0.02, c: rnd() < 0.5 });
  const depthSeed = [];
  for (let k = 0; k < 16; k++) depthSeed.push(rnd() * 6.28);
  return { data, yMin, yMax, vMax, ma, sil, dust, depthSeed };
}

export function createHeroChart(canvas, { reduceMotion = false, onStep } = {}) {
  const scene = buildScene();
  const { data, yMin, yMax, vMax, ma, sil, dust, depthSeed } = scene;
  let ctx = null;
  try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
  const panel = canvas.parentElement;
  let cw = 0; let ch = 0;
  const mouse = { x: 0, y: 0, inside: false, nx: 0 };
  let gaugeM = 0.5;
  let target = 0; let cur = 0; let idx = -1;
  let inView = true; let lastKey = '';
  let raf = 0; let stopped = false;
  let last = performance.now(); const t0 = last;

  function size() {
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    cw = r.width; ch = r.height;
    const dpr = Math.min(window.innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastKey = '';
  }

  function draw(r, p, t, dt) {
    if (!ctx || cw <= 0 || ch <= 0) return;
    const narrow = cw < 520;
    const L = 14; const R = narrow ? 58 : 120; const T = 56; const B = 64;
    const pw = cw - L - R; const ph = ch - T - B;
    const step = pw / N; const bw = Math.max(2.4, step * 0.56);
    const y = (v) => T + ph - ((v - yMin) / (yMax - yMin)) * ph * 0.94 - ph * 0.03;
    const shift = mouse.nx * 8;
    ctx.clearRect(0, 0, cw, ch);

    // sky and glow
    ctx.fillStyle = SKY; ctx.fillRect(0, 0, cw, ch);
    const g = ctx.createRadialGradient(cw * 0.8, ch * 0.12, 0, cw * 0.8, ch * 0.12, Math.max(cw, ch) * 0.85);
    g.addColorStop(0, 'rgba(109,40,217,.6)'); g.addColorStop(0.5, 'rgba(68,4,153,.3)'); g.addColorStop(1, 'rgba(20,3,46,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    // diagonal light beams
    for (let b = 0; b < 3; b++) {
      const bx = cw * (0.15 + b * 0.32) + Math.sin(t * 0.18 + b * 2) * 26 - p * 60;
      const bg = ctx.createLinearGradient(bx, 0, bx + 120, 0);
      bg.addColorStop(0, 'rgba(159,113,224,0)'); bg.addColorStop(0.5, 'rgba(159,113,224,.10)'); bg.addColorStop(1, 'rgba(159,113,224,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 110, 0); ctx.lineTo(bx + 110 - ch * 0.8, ch); ctx.lineTo(bx - ch * 0.8, ch); ctx.closePath(); ctx.fill();
    }
    // far skyline, two parallax layers
    const base = T + ph + 6;
    for (let ly = 0; ly < 2; ly++) {
      const span = cw * 1.5; const off = -p * (ly ? 90 : 50) - shift * (ly ? 1.6 : 0.8) - t * (ly ? 3 : 1.5);
      ctx.fillStyle = ly ? 'rgba(159,113,224,.10)' : 'rgba(159,113,224,.06)'; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1;
      sil[ly].forEach((s) => {
        const sx = (((s.x * span + off) % span) + span) % span - 30; const sh = s.h * ph * 1.05;
        ctx.fillRect(sx - s.w / 2, base - sh, s.w, sh * 0.7); ctx.beginPath(); ctx.moveTo(sx, base - sh - 8); ctx.lineTo(sx, base); ctx.stroke();
      });
    }
    // grid
    ctx.strokeStyle = 'rgba(252,249,237,.07)'; ctx.lineWidth = 1;
    for (let gi = 0; gi <= 5; gi++) { const gy = Math.round(T + ph * gi / 5) + 0.5; ctx.beginPath(); ctx.moveTo(L, gy); ctx.lineTo(cw - (narrow ? 8 : 64), gy); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(252,249,237,.035)';
    for (let gv = 8; gv < N; gv += 8) { const gx = Math.round(L + gv * step) + 0.5; ctx.beginPath(); ctx.moveTo(gx, T); ctx.lineTo(gx, ch - 14); ctx.stroke(); }

    // chart group with a slow camera push
    ctx.save();
    const sc = 1 + 0.05 * p;
    ctx.translate(L + pw / 2, T + ph / 2); ctx.scale(sc, sc); ctx.translate(-(L + pw / 2) - p * 6 + shift * 0.3, -(T + ph / 2));
    let lastX = null; let lastY = null; let lastCol = UP; let shockX = null; let shockY = null;
    for (let j = 0; j < N && j < r; j++) {
      const d = data[j]; const fr = Math.min(1, r - j); const cx = L + (j + 0.5) * step;
      const curV = d.o + (d.c - d.o) * fr; const col = d.c >= d.o ? UP : DOWN;
      const vh = d.v / vMax * 40 * fr;
      ctx.globalAlpha = 0.4; ctx.fillStyle = col; ctx.fillRect(cx - bw / 2, ch - 16 - vh, bw, vh); ctx.globalAlpha = 1;
      const top = Math.max(d.o, curV); const bot = Math.min(d.o, curV);
      const wt = top + (d.h - Math.max(d.o, d.c)) * fr; const wb = bot - (Math.min(d.o, d.c) - d.l) * fr;
      ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, y(wt)); ctx.lineTo(cx, y(wb)); ctx.stroke();
      const by = y(top); const bh = Math.max(2, y(bot) - y(top));
      ctx.fillStyle = col; ctx.fillRect(cx - bw / 2, by, bw, bh);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16; ctx.fillRect(cx - bw / 2 - 3, by - 3, bw + 6, bh + 6); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      lastX = cx; lastY = y(curV); lastCol = col;
      if (j === SHOCK) { shockX = cx; shockY = (y(d.o) + y(d.c)) / 2; }
    }
    // moving average
    ctx.beginPath(); let started = false;
    for (let m = 0; m < N && m < r; m++) {
      const f = Math.min(1, r - m); const mx = L + (m + 0.5) * step;
      const mv = m === 0 ? ma[0] : ma[m - 1] + (ma[m] - ma[m - 1]) * f;
      if (!started) { ctx.moveTo(mx, y(mv)); started = true; } else ctx.lineTo(mx, y(mv));
    }
    ctx.shadowColor = LAV; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(159,113,224,.9)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.shadowBlur = 0;
    // crosshair: follows the pointer, otherwise sweeps on its own
    const n = Math.floor(r);
    if (n > 8) {
      let ci = mouse.inside ? Math.round((mouse.x - L) / step - 0.5) : Math.floor((n - 1) * (0.5 + 0.5 * Math.sin(t * 0.45)));
      ci = Math.max(0, Math.min(n - 1, ci));
      const cd = data[ci]; const ccx = L + (ci + 0.5) * step; const ccy = y(cd.c);
      ctx.setLineDash([3, 5]); ctx.strokeStyle = mouse.inside ? 'rgba(252,249,237,.55)' : 'rgba(252,249,237,.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ccx, T); ctx.lineTo(ccx, ch - 14); ctx.moveTo(L, ccy); ctx.lineTo(L + pw, ccy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(ccx, ccy, 3, 0, 6.283); ctx.fill();
    }
    // callout on the sharp drop
    if (shockX !== null && r > SHOCK + 1.5) {
      const pr = 15 + 3 * Math.sin(t * 2.2); const al = clamp((r - SHOCK - 1.5) / 2);
      ctx.globalAlpha = al; ctx.strokeStyle = CREAM; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(shockX, shockY, pr, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = 'rgba(252,249,237,.18)'; ctx.beginPath(); ctx.arc(shockX, shockY, pr + 9 + 4 * Math.sin(t * 2.2 + 1), 0, 6.283); ctx.stroke();
      ctx.fillStyle = CREAM; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('SHARP MOVE', shockX - pr - 8, shockY); ctx.globalAlpha = 1;
    }
    // last price line and tag
    if (lastY !== null) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = lastCol === UP ? 'rgba(86,225,27,.7)' : 'rgba(239,68,68,.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(cw - R + 8, lastY); ctx.stroke(); ctx.setLineDash([]);
      const tw = narrow ? 46 : 52; const th = 20;
      ctx.fillStyle = lastCol; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cw - R + 8, lastY - th / 2, tw, th, 5); else ctx.rect(cw - R + 8, lastY - th / 2, tw, th);
      ctx.fill();
      ctx.fillStyle = SKY; ctx.font = `600 9.5px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SAMPLE', cw - R + 8 + tw / 2, lastY + 0.5);
    }
    ctx.restore();

    // depth ladder (bids green, asks red); shapes only, no figures
    if (!narrow && lastY !== null) {
      for (let k = 1; k <= 8; k++) {
        const wA = 8 + (0.5 + 0.5 * Math.sin(t * 0.9 + depthSeed[k])) * (12 + k * 3.2);
        const wB = 8 + (0.5 + 0.5 * Math.sin(t * 0.8 + depthSeed[k + 8])) * (12 + k * 3.2);
        ctx.fillStyle = 'rgba(239,68,68,.55)'; ctx.fillRect(cw - 8 - wA, lastY - k * 9 - 12, wA, 6);
        ctx.fillStyle = 'rgba(86,225,27,.55)'; ctx.fillRect(cw - 8 - wB, lastY + k * 9 + 6, wB, 6);
      }
    }

    // momentum gauge from the last visible candles
    const gr = narrow ? 32 : 44; const gx0 = L + gr + 12; const gy0 = T + gr + 12;
    let acc = 0;
    for (let q = Math.max(0, n - 8); q < n; q++) acc += (data[q].c - data[q].o) / 2.4;
    const tgt = clamp(0.5 + acc * 0.06, 0.04, 0.96);
    gaugeM += (tgt - gaugeM) * Math.min(1, dt * 4 + 0.02);
    for (let sg = 0; sg < 28; sg++) {
      const a0 = Math.PI + Math.PI * sg / 28; const a1 = Math.PI + Math.PI * (sg + 1) / 28 + 0.01; const u = sg / 27;
      const mixc = u < 0.5 ? u / 0.5 : (u - 0.5) / 0.5;
      const col2 = u < 0.5
        ? `rgba(${Math.round(lerp(239, 252, mixc))},${Math.round(lerp(68, 249, mixc))},${Math.round(lerp(68, 237, mixc))},.9)`
        : `rgba(${Math.round(lerp(252, 86, mixc))},${Math.round(lerp(249, 225, mixc))},${Math.round(lerp(237, 27, mixc))},.9)`;
      ctx.strokeStyle = col2; ctx.lineWidth = narrow ? 5 : 6; ctx.beginPath(); ctx.arc(gx0, gy0, gr, a0, a1); ctx.stroke();
    }
    const na = Math.PI + Math.PI * gaugeM;
    ctx.strokeStyle = CREAM; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0 + Math.cos(na) * (gr - 10), gy0 + Math.sin(na) * (gr - 10)); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(gx0, gy0, 4, 0, 6.283); ctx.fill();
    ctx.font = `500 9px ${MONO}`; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = DOWN; ctx.fillText('BEAR', gx0 - gr, gy0 + 8); ctx.fillStyle = UP; ctx.fillText('BULL', gx0 + gr, gy0 + 8);

    // dust
    dust.forEach((d) => {
      d.y -= d.v * dt; if (d.y < -0.02) d.y = 1.02;
      const dx = ((d.x * cw - p * 30 * d.s - shift * d.s) % cw + cw) % cw;
      ctx.globalAlpha = 0.35; ctx.fillStyle = d.c ? CREAM : LAV; ctx.beginPath(); ctx.arc(dx, d.y * ch, d.s, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function setStep(i) {
    if (i === idx) return;
    idx = i;
    if (onStep) onStep(i);
  }

  function loop(now) {
    if (stopped) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cur = reduceMotion ? target : cur + (target - cur) * (1 - Math.exp(-dt * 8));
    if (Math.abs(target - cur) < 0.0004) cur = target;
    setStep(stepFor(cur));
    if (inView && ctx) {
      const rv = lerp(26, N, clamp(cur / 0.88)); const tt = reduceMotion ? 0 : (now - t0) / 1000;
      // Reduced motion: redraw only when something actually changed.
      const key = reduceMotion ? `${rv.toFixed(2)}|${cw}|${ch}|${mouse.inside}|${Math.round(mouse.x / 6)}` : '';
      if (!reduceMotion || key !== lastKey) { draw(rv, cur, tt, dt); lastKey = key; }
    }
    raf = requestAnimationFrame(loop);
  }

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.nx = (mouse.x / Math.max(1, r.width)) * 2 - 1; mouse.inside = true;
  };
  const onLeave = () => { mouse.inside = false; mouse.nx = 0; };
  panel?.addEventListener('pointermove', onMove);
  panel?.addEventListener('pointerleave', onLeave);

  let ro = null;
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(size); ro.observe(canvas); }
  else window.addEventListener('resize', size);
  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { rootMargin: '120px' });
    io.observe(canvas);
  }

  size();
  raf = requestAnimationFrame(loop);

  return {
    setTarget(p, { jump = false } = {}) {
      target = clamp(p);
      if (jump) cur = target;
    },
    destroy() {
      stopped = true;
      cancelAnimationFrame(raf);
      panel?.removeEventListener('pointermove', onMove);
      panel?.removeEventListener('pointerleave', onLeave);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', size);
      if (io) io.disconnect();
    },
  };
}
