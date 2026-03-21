import type { Server, Socket } from "socket.io";
import { allGuessableSymbols, reconnectGraceMs } from "./constants";
import { gameRoomManager } from "./roomManager";

type JoinRoomPayload = {
  roomId: string;
  playerId?: string;
};

type StartGamePayload = {
  roomId: string;
};

type EndGamePayload = {
  roomId: string;
};

type HostEliminatePlayerPayload = {
  roomId: string;
  targetPlayerId: string;
};

type ComponentGuessPayload = {
  roomId: string;
  symbol: string;
};

type AnswerGuessPayload = {
  roomId: string;
  targetId: string;
  word: string;
};

function emitError(socket: Socket, message: string): void {
  socket.emit("error", { message });
}

export function registerSocketHandlers(io: Server): void {
  const activeSocketByPlayer = new Map<string, string>();
  const offlineTimers = new Map<string, NodeJS.Timeout>();

  const toPlayerKey = (roomId: string, playerId: string) =>
    `${roomId}:${playerId}`;

  const emitPresenceChanged = (roomId: string, playerId: string) => {
    const room = gameRoomManager.getRoom(roomId);
    const player = room?.players.find((entry) => entry.id === playerId);
    if (!player) {
      return;
    }

    io.to(roomId).emit("player-presence-changed", {
      playerId,
      status: player.connectionStatus,
    });
  };

  io.on("connection", (socket) => {
    socket.on("join-room", (payload: JoinRoomPayload) => {
      try {
        const previousPlayerKey = socket.data.playerKey as string | undefined;
        if (
          previousPlayerKey &&
          activeSocketByPlayer.get(previousPlayerKey) === socket.id
        ) {
          activeSocketByPlayer.delete(previousPlayerKey);
        }

        const room = gameRoomManager.getRoom(payload.roomId);
        if (!room) {
          emitError(socket, "找不到房間。");
          return;
        }

        socket.data.roomId = payload.roomId;
        socket.data.playerId = undefined;
        socket.data.isHost = false;
        socket.data.playerKey = undefined;

        if (payload.playerId) {
          if (payload.playerId === room.hostId) {
            socket.data.isHost = true;
          }

          const player = room.players.find(
            (entry) => entry.id === payload.playerId,
          );
          if (player) {
            const playerKey = toPlayerKey(payload.roomId, player.id);
            const activeSocketId = activeSocketByPlayer.get(playerKey);
            const canClaimSocket =
              !activeSocketId ||
              activeSocketId === socket.id ||
              player.connectionStatus !== "connected";

            socket.data.playerId = player.id;
            socket.data.playerKey = playerKey;

            if (canClaimSocket) {
              activeSocketByPlayer.set(playerKey, socket.id);

              const pendingTimer = offlineTimers.get(playerKey);
              if (pendingTimer) {
                clearTimeout(pendingTimer);
                offlineTimers.delete(playerKey);
              }

              const changed = gameRoomManager.markPlayerConnected(
                payload.roomId,
                player.id,
              );
              if (changed) {
                emitPresenceChanged(payload.roomId, player.id);
              }
            }
          }
        }

        socket.join(payload.roomId);

        const roomState = socket.data.isHost
          ? gameRoomManager.getHostRoomState(payload.roomId)
          : gameRoomManager.getPlayerRoomState(
              payload.roomId,
              socket.data.playerId as string | undefined,
            );

        if (roomState) {
          socket.emit("room-state", roomState);
        }
      } catch (error) {
        emitError(
          socket,
          error instanceof Error ? error.message : "加入房間失敗。",
        );
      }
    });

    socket.on("start-game", (payload: StartGamePayload) => {
      try {
        const room = gameRoomManager.getRoom(payload.roomId);
        if (!room) {
          emitError(socket, "找不到房間。");
          return;
        }

        if (!socket.data.isHost || socket.data.roomId !== payload.roomId) {
          emitError(socket, "只有房主可以開始遊戲。");
          return;
        }

        const activePlayerId = gameRoomManager.startGame(
          payload.roomId,
          room.hostId,
        );

        io.to(payload.roomId).emit("game-started", {
          activePlayerId,
          turnOrder: room.turnOrder,
        });
        io.to(payload.roomId).emit("turn-started", { activePlayerId });
      } catch (error) {
        emitError(
          socket,
          error instanceof Error ? error.message : "開始遊戲失敗。",
        );
      }
    });

    socket.on("end-game", (payload: EndGamePayload) => {
      try {
        const room = gameRoomManager.getRoom(payload.roomId);
        if (!room) {
          emitError(socket, "找不到房間。");
          return;
        }

        if (!socket.data.isHost || socket.data.roomId !== payload.roomId) {
          emitError(socket, "只有房主可以結束遊戲。");
          return;
        }

        if (room.phase !== "in-game") {
          emitError(socket, "目前不在遊戲進行中。");
          return;
        }

        gameRoomManager.endGameByHost(payload.roomId);
        const finalRoom = gameRoomManager.getRoom(payload.roomId);
        io.to(payload.roomId).emit("game-over", {
          winnerId: null,
          allWords: finalRoom?.answers ?? {},
        });
      } catch (error) {
        emitError(
          socket,
          error instanceof Error ? error.message : "結束遊戲失敗。",
        );
      }
    });

    socket.on(
      "host-eliminate-player",
      (payload: HostEliminatePlayerPayload) => {
        try {
          const room = gameRoomManager.getRoom(payload.roomId);
          if (!room) {
            emitError(socket, "找不到房間。");
            return;
          }

          if (!socket.data.isHost || socket.data.roomId !== payload.roomId) {
            emitError(socket, "只有房主可以淘汰玩家。");
            return;
          }

          gameRoomManager.eliminateLobbyPlayer(
            payload.roomId,
            room.hostId,
            payload.targetPlayerId,
          );

          io.to(payload.roomId).emit("player-eliminated", {
            playerId: payload.targetPlayerId,
            revealedWord: null,
          });
        } catch (error) {
          emitError(
            socket,
            error instanceof Error ? error.message : "淘汰玩家失敗。",
          );
        }
      },
    );

    socket.on("component-guess", (payload: ComponentGuessPayload) => {
      try {
        const playerId = socket.data.playerId as string | undefined;
        if (!playerId || socket.data.roomId !== payload.roomId) {
          return;
        }

        const playerKey = toPlayerKey(payload.roomId, playerId);
        if (activeSocketByPlayer.get(playerKey) !== socket.id) {
          return;
        }

        const room = gameRoomManager.getRoom(payload.roomId);
        if (!room) {
          emitError(socket, "找不到房間。");
          return;
        }

        if (room.phase !== "in-game") {
          return;
        }

        if (room.activePlayerId !== playerId) {
          return;
        }

        if (!allGuessableSymbols.some((symbol) => symbol === payload.symbol)) {
          emitError(socket, "無效的符號。");
          return;
        }

        if (room.reveal.guessedComponents.includes(payload.symbol)) {
          emitError(socket, "這個符號已經猜過了。");
          return;
        }

        gameRoomManager.addGuessedComponent(payload.roomId, payload.symbol);

        io.to(payload.roomId).emit("component-guessed", {
          symbol: payload.symbol,
          guessedComponents: room.reveal.guessedComponents,
        });

        const activePlayerId = gameRoomManager.advanceTurn(payload.roomId);
        io.to(payload.roomId).emit("turn-started", { activePlayerId });
      } catch (error) {
        emitError(
          socket,
          error instanceof Error ? error.message : "處理猜測失敗。",
        );
      }
    });

    socket.on("answer-guess", (payload: AnswerGuessPayload) => {
      try {
        const playerId = socket.data.playerId as string | undefined;
        if (!playerId || socket.data.roomId !== payload.roomId) {
          return;
        }

        const playerKey = toPlayerKey(payload.roomId, playerId);
        if (activeSocketByPlayer.get(playerKey) !== socket.id) {
          return;
        }

        const room = gameRoomManager.getRoom(payload.roomId);
        if (!room) {
          emitError(socket, "找不到房間。");
          return;
        }

        if (room.phase !== "in-game") {
          return;
        }

        if (room.activePlayerId !== playerId) {
          return;
        }

        const result = gameRoomManager.evaluateAnswerGuess({
          roomId: payload.roomId,
          guesserId: playerId,
          targetId: payload.targetId,
          word: payload.word,
        });

        io.to(payload.roomId).emit("answer-guessed", {
          guesserId: playerId,
          targetId: payload.targetId,
          outcome: result.outcome,
        });

        const latest = gameRoomManager.getRoom(payload.roomId);
        if (!latest) {
          return;
        }

        io.to(payload.roomId).emit("player-eliminated", {
          playerId: result.eliminatedPlayerId,
          revealedWord: latest.answers[result.eliminatedPlayerId],
        });

        if (gameRoomManager.hasWinner(payload.roomId)) {
          const winnerId = gameRoomManager.endGame(payload.roomId);
          const finalRoom = gameRoomManager.getRoom(payload.roomId);
          io.to(payload.roomId).emit("game-over", {
            winnerId,
            allWords: finalRoom?.answers ?? {},
          });
          return;
        }

        const activePlayerId = gameRoomManager.advanceTurn(payload.roomId);
        io.to(payload.roomId).emit("turn-started", { activePlayerId });
      } catch (error) {
        emitError(
          socket,
          error instanceof Error ? error.message : "處理猜測失敗。",
        );
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId as string | undefined;
      const playerId = socket.data.playerId as string | undefined;
      const playerKey = socket.data.playerKey as string | undefined;

      if (!roomId || !playerId || !playerKey) {
        return;
      }

      const activeSocketId = activeSocketByPlayer.get(playerKey);

      if (activeSocketId !== socket.id) {
        return;
      }

      activeSocketByPlayer.delete(playerKey);

      try {
        const changed = gameRoomManager.markPlayerDisconnected(
          roomId,
          playerId,
        );
        if (!changed) {
          return;
        }

        emitPresenceChanged(roomId, playerId);

        const room = gameRoomManager.getRoom(roomId);
        const player = room?.players.find((entry) => entry.id === playerId);
        if (!player?.disconnectedAt) {
          return;
        }
        const expectedDisconnectedAt = player.disconnectedAt;

        const existingTimer = offlineTimers.get(playerKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
          offlineTimers.delete(playerKey);

          if (activeSocketByPlayer.has(playerKey)) {
            return;
          }

          try {
            const becameOffline = gameRoomManager.markPlayerOfflineIfStale(
              roomId,
              playerId,
              expectedDisconnectedAt,
            );

            if (!becameOffline) {
              return;
            }

            emitPresenceChanged(roomId, playerId);
          } catch {
            return;
          }
        }, reconnectGraceMs);

        offlineTimers.set(playerKey, timer);
      } catch {
        return;
      }
    });
  });
}
