/* The home page's moving parts: the walk-in film, the captions, the nav, the tail-light streak and the reveals.
   Ported line for line from the original page script. Everything runs on the elements themselves through
   requestAnimationFrame and IntersectionObserver: nothing here re-renders React while the page scrolls.
   startHome() returns a function that stops it all when the visitor leaves the page. */
const BASE = '/';   /* the videos are served from public/assets */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (p: number, a: number, b: number) => { const t = clamp((p - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

type Film = HTMLVideoElement & { _fps: number; _n: number };
interface Band { el: HTMLElement; a: number; b: number; first: boolean; last: boolean; op: number; k: number }

export function startHome(root: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector(s) as T;
  const $$ = <T extends Element = HTMLElement>(s: string) => [...root.querySelectorAll(s)] as T[];
  let alive = true;
  const stops: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => { addEventListener(t, f, o); stops.push(() => removeEventListener(t, f)); };
  const urls: string[] = [];
  const blobUrl = (b: Blob | MediaSource) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  const ctl = new AbortController();
  const rm = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- the hero scrub ---------- */
  const SMALL = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  /* the walk-in: a cinematic film made with fal (one continuous glide from the street, through the glass, to the red car).
     The scroll picks the frame and the device's video hardware draws it. A light copy streams in first so the walk starts at once;
     the full-quality film follows and takes over at the same frame. */
  const TALL = innerHeight > innerWidth, PHONE = TALL && innerWidth / innerHeight < .7;
  const FILMS: Record<'fast' | 'hd', [string, number, number]> = PHONE
    ? { fast: [BASE + 'assets/walk/fast-phone.mp4', 15, 120], hd: [BASE + 'assets/walk/hd-phone.mp4', 30, 240] }
    : { fast: [BASE + 'assets/walk/fast.mp4', 15, 120], hd: [BASE + 'assets/walk/hd.mp4', 30, 240] };
  const FAST_MIME = 'video/mp4; codecs="avc1.64001f"';
  const stage = $('#stage'), hero = $('.hero'), ring = $<SVGElement>('#ring'), cue = $('#cue'), posterLayer = $('#poster');
  const sweep = $('#sweep'), lbs = $$('.lb');
  let film = $('#frames') as Film;
  const bands: Band[] = $$('.band').map((el, i, all) => ({ el, a: +el.dataset.a!, b: +el.dataset.b!, first: i === 0, last: i === all.length - 1, op: -1, k: -1 }));
  let target = 0, shown = 0, rafId: number | null = null, lastTick = 0, heroOnScreen = true, scrubOn = false, heroInit = false;
  let lastCue: boolean | null = null, lastSign: boolean | null = null;
  const nav = document.getElementById('nav')!, panel = $('#below');

  /* page positions are measured once and kept: reading them on every scroll step forces the browser to redo layout */
  const M = { range: 1, panelTop: 1e9, stageH: innerHeight, tall: TALL };
  function measure() {
    M.panelTop = panel.offsetTop;
    M.stageH = stage.offsetHeight || innerHeight;
    M.range = M.panelTop - hero.offsetTop - M.stageH;   /* the walk-in ends exactly when the website panel reaches the bottom of the screen */
    M.tall = innerHeight > innerWidth;
  }
  const heroProgress = () => (M.range > 0 ? clamp(scrollY / M.range, 0, 1) : 0);

  /* ---------- the walk-in film ----------
     Made for scrubbing: no reordered frames and a full picture every few frames, so any moment is a few milliseconds away.
     Until the whole film has arrived, the walk (picture and words together) goes only as far as the film has. */
  let filmReady = false, seeking = false, wantF = -1, atF = -1, pendF = -1, reach = 0, maxF = 0, lastFx = '';
  film.muted = true; film.playsInline = true; film._fps = FILMS.fast[1]; film._n = FILMS.fast[2];
  function showFrame(p: number) {
    if (!filmReady) return;
    wantF = Math.min(maxF, Math.round(clamp(p, 0, 1) * (film._n - 1)));
    /* one jump at a time, always to the latest spot */
    if (!seeking && wantF !== atF) { seeking = true; pendF = wantF; film.currentTime = (wantF + .5) / film._fps; }
  }
  function onSeeked(e: Event) {
    if (e.target !== film) return;
    seeking = false; atF = pendF;
    if (!stage.classList.contains('video-ready')) { stage.classList.add('video-ready'); setTimeout(() => { posterLayer.style.visibility = 'hidden'; }, 700); }
    if (wantF !== atF) showFrame(Math.min(shown, reach));
  }
  film.addEventListener('seeked', onSeeked);
  function setReach(f: number, n: number) {
    const r = f >= n - 1 ? 1 : Math.max(0, f) / (n - 1);
    if (r !== reach || f !== maxF) { maxF = Math.max(0, f); reach = r; if (scrubOn) onScroll(); }
  }
  /* the finishing touches: cinematic bars that open as the walk begins, and a sweep of gold light over the sign and the glass */
  function drawFx(p: number) {
    const lb = clamp(p / .07, 0, 1), e = lb * lb * (3 - 2 * lb);
    const sw = p < .35 ? clamp((p - .04) / .2, 0, 1) : clamp((p - .5) / .2, 0, 1);
    const bell = (c: number, w: number) => { const x = (p - c) / w; return x * x < 1 ? (1 - x * x) * (1 - x * x) : 0; };
    const sO = Math.max(bell(.14, .11) * .7, bell(.6, .11) * .85);
    const fx = e.toFixed(3) + '|' + sw.toFixed(3) + '|' + sO.toFixed(3);
    if (fx === lastFx) return; lastFx = fx;
    lbs[0].style.transform = 'translate3d(0,' + (-e * 101).toFixed(2) + '%,0)';
    lbs[1].style.transform = 'translate3d(0,' + (e * 101).toFixed(2) + '%,0)';
    sweep.style.opacity = String(sO); sweep.style.transform = 'translate3d(' + (-70 + sw * 140).toFixed(1) + '%,0,0)';
  }
  function filmShown() {
    if (!alive) return;
    ring.style.opacity = '0';
    /* some phones only paint a paused video after it has played once */
    const go = () => { if (!alive) return; film.pause(); filmReady = true; atF = -1; showFrame(Math.min(shown, reach)); };
    const pl = film.play();
    if (pl && pl.then) pl.then(go, go); else go();
  }
  /* a whole file, with the loading ring following it */
  function getBlob(url: string, ringOn?: boolean): Promise<Blob> {
    return fetch(url, { signal: ctl.signal }).then(r => {
      if (!r.ok) throw 0;
      const total = +(r.headers.get('content-length') || 0);
      if (!r.body || !total) return r.blob();
      const rd = r.body.getReader(), parts: BlobPart[] = []; let got = 0;
      const read = (): Promise<Blob> => rd.read().then(({ done, value }) => {
        if (done) return new Blob(parts, { type: 'video/mp4' });
        parts.push(value); got += value.length;
        if (ringOn) ring.style.setProperty('--ld', String(Math.round(126 * (1 - got / total))));
        return read();
      });
      return read();
    });
  }
  /* computers: the light copy is fed to the player in pieces as it arrives, so the walk starts within a second */
  function streamFast(): Promise<void> {
    return new Promise((ok, no) => {
      const ms = new MediaSource(); let sb: SourceBuffer | null = null, queue: Uint8Array[] = [], ended = false, failed = false, total = 0, got = 0;
      const fail = () => { if (failed) return; failed = true; no(); };
      const grow = () => {
        if (!sb || !sb.buffered.length) return;
        const n = FILMS.fast[2], f = ended && !queue.length ? n - 1 : Math.min(n - 1, Math.floor(sb.buffered.end(sb.buffered.length - 1) * FILMS.fast[1] + 1e-6) - 1);
        setReach(f, n);
      };
      const feed = () => {
        if (!sb || sb.updating || failed || !alive) return;
        if (queue.length) {
          const n = queue.reduce((a, c) => a + c.length, 0), buf = new Uint8Array(n); let o = 0;
          for (const c of queue) { buf.set(c, o); o += c.length; }
          queue = [];
          try { sb.appendBuffer(buf); } catch { fail(); }
        } else if (ended && ms.readyState === 'open') { try { ms.endOfStream(); } catch { /* already ended */ } grow(); ok(); }
      };
      film.addEventListener('loadeddata', filmShown, { once: true });
      ms.addEventListener('sourceopen', () => {
        try { sb = ms.addSourceBuffer(FAST_MIME); } catch { fail(); return; }
        let first = true;
        sb.addEventListener('updateend', () => {
          if (first) { first = false; try { ms.duration = FILMS.fast[2] / FILMS.fast[1]; } catch { /* not ready */ } }
          grow(); feed();
        });
        fetch(FILMS.fast[0], { priority: 'high', signal: ctl.signal } as RequestInit).then(r => {
          if (!r.ok || !r.body) throw 0;
          total = +(r.headers.get('content-length') || 0);
          const rd = r.body.getReader();
          const read = (): Promise<void> => rd.read().then(({ done, value }) => {
            if (done) { ended = true; feed(); return; }
            queue.push(value); got += value.length;
            if (total) ring.style.setProperty('--ld', String(Math.round(126 * (1 - got / total))));
            feed(); return read();
          });
          return read();
        }).catch(fail);
      }, { once: true });
      film.src = blobUrl(ms);
    });
  }
  /* any browser (and phones): the light copy as one small file */
  function wholeFast() {
    return getBlob(FILMS.fast[0], true).then(b => {
      if (!alive) return;
      film.addEventListener('loadeddata', filmShown, { once: true });
      film.src = blobUrl(b);
      film.load();
      setReach(FILMS.fast[2] - 1, FILMS.fast[2]);
    });
  }
  /* the full-quality film takes over at the same moment of the walk, in one step */
  function swapIn(b: Blob) {
    if (!alive) return;
    const [, fps, n] = FILMS.hd, v = document.createElement('video') as Film;
    v.className = 'frames'; v.muted = true; v.playsInline = true; v._fps = fps; v._n = n;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('disablepictureinpicture', '');
    v.style.visibility = 'hidden';
    if (!PHONE) v.style.objectPosition = film.style.objectPosition;
    film.after(v);
    v.addEventListener('loadeddata', () => {
      const ready = () => {
        if (!alive) return;
        v.pause();
        const f = Math.round(Math.max(0, atF) / (film._n - 1) * (n - 1));
        v.addEventListener('seeked', () => {
          if (!alive) return;
          const old = film;
          film = v; old.removeAttribute('id'); v.id = 'frames'; v.style.visibility = ''; v.addEventListener('seeked', onSeeked);
          seeking = false; atF = pendF = f; setReach(n - 1, n);
          /* on a very fast connection the full film can arrive before the light copy showed its first frame */
          filmReady = true;
          if (!stage.classList.contains('video-ready')) { stage.classList.add('video-ready'); setTimeout(() => { posterLayer.style.visibility = 'hidden'; }, 700); }
          requestAnimationFrame(() => { old.pause(); old.removeAttribute('src'); old.load(); old.remove(); });
          showFrame(shown);
        }, { once: true });
        v.currentTime = (f + .5) / fps;
      };
      const pl = v.play();
      if (pl && pl.then) pl.then(ready, ready); else ready();
    }, { once: true });
    v.src = blobUrl(b);
    v.load();
  }
  function loadFilm() {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const light = c && (c.saveData || /2g/.test(c.effectiveType || ''));
    const first = !PHONE && window.MediaSource && MediaSource.isTypeSupported(FAST_MIME)
      ? streamFast().catch(() => { if (!alive) return; film.removeAttribute('src'); film.load(); return wholeFast(); })
      : wholeFast();
    first.then(() => { if (!light && alive) return getBlob(FILMS.hd[0]).then(swapIn); }).catch(() => { ring.style.opacity = '0'; });
  }
  function updateCaptions(p: number) {
    bands.forEach(b => {
      const f = Math.min(.02, (b.b - b.a) / 3);
      let op = (b.first ? 1 : smoothstep(p, b.a, b.a + f)) * (b.last ? 1 : 1 - smoothstep(p, b.b - f, b.b));
      let k = clamp((p - b.a) / Math.min(.025, (b.b - b.a) * .35), 0, 1);
      if (b.first) k = 1;
      if (p < b.a && !b.first) op = 0;
      if (Math.abs(op - b.op) > .004 || ((op === 0 || op === 1) && op !== b.op)) { b.op = op; b.el.style.opacity = op.toFixed(3); b.el.style.visibility = op < .01 ? 'hidden' : 'visible'; }
      if (Math.abs(k - b.k) > .008) { b.k = k; b.el.style.setProperty('--k', k.toFixed(3)); }
      if (b.last) b.el.classList.toggle('live', op > .9 && k > .9);
    });
    const gone = p > .012; if (gone !== lastCue) { lastCue = gone; cue.classList.toggle('gone', gone); }
    /* the real sign is the logo while it is in view, so the nav mark waits; keep the sign in frame on narrower screens */
    const sign = p < .3; if (sign !== lastSign) { lastSign = sign; nav.classList.toggle('on-sign', sign); }
  }
  function tick(now: number) {
    const dt = Math.min(100, now - (lastTick || now)); lastTick = now;
    shown += (target - shown) * (1 - Math.pow(1 - .22, dt / 16.667));
    if (Math.abs(target - shown) < .0005) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    updateCaptions(shown);
    drawFx(shown);
    showFrame(shown);
  }
  function onScroll() {
    target = Math.min(heroProgress(), reach);
    if (rafId === null && heroOnScreen && scrubOn) rafId = requestAnimationFrame(tick);
  }
  const heroIo = new IntersectionObserver(e => { heroOnScreen = e[0].isIntersecting; if (heroOnScreen) onScroll(); });
  heroIo.observe(stage);
  stops.push(() => heroIo.disconnect());

  function initHeroOnce() {
    if (heroInit) return; heroInit = true;
    /* the film starts downloading straight away, it is what the visitor sees first */
    loadFilm();
  }
  const GATES = [
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    initHeroOnce();
    bands.forEach(b => { b.op = -1; b.k = -1; });
    shown = target = heroProgress(); updateCaptions(shown); onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    nav.classList.remove('on-sign');
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    measure();
    if (GATES.some(q => matchMedia(q).matches)) disableScrub(); else enableScrub();
    layoutStreak();
  }
  GATES.map(q => matchMedia(q)).forEach(m => { m.addEventListener('change', applyHeroMode); stops.push(() => m.removeEventListener('change', applyHeroMode)); });

  /* ---------- nav ---------- */
  let navSolid: boolean | null = null;
  function updateNav() {
    const s = scrollY > M.panelTop - 70;
    if (s !== navSolid) { navSolid = s; nav.classList.toggle('solid', s); }
  }

  /* ---------- the tail-light streak, one line down the whole page (mouse devices only: redrawing it is costly on phones) ---------- */
  const STREAK = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const below = $('#below'), streak = $<SVGSVGElement>('#streak'), sPath = $<SVGPathElement>('#streakPath');
  function layoutStreak() {
    if (!STREAK || !alive) return;
    const W = below.clientWidth, top = below.getBoundingClientRect().top + scrollY;
    streak.setAttribute('viewBox', `0 0 ${W} ${below.clientHeight}`);
    streak.setAttribute('width', String(W)); streak.setAttribute('height', String(below.clientHeight));
    /* run down the page gutters and only sweep across in the gaps between sections, so it never strikes through words */
    const edge = Math.min(10, W * .012), form = $('#bookForm').getBoundingClientRect();
    const stopsY = ['#promise', '#inventory', '#how', '#questions'].map(s => $(s).getBoundingClientRect().top + scrollY - top);
    const endY = form.top + scrollY - top, endX = form.left + form.width / 2;
    let side = W - edge, d = `M${W * .08} 1 C ${W * .5} 1 ${side} 10 ${side} 54`;
    stopsY.forEach(y => {
      const to = side < W / 2 ? W - edge : edge;
      d += ` L ${side} ${y - 14} C ${side} ${y + 14} ${to} ${y + 2} ${to} ${y + 30}`;
      side = to;
    });
    d += ` L ${side} ${endY - 40} C ${side} ${endY - 8} ${endX} ${endY - 34} ${endX} ${endY}`;
    sPath.setAttribute('d', d);
  }
  /* one passive scroll listener, one piece of work per frame */
  let queued = false, frameId = 0;
  function onScrollFrame() { queued = false; updateNav(); if (scrubOn) onScroll(); }
  on('scroll', () => { if (!queued) { queued = true; frameId = requestAnimationFrame(onScrollFrame); } }, { passive: true });
  /* a phone's address bar fires resize constantly while scrolling, so only a real width change re-measures */
  let lastW = innerWidth, rz = 0;
  on('resize', () => {
    clearTimeout(rz);
    rz = window.setTimeout(() => {
      if (innerWidth === lastW && SMALL) return;
      lastW = innerWidth; measure();
      layoutStreak(); updateNav(); if (scrubOn) onScroll();
    }, 160);
  }, { passive: true });
  /* the page changed height (the booking form was sent): redraw the streak */
  const relayout = () => { measure(); layoutStreak(); updateNav(); };
  on('milcar:layout' as keyof WindowEventMap, relayout);

  /* ---------- reveals ---------- */
  const timers: number[] = [];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    timers.push(window.setTimeout(() => e.target.classList.add('done'), 1800));
  }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
  stops.push(() => io.disconnect());

  /* ---------- reduced motion, live in both directions (the build tool pins itself the same way) ---------- */
  const onMotion = (e: MediaQueryListEvent) => {
    if (e.matches) $$('.reveal').forEach(el => el.classList.add('in', 'done'));
    else applyHeroMode();
  };
  rm.addEventListener('change', onMotion);
  stops.push(() => rm.removeEventListener('change', onMotion));

  /* ---------- start ---------- */
  applyHeroMode();
  updateNav();
  if (rm.matches) $$('.reveal').forEach(el => el.classList.add('in', 'done'));
  const settle = () => { if (alive) relayout(); };
  if (document.readyState === 'complete') requestAnimationFrame(settle); else on('load', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);

  return () => {
    alive = false;
    ctl.abort();
    if (rafId !== null) cancelAnimationFrame(rafId);
    cancelAnimationFrame(frameId);
    clearTimeout(rz); timers.forEach(clearTimeout);
    stops.forEach(s => s());
    $$<HTMLVideoElement>('video.frames').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    urls.forEach(u => URL.revokeObjectURL(u));
    /* the next page sets the nav's own look; only the home page's sign mode is taken off */
    nav.classList.remove('on-sign');
  };
}
