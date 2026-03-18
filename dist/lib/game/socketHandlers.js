"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const constants_1 = require("./constants");
const roomManager_1 = require("./roomManager");
function emitError(socket, message) {
    socket.emit("error", { message });
}
function registerSocketHandlers(io) {
    io.on("connection", (socket) => {
        socket.on("join-room", (payload) => {
            try {
                const room = roomManager_1.gameRoomManager.getRoom(payload.roomId);
                if (!room) {
                    emitError(socket, "找不到房間。");
                    return;
                }
                socket.data.roomId = payload.roomId;
                socket.data.playerId = undefined;
                socket.data.isHost = false;
                if (payload.playerId) {
                    if (payload.playerId === room.hostId) {
                        socket.data.isHost = true;
                    }
                    const player = room.players.find((entry) => entry.id === payload.playerId);
                    if (player) {
                        socket.data.playerId = player.id;
                    }
                }
                socket.join(payload.roomId);
                const roomState = socket.data.isHost
                    ? roomManager_1.gameRoomManager.getHostRoomState(payload.roomId)
                    : roomManager_1.gameRoomManager.getPlayerRoomState(payload.roomId);
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
        socket.on("component-guess", (payload) => {
            try {
                const playerId = socket.data.playerId;
                if (!playerId || socket.data.roomId !== payload.roomId) {
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
    });
}
