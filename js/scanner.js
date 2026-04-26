// Camera barcode scanner — wraps html5-qrcode (loaded via CDN as a global).
// Handles cooldown, success/error visual feedback, and a soft audio chime.

let scanner = null;
let lastValue = null;
let lastAt = 0;
const COOLDOWN_MS = 1800;

let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

function tone(frequency, durationMs = 120, gain = 0.05) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

export function chimeSuccess() { tone(880, 110); setTimeout(() => tone(1175, 110), 90); }
export function chimeError()   { tone(220, 220, 0.08); }

export async function start({ onScan, onError }) {
  if (scanner) await stop();

  if (!window.Html5Qrcode) {
    onError(new Error('Scanner library failed to load.'));
    return;
  }

  scanner = new window.Html5Qrcode('reader', { verbose: false });

  const config = {
    fps: 12,
    aspectRatio: 1.25,
    qrbox: (vw, vh) => {
      const minEdge = Math.min(vw, vh);
      const w = Math.floor(minEdge * 0.78);
      return { width: w, height: Math.floor(w * 0.62) };
    },
  };

  try {
    await scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        const now = Date.now();
        if (decodedText === lastValue && now - lastAt < COOLDOWN_MS) return;
        lastValue = decodedText;
        lastAt = now;
        onScan(decodedText);
      },
      () => { /* ignore per-frame decode failures */ },
    );
  } catch (err) {
    onError(err);
  }
}

export async function stop() {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
    await scanner.clear();
  } catch {
    // ignore — library throws if already stopped
  } finally {
    scanner = null;
    lastValue = null;
    lastAt = 0;
  }
}

let flashTimer = null;
export function flashSuccess() {
  const el = document.getElementById('scannerStage');
  if (!el) return;
  el.classList.remove('is-error');
  el.classList.add('is-success');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('is-success'), 700);
}

export function flashError() {
  const el = document.getElementById('scannerStage');
  if (!el) return;
  el.classList.remove('is-success');
  el.classList.add('is-error');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('is-error'), 700);
}
