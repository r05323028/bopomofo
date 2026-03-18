"use client";

import QRCode from "react-qr-code";

type QRInviteProps = {
  joinUrl: string;
};

export function QRInvite({ joinUrl }: Readonly<QRInviteProps>) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
        邀請玩家
      </h2>
      <div className="mx-auto max-w-48 rounded-xl bg-white p-3">
        <QRCode
          size={256}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          title="掃描加入房間"
          value={joinUrl}
          viewBox="0 0 256 256"
        />
      </div>
      <p className="mt-3 break-all text-xs text-zinc-600">{joinUrl}</p>
    </div>
  );
}
