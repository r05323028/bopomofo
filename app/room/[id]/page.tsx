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

  const allSubmitted = roomState?.players.length
    ? roomState.players.every((player) => player.hasSubmitted)
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

  const startGame = () => {
    if (!hostId) {
      setLocalError("找不到房主識別，請重新建立房間。");
      return;
    }

    setLocalError(null);
    socket.emit("start-game", { roomId });
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
      <div className="relative z-10 mx-auto max-w-6xl space-y-4">
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
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border-[3px] border-primary/15 bg-surface p-4 shadow-[0_3px_0_0_rgb(79_70_229/0.15)]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary font-display">
                玩家（{roomState.players.length}）
              </h2>
              <LobbyPond
                players={roomState.players.map((player) => ({
                  id: player.id,
                  displayName: player.displayName,
                  avatarUrl: player.avatarUrl,
                }))}
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
            </section>

            <QRInvite joinUrl={joinUrl} />
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {roomState.players.map((player) => (
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
                      scale: roomState.activePlayerId === player.id ? 1.01 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 280, damping: 24 }}
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
                      {player.isEliminated ? (
                        <span className="text-xs font-bold text-error">
                          已淘汰
                        </span>
                      ) : null}
                    </div>

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
                ))}
              </AnimatePresence>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
