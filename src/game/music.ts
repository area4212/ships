// Background music. A single looping track (bundled mp3). It plays quietly as
// ambience and swells during tense moments (last ships, decisive shots).

import themeUrl from "../assets/action-theme.mp3";

const VOL_AMBIENT = 0.3;
const VOL_TENSE = 0.62;

let audio: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;
let enabled = false;
let tense = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    // The track is only fetched here - i.e. once the player actually turns
    // music on - so visitors who leave it off never download the file.
    audio = new Audio(themeUrl);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0;
  }
  return audio;
}

function fadeTo(target: number, ms: number, onDone?: () => void) {
  if (!audio) return;
  if (fadeTimer !== null) clearInterval(fadeTimer);
  const el = audio;
  const from = el.volume;
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fadeTimer = window.setInterval(() => {
    i++;
    el.volume = Math.min(1, Math.max(0, from + (target - from) * (i / steps)));
    if (i >= steps) {
      if (fadeTimer !== null) clearInterval(fadeTimer);
      fadeTimer = null;
      onDone?.();
    }
  }, 40);
}

export function startMusic(): void {
  enabled = true;
  const el = getAudio();
  el.play().catch(() => undefined);
  fadeTo(tense ? VOL_TENSE : VOL_AMBIENT, 2500);
}

export function stopMusic(): void {
  enabled = false;
  if (!audio) return;
  const el = audio;
  fadeTo(0, 800, () => {
    el.pause();
  });
}

/** Signals a tense moment: the track swells louder. */
export function setTension(on: boolean): void {
  if (on === tense) return;
  tense = on;
  if (!enabled || !audio) return;
  fadeTo(on ? VOL_TENSE : VOL_AMBIENT, on ? 700 : 1500);
}

export function isMusicRunning(): boolean {
  return enabled;
}
