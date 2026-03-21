"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_os_1 = require("node:os");
const node_url_1 = require("node:url");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const roomManager_1 = require("./lib/game/roomManager");
const socketHandlers_1 = require("./lib/game/socketHandlers");
const socketServer_1 = require("./lib/game/socketServer");
const utils_1 = require("./lib/game/utils");
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? "3000");
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
function isPrivateIpv4(ip) {
    if (ip.startsWith("10.")) {
        return true;
    }
    if (ip.startsWith("192.168.")) {
        return true;
    }
    if (ip.startsWith("172.")) {
        const second = Number(ip.split(".")[1] ?? -1);
        return second >= 16 && second <= 31;
    }
    return false;
}
function getLanIpv4() {
    const all = (0, node_os_1.networkInterfaces)();
    const prefer = [/^(en|eth|wlan|wl|wifi|wi-fi)/i, /.*/];
    for (const pattern of prefer) {
        for (const [name, entries] of Object.entries(all)) {
            if (!entries || !pattern.test(name)) {
                continue;
            }
            for (const entry of entries) {
                if (entry.family === "IPv4" &&
                    !entry.internal &&
                    isPrivateIpv4(entry.address)) {
                    return entry.address;
                }
            }
        }
    }
    return null;
}
function writeJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        if (typeof chunk === "string") {
            chunks.push(Buffer.from(chunk));
        }
        else {
            chunks.push(chunk);
        }
    }
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (!raw) {
        return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
        return {};
    }
    return parsed;
}
async function handleApiRoutes(req, res) {
    const method = req.method ?? "GET";
    const parsedUrl = (0, node_url_1.parse)(req.url ?? "", true);
    const pathname = parsedUrl.pathname ?? "";
    if (pathname === "/api/rooms" && method === "POST") {
        try {
            const body = await readJsonBody(req);
            const topic = typeof body.topic === "string" ? body.topic : "";
            const wordCount = typeof body.wordCount === "number" ? body.wordCount : Number.NaN;
            const created = roomManager_1.gameRoomManager.createRoom({
                topic,
                wordCount,
            });
            writeJson(res, 201, created);
        }
        catch (error) {
            writeJson(res, 400, {
                message: error instanceof Error ? error.message : "建立房間失敗。",
            });
        }
        return true;
    }
    if (pathname === "/api/network-host" && method === "GET") {
        const lanHost = getLanIpv4();
        writeJson(res, 200, {
            lanHost,
        });
        return true;
    }
    const roomMatch = pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (roomMatch && method === "GET") {
        const roomId = roomMatch[1] ?? "";
        const room = roomManager_1.gameRoomManager.getRoom(roomId);
        if (!room) {
            writeJson(res, 404, { message: "找不到房間。" });
            return true;
        }
        writeJson(res, 200, {
            id: room.id,
            topic: room.topic,
            wordCount: room.wordCount,
            phase: room.phase,
            players: room.players.map((player) => ({
                id: player.id,
                displayName: player.displayName,
                avatarUrl: player.avatarUrl,
                hasSubmitted: player.hasSubmitted,
                isEliminated: player.isEliminated,
            })),
        });
        return true;
    }
    const joinMatch = pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
    if (joinMatch && method === "POST") {
        const roomId = joinMatch[1] ?? "";
        const room = roomManager_1.gameRoomManager.getRoom(roomId);
        if (!room) {
            writeJson(res, 404, { message: "找不到房間。" });
            return true;
        }
        try {
            const body = await readJsonBody(req);
            const displayName = typeof body.displayName === "string" ? body.displayName : "";
            const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : null;
            const answer = (Array.isArray(body.answer) ? body.answer : []);
            const validation = (0, utils_1.isAnswerComplete)(answer, room.wordCount);
            if (!validation.valid) {
                const rows = validation.incompleteRows.map((index) => index + 1);
                writeJson(res, 400, {
                    message: `每一列都必須剛好輸入一個字（第 ${rows.join(", ")} 列）。`,
                    incompleteRows: rows,
                });
                return true;
            }
            const player = roomManager_1.gameRoomManager.addPlayer({
                roomId,
                displayName,
                avatarUrl,
            });
            roomManager_1.gameRoomManager.submitAnswer(roomId, player.id, answer);
            const io = (0, socketServer_1.getSocketServer)();
            io?.to(roomId).emit("player-joined", { player });
            io?.to(roomId).emit("answer-submitted", { playerId: player.id });
            writeJson(res, 201, { playerId: player.id });
        }
        catch (error) {
            writeJson(res, 400, {
                message: error instanceof Error ? error.message : "加入房間失敗。",
            });
        }
        return true;
    }
    return false;
}
void app.prepare().then(() => {
    const server = (0, node_http_1.createServer)((req, res) => {
        void (async () => {
            const handled = await handleApiRoutes(req, res);
            if (handled) {
                return;
            }
            const parsedUrl = (0, node_url_1.parse)(req.url ?? "", true);
            await handle(req, res, parsedUrl);
        })().catch((error) => {
            if (error instanceof Error) {
                console.error(error.message);
            }
            if (!res.headersSent) {
                writeJson(res, 500, { message: "伺服器內部錯誤。" });
            }
        });
    });
    const io = new socket_io_1.Server(server, {
        pingInterval: 5000,
        pingTimeout: 7000,
    });
    (0, socketServer_1.setSocketServer)(io);
    (0, socketHandlers_1.registerSocketHandlers)(io);
    server
        .once("error", (error) => {
        console.error(error);
        process.exit(1);
    })
        .listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
