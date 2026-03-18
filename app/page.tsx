"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!topic.trim()) {
      setError("請輸入主題。");
      return;
    }

    if (wordCount < 1 || wordCount > 4) {
      setError("字數必須介於 1 到 4。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: topic.trim(), wordCount }),
      });

      const payload = (await response.json()) as
        | { roomId: string; hostId: string }
        | { message: string };

      if (!response.ok || !("roomId" in payload) || !("hostId" in payload)) {
        setError("message" in payload ? payload.message : "建立房間失敗。");
        return;
      }

      sessionStorage.setItem(`bopomo.host.${payload.roomId}`, payload.hostId);
      window.location.href = `/room/${payload.roomId}`;
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("建立房間失敗。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-amber-50 via-white to-sky-50 p-6 text-zinc-900 sm:p-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-lg backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          注音派對
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          建立房間
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          設定主題與字數，接著分享 QR Code 讓玩家加入。
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleCreateRoom}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">主題</span>
            <input
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：台灣小吃"
              value={topic}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">題目字數</span>
            <select
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
              onChange={(event) => setWordCount(Number(event.target.value))}
              value={wordCount}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "建立中..." : "建立房間"}
          </button>
        </form>
      </div>
    </main>
  );
}
