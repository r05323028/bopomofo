"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { allGuessableSymbols } from "@/lib/game/constants";
import { getSocket } from "@/lib/socket";
import { useRoomState } from "@/lib/useRoomState";

type GuessMode = "component" | "answer";

export default function PlayPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const playerId =
    typeof window !== "undefined"
      ? sessionStorage.getItem(`bopomo.player.${roomId}`)
      : null;

  useEffect(() => {
    if (!playerId) {
      window.location.href = `/room/${roomId}/join`;
    }
  }, [playerId, roomId]);

  const { roomState, error } = useRoomState(roomId, playerId);
  const [mode, setMode] = useState<GuessMode>("component");
  const [guessWord, setGuessWord] = useState("");
  const [targetId, setTargetId] = useState("");

  const socket = getSocket();

  const guessed = useMemo(
    () => new Set(roomState?.reveal.guessedComponents ?? []),
    [roomState?.reveal.guessedComponents],
  );

  if (!roomState) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <p className="text-sm text-zinc-600">載入房間中...</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </main>
    );
  }

  const me = roomState.players.find((player) => player.id === playerId);
  const isMyTurn = roomState.activePlayerId === playerId;
  const targets = roomState.players.filter(
    (player) => player.id !== playerId && !player.isEliminated,
  );

  if (!me) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          玩家識別無效，請重新加入房間。
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            玩家畫面
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">
            {roomState.topic}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {roomState.phase === "in-game"
              ? isMyTurn
                ? "輪到你"
                : `等待 ${
                    roomState.players.find(
                      (player) => player.id === roomState.activePlayerId,
                    )?.displayName ?? "下一位玩家"
                  }...`
              : roomState.phase === "game-over"
                ? "遊戲結束"
                : "等待房主開始遊戲..."}
          </p>
        </header>

        {me.isEliminated ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            你已被淘汰。
          </div>
        ) : null}

        {roomState.phase === "in-game" && isMyTurn && !me.isEliminated ? (
          <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex gap-2">
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  mode === "component"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
                onClick={() => setMode("component")}
                type="button"
              >
                猜注音符號
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  mode === "answer"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
                onClick={() => setMode("answer")}
                type="button"
              >
                猜完整答案
              </button>
            </div>

            {mode === "component" ? (
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
                {allGuessableSymbols.map((symbol) => {
                  const isToneSymbol =
                    symbol === "ˊ" ||
                    symbol === "ˇ" ||
                    symbol === "ˋ" ||
                    symbol === "˙";
                  const display = symbol === "1" ? "一聲" : symbol;
                  const disabled = guessed.has(symbol);

                  return (
                    <button
                      className={`rounded-lg border px-2 py-2 text-sm font-semibold ${
                        disabled
                          ? "border-zinc-200 bg-zinc-100 text-zinc-400"
                          : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                      }`}
                      disabled={disabled}
                      key={symbol}
                      onClick={() => {
                        socket.emit("component-guess", {
                          roomId,
                          symbol,
                        });
                      }}
                      type="button"
                    >
                      {isToneSymbol ? (
                        <span className="tone-glyph">{display}</span>
                      ) : (
                        display
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  socket.emit("answer-guess", {
                    roomId,
                    targetId,
                    word: guessWord,
                  });
                  setGuessWord("");
                }}
              >
                <label className="block space-y-1">
                  <span className="text-sm font-medium">目標玩家</span>
                  <select
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                    onChange={(event) => setTargetId(event.target.value)}
                    required
                    value={targetId}
                  >
                    <option value="">選擇目標</option>
                    {targets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">答案猜測</span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                    onChange={(event) => setGuessWord(event.target.value)}
                    required
                    value={guessWord}
                  />
                </label>

                <button
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                  type="submit"
                >
                  送出答案猜測
                </button>
              </form>
            )}
          </section>
        ) : null}

        {roomState.phase === "game-over" ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            勝利者：
            {
              roomState.players.find(
                (player) => player.id === roomState.winnerId,
              )?.displayName
            }
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
