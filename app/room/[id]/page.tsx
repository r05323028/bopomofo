"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-600">載入房間狀態中...</p>
          {timedOut ? (
            <a
              className="mt-2 inline-block text-sm text-zinc-900 underline"
              href="/"
            >
              返回首頁
            </a>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            房主畫面
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            {roomState.topic}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            房間 ID：{roomState.id} • {connected ? "已連線" : "重新連線中"}
          </p>
        </header>

        {roomState.phase === "lobby" ? (
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                玩家（{roomState.players.length}）
              </h2>
              <ul className="mt-3 space-y-2">
                {roomState.players.map((player) => (
                  <li
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
                    key={player.id}
                  >
                    <span className="font-medium text-zinc-900">
                      {player.displayName}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        player.hasSubmitted
                          ? "text-emerald-700"
                          : "text-zinc-500"
                      }`}
                    >
                      {player.hasSubmitted ? "已送出" : "等待中"}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={!allSubmitted}
                onClick={startGame}
                type="button"
              >
                開始遊戲
              </button>

              {localError ? (
                <p className="mt-2 text-sm text-red-600">{localError}</p>
              ) : null}
              {error ? (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              ) : null}
            </section>

            <QRInvite joinUrl={joinUrl} />
          </div>
        ) : null}

        {roomState.phase !== "lobby" ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">遊戲看板</h2>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                目前回合：
                {roomState.players.find(
                  (p) => p.id === roomState.activePlayerId,
                )?.displayName ?? "-"}
              </span>
              {roomState.phase === "game-over" ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  勝利者：
                  {roomState.players.find((p) => p.id === roomState.winnerId)
                    ?.displayName ?? "-"}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {roomState.players.map((player) => (
                <article
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                  key={player.id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">
                      {player.displayName}
                    </h3>
                    {player.isEliminated ? (
                      <span className="text-xs font-semibold text-red-700">
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
                    showOnlyTone={!player.isEliminated}
                  />
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
