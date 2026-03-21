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
const avatarMaxEdge = 160;
const avatarQuality = 0.78;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("頭貼讀取失敗。"));
    };
    reader.onerror = () => {
      reject(new Error("頭貼讀取失敗。"));
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("頭貼載入失敗。"));
    };
    image.src = dataUrl;
  });
}

async function compressAvatar(file: File): Promise<string> {
  const sourceDataUrl = await fileToDataUrl(file);
  const image = await dataUrlToImage(sourceDataUrl);

  const largestEdge = Math.max(image.width, image.height);
  const scale = largestEdge > avatarMaxEdge ? avatarMaxEdge / largestEdge : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  const compressed = canvas.toDataURL("image/jpeg", avatarQuality);

  return compressed.length < sourceDataUrl.length ? compressed : sourceDataUrl;
}

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
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border-[3px] border-primary/15 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
          <p className="text-sm text-text-muted font-medium flex items-center gap-2">
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
          </p>
        </div>
      </main>
    );
  }

  if (!roomInfo) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div
          className="mx-auto max-w-3xl rounded-2xl border-[3px] border-error/30 bg-error/10 p-4 text-error font-medium"
          role="alert"
        >
          {error ?? "找不到房間。"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border-[3px] border-primary/15 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cta font-display">
          加入房間
        </p>
        <h1 className="mt-2 text-2xl font-bold text-text font-display">
          {roomInfo.topic}
        </h1>
        <p className="mt-1 text-sm text-text-muted font-medium">
          題目字數：{roomInfo.wordCount}
        </p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">玩家名稱</span>
            <input
              className="w-full rounded-2xl border-[3px] border-primary/20 bg-surface px-4 py-3 text-text shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 focus:shadow-[0_3px_0_0_rgb(79_70_229/0.2)]"
              onChange={(event) => setName(event.target.value)}
              value={name}
              type="text"
              inputMode="text"
              autoComplete="name"
              aria-label="玩家名稱"
              placeholder="請輸入您的名字"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">頭貼（可選）</span>
            <input
              accept="image/*"
              className="w-full rounded-2xl border-[3px] border-primary/20 bg-surface px-4 py-3 text-sm shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 focus:shadow-[0_3px_0_0_rgb(79_70_229/0.2)] cursor-pointer file:mr-2 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setAvatarUrl(null);
                  return;
                }

                void compressAvatar(file)
                  .then((result) => {
                    setAvatarUrl(result);
                  })
                  .catch(() => {
                    setError("頭貼處理失敗，請重新選擇圖片。");
                  });
              }}
              type="file"
              aria-label="上傳頭貼圖片"
            />
            {avatarUrl ? (
              <Image
                alt="頭貼預覽"
                className="mt-2 h-12 w-12 rounded-full border-[3px] border-primary/20 object-cover"
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
            <p
              className="rounded-2xl border-[3px] border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-primary text-white px-4 py-3 text-sm font-bold border-[3px] border-primary shadow-[0_4px_0_0_rgb(79_70_229/0.8)] hover:shadow-[0_2px_0_0_rgb(79_70_229/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 font-display"
            disabled={submitting}
            type="submit"
            aria-live="polite"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
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
                加入中...
              </span>
            ) : (
              "加入遊戲"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
