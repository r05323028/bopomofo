import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GameSimulator } from "./utils/GameSimulator";
import { generateRandomPlayerAnswer } from "./utils/helpers";

describe("Game Flow Stress Test - 10 Players", () => {
  const SERVER_URL = "http://localhost:3000";
  const PLAYER_COUNT = 10;
  const WORD_COUNT = 2;
  let simulator: GameSimulator;

  beforeAll(async () => {
    const playerAnswers = Array.from({ length: PLAYER_COUNT }, () =>
      generateRandomPlayerAnswer(WORD_COUNT),
    );

    simulator = new GameSimulator({
      serverUrl: SERVER_URL,
      topic: "壓力測試主題",
      wordCount: WORD_COUNT,
      playerCount: PLAYER_COUNT,
      playerAnswers,
    });
  });

  afterAll(async () => {
    if (simulator) {
      await simulator.cleanup();
    }
  });

  it("should complete full game flow with 10 players and reconnections", async () => {
    console.log("[Test] Creating room...");
    const { roomId, hostId } = await simulator.createRoom();
    expect(roomId).toBeTruthy();
    expect(hostId).toBeTruthy();
    console.log(`[Test] Room created: ${roomId}`);

    console.log("[Test] Connecting host...");
    await simulator.connectHost();
    await simulator.joinHostToRoom();
    expect(simulator.hostRoomState).toBeTruthy();
    console.log("[Test] Host connected");

    console.log("[Test] Creating and connecting 10 players...");
    await simulator.createAndConnectPlayers();
    expect(simulator.players).toHaveLength(PLAYER_COUNT);
    console.log(`[Test] All ${PLAYER_COUNT} players joined`);

    for (const player of simulator.players) {
      expect(player.playerId).toBeTruthy();
      expect(player.isConnected).toBe(true);
    }

    console.log("[Test] Starting game...");
    await simulator.startGame();
    expect(simulator.hostRoomState?.phase).toBe("in-game");
    expect(simulator.hostRoomState?.activePlayerId).toBeTruthy();
    console.log("[Test] Game started");

    console.log("[Test] Playing game with random actions and reconnections...");
    await simulator.playGameUntilEnd();
    console.log("[Test] Game completed");

    expect(simulator.hostRoomState?.phase).toBe("game-over");

    const result = simulator.getGameResult();
    console.log("[Test] Game result:", result);

    expect(result.alivePlayers).toBeLessThanOrEqual(1);
    expect(result.totalTurns).toBeGreaterThan(0);

    const reconnectStats = simulator.players.map((p, i) => ({
      player: i + 1,
      reconnects: p.reconnectAttempts,
    }));
    console.log("[Test] Reconnection stats:", reconnectStats);

    const totalReconnects = reconnectStats.reduce(
      (sum, stat) => sum + stat.reconnects,
      0,
    );
    console.log(`[Test] Total reconnections: ${totalReconnects}`);
  }, 120000);
});
