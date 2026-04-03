"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ws_1 = require("ws");
const joinDocument_1 = require("./handlers/joinDocument");
const operation_1 = require("./handlers/operation");
const cursorUpdate_1 = require("./handlers/cursorUpdate");
const documentRooms_1 = require("./lib/documentRooms");
const PORT = parseInt(process.env.PORT || '3002', 10);
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`WebSocket server running on port ${PORT}`);
wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'join_document':
                    await (0, joinDocument_1.handleJoinDocument)(ws, message);
                    break;
                case 'operation':
                    await (0, operation_1.handleOperation)(ws, message);
                    break;
                case 'cursor_update':
                    (0, cursorUpdate_1.handleCursorUpdate)(ws, message);
                    break;
                case 'leave_document':
                    handleLeaveDocument(ws, message.documentId);
                    break;
                default:
                    ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
            }
        }
        catch (error) {
            console.error('Message parsing error:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });
    ws.on('close', () => {
        handleDisconnect(ws);
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        handleDisconnect(ws);
    });
});
function handleLeaveDocument(ws, documentId) {
    if (!ws.userId)
        return;
    const userLeftMessage = {
        type: 'user_left',
        userId: ws.userId,
    };
    documentRooms_1.documentRooms.broadcastToOthers(documentId, ws.userId, userLeftMessage);
    documentRooms_1.documentRooms.leaveRoom(documentId, ws.userId);
}
function handleDisconnect(ws) {
    if (!ws.userId)
        return;
    const leftRooms = documentRooms_1.documentRooms.leaveAllRooms(ws);
    leftRooms.forEach((documentId) => {
        const userLeftMessage = {
            type: 'user_left',
            userId: ws.userId,
        };
        documentRooms_1.documentRooms.broadcastToRoom(documentId, userLeftMessage);
    });
    console.log(`Client ${ws.userId} disconnected`);
}
// Heartbeat to detect broken connections
const interval = setInterval(() => {
    wss.clients.forEach((client) => {
        const ws = client;
        if (ws.isAlive === false) {
            handleDisconnect(ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);
wss.on('close', () => {
    clearInterval(interval);
});
process.on('SIGTERM', () => {
    console.log('Shutting down WebSocket server...');
    wss.close(() => {
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map