"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { WordInput } from "@/components/WordInput";
import type { PlayerAnswer, RoomPhase } from "@/lib/game/types";

type RoomInfo = {
  id: string;
  topic: string;
  wordCount: number;
  phase: RoomPhase;
  players?: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    hasSubmitted: boolean;
    isEliminated: boolean;
  }>;
};

const emptyAnswer: PlayerAnswer = [];

export default function JoinRoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [answer, setAnswer] = useState<PlayerAnswer>(emptyAnswer);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/rooms/${roomId}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as
          | RoomInfo
          | { message: string };
        if (!response.ok || !("id" in payload)) {
          throw new Error(
            "message" in payload ? payload.message : "找不到房間。",
          );
        }

        if (payload.phase !== "lobby") {
          throw new Error("遊戲已經開始。");
        }

        setRoomInfo(payload);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError("載入房間失敗。");
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [roomId]);

  const validateRows = (): number[] => {
    return answer.reduce<number[]>((rows, cell, index) => {
      const charCount = Array.from(cell.character.trim()).length;
      if (charCount !== 1) {
        rows.push(index + 1);
      }
      return rows;
    }, []);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!roomInfo) {
      return;
    }

    if (!name.trim()) {
      setError("請輸入玩家名稱。");
      return;
    }

    const incompleteRows = validateRows();
    if (answer.length !== roomInfo.wordCount || incompleteRows.length > 0) {
      setError(
        `每一列都必須「剛好一個字」（第 ${incompleteRows.join(", ")} 列）。`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: name, avatarUrl, answer }),
      });

      const payload = (await response.json()) as
        | { playerId: string }
        | { message: string; incompleteRows?: number[] };

      if (!response.ok || !("playerId" in payload)) {
        if ("incompleteRows" in payload && payload.incompleteRows?.length) {
          setError(
            `每一列都必須剛好輸入一個字（第 ${payload.incompleteRows.join(", ")} 列）。`,
          );
        } else {
          setError("message" in payload ? payload.message : "加入房間失敗。");
        }
        return;
      }

      sessionStorage.setItem(`bopomo.player.${roomId}`, payload.playerId);
      window.location.href = `/room/${roomId}/play`;
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("加入房間失敗。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <p className="mx-auto max-w-3xl text-sm text-zinc-600">載入房間中...</p>
      </main>
    );
  }

  if (!roomInfo) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error ?? "找不到房間。"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          加入房間
        </p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">
          {roomInfo.topic}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          題目字數：{roomInfo.wordCount}
        </p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">玩家名稱</span>
            <input
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">頭貼（可選）</span>
            <input
              accept="image/*"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setAvatarUrl(null);
                  return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    setAvatarUrl(reader.result);
                  }
                };
                reader.readAsDataURL(file);
              }}
              type="file"
            />
            {avatarUrl ? (
              <Image
                alt="頭貼預覽"
                className="mt-2 h-12 w-12 rounded-full border border-zinc-200 object-cover"
                src={avatarUrl}
                unoptimized
                width={48}
                height={48}
              />
            ) : null}
          </label>

          <WordInput
            onChange={setAnswer}
            value={answer}
            wordCount={roomInfo.wordCount}
          />

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "加入中..." : "加入遊戲"}
          </button>
        </form>
      </div>
    </main>
  );
}
