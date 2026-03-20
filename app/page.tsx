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
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-text sm:p-10">
      <div className="mx-auto max-w-xl rounded-3xl border-[3px] border-primary/15 bg-surface p-6 shadow-[0_6px_0_0_rgb(79_70_229/0.15)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cta font-display">
          注音派對
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl font-display">
          建立房間
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          設定主題與字數，接著分享 QR Code 讓玩家加入。
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleCreateRoom}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">主題</span>
            <input
              className="w-full rounded-2xl border-[3px] border-primary/20 bg-surface px-4 py-3 text-text shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 focus:shadow-[0_3px_0_0_rgb(79_70_229/0.2)]"
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：台灣小吃"
              value={topic}
              type="text"
              inputMode="text"
              autoComplete="off"
              aria-label="房間主題"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold">題目字數</span>
            <select
              className="w-full rounded-2xl border-[3px] border-primary/20 bg-surface px-4 py-3 text-text shadow-[0_2px_0_0_rgb(79_70_229/0.1)] transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 focus:shadow-[0_3px_0_0_rgb(79_70_229/0.2)] cursor-pointer"
              onChange={(event) => setWordCount(Number(event.target.value))}
              value={wordCount}
              aria-label="題目字數"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>

          {error ? (
            <p
              className="rounded-2xl border-[3px] border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-primary text-white px-4 py-3 text-sm font-bold border-[3px] border-primary shadow-[0_4px_0_0_rgb(79_70_229/0.8)] hover:shadow-[0_2px_0_0_rgb(79_70_229/0.8)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all duration-150 ease-out disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 font-display"
            disabled={loading}
            type="submit"
            aria-live="polite"
          >
            {loading ? (
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
                建立中...
              </span>
            ) : (
              "建立房間"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
