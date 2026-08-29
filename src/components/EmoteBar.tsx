import React, { useEffect, useRef, useState } from "react";
import { EMOTES, EMOTE_COOLDOWN_MS, emoteById } from "../game/emotes";

interface EmoteBarProps {
  onEmote: (id: string) => void;
  disabled?: boolean;
}

/** Emote picker: a button that opens a small grid of emotes. Rate-limited. */
export function EmoteBar({ onEmote, disabled }: EmoteBarProps) {
  const [open, setOpen] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const cooling = Date.now() < lockedUntil;

  function pick(id: string) {
    if (Date.now() < lockedUntil) return;
    setLockedUntil(Date.now() + EMOTE_COOLDOWN_MS);
    setOpen(false);
    onEmote(id);
  }

  return (
    <div className="emote-bar" ref={wrapRef}>
      <button
        className="emote-toggle"
        disabled={disabled}
        title="Envoyer une emote"
        onClick={() => setOpen((v) => !v)}
      >
        😀
      </button>
      {open && (
        <div className="emote-popover">
          {EMOTES.map((e) => (
            <button
              key={e.id}
              className="emote-opt"
              disabled={cooling}
              title={e.label}
              onClick={() => pick(e.id)}
            >
              {e.glyph}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A single emote playing its animation above a board. Render it keyed by a
 * changing value (e.g. a timestamp) so each new emote remounts and replays.
 */
export function FloatingEmote({ id, from }: { id: string; from?: string }) {
  const def = emoteById(id);
  if (!def) return null;
  return (
    <span className={`floating-emote emote-anim-${def.anim}`} aria-hidden="true">
      {from && <span className="floating-emote-from">{from}</span>}
      <span className="floating-emote-glyph">{def.glyph}</span>
    </span>
  );
}
