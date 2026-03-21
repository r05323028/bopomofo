"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const constants_1 = require("./constants");
const roomManager_1 = require("./roomManager");
function emitError(socket, message) {
    socket.emit("error", { message });
}
function registerSocketHandlers(io) {
    const activeSocketByPlayer = new Map();
    const offlineTimers = new Map();
    const toPlayerKey = (roomId, playerId) => `${roomId}:${playerId}`;
    const emitPresenceChanged = (roomId, playerId) => {
        const room = roomManager_1.gameRoomManager.getRoom(roomId);
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
        socket.on("join-room", (payload) => {
            try {
                const previousPlayerKey = socket.data.playerKey;
                if (previousPlayerKey &&
                    activeSocketByPlayer.get(previousPlayerKey) === socket.id) {
                    activeSocketByPlayer.delete(previousPlayerKey);
                }
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
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
                    const player = room.players.find((entry) => entry.id === payload.playerId);
                    if (player) {
                        const playerKey = toPlayerKey(payload.roomId, player.id);
                        const activeSocketId = activeSocketByPlayer.get(playerKey);
                        const canClaimSocket = !activeSocketId ||
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
                            const changed = roomManager_1.gameRoomManager.markPlayerConnected(payload.roomId, player.id);
                            if (changed) {
                                emitPresenceChanged(payload.roomId, player.id);
                            }
                        }
                    }
                }
                socket.join(payload.roomId);
                const roomState = socket.data.isHost
                    ? roomManager_1.gameRoomManager.getHostRoomState(payload.roomId)
                    : roomManager_1.gameRoomManager.getPlayerRoomState(payload.roomId, socket.data.playerId);
                if (roomState) {
                    socket.emit("room-state", roomState);
                }
            }
            catch (error) {
                emitError(socket, error instanceof Error ? error.message : "加入房間失敗。");
            }
        });
        socket.on("start-game", (payload) => {
            try {
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
                if (!room) {
                    emitError(socket, "找不到房間。");
                    return;
                }
                if (!socket.data.isHost || socket.data.roomId !== payload.roomId) {
                    emitError(socket, "只有房主可以開始遊戲。");
                    return;
                }
                const activePlayerId = roomManager_1.gameRoomManager.startGame(payload.roomId, room.hostId);
                io.to(payload.roomId).emit("game-started", {
                    activePlayerId,
                    turnOrder: room.turnOrder,
                });
                io.to(payload.roomId).emit("turn-started", { activePlayerId });
            }
            catch (error) {
                emitError(socket, error instanceof Error ? error.message : "開始遊戲失敗。");
            }
        });
        socket.on("end-game", (payload) => {
            try {
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
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
                roomManager_1.gameRoomManager.endGameByHost(payload.roomId);
                const finalRoom = roomManager_1.gameRoomManager.getRoom(payload.roomId);
                io.to(payload.roomId).emit("game-over", {
                    winnerId: null,
                    allWords: finalRoom?.answers ?? {},
                });
            }
            catch (error) {
                emitError(socket, error instanceof Error ? error.message : "結束遊戲失敗。");
            }
        });
        socket.on("host-eliminate-player", (payload) => {
            try {
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
                if (!room) {
                    emitError(socket, "找不到房間。");
                    return;
                }
                if (!socket.data.isHost || socket.data.roomId !== payload.roomId) {
                    emitError(socket, "只有房主可以淘汰玩家。");
                    return;
                }
                roomManager_1.gameRoomManager.eliminateLobbyPlayer(payload.roomId, room.hostId, payload.targetPlayerId);
                io.to(payload.roomId).emit("player-eliminated", {
                    playerId: payload.targetPlayerId,
                    revealedWord: null,
                });
            }
            catch (error) {
                emitError(socket, error instanceof Error ? error.message : "淘汰玩家失敗。");
            }
        });
        socket.on("component-guess", (payload) => {
            try {
                const playerId = socket.data.playerId;
                if (!playerId || socket.data.roomId !== payload.roomId) {
                    return;
                }
                const playerKey = toPlayerKey(payload.roomId, playerId);
                if (activeSocketByPlayer.get(playerKey) !== socket.id) {
                    return;
                }
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
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
                if (!constants_1.allGuessableSymbols.some((symbol) => symbol === payload.symbol)) {
                    emitError(socket, "無效的符號。");
                    return;
                }
                if (room.reveal.guessedComponents.includes(payload.symbol)) {
                    emitError(socket, "這個符號已經猜過了。");
                    return;
                }
                roomManager_1.gameRoomManager.addGuessedComponent(payload.roomId, payload.symbol);
                io.to(payload.roomId).emit("component-guessed", {
                    symbol: payload.symbol,
                    guessedComponents: room.reveal.guessedComponents,
                });
                const activePlayerId = roomManager_1.gameRoomManager.advanceTurn(payload.roomId);
                io.to(payload.roomId).emit("turn-started", { activePlayerId });
            }
            catch (error) {
                emitError(socket, error instanceof Error ? error.message : "處理猜測失敗。");
            }
        });
        socket.on("answer-guess", (payload) => {
            try {
                const playerId = socket.data.playerId;
                if (!playerId || socket.data.roomId !== payload.roomId) {
                    return;
                }
                const playerKey = toPlayerKey(payload.roomId, playerId);
                if (activeSocketByPlayer.get(playerKey) !== socket.id) {
                    return;
                }
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
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
                const result = roomManager_1.gameRoomManager.evaluateAnswerGuess({
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
                const latest = roomManager_1.gameRoomManager.getRoom(payload.roomId);
                if (!latest) {
                    return;
                }
                io.to(payload.roomId).emit("player-eliminated", {
                    playerId: result.eliminatedPlayerId,
                    revealedWord: latest.answers[result.eliminatedPlayerId],
                });
                if (roomManager_1.gameRoomManager.hasWinner(payload.roomId)) {
                    const winnerId = roomManager_1.gameRoomManager.endGame(payload.roomId);
                    const finalRoom = roomManager_1.gameRoomManager.getRoom(payload.roomId);
                    io.to(payload.roomId).emit("game-over", {
                        winnerId,
                        allWords: finalRoom?.answers ?? {},
                    });
                    return;
                }
                const activePlayerId = roomManager_1.gameRoomManager.advanceTurn(payload.roomId);
                io.to(payload.roomId).emit("turn-started", { activePlayerId });
            }
            catch (error) {
                emitError(socket, error instanceof Error ? error.message : "處理猜測失敗。");
            }
        });
        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            const playerId = socket.data.playerId;
            const playerKey = socket.data.playerKey;
            if (!roomId || !playerId || !playerKey) {
                return;
            }
            const activeSocketId = activeSocketByPlayer.get(playerKey);
            if (activeSocketId !== socket.id) {
                return;
            }
            activeSocketByPlayer.delete(playerKey);
            try {
                const changed = roomManager_1.gameRoomManager.markPlayerDisconnected(roomId, playerId);
                if (!changed) {
                    return;
                }
                emitPresenceChanged(roomId, playerId);
                const room = roomManager_1.gameRoomManager.getRoom(roomId);
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
                        const becameOffline = roomManager_1.gameRoomManager.markPlayerOfflineIfStale(roomId, playerId, expectedDisconnectedAt);
                        if (!becameOffline) {
                            return;
                        }
                        emitPresenceChanged(roomId, playerId);
                    }
                    catch {
                        return;
                    }
                }, constants_1.reconnectGraceMs);
                offlineTimers.set(playerKey, timer);
            }
            catch {
                return;
            }
        });
    });
}
