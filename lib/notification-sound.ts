// A tiny, dependency-free notification chime — built with the Web Audio API
// instead of an <audio> file, so there's no asset to fetch/host and nothing
// that can 404. Two short ascending beeps, similar to a chat-app "ping".
// Safe to call from anywhere; silently no-ops in environments without
// AudioContext (SSR, very old browsers) or if the browser blocks audio
// before the user has interacted with the page at all.
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx: AudioContext = new AudioContextCtor();

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startAt = ctx.currentTime + startOffset;
      // Quick fade in/out avoids an audible click at tone start/end.
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.15, startAt + 0.02);
      gain.gain.linearRampToValueAtTime(0, startAt + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    };

    playTone(740, 0, 0.11);
    playTone(988, 0.13, 0.14);

    // Tear down once both tones have finished — an AudioContext left open
    // indefinitely is a (minor) resource leak if this fires often.
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // Autoplay policies / unsupported environments — never let a chime
    // failure break the actual notification it was announcing.
  }
}
