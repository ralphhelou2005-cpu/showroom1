/* The one interactive moment: hold to build. Ported line for line from the original page script.
   Hold the dial for 11 seconds and the car comes together (a scrub film over five stills); let go and it eases back.
   Finished, the colour picker paints it. Works with mouse, touch and keyboard (space or enter). */
const BASE = '/';   /* the videos are served from public/assets */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const STAGES = ['Carbon frame', 'Engine', 'Wheels and brakes', 'Bodywork', 'Paint'];
const HOLD_SECONDS = 11, BACK_SECONDS = 5;

export function startBuild(section: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(s: string) => section.querySelector(s) as T;
  const $$ = <T extends Element = HTMLElement>(s: string) => [...section.querySelectorAll(s)] as T[];
  const SMALL = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const bay = $('#bay'), bvid = $<HTMLVideoElement>('#buildVid'), hold = $<HTMLButtonElement>('#hold'), holdState = $('#holdState'), controls = $('#controls');
  const stills = $$('.still'), paints = $$('.paint'), partEls = $$('#parts li'), swatches = $$('.swatch');
  let bp = 0, holding = false, bRaf: number | null = null, bLast = 0, built = false, lastStage = -1, bBusy = false, bPending: number | null = null, lastFill = -1;
  let alive = true, blobUrl = '';
  const ctl = new AbortController();
  const off: (() => void)[] = [];
  const on = <E extends Event>(el: EventTarget, t: string, f: (e: E) => void, o?: AddEventListenerOptions) => { el.addEventListener(t, f as EventListener, o); off.push(() => el.removeEventListener(t, f as EventListener)); };

  function bSeek(t: number) {
    if (!bvid.duration) return;
    if (bBusy) { bPending = t; return; }
    bBusy = true; bvid.currentTime = t;
  }
  on(bvid, 'seeked', () => { bBusy = false; if (bPending !== null) { const t = bPending; bPending = null; bSeek(t); } });
  on(bvid, 'error', () => { bBusy = false; bPending = null; bay.classList.remove('video-ready'); });

  let buildLoaded = false;
  async function loadBuild() {
    if (buildLoaded) return; buildLoaded = true;
    if (rm.matches) return;
    try {
      const res = await fetch(BASE + (SMALL ? 'assets/build-scrub-m.mp4' : 'assets/build-scrub.mp4'), { priority: 'low', signal: ctl.signal } as RequestInit);
      if (!res.ok) throw 0;
      const blob = await res.blob();
      if (!alive) return;
      bvid.src = blobUrl = URL.createObjectURL(blob);
      bvid.load();
      bvid.addEventListener('canplay', () => { bSeek(bp * bvid.duration); bay.classList.add('video-ready'); }, { once: true });
    } catch { /* stills carry the build */ }
  }
  /* phones fetch the build film only when it is close, so nothing heavy loads while the walk-in ends */
  const near = new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { loadBuild(); o.disconnect(); } }, { rootMargin: SMALL ? '40% 0px' : '120% 0px' });
  near.observe(bay);

  function renderBuild() {
    const s = Math.min(4, Math.floor(bp * 5));
    if (s !== lastStage) {
      lastStage = s;
      partEls.forEach((el, i) => el.classList.toggle('on', i <= s));
      holdState.textContent = `Stage ${s + 1} of 5: ${STAGES[s]}`;
    }
    let best = 0; stills.forEach((el, i) => { if (bp + .001 >= +el.dataset.at!) best = i; });
    stills.forEach((el, i) => el.classList.toggle('on', i === best));
    const fill = Math.round(bp * 200) / 200;
    if (fill !== lastFill) { lastFill = fill; hold.style.setProperty('--p', String(fill)); }
    bSeek(bp * (bvid.duration || 0));
  }
  function buildLoop(now: number) {
    const dt = Math.min(100, now - (bLast || now)) / 1000; bLast = now;
    bp = clamp(bp + (holding ? dt / HOLD_SECONDS : -dt / BACK_SECONDS), 0, 1);
    renderBuild();
    if (bp >= 1) { finish(); bRaf = null; bLast = 0; return; }
    if (holding || bp > 0) bRaf = requestAnimationFrame(buildLoop);
    else { bRaf = null; bLast = 0; }
  }
  function kick() { if (bRaf === null && !built) bRaf = requestAnimationFrame(buildLoop); }
  function finish() {
    built = true; holding = false;
    controls.classList.add('built'); bay.classList.add('built');
    setColor('red');
    holdState.textContent = 'Finished. Pick a color.';
  }
  function setColor(c: string) {
    paints.forEach(p => p.classList.toggle('on', p.dataset.color === c));
    swatches.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === c)));
  }
  function pressOn(e: Event) { if (built) return; if (e.cancelable && e.type !== 'keydown') e.preventDefault(); holding = true; loadBuild(); kick(); }
  function pressOff() { holding = false; kick(); }
  on<PointerEvent>(hold, 'pointerdown', e => { if (hold.setPointerCapture) hold.setPointerCapture(e.pointerId); pressOn(e); });
  on(hold, 'pointerup', pressOff);
  on(hold, 'pointercancel', pressOff);
  on(hold, 'lostpointercapture', pressOff);
  on(hold, 'contextmenu', e => e.preventDefault());
  on<KeyboardEvent>(hold, 'keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); pressOn(e); } });
  on<KeyboardEvent>(hold, 'keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressOff(); } });
  on(hold, 'blur', pressOff);
  swatches.forEach(b => on(b, 'click', () => setColor(b.dataset.pick!)));
  function reset() {
    built = false; bp = 0; lastStage = -1; lastFill = -1;
    controls.classList.remove('built'); bay.classList.remove('built');
    paints.forEach(p => p.classList.remove('on'));
    renderBuild();
  }
  on($('#again'), 'click', () => { reset(); hold.focus(); });

  /* ---------- reduced motion, live in both directions ---------- */
  function pinToFinal() {
    holding = false; if (bRaf !== null) { cancelAnimationFrame(bRaf); bRaf = null; }
    bp = 1; lastStage = -1; renderBuild(); finish();
  }
  on<MediaQueryListEvent>(rm, 'change', e => { if (e.matches) pinToFinal(); else { reset(); loadBuild(); } });
  if (rm.matches) pinToFinal();

  return () => {
    alive = false;
    ctl.abort();
    if (bRaf !== null) cancelAnimationFrame(bRaf);
    near.disconnect();
    off.forEach(f => f());
    bvid.pause();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  };
}
