"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LobbyPond } from "@/components/LobbyPond";
import { PixiGameBackground } from "@/components/PixiGameBackground";
import { QRInvite } from "@/components/QRInvite";
import { WordBox } from "@/components/WordBox";
import type { HostRoomState } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";
import { useRoomState } from "@/lib/useRoomState";

function isHostRoomState(state: unknown): state is HostRoomState {
  return Boolean(
    state &&
      typeof state === "object" &&
      "answers" in state &&
      "reveal" in state,
  );
}

function getPresenceBadge(status: "connected" | "reconnecting" | "offline") {
  if (status === "connected") {
    return {
      label: "在線",
      className: "text-xs font-bold text-success",
    };
  }

  if (status === "reconnecting") {
    return {
      label: "重連中",
      className: "text-xs font-bold text-amber-600",
    };
  }

  return {
    label: "離線",
    className: "text-xs font-bold text-text-muted",
  };
}

type LobbyContextMenuState = {
  x: number;
  y: number;
  playerId: string;
  displayName: string;
  isEliminated: boolean;
};

type EliminateConfirmState = {
  playerId: string;
  displayName: string;
};

export default function HostRoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const hostId =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`bopomo.host.${roomId}`)
      : null;

  const { roomState, error, connected } = useRoomState(roomId, hostId);
  const [localError, setLocalError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [lanHost, setLanHost] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<LobbyContextMenuState | null>(
    null,
  );
  const [confirmEliminate, setConfirmEliminate] =
    useState<EliminateConfirmState | null>(null);

  const allSubmitted = roomState?.players.some((player) => !player.isEliminated)
    ? roomState.players
        .filter((player) => !player.isEliminated)
        .every((player) => player.hasSubmitted)
    : false;

  const joinUrl =
    typeof window !== "undefined"
      ? (() => {
          const preferLan = lanHost && window.location.hostname === "localhost";
          const host = preferLan ? lanHost : window.location.hostname;
          const port = window.location.port;

          const base =
            host && port
              ? `${window.location.protocol}//${host}:${port}`
              : `${window.location.protocol}//${window.location.host}`;

          return new URL(`/room/${roomId}/join`, base).toString();
        })()
      : `/room/${roomId}/join`;

  const guessed = useMemo(
    () => new Set(roomState?.reveal.guessedComponents ?? []),
    [roomState?.reveal.guessedComponents],
  );
  const hostState = isHostRoomState(roomState) ? roomState : null;

  const socket = getSocket();

  useEffect(() => {
    if (roomState) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true);
      setLocalError("找不到房間。");
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [roomState]);

  useEffect(() => {
    void fetch("/api/network-host")
      .then(async (response) => {
        const payload = (await response.json()) as { lanHost: string | null };
        setLanHost(payload.lanHost);
      })
      .catch(() => {
        setLanHost(null);
      });
  }, []);

  useEffect(() => {
    const handlePointerDown = () => {
      setContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setContextMenu(null);
      setConfirmEliminate(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!roomState || roomState.phase !== "lobby") {
      setContextMenu(null);
      setConfirmEliminate(null);
      return;
    }

    if (!contextMenu && !confirmEliminate) {
      return;
    }

    const activeIds = new Set(
      roomState.players
        .filter((player) => !player.isEliminated)
        .map((player) => player.id),
    );

    if (contextMenu && !activeIds.has(contextMenu.playerId)) {
      setContextMenu(null);
    }

    if (confirmEliminate && !activeIds.has(confirmEliminate.playerId)) {
      setConfirmEliminate(null);
    }
  }, [contextMenu, confirmEliminate, roomState]);

  const startGame = () => {
    if (!hostId) {
      setLocalError("找不到房主識別，請重新建立房間。");
      return;
    }

    setLocalError(null);
    socket.emit("start-game", { roomId });
  };

  const endGame = () => {
    if (!hostId) {
      setLocalError("找不到房主識別，請重新建立房間。");
      return;
    }

    setLocalError(null);
    socket.emit("end-game", { roomId });
  };

  const onLobbyPlayerContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    player: {
      id: string;
      displayName: string;
      isEliminated: boolean;
    },
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (player.isEliminated) {
      setContextMenu(null);
      return;
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      playerId: player.id,
      displayName: player.displayName,
      isEliminated: player.isEliminated,
    });
  };

  const emitEliminatePlayer = () => {
    if (!confirmEliminate) {
      return;
    }

    setLocalError(null);
    socket.emit("host-eliminate-player", {
      roomId,
      targetPlayerId: confirmEliminate.playerId,
    });
    setConfirmEliminate(null);
  };

  if (!roomState) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border-[3px] border-primary/15 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
          <p className="text-sm text-text-muted font-medium">
            載入房間狀態中...
          </p>
          {timedOut ? (
            <a
              className="mt-2 inline-block text-sm text-primary font-semibold underline hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 rounded transition-colors duration-150"
              href="/"
            >
              返回首頁
            </a>
          ) : null}
          {error ? (
            <p className="mt-2 text-sm text-error font-medium">{error}</p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background p-6">
      <PixiGameBackground intensity="medium" />
      <div className="relative z-10 mx-auto max-w-[1400px] space-y-4">
        <header className="rounded-2xl border-[3px] border-primary/15 bg-surface p-4 shadow-[0_3px_0_0_rgb(79_70_229/0.15)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cta font-display">
            房主畫面
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text font-display">
            {roomState.topic}
          </h1>
          <p className="mt-1 text-sm text-text-muted font-medium">
            房間 ID：{roomState.id} • {connected ? "已連線" : "重新連線中"}
          </p>
        </header>

        {roomState.phase === "lobby" ? (
          <div className="grid gap-4 lg:grid-cols-[2.4fr_1fr] xl:grid-cols-[2.7fr_1fr]">
            <section className="flex min-h-[72vh] flex-col rounded-2xl border-[3px] border-primary/15 bg-surface p-4 shadow-[0_3px_0_0_rgb(79_70_229/0.15)]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary font-display">
                玩家（{roomState.players.length}）
              </h2>
              <div className="mt-4 flex flex-1 flex-col">
                <LobbyPond
                  className="flex-1 min-h-[420px]"
                  players={roomState.players.map((player) => ({
                    id: player.id,
                    displayName: player.displayName,
                    avatarUrl: player.avatarUrl,
                    isEliminated: player.isEliminated,
                  }))}
                  onPlayerContextMenu={onLobbyPlayerContextMenu}
                />
                <button
                  className="mt-4 rounded-2xl bg-primary text-white px-4 py-3 text-sm font-bold border-[3px] border-primary shadow-[0_4px_0_0_rgb(79_70_229/0.8)] hover:shadow-[0_2px_0_0_rgb(79_70_229/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 font-display"
                  disabled={!allSubmitted}
                  onClick={startGame}
                  type="button"
                  aria-label="開始遊戲"
                >
                  開始遊戲
                </button>

                {localError ? (
                  <p className="mt-2 text-sm text-error font-medium">
                    {localError}
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-2 text-sm text-error font-medium">{error}</p>
                ) : null}
              </div>
            </section>

            <QRInvite joinUrl={joinUrl} />
          </div>
        ) : null}

        {contextMenu && roomState.phase === "lobby" ? (
          <div
            className="fixed z-40 min-w-[180px] rounded-2xl border-[3px] border-primary/25 bg-surface p-1 shadow-[0_6px_0_0_rgb(79_70_229/0.2)]"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-semibold text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:text-text-muted"
              disabled={contextMenu.isEliminated}
              onClick={() => {
                if (contextMenu.isEliminated) {
                  return;
                }

                setConfirmEliminate({
                  playerId: contextMenu.playerId,
                  displayName: contextMenu.displayName,
                });
                setContextMenu(null);
              }}
              type="button"
            >
              淘汰玩家
            </button>
          </div>
        ) : null}

        {confirmEliminate ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
            <div className="w-full max-w-sm rounded-2xl border-[3px] border-primary/20 bg-surface p-5 shadow-[0_6px_0_0_rgb(79_70_229/0.2)]">
              <h3 className="text-base font-bold text-text font-display">
                確認淘汰玩家
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                你確定要淘汰「{confirmEliminate.displayName}」嗎？
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="rounded-xl border-[3px] border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-text shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all hover:translate-y-[1px] hover:shadow-[0_1px_0_0_rgb(79_70_229/0.1)]"
                  onClick={() => {
                    setConfirmEliminate(null);
                  }}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="rounded-xl border-[3px] border-error bg-error px-3 py-2 text-sm font-bold text-white shadow-[0_3px_0_0_rgb(239_68_68/0.75)] transition-all hover:translate-y-[1px] hover:shadow-[0_2px_0_0_rgb(239_68_68/0.75)]"
                  onClick={emitEliminatePlayer}
                  type="button"
                >
                  確認淘汰
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {roomState.phase !== "lobby" ? (
          <section className="rounded-2xl border-[3px] border-primary/15 bg-surface p-4 shadow-[0_3px_0_0_rgb(79_70_229/0.15)]">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-text font-display">
                遊戲看板
              </h2>
              <motion.span
                className="game-turn-chip rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border-[2px] border-primary/20"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                目前回合：
                {roomState.players.find(
                  (p) => p.id === roomState.activePlayerId,
                )?.displayName ?? "-"}
              </motion.span>
              {roomState.phase === "game-over" ? (
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success border-[2px] border-success/30">
                  勝利者：
                  {roomState.players.find((p) => p.id === roomState.winnerId)
                    ?.displayName ?? "-"}
                </span>
              ) : null}
              {roomState.phase === "game-over" ? (
                <a
                  className="ml-auto inline-flex items-center rounded-2xl bg-primary text-white px-4 py-2 text-sm font-bold border-[3px] border-primary shadow-[0_4px_0_0_rgb(79_70_229/0.8)] hover:shadow-[0_2px_0_0_rgb(79_70_229/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 ease-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
                  href="/"
                  aria-label="再來一局，返回建立房間"
                >
                  再來一局
                </a>
              ) : null}
              {roomState.phase === "in-game" ? (
                <button
                  className="ml-auto rounded-2xl bg-error text-white px-4 py-2 text-sm font-bold border-[3px] border-error shadow-[0_4px_0_0_rgb(239_68_68/0.75)] hover:shadow-[0_2px_0_0_rgb(239_68_68/0.75)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 ease-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
                  onClick={endGame}
                  type="button"
                  aria-label="結束遊戲"
                >
                  結束遊戲
                </button>
              ) : null}
            </div>

            {localError ? (
              <p className="mb-3 text-sm text-error font-medium">
                {localError}
              </p>
            ) : null}
            {error ? (
              <p className="mb-3 text-sm text-error font-medium">{error}</p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {roomState.players.map((player) => {
                  const presence = getPresenceBadge(player.connectionStatus);

                  return (
                    <motion.article
                      className={`game-player-card rounded-2xl p-3 transition ${
                        roomState.activePlayerId === player.id
                          ? "game-player-card-active"
                          : ""
                      }`}
                      initial={{ opacity: 0, y: 12, scale: 0.985 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale:
                          roomState.activePlayerId === player.id ? 1.01 : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 24,
                      }}
                      whileTap={{ scale: 0.98 }}
                      key={player.id}
                      tabIndex={0}
                      aria-label={`${player.displayName}的遊戲狀態`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-bold text-text font-display">
                          {player.avatarUrl ? (
                            <Image
                              alt={`${player.displayName} 頭貼`}
                              className="h-7 w-7 rounded-full border-[2px] border-primary/20 object-cover"
                              src={player.avatarUrl}
                              unoptimized
                              width={28}
                              height={28}
                            />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border-[2px] border-primary/20">
                              ？
                            </span>
                          )}
                          {player.displayName}
                        </h3>
                        <span className={presence.className}>
                          {presence.label}
                        </span>
                      </div>
                      {player.isEliminated ? (
                        <p className="mb-2 text-xs font-bold text-error">
                          已淘汰
                        </p>
                      ) : null}

                      <WordBox
                        answer={hostState?.answers[player.id] ?? []}
                        fullyRevealed={Boolean(
                          hostState?.reveal.playerWordRevealed[player.id],
                        )}
                        guessedComponents={guessed}
                        showOnlyTone={false}
                        maskCharacter={roomState.phase !== "game-over"}
                      />
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
