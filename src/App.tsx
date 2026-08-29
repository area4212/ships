import React, { useEffect, useMemo, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { useFullscreen } from "./hooks/useFullscreen";
import { ARENAS, ArenaDef, arenaBotName, arenaDifficultyForRound } from "./game/arena";
import { generateObstacles, randomPlaceFleet, resetBoardCombatState } from "./game/board";
import { getFleetForSize } from "./game/fleet";
import { BoardState, Difficulty } from "./types/game";

import { MainMenu } from "./components/MainMenu";
import { PlaySetup, MapSetup } from "./components/PlaySetup";
import { ShipPlacement } from "./components/ShipPlacement";
import { Battle } from "./components/Battle";
import { EndScreen } from "./components/EndScreen";
import { ArenaIntro } from "./components/ArenaIntro";
import { ArenaRoundClear } from "./components/ArenaRoundClear";
import { ArenaResult } from "./components/ArenaResult";
import { Settings } from "./components/Settings";
import { Stats } from "./components/Stats";
import { Rules } from "./components/Rules";
import { Arsenal } from "./components/Arsenal";
import { OnlineLobby, OnlineMap } from "./components/OnlineLobby";
import { OnlineGame } from "./components/OnlineGame";
import { OnlineFFA } from "./components/OnlineFFA";
import { Friends } from "./components/Friends";
import { NetRole } from "./net/room";
import { LobbyMode } from "./net/lobby";
import { getIdentity } from "./net/identity";
import {
  AnchorIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  SoundOffIcon,
  SoundOnIcon,
} from "./assets/icons";

type Screen =
  | "menu"
  | "play-setup"
  | "placement"
  | "placement-handoff"
  | "battle"
  | "end"
  | "arena-intro"
  | "arena-placement"
  | "arena-battle"
  | "arena-round-clear"
  | "arena-result"
  | "online"
  | "online-game"
  | "friends"
  | "settings"
  | "stats"
  | "rules";

type PlacementStage = "solo" | "p1" | "p2";
type Overlay = "settings" | "stats" | "rules" | "arsenal" | null;

function GameShell() {
  const { settings, updateSettings, sfx, recordGameEnd, recordArenaResult } = useApp();

  // Per-game map, chosen in PlaySetup (seeded from global settings).
  const [matchMap, setMatchMap] = useState<MapSetup>({
    boardSize: settings.boardSize,
    obstacles: settings.obstacles,
    fog: settings.fogOfWar,
  });
  const fleet = useMemo(() => getFleetForSize(matchMap.boardSize), [matchMap.boardSize]);

  const { isFullscreen, toggle: toggleFullscreen, supported: fullscreenSupported } = useFullscreen();

  const muted = !settings.soundOn && !settings.musicOn;
  function toggleMute() {
    updateSettings({ soundOn: muted, musicOn: muted });
  }

  // Keyboard shortcuts: "F" toggles fullscreen, "M" toggles mute.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen, muted]);

  const [screen, setScreen] = useState<Screen>("menu");
  const [overlay, setOverlay] = useState<Overlay>(null);

  function openOverlay(o: Exclude<Overlay, null>) {
    sfx("click");
    setOverlay(o);
  }
  function closeOverlay() {
    sfx("click");
    setOverlay(null);
  }

  // Regular match (vs bot or local pvp)
  const [mode, setMode] = useState<"pvp" | "bot" | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [placementStage, setPlacementStage] = useState<PlacementStage>("solo");
  const [boardA, setBoardA] = useState<BoardState | null>(null);
  const [boardB, setBoardB] = useState<BoardState | null>(null);
  const [lastWinner, setLastWinner] = useState<"A" | "B" | null>(null);
  const [matchKey, setMatchKey] = useState(0);

  // Shared obstacle map (rocks / islands) for the current match / arena series.
  const [matchBlocked, setMatchBlocked] = useState<string[]>([]);

  function rollObstacles(): string[] {
    return matchMap.obstacles === "aucun"
      ? []
      : generateObstacles(matchMap.boardSize, matchMap.obstacles);
  }

  // Online
  const [onlineSession, setOnlineSession] = useState<{
    code: string;
    role: NetRole;
    name: string;
    mode: LobbyMode;
    map: OnlineMap;
  } | null>(null);

  // Arena
  const [arenaRound, setArenaRound] = useState(1);
  const [arenaBaseBoard, setArenaBaseBoard] = useState<BoardState | null>(null);
  const [arenaDef, setArenaDef] = useState<ArenaDef>(ARENAS[0]);
  const arenaFleet = useMemo(() => getFleetForSize(arenaDef.boardSize), [arenaDef.boardSize]);

  // Recomputed only when the round changes, so the bot's layout stays fixed
  // for the duration of that round even though App re-renders often (Battle
  // only reads these as its initial state, but recomputing on every parent
  // render would still be wasteful and confusing to reason about).
  const arenaPlayerBoard = useMemo(
    () => (arenaBaseBoard ? resetBoardCombatState(arenaBaseBoard) : null),
    [arenaBaseBoard, arenaRound]
  );
  const arenaBotBoard = useMemo(
    () => randomPlaceFleet(arenaDef.boardSize, arenaFleet, settings.noTouchRule, matchBlocked),
    [arenaRound, arenaDef.boardSize, settings.noTouchRule, arenaFleet, matchBlocked]
  );

  const nameA = mode === "pvp" ? "Joueur 1" : "Vous";
  const nameB = mode === "pvp" ? "Joueur 2" : `Bot ${difficulty ? `(${difficulty})` : ""}`;

  function goMenu() {
    sfx("click");
    setScreen("menu");
  }

  function spectate(gameCode: string) {
    sfx("click");
    setOnlineSession({
      code: gameCode,
      role: "spectator",
      name: getIdentity().name || "Spectateur",
      mode: "duel",
      map: { boardSize: settings.boardSize, obstacles: settings.obstacles },
    });
    setScreen("online-game");
  }

  function handleNavigate(
    target:
      | "play-setup"
      | "arena-intro"
      | "online"
      | "friends"
      | "settings"
      | "stats"
      | "rules"
      | "arsenal"
  ) {
    if (
      target === "play-setup" ||
      target === "arena-intro" ||
      target === "online" ||
      target === "friends"
    ) {
      setScreen(target);
    } else {
      setOverlay(target);
    }
  }

  function handlePlayStart(config: { mode: "pvp" | "bot"; difficulty?: Difficulty; map: MapSetup }) {
    setMode(config.mode);
    setDifficulty(config.difficulty ?? null);
    setMatchMap(config.map);
    setBoardA(null);
    setBoardB(null);
    setMatchBlocked(
      config.map.obstacles === "aucun"
        ? []
        : generateObstacles(config.map.boardSize, config.map.obstacles)
    );
    setPlacementStage(config.mode === "pvp" ? "p1" : "solo");
    setScreen("placement");
  }

  function handlePlacementConfirm(board: BoardState) {
    if (mode === "bot") {
      const botBoard = randomPlaceFleet(matchMap.boardSize, fleet, settings.noTouchRule, board.blocked ?? []);
      setBoardA(board);
      setBoardB(botBoard);
      setMatchKey((k) => k + 1);
      setScreen("battle");
      return;
    }

    if (placementStage === "p1") {
      setBoardA(board);
      setPlacementStage("p2");
      setScreen("placement-handoff");
      return;
    }

    if (placementStage === "p2") {
      setBoardB(board);
      setMatchKey((k) => k + 1);
      setScreen("battle");
    }
  }

  function handleBattleEnd(winner: "A" | "B") {
    if (mode === "bot") {
      recordGameEnd(winner === "A", difficulty ?? undefined);
    }
    setLastWinner(winner);
    sfx("click");
    setScreen("end");
  }

  function handleRematch() {
    setBoardA(null);
    setBoardB(null);
    setMatchBlocked(rollObstacles());
    setPlacementStage(mode === "pvp" ? "p1" : "solo");
    setScreen("placement");
  }

  // --- Arena ---

  function startArenaRound(round: number, baseBoard: BoardState) {
    setArenaRound(round);
    setArenaBaseBoard(baseBoard);
    setScreen("arena-battle");
  }

  function handleArenaPlacementConfirm(board: BoardState) {
    startArenaRound(1, board);
  }

  function handleArenaRoundEnd(winner: "A" | "B") {
    if (winner === "A") {
      recordArenaResult(true, arenaDef.id);
      setScreen("arena-round-clear");
    } else {
      recordArenaResult(false, arenaDef.id);
      setScreen("arena-result");
    }
  }

  function handleArenaContinue() {
    if (!arenaBaseBoard) return;
    startArenaRound(arenaRound + 1, arenaBaseBoard);
  }

  function handleArenaRetry() {
    setArenaRound(1);
    setArenaBaseBoard(null);
    setMatchBlocked(
      arenaDef.obstacles === "aucun" ? [] : generateObstacles(arenaDef.boardSize, arenaDef.obstacles)
    );
    setScreen("arena-placement");
  }

  return (
    <div className={"app-shell" + (screen === "menu" ? " app-shell--menu" : "")}>
      <div className="app-header">
        <div className="brand" onClick={goMenu}>
          <span className="brand-badge">
            <AnchorIcon size={18} />
          </span>
          Feedlo Navale
        </div>
        <div className="row">
          {screen !== "menu" && (
            <>
              <button className="btn btn-ghost" onClick={() => openOverlay("arsenal")}>
                Arsenal
              </button>
              <button className="btn btn-ghost" onClick={() => openOverlay("stats")}>
                Stats
              </button>
              <button className="btn btn-ghost" onClick={() => openOverlay("settings")}>
                Parametres
              </button>
            </>
          )}
          <button
            className={"btn btn-ghost btn-icon" + (muted ? " is-muted" : "")}
            onClick={() => {
              if (muted) sfx("click");
              toggleMute();
            }}
            title={muted ? "Reactiver le son (M)" : "Couper le son (M)"}
            aria-label={muted ? "Reactiver le son" : "Couper le son"}
            aria-pressed={muted}
          >
            {muted ? <SoundOffIcon size={18} /> : <SoundOnIcon size={18} />}
          </button>
          {fullscreenSupported && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                sfx("click");
                toggleFullscreen();
              }}
              title={isFullscreen ? "Quitter le plein ecran (F)" : "Plein ecran immersif (F)"}
              aria-label={isFullscreen ? "Quitter le plein ecran" : "Plein ecran"}
            >
              {isFullscreen ? <FullscreenExitIcon size={18} /> : <FullscreenEnterIcon size={18} />}
            </button>
          )}
        </div>
      </div>

      {screen === "menu" && <MainMenu onNavigate={handleNavigate} />}

      {screen === "play-setup" && <PlaySetup onStart={handlePlayStart} onBack={goMenu} />}

      {screen === "online" && (
        <OnlineLobby
          onStart={(code, role, name, mode, map) => {
            setOnlineSession({ code, role, name, mode, map });
            setScreen("online-game");
          }}
          onOpenFriends={() => setScreen("friends")}
          onSpectate={spectate}
          onBack={goMenu}
        />
      )}

      {screen === "friends" && (
        <Friends
          onInviteGame={(code, role, name) => {
            setOnlineSession({
              code,
              role,
              name,
              mode: "duel",
              map: { boardSize: settings.boardSize, obstacles: settings.obstacles },
            });
            setScreen("online-game");
          }}
          onSpectate={spectate}
          onBack={goMenu}
        />
      )}

      {screen === "online-game" && onlineSession && onlineSession.mode === "duel" && (
        <OnlineGame
          key={onlineSession.code}
          code={onlineSession.code}
          role={onlineSession.role}
          name={onlineSession.name}
          map={onlineSession.map}
          onExit={() => {
            setOnlineSession(null);
            setScreen("menu");
          }}
        />
      )}

      {screen === "online-game" && onlineSession && onlineSession.mode === "chaos" && (
        <OnlineFFA
          key={onlineSession.code}
          code={onlineSession.code}
          name={onlineSession.name}
          map={onlineSession.map}
          onExit={() => {
            setOnlineSession(null);
            setScreen("menu");
          }}
        />
      )}

      {screen === "placement" && (
        <ShipPlacement
          boardSize={matchMap.boardSize}
          fleet={fleet}
          noTouchRule={settings.noTouchRule}
          blocked={matchBlocked}
          title={
            mode === "bot"
              ? "Placez votre flotte"
              : placementStage === "p1"
              ? "Joueur 1 - Placement de la flotte"
              : "Joueur 2 - Placement de la flotte"
          }
          subtitle={mode === "pvp" ? "L'autre joueur ne doit pas regarder l'ecran pendant ce placement." : undefined}
          onConfirm={handlePlacementConfirm}
          onBack={() => setScreen("play-setup")}
        />
      )}

      {screen === "placement-handoff" && (
        <div className="panel stack center">
          <h2>Flotte du Joueur 1 prete</h2>
          <p className="subtitle">
            Passez l'appareil au Joueur 2. Le Joueur 1 ne doit pas regarder l'ecran pendant le
            placement de la flotte adverse.
          </p>
          <button
            className="btn btn-primary btn-block"
            style={{ maxWidth: 320 }}
            onClick={() => {
              sfx("click");
              setScreen("placement");
            }}
          >
            Joueur 2 - Je suis pret
          </button>
        </div>
      )}

      {screen === "battle" && mode && boardA && boardB && (
        <Battle
          key={matchKey}
          mode={mode}
          difficulty={difficulty ?? undefined}
          boardA={boardA}
          boardB={boardB}
          nameA={nameA}
          nameB={nameB}
          fogOverride={matchMap.fog}
          onGameEnd={handleBattleEnd}
          onQuit={goMenu}
        />
      )}

      {screen === "end" && mode && lastWinner && (
        <EndScreen
          isVictory={mode === "bot" ? lastWinner === "A" : true}
          title={
            mode === "pvp"
              ? `${lastWinner === "A" ? nameA : nameB} remporte la bataille !`
              : lastWinner === "A"
              ? "Victoire !"
              : "Defaite"
          }
          message={
            mode === "pvp"
              ? "Bravo au vainqueur. Envie d'une revanche ?"
              : lastWinner === "A"
              ? "Vous avez coule toute la flotte ennemie."
              : "Votre flotte a ete entierement coulee."
          }
          onRematch={handleRematch}
          onMenu={goMenu}
        />
      )}

      {screen === "arena-intro" && (
        <ArenaIntro
          onStart={(id) => {
            const def = ARENAS.find((a) => a.id === id) ?? ARENAS[0];
            setArenaDef(def);
            setMatchBlocked(
              def.obstacles === "aucun" ? [] : generateObstacles(def.boardSize, def.obstacles)
            );
            setScreen("arena-placement");
          }}
          onBack={goMenu}
        />
      )}

      {screen === "arena-placement" && (
        <ShipPlacement
          boardSize={arenaDef.boardSize}
          fleet={arenaFleet}
          noTouchRule={settings.noTouchRule}
          blocked={matchBlocked}
          title={`${arenaDef.name} - Placement de la flotte`}
          subtitle="Ce placement sera utilise pour tous les rounds de votre serie."
          onConfirm={handleArenaPlacementConfirm}
          onBack={() => setScreen("arena-intro")}
        />
      )}

      {screen === "arena-battle" && arenaPlayerBoard && (
        <Battle
          key={arenaRound}
          mode="arene"
          difficulty={arenaDifficultyForRound(arenaRound, arenaDef)}
          boardA={arenaPlayerBoard}
          boardB={arenaBotBoard}
          nameA="Vous"
          nameB={arenaBotName(arenaRound)}
          fogOverride={arenaDef.fog}
          fireAgainOverride={arenaDef.noFireAgain ? false : undefined}
          arenaTag={{ name: arenaDef.name, stars: arenaDef.stars, powerCostMod: arenaDef.powerCostMod }}
          onGameEnd={handleArenaRoundEnd}
          onQuit={goMenu}
        />
      )}

      {screen === "arena-round-clear" && (
        <ArenaRoundClear clearedRound={arenaRound} onContinue={handleArenaContinue} />
      )}

      {screen === "arena-result" && (
        <ArenaResult
          reachedRound={arenaRound}
          arenaDef={arenaDef}
          onRetry={handleArenaRetry}
          onMenu={goMenu}
        />
      )}

      {screen === "settings" && <Settings onBack={goMenu} />}
      {screen === "stats" && <Stats onBack={goMenu} />}
      {screen === "rules" && <Rules onBack={goMenu} />}

      {overlay && (
        <div className="overlay-backdrop" onClick={closeOverlay}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <button className="overlay-close" onClick={closeOverlay} aria-label="Fermer">
              ✕
            </button>
            {overlay === "settings" && <Settings onBack={closeOverlay} backLabel="Fermer" />}
            {overlay === "stats" && <Stats onBack={closeOverlay} backLabel="Fermer" />}
            {overlay === "rules" && <Rules onBack={closeOverlay} backLabel="Fermer" />}
            {overlay === "arsenal" && <Arsenal onBack={closeOverlay} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <GameShell />
    </AppProvider>
  );
}
