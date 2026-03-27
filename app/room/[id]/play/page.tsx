"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PixiGameBackground } from "@/components/PixiGameBackground";
import { WordBox } from "@/components/WordBox";
import { allGuessableSymbols } from "@/lib/game/constants";
import type { PlayerAnswer, PlayerRoomState } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";
import { useRoomState } from "@/lib/useRoomState";

type GuessMode = "component" | "answer";

function getPresenceText(status: "connected" | "reconnecting" | "offline") {
  if (status === "connected") {
    return "在線";
  }

  if (status === "reconnecting") {
    return "重連中";
  }

  return "離線";
}

function getPresenceClass(status: "connected" | "reconnecting" | "offline") {
  if (status === "connected") {
    return "text-success";
  }

  if (status === "reconnecting") {
    return "text-amber-600";
  }

  return "text-text-muted";
}

function isPlayerRoomState(state: unknown): state is PlayerRoomState {
  return Boolean(state && typeof state === "object" && "ownAnswer" in state);
}

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
  const playerState = isPlayerRoomState(roomState) ? roomState : null;
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);

  const boardCards = useMemo(() => {
    if (!playerState) {
      return [];
    }

    return (roomState?.players ?? []).map((player) => {
      const isSelf = player.id === playerId;

      return {
        id: player.id,
        displayName: isSelf
          ? `${player.displayName}（你）`
          : player.displayName,
        isSelf,
        isEliminated: player.isEliminated,
        connectionStatus: player.connectionStatus,
        avatarUrl: player.avatarUrl,
        isCurrentTurn: roomState?.activePlayerId === player.id,
        answer: isSelf
          ? playerState.ownAnswer
          : (playerState.publicBoards?.[player.id] ?? []),
        fullyRevealed: isSelf
          ? true
          : Boolean(playerState.reveal.playerWordRevealed?.[player.id]),
      };
    });
  }, [playerId, playerState, roomState?.activePlayerId, roomState?.players]);

  const placeholderAnswer = useMemo<PlayerAnswer>(() => {
    const rowCount = roomState?.wordCount ?? 0;

    return Array.from({ length: rowCount }, () => ({
      character: "?",
      initial: null,
      medial: null,
      final: null,
      topTone: null,
      tone: null,
    }));
  }, [roomState?.wordCount]);

  const scrollToBoard = useCallback(
    (nextIndex: number) => {
      const container = carouselRef.current;
      if (!container || boardCards.length === 0) {
        return;
      }

      const bounded = Math.min(Math.max(nextIndex, 0), boardCards.length - 1);
      container.scrollTo({
        left: bounded * container.clientWidth,
        behavior: "smooth",
      });
      setActiveBoardIndex(bounded);
    },
    [boardCards.length],
  );

  const handleCarouselScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container || boardCards.length === 0) {
      return;
    }

    const nextIndex = Math.round(container.scrollLeft / container.clientWidth);
    const bounded = Math.min(Math.max(nextIndex, 0), boardCards.length - 1);
    setActiveBoardIndex(bounded);
  }, [boardCards.length]);

  useEffect(() => {
    setActiveBoardIndex((current) => {
      if (boardCards.length === 0) {
        return 0;
      }

      return Math.min(current, boardCards.length - 1);
    });
  }, [boardCards.length]);

  if (!roomState) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          載入房間中...
        </div>
        {error ? (
          <p className="mt-2 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
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
      <main className="min-h-screen bg-background p-6">
        <div
          className="rounded-2xl border-[3px] border-error/20 bg-error/10 p-4 text-sm text-error shadow-[0_2px_0_0_rgb(239_68_68/0.1)]"
          role="alert"
        >
          玩家識別無效,請重新加入房間。
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background p-6">
      <PixiGameBackground intensity="high" />
      <div className="relative z-10 mx-auto max-w-3xl space-y-4">
        <header className="rounded-2xl border-[3px] border-primary/20 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            玩家畫面
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold text-text">
            {roomState.topic}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
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
          <p className="mt-1 text-xs font-semibold text-text-muted">
            連線狀態：{getPresenceText(me.connectionStatus)}
          </p>
        </header>

        {me.isEliminated ? (
          <div
            className="rounded-2xl border-[3px] border-error/20 bg-error/10 p-4 text-sm text-error shadow-[0_2px_0_0_rgb(239_68_68/0.1)]"
            role="alert"
          >
            你已被淘汰。
          </div>
        ) : null}

        {playerState ? (
          <section className="rounded-2xl border-[3px] border-primary/20 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                玩家狀態
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="cursor-pointer rounded-xl border-[3px] border-primary/20 bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 ease-out hover:shadow-[0_1px_0_0_rgb(79_70_229/0.1)] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={activeBoardIndex <= 0}
                  onClick={() => {
                    scrollToBoard(activeBoardIndex - 1);
                  }}
                  type="button"
                  aria-label="查看上一位玩家狀態"
                >
                  上一位
                </button>
                <button
                  className="cursor-pointer rounded-xl border-[3px] border-primary/20 bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 ease-out hover:shadow-[0_1px_0_0_rgb(79_70_229/0.1)] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={activeBoardIndex >= boardCards.length - 1}
                  onClick={() => {
                    scrollToBoard(activeBoardIndex + 1);
                  }}
                  type="button"
                  aria-label="查看下一位玩家狀態"
                >
                  下一位
                </button>
              </div>
            </div>

            <div
              className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              onScroll={handleCarouselScroll}
              ref={carouselRef}
            >
              {boardCards.map((card) => (
                <article
                  className="min-w-full snap-center rounded-2xl border-[3px] border-primary/15 bg-surface p-3 shadow-[0_3px_0_0_rgb(79_70_229/0.15)]"
                  key={card.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {card.avatarUrl ? (
                        <Image
                          alt={`${card.displayName} 頭貼`}
                          className="h-8 w-8 rounded-full border-[2px] border-primary/20 object-cover"
                          src={card.avatarUrl}
                          unoptimized
                          width={32}
                          height={32}
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                          ？
                        </span>
                      )}
                      <p className="text-2xl font-black text-text font-display">
                        {card.displayName}
                      </p>
                    </div>

                    <span
                      className={`text-3xl font-black font-display ${getPresenceClass(
                        card.connectionStatus,
                      )}`}
                    >
                      {getPresenceText(card.connectionStatus)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {card.isCurrentTurn ? (
                      <span className="rounded-full border-[2px] border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        目前回合
                      </span>
                    ) : null}
                    {card.isEliminated ? (
                      <span className="rounded-full border-[2px] border-error/30 bg-error/10 px-2 py-0.5 text-xs font-bold text-error">
                        已淘汰
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-2xl border-[3px] border-primary/20 bg-primary/5 p-3">
                    <WordBox
                      answer={
                        card.answer.length > 0 ? card.answer : placeholderAnswer
                      }
                      fullyRevealed={card.fullyRevealed}
                      guessedComponents={guessed}
                      showOnlyTone={false}
                      maskCharacter={!card.isSelf && !card.fullyRevealed}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-2 flex justify-center gap-1.5">
              {boardCards.map((card, index) => (
                <button
                  className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${
                    index === activeBoardIndex ? "bg-primary" : "bg-primary/20"
                  }`}
                  key={card.id}
                  onClick={() => {
                    scrollToBoard(index);
                  }}
                  type="button"
                  aria-label={`切換到 ${card.displayName}`}
                />
              ))}
            </div>
          </section>
        ) : null}

        {roomState.phase === "in-game" && !me.isEliminated ? (
          <section className="space-y-4 rounded-2xl border-[3px] border-primary/20 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
            {isMyTurn ? (
              <>
                <div className="flex gap-2">
                  <motion.button
                    className={`cursor-pointer rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-150 ease-out ${
                      mode === "component"
                        ? "bg-primary text-white border-[3px] border-primary shadow-[0_4px_0_0_rgb(79_70_229/0.8)] hover:shadow-[0_2px_0_0_rgb(79_70_229/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                        : "bg-surface text-text border-[3px] border-primary/20 shadow-[0_2px_0_0_rgb(79_70_229/0.1)] hover:shadow-[0_1px_0_0_rgb(79_70_229/0.1)] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px]"
                    } focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2`}
                    onClick={() => setMode("component")}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    aria-label="切換到猜注音符號模式"
                  >
                    猜注音符號
                  </motion.button>
                  <motion.button
                    className={`cursor-pointer rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-150 ease-out ${
                      mode === "answer"
                        ? "bg-primary text-white border-[3px] border-primary shadow-[0_4px_0_0_rgb(79_70_229/0.8)] hover:shadow-[0_2px_0_0_rgb(79_70_229/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
                        : "bg-surface text-text border-[3px] border-primary/20 shadow-[0_2px_0_0_rgb(79_70_229/0.1)] hover:shadow-[0_1px_0_0_rgb(79_70_229/0.1)] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px]"
                    } focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2`}
                    onClick={() => setMode("answer")}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    aria-label="切換到猜完整答案模式"
                  >
                    猜完整答案
                  </motion.button>
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
                        <motion.button
                          className={`flex items-center justify-center rounded-2xl border-[3px] px-2 py-2 text-center text-sm font-semibold transition-all duration-150 ease-out ${
                            disabled
                              ? "border-primary/10 bg-primary/5 text-text-muted cursor-not-allowed"
                              : "cursor-pointer border-primary/30 bg-surface text-text shadow-[0_2px_0_0_rgb(79_70_229/0.2)] hover:shadow-[0_1px_0_0_rgb(79_70_229/0.2)] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
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
                          whileTap={disabled ? undefined : { scale: 0.97 }}
                          aria-label={`猜注音符號 ${display}`}
                        >
                          {isToneSymbol ? (
                            <span className="tone-glyph">{display}</span>
                          ) : (
                            display
                          )}
                        </motion.button>
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
                      <span className="text-sm font-semibold text-text">
                        目標玩家
                      </span>
                      <select
                        className="w-full cursor-pointer rounded-2xl border-[3px] border-primary/20 bg-surface px-4 py-3 shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
                        onChange={(event) => setTargetId(event.target.value)}
                        required
                        value={targetId}
                        aria-label="選擇目標玩家"
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
                      <span className="text-sm font-semibold text-text">
                        答案猜測
                      </span>
                      <input
                        className="w-full rounded-2xl border-[3px] border-primary/20 bg-surface px-4 py-3 shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"
                        onChange={(event) => setGuessWord(event.target.value)}
                        required
                        value={guessWord}
                        inputMode="text"
                        autoComplete="off"
                        aria-label="輸入答案猜測"
                      />
                    </label>

                    <button
                      className="cursor-pointer rounded-2xl bg-cta text-white px-4 py-3 text-sm font-bold border-[3px] border-cta shadow-[0_4px_0_0_rgb(249_115_22/0.8)] hover:shadow-[0_2px_0_0_rgb(249_115_22/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      type="submit"
                      aria-label="送出答案猜測"
                    >
                      送出答案猜測
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl border-[3px] border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-text-muted">
                  目前是其他玩家回合，以下顯示已猜過/尚未猜過的注音進度。
                </div>

                <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
                  {allGuessableSymbols.map((symbol) => {
                    const isToneSymbol =
                      symbol === "ˊ" ||
                      symbol === "ˇ" ||
                      symbol === "ˋ" ||
                      symbol === "˙";
                    const display = symbol === "1" ? "一聲" : symbol;
                    const guessedAlready = guessed.has(symbol);

                    return (
                      <div
                        className={`flex items-center justify-center rounded-2xl border-[3px] px-2 py-2 text-center text-sm font-semibold transition-all duration-150 ease-out ${
                          guessedAlready
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-primary/20 bg-surface text-text-muted"
                        }`}
                        key={symbol}
                        title={`注音符號 ${display} ${guessedAlready ? "已猜過" : "未猜過"}`}
                      >
                        {isToneSymbol ? (
                          <span className="tone-glyph">{display}</span>
                        ) : (
                          display
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        ) : null}

        {roomState.phase === "game-over" ? (
          <section className="rounded-2xl border-[3px] border-success/20 bg-success/10 p-6 text-success shadow-[0_2px_0_0_rgb(16_185_129/0.1)]">
            <span className="font-bold">勝利者：</span>
            {
              roomState.players.find(
                (player) => player.id === roomState.winnerId,
              )?.displayName
            }
          </section>
        ) : null}

        {error ? (
          <div
            className="rounded-2xl border-[3px] border-error/20 bg-error/10 p-4 text-sm text-error shadow-[0_2px_0_0_rgb(239_68_68/0.1)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
