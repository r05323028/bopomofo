"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type LobbyPondPlayer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type LobbyPondProps = {
  players: LobbyPondPlayer[];
};

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededUnit(seed: number, salt: number): number {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function positionFor(index: number, total: number): { x: number; y: number } {
  if (total <= 1) {
    return { x: 50, y: 50 };
  }

  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const ring = index % 2 === 0 ? 34 : 24;
  const x = 50 + Math.cos(angle) * ring;
  const y = 50 + Math.sin(angle) * ring * 0.75;

  return {
    x: Math.max(10, Math.min(90, x)),
    y: Math.max(12, Math.min(88, y)),
  };
}

export function LobbyPond({ players }: Readonly<LobbyPondProps>) {
  return (
    <div className="lobby-pond relative mt-4 h-72 overflow-hidden rounded-3xl border-[3px] border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/15 to-primary/5 p-4 shadow-[0_4px_0_0_rgb(79_70_229/0.15)]">
      <div className="lobby-pond-ripple lobby-pond-ripple-a" />
      <div className="lobby-pond-ripple lobby-pond-ripple-b" />
      <div className="lobby-pond-ripple lobby-pond-ripple-c" />

      {players.length === 0 ? (
        <div className="relative z-10 flex h-full items-center justify-center rounded-2xl border-[2px] border-dashed border-primary/30 bg-surface/40 text-sm font-bold text-primary font-display">
          等待玩家加入池塘...
        </div>
      ) : null}

      {players.map((player, index) => {
        const { x, y } = positionFor(index, players.length);
        const seed = hashString(`${player.id}-${index}`);

        const driftX1 = (seededUnit(seed, 1) - 0.5) * 14;
        const driftX2 = (seededUnit(seed, 2) - 0.5) * 18;
        const driftX3 = (seededUnit(seed, 3) - 0.5) * 12;

        const driftY1 = -(8 + seededUnit(seed, 4) * 8);
        const driftY2 = 4 + seededUnit(seed, 5) * 8;
        const driftY3 = -(3 + seededUnit(seed, 6) * 7);

        const tiltA = (seededUnit(seed, 7) - 0.5) * 3.2;
        const tiltB = (seededUnit(seed, 8) - 0.5) * 4.4;
        const tiltC = (seededUnit(seed, 9) - 0.5) * 3.2;

        const duration = 5.6 + seededUnit(seed, 10) * 4.8;
        const delay = seededUnit(seed, 11) * 0.9;

        return (
          <motion.div
            className="absolute z-10"
            initial={false}
            animate={{
              scale: 1,
              y: [0, driftY1, driftY2, driftY3, 0],
              x: [0, driftX1, driftX2, driftX3, 0],
              rotate: [0, tiltA, tiltB, tiltC, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            key={player.id}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <motion.div
              className="rounded-2xl border-[3px] border-primary/30 bg-surface/90 px-3 py-2 shadow-[0_3px_0_0_rgb(79_70_229/0.2)] backdrop-blur-sm cursor-pointer transition-all duration-150"
              whileTap={{ scale: 0.95, y: 2 }}
            >
              <div className="flex items-center gap-2">
                {player.avatarUrl ? (
                  <Image
                    alt={`${player.displayName} 頭貼`}
                    className="h-11 w-11 rounded-full border-[3px] border-primary/20 object-cover"
                    src={player.avatarUrl}
                    unoptimized
                    width={44}
                    height={44}
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-primary/20 bg-primary/10 text-sm font-bold text-primary font-display">
                    ？
                  </span>
                )}
                <span className="max-w-36 truncate text-base font-extrabold text-text font-display">
                  {player.displayName}
                </span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
