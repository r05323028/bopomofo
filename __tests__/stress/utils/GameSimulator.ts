import { io, type Socket } from "socket.io-client";
import { allGuessableSymbols } from "@/lib/game/constants";
import type { HostRoomState, PlayerAnswer } from "@/lib/game/types";
import { answerToText, delay } from "./helpers";
import { PlayerSimulator } from "./PlayerSimulator";

type GameSimulatorOptions = {
  serverUrl?: string;
  topic: string;
  wordCount: number;
  playerCount: number;
  playerAnswers: PlayerAnswer[];
};

export class GameSimulator {
  private readonly serverUrl: string;
  private readonly topic: string;
  private readonly wordCount: number;
  private readonly playerCount: number;
  private readonly playerAnswers: PlayerAnswer[];
  private hostSocket: Socket | null = null;
  private roomId: string | null = null;
  private hostId: string | null = null;
  public hostRoomState: HostRoomState | null = null;
  public players: PlayerSimulator[] = [];

  constructor(options: GameSimulatorOptions) {
    this.serverUrl = options.serverUrl ?? "http://localhost:3000";
    this.topic = options.topic;
    this.wordCount = options.wordCount;
    this.playerCount = options.playerCount;
    this.playerAnswers = options.playerAnswers;

    if (this.playerAnswers.length !== this.playerCount) {
      throw new Error("playerAnswers length must match playerCount");
    }
  }

  async createRoom(): Promise<{ roomId: string; hostId: string }> {
    const response = await fetch(`${this.serverUrl}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: this.topic,
        wordCount: this.wordCount,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create room: ${errorData.message}`);
    }

    const data = (await response.json()) as {
      roomId: string;
      hostId: string;
    };
    this.roomId = data.roomId;
    this.hostId = data.hostId;

    return data;
  }

  async connectHost(): Promise<void> {
    if (!this.roomId || !this.hostId) {
      throw new Error("Room not created yet");
    }

    this.hostSocket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
    });

    return new Promise((resolve, reject) => {
      if (!this.hostSocket) {
        return reject(new Error("Host socket not initialized"));
      }

      this.hostSocket.on("connect", () => {
        resolve();
      });

      this.hostSocket.on("room-state", (state: HostRoomState) => {
        this.hostRoomState = state;
      });

      this.hostSocket.on(
        "turn-started",
        (payload: { activePlayerId: string | null }) => {
          this.hostRoomState = this.hostRoomState
            ? {
                ...this.hostRoomState,
                activePlayerId: payload.activePlayerId,
              }
            : this.hostRoomState;
        },
      );

      this.hostSocket.on(
        "component-guessed",
        (payload: { guessedComponents: string[] }) => {
          this.hostRoomState = this.hostRoomState
            ? {
                ...this.hostRoomState,
                reveal: {
                  ...this.hostRoomState.reveal,
                  guessedComponents: payload.guessedComponents,
                },
              }
            : this.hostRoomState;
        },
      );

      const rejoin = () => {
        if (!this.hostSocket || !this.roomId || !this.hostId) {
          return;
        }

        this.hostSocket.emit("join-room", {
          roomId: this.roomId,
          playerId: this.hostId,
        });
      };

      this.hostSocket.on("game-started", rejoin);
      this.hostSocket.on("answer-guessed", rejoin);
      this.hostSocket.on("player-eliminated", rejoin);
      this.hostSocket.on("game-over", rejoin);

      this.hostSocket.on("error", (error: { message: string }) => {
        console.error("[Host] Socket error:", error.message);
      });

      setTimeout(() => reject(new Error("Host connection timeout")), 5000);
    });
  }

  async joinHostToRoom(): Promise<void> {
    if (!this.hostSocket || !this.roomId || !this.hostId) {
      throw new Error("Host socket or room not initialized");
    }

    return new Promise((resolve) => {
      if (!this.hostSocket) {
        return;
      }

      this.hostSocket.emit("join-room", {
        roomId: this.roomId,
        playerId: this.hostId,
      });

      this.hostSocket.once("room-state", () => {
        resolve();
      });

      setTimeout(resolve, 2000);
    });
  }

  async createAndConnectPlayers(): Promise<void> {
    if (!this.roomId) {
      throw new Error("Room not created yet");
    }

    for (let i = 0; i < this.playerCount; i++) {
      const player = new PlayerSimulator({
        roomId: this.roomId,
        serverUrl: this.serverUrl,
        answer: this.playerAnswers[i] as PlayerAnswer,
        reconnectCount: 2,
      });

      await player.connect();
      await player.joinRoom();
      await player.joinSocketRoom();
      this.players.push(player);

      await delay(500);
    }
  }

  async startGame(): Promise<void> {
    if (!this.hostSocket || !this.roomId) {
      throw new Error("Host not connected");
    }

    return new Promise((resolve, reject) => {
      if (!this.hostSocket) {
        return reject(new Error("Host socket not initialized"));
      }

      const timeout = setTimeout(() => {
        reject(new Error("Start game timeout"));
      }, 10000);

      const waitForInGameState = async () => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < 10000) {
          if (
            this.hostRoomState?.phase === "in-game" &&
            this.hostRoomState.activePlayerId
          ) {
            return true;
          }
          await delay(100);
        }

        return false;
      };

      this.hostSocket.once("game-started", async () => {
        const hasInGameState = await waitForInGameState();
        clearTimeout(timeout);

        if (!hasInGameState) {
          return reject(new Error("Did not receive in-game room state"));
        }

        resolve();
      });

      this.hostSocket.emit("start-game", { roomId: this.roomId });
    });
  }

  async playGameUntilEnd(): Promise<void> {
    await this.simulateReconnectWave();

    const maxTurns = 200;
    let turnCount = 0;

    while (turnCount < maxTurns) {
      await delay(200);

      if (this.hostRoomState?.phase === "game-over") {
        break;
      }

      const activePlayerId = this.hostRoomState?.activePlayerId;
      if (!activePlayerId) {
        continue;
      }

      const activePlayer = this.players.find(
        (p) => p.playerId === activePlayerId,
      );

      if (!activePlayer || activePlayer.isEliminated()) {
        continue;
      }

      await activePlayer.simulateRandomReconnect();

      const shouldGuessAnswer = Math.random() > 0.4;

      if (shouldGuessAnswer) {
        const alivePlayers = this.players.filter(
          (p) => !p.isEliminated() && p.playerId !== activePlayerId,
        );

        if (alivePlayers.length > 0) {
          const targetPlayer =
            alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          const targetAnswer = targetPlayer?.playerId
            ? this.hostRoomState?.answers[targetPlayer.playerId]
            : null;
          const guessedWord =
            targetAnswer && Math.random() > 0.2
              ? answerToText(targetAnswer)
              : "錯誤答案";

          try {
            await activePlayer.guessAnswer(
              targetPlayer?.playerId ?? "",
              guessedWord,
            );
          } catch (error) {
            console.error("Answer guess error:", error);
          }
        }
      } else {
        const availableSymbols = allGuessableSymbols.filter(
          (symbol: string) =>
            !this.hostRoomState?.reveal.guessedComponents.includes(symbol),
        );

        if (availableSymbols.length > 0) {
          const randomSymbol =
            availableSymbols[
              Math.floor(Math.random() * availableSymbols.length)
            ];

          try {
            await activePlayer.guessComponent(randomSymbol);
          } catch (error) {
            console.error("Component guess error:", error);
          }
        }
      }

      turnCount++;
    }
  }

  private async simulateReconnectWave(): Promise<void> {
    for (const player of this.players) {
      if (player.isEliminated()) {
        continue;
      }

      try {
        await player.reconnect();
      } catch (error) {
        console.error("Reconnect wave error:", error);
      }

      await delay(100);
    }
  }

  async cleanup(): Promise<void> {
    if (this.hostSocket) {
      this.hostSocket.removeAllListeners();
      this.hostSocket.disconnect();
    }

    for (const player of this.players) {
      await player.cleanup();
    }
  }

  getGameResult(): {
    winnerId: string | null;
    totalTurns: number;
    alivePlayers: number;
  } {
    const alivePlayers =
      this.hostRoomState?.players.filter((p) => !p.isEliminated).length ?? 0;

    return {
      winnerId: this.hostRoomState?.winnerId ?? null,
      totalTurns: this.hostRoomState?.reveal.guessedComponents.length ?? 0,
      alivePlayers,
    };
  }
}
