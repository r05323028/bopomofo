"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoomManager = void 0;
const constants_1 = require("./constants");
const socketServer_1 = require("./socketServer");
const utils_1 = require("./utils");
class GameRoomManager {
    constructor() {
        this.rooms = new Map();
        setInterval(() => {
            this.cleanupExpiredRooms();
        }, constants_1.roomCleanupIntervalMs).unref();
    }
    createRoom(input) {
        const topic = input.topic.trim();
        if (!topic) {
            throw new Error("請輸入主題。");
        }
        if (input.wordCount < 1 || input.wordCount > 4) {
            throw new Error("字數必須介於 1 到 4。");
        }
        const roomId = (0, utils_1.createId)("room");
        const hostId = (0, utils_1.createId)("host");
        const room = {
            id: roomId,
            topic,
            wordCount: input.wordCount,
            phase: "lobby",
            hostId,
            players: [],
            answers: {},
            turnOrder: [],
            activePlayerId: null,
            winnerId: null,
            createdAt: Date.now(),
            reveal: {
                guessedComponents: [],
                playerWordRevealed: {},
            },
        };
        this.rooms.set(roomId, room);
        return { roomId, hostId };
    }
    getRoom(roomId) {
        return this.rooms.get(roomId) ?? null;
    }
    getHostRoomState(roomId) {
        const room = this.getRoom(roomId);
        if (!room) {
            return null;
        }
        return {
            id: room.id,
            topic: room.topic,
            wordCount: room.wordCount,
            phase: room.phase,
            hostId: room.hostId,
            players: room.players,
            answers: room.answers,
            turnOrder: room.turnOrder,
            activePlayerId: room.activePlayerId,
            winnerId: room.winnerId,
            reveal: room.reveal,
        };
    }
    getPlayerRoomState(roomId, playerId) {
        const room = this.getRoom(roomId);
        if (!room) {
            return null;
        }
        const ownAnswer = playerId ? (room.answers[playerId] ?? []) : [];
        return {
            id: room.id,
            topic: room.topic,
            wordCount: room.wordCount,
            phase: room.phase,
            players: room.players,
            ownAnswer,
            turnOrder: room.turnOrder,
            activePlayerId: room.activePlayerId,
            winnerId: room.winnerId,
            reveal: {
                guessedComponents: room.reveal.guessedComponents,
            },
        };
    }
    getPublicRoomState(roomId, asHost = false, playerId) {
        if (asHost) {
            return this.getHostRoomState(roomId);
        }
        return this.getPlayerRoomState(roomId, playerId);
    }
    addPlayer(input) {
        const room = this.requireRoom(input.roomId);
        if (room.phase !== "lobby") {
            throw new Error("遊戲已經開始。");
        }
        const displayName = input.displayName.trim();
        if (!displayName) {
            throw new Error("請輸入玩家名稱。");
        }
        const nameTaken = room.players.some((player) => player.displayName.localeCompare(displayName, undefined, {
            sensitivity: "base",
        }) === 0);
        if (nameTaken) {
            throw new Error("玩家名稱已被使用。");
        }
        const player = {
            id: (0, utils_1.createId)("player"),
            displayName,
            avatarUrl: input.avatarUrl ?? null,
            isEliminated: false,
            hasSubmitted: false,
            joinedAt: Date.now(),
            connectionStatus: "connected",
            disconnectedAt: null,
        };
        room.players.push(player);
        room.turnOrder.push(player.id);
        room.reveal.playerWordRevealed[player.id] = false;
        return player;
    }
    submitAnswer(roomId, playerId, answer) {
        const room = this.requireRoom(roomId);
        if (room.phase !== "lobby") {
            throw new Error("遊戲開始後無法送出答案。");
        }
        const player = this.requirePlayer(room, playerId);
        const sanitized = answer.map((cell) => (0, utils_1.sanitizeCell)(cell));
        const validation = (0, utils_1.isAnswerComplete)(sanitized, room.wordCount);
        if (!validation.valid) {
            const rows = validation.incompleteRows
                .map((index) => index + 1)
                .join(", ");
            throw new Error(`每一列都必須剛好輸入一個字（第 ${rows} 列）。`);
        }
        room.answers[playerId] = sanitized;
        player.hasSubmitted = true;
    }
    allPlayersSubmitted(roomId) {
        const room = this.requireRoom(roomId);
        const activePlayers = room.players.filter((player) => !player.isEliminated);
        return (activePlayers.length > 0 &&
            activePlayers.every((player) => player.hasSubmitted));
    }
    eliminateLobbyPlayer(roomId, hostId, playerId) {
        const room = this.requireRoom(roomId);
        if (room.hostId !== hostId) {
            throw new Error("只有房主可以淘汰玩家。");
        }
        if (room.phase !== "lobby") {
            throw new Error("只能在大廳淘汰玩家。");
        }
        const player = this.requirePlayer(room, playerId);
        if (player.isEliminated) {
            throw new Error("玩家已經被淘汰。");
        }
        this.eliminatePlayer(roomId, playerId);
    }
    startGame(roomId, hostId) {
        const room = this.requireRoom(roomId);
        if (room.hostId !== hostId) {
            throw new Error("只有房主可以開始遊戲。");
        }
        if (room.phase !== "lobby") {
            throw new Error("遊戲已經開始。");
        }
        if (!this.allPlayersSubmitted(roomId)) {
            throw new Error("所有玩家都送出答案後才能開始。");
        }
        room.phase = "in-game";
        room.activePlayerId = this.findNextActivePlayer(room, null);
        if (!room.activePlayerId) {
            throw new Error("沒有可行動的玩家。");
        }
        return room.activePlayerId;
    }
    addGuessedComponent(roomId, symbol) {
        const room = this.requireRoom(roomId);
        if (!room.reveal.guessedComponents.includes(symbol)) {
            room.reveal.guessedComponents.push(symbol);
        }
    }
    evaluateAnswerGuess(input) {
        const room = this.requireRoom(input.roomId);
        const guesser = this.requirePlayer(room, input.guesserId);
        const target = this.requirePlayer(room, input.targetId);
        if (guesser.id === target.id) {
            throw new Error("不能選擇自己作為目標。");
        }
        if (target.isEliminated) {
            throw new Error("目標玩家已被淘汰。");
        }
        const targetAnswer = room.answers[target.id];
        if (!targetAnswer) {
            throw new Error("目標玩家尚未有答案資料。");
        }
        const guessedWord = input.word.trim();
        if (!guessedWord) {
            throw new Error("請輸入要猜測的答案。");
        }
        const normalizedTarget = (0, utils_1.normalizeWord)(targetAnswer);
        const isCorrect = guessedWord.localeCompare(normalizedTarget, undefined, {
            sensitivity: "base",
        }) === 0;
        if (isCorrect) {
            this.eliminatePlayer(room.id, target.id);
            return {
                outcome: "correct",
                eliminatedPlayerId: target.id,
            };
        }
        this.eliminatePlayer(room.id, guesser.id);
        return {
            outcome: "wrong",
            eliminatedPlayerId: guesser.id,
        };
    }
    eliminatePlayer(roomId, playerId) {
        const room = this.requireRoom(roomId);
        const player = this.requirePlayer(room, playerId);
        player.isEliminated = true;
        room.reveal.playerWordRevealed[player.id] = true;
    }
    advanceTurn(roomId) {
        const room = this.requireRoom(roomId);
        room.activePlayerId = this.findNextActivePlayer(room, room.activePlayerId);
        return room.activePlayerId;
    }
    hasWinner(roomId) {
        const room = this.requireRoom(roomId);
        return room.players.filter((player) => !player.isEliminated).length <= 1;
    }
    markPlayerConnected(roomId, playerId) {
        const room = this.requireRoom(roomId);
        const player = this.requirePlayer(room, playerId);
        if (player.connectionStatus === "connected") {
            return false;
        }
        player.connectionStatus = "connected";
        player.disconnectedAt = null;
        if (room.phase === "in-game" && !room.activePlayerId) {
            room.activePlayerId = this.findNextActivePlayer(room, null);
        }
        return true;
    }
    markPlayerDisconnected(roomId, playerId) {
        const room = this.requireRoom(roomId);
        const player = this.requirePlayer(room, playerId);
        if (player.connectionStatus === "reconnecting") {
            return false;
        }
        player.connectionStatus = "reconnecting";
        player.disconnectedAt = Date.now();
        return true;
    }
    markPlayerOfflineIfStale(roomId, playerId, expectedDisconnectedAt) {
        const room = this.requireRoom(roomId);
        const player = this.requirePlayer(room, playerId);
        if (player.connectionStatus !== "reconnecting" ||
            player.disconnectedAt !== expectedDisconnectedAt) {
            return false;
        }
        player.connectionStatus = "offline";
        return true;
    }
    skipTurnIfUnavailable(roomId, playerId) {
        const room = this.requireRoom(roomId);
        if (room.phase !== "in-game") {
            return room.activePlayerId;
        }
        const player = this.requirePlayer(room, playerId);
        const unavailable = player.isEliminated || player.connectionStatus !== "connected";
        if (!unavailable || room.activePlayerId !== player.id) {
            return room.activePlayerId;
        }
        room.activePlayerId = this.findNextActivePlayer(room, room.activePlayerId);
        return room.activePlayerId;
    }
    endGame(roomId) {
        const room = this.requireRoom(roomId);
        room.phase = "game-over";
        const alive = room.players.find((player) => !player.isEliminated) ?? null;
        room.winnerId = alive?.id ?? null;
        room.activePlayerId = null;
        for (const player of room.players) {
            room.reveal.playerWordRevealed[player.id] = true;
        }
        return room.winnerId;
    }
    endGameByHost(roomId) {
        const room = this.requireRoom(roomId);
        room.phase = "game-over";
        room.winnerId = null;
        room.activePlayerId = null;
        for (const player of room.players) {
            room.reveal.playerWordRevealed[player.id] = true;
        }
    }
    cleanupExpiredRooms(now = Date.now()) {
        for (const [roomId, room] of this.rooms.entries()) {
            if (now - room.createdAt > constants_1.roomTtlMs) {
                (0, socketServer_1.getSocketServer)()?.in(roomId).disconnectSockets(true);
                this.rooms.delete(roomId);
            }
        }
    }
    requireRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            throw new Error("找不到房間。");
        }
        return room;
    }
    requirePlayer(room, playerId) {
        const player = room.players.find((entry) => entry.id === playerId);
        if (!player) {
            throw new Error("找不到玩家。");
        }
        return player;
    }
    findNextActivePlayer(room, fromPlayerId) {
        const living = room.turnOrder.filter((playerId) => {
            const player = room.players.find((entry) => entry.id === playerId);
            return Boolean(player && !player.isEliminated);
        });
        if (living.length === 0) {
            return null;
        }
        if (!fromPlayerId) {
            return living[0] ?? null;
        }
        const index = living.indexOf(fromPlayerId);
        if (index === -1) {
            return living[0] ?? null;
        }
        return living[(index + 1) % living.length] ?? null;
    }
}
exports.gameRoomManager = new GameRoomManager();
