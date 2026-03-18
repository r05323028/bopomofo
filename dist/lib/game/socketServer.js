"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSocketServer = setSocketServer;
exports.getSocketServer = getSocketServer;
let ioInstance = null;
function setSocketServer(io) {
    ioInstance = io;
}
function getSocketServer() {
    return ioInstance;
}
