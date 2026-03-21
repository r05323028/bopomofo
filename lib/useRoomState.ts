"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicRoomState } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";

type UseRoomStateResult = {
  roomState: PublicRoomState | null;
  error: string | null;
  connected: boolean;
};

type ComponentGuessedPayload = {
  symbol: string;
  guessedComponents: string[];
};

type TurnStartedPayload = {
  activePlayerId: string | null;
};

type PlayerJoinedPayload = {
  player: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isEliminated: boolean;
    hasSubmitted: boolean;
    joinedAt: number;
    connectionStatus: "connected" | "reconnecting" | "offline";
    disconnectedAt: number | null;
  };
};

type AnswerSubmittedPayload = {
  playerId: string;
};

type PresenceChangedPayload = {
  playerId: string;
  status: "connected" | "reconnecting" | "offline";
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

    const handleComponentGuessed = (payload: ComponentGuessedPayload) => {
      setRoomState((current) => {
        if (!current) {
          return current;
        }

        if ("ownAnswer" in current) {
          return {
            ...current,
            reveal: {
              guessedComponents: payload.guessedComponents,
            },
          };
        }

        return {
          ...current,
          reveal: {
            ...current.reveal,
            guessedComponents: payload.guessedComponents,
          },
        };
      });
    };

    const handleTurnStarted = (payload: TurnStartedPayload) => {
      setRoomState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          activePlayerId: payload.activePlayerId,
        };
      });
    };

    const handlePlayerJoined = (payload: PlayerJoinedPayload) => {
      setRoomState((current) => {
        if (!current) {
          return current;
        }

        if (current.players.some((player) => player.id === payload.player.id)) {
          return current;
        }

        return {
          ...current,
          players: [...current.players, payload.player],
        };
      });
    };

    const handleAnswerSubmitted = (payload: AnswerSubmittedPayload) => {
      setRoomState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          players: current.players.map((player) => {
            if (player.id !== payload.playerId) {
              return player;
            }

            return {
              ...player,
              hasSubmitted: true,
            };
          }),
        };
      });
    };

    const handlePresenceChanged = (payload: PresenceChangedPayload) => {
      setRoomState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          players: current.players.map((player) => {
            if (player.id !== payload.playerId) {
              return player;
            }

            return {
              ...player,
              connectionStatus: payload.status,
            };
          }),
        };
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("error", handleError);
    socket.on("room-state", handleRoomState);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("answer-submitted", handleAnswerSubmitted);
    socket.on("game-started", rejoin);
    socket.on("turn-started", handleTurnStarted);
    socket.on("component-guessed", handleComponentGuessed);
    socket.on("answer-guessed", rejoin);
    socket.on("player-eliminated", rejoin);
    socket.on("player-presence-changed", handlePresenceChanged);
    socket.on("game-over", rejoin);
    rejoin();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("error", handleError);
      socket.off("room-state", handleRoomState);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("answer-submitted", handleAnswerSubmitted);
      socket.off("game-started", rejoin);
      socket.off("turn-started", handleTurnStarted);
      socket.off("component-guessed", handleComponentGuessed);
      socket.off("answer-guessed", rejoin);
      socket.off("player-eliminated", rejoin);
      socket.off("player-presence-changed", handlePresenceChanged);
      socket.off("game-over", rejoin);
    };
  }, [playerId, roomId, socket]);

  return { roomState, error, connected };
}
