"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCursorUpdate = handleCursorUpdate;
const documentRooms_1 = require("../lib/documentRooms");
function handleCursorUpdate(ws, message) {
    try {
        const { documentId, position } = message;
        if (!ws.userId) {
            sendError(ws, 'Not authenticated');
            return;
        }
        documentRooms_1.documentRooms.updateCursor(documentId, ws.userId, position);
        const cursorMessage = {
            type: 'cursor_update',
            userId: ws.userId,
            position,
        };
        documentRooms_1.documentRooms.broadcastToOthers(documentId, ws.userId, cursorMessage);
    }
    catch (error) {
        console.error('Cursor update error:', error);
        sendError(ws, 'Failed to update cursor');
    }
}
function sendError(ws, message) {
    const errorMessage = { type: 'error', message };
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(errorMessage));
    }
}
//# sourceMappingURL=cursorUpdate.js.map