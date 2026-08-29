// Every sound effect is synthesised on the fly with the Web Audio API.
// No binary audio assets are shipped, so there is nothing to license and
// nothing that can go missing after extracting the zip.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => undefined);
  }
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  startGain: number,
  delay = 0
) {
  const audio = getCtx();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + delay);
  gain.gain.setValueAtTime(startGain, audio.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(audio.currentTime + delay);
  osc.stop(audio.currentTime + delay + duration);
}

function noiseBurst(duration: number, startGain: number, delay = 0) {
  const audio = getCtx();
  const bufferSize = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(startGain, audio.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  source.connect(gain);
  gain.connect(audio.destination);
  source.start(audio.currentTime + delay);
}

export type SfxName = "click" | "fire" | "miss" | "hit" | "sunk" | "victory" | "defeat" | "place";

export function playSfx(name: SfxName, enabled: boolean): void {
  if (!enabled) return;
  try {
    switch (name) {
      case "click":
        tone(520, 0.06, "square", 0.05);
        break;
      case "place":
        tone(380, 0.08, "triangle", 0.06);
        break;
      case "fire":
        tone(180, 0.15, "sawtooth", 0.08);
        noiseBurst(0.12, 0.05, 0.02);
        break;
      case "miss":
        tone(300, 0.25, "sine", 0.05, 0.05);
        break;
      case "hit":
        tone(120, 0.3, "square", 0.09, 0.03);
        noiseBurst(0.3, 0.12, 0.03);
        break;
      case "sunk":
        tone(220, 0.2, "sawtooth", 0.1);
        tone(140, 0.3, "sawtooth", 0.1, 0.15);
        tone(90, 0.4, "sawtooth", 0.1, 0.3);
        noiseBurst(0.5, 0.15, 0.05);
        break;
      case "victory":
        [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, "triangle", 0.09, i * 0.14));
        break;
      case "defeat":
        [392, 349, 293, 220].forEach((f, i) => tone(f, 0.4, "sawtooth", 0.08, i * 0.16));
        break;
    }
  } catch {
    // Audio can fail silently (autoplay policies, unsupported browsers).
  }
}
