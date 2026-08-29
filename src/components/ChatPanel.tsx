import React, { useEffect, useRef, useState } from "react";

export interface ChatMsg {
  from: string;
  text: string;
  mine?: boolean;
  kind?: "emote";
}

interface ChatPanelProps {
  log: ChatMsg[];
  onSend: (text: string) => void;
}

/** Fixed, collapsible in-game chat drawer (bottom-right). Reused by Duel + FFA. */
export function ChatPanel({ log, onSend }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [seen, setSeen] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSeen(log.length);
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }
  }, [log, open]);

  const unread = open ? 0 : Math.max(0, log.length - seen);

  function send() {
    const t = draft.trim();
    if (!t) return;
    onSend(t.slice(0, 200));
    setDraft("");
  }

  return (
    <div className={`chat-panel${open ? " open" : ""}`}>
      {open ? (
        <>
          <div className="chat-head">
            <span>Chat</span>
            <button className="chat-x" onClick={() => setOpen(false)} aria-label="Fermer le chat">
              ×
            </button>
          </div>
          <div className="chat-log" ref={logRef}>
            {log.length === 0 && <div className="chat-empty">Dites bonjour…</div>}
            {log.map((m, i) => (
              <div
                key={i}
                className={`chat-msg${m.mine ? " mine" : " peer"}${m.kind === "emote" ? " emote" : ""}`}
              >
                <span className="chat-from">{m.from}</span>
                <span className="chat-text">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="select"
              placeholder="Message…"
              maxLength={200}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn btn-primary btn-sm" onClick={send}>
              Envoyer
            </button>
          </div>
        </>
      ) : (
        <button className="chat-toggle" onClick={() => setOpen(true)}>
          💬 Chat
          {unread > 0 && <span className="chat-badge">{unread}</span>}
        </button>
      )}
    </div>
  );
}
