export async function safePlayGameSound({ enabled = false, userGesture = false, AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, frequency = 660 } = {}) {
  if (!enabled || !userGesture || typeof AudioContextClass !== 'function') return false;
  let context;
  try {
    context = new AudioContextClass();
    if (context.state === 'suspended') await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.onended = () => { try { context.close(); } catch {} };
    return true;
  } catch {
    try { await context?.close?.(); } catch {}
    return false;
  }
}
