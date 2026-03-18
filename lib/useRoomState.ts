"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicRoomState } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";

type UseRoomStateResult = {
  roomState: PublicRoomState | null;
  error: string | null;
  connected: boolean;
};

export function useRoomState(
  roomId: string,
  playerId: string | null,
): UseRoomStateResult {
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    const rejoin = () => {
      socket.emit("join-room", { roomId, playerId });
    };

    const handleConnect = () => {
      setConnected(true);
      rejoin();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleError = (payload: { message: string }) => {
      setError(payload.message);
    };

    const handleRoomState = (payload: PublicRoomState) => {
      setRoomState(payload);
      setError(null);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("error", handleError);
    socket.on("room-state", handleRoomState);
    socket.on("player-joined", rejoin);
    socket.on("answer-submitted", rejoin);
    socket.on("game-started", rejoin);
    socket.on("turn-started", rejoin);
    socket.on("component-guessed", rejoin);
    socket.on("answer-guessed", rejoin);
    socket.on("player-eliminated", rejoin);
    socket.on("game-over", rejoin);
    rejoin();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("error", handleError);
      socket.off("room-state", handleRoomState);
      socket.off("player-joined", rejoin);
      socket.off("answer-submitted", rejoin);
      socket.off("game-started", rejoin);
      socket.off("turn-started", rejoin);
      socket.off("component-guessed", rejoin);
      socket.off("answer-guessed", rejoin);
      socket.off("player-eliminated", rejoin);
      socket.off("game-over", rejoin);
    };
  }, [playerId, roomId, socket]);

  return { roomState, error, connected };
}
