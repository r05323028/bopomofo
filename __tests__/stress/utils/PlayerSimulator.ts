import { io, type Socket } from "socket.io-client";
import type { PlayerAnswer, PlayerRoomState } from "@/lib/game/types";
import { delay, generateRandomPlayerName, randomBoolean } from "./helpers";

type PlayerSimulatorOptions = {
  roomId: string;
  serverUrl?: string;
  displayName?: string;
  answer: PlayerAnswer;
  reconnectCount?: number;
};

export class PlayerSimulator {
  private socket: Socket | null = null;
  private readonly roomId: string;
  private readonly serverUrl: string;
  private readonly displayName: string;
  private readonly answer: PlayerAnswer;
  private readonly reconnectCount: number;
  public playerId: string | null = null;
  public roomState: PlayerRoomState | null = null;
  public isConnected = false;
  public reconnectAttempts = 0;

  constructor(options: PlayerSimulatorOptions) {
    this.roomId = options.roomId;
    this.serverUrl = options.serverUrl ?? "http://localhost:3000";
    this.displayName = options.displayName ?? generateRandomPlayerName();
    this.answer = options.answer;
    this.reconnectCount = options.reconnectCount ?? 2;
  }

  async connect(): Promise<void> {
    this.socket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error("Socket not initialized"));
      }

      this.socket.on("connect", () => {
        this.isConnected = true;
        resolve();
      });

      this.socket.on("error", (error: { message: string }) => {
        console.error(
          `[Player ${this.displayName}] Socket error:`,
          error.message,
        );
      });

      this.socket.on("room-state", (state: PlayerRoomState) => {
        this.roomState = state;
      });

      const rejoin = () => {
        if (!this.socket || !this.playerId) {
          return;
        }

        this.socket.emit("join-room", {
          roomId: this.roomId,
          playerId: this.playerId,
        });
      };

      this.socket.on("game-started", rejoin);
      this.socket.on("answer-guessed", rejoin);
      this.socket.on("player-eliminated", rejoin);
      this.socket.on("game-over", rejoin);

      this.socket.on(
        "turn-started",
        (payload: { activePlayerId: string | null }) => {
          this.roomState = this.roomState
            ? {
                ...this.roomState,
                activePlayerId: payload.activePlayerId,
              }
            : this.roomState;
        },
      );

      this.socket.on("disconnect", () => {
        this.isConnected = false;
      });

      setTimeout(() => reject(new Error("Connection timeout")), 5000);
    });
  }

  async joinRoom(): Promise<void> {
    const response = await fetch(
      `${this.serverUrl}/api/rooms/${this.roomId}/join`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: this.displayName,
          answer: this.answer,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to join room: ${errorData.message}`);
    }

    const data = (await response.json()) as { playerId: string };
    this.playerId = data.playerId;
  }

  async joinSocketRoom(): Promise<void> {
    if (!this.socket || !this.playerId) {
      throw new Error("Socket or playerId not initialized");
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error("Socket not initialized"));
      }

      this.socket.emit("join-room", {
        roomId: this.roomId,
        playerId: this.playerId,
      });

      this.socket.once("room-state", () => {
        resolve();
      });

      setTimeout(
        () => reject(new Error("Timeout waiting for room-state")),
        5000,
      );
    });
  }

  async guessComponent(symbol: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.socket.emit("component-guess", {
      roomId: this.roomId,
      symbol,
    });

    await delay(100);
  }

  async guessAnswer(targetId: string, word: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.socket.emit("answer-guess", {
      roomId: this.roomId,
      targetId,
      word,
    });

    await delay(100);
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      await delay(100);
    }
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await delay(1000);
    await this.connect();
    await this.joinSocketRoom();
    this.reconnectAttempts++;
  }

  async simulateRandomReconnect(): Promise<void> {
    if (this.reconnectAttempts < this.reconnectCount && randomBoolean(0.3)) {
      console.log(
        `[Player ${this.displayName}] Simulating disconnect/reconnect`,
      );
      await this.reconnect();
    }
  }

  async cleanup(): Promise<void> {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
  }

  waitForEvent(eventName: string, timeoutMs = 10000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error("Socket not connected"));
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeoutMs);

      this.socket.once(eventName, (data: unknown) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  isMyTurn(): boolean {
    return (
      this.roomState?.activePlayerId === this.playerId &&
      this.roomState?.phase === "in-game"
    );
  }

  isEliminated(): boolean {
    const player = this.roomState?.players.find((p) => p.id === this.playerId);
    return player?.isEliminated ?? false;
  }
}
