// Shared chime player with autoplay-policy workaround.
// AudioContext-ыг хэрэглэгчийн эхний interaction (click/keydown/touch)-аар unlock хийнэ.

type AC = AudioContext;
let ctx: AC | null = null;
let unlocked = false;

function getCtx(): AC | null {
    if (typeof window === 'undefined') return null;
    if (ctx) return ctx;
    try {
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
        return null;
    }
    return ctx;
}

function unlock() {
    if (unlocked) return;
    const c = getCtx();
    if (!c) return;
    // Resume context if suspended (most browsers start it suspended).
    if (c.state === 'suspended') {
        c.resume().catch(() => {});
    }
    // Play a silent buffer to fully activate audio output on iOS/Safari.
    try {
        const buf = c.createBuffer(1, 1, 22050);
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.start(0);
    } catch { /* silent */ }
    unlocked = true;
}

if (typeof window !== 'undefined') {
    const handler = () => {
        unlock();
        window.removeEventListener('click', handler);
        window.removeEventListener('keydown', handler);
        window.removeEventListener('touchstart', handler);
    };
    window.addEventListener('click', handler, { passive: true });
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler, { passive: true });
}

export function playChime() {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});

    const play = (freq: number, t: number, dur: number, vol: number) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t); osc.stop(t + dur);
    };
    const now = c.currentTime;
    play(880, now, 0.22, 0.2);
    play(1175, now + 0.11, 0.32, 0.15);
}
