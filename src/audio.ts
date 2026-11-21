// 소리는 모두 코드로 만들어요 (WebAudio). 파일이 없어서 가볍고 저작권 걱정도 없어요.
export type Mood = 'title' | 'desert' | 'holy' | 'tense' | 'battle' | 'night' | 'triumph';
export type Sfx = 'click' | 'select' | 'page' | 'hit' | 'swing' | 'heal' | 'win' | 'lose' | 'miss' | 'ding' | 'chime'
  | 'pop' | 'whoosh' | 'splash' | 'thunder' | 'rumble';

const MUTE_KEY = 'noah-rpg-mute';
let ctx: AudioContext | null = null;
let master: GainNode, musicBus: GainNode, sfxBus: GainNode, echo: DelayNode;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }

let wanted: Mood | null = null;       // 원하는 음악 (잠금 해제 전에도 기억)
let playing: Mood | null = null;
let timer: number | undefined;
let step = 0, nextTime = 0, melodyIdx = 0;
let uiClickAt = 0;

export const isMuted = () => muted;
export const markUiClick = () => { uiClickAt = performance.now(); };
export const recentUiClick = () => performance.now() - uiClickAt < 250;

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
}

// 브라우저는 사용자가 한 번 누르기 전에는 소리를 막아요 → 첫 터치/클릭 때 호출
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    echo = ctx.createDelay(1); echo.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.3; echo.connect(fb); fb.connect(echo); echo.connect(musicBus);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  if (wanted && playing !== wanted) startMusic(wanted);
}

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, bus: AudioNode, opts: { attack?: number; slideTo?: number; send?: boolean } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  const a = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  if (opts.send) g.connect(echo);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(t: number, dur: number, vol: number, filter: BiquadFilterType, f0: number, f1: number, bus: AudioNode) {
  if (!ctx) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf;
  const fl = ctx.createBiquadFilter(); fl.type = filter;
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(bus); s.start(t);
}

// ───────────── 효과음 ─────────────
export function sfx(name: Sfx) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const t = ctx.currentTime, b = sfxBus;
  const arp = (notes: number[], gap: number, type: OscillatorType, vol: number, dur = 0.22) =>
    notes.forEach((n, i) => tone(midi(n), t + i * gap, dur, type, vol, b));
  switch (name) {
    case 'click': tone(660, t, 0.07, 'triangle', 0.25, b); break;
    case 'select': arp([72, 79], 0.07, 'triangle', 0.25, 0.16); break;
    case 'page': tone(520, t, 0.04, 'sine', 0.08, b); break;
    case 'hit': noise(t, 0.14, 0.5, 'lowpass', 900, 120, b); tone(160, t, 0.14, 'square', 0.18, b, { slideTo: 60 }); break;
    case 'swing': noise(t, 0.16, 0.35, 'bandpass', 500, 2200, b); break;
    case 'heal': arp([72, 76, 79, 84], 0.08, 'sine', 0.28, 0.35); break;
    case 'win': arp([72, 76, 79, 84, 88], 0.1, 'triangle', 0.3, 0.4); break;
    case 'lose': arp([69, 65, 62, 57], 0.14, 'triangle', 0.26, 0.4); break;
    case 'miss': tone(150, t, 0.2, 'sawtooth', 0.16, b, { slideTo: 90 }); break;
    case 'ding': tone(midi(84), t, 0.35, 'sine', 0.3, b); tone(midi(91), t + 0.02, 0.3, 'sine', 0.12, b); break;
    case 'chime': arp([88, 95, 100], 0.09, 'sine', 0.2, 0.5); break;
    case 'pop': tone(380, t, 0.09, 'sine', 0.3, b, { slideTo: 900 }); break;
    case 'whoosh': noise(t, 1.1, 0.5, 'bandpass', 300, 3200, b); break;
    case 'splash': noise(t, 1.2, 0.6, 'lowpass', 3000, 200, b); break;
    case 'thunder': noise(t, 1.6, 0.9, 'lowpass', 400, 50, b); tone(55, t, 1.2, 'sawtooth', 0.25, b, { slideTo: 35 }); break;
    case 'rumble': noise(t, 0.6, 0.35, 'lowpass', 160, 60, b); break;
  }
}

// ───────────── 음악 ─────────────
interface MoodDef { root: number; scale: number[]; bpm: number; density: number; wave: OscillatorType; prog: number[]; drums?: boolean; bass?: boolean; hi?: number }
const MOODS: Record<Mood, MoodDef> = {
  title:   { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 70,  density: 0.5,  wave: 'triangle', prog: [0, 3, 4, 0] },
  desert:  { root: 50, scale: [0, 3, 5, 7, 10],       bpm: 84,  density: 0.45, wave: 'triangle', prog: [0, 0, 3, 4], drums: true, bass: true },
  holy:    { root: 55, scale: [0, 2, 4, 7, 9],        bpm: 60,  density: 0.35, wave: 'sine',     prog: [0, 4, 3, 0], hi: 12 },
  tense:   { root: 45, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 96,  density: 0.35, wave: 'triangle', prog: [0, 0, 5, 4], bass: true },
  battle:  { root: 45, scale: [0, 3, 5, 7, 10],       bpm: 136, density: 0.6,  wave: 'square',   prog: [0, 0, 3, 4], drums: true, bass: true },
  night:   { root: 43, scale: [0, 2, 3, 7, 8],        bpm: 56,  density: 0.25, wave: 'sine',     prog: [0, 5, 3, 5] },
  triumph: { root: 53, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 118, density: 0.6,  wave: 'triangle', prog: [0, 3, 4, 0], drums: true, bass: true, hi: 12 },
};

function startMusic(m: Mood) {
  if (!ctx) return;
  stopTimer();
  playing = m; step = 0; melodyIdx = 2; nextTime = ctx.currentTime + 0.1;
  timer = window.setInterval(schedule, 40);
}
function stopTimer() { if (timer !== undefined) { clearInterval(timer); timer = undefined; } }

function schedule() {
  if (!ctx || !playing) return;
  const m = MOODS[playing], stepDur = 60 / m.bpm / 2;   // 8분음표
  while (nextTime < ctx.currentTime + 0.25) {
    const t = nextTime, bar = Math.floor(step / 8), inBar = step % 8;
    const deg = m.prog[bar % m.prog.length], chordRoot = m.root + m.scale[deg % m.scale.length];
    if (inBar === 0) {           // 화음(패드)
      [0, 7, 12].forEach((iv, i) => tone(midi(chordRoot + iv), t, stepDur * 8.2, 'sine', 0.07 - i * 0.012, musicBus, { attack: stepDur * 2 }));
      if (m.hi) tone(midi(chordRoot + m.hi + 7), t, stepDur * 7, 'sine', 0.03, musicBus, { attack: stepDur * 3, send: true });
    }
    if (m.bass && inBar % 4 === 0) tone(midi(chordRoot - 12), t, stepDur * 3.5, 'sine', 0.2, musicBus);
    if (m.drums) {
      if (inBar % 4 === 0) tone(110, t, 0.18, 'sine', 0.3, musicBus, { slideTo: 45 });
      if (inBar % 4 === 2) noise(t, 0.06, 0.08, 'highpass', 4000, 6000, musicBus);
    } else if (playing === 'tense' && inBar % 4 === 0) {
      tone(60, t, 0.2, 'sine', 0.22, musicBus, { slideTo: 40 });   // 심장 소리
    }
    if (Math.random() < m.density && inBar !== 7) {            // 멜로디 (한 걸음씩 걷기)
      melodyIdx = Math.max(0, Math.min(m.scale.length * 2 - 1, melodyIdx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const oct = Math.floor(melodyIdx / m.scale.length), n = m.scale[melodyIdx % m.scale.length];
      tone(midi(m.root + 12 + oct * 12 + n), t, stepDur * (1 + Math.floor(Math.random() * 3)), m.wave, 0.1, musicBus, { send: true });
    }
    step++; nextTime += stepDur;
  }
}

// 원하는 분위기를 알려 주면 알아서 바꿔 줘요 (같은 분위기면 그대로 이어서)
export function setMood(m: Mood) {
  wanted = m;
  if (ctx && ctx.state === 'running' && playing !== m) startMusic(m);
}
