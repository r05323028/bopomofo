"use client";

import QRCode from "react-qr-code";

type QRInviteProps = {
  joinUrl: string;
};

export function QRInvite({ joinUrl }: Readonly<QRInviteProps>) {
  return (
    <div className="rounded-2xl border-[3px] border-primary/20 bg-surface p-6 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
      <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide text-text">
        邀請玩家
      </h2>
      <div className="mx-auto max-w-48 rounded-2xl border-[3px] border-primary/10 bg-surface p-3 shadow-[0_2px_0_0_rgb(79_70_229/0.1)]">
        <QRCode
          size={256}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          title="掃描加入房間"
          value={joinUrl}
          viewBox="0 0 256 256"
        />
      </div>
      <p className="mt-3 break-all text-xs text-text-muted">{joinUrl}</p>
    </div>
  );
}
