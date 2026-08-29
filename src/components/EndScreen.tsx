import React from "react";

interface EndScreenProps {
  title: string;
  message: string;
  isVictory: boolean;
  onRematch: () => void;
  onMenu: () => void;
  extra?: React.ReactNode;
}

export function EndScreen({ title, message, isVictory, onRematch, onMenu, extra }: EndScreenProps) {
  return (
    <div className="panel stack center">
      <span style={{ fontSize: 52 }}>{isVictory ? "🏆" : "💥"}</span>
      <h1 style={{ color: isVictory ? "var(--ok)" : "var(--danger)" }}>{title}</h1>
      <p className="subtitle">{message}</p>
      {extra}
      <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
        <button className="btn btn-primary" onClick={onRematch}>
          Rejouer
        </button>
        <button className="btn btn-ghost" onClick={onMenu}>
          Menu principal
        </button>
      </div>
    </div>
  );
}
